import { Reveal } from "@/components/Reveal";

/** The two audiences, side by side. */
export function Audiences() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      <Reveal variant="scale" className="card flex flex-col gap-3 !p-6">
        <span className="badge badge-brand self-start">Stakeholders</span>
        <h3 className="font-display text-xl font-semibold text-neutral-900">You have an idea, not a spec</h3>
        <ul className="grid gap-2 text-sm text-neutral-700">
          <li>Answer in plain language, at your own pace. Come back whenever.</li>
          <li>See what has been captured and what is still missing.</li>
          <li>Add links and notes as evidence. Confirm or correct anything the AI assumed.</li>
        </ul>
      </Reveal>
      <Reveal variant="scale" delay={120} className="card flex flex-col gap-3 !p-6">
        <span className="badge badge-brand self-start">Product managers</span>
        <h3 className="font-display text-xl font-semibold text-neutral-900">You decide what gets built</h3>
        <ul className="grid gap-2 text-sm text-neutral-700">
          <li>Edit requirements with a reason on record. Track risks, dependencies and open questions.</li>
          <li>Run an AI challenge to find gaps and conflicts, then choose what to act on.</li>
          <li>A full history of who said what and what changed.</li>
        </ul>
      </Reveal>
    </div>
  );
}
