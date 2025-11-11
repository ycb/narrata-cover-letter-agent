import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supportTo = (Deno.env.get("SUPPORT_TO_EMAIL") ?? "support@narrata.co").trim();
if (!supportTo.includes("@")) {
  throw new Error("SUPPORT_TO_EMAIL must be a valid email address");
}
const SUPPORT_TO_EMAIL = supportTo;

const rawSupportFrom = (Deno.env.get("SUPPORT_FROM_EMAIL") ?? "Narrata Support <support@narrata.co>").trim();
const SUPPORT_FROM_EMAIL = /<[^>]+>/.test(rawSupportFrom)
  ? rawSupportFrom
  : rawSupportFrom.includes("@")
    ? rawSupportFrom
    : "support@narrata.co";
const SUPPORT_WEBHOOK_URL = Deno.env.get("SUPPORT_EMAIL_WEBHOOK_URL");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface SupportPayload {
  subject?: string;
  body?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

function formatMetadata(metadata?: Record<string, unknown>): string {
  if (!metadata) return "{}";
  try {
    return JSON.stringify(metadata, null, 2);
  } catch (error) {
    console.error("[send-support-email] Unable to stringify metadata", error);
    return "{}";
  }
}

async function sendViaResend(payload: Required<Pick<SupportPayload, "subject" | "body">> & { metadataText: string; tags?: string[] }) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is required for Resend delivery");
  }

  const uniqueTags = Array.from(new Set(payload.tags ?? []));
  const resendTags = uniqueTags.map((tag, index) => ({
    name: `tag_${index}`,
    value: tag,
  }));

  const htmlBody = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${payload.subject}</title>
  </head>
  <body>
    <p>${payload.body.replace(/\n/g, "<br />")}</p>
    <hr />
    <p><strong>Metadata</strong></p>
    <pre style="background:#f4f4f5;padding:16px;border-radius:8px;">${payload.metadataText}</pre>
    ${resendTags.length ? `<p><strong>Tags:</strong> ${uniqueTags.join(", ")}</p>` : ""}
  </body>
</html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: SUPPORT_FROM_EMAIL,
      to: [SUPPORT_TO_EMAIL],
      subject: payload.subject,
      text: `${payload.body}\n\n---\n${payload.metadataText}`,
      html: htmlBody,
      tags: resendTags,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

async function sendViaWebhook(payload: Required<Pick<SupportPayload, "subject" | "body">> & { metadataText: string; tags?: string[] }) {
  if (!SUPPORT_WEBHOOK_URL) {
    throw new Error("SUPPORT_EMAIL_WEBHOOK_URL environment variable is required for webhook delivery");
  }

  const response = await fetch(SUPPORT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: SUPPORT_TO_EMAIL,
      from: SUPPORT_FROM_EMAIL,
      subject: payload.subject,
      body: payload.body,
      metadata: payload.metadataText,
      tags: payload.tags ?? [],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Support webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
}

async function deliverSupportEmail(payload: SupportPayload) {
  const { subject, body, metadata, tags } = payload;

  if (!subject || !body) {
    return new Response(
      JSON.stringify({ error: "Both subject and body are required." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const metadataText = formatMetadata(metadata);

  try {
    if (RESEND_API_KEY) {
      await sendViaResend({ subject, body, metadataText, tags });
    } else if (SUPPORT_WEBHOOK_URL) {
      await sendViaWebhook({ subject, body, metadataText, tags });
    } else {
      throw new Error("No email delivery mechanism configured. Provide RESEND_API_KEY or SUPPORT_EMAIL_WEBHOOK_URL.");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[send-support-email] Delivery failure", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const payload = (await req.json()) as SupportPayload;
    return await deliverSupportEmail(payload);
  } catch (error) {
    console.error("[send-support-email] Invalid request payload", error);
    const message = error instanceof Error ? error.message : "Invalid JSON body";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
