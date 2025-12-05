#!/usr/bin/env node
/**
 * Backfill stories for a single user by generating short achievements from role descriptions.
 * Usage:
 *   node -r dotenv/config scripts/backfill-stories.cjs <USER_ID>
 */

const { createClient } = require("@supabase/supabase-js");

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: node -r dotenv/config scripts/backfill-stories.cjs <USER_ID>");
    process.exit(1);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const openaiKey = process.env.VITE_OPENAI_KEY || process.env.VITE_OPENAI_API_KEY;
  const loginEmail = process.env.VITE_TEST_EMAIL;
  const loginPassword = process.env.VITE_TEST_PASSWORD;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)");
  }
  if (!openaiKey) {
    console.warn("[backfill] No OpenAI key found; stories cannot be generated.");
    return;
  }

  const client = createClient(supabaseUrl, supabaseKey);

  // Authenticate to satisfy RLS (uses test creds from .env)
  if (loginEmail && loginPassword) {
    const { data: authData, error: authErr } = await client.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (authErr) {
      console.warn("[backfill] Auth failed; proceeding without session (may return no rows)", authErr.message);
    } else {
      console.log("[backfill] Authenticated as test user for RLS");
    }
  } else {
    console.warn("[backfill] No login creds provided; queries may be blocked by RLS.");
  }

  console.log("[backfill] Fetching work_items without stories for user", userId);
  const { data: workItems, error: wiErr } = await client
    .from("work_items")
    .select("id, company_id, title, description, source_id")
    .eq("user_id", userId);

  if (wiErr) throw wiErr;
  if (!workItems || workItems.length === 0) {
    console.log("[backfill] No work items found.");
    return;
  }

  let created = 0;
  const errors = [];

  for (const wi of workItems) {
    if (!wi.description || wi.description.trim().length < 50) {
      continue;
    }

    const { count: storyCount, error: countErr } = await client
      .from("stories")
      .select("id", { head: true, count: "exact" })
      .eq("work_item_id", wi.id);
    if (countErr) {
      errors.push(countErr.message);
      continue;
    }
    if (storyCount && storyCount > 0) continue;

    const prompt = `Extract one concise achievement story from this role description.
Return JSON with fields: title, content, tags (array of strings), metrics (array, can be empty).

Role: ${wi.title}
Description: ${wi.description}`;

    let story;
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 600,
          response_format: { type: "json_object" },
        }),
      });
      if (!resp.ok) {
        errors.push(`OpenAI error ${resp.status} for work_item ${wi.id}`);
        continue;
      }
      const data = await resp.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      const first = Array.isArray(parsed.stories) ? parsed.stories[0] : parsed.story || null;
      if (!first || !first.content) {
        continue;
      }
      story = {
        title: first.title || wi.title,
        content: first.content,
        tags: first.tags || [],
        metrics: first.metrics || [],
      };
    } catch (err) {
      errors.push(err.message);
      continue;
    }

    if (!story) continue;

    const { error: insertErr } = await client.from("stories").insert({
      user_id: userId,
      work_item_id: wi.id,
      company_id: wi.company_id,
      title: story.title,
      content: story.content,
      tags: story.tags,
      metrics: story.metrics,
      source_id: wi.source_id,
      source_type: "resume_linkedin_backfill",
    });
    if (insertErr) {
      errors.push(insertErr.message);
      continue;
    }
    created += 1;
    console.log(`[backfill] Created story for work_item ${wi.id}`);
  }

  console.log("[backfill] Done. Created:", created, "Errors:", errors.length ? errors : "none");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
