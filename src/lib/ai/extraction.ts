import { generateStructured } from "./client";

/**
 * Structured state extraction (Stage 1, build-order item "Structured
 * state", extended by "Assumptions, Open Questions, Evidence").
 * Takes one stakeholder exchange and turns it into actual Requirement
 * + RequirementDimension rows, problem/users/outcomes field updates,
 * Open Questions, and Assumptions — rather than leaving the
 * conversation as an un-parsed transcript (Section 19: "the
 * application retains structured state as the source of truth").
 *
 * Also tracks currentTopic: a short, human-readable line describing
 * what the conversation is actually centred on right now, separate
 * from the ProductDefinition's fixed title/idea. A stakeholder can
 * (and does) drift between capabilities within one session — the
 * chat header should reflect what's being discussed today, not just
 * whatever was typed when the Product Definition was first created.
 *
 * Open Questions (Section 13): "I don't know" is a legitimate answer,
 * not a gap to paper over. When the stakeholder genuinely doesn't
 * know something that matters, it becomes a tracked open question
 * rather than silently vanishing. If a later answer resolves a
 * question already on record, it gets marked resolved rather than
 * creating a duplicate.
 *
 * Assumptions (Section 16): anything the AI is inferring rather than
 * being told directly becomes a PENDING assumption with mandatory
 * reasoning — never asserted as fact, never silently folded into a
 * requirement or field. Confirming, editing or rejecting an
 * assumption is the next build-order item ("AI inference
 * confirmation"), not this one — this only creates them.
 *
 * Evidence is deliberately NOT extracted here — it's stakeholder-
 * attached supporting material (a link, a file, a note), not
 * something inferred from a conversational answer, so it has its own
 * manual "add evidence" action instead.
 *
 * Deliberately still out of scope here:
 *  - The end-of-session AI inference confirmation batch.
 *  - Requirement versioning / baselining — every row this writes
 *    stays at version 1, updated in place, until PM-review/baseline
 *    stage work exists (Section 33).
 *
 * The AI NEVER sets a dimension or field to CONFIRMED — that state is
 * reserved for explicit stakeholder/PM sign-off (Section 19 /
 * addendum #8) and is enforced by the type below, not just the
 * prompt: CONFIRMED isn't a legal value in ExtractedState.
 */

export type DimensionKey =
  | "USER"
  | "NEED"
  | "CONTEXT"
  | "BEHAVIOUR"
  | "OUTCOME"
  | "CONSTRAINTS"
  | "ACCEPTANCE_CONDITIONS";

export const DIMENSION_KEYS: DimensionKey[] = [
  "USER",
  "NEED",
  "CONTEXT",
  "BEHAVIOUR",
  "OUTCOME",
  "CONSTRAINTS",
  "ACCEPTANCE_CONDITIONS",
];

type ExtractedState = "PARTIAL" | "DEFINED";

export interface ExtractedFieldUpdate {
  content: string;
  state: "MISSING" | "PARTIAL" | "DEFINED";
}

export interface ExtractionRequirementContext {
  id: string;
  title: string;
  dimensions: Partial<Record<DimensionKey, string>>; // dimensionType -> existing state, for matching context
}

export interface ExtractedRequirement {
  requirementId: string | null; // null = new, distinct requirement
  title: string;
  dimensions: Partial<Record<DimensionKey, { content: string; state: ExtractedState }>>;
}

export interface ExtractionOpenQuestionContext {
  id: string;
  question: string;
}

export interface ExtractedOpenQuestion {
  // Set when this answer resolves an existing open question rather
  // than raising a new one.
  resolvesOpenQuestionId?: string;
  question: string; // required even when resolving, so the UI never has to guess it
  whyItMatters?: string;
  resolutionAnswerText?: string; // only when resolvesOpenQuestionId is set
}

export interface ExtractionAssumptionContext {
  id: string;
  statement: string;
}

export interface ExtractedAssumption {
  statement: string;
  reasoning: string; // never optional — Section 16
}

