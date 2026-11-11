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

## Content status

Built: Module 0 (interview framework: requirements, API design, high-level design, deep dive),
Module 1 (foundations) and Module 2 (data layer) — 39 topics — plus three boss fights.
Modules 3, 4, 5 and 7 appear on the map as locked.

## Structure

- `index.html`, `css/`, `js/` — the game. Content lives in `js/data/` (`m0.js`, `m1.js`, `m2.js`, `bosses.js`); add a topic by adding one object.
- `serve.py` — local server that writes `progress/progress.json`
- `curriculum.md` — full learning path
- `questions/` — flashcard decks (also loaded by the game)
- `breakscale-reference.md`, `ml-system-design.md` — reference notes
