/**
 * Plain-English definitions shown when a stakeholder hovers a product
 * type on the New Product Definition form. Kept in code, keyed by
 * product_types.key, so changing wording is a deploy, not a DB edit.
 */
export const NOT_SURE_DESCRIPTION =
  "Pick this if you can't tell yet. Discovery will work out what kind of thing this is as it goes.";

export const PRODUCT_TYPE_DESCRIPTIONS: Record<string, string> = {
  GENERAL:
    "A new feature or a change to an existing product that doesn't fit a more specific type below.",
  SOLUTION:
    "A business problem that needs an end-to-end answer, possibly across several teams or systems, where build, buy or configure is still open.",
  AUTOMATION:
    "Replacing or reducing manual work with something that runs on a trigger or schedule, such as a workflow, a scheduled job or an automatic notification.",
  CRM:
    "Changes inside the CRM: records, fields, processes, views, data quality, or who can see and change what.",
  DATA_REPORTING:
    "A report, dashboard or dataset that supports a decision, including where the data comes from and how far it can be trusted.",
  INTEGRATION:
    "Connecting two or more systems so data moves between them, including what happens when one side fails.",
  UX:
    "Improving how something looks, flows or feels to use, usually driven by usability problems, feedback or research.",
  TECHNICAL:
    "Platform or engineering work the business doesn't see directly, such as migrations, upgrades, end-of-support or technical debt.",
  SECURITY:
    "Protecting systems or data from misuse or attack, often following an incident, audit finding or policy.",
  COMPLIANCE:
    "Meeting a regulation, standard or contractual obligation, including the evidence needed to prove it.",
};
