import { anthropic } from "./client";

/**
 * Short, hand-written grounding for each pathway (Section 9-11 + addendum
 * #6). Not the full pathway config content the schema leaves room for —
 * just enough to keep the AI oriented on WHAT to explore, per Section
 * 10 ("the framework determines WHAT, the AI determines HOW and WHEN").
 */
const PATHWAY_GUIDANCE: Record<string, string> = {
  DISCOVERY:
    "Opening exploration — understand what prompted this idea before narrowing into specifics.",
  PROBLEM_VALUE:
    "What problem exists today, who it affects, and what value solving it creates.",
  USER_CUSTOMER:
    "Who will actually use this, whether there are distinct user types, and the context they'll use it in.",
  REQUIREMENTS_BEHAVIOUR:
    "What the thing should actually do step by step, what success looks like, constraints it must work within, and how it'd be verified as built correctly.",
  GENERAL:
    "A general product or feature — whether this is new or a change to something existing, and the shape of it.",
  AUTOMATION:
    "An automation — what triggers it, what manual work it replaces, and how it should behave when something goes wrong.",
};

export interface DiscoveryQuestionLibraryItem {
  pathwayKey: string;
  area: string;
  promptText: string;
}

export interface DiscoveryTranscriptMessage {
  role: "AI" | "STAKEHOLDER";
  content: string;
}

/**
 * Generates the AI's next message in a discovery conversation (Section
 * 9-13, addendum #6/#7). Deliberately does NOT extract structured
 * Requirement/RequirementDimension state from the answer — that's the
 * next build-order item after the conversation loop itself, not this
 * one. This only produces the next thing to say.
 */
export async function generateNextDiscoveryMessage(params: {
  idea: string;
  productTypeKey?: string | null;
  known: { problem?: string | null; users?: string | null; outcomes?: string | null };
  library: DiscoveryQuestionLibraryItem[];
  transcript: DiscoveryTranscriptMessage[];
}): Promise<string> {
  const activePathways = ["DISCOVERY", "PROBLEM_VALUE", "USER_CUSTOMER", "REQUIREMENTS_BEHAVIOUR"];
  if (params.productTypeKey) activePathways.push(params.productTypeKey);

  const pathwayBlurb = activePathways
    .filter((key) => PATHWAY_GUIDANCE[key])
    .map((key) => `- ${key}: ${PATHWAY_GUIDANCE[key]}`)
    .join("\n");

  const libraryBlurb = params.library
    .filter((q) => activePathways.includes(q.pathwayKey))
    .map((q) => `- [${q.pathwayKey}/${q.area}] ${q.promptText}`)
    .join("\n");

  const knownSoFar = [
    params.known.problem ? `- Problem so far: ${params.known.problem}` : null,
    params.known.users ? `- Users so far: ${params.known.users}` : null,
    params.known.outcomes ? `- Outcomes so far: ${params.known.outcomes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `You are running a structured product discovery conversation with a business stakeholder who has a rough idea. Your job is to reduce ambiguity before anything gets built — not to write a PRD, not to generate a solution, just to ask good questions and let the stakeholder's own answers do the work.

Cover these areas over the course of the conversation, in whatever order feels natural given what's already been said:
${pathwayBlurb}

You have a library of reference questions you can draw from verbatim, adapt, or use only as inspiration — you decide the wording, sequencing, and whether to generate something not on this list. The framework tells you WHAT to explore; you decide HOW and WHEN:
${libraryBlurb}

Rules:
- Ask ONE focused question at a time. Never a list of questions.
- Keep it conversational, not like a form.
- If the stakeholder says they don't know, that's a legitimate answer — acknowledge it, note it's still open, and move on to something else rather than pushing for an answer they don't have.
- Never invent facts, requirements or assumptions on the stakeholder's behalf — if you're inferring something, ask them to confirm it rather than stating it as established.
- Don't repeat a question that's already been answered earlier in this conversation.
- If you genuinely believe the four core areas above have been covered reasonably well, say so plainly and suggest the stakeholder can wrap up the session, rather than continuing to probe indefinitely.

What's already known about this idea:
- Original idea: ${params.idea}
${knownSoFar}

Respond with your next message to the stakeholder only — no preamble, no labels, just what you'd actually say to them.`;

  const conversationMessages = params.transcript.map((m) => ({
    role: m.role === "STAKEHOLDER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages:
      conversationMessages.length > 0
        ? conversationMessages
        : [{ role: "user", content: "(The stakeholder hasn't said anything yet in this session — start the conversation.)" }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content returned for discovery message.");
  }
  return textBlock.text;
}
