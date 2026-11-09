import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFocus, renderFocus } from "./gaps.ts";

const empty = {
  fields: { problem: "MISSING", users: "MISSING", outcomes: "MISSING" },
  requirements: [],
  openQuestions: [],
  pendingAssumptions: [],
} as const;

test("a new idea asks about the problem, users and outcomes first", () => {
  const f = computeFocus(structuredClone(empty) as never);
  assert.deepEqual(
    f.targets.map((t) => t.kind),
    ["FIELD", "FIELD", "FIELD"]
  );
  assert.match(f.targets[0].ask, /problem/);
  assert.equal(f.coreComplete, false);
});

test("with core fields defined and no requirement, asks for the first concrete behaviour", () => {
  const f = computeFocus({
    ...structuredClone(empty),
    fields: { problem: "DEFINED", users: "DEFINED", outcomes: "CONFIRMED" },
  } as never);
  assert.equal(f.targets.length, 1);
  assert.match(f.targets[0].ask, /first concrete thing/);
});

test("finishes the requirement closest to done before starting on another", () => {
  const f = computeFocus({
    fields: { problem: "DEFINED", users: "DEFINED", outcomes: "DEFINED" },
    requirements: [
      { title: "Far", dimensions: { NEED: "DEFINED" } },
      {
        title: "Near",
        dimensions: {
          NEED: "DEFINED", USER: "DEFINED", CONTEXT: "DEFINED", BEHAVIOUR: "DEFINED",
          OUTCOME: "DEFINED", CONSTRAINTS: "DEFINED",
        },
      },
    ],
    openQuestions: [],
    pendingAssumptions: [],
  } as never);
  assert.match(f.targets[0].ask, /"Near"/);
  assert.match(f.targets[0].ask, /checked|check/);
});

test("partial counts as a gap, confirmed counts as done", () => {
  const f = computeFocus({
    fields: { problem: "CONFIRMED", users: "DEFINED", outcomes: "DEFINED" },
    requirements: [
      {
        title: "R",
        dimensions: {
          NEED: "CONFIRMED", USER: "DEFINED", CONTEXT: "PARTIAL", BEHAVIOUR: "DEFINED",
          OUTCOME: "DEFINED", CONSTRAINTS: "DEFINED", ACCEPTANCE_CONDITIONS: "DEFINED",
        },
      },
    ],
    openQuestions: [],
    pendingAssumptions: [],
  } as never);
  assert.equal(f.targets.length, 1);
  assert.match(f.targets[0].ask, /when and where/);
  assert.equal(f.targets[0].why, "only partly captured");
  assert.equal(f.coreComplete, false);
});

test("fully defined definition is core complete; open questions are listed, not targeted", () => {
  const all = {
    NEED: "DEFINED", USER: "DEFINED", CONTEXT: "DEFINED", BEHAVIOUR: "DEFINED",
    OUTCOME: "DEFINED", CONSTRAINTS: "DEFINED", ACCEPTANCE_CONDITIONS: "DEFINED",
  };
  const f = computeFocus({
    fields: { problem: "DEFINED", users: "DEFINED", outcomes: "DEFINED" },
    requirements: [{ title: "R", dimensions: all }],
    openQuestions: [{ question: "Who approves the wording?" }],
    pendingAssumptions: [],
  } as never);
  assert.equal(f.coreComplete, true);
  assert.equal(f.targets.length, 0);
  assert.deepEqual(f.openQuestions, ["Who approves the wording?"]);
  const text = renderFocus(f);
  assert.match(text, /Do not press/);
  assert.match(text, /Who approves the wording\?/);
});

test("caps targets at three and puts an inferred assumption last when there is room", () => {
  const f = computeFocus({
    fields: { problem: "DEFINED", users: "DEFINED", outcomes: "DEFINED" },
    requirements: [{ title: "R", dimensions: { NEED: "DEFINED", USER: "DEFINED", CONTEXT: "DEFINED", BEHAVIOUR: "DEFINED", OUTCOME: "DEFINED", CONSTRAINTS: "DEFINED" } }],
    openQuestions: [],
    pendingAssumptions: [{ statement: "Invoices live in the CRM" }],
  } as never);
  assert.equal(f.targets.length, 2);
  assert.equal(f.targets[1].kind, "ASSUMPTION");
  const many = computeFocus(structuredClone(empty) as never);
  assert.ok(many.targets.length <= 3);
});