export interface ExtractionResult {
  problem?: ExtractedFieldUpdate;
  users?: ExtractedFieldUpdate;
  outcomes?: ExtractedFieldUpdate;
  currentTopic?: string;
  requirements: ExtractedRequirement[];
  openQuestions: ExtractedOpenQuestion[];
  assumptions: ExtractedAssumption[];
}

const SCHEMA_DESCRIPTION = `{
  "problem"?: { "content": string, "state": "MISSING"|"PARTIAL"|"DEFINED" },
  "users"?: { "content": string, "state": "MISSING"|"PARTIAL"|"DEFINED" },
  "outcomes"?: { "content": string, "state": "MISSING"|"PARTIAL"|"DEFINED" },
  "currentTopic"?: string,
  "requirements": [
    {
      "requirementId": string | null,
      "title": string,
      "dimensions": {
        "USER"?: { "content": string, "state": "PARTIAL"|"DEFINED" },
        "NEED"?: { "content": string, "state": "PARTIAL"|"DEFINED" },
        "CONTEXT"?: { "content": string, "state": "PARTIAL"|"DEFINED" },
        "BEHAVIOUR"?: { "content": string, "state": "PARTIAL"|"DEFINED" },
        "OUTCOME"?: { "content": string, "state": "PARTIAL"|"DEFINED" },
        "CONSTRAINTS"?: { "content": string, "state": "PARTIAL"|"DEFINED" },
        "ACCEPTANCE_CONDITIONS"?: { "content": string, "state": "PARTIAL"|"DEFINED" }
      }
    }
  ],
  "openQuestions": [
    {
      "resolvesOpenQuestionId"?: string,
      "question": string,
      "whyItMatters"?: string,
      "resolutionAnswerText"?: string
    }
  ],
  "assumptions": [
    { "statement": string, "reasoning": string }
  ]
}`;

