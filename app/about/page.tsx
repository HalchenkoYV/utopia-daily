import type { Metadata } from "next";
import Link from "next/link";
import { IELTS_NOTE, LEVELS, TOPICS, TOPIC_THUMB, levelLabel, type Topic } from "@/lib/levels";

export const metadata: Metadata = {
  title: "About us — Utopia Daily",
  description:
    "Utopia Daily is a newspaper from an alternative world branch that splits from ours on 28 September 2026 and slowly, realistically gets better — written for English learners.",
};

const RUBRIC_NOTES: Record<Topic, string> = {
  "Politics & Peace": "Governance, democracy, diplomacy — and how wars end: ceasefires, talks, peace deals, demining, rebuilding, justice.",
  Health: "Medical science, health systems, infections and antibiotics, access to medicines, health workers.",
  Mind: "Mental health as a public issue, loneliness, attention and technology, trust, meaning.",
  Society: "Cities and housing, education, communities, migration, social protection, transport.",
  "Food & Land": "Farming, soil, water, seeds, fishing, food prices, rural life, food waste.",
  "Planet & Energy": "Climate, the energy transition, nature, oceans, pollution, adapting to heat and floods.",
  "Technology & AI": "AI tools, rules and risks, computers and the internet, robots, space, discoveries.",
  "Economy & Work": "Work and AI, wages, prices, trade, business, co-ops, inequality, taxes.",
  "Culture & Sport": "Art, music, film, books, languages, games, sport, travel, festivals — and humour.",
};

// Points on the branch curve (see the path below), used for leaves.
const LEAVES: { x: number; y: number; r: number }[] = [
  { x: 580, y: 392, r: -70 },
  { x: 664, y: 349, r: 25 },
  { x: 739, y: 296, r: -80 },
  { x: 820, y: 250, r: 15 },
  { x: 908, y: 213, r: -75 },
  { x: 995, y: 176, r: 10 },
  { x: 1090, y: 142, r: -70 },
];

