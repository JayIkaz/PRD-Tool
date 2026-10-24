import { generateStructured } from "./client";

/**
 * AI Challenge mode (Section 21/22): the PM-triggered critique of the
 * full assembled Product Definition -- never the chat transcript,
 * same "structured state is the source of truth" principle as PRD
 * generation (Section 23). More assertive than
 * STAKEHOLDER_DISCOVERY (Section 21: "The AI should be more
 * assertive here"), but it only ever proposes: the PM accepts,
 * rejects or acts on each finding separately (challenge-actions.ts),
 * and nothing here writes back into the Product Definition itself
 * (Section 22: "Do not automatically modify the Product Definition
 * based on AI recommendations").
 */

export type ChallengeFindingCategory =
  | "GAP"
  | "CONTRADICTION"
  | "AMBIGUITY"
  | "WEAK_OUTCOME"
  | "WEAK_ACCEPTANCE_CONDITIONS"
  | "UNCONFIRMED_ASSUMPTION"
  | "DEPENDENCY"
  | "RISK"
  | "SCOPE_PROBLEM"
  | "QUESTION"
  | "SUGGESTION";

export const CHALLENGE_FINDING_CATEGORIES: ChallengeFindingCategory[] = [
  "GAP",
  "CONTRADICTION",
  "AMBIGUITY",
  "WEAK_OUTCOME",
  "WEAK_ACCEPTANCE_CONDITIONS",
  "UNCONFIRMED_ASSUMPTION",
  "DEPENDENCY",
  "RISK",
  "SCOPE_PROBLEM",
  "QUESTION",
  "SUGGESTION",
];

export interface ChallengeFinding {
  category: ChallengeFindingCategory;
  statement: string;
  relatedTo?: string | null; // e.g. "REQ-004", "ASSUMPTION-002" -- prose pointer, not an FK
}

export interface ChallengeInput {
  idea: string;
  problem: string | null;
  users: string | null;
  needs: string | null;
  context: string | null;
  outcomes: string | null;
  requirements: Array<{
    displayCode: string;
    title: string;
    dimensions: Partial<Record<string, { content: string | null; state: string }>>;
  }>;
  assumptions: Array<{ displayCode: string; statement: string; status: string; generatedByAi: boolean }>;
  decisions: Array<{ statement: string; rationale: string | null }>;
  openQuestions: Array<{ question: string; resolvedAt: Date | null }>;
  evidence: Array<{ type: string; note: string | null; url: string | null }>;
  risks: Array<{ statement: string; category: string | null }>;
  dependencies: Array<{ statement: string }>;
}

const SYSTEM_PROMPT = `You are reviewing a Product Definition on behalf of a Product Manager, in AI Challenge mode -- not stakeholder discovery. Be direct and assertive -- this is the PM's chance to find problems before the definition is approved, not a conversation with the stakeholder. The PM makes every final call; you are only surfacing what deserves their attention.

Look across the whole definition for:
- Gaps: important information that's missing.
- Contradictions: statements that conflict with each other.
- Ambiguity: requirements that could reasonably be read more than one way.
- Weak outcomes: requirements with no clear intended result.
- Weak acceptance conditions: requirements that can't be objectively validated.
- Unconfirmed assumptions: assumptions still pending that matter enough to flag again here.
- Dependencies: external systems, teams, data or processes that could affect delivery and aren't yet recorded.
- Risks: potential delivery, customer, data, operational or compliance risks.
- Scope problems: likely over-scoping or under-scoping.
- Questions: specific questions the PM should put to the stakeholder.
- Suggestions: concrete ways the definition could be improved.

Only raise something if it's substantive -- do not pad the output with trivial or restated observations. Every finding must name what it's about (use the requirement or assumption display code when the finding concerns a specific one) in its statement or relatedTo field, never a vague generality the PM has to go hunting for.`;

export async function generateChallengeFindings(input: ChallengeInput): Promise<ChallengeFinding[]> {
  const result = await generateStructured<{ findings: ChallengeFinding[] }>({
    mode: "PM_CHALLENGE",
    systemPrompt: SYSTEM_PROMPT,
    userContent: `Product Definition state:\n${JSON.stringify(input, null, 2)}`,
    schemaDescription: `{ "findings": [{ "category": one of ${JSON.stringify(
      CHALLENGE_FINDING_CATEGORIES
    )}, "statement": string, "relatedTo": string | null }] }`,
    maxTokens: 4096,
  });

  return result.findings ?? [];
}

// Section 22's six display headings, mapped from the full Section 21
// taxonomy above. Findings keep their finer category in the database
// (filterable, future-proof); this mapping is purely presentational
// and can change without a migration.
export const CHALLENGE_DISPLAY_GROUPS: Array<{
  heading: string;
  categories: ChallengeFindingCategory[];
}> = [
  { heading: "Critical questions", categories: ["QUESTION"] },
  {
    heading: "Potential gaps",
    categories: ["GAP", "AMBIGUITY", "WEAK_OUTCOME", "WEAK_ACCEPTANCE_CONDITIONS", "SCOPE_PROBLEM"],
  },
  { heading: "Contradictions", categories: ["CONTRADICTION"] },
  { heading: "Assumptions requiring confirmation", categories: ["UNCONFIRMED_ASSUMPTION"] },
  { heading: "Delivery risks", categories: ["RISK", "DEPENDENCY"] },
  { heading: "Suggested improvements", categories: ["SUGGESTION"] },
];
