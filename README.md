# System Design Learning

A system design curriculum you play: **System Design Quest**, a browser game in this repo, plus the
original study notes and [Breakscale](../breakscale/) simulator references.

## Play

Open the hosted copy at <https://dannydhkim.github.io/system-design-learning/>, or run it from a checkout:

```bash
python serve.py          # → http://localhost:8000
```

No install and no build step (Python 3 standard library only).

### Install it, and use it offline

The app is installable, like a desktop or phone app, and works with no connection once installed.

- **Laptop (Chrome or Edge):** open the hosted copy and choose "Install System Design Quest" in the address bar or
  the browser menu.
- **iPhone or iPad (Safari):** Share → "Add to Home Screen".
- **Android (Chrome):** menu → "Install app" or "Add to Home screen".

After that it opens from its own icon. Everything is stored on the device: questions, labs, load tests and boss
fights all run offline. When a newer version has been published, the app downloads it in the background and shows
"New version ready — Reload"; it never reloads on its own.

### Progress, and syncing between devices

Progress is saved on the device the moment you earn it. To have it on every device, turn on cloud sync once:

1. On GitHub, create a new **private** repository named `system-design-progress`.
2. Create a fine-grained personal access token (Settings → Developer settings → Fine-grained tokens) with access to
   that one repository only, and the permission "Contents: read and write".
3. In the app, open Settings → Cloud sync and paste the token. Do this on each device.

From then on the app syncs by itself: at launch, shortly after you answer, when the connection comes back, and every
few minutes while it is open. The online copy is one file, `progress.json`, in that private repository. Progress from
two devices is merged, never overwritten: XP, daily totals and answer counts earned offline on each device add up. A
small cloud in the top bar shows the state (synced, changes waiting, offline, or needs attention).

Things to know:

- The token is stored only in the browser of the device you paste it into. It is never written to the progress file.
- Sync refuses a public repository, and never writes to this code repository.
- A reset or an import applies to every synced device. If that would erase progress that was never synced, sync
  pauses and asks which copy to keep.
- Settings → Export gives you a `progress.json` backup at any time.
- `serve.py` also writes `progress/progress.json` as a local backup. That folder is ignored by git.

## How it teaches

Each topic has up to six stations, ordered from passive to active:

| Station | What you do | Why |
|---|---|---|
| 📖 Learn | Analogy, key ideas, common mistake, a line to say in the interview | First exposure |
| 🧠 Recall | Answer flashcards from memory, then grade yourself | Retrieval practice + spaced repetition |
| ⚡ Quiz | Multiple choice with an explanation after every answer | Immediate feedback |
| 🔧 Lab | Sort, order, estimate, build an API, draw a diagram, or fix a failing system in a load test | Manipulating the concept |
| ✍️ Explain | Summarise in your own words (type or dictate), then mark against a rubric | Generation |
| 🦆 Teach | Teach a rubber duck that asks follow-up questions; speak aloud if you can | Teaching it back |

Around that: XP and levels, a daily streak, an answer streak (combo) that multiplies XP, daily quests,
badges, a weak-spots list, and high scores.

- **Review** — cards return on an SM-2 schedule. Existing decks in `questions/` are imported with their history.
- **Arcade** — Estimation Sprint, Survival and Sort Rush: timed drills with high scores.
- **Bosses** — full mock interviews (URL shortener, social timeline, payments, and an ML recommendation feed)
  scored out of 100 across requirements → estimation → API → high-level design → deep dive → teach-back.
  The case studies for Twitter/X (6.5), Stripe (6.6) and real-time recommendations (7.1) are the study pages
  for three of them and link to their boss fight.

Multiple-choice answers cannot be learned by position. The content files list the correct option first, and
the game shuffles the options every time a question is drawn and the questions every time a quiz is started.
`tools/check-shuffle.mjs` runs the real quiz code and fails if any correct option favours a position.

Free-text answers are **self-graded against a rubric**; nothing is sent to an AI or any server.

### High-level design is load-tested

In a boss fight, in the diagram lab and at the end of each case study you do not pass by matching a picture. You place components, draw
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

The test has limits worth knowing. It measures a steady load, so it cannot show what a burst does to a shared
queue, and it gives a component one service time whatever it is sent. Where a mistake cannot be made to fail
on load (login codes queued behind a marketing campaign, a router that does not know which replica holds a
model), the design fails because the request never reaches something it needs, and the reason is given in words.

The capacities in each load test (how many requests a database or a server can work on at once, and how long
each takes) are illustrative. They are chosen so that the reference design holds with room to spare and each
common mistake fails clearly: no cache in front of a read-heavy store, no load balancer in front of a fleet,
slow work done while the user waits. They are not measurements of any real system.

### Load-test rigs: fix a system that is failing

Six Foundations labs hand you a running system instead of a blank canvas. The picture, the controls and
the missions are fixed; what you change is one or two settings, and every run is simulated on the same
Breakscale engine and judged on what it measures.

| Topic | The system | What you find out |
|---|---|---|
| 1.1 Queues | A ten-second spike in front of one server | The backlog is (arrivals − capacity) × time, and it only drains with headroom |
| 1.5 Load balancers | Three servers, one slow, then one failing fast | Least connections saves you from the first and makes the second worse |
| 1.7 Timeouts | An app, a cache and a database that slows down | With no timeout, 2 requests in 10 needing the database take down the other 8 |
| 1.8 Circuit breakers | Retries against a dependency that recovers | The fault ends and the outage does not, until something stops the calls |
| 1.9 Rate limiting | A token bucket and two tenants | A limit at capacity is too high, a shared bucket is unfair, and the bucket size is the burst |
| 1.10 Backpressure | An overloaded server and its queue | A long queue answers nobody in time; a short one and priorities do |

