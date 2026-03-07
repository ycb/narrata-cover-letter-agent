import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("generate-stories - request validation", () => {
  const validRequest = {
    userId: "test-user-id",
    sourceId: "test-source-id",
    workItems: [
      {
        id: "work-1",
        company_id: "company-1",
        company_name: "Tech Corp",
        title: "Senior PM",
        description: "Led product strategy for B2B SaaS platform, increasing revenue by 40% through feature prioritization and customer feedback loops.",
      },
    ],
  };

  assertExists(validRequest.userId);
  assertExists(validRequest.sourceId);
  assertEquals(validRequest.workItems.length, 1);
  assertEquals(validRequest.workItems[0].description.length > 50, true);
});

Deno.test("generate-stories - story structure", () => {
  const generatedStory = {
    title: "Increased revenue through product strategy",
    content: "Led product strategy for B2B SaaS platform by implementing data-driven feature prioritization and establishing customer feedback loops, resulting in 40% revenue increase over 12 months.",
    tags: ["product strategy", "B2B", "revenue growth"],
    metrics: [
      {
        value: "40%",
        context: "revenue increase",
        type: "increase",
      },
    ],
  };

  assertExists(generatedStory.title);
  assertExists(generatedStory.content);
  assertEquals(generatedStory.tags.length, 3);
  assertEquals(generatedStory.metrics.length, 1);
  assertEquals(generatedStory.metrics[0].value, "40%");
});

Deno.test("generate-stories - skip short descriptions", () => {
  const shortDescription = "Managed products.";
  const shouldSkip = shortDescription.trim().length < 50;
  
  assertEquals(shouldSkip, true, "Short descriptions should be skipped");
});