export async function extractDiscoveryState(params: {
  idea: string;
  known: { problem?: string | null; users?: string | null; outcomes?: string | null; currentTopic?: string | null };
  existingRequirements: ExtractionRequirementContext[];
  existingOpenQuestions: ExtractionOpenQuestionContext[];
  existingAssumptions: ExtractionAssumptionContext[];
  aiQuestion: string | null;
  stakeholderAnswer: string;
}): Promise<ExtractionResult> {
  const requirementsBlurb =
    params.existingRequirements.length === 0
      ? "(none yet)"
      : params.existingRequirements
          .map(
            (r) =>
              `- id=${r.id} title="${r.title}" known dimensions: ${
                Object.keys(r.dimensions).length > 0
                  ? Object.entries(r.dimensions)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(", ")
                  : "(none)"
              }`
          )
          .join("\n");

  const openQuestionsBlurb =
    params.existingOpenQuestions.length === 0
      ? "(none yet)"
      : params.existingOpenQuestions.map((q) => `- id=${q.id} "${q.question}"`).join("\n");

  const assumptionsBlurb =
    params.existingAssumptions.length === 0
      ? "(none yet)"
      : params.existingAssumptions.map((a) => `- id=${a.id} "${a.statement}"`).join("\n");

  const systemPrompt = `You extract structured product-requirement state from ONE exchange in an ongoing discovery conversation. You do not converse — you only extract.

The product idea: "${params.idea}"

Known high-level fields so far:
- problem: ${params.known.problem ?? "(not yet captured)"}
- users: ${params.known.users ?? "(not yet captured)"}
- outcomes: ${params.known.outcomes ?? "(not yet captured)"}
- currentTopic (what the conversation is centred on right now): ${params.known.currentTopic ?? "(not yet set — defaults to the original idea)"}

Existing requirements captured so far:
${requirementsBlurb}

Existing unresolved open questions:
${openQuestionsBlurb}

Existing assumptions already on record:
${assumptionsBlurb}

Rules, all strict:
1. Only extract what the stakeholder actually stated in their answer below. Never invent, infer beyond what was said, or fill gaps with assumptions you then state as fact.
2. If the answer doesn't add or change anything extractable, return empty arrays for requirements/openQuestions/assumptions and omit problem/users/outcomes/currentTopic entirely. An empty result is correct and expected often.
3. Never use "CONFIRMED" as a state anywhere — it isn't a legal value for you. The strongest state you may use is "DEFINED".
4. For problem/users/outcomes: only include a field if this exchange added or changed it. When you do include one, "content" must be the FULL updated text for that field (merging the new information into what was already known), not just the new sentence, and not a repeat of the old content if nothing changed.
5. For requirements: decide whether the answer is about an EXISTING requirement from the list above (same underlying capability/feature being discussed) or describes a NEW distinct requirement. Use the existing requirement's "id" as "requirementId" when it's a continuation; use null only for a genuinely new, distinct requirement. Give every requirement a short, specific "title" (e.g. "Voice-triggered kettle activation"), even existing ones (repeat its known title unchanged if you're not renaming it).
6. Within "dimensions", include ONLY the dimension keys this specific exchange actually addressed. Do not pad with other dimension keys. "content" for a dimension must be the full, current understanding of that dimension (merge with what's implied as already known for it), written as a clear statement, not a quote of the stakeholder's words verbatim.
7. The seven dimension keys are exactly: USER, NEED, CONTEXT, BEHAVIOUR, OUTCOME, CONSTRAINTS, ACCEPTANCE_CONDITIONS. USER = who uses it; NEED = what problem/need it addresses; CONTEXT = when/where it's used; BEHAVIOUR = what it actually does, step by step; OUTCOME = what success looks like; CONSTRAINTS = limits it must work within; ACCEPTANCE_CONDITIONS = how you'd verify it was built correctly.
8. One stakeholder answer can touch multiple requirements and multiple dimensions at once — extract all of it, not just one thing.
9. currentTopic: a short phrase (3-8 words, e.g. "Voice-triggered kettle activation" or "Automated expense-report approvals") naming whatever capability or feature the conversation is actually focused on right now. Only include "currentTopic" in your response when the conversation's focus has genuinely moved on to something different from the known currentTopic above — a stakeholder drifting from discussing one feature to a distinct new one, or returning to the original idea after a detour. Do NOT include it just to restate the same topic, and do NOT treat every new requirement as a topic change — several requirements can belong to the same overall topic. Never include it in response to the stakeholder giving you an instruction about the tool itself (e.g. "change the topic") — only in response to them actually talking about something different.
10. openQuestions: if the stakeholder explicitly doesn't know something that genuinely matters (not a throwaway aside), add it with "question" phrased as the open question itself and, when clear, "whyItMatters" explaining briefly why it's worth tracking. Before adding a new one, check it isn't a near-duplicate of an existing unresolved question above. If this answer actually resolves one of the existing unresolved questions listed above (the stakeholder now answers something they previously didn't know), set "resolvesOpenQuestionId" to that question's id, repeat its "question" text, and set "resolutionAnswerText" to what they just said that resolves it — do not also create a new question for the same thing. Most exchanges won't touch this at all; return an empty array when nothing qualifies.
11. assumptions: only when you, the extractor, are inferring something the stakeholder did NOT directly state — a reasonable reading between the lines that the Requirements/Behaviour conversation is relying on. Every assumption needs non-empty "reasoning" explaining what in the exchange led to it. Never duplicate an assumption already on record above. This is rare — most exchanges produce zero assumptions. Do not use this as a place to restate something the stakeholder already said plainly; that belongs in problem/users/outcomes/requirements instead.`;

  const userContent = `The AI's most recent question was: ${params.aiQuestion ?? "(this was the opening message — no prior question)"}\n\nThe stakeholder's answer: ${params.stakeholderAnswer}`;

  return generateStructured<ExtractionResult>({
    mode: "STAKEHOLDER_DISCOVERY",
    systemPrompt,
    userContent,
    schemaDescription: SCHEMA_DESCRIPTION,
  });
}