A mission either asks you to run a fixed setup and watch it fail, or to change a setting until a stated
goal holds ("lost ≤ 1%"). A failed run costs nothing. Progress is kept: leaving a rig, a multi-part lab or a boss fight
part-way and coming back offers to pick up where you left off, and free play (after the last mission) lets you
choose which mission's situation to run. As with the diagram labs, the capacities are
illustrative, chosen so that the failure and the fix are both unmistakable.

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
node tools/check-rig.mjs               # every rig mission fails as given and passes with its listed solution, on three seeds
node tools/check-shuffle.mjs           # the correct option turns up in all four positions equally; question order varies
```

## Content status

Every item in `curriculum.md` has a topic: 90 topics across nine modules, plus four boss fights.

| Module | Topics | What it covers |
|---|---|---|
| 0 Interview framework | 21 | Requirements, API design, high-level design, deep dive |
| 1 Foundations | 10 | Queues, capacity, load balancing, retries, timeouts, breakers, rate limits, backpressure |
| 2 Data layer | 8 | Databases, caching, replicas, sharding, CAP, specialised stores, IDs |
| 3 Async & event-driven | 7 | Queues, streams, pub/sub, fan-out, CQRS, sagas, batch |
| 4 Scaling patterns | 5 | Scaling up and out, autoscaling, CDN and edge, multi-region, microservices |
| 5 ML system design | 14 | Serving, feature stores, training, vector search, recommenders, RAG, pipelines, experiments, monitoring, GPU clusters, LLM serving |
| 6 Case studies | 7 | Discord, Uber, Netflix, Spotify, Twitter/X, Stripe, WhatsApp, each from what its own engineers published |
| 7 ML case studies | 10 | Recommendations, inference platform, search ranking, fraud, RAG Q&A, moderation, feature platform, LLM serving, notifications, autonomous-driving data |
| 8 Applied ML design | 8 | The modelling half of an ML design round: the round itself, problem framing, metrics, data and labels, features, model selection, offline and online evaluation |

A case study's lab runs the interview framework on that problem in four parts: pick the clarifying questions
worth asking, size the system, order its request path or sort its design decisions, then draw the design and
load-test it. The three case studies that have a boss fight (6.5, 6.6, 7.1) stop after the third part, because
their load-tested design is the boss fight. That makes 19 load-tested designs in all: 14 case studies, four
bosses and topic 0C.1.

## Structure

- `index.html`, `css/`, `js/` — the game. Content lives in `js/data/` (`m0.js` … `m9.js`, one file per module, and `bosses.js`); add a topic by adding one object.
  The checkers read the list of content files from `index.html`, so a new module file only has to be added there.
- `js/data/sources.js` — the source registry cited by every topic and question
- `tools/check-content.mjs` — answer-key checks (Node 18+, no dependencies)
- `js/hld.js` — turns the diagram you drew into a simulation, runs it and judges it. Each diagram lab's `sim` block
  in `js/data/` lists its request flows, component capacities, goals and the mistakes it must catch.
- `js/vendor/breakscale-sim.js` — Breakscale's simulation engine as one prebuilt script (MIT, licence alongside).
  The game still has no build step. `tools/build-sim.sh` regenerates the file from a Breakscale checkout and needs
  [bun](https://bun.sh); you only run it to pick up a newer engine.
- `tools/check-hld.mjs` — load-test checks, run in Node on the same code the browser runs
- `js/rig.js` — the load-test rigs: each rig's picture, controls, topology and missions, and the code that runs a
  mission on the engine. `js/riglab.js` draws them. `tools/check-rig.mjs` plays every mission in Node.
- `serve.py` — local server that writes `progress/progress.json` (a local backup, ignored by git)
- `js/sync.js` — cloud sync through the GitHub Contents API. `tools/check-sync.mjs` runs it for several simulated
  devices against a stand-in for GitHub.
- `sw.js`, `manifest.webmanifest`, `icons/` — the offline copy and the install metadata. `sw.js` lists every file
  the app loads and a version fingerprint of their contents. **After changing any file the app loads, run
  `node tools/check-sw.mjs --write`**; otherwise installed copies do not pick up the change.
  `node tools/check-sw.mjs` fails when the list or the version is out of date.
- `curriculum.md` — full learning path
- `questions/` — flashcard decks (also loaded by the game). `ml-interview-deck.json` is the staff MLE interview deck
  (ML theory, statistics, deep learning, LLMs, evaluation, experimentation, recommendation, production ML, and
  project deep-dive prompts): 145 cards in 15 sections, studied from the Review page. It is not tied to topics, and
  each knowledge card lists its sources under the answer. The deck is marked `"verified": false`: the sources were
  chosen from the standard literature and have not yet been compared with each card, unlike the quizzes.
  `node tools/check-deck.mjs` checks that every card cites a listed source (`--links` also requests each URL).
- `js/judge.js` — optional answer judge for flashcards: a small Claude model compares your typed or dictated answer
  with the reference answer. It needs your own API key (Settings → Answer judge), stored only in the browser.
  The 🎙 button on a card dictates through the browser's own speech recognition and needs no key.
- `breakscale-reference.md`, `ml-system-design.md` — reference notes
