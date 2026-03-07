import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("stream-hil-review - request validation", () => {
  const validRequest = {
    text: "I led product strategy for a SaaS platform, increasing revenue by 40%.",
    job: {
      role: "Senior Product Manager",
      company: "TechCorp",
      coreRequirements: ["Product strategy", "Revenue growth"],
    },
    context: {
      userVoicePrompt: "Professional but approachable tone",
    },
    originalGap: {
      id: "test-gap",
      type: "metric",
      description: "Add specific metrics",
    },
  };

  assertExists(validRequest.text);
  assertExists(validRequest.job);
  assertEquals(validRequest.job.coreRequirements.length, 2);
});

Deno.test("stream-hil-review - JSON response structure", () => {
  const expectedResponse = {
    summary: "Content is strong but could be more specific",
    suggestions: [
      {
        id: "sug-1",
        priority: "P1",
        why: "Add more context about the platform",
        anchor: "SaaS platform",
        replacement: "B2B SaaS analytics platform",
      },
    ],
    questionsToConsider: [
      "What specific features drove the revenue growth?",
    ],
    missingFacts: [
      "Timeline for achieving 40% revenue growth",
    ],
  };

  assertExists(expectedResponse.summary);
  assertExists(expectedResponse.suggestions);
  assertEquals(expectedResponse.suggestions.length, 1);
  assertEquals(expectedResponse.suggestions[0].priority, "P1");
});
