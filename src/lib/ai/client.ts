import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set — copy .env.example to .env.local and fill it in.");
}

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * AI modes (Section 37) — pass one of these into the system prompt
 * assembly so behaviour stays separated and testable rather than
 * living in one enormous system prompt.
 */
export type AiMode =
  | "STAKEHOLDER_DISCOVERY"
  | "INFERENCE_REVIEW"
  | "PM_REVIEW"
  | "PM_CHALLENGE"
  | "PRD_GENERATION"
  | "DELIVERY_GENERATION"
  | "BASELINE_REVIEW";

/**
 * Use for anything the completeness engine needs to parse
 * deterministically (requirement dimension extraction, inference
 * generation, PM challenge output) — addendum #2. Reserve free-text
 * generation for the PRD and story prose, where format flexibility
 * is the point.
 */
export async function generateStructured<T>(params: {
  mode: AiMode;
  systemPrompt: string;
  userContent: string;
  schemaDescription: string; // describe the expected JSON shape in the prompt itself
}): Promise<T> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `${params.systemPrompt}\n\nRespond with JSON only, matching this shape: ${params.schemaDescription}. No prose, no markdown fences.`,
    messages: [{ role: "user", content: params.userContent }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`No text content returned for AI mode ${params.mode}`);
  }

  return JSON.parse(textBlock.text) as T;
}
