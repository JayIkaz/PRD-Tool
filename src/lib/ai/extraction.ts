import { generateStructured } from "./client";

/**
 * Structured state extraction (Stage 1, build-order item "Structured
 * state"). Takes one stakeholder exchange and turns it into actual
 * Requirement + RequirementDimension rows, and problem/users/outcomes
 * field updates on the ProductDefinition — rather than leaving the
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
 * Deliberately out of scope here (next build-order items, not this
 * one):
 *  - Assumptions, Open Questions, Evidence as first-class objects.
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

export interface ExtractionResult {
  problem?: ExtractedFieldUpdate;
  users?: ExtractedFieldUpdate;
  outcomes?: ExtractedFieldUpdate;
  currentTopic?: string;
  requirements: ExtractedRequirement[];
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
  ]
}`;

export async function extractDiscoveryState(params: {
  idea: string;
  known: { problem?: string | null; users?: string | null; outcomes?: string | null; currentTopic?: string | null };
  existingRequirements: ExtractionRequirementContext[];
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

  const systemPrompt = `You extract structured product-requirement state from ONE exchange in an ongoing discovery conversation. You do not converse — you only extract.

The product idea: "${params.idea}"

Known high-level fields so far:
- problem: ${params.known.problem ?? "(not yet captured)"}
- users: ${params.known.users ?? "(not yet captured)"}
- outcomes: ${params.known.outcomes ?? "(not yet captured)"}
- currentTopic (what the conversation is centred on right now): ${params.known.currentTopic ?? "(not yet set — defaults to the original idea)"}

Existing requirements captured so far:
${requirementsBlurb}

Rules, all strict:
1. Only extract what the stakeholder actually stated in their answer below. Never invent, infer beyond what was said, or fill gaps with assumptions.
2. If the stakeholder said "I don't know", gave a non-answer, or the answer doesn't add or change anything extractable, return "requirements": [] and omit problem/users/outcomes/currentTopic entirely. An empty result is correct and expected often.
3. Never use "CONFIRMED" as a state anywhere — it isn't a legal value for you. The strongest state you may use is "DEFINED".
4. For problem/users/outcomes: only include a field if this exchange added or changed it. When you do include one, "content" must be the FULL updated text for that field (merging the new information into what was already known), not just the new sentence, and not a repeat of the old content if nothing changed.
5. For requirements: decide whether the answer is about an EXISTING requirement from the list above (same underlying capability/feature being discussed) or describes a NEW distinct requirement. Use the existing requirement's "id" as "requirementId" when it's a continuation; use null only for a genuinely new, distinct requirement. Give every requirement a short, specific "title" (e.g. "Voice-triggered kettle activation"), even existing ones (repeat its known title unchanged if you're not renaming it).
6. Within "dimensions", include ONLY the dimension keys this specific exchange actually addressed. Do not pad with other dimension keys. "content" for a dimension must be the full, current understanding of that dimension (merge with what's implied as already known for it), written as a clear statement, not a quote of the stakeholder's words verbatim.
7. The seven dimension keys are exactly: USER, NEED, CONTEXT, BEHAVIOUR, OUTCOME, CONSTRAINTS, ACCEPTANCE_CONDITIONS. USER = who uses it; NEED = what problem/need it addresses; CONTEXT = when/where it's used; BEHAVIOUR = what it actually does, step by step; OUTCOME = what success looks like; CONSTRAINTS = limits it must work within; ACCEPTANCE_CONDITIONS = how you'd verify it was built correctly.
8. One stakeholder answer can touch multiple requirements and multiple dimensions at once — extract all of it, not just one thing.
9. currentTopic: a short phrase (3-8 words, e.g. "Voice-triggered kettle activation" or "Automated expense-report approvals") naming whatever capability or feature the conversation is actually focused on right now. Only include "currentTopic" in your response when the conversation's focus has genuinely moved on to something different from the known currentTopic above — a stakeholder drifting from discussing one feature to a distinct new one, or returning to the original idea after a detour. Do NOT include it just to restate the same topic, and do NOT treat every new requirement as a topic change — several requirements can belong to the same overall topic.`;

  const userContent = `The AI's most recent question was: ${params.aiQuestion ?? "(this was the opening message — no prior question)"}\n\nThe stakeholder's answer: ${params.stakeholderAnswer}`;

  return generateStructured<ExtractionResult>({
    mode: "STAKEHOLDER_DISCOVERY",
    systemPrompt,
    userContent,
    schemaDescription: SCHEMA_DESCRIPTION,
  });
}
