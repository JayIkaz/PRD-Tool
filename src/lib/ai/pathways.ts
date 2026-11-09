/**
 * Specialist discovery pathways kept in code, keyed by product_types.key.
 * Wording changes are a deploy, not a database edit, same as
 * product-type-descriptions.ts. The assistant still decides how and when to
 * ask; this only gives it the right things to explore for the kind of
 * product it is dealing with.
 *
 * If the database question library has rows for a key, those win and the
 * questions here are not added, so the two never double up.
 */

export interface SpecialistQuestion {
  area: string;
  promptText: string;
}

export interface SpecialistPathway {
  guidance: string;
  questions: SpecialistQuestion[];
}

export const SPECIALIST_PATHWAYS: Record<string, SpecialistPathway> = {
  INTEGRATION: {
    guidance:
      "Connecting two or more systems so data moves between them: which systems, which one holds the master data, what moves and in which direction, how fast and how much, what happens when one side is down or sends bad data, who looks after each side, and whether any of the data is sensitive.",
    questions: [
      {
        area: "systems",
        promptText: "Which systems need to be connected, and which one holds the master version of the data?",
      },
      {
        area: "direction",
        promptText: "What data needs to move, and in which direction? One way, or both?",
      },
      {
        area: "timing",
        promptText: "How quickly does the data need to arrive: straight away, within minutes, once a day?",
      },
      {
        area: "volume",
        promptText: "Roughly how much data is that, and does it spike at particular times?",
      },
      {
        area: "failure_handling",
        promptText: "If one side is down or sends something wrong, what should happen, and who needs to know?",
      },
      {
        area: "ownership",
        promptText: "Who looks after each of the systems, and do they know about this yet?",
      },
      {
        area: "data_quality",
        promptText: "Is the data in both systems clean enough to match up, or are there known duplicates or gaps?",
      },
      {
        area: "access",
        promptText: "Is any of this data sensitive, and does that limit who or what can see it on the way?",
      },
    ],
  },
  DATA_REPORTING: {
    guidance:
      "A report, dashboard or dataset that supports a decision: what decision and who makes it, the questions it must answer, where the data comes from and how far it can be trusted, how each number is defined, how fresh it must be, who can see what, and how the numbers will be checked.",
    questions: [
      {
        area: "decision",
        promptText: "What decision will this help someone make, and who makes it?",
      },
      {
        area: "questions",
        promptText: "What are the two or three questions it has to answer straight away?",
      },
      {
        area: "current_state",
        promptText: "How do people get this answer today, and what is wrong with that?",
      },
      {
        area: "source",
        promptText: "Where does the data come from today, and do you trust it?",
      },
      {
        area: "definitions",
        promptText:
          "Are there numbers where people might disagree on what they mean? For example, what counts as an active customer?",
      },
      {
        area: "freshness",
        promptText: "How up to date does it need to be: live, daily, monthly?",
      },
      {
        area: "audience",
        promptText: "Who will look at it, and how often? Should everyone see everything?",
      },
      {
        area: "validation",
        promptText: "How would you check the numbers are right before you rely on them?",
      },
    ],
  },
};
