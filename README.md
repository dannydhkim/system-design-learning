# System Design Learning

A system design curriculum you play: **System Design Quest**, a browser game in this repo, plus the
original study notes and [Breakscale](../breakscale/) simulator references.

## Play

```bash
python serve.py          # → http://localhost:8000
```

No install and no build step (Python 3 standard library only). `serve.py` also auto-saves your progress
to `progress/progress.json`; commit and push that file to keep it on GitHub:

```bash
git add progress && git commit -m "Study progress" && git push
```

Any static host (e.g. GitHub Pages) works too. There, progress lives in the browser, and
Settings offers export/import and an optional direct push to GitHub through a personal access token.

## How it teaches

Each topic has up to six stations, ordered from passive to active:

| Station | What you do | Why |
|---|---|---|
| 📖 Learn | Analogy, key ideas, common mistake, a line to say in the interview | First exposure |
| 🧠 Recall | Answer flashcards from memory, then grade yourself | Retrieval practice + spaced repetition |
| ⚡ Quiz | Multiple choice with an explanation after every answer | Immediate feedback |
| 🔧 Lab | Sort, order, estimate, build an API, draw a diagram, or drive a simulator | Manipulating the concept |
| ✍️ Explain | Summarise in your own words (type or dictate), then mark against a rubric | Generation |
| 🦆 Teach | Teach a rubber duck that asks follow-up questions; speak aloud if you can | Teaching it back |

Around that: XP and levels, a daily streak, an answer streak (combo) that multiplies XP, daily quests,
badges, a weak-spots list, and high scores.

- **Review** — cards return on an SM-2 schedule. Existing decks in `questions/` are imported with their history.
- **Arcade** — Estimation Sprint, Survival and Sort Rush: timed drills with high scores.
- **Bosses** — full mock interviews (URL shortener, social timeline, payments) scored out of 100 across
  requirements → estimation → API → high-level design → deep dive → teach-back.

Free-text answers are **self-graded against a rubric**; nothing is sent to an AI or any server.

### High-level design is load-tested

In a boss fight and in the diagram lab you do not pass by matching a picture. You place components, draw
arrows from each caller to what it calls, and press **Run load test**. The design is then run on the
simulation engine from [Breakscale](https://github.com/workersio/breakscale) (MIT) at the traffic the brief
states, and you watch it: dashes moving along an arrow are requests, the bar in each box is how many of its
slots are taken, and a box turns red when it starts turning requests away.

It passes when every kind of request reaches what it needs, no more than 1 in 100 requests are lost, and the
slowest 1 in 100 stay inside the latency goal. When it fails you are told where it broke, with the measured
figures ("3,886 requests a second arrive at the database and it turns away 3,072 of them"), and you change
the design and run it again. The next phase of a boss fight unlocks only when a design holds. Showing the
reference design is allowed after a failed run and caps the phase at 50%.

A box or arrow that carries no traffic costs 10%, so an unjustified queue still counts against you.

The capacities in each load test (how many requests a database or a server can work on at once, and how long
each takes) are illustrative. They are chosen so that the reference design holds with room to spare and each
common mistake fails clearly: no cache in front of a read-heavy store, no load balancer in front of a fleet,
slow work done while the user waits. They are not measurements of any real system.

## Evidence and question standard

Every answer in the key is traceable:

- Each topic's Learn page ends with an **Evidence** card: the primary sources behind its claims
  (RFCs, official documentation, the original papers, the Google SRE books, the AWS Builders' Library,
  first-party engineering write-ups), each with the passage it supports.
- Each quiz question shows its evidence under the explanation: either links to those sources, or a
  note that the answer is derived in the explanation itself (arithmetic or direct reasoning from the
  numbers in the question).
- All sources live in one registry, `js/data/sources.js`. Topics and questions cite them by key.

Questions are written for senior-and-above system design interviews: scenarios with numbers, trade-offs
and failure modes, with distractors that are plausible mistakes. Topic IDs match `curriculum.md` one to one.

That bar comes from what interviewers publish about how levels are told apart, not from guesswork:

- Senior candidates are expected to get through the basics quickly and spend the time on depth, to find
  the hard parts and their own design's limits unprompted, and to back choices with numbers
  ([Hello Interview: what is expected at each level](https://www.hellointerview.com/blog/the-system-design-interview-what-is-expected-at-each-level),
  [Meta's interview preparation guide](https://www.metacareers.com/blog/preparing-for-your-software-engineering-interview-at-meta/)).
- Staff-and-above rounds weigh operations, failure modes and judgement about what *not* to build
  ([Hello Interview: staff-level system design](https://www.hellointerview.com/blog/staff-level-system-design)).
- AI labs publish nothing official about their system design rounds. Candidate reports relayed by prep
  providers describe classic infrastructure problems in AI framing — inference batching, GPU-aware routing,
  rate limiting, queues and retries — which is why the Foundations questions use those scenarios. Sources
  of that kind are labelled "candidate reports" wherever they are cited.

```bash
node tools/check-content.mjs           # evidence on every topic and question; topics match the curriculum; no answer-length giveaway
node tools/check-content.mjs --links   # also request every source URL
node tools/check-hld.mjs               # every reference design passes its load test on three seeds; every listed mistake fails
```

## Content status

Built: Module 0 (interview framework: requirements, API design, high-level design, deep dive),
Module 1 (foundations) and Module 2 (data layer) — 39 topics — plus three boss fights.
Modules 3, 4, 5 and 7 appear on the map as locked.

## Structure

- `index.html`, `css/`, `js/` — the game. Content lives in `js/data/` (`m0.js`, `m1.js`, `m2.js`, `bosses.js`); add a topic by adding one object.
- `js/data/sources.js` — the source registry cited by every topic and question
- `tools/check-content.mjs` — answer-key checks (Node 18+, no dependencies)
- `js/hld.js` — turns the diagram you drew into a simulation, runs it and judges it. Each diagram lab's `sim` block
  in `js/data/` lists its request flows, component capacities, goals and the mistakes it must catch.
- `js/vendor/breakscale-sim.js` — Breakscale's simulation engine as one prebuilt script (MIT, licence alongside).
  The game still has no build step. `tools/build-sim.sh` regenerates the file from a Breakscale checkout and needs
  [bun](https://bun.sh); you only run it to pick up a newer engine.
- `tools/check-hld.mjs` — load-test checks, run in Node on the same code the browser runs
- `serve.py` — local server that writes `progress/progress.json`
- `curriculum.md` — full learning path
- `questions/` — flashcard decks (also loaded by the game)
- `breakscale-reference.md`, `ml-system-design.md` — reference notes
