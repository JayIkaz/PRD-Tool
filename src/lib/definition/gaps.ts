import type { DimensionKey } from "./dimensions";

/**
 * Works out where a Product Definition is thinnest, so the discovery
 * assistant can ask about that next instead of picking a topic from the
 * transcript alone. Pure code, no model call: the same state always gives
 * the same answer, which makes it testable.
 *
 * It only chooses WHAT to ask about. The assistant still decides how to
 * word it and when to move on.
 */

type State = "MISSING" | "PARTIAL" | "DEFINED" | "CONFIRMED";

export interface FocusInput {
  fields: { problem: State; users: State; outcomes: State };
  requirements: Array<{
    title: string;
    dimensions: Partial<Record<DimensionKey, State>>;
  }>;
  /** Unresolved open questions (the stakeholder said they don't know). */
  openQuestions: Array<{ question: string }>;
  /** AI-inferred assumptions still waiting for a decision. */
  pendingAssumptions: Array<{ statement: string }>;
}

export interface FocusTarget {
  kind: "FIELD" | "DIMENSION" | "ASSUMPTION";
  /** Plain-language description of what to find out. */
  ask: string;
  /** Short reason, for the assistant's benefit. */
  why: string;
}

export interface Focus {
  targets: FocusTarget[];
  /** True when the core fields and every requirement are defined. */
  coreComplete: boolean;
  openQuestions: string[];
}

const MAX_TARGETS = 3;

// The order to ask in: why it matters and who it is for before the detail.
const DIMENSION_ORDER: DimensionKey[] = [
  "NEED",
  "USER",
  "CONTEXT",
  "BEHAVIOUR",
  "OUTCOME",
  "CONSTRAINTS",
  "ACCEPTANCE_CONDITIONS",
];

const DIMENSION_ASK: Record<DimensionKey, string> = {
  NEED: "why this matters and what problem it solves",
  USER: "who would use it",
  CONTEXT: "when and where it would be used",
  BEHAVIOUR: "what it should do, step by step",
  OUTCOME: "what success looks like",
  CONSTRAINTS: "any limits it must work within, or things it must not do",
  ACCEPTANCE_CONDITIONS: "how someone would check it was built correctly",
};

const FIELD_ASK: Record<keyof FocusInput["fields"], string> = {
  problem: "the problem or opportunity behind the idea",
  users: "who is affected and who would use the result",
  outcomes: "what would be different if this worked",
};

const isDone = (s: State | undefined) => s === "DEFINED" || s === "CONFIRMED";

export function computeFocus(input: FocusInput): Focus {
  const targets: FocusTarget[] = [];

  for (const key of ["problem", "users", "outcomes"] as const) {
    if (!isDone(input.fields[key])) {
      targets.push({
        kind: "FIELD",
        ask: FIELD_ASK[key],
        why: input.fields[key] === "PARTIAL" ? "only partly captured so far" : "not captured yet",
      });
    }
  }

  if (input.requirements.length === 0) {
    targets.push({
      kind: "DIMENSION",
      ask: "what the first concrete thing it should do is",
      why: "no requirement has been captured yet",
    });
  }

  // Finish what has been started: the requirement closest to done goes first.
  // Ties keep list order, so a stable input gives a stable answer.
  const withGaps = input.requirements
    .map((r, index) => ({
      r,
      index,
      gaps: DIMENSION_ORDER.filter((k) => !isDone(r.dimensions[k])),
    }))
    .filter((x) => x.gaps.length > 0)
    .sort((a, b) => a.gaps.length - b.gaps.length || a.index - b.index);

  for (const { r, gaps } of withGaps) {
    for (const key of gaps) {
      targets.push({
        kind: "DIMENSION",
        ask: `${DIMENSION_ASK[key]} (for "${r.title}")`,
        why: r.dimensions[key] === "PARTIAL" ? "only partly captured" : "not captured yet",
      });
    }
  }

  const coreComplete =
    input.requirements.length > 0 &&
    (["problem", "users", "outcomes"] as const).every((k) => isDone(input.fields[k])) &&
    withGaps.length === 0;

  const first = input.pendingAssumptions[0];
  if (first) {
    targets.push({
      kind: "ASSUMPTION",
      ask: `check this reading is right: ${first.statement}`,
      why: "inferred, not stated by the stakeholder",
    });
  }

  return {
    targets: targets.slice(0, MAX_TARGETS),
    coreComplete,
    openQuestions: input.openQuestions.map((q) => q.question),
  };
}

/** Text block for the discovery prompt. */
export function renderFocus(focus: Focus): string {
  const lines: string[] = [];
  if (focus.targets.length > 0) {
    lines.push("Where the definition is thinnest right now (most important first):");
    focus.targets.forEach((t, i) => lines.push(`${i + 1}. Find out ${t.ask}. (${t.why})`));
  } else {
    lines.push("Nothing is missing from the definition as it stands.");
  }
  if (focus.coreComplete) {
    lines.push("Every core area and every requirement so far is defined.");
  }
  if (focus.openQuestions.length > 0) {
    lines.push(
      "The stakeholder has already said they don't know these. Do not press on them; only come back if they raise them:"
    );
    focus.openQuestions.forEach((q) => lines.push(`- ${q}`));
  }
  return lines.join("\n");
}