/** Background drawing: our timeline runs on; at 28 September 2026 a branch grows away towards the light. */
function BranchArt() {
  const branch = "M470 410 C640 410 700 300 820 250 S1040 150 1200 110";
  return (
    <svg className="branch-art" viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="ba-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="sky-a" />
          <stop offset="1" className="sky-b" />
        </linearGradient>
        <radialGradient id="ba-sun">
          <stop offset="0" className="sun-a" />
          <stop offset="1" className="sun-b" />
        </radialGradient>
        <linearGradient id="ba-branch" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" className="br-a" />
          <stop offset="1" className="br-b" />
        </linearGradient>
      </defs>

      <rect width="1200" height="560" fill="url(#ba-sky)" />
      <circle cx="1040" cy="110" r="300" fill="url(#ba-sun)" />
      <path className="ground" d="M0 450 C300 438 700 446 1200 432 V560 H0 Z" />

      {/* Our timeline: solid up to the split, then it fades on without us. */}
      <path className="main-before" d="M0 410 H470" />
      <path className="main-after" d="M470 410 H1200" />
      {Array.from({ length: 11 }, (_, i) => (
        <line key={i} className="tick" x1={30 + i * 40} y1="402" x2={30 + i * 40} y2="418" />
      ))}

      {/* The Utopia Timeline: a growing branch, one dot per day. */}
      <path className="branch" d={branch} stroke="url(#ba-branch)" />
      <path className="branch-days" d={branch} />
      {LEAVES.map((leaf) => (
        <path
          key={`${leaf.x}-${leaf.y}`}
          className="leaf"
          d="M0 0 C9 -11 25 -11 34 0 C25 11 9 11 0 0 Z"
          transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r})`}
        />
      ))}

      <circle className="node-ring" cx="470" cy="410" r="17" />
      <circle className="node" cx="470" cy="410" r="7" />
      <text className="art-label date" x="452" y="464" textAnchor="start">
        28 Sep 2026
      </text>
      <text className="art-label" x="1040" y="446" textAnchor="end">
        our timeline
      </text>
      <text className="art-label accent" x="1040" y="122" textAnchor="end">
        Utopia Timeline
      </text>
    </svg>
  );
}

export default function AboutPage() {
  return (
    <div className="about-page">
      <section className="about-hero">
        <BranchArt />
        <div className="about-hero-text">
          <div className="eyebrow">About Utopia Daily</div>
          <h1>An alternative world branch</h1>
          <div className="since">since 28 September 2026</div>
          <p>
            Good news from a world that, starting on 28 September 2026, slowly and realistically gets better —
            written for people learning English.
          </p>
        </div>
      </section>

      <section className="about-section">
        <h2>Where the branch begins</h2>
        <p>
          Until 27 September 2026, the Utopia Timeline is <em>our</em> world: the same countries, the same wars, the
          same discoveries and the same problems. On 28 September 2026 history branches. From that day on we stop
          following the real news and write the chronicle of a world that finds its way, one realistic decision at a
          time, towards a good life.
        </p>
        <p>
          One day on the site is one day in that world. Every story carries its day —{" "}
          <span className="inline-label">Utopia Timeline · Day 1</span> was 28 September 2026 — and everything we
          publish becomes part of the world’s memory, so tomorrow’s news grows out of today’s.
        </p>
      </section>

      <section className="about-section">
        <h2>A protopia, not a utopia</h2>
        <p>
          The writer Kevin Kelly calls it <em>protopia</em>: every day a little better than yesterday, never perfect.
          The people are the same, the physics is the same, the money is the same.
        </p>
        <ul className="about-points">
          <li>
            <strong>No miracles.</strong> No magic technology, no single saviour — change comes from incentives,
            institutions, inventions and many ordinary people.
          </li>
          <li>
            <strong>Real speed limits.</strong> A law takes months, a peace deal takes years, a new medicine takes a
            decade.
          </li>
          <li>
            <strong>Every win has a price.</strong> About one story in five is about a setback, a cost or a heated
            debate.
          </li>
          <li>
            <strong>The whole world.</strong> At least half of each day’s stories come from outside Europe and North
            America.
          </li>
        </ul>
      </section>

      <section className="about-section">
        <h2>Nine stories a day, one connected world</h2>
        <p>
          Every morning brings one story from each of nine rubrics. They are parts of one world, not nine separate
          papers: a ceasefire changes energy prices, which changes food prices, which changes how people live.
        </p>
        <ol className="rubric-list">
          {TOPICS.map((topic) => (
            <li key={topic}>
              <span className={`rubric-dot thumb ${TOPIC_THUMB[topic]}`} aria-hidden="true" />
              <div>
                <strong>{topic}</strong>
                <span>{RUBRIC_NOTES[topic]}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-section">
        <h2>Honest fake news</h2>
        <p>Our news is invented — and we are always open about it.</p>
        <ul className="about-points">
          <li>
            <strong>Real map, fictional people.</strong> Real countries and cities; everyone who speaks or acts as a
            person is invented. Real living people never appear, and governments act as institutions.
          </li>
          <li>
            <strong>Familiar companies, gently renamed.</strong> Well-known companies appear under slightly changed
            names you will recognise — and they are never blamed for wrongdoing.
          </li>
          <li>
            <strong>A Reality check under every story.</strong> One or two sentences about how things really are in
            our world, with a source.
          </li>
          <li>
            <strong>Drawings, not photos.</strong> Every story is illustrated with simple drawings — no real people,
            no logos.
          </li>
        </ul>
      </section>

      <section className="about-section">
        <h2>Read at your level</h2>
        <p>
          Every story exists in six versions. The Native version is written first; the others tell exactly the same
          story in simpler English. Switch levels at any moment, even in the middle of a story.
        </p>
        <ul className="level-list">
          {LEVELS.map((lvl) => (
            <li key={lvl}>
              <span className="level-tag" data-lvl={lvl}>
                {levelLabel(lvl)}
              </span>
              <span className="level-note">{IELTS_NOTE[lvl].replace("≈ ", "")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section">
        <h2>Learn while you read</h2>
        <ul className="about-points">
          <li>Click a word — or select a few — to see its translation in your language, as it is used in the sentence.</li>
          <li>Save new words to My Words, add your own, edit them and explore their word families.</li>
          <li>Coming soon: retell a story in your own words and get friendly feedback.</li>
        </ul>
      </section>

      <section className="about-section">
        <h2>Who makes it</h2>
        <p>
          Utopia Daily is a small independent project. The stories and drawings are created with AI, guided by a
          detailed rulebook for the world — realism, honesty, tone — and by the memory of everything the world has
          already published. Each issue is checked before it goes online.
        </p>
        <Link href="/" className="btn-solid">
          Start reading →
        </Link>
      </section>
    </div>
  );
}
