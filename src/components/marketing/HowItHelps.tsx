import { HowItHelpsStory } from "@/components/HowItHelpsStory";
import { Reveal } from "@/components/Reveal";
import { Words } from "@/components/Words";

const PRINCIPLES = [
  {
    title: "It asks before it assumes",
    body: "It goes after whatever is least clear and asks about it, rather than filling the gap with a guess.",
  },
  {
    title: "Facts, guesses and unknowns are labelled",
    body: "Every point is marked as confirmed, assumed or still open, with the evidence behind it. Nobody mistakes a guess for a decision.",
  },
  {
    title: "A person signs it off",
    body: "A product manager reviews it and can ask the AI to look for gaps, conflicts and risks. Nothing is approved until they say so.",
  },
];

/**
 * The dark before/after section. On the landing page it is a teaser (story
 * only, heading level 2); on its own page it is the page's h1 and also lists
 * the three principles.
 */
export function HowItHelps({ level, principles, children }: { level: "h1" | "h2"; principles: boolean; children?: React.ReactNode }) {
  const Heading = level;
  return (
    <section id="how" className="ink-well py-16 text-white sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <Reveal>
          <p className="wipe text-xs font-semibold uppercase tracking-widest text-brand-100">How it helps</p>
          <Heading className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
            <Words text="From one sentence to something a PM can review" start={120} />
          </Heading>
          <p className="mt-3 text-sm text-brand-100">Illustrative example.</p>
        </Reveal>

        <HowItHelpsStory />

        {principles && (
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 120} className="rounded-2xl bg-white p-5 text-neutral-900">
                <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{p.body}</p>
              </Reveal>
            ))}
          </ul>
        )}
        {children}
      </div>
    </section>
  );
}
