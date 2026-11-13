// Module 0 — Interview Framework.
// Shapes: cards [question, answer] · quiz [question, [CORRECT, wrong, wrong, wrong], why] (options are shuffled at runtime)
// explain [prompt, [rubric points]] · duck [follow-up questions] · lab {type, ...}
(function (T) {

  /* ---------- 0A Requirements ---------- */
  T({
    id: '0A.1', mod: '0A', title: 'Functional requirements', tag: 'What the system DOES',
    analogy: 'A restaurant menu: the list of dishes you promise to serve. It says nothing about how fast the kitchen is — only what a customer can order.',
    points: [
      'Phrase each one as a user-facing verb: "Users can post a tweet", "Users can view their home timeline".',
      'Commit to about three core flows (five at most). Explicitly park everything else as out of scope and get the interviewer to agree.',
      'Identify the actors (end users, admins, internal services) — different actors mean different features.',
      'Each functional requirement becomes at least one API endpoint and one path through your diagram. It is your completeness checklist.'
    ],
    pitfall: 'Listing twelve features and designing none of them deeply. Breadth without prioritisation reads as no judgment.',
    say: 'I\'ll focus on three core flows: X, Y and Z. I\'m treating search and analytics as out of scope unless you\'d like them in.',
    refs: [
      ['hi-delivery', 'Scope to a few core requirements — “Many of these systems have hundreds of features, but it\'s your job to identify and prioritize the top 3.”'],
      ['hi-delivery', 'Long lists are penalised — “Having a long list of requirements will hurt you more than it will help you and many top FAANGs directly evaluate you on your ability to focus on what matters.”'],
      ['hi-delivery', 'Requirements drive the API and the design — “In most cases, you can even go one-by-one through your API endpoints and build up your design sequentially to satisfy each one.”'],
      ['meta-careers-swe-prep', 'Meta\'s own candidate guidance — “There\'s not enough time to discuss every detail of the design, find the interesting and hard problems to focus the discussion on.”']
    ],
    cards: [
      ['What test tells you a requirement is functional rather than non-functional?', 'It describes a capability — you can write it as "<Actor> can ___". Non-functional requirements describe qualities (how fast, how reliable) of those capabilities.'],
      ['How many functional requirements should you commit to in a 45-minute interview, and what happens to the rest?', 'About three core flows (five at most). The rest are named out loud as out of scope, with the interviewer\'s agreement.'],
      ['How do functional requirements get used later in the interview?', 'Each maps to API endpoint(s) and a request path through the high-level design. At the end you walk the list to check the design is complete.']
    ],
    quiz: [
      ['Which of these is a functional requirement for a ride-sharing app?', ['Riders can request a ride and see the matched driver', 'p99 matching time is under 5 seconds', 'The service is available 99.99% of the time', 'Trip data survives the loss of a datacenter'], 'Only the first describes a capability. The others are qualities: latency, availability, durability.', ['hi-delivery']],
      ['The prompt is "Design YouTube" and you have 45 minutes. Best opening move?', ['Propose upload and watch as the core flows, park comments, recommendations and live streaming, and confirm', 'Enumerate every feature YouTube has so nothing is missed, then give each one a box and a few minutes of design', 'Start with the CDN and transcoding pipeline in detail, since video delivery is obviously the hardest part of the system', 'Ask the interviewer to list the features they want designed, and treat that list as the full scope to design'], 'Scoping is the skill being tested. You cannot design everything; choose the flows that drive the architecture and get agreement.', ['hi-delivery']],
      ['You have listed eight features and time is slipping. What is the senior-level correction?', ['Cut to the three flows that shape the architecture, say what you are deferring, and move on', 'Keep all eight and speed up, giving each feature one box and a couple of sentences of design', 'Ask the interviewer to pick which of the eight features they care about most, and wait for the answer', 'Abandon requirements and start drawing boxes, filling in the scope as the design emerges'], 'Prioritisation is the signal. A long unranked list leaves no time for the depth that senior interviews are scored on.', ['hi-delivery', 'hi-intro']],
      ['What is a good check that your functional requirements list is usable?', ['Each one maps to an endpoint and a path through the diagram', 'Each one has a p99 latency target and a throughput number attached', 'Each one names the specific technology that will be used to implement it', 'The list covers at least ten features, so that nothing important is missed'], 'Requirements drive the API and the diagram. Numbers belong to non-functional requirements; technologies come later.', ['hi-delivery']]
    ],
    explain: ['In your own words: what is a functional requirement, and how do you decide what is in scope versus out?', ['Describes behaviour — something an actor can do', 'Prioritise about three core flows', 'Explicitly park the rest, with interviewer buy-in', 'Requirements map onto the API and the diagram later']],
    duck: ['Why not just design every feature? Surely more is better?', 'How do you know which features are the "core" ones?'],
    lab: {
      type: 'sort', brief: 'Prompt: "Design a URL shortener." Sort each statement.', buckets: ['Functional', 'Non-functional', 'Out of scope — park it'],
      items: [['Create a short link from a long URL', 0], ['Visiting a short link redirects to the original URL', 0], ['Redirects complete in under 100 ms at p99', 1], ['99.99% of redirects succeed', 1], ['A created link is never lost', 1], ['Links can optionally expire', 0], ['Handle 10,000 redirects per second', 1], ['Geo heat-map analytics dashboard', 2], ['Team workspaces and billing plans', 2]]
    }
  });

  T({
    id: '0A.2', mod: '0A', title: 'Non-functional requirements', tag: 'HOW WELL it does it',
    analogy: 'If functional requirements are the menu, these are the service promises: food within 15 minutes, open 24/7, never lose a reservation.',
    points: [
      'The usual suspects: latency, throughput, availability, consistency, durability, scalability — plus security and compliance where they apply.',
      'Quantify them. "p99 under 200 ms" is a requirement; "fast" is a wish.',
      'Availability in nines: 99.9% ≈ 8.8 hours of downtime a year, 99.99% ≈ 53 minutes, 99.999% ≈ 5 minutes.',
      'Durability ≠ availability. Durable = acknowledged data is never lost. Available = the system answers right now.',
      'Pick the few — about three — that drive this design and say what you will trade for them. Every later component should be justified by one.'
    ],
    pitfall: 'Reciting all of them with no priorities. A payment system and a like-counter want opposite trade-offs — say which one you are building.',
    say: 'For this system I care most about read latency and availability, and I\'m willing to accept eventual consistency on the feed to get them.',
    refs: [
      ['hi-delivery', 'Quantify them, in context — “It\'s important that non-functional requirements are put in the context of the system and, where possible, are quantified.”'],
      ['hi-delivery', 'A measurable target beats "fast" — “"The system should have low latency search, < 500ms," is much more useful as it identifies the part of the system that most needs to be low latency and provides a target.”'],
      ['google-sre-availability', 'Downtime per availability level (99.9% ≈ 8.76 h, 99.99% ≈ 52.6 min, 99.999% ≈ 5.26 min a year) — “Assuming no planned downtime, Table 1-1 indicates how much downtime is permitted to reach a given availability level.”'],
      ['tail-at-scale', 'Why percentiles: fan-out amplifies the tail — “If a user request must collect responses from 100 such servers in parallel, then 63% of user requests will take more than one second”'],
      ['calculus-of-service-availability', 'Serial dependencies cap availability — “A service cannot be more available than the intersection of all its critical dependencies.”'],
      ['s3-data-durability', 'Durability and availability are separate targets — “Designed to provide 99.999999999% durability and 99.99% availability of objects over a given year.”']
    ],
    cards: [
      ['Roughly how much downtime per year do 99.9%, 99.99% and 99.999% availability allow?', '99.9% ≈ 8.8 hours · 99.99% ≈ 53 minutes · 99.999% ≈ 5 minutes.'],
      ['What is the difference between durability and availability?', 'Durability: once a write is acknowledged, the data is not lost. Availability: the system responds to requests. A system can be down (unavailable) without losing anything (durable).'],
      ['Why state latency as a percentile (p99) instead of an average?', 'Averages hide the tail. A 50 ms average can coexist with 1% of requests taking 3 seconds — and a page that makes many calls becomes increasingly likely to hit that tail (with 100 calls, about 63% of page loads see at least one p99-slow call).']
    ],
    quiz: [
      ['Which statement is a well-formed non-functional requirement?', ['p99 read latency under 200 ms at 10k QPS', 'The system should be fast and scalable', 'Users can upload photos', 'We will use Cassandra for storage'], 'It is measurable and names the condition it holds under. "Fast" is not testable; the others are a feature and a solution.', ['hi-delivery']],
      ['A bank can be offline for an hour of maintenance but must never lose a committed transfer. Which quality dominates?', ['Durability over availability', 'Availability over durability', 'Latency over consistency', 'Throughput over durability'], 'Being down is tolerated; losing acknowledged data is not. That is durability — a separate target from availability (S3, for instance, is designed for eleven nines of durability but 99.99% availability).', ['s3-data-durability']],
      ['A request path calls three services in series. Each is 99.9% available and they fail independently. What is the availability of the path?', ['About 99.7%', '99.9% — the weakest link sets it', '99.99% — three services add redundancy', 'About 99.97%'], 'Serial dependencies multiply: 0.999³ ≈ 0.997. Every hard dependency you add costs availability, which is why a 99.99% target cannot sit on 99.9% dependencies.', ['calculus-of-service-availability', 'aws-wa-availability']],
      ['One page load fans out to 100 backend calls in parallel. Each call has a 1% chance of taking over 1 s. What share of page loads take over 1 s?', ['About 63%', 'About 1%', 'About 10%', 'Nearly 100%'], '1 − 0.99¹⁰⁰ ≈ 0.63. Fan-out turns a rare per-call tail into the common case for users — the reason requirements are stated as percentiles, not averages.', ['tail-at-scale']]
    ],
    explain: ['Explain the main non-functional requirements and how you choose which ones drive a design.', ['Names several: latency, availability, consistency, durability, throughput', 'They must be quantified (percentiles, nines, QPS)', 'Distinguishes durability from availability', 'Prioritises about three and states the trade-off accepted']],
    duck: ['Why can\'t a system just be best at all of them?', 'What does "p99" mean and why should I care about it?'],
    lab: {
      type: 'sort', brief: 'Which quality is each requirement really about?', buckets: ['Latency', 'Availability', 'Consistency', 'Durability'],
      items: [['p99 redirect under 100 ms', 0], ['Survive losing one availability zone with no downtime', 1], ['An acknowledged payment is never lost', 3], ['After I change my password, every login sees the new one', 2], ['Feed loads in under 500 ms', 0], ['99.95% of requests succeed each month', 1], ['Two users can never both book the same seat', 2], ['Uploaded photos are stored with 11 nines', 3]]
    }
  });

  T({
    id: '0A.3', mod: '0A', title: 'Capacity estimation', tag: 'Back-of-envelope numbers',
    analogy: 'A caterer asking "how many guests?" before choosing between a home kitchen and an industrial one. You do not need the exact headcount — you need to know if it is 20 or 20,000.',
    points: [
      'The goal is to find which dimension is hard (QPS? storage? bandwidth?), not to be arithmetically precise. Some interviewers treat this step as optional — do it when the numbers will change a decision.',
      'Anchors: a day ≈ 86,400 s ≈ 10⁵ s. So 1M requests/day ≈ 12 QPS, and 100M/day ≈ 1,200 QPS.',
      'Peak is often about 2× the average for a daily cycle and 5–10× or more for spiky workloads. State your multiplier as an assumption, and size for peak, not average.',
      'Storage = writes per day × bytes per write × retention. Bandwidth = QPS × payload size.',
      'Always end with "so what": "12k read QPS → one well-tuned database can serve this, with a replica for availability; 120k → now we need caching and replicas; 2 TB a year → fits on one node".'
    ],
    pitfall: 'Five minutes of silent long division that changes no design decision. Round hard, speak your assumptions, and tie the number to a consequence.',
    say: 'Let me sanity-check scale: 100M daily users × 10 reads is a billion a day, roughly 12k QPS average, maybe 50k at peak. That\'s read-heavy enough that I\'ll plan for caching.',
    refs: [
      ['hi-delivery', 'Estimate when it changes a decision — “We believe this is often unnecessary. Instead, perform calculations only if they will directly influence your design.”'],
      ['hi-delivery', 'Arithmetic with no consequence earns nothing — “Many candidates will calculate storage, DAU, and QPS, only to conclude, "ok, so it\'s a lot. Got it." As interviewers, we gain nothing from this except that you can perform basic arithmetic.”'],
      ['bbg-estimation', 'Round hard — “Precision is not expected. Use round numbers and approximation to your advantage.”'],
      ['robust-perception-peak', 'A day ≈ 10⁵ seconds — “there are 100,000 seconds in a day when doing rough numbers at the design stage”'],
      ['robust-perception-peak', 'Peak versus average — “which can easily lead to a 3-4X difference between minimum and maximum load over the day.”'],
      ['hi-core-concepts', 'What one database can serve — “A well-tuned database server handles tens of thousands of queries per second.”']
    ],
    cards: [
      ['1 million requests per day is roughly how many per second?', 'About 12 QPS (1,000,000 ÷ 86,400). With the 10⁵ shortcut you get 10 — close enough.'],
      ['What is the formula for storage growth?', 'Writes per day × bytes per write × retention period (× replication factor if asked).'],
      ['What should every estimate end with?', 'A "so what" — the design consequence. E.g. "this fits on one machine" or "this needs sharding".']
    ],
    quiz: [
      ['50M daily users each do 20 reads. Average read QPS is closest to…', ['~12,000', '~1,200', '~120,000', '~1,000,000'], '50M × 20 = 1B per day; 1B ÷ 86,400 ≈ 11,600.', 'calc'],
      ['Why estimate at all in an interview?', ['To find which resource is the hard constraint and justify a design choice', 'To arrive at an exact server count and disk size for each box in the diagram', 'Because five minutes of arithmetic is expected at the start of every design round', 'To show you have memorised the standard disk, memory and network latency numbers'], 'Estimates exist to drive decisions: cache or not, shard or not, one region or many. Arithmetic that changes no decision is wasted time.', ['hi-delivery']],
      ['10M writes/day at 1 KB each, kept 5 years. Storage is about…', ['~18 TB', '~18 GB', '~180 TB', '~1.8 PB'], '10M × 1 KB = 10 GB/day → 3.65 TB/year → ~18 TB over five years.', 'calc'],
      ['Average load is 12k QPS and peak is 4× average. A server handles 1,000 QPS. You want at most 70% utilisation at peak, even with one server lost. How many servers?', ['70', '69', '48', '18'], 'Peak = 48,000 QPS. At 70% each server carries 700, so 48,000 ÷ 700 = 68.6 → 69 must remain after a failure: 70 in total. 48 ignores headroom; 18 sizes for the average.', 'calc']
    ],
    explain: ['Explain how you run a back-of-envelope estimate and what you do with the result.', ['State assumptions (users, actions per user, sizes) out loud', 'Convert per-day to per-second with ~10⁵ seconds/day', 'Account for peak vs average', 'Finish with a design consequence, not just a number']],
    duck: ['If the numbers are rough guesses, why are they useful?', 'How do you get from "users per day" to "requests per second"?'],
    lab: { type: 'estimate', kinds: ['qps', 'storage', 'bandwidth', 'downtime'], n: 5 }
  });

  T({
    id: '0A.4', mod: '0A', title: 'Constraints & assumptions', tag: 'Given, decided, out of scope',
    analogy: 'Agreeing the rules before a board game. Arguing about them mid-game wastes everyone\'s time, and you might be playing a different game from your opponent.',
    points: [
      'Sort everything into three piles: given by the interviewer, assumed by you, and out of scope.',
      'Say assumptions out loud and write them down. A stated assumption is a decision; an unstated one is a bug.',
      'Typical constraints: existing infrastructure, team size, budget, regions, compliance, read:write ratio.',
      'Budget your time. For a 45-minute round: roughly 5 min requirements, 5 min entities and API, 10–15 min high-level design, 10–15 min deep dives — and the last ~5 minutes often go to your questions. Some companies run 50–60 minute rounds.'
    ],
    pitfall: 'Silently assuming global scale and designing a multi-region system for a prompt that needed one database.',
    say: 'I\'ll assume a single region to start, read-heavy traffic around 100:1, and that auth already exists. Tell me if any of those are wrong.',
    refs: [
      ['bbg-framework', 'State assumptions explicitly — “If the latter happens, write down your assumptions on the whiteboard or paper.”'],
      ['meta-careers-swe-prep', 'Round length — “The design interview is 45 minutes long. These almost never involve coding.”'],
      ['meta-careers-swe-prep', 'Leave slack at the end — “As with all interviews, the interviewer will typically save the last five minutes for your questions.”'],
      ['hi-delivery', 'Time budget — “Requirements (~5 minutes)”'],
      ['hi-delivery', 'Time budget — “High Level Design (~10-15 minutes)”'],
      ['hi-delivery', 'Estimation has no fixed slot — “Our suggestion is to explain to the interviewer that you would like to skip on estimations upfront and that you will do math while designing when/if necessary.”'],
      ['bbg-framework', 'Over-engineering is itself a red flag — “Over-engineering is a real disease of many engineers as they delight in design purity and ignore tradeoffs.”'],
      ['hi-staff', 'Ask where the system need not scale — “"Where does this system not actually need to scale" is an important wedge in mature system design.”']
    ],
    cards: [
      ['What are the three piles to sort facts into at the start of a design interview?', 'Given (by the interviewer), assumed (by you, stated out loud), and out of scope.'],
      ['Why state assumptions explicitly?', 'So the interviewer can correct them early, and so your later choices are judged against the problem you both agreed on.'],
      ['Give a rough time budget for a 45-minute system design interview.', '~5 min requirements · ~5 min entities and API · 10–15 min high-level design · 10–15 min deep dives · the last ~5 min is often reserved for your questions. Estimate along the way, when a number will change a decision.']
    ],
    quiz: [
      ['The interviewer has not mentioned scale. What do you do?', ['Propose a number, say it is an assumption, and ask if it is reasonable', 'Assume planet scale without saying so, so that the design cannot be too small', 'Design for a few hundred users first, and revisit scale if there is time', 'Skip scale entirely and go straight to defining the API endpoints'], 'Proposing and confirming shows judgment and keeps you moving.', ['bbg-framework', 'hi-staff']],
      ['Which is a constraint rather than a requirement?', ['The company already runs everything on PostgreSQL', 'Users can reset their password through an emailed link', 'p99 latency under 300 ms for the profile page at peak', 'Users can upload a profile photo and crop it afterwards'], 'A constraint limits your solution space; it is not something the product does or a quality it must have.', ['bbg-framework']],
      ['You are 25 minutes into a 45-minute interview and still on requirements. What went wrong?', ['No time budget — the design and deep dive carry most of the signal', 'Nothing went wrong; requirements are the most important phase of all', 'You should have skipped requirements entirely', 'You should have started with the database schema'], 'Requirements deserve roughly five minutes. Most of the evaluation happens in the design and the deep dive.', ['hi-delivery', 'meta-careers-swe-prep']],
      ['You open with: "I\'ll assume 20,000 requests a second at peak, read-heavy at about 100 reads per write." The interviewer corrects you: it is an ingestion service with about 4 writes per read, at the same 20,000 requests a second. What changes?', ['Writes rise from ~200/s to ~16,000/s, so the write path now drives the design', 'Writes rise from ~200/s to ~4,000/s, so caching reads still drives the design', 'Writes rise from ~200/s to ~16,000/s, so add read replicas to take the extra load', 'Nothing material: total traffic is still 20,000 requests a second'], 'At 100 reads per write, writes are 1/101 of the traffic: about 200/s. At 4 writes per read they are 4/5 of it: 16,000/s, eighty times more. Reading the ratio backwards gives 4,000/s, and replicas copy every write, so they do not absorb write load (topic 2.4). This is why assumptions are said out loud: the correction costs a sentence in minute three, not a redesign in minute thirty.', 'calc'],
      ['Prompt: "Design an expense-approval tool for one company\'s 5,000 employees, all in one country." Without stating any scale, a candidate draws three regions, sharded storage and a global event bus. What is the main criticism?', ['An unstated scale assumption drove it; one region and one database would likely do', 'None: designing for future growth up front is the safe default in an interview', 'The candidate should first have asked the interviewer to pick the database', 'Only the event bus is excess; sharded storage suits financial records'], 'At this size the load is tiny, so the complexity buys nothing and costs operations. ByteByteGo lists over-engineering as a red flag in its own right, and staff-level interviewers look for where a system need not scale. The fix is to say the assumption aloud ("one country, about 5,000 users, so one region and one primary with a standby") and let the interviewer correct it. Asking the interviewer to choose components hands back the decision you are being assessed on.', ['bbg-framework', 'hi-staff']]
    ],
    explain: ['Explain how you handle constraints and assumptions at the start of a design.', ['Separates given / assumed / out of scope', 'States assumptions aloud and invites correction', 'Mentions typical constraints (infra, budget, region, compliance)', 'Keeps a time budget in mind']],
    duck: ['What if you assume wrong?', 'Isn\'t asking lots of questions a sign you don\'t know the answer?'],
    lab: {
      type: 'order', brief: 'Put the phases of a system design interview in order. (Estimation has no fixed slot: do the maths when a number will change a decision.)',
      items: ['Clarify functional and non-functional requirements', 'Name the core entities', 'Define the API', 'High-level design: box diagram and data model', 'Deep dive on bottlenecks and failure modes', 'Wrap up: trade-offs, monitoring, what you would do next']
    }
  });

  T({
    id: '0A.5', mod: '0A', title: 'Clarifying questions', tag: 'Ask before you draw',
    analogy: 'A doctor taking a history before prescribing. Same symptom, very different treatment depending on the answers.',
    points: [
      'Ask questions whose answers change the design: scale, read:write ratio, consistency needs, latency targets, who the users are.',
      'Do not ask the interviewer to choose your components ("should I use Kafka?") — those are your decisions to make and defend. Do ask about constraints: existing infrastructure, and what you may treat as a black box.',
      'Offer a default with each question: "I\'ll assume X unless you say otherwise." It keeps momentum.',
      'Time-box it: about five minutes and a handful of questions. Clarification is a means, not the interview.'
    ],
    pitfall: 'Twenty questions with no proposals. It hands the interview to the interviewer and burns your time.',
    say: 'Before I draw anything: roughly how many daily users, and is it more read-heavy or write-heavy? I\'ll assume read-heavy at about 100:1.',
    refs: [
      ['io-sd-guide', 'Questions that change the design — “what type of users does it serve, what type of traffic can it expect, what limits will it have?”'],
      ['hi-staff', 'Decide; do not hand the choice back — “ultimately your interviewer wants to see your decisions, not just an outline of the possible options.”'],
      ['io-sd-guide', 'Discuss trade-offs, then commit — “It’s a good practice to talk about benefits and tradeoffs, but then you have to make a decision.”'],
      ['bbg-framework', 'Asking about constraints and existing services is fair — “What is the company’s technology stack? What existing services you might leverage to simplify the design?”'],
      ['amazon-sde3-prep', 'Amazon\'s own candidate guidance — “Your interviewer will ask questions related to your design, and you should ask questions to complete and validate your design.”'],
      ['hi-delivery', 'How long the step gets in a 45-minute round — “Requirements (~5 minutes)”']
    ],
    cards: [
      ['What makes a clarifying question worth asking?', 'Its answer would change the design — e.g. scale, read:write ratio, consistency needs, latency targets, core features.'],
      ['Why should you not ask "should I use Kafka / Postgres / Redis?"', 'Technology choices are yours to make and justify from the requirements. Asking hands away the decision you are being assessed on.'],
      ['What is the "propose a default" technique?', 'Attach an assumption to each question — "I\'ll assume X unless you say otherwise" — so you keep moving even if the interviewer is vague.']
    ],
    quiz: [
      ['Which question most changes the design of a chat system?', ['Must messages be ordered and persisted, or is best-effort fine?', 'Should I use WebSockets or long polling here?', 'Which cloud provider would you prefer I use?', 'Is Go or Java the better fit for the gateways that hold connections?'], 'Ordering and durability guarantees reshape the whole architecture. The others are solution choices you should own.', ['io-sd-guide', 'meta-careers-swe-prep']],
      ['The interviewer answers "up to you". What now?', ['State a reasonable assumption and move on', 'Rephrase and ask again until you get an answer', 'Assume the hardest possible case', 'Leave the point undecided and return to it later'], '"Up to you" is an invitation to show judgment.', ['hi-staff', 'io-sd-guide']],
      ['How much of a 45-minute system design interview should requirements, including your clarifying questions, take?', ['About five minutes — a handful of questions that each change the design', 'About one minute — one question, so that no design time is lost', 'About fifteen minutes — settle the ambiguous points before drawing anything', 'None — state your assumptions aloud and begin the design at once'], 'Hello Interview\'s delivery framework gives requirements about five minutes of the round: enough to pin scope and scale, and not so much that you never design. Asking nothing means designing for a scale and scope you guessed; fifteen minutes takes a third of the interview before anything is drawn.', ['hi-delivery']],
      ['Thirty minutes in, your feed design caches each user\'s feed for 60 s to hold p99 under 200 ms. You realise nobody has said whether a new post may take a minute to appear. What do you do?', ['Ask whether a minute of delay is acceptable, offering 60 s as your default', 'Carry on, since the requirements phase closed in the first five minutes', 'Ask the interviewer whether a cache is the right component to use here', 'Remove the feed cache so that its freshness can never be called into question'], 'Questions are not confined to the opening: Amazon tells candidates to ask questions to complete and validate the design. Offering a default keeps the decision yours, and the answer sets the TTL. Asking whether to use a cache hands back the choice you are assessed on; dropping the cache gives up the latency target to avoid asking one question.', ['amazon-sde3-prep', 'hi-staff']],
      ['Designing chat, you ask how big a group can get: "Up to 5,000 members. A busy group sends 10 messages a second, and about 20% of members are online at any time." Each message is pushed to every online member. How many pushes a second does one busy group cause?', ['About 10,000 a second', 'About 50,000 a second', 'About 1,000 a second', 'About 10 a second'], '5,000 × 20% = 1,000 online members, and 10 messages × 1,000 = 10,000 pushes a second. 50,000 also pushes to offline members; 1,000 forgets the message rate; 10 counts messages, not deliveries. In one-to-one chat each message is a single push, so the answer to this one question decides whether fan-out needs a design of its own.', 'calc']
    ],
    explain: ['Explain what separates a good clarifying question from a bad one, with an example of each.', ['Good questions change the design', 'Bad questions ask the interviewer to choose your solution', 'Gives a concrete example of each', 'Mentions proposing defaults / time-boxing the questions']],
    duck: ['How do you know when to stop asking and start designing?', 'What if the interviewer just says "you decide"?'],
    lab: {
      type: 'pick', brief: 'Prompt: "Design a chat app." Pick the four questions most worth asking.', want: 4,
      options: [
        ['One-to-one only, or group chats — and how large can a group be?', true, 'Group size decides the fan-out strategy.'],
        ['How many daily users and messages per day?', true, 'Scale drives connection handling and storage.'],
        ['Must messages persist and arrive in order, or is best-effort OK?', true, 'Ordering and durability guarantees reshape the design.'],
        ['Do we need delivery/read receipts and online presence?', true, 'These add distinct real-time flows — worth scoping in or out.'],
        ['Should I use WebSockets or polling?', false, 'That is your decision to make from the requirements.'],
        ['Should messages be stored in Cassandra?', false, 'A solution, not a requirement.'],
        ['What language is the backend team most comfortable with?', false, 'Does not change the architecture.'],
        ['Can I use Kubernetes?', false, 'Deployment tooling is irrelevant at this stage.']
      ]
    }
  });

  /* ---------- 0B API Design ---------- */
  T({
    id: '0B.1', mod: '0B', title: 'REST API design', tag: 'Resources, verbs, status codes',
    analogy: 'A library: books are the resources (nouns), and there are only a few standard things you can do to them — look up, add, replace, remove.',
    points: [
      'Model nouns as resources (/users/42/orders); let the HTTP verb carry the action. Avoid verbs in paths (/createOrder).',
      'GET reads · POST creates (or triggers any other non-idempotent action) · PUT replaces · PATCH partially updates · DELETE removes. GET, PUT and DELETE are idempotent; POST is not, and PATCH is not guaranteed to be.',
      'Status codes worth knowing cold: 200, 201 Created, 204 No Content, 400, 401, 403, 404, 409 Conflict, 429 Too Many Requests, 5xx.',
      'Paginate lists. Cursor pagination is stable under inserts and cheap at depth; offset pagination is simple but slow and unstable for deep pages.',
      'Version from day one (/v1/…) so you can evolve without breaking clients.'
    ],
    pitfall: 'Returning 200 with {"error": …} in the body. Clients, proxies and monitoring all read the status code.',
    say: 'I\'ll expose POST /v1/links to create and GET /v1/links/{code} to read, with cursor pagination on the list endpoint.',
    refs: [
      ['rfc9110', 'Idempotent methods (§9.2.2) — “Of the request methods defined by this specification, PUT, DELETE, and safe request methods are idempotent.”'],
      ['rfc5789', 'PATCH — “PATCH is neither safe nor idempotent as defined by [RFC2616], Section 9.1.”'],
      ['rfc9110', '202 for work accepted but not finished (§15.3.3) — “The 202 (Accepted) status code indicates that the request has been accepted for processing, but the processing has not been completed.”'],
      ['rfc9110', 'Why 301 can hide clicks and 302 does not (§15.4) — “A 301 response is heuristically cacheable; i.e., unless otherwise indicated by the method definition or explicit cache controls”'],
      ['rfc6585', '429 — “The 429 status code indicates that the user has sent too many requests in a given amount of time ("rate limiting").”'],
      ['use-the-index-luke-no-offset', 'Offset pagination cost — “Offset instructs the DBMS skip the first N results of a query. However, the database must still fetch these rows from the disk and bring them in order”'],
      ['slack-evolving-pagination', 'Offset pagination under inserts — “the page window becomes unreliable, potentially skipping or returning duplicate results”'],
      ['google-aip-121', 'Resources and standard methods — “The fundamental building blocks of an API are individually-named resources (nouns) and the relationships and hierarchy that exist between them.”']
    ],
    cards: [
      ['Which HTTP methods are idempotent, and which common one is not?', 'GET, PUT and DELETE are idempotent (repeating them leaves the same state). POST is not. PATCH is not guaranteed to be.'],
      ['Cursor vs offset pagination — the trade-off?', 'Offset (page=3) is simple but the DB must skip rows (slow when deep) and results shift when items are inserted. Cursor ("after this ID") is stable and efficient but cannot jump to an arbitrary page.'],
      ['What do 201, 204, 409 and 429 mean?', '201 Created · 204 success with no body · 409 Conflict with current state (e.g. duplicate) · 429 rate limited.']
    ],
    quiz: [
      ['A client sends PUT /v1/users/42 with a full profile, times out, and resends the identical request. What does HTTP promise?', ['The end state is the same as if it had been applied once', 'The second request is rejected with 409 Conflict, as a duplicate update', 'Nothing — only GET and HEAD are safe to repeat after a timeout', 'The server is required to de-duplicate it using an idempotency key'], 'PUT is defined as idempotent, so a blind retry is safe. POST carries no such promise, and PATCH is not guaranteed to be idempotent.', ['rfc9110', 'rfc5789']],
      ['An activity feed gets new items constantly. A client pages with ?offset=40&limit=20. What goes wrong?', ['Items shift between pages (duplicates, gaps), and deep offsets get slower', 'Pages stay stable and fast, provided there is an index on the sort column', 'The server has to hold a cursor open for each client', 'Offsets prevent the responses from being compressed'], 'The database must still fetch and discard the skipped rows, and inserts move everything down. A cursor ("items after this ID") anchors to a specific row instead.', ['use-the-index-luke-no-offset', 'slack-evolving-pagination']],
      ['POST /v1/reports starts a job that takes two minutes. Which response is the best contract?', ['202 Accepted with a status URL the client can poll', '200 OK, holding the connection open until the report is ready', '201 Created with the finished report in the body', '204 No Content, since there is nothing to return yet'], '202 means the request was accepted for processing but is not complete. The client polls the status resource (or receives a webhook) instead of holding a connection for minutes.', ['rfc9110']],
      ['A short-link service needs per-click analytics. Which redirect status keeps every click visible to your servers?', ['302 — not cached unless you add explicit cache headers', '301 — permanent redirects are revalidated on every visit', '308 — preserving the request method means it is never cached', 'Any of them — a browser re-requests a redirect on every visit'], '301 and 308 are cacheable by default, so a browser may stop asking you. 302 and 307 are reused only when the response carries explicit freshness information.', ['rfc9110']]
    ],
    explain: ['Explain the core conventions of a good REST API to someone who has only ever called one.', ['Resources are nouns; HTTP verbs are the actions', 'Meaningful status codes', 'Pagination (and why cursors)', 'Idempotency of methods or versioning']],
    duck: ['Why does it matter whether I use POST or PUT?', 'Why not just return 200 for everything and put errors in the body?'],
    lab: {
      type: 'api', brief: 'Design the API for a URL shortener.',
      paths: ['/v1/links', '/v1/links/{code}', '/{code}', '/v1/links?cursor=…&limit=50', '/v1/createLink', '/v1/links/delete?code=…', '/v1/getLinks?page=3'],
      tasks: [
        { need: 'Create a short link', method: 'POST', path: '/v1/links', status: '201', note: 'POST to the collection creates; 201 signals a new resource.' },
        { need: 'Browser follows a short link', method: 'GET', path: '/{code}', status: '302', note: '302 is not cached unless you add explicit cache headers, so every click reaches your servers (analytics). 301 is cacheable by default, so browsers may stop asking — less load, no click data.' },
        { need: 'Read a link\'s metadata', method: 'GET', path: '/v1/links/{code}', status: '200', note: 'GET on a single resource.' },
        { need: 'Delete a link', method: 'DELETE', path: '/v1/links/{code}', status: '204', note: 'DELETE is idempotent; 204 means success with nothing to return.' },
        { need: 'List my links, page by page', method: 'GET', path: '/v1/links?cursor=…&limit=50', status: '200', note: 'Cursor pagination stays stable as new links are created.' }
      ]
    }
  });

  T({
    id: '0B.2', mod: '0B', title: 'RPC & gRPC', tag: 'Typed calls between services',
    analogy: 'REST is posting letters in a standard envelope anyone can read. gRPC is a dedicated phone line between two offices that share a phrasebook — faster and stricter, but both sides need the phrasebook.',
    points: [
      'gRPC = HTTP/2 transport + Protocol Buffers by default (compact binary) + a schema-first contract with generated client and server code.',
      'Four call types: unary, server streaming, client streaming, bidirectional streaming.',
      'Strong fit for internal service-to-service calls: low overhead, strict types, and deadlines that can be propagated down the call chain (on by default in some languages such as Go and Java, opt-in in others such as C++). No deadline is set unless you set one.',
      'Weaker fit for public or browser APIs: browsers cannot call gRPC directly and must go through gRPC-Web (a translating proxy such as Envoy, or server-side support), which allows only unary and server-streaming calls; binary payloads are harder to debug; every call is an HTTP POST, so HTTP caches do not help.',
      'Schema evolution: add new optional fields, never reuse or renumber existing field numbers, and mark deleted numbers as reserved.'
    ],
    pitfall: 'Choosing gRPC for a public third-party API "because it\'s faster". Reach and debuggability usually matter more there.',
    say: 'Externally I\'ll expose REST; between internal services I\'d use gRPC for typed contracts and deadline propagation.',
    refs: [
      ['grpc-core-concepts', 'Unary, server-, client- and bidirectional streaming — “gRPC lets you define four kinds of service method:”'],
      ['grpc-intro', 'Protocol Buffers by default — “By default, gRPC uses Protocol Buffers, Google’s mature open source mechanism for serializing structured data (although it can be used with other data formats such as JSON).”'],
      ['grpc-deadlines', 'No default deadline — “By default, gRPC does not set a deadline which means it is possible for a client to end up waiting for a response effectively forever.”'],
      ['grpc-deadlines', 'Deadline propagation differs by language — “In some languages this behavior needs to be explicitly enabled (e.g. C++) and in others it is enabled by default (e.g. Java and Go).”'],
      ['k8s-grpc-lb', 'Connection-level balancing breaks — “Once the connection is established, there\'s no more balancing to be done. All requests will get pinned to a single destination pod”'],
      ['grpc-web-readme', 'gRPC-Web limits in browsers — “Client-side and Bi-directional streaming is not currently supported”'],
      ['protobuf-proto3', 'Schema evolution — “Field numbers should never be reused.”']
    ],
    cards: [
      ['What three things make up gRPC?', 'HTTP/2 as transport, Protocol Buffers as the default binary serialization format, and a schema-first contract (.proto) with generated code.'],
      ['When is gRPC a better choice than REST, and when is it worse?', 'Better: internal service-to-service calls needing low latency, strict schemas, streaming. Worse: public/browser-facing APIs where reach, human readability and HTTP caching matter.'],
      ['What is the golden rule for evolving a protobuf schema?', 'Never reuse or change existing field numbers. Add new fields as optional so old and new clients stay compatible.']
    ],
    quiz: [
      ['Internal gRPC clients reach a service through a connection-level (L4) load balancer. One backend is hot while the others idle. Why?', ['Many calls share one long-lived HTTP/2 connection, so each client is pinned to one backend', 'Protocol Buffers messages are too small for a connection-level balancer to weigh them correctly', 'gRPC disables keep-alive, so each call opens a fresh connection that DNS resolves to the same host', 'L4 balancers cannot forward HTTP/2 traffic, so they fall back to one backend'], 'The fix is to balance per request: an L7 proxy that understands HTTP/2, or client-side balancing across backends.', ['k8s-grpc-lb', 'grpc-lb-blog']],
      ['A calls B with a 500 ms deadline. B then calls C on a fresh context with no deadline. A gives up at 500 ms. What happens to C\'s work?', ['It can keep running — nothing told C that the caller gave up', 'It is cancelled automatically in every gRPC implementation', 'B retries it against C using the remaining budget', 'C returns DEADLINE_EXCEEDED after 500 ms regardless'], 'gRPC sets no deadline by default, and propagating one to downstream calls is on by default in some languages (Java, Go) and opt-in in others (C++). Without it, capacity is spent on a request nobody is waiting for.', ['grpc-deadlines']],
      ['A developer deletes protobuf field 4 (int64 user_id) and later adds int64 account_id = 4. What is the risk?', ['Old binaries read account IDs as user IDs — silent data corruption', 'Nothing breaks, because protobuf fields are matched by name on the wire', 'The schema compiler rejects a reused number, so the change can never ship', 'Only the clients that use the JSON encoding are affected by the change'], 'The wire format identifies fields by number, so an old binary decodes the new value as the old field. Reusing a number makes decoding ambiguous — a parse error at best, silent corruption like this at worst. Never reuse a number; mark deleted ones reserved.', ['protobuf-proto3', 'protobuf-dos-donts']],
      ['Why is gRPC a weaker fit for a public, browser-facing API?', ['Browsers must go through gRPC-Web, which lacks client and bidirectional streaming', 'gRPC cannot be secured with TLS once traffic leaves the private network', 'gRPC is slower than JSON over HTTP/1.1 for small payloads, because of HTTP/2 framing overhead', 'Protocol Buffers cannot express the nested or repeated objects that web clients need'], 'Add binary payloads that are harder to inspect and no HTTP caching, and reach and debuggability usually win for public APIs.', ['grpc-web-readme', 'ms-grpc-compare']]
    ],
    explain: ['Explain what gRPC is and when you would pick it over REST.', ['HTTP/2 + protobuf + schema with code generation', 'Good for internal, low-latency, strongly-typed calls', 'Supports streaming', 'Poor fit for browsers/public APIs, with a reason']],
    duck: ['If gRPC is faster, why doesn\'t everyone use it everywhere?', 'What does "schema-first" buy you?'],
    lab: {
      type: 'pick', brief: 'A team is moving its internal service calls, and one browser upload feature, to gRPC. Pick the four practices to adopt.', want: 4,
      options: [
        ['Set an explicit deadline on every call a service makes', true, 'gRPC sets no deadline by default, so a call can otherwise wait forever.'],
        ['Pass the remaining deadline on to every downstream call', true, 'Otherwise downstream work carries on after the caller has given up.'],
        ['Balance per request, with an L7 proxy or in the client', true, 'Calls share long-lived HTTP/2 connections, so per-connection balancing pins clients to one backend.'],
        ['Mark the numbers of deleted fields as reserved in the .proto', true, 'A reused number makes old binaries misread the new field.'],
        ['Rely on gRPC\'s default deadline to stop runaway calls', false, 'There is no default deadline unless you set one.'],
        ['Give a new field the number of a deleted one of the same type', false, 'Old binaries decode the new value as the old field: silent corruption.'],
        ['Spread the connections with a connection-level (L4) balancer', false, 'Once a connection is open, every call on it goes to the same backend.'],
        ['Have the browser upload as a client stream through gRPC-Web', false, 'gRPC-Web supports unary and server-streaming calls only.']
      ]
    }
  });

  T({
    id: '0B.3', mod: '0B', title: 'GraphQL', tag: 'The client asks for exactly what it needs',
    analogy: 'REST is a set menu — you get the whole plate even if you only wanted the fries. GraphQL is ordering à la carte from a single waiter.',
    points: [
      'One endpoint; the client sends a query describing the exact shape of data it wants.',
      'Fixes over-fetching (too many fields) and under-fetching (too many round trips) — valuable for mobile clients and many different front-ends.',
      'The N+1 problem: resolving a list then fetching each child separately. Fixed by batching (the DataLoader pattern).',
      'Costs: HTTP caching is harder in the usual setup (one URL, queries sent by POST) unless queries are sent as GET, typically with persisted queries; and you must limit query depth/complexity to stop expensive queries.',
      'Federation: several teams each own a subgraph, composed into one graph behind a gateway.'
    ],
    pitfall: 'Adopting GraphQL for a simple CRUD API with one client. You pay the complexity without the benefit.',
    say: 'With several client apps needing different slices of the same data, GraphQL avoids a new endpoint per screen — I\'d add batching to avoid N+1 and a complexity limit.',
    refs: [
      ['graphql-faq', 'What it is for — “Minimizing over-fetching and making fewer roundtrips to the server are two of them.”'],
      ['graphql-performance', 'N+1 — “This is known as the N+1 problem, where an initial request to an underlying data source (for a hero’s friends) leads to N subsequent requests”'],
      ['graphql-performance', 'Batching (DataLoader) — “This is commonly solved by a batching technique, where multiple requests for data from a backend are collected over a short period and then dispatched in a single request”'],
      ['graphql-performance', 'Getting HTTP caching back — “Using GET for GraphQL query operations can support HTTP caching and CDN usage, particularly when used in conjunction with hashed query documents”'],
      ['graphql-security', 'Bounding query cost — “it’s a good idea to limit the maximum depth of fields that a single operation can have”'],
      ['graphql-federation', 'Federation — “unified GraphQL schema from multiple independent services (most often called subgraphs), each responsible for its portion of the application’s data graph”']
    ],
    cards: [
      ['What two problems does GraphQL solve compared with REST?', 'Over-fetching (receiving fields you do not need) and under-fetching (needing several round trips to assemble one screen).'],
      ['What is the N+1 problem in GraphQL and the standard fix?', 'One query for a list, then one more query per item to resolve a nested field. Fix: batch and cache those lookups per request (DataLoader pattern).'],
      ['Name two operational downsides of GraphQL.', 'HTTP/CDN caching is harder by default (single endpoint, POST) unless queries go over GET, and arbitrary queries can be very expensive — you need depth/complexity limits.']
    ],
    quiz: [
      ['A GraphQL query for 100 posts and each post\'s author runs 101 SQL queries. Standard fix?', ['Batch the author lookups within the request into one query', 'Add an index on posts.author_id to speed each one up', 'Cache the whole response at the CDN for a minute', 'Raise the database connection pool size to 200'], 'This is the N+1 problem: one query for the list, then one per item. Batching (the DataLoader pattern) collapses the per-item lookups into a single round trip.', ['graphql-performance']],
      ['Why does moving from REST to GraphQL usually lose CDN caching, and how do teams get it back?', ['Queries are POSTed to one URL, so caches have no key; use GET to restore it', 'GraphQL responses cannot carry Cache-Control headers, so CDNs treat them as private', 'CDNs do not cache JSON responses of any kind unless the origin is a REST API', 'It does not — GraphQL responses cache at the CDN like any other JSON responses'], 'HTTP caches key on method and URL. Sending queries as GET — usually as hashed, persisted queries — makes them cacheable again; otherwise caching moves to the client or the resolver layer.', ['graphql-performance', 'apollo-apq']],
      ['A public GraphQL API lets clients nest friends { friends { friends … } } to any depth. What is the exposure and the standard control?', ['A small request can trigger huge work; limit depth and complexity', 'Nothing — the server only returns fields that exist in the schema', 'Responses become too large for mobile; enable compression', 'Clients can read other users\' private fields; add TLS'], 'The client, not the server, decides how expensive a query is — so the server must bound it, and paginate list fields.', ['graphql-security']],
      ['Twelve teams each own part of one product graph. What does federation give you?', ['Each team ships its own subgraph, and a router composes them into one schema for clients', 'A single resolver codebase that every team contributes to and deploys together on one schedule', 'Automatic sharding of the underlying databases, with one shard for each team that owns a subgraph', 'A single shared database that each of the twelve teams reads and writes directly'], 'Clients still see one graph; ownership and deployment stay with the teams.', ['graphql-federation', 'apollo-federation']]
    ],
    explain: ['Explain what GraphQL is, the problem it solves, and one new problem it creates.', ['Client specifies the shape of the response', 'Solves over-/under-fetching', 'N+1 and its fix (batching)', 'A cost: caching or query complexity']],
    duck: ['If GraphQL is so flexible, why would anyone still use REST?', 'Where does the N+1 problem actually come from?'],
    lab: {
      type: 'sort', brief: 'A GraphQL API has grown up. Which fix addresses each problem?', buckets: ['Batch the lookups (DataLoader)', 'Limit query depth and complexity', 'Send queries as GET, persisted', 'Federate into subgraphs'],
      items: [['Listing 100 posts runs 100 separate author queries', 0], ['Resolving 50 orders runs one customer lookup per order', 0], ['Each comment\'s resolver fetches its author on its own', 0], ['A third-party client nests friends { friends { friends … } } twelve levels deep', 1], ['A public client asks for 1,000 users, each with all 1,000 of their followers', 1], ['A public client aliases one costly field 100 times in a single query', 1], ['The CDN caches nothing because every query is POSTed to /graphql', 2], ['Millions of apps send the same home-feed query, and every one misses the HTTP cache', 2], ['Twelve teams must each own and deploy their part of one graph', 3], ['Users, orders and search live in services owned by different teams, but clients want one schema', 3]]
    }
  });

  T({
    id: '0B.4', mod: '0B', title: 'WebSocket & SSE', tag: 'Real-time contracts',
    analogy: 'HTTP is sending letters and waiting for a reply. A WebSocket is an open phone call — either side can speak at any time. SSE is a radio broadcast: only the server talks.',
    points: [
      'WebSocket: starts as an HTTP/1.1 Upgrade handshake (101 Switching Protocols), then becomes one long-lived, two-way connection; over HTTP/2 it runs as a single stream instead. Use for chat, collaboration, games.',
      'Server-Sent Events (SSE): one-way server → client over plain HTTP. The browser EventSource API reconnects by itself and reports the last event ID it saw. Use for feeds, tickers, notifications, streamed LLM output.',
      'Connections are stateful: you need to know which server holds which user (a connection registry or pub/sub), and deploys must drain connections.',
      'Reconnection: clients back off with jitter and send the last message ID they saw; the server replays from there (so it must retain recent messages) and the client de-duplicates by ID. A browser EventSource sends Last-Event-ID for you, provided the server put an id on its events; with WebSocket, or SSE read from a POST response, you build this yourself.',
      'Backpressure: a slow client must not grow an unbounded buffer. Bound it, then drop, coalesce or disconnect.'
    ],
    pitfall: 'Forgetting that a deploy or load balancer restart disconnects everyone at once — and they all reconnect at the same instant.',
    say: 'Chat needs server push in both directions, so WebSockets, with a pub/sub layer so any gateway can reach any user, and resume-from-last-ID on reconnect.',
    refs: [
      ['rfc6455', 'WebSocket — “This is a two-way communication channel where each side can, independently from the other, send data at will.”'],
      ['rfc8441', 'WebSocket over HTTP/2 has no Upgrade/101 — “This document defines a mechanism for running the WebSocket Protocol (RFC 6455) over a single stream of an HTTP/2 connection.”'],
      ['mdn-eventsource', 'SSE is one-way — “Unlike WebSockets, server-sent events are unidirectional; that is, data messages are delivered in one direction, from the server to the client (such as a user\'s web browser).”'],
      ['whatwg-sse', 'EventSource reconnects by itself — “Clients will reconnect if the connection is closed; a client can be told to stop reconnecting using the HTTP 204 No Content response code.”'],
      ['whatwg-sse', 'Resume with Last-Event-ID — “HTTP request header reports an EventSource object\'s last event ID string to the server when the user agent is to reestablish the connection.”'],
      ['anthropic-streaming', 'LLM APIs stream over SSE — “When creating a Message, you can set "stream": true to incrementally stream the response using server-sent events (SSE).”'],
      ['mdn-websocket', 'Backpressure is your job — “The WebSocket API has no way to apply backpressure, therefore when messages arrive faster than the application can process them, the application will either fill up the device\'s memory by buffering those messages”'],
      ['aws-bl-timeouts-retries', 'Reconnect storms — “Jitter adds some amount of randomness to the backoff to spread the retries around in time.”']
    ],
    cards: [
      ['WebSocket vs SSE — the key difference and when to pick each?', 'WebSocket is bidirectional over an upgraded TCP connection (chat, games). SSE is server-to-client only over plain HTTP with automatic reconnect (feeds, tickers, notifications).'],
      ['How does a client avoid losing messages across a reconnect?', 'It remembers the last message/event ID it received and sends it on reconnect; the server replays everything after that ID.'],
      ['What is backpressure on a real-time connection and how do you handle it?', 'A consumer slower than the producer. Use a bounded per-connection buffer and, when full, drop or coalesce messages or disconnect the client.']
    ],
    quiz: [
      ['An LLM chat product streams generated tokens to the browser; the client only occasionally sends a new prompt. Simplest transport for the token stream?', ['Server-Sent Events on the HTTP response — one-way and friendly to ordinary HTTP infrastructure', 'A WebSocket per conversation, because streaming tokens to a browser requires a full-duplex channel', 'Short polling every 100 ms for new tokens, with each poll a separate request', 'gRPC bidirectional streaming straight from the browser, so tokens and new prompts share one stream'], 'The traffic is one-way, server to client. The major LLM APIs commonly stream responses this way.', ['anthropic-streaming', 'openai-streaming', 'mdn-eventsource']],
      ['User A is connected to gateway 1 and user B to gateway 2. How does A\'s message reach B?', ['A pub/sub layer or connection registry routes it to gateway 2', 'The load balancer forwards it to the right gateway automatically', 'Gateway 1 broadcasts it to every connected user on every gateway', 'It cannot — both users must first be moved onto the same gateway'], 'Each connection lives on one server, so you need a routing layer that knows, or can reach, the server holding the recipient.', ['slack-real-time-messaging']],
      ['A deploy drops 500k WebSocket connections and every client reconnects at once, overloading the gateways. Which fix addresses the cause?', ['Client reconnect backoff with jitter, and draining connections gradually during deploys', 'Shorter client timeouts, so that failed connection attempts are detected and retried sooner', 'Immediate reconnect in a tight loop until it succeeds', 'Switching every client to long polling'], 'The problem is synchronisation. Jitter spreads the reconnects out in time instead of producing one spike.', ['aws-bl-timeouts-retries', 'stripe-blog-idempotency']],
      ['A mobile client drops off for 30 s and reconnects. How does it avoid missing or duplicating messages?', ['It sends the last message ID it saw, and the server replays from there', 'TCP guarantees delivery, so nothing was lost', 'The server re-sends the entire conversation history on every reconnect', 'The load balancer buffers messages for disconnected clients'], 'The client then de-duplicates by ID. A browser EventSource re-sends the last event ID for you on reconnect; with WebSocket you build the same thing. Either way the server must retain recent messages to replay.', ['whatwg-sse']]
    ],
    explain: ['Explain how real-time delivery works and the problems long-lived connections introduce.', ['WebSocket (two-way) vs SSE (one-way)', 'Connections are stateful — routing/registry needed', 'Reconnect with backoff and resume from last ID', 'Backpressure for slow consumers']],
    duck: ['Why can\'t the server just send an HTTP response whenever it has news?', 'What goes wrong when you restart a server holding 100,000 connections?'],
    lab: {
      type: 'sort', brief: 'Pick the best-fitting API style.', buckets: ['REST', 'gRPC', 'GraphQL', 'WebSocket / SSE'],
      items: [['Public CRUD API for third-party developers', 0], ['Low-latency calls between internal services with strict schemas', 1], ['Mobile screen needing six resources in one round trip', 2], ['Chat messages delivered instantly in both directions', 3], ['Live price ticker pushed to browsers', 3], ['Product pages that should be cached by a CDN', 0], ['Streaming telemetry between two backend services', 1], ['Many client teams each needing different field subsets', 2]]
    }
  });

  T({
    id: '0B.5', mod: '0B', title: 'API gateway patterns', tag: 'The front door',
    analogy: 'A hotel reception desk: checks your ID, tells you which floor to go to, and stops fifty people rushing the lift at once. It does not clean rooms.',
    points: [
      'A single entry point that handles cross-cutting concerns: TLS termination, authentication, rate limiting, routing, request/response transformation, logging.',
      'It lets backend services stay simple and lets you change internal topology without breaking clients.',
      'Keep business logic out. A gateway that knows your domain becomes a monolith everyone must deploy through.',
      'It sits on every request path, so run several redundant, horizontally scaled instances, with any shared state (such as rate-limit counters) kept in an external store.',
      'Backend-for-Frontend (BFF): a thin gateway per client type (web, mobile) that shapes responses for that client.'
    ],
    pitfall: 'Drawing one gateway box and never mentioning it is a single point of failure for the whole system.',
    say: 'Requests enter through an API gateway that handles auth and per-client rate limiting, then routes to stateless services behind it.',
    refs: [
      ['microservices-io-api-gateway', 'The pattern — “Implement an API gateway that is the single entry point for all clients.”'],
      ['azure-api-gateways', 'What belongs in it — “It can also perform various cross-cutting tasks such as authentication, SSL termination, mutual TLS, and rate limiting.”'],
      ['azure-gateway-offloading', 'What does not — “Never offload business logic to the gateway.”'],
      ['azure-gateway-offloading', 'Redundancy — “Avoid single points of failure by running multiple instances of your gateway.”'],
      ['newman-bff', 'Backend-for-Frontend — “rather than have a general-purpose API backend, instead you have one backend per user experience”'],
      ['envoy-global-rate-limiting', 'Shared rate-limit state lives outside the gateway instances — “Envoy integrates directly with a global gRPC rate limiting service.”']
    ],
    cards: [
      ['Name four responsibilities of an API gateway.', 'Any four of: TLS termination, authentication/authorization, rate limiting, routing, request transformation, response aggregation, logging/metrics.'],
      ['What should NOT live in an API gateway and why?', 'Business logic. It couples every team to one deployable and turns the gateway into a bottleneck for change.'],
      ['What is the Backend-for-Frontend pattern?', 'A dedicated thin gateway per client type (web, mobile, partner) that tailors and aggregates responses for that client.']
    ],
    quiz: [
      ['Which belongs in an API gateway?', ['Validating the auth token and enforcing per-client rate limits', 'Calculating order totals and tax', 'Storing user profiles', 'Deciding which products each user is recommended on the home page'], 'Cross-cutting concerns belong there; domain logic belongs in services.', ['azure-api-gateways', 'microservices-io-api-gateway']],
      ['A gateway runs as 12 instances and must enforce a per-API-key rate limit exactly across the fleet. Where do the counters live?', ['In a shared store — otherwise each instance allows the full limit', 'In each instance\'s memory, with every instance enforcing the full limit', 'In the client, which reports its own usage with each request', 'In the backend services, once the request has been handled there'], 'With purely local counters a client spread over 12 instances gets up to 12× the limit. Share the state and update it atomically, or deliberately accept approximate per-node limits.', ['envoy-global-rate-limiting']],
      ['Mobile needs small payloads; web needs rich ones. Which pattern helps?', ['Backend-for-Frontend — one thin gateway per client type', 'One general-purpose gateway with a response-size flag per client', 'GraphQL federation, so that each team owns its own subgraph', 'An API version per client, all served by the same backend'], 'Each BFF shapes and aggregates responses for its own client.', ['newman-bff', 'azure-bff']],
      ['A team proposes computing order discounts in the gateway "since every request passes through it anyway". Main objection?', ['It couples every team\'s domain releases to shared infrastructure', 'Gateways cannot make outbound calls to pricing services', 'It would force the gateway to become stateless', 'Discount logic is too slow to run inside a proxy'], 'A gateway that knows your domain becomes a monolith everyone must deploy through — and it already sits on every request path.', ['azure-gateway-offloading', 'newman-bff']]
    ],
    explain: ['Explain what an API gateway does and one way it can go wrong.', ['Single entry point for cross-cutting concerns', 'Lists concrete responsibilities (auth, rate limit, routing)', 'No business logic in the gateway', 'Must be redundant — on every request path']],
    duck: ['Why not let clients call each service directly?', 'What happens to the whole system if the gateway goes down?'],
    lab: {
      type: 'sort', brief: 'Where does each job belong: the shared gateway, or the service that owns the domain?', buckets: ['API gateway', 'Backend service'],
      items: [['Terminate TLS for all incoming traffic', 0], ['Check the access token\'s signature and expiry', 0], ['Enforce a per-API-key request quota', 0], ['Route /v1/orders/* to the orders service', 0], ['Record request counts and latency for every route', 0], ['Require mutual TLS from partner clients', 0], ['Calculate the order total, discounts and tax', 1], ['Refuse to cancel an order that has already shipped', 1], ['Store and update user profiles', 1], ['Choose which products to recommend to a user', 1], ['Reserve stock for a new order', 1]]
    }
  });

  T({
    id: '0B.6', mod: '0B', title: 'Idempotency', tag: 'Safe to retry',
    analogy: 'A lift call button. Pressing it once or ten times has the same effect — the lift comes once. A vending machine button is the opposite.',
    points: [
      'An operation is idempotent if doing it many times has the same effect as doing it once. Networks time out, so clients will retry.',
      'Idempotency key: the client generates a unique ID per logical operation and sends it with every retry. The server stores key → result and replays the result for duplicates.',
      'Store the key in the same transaction as the side effect, behind a unique constraint. Check-then-act in two steps is a race. If the side effect is a call to another system, commit the key with a pending record first, then call out and pass the key along.',
      '"Exactly-once" effects are usually achieved with at-least-once delivery plus idempotent (or transactional) processing.',
      'Make updates naturally idempotent where you can: "set status = shipped" rather than "increment counter".'
    ],
    pitfall: 'Retrying a non-idempotent POST after a timeout. The first request may have succeeded — you just did not hear back.',
    say: 'Create-payment takes a client-supplied idempotency key, stored atomically with the payment row, so a retry returns the original result instead of charging twice.',
    refs: [
      ['rfc9110', 'Definition (§9.2.2) — “A request method is considered "idempotent" if the intended effect on the server of multiple identical requests with that method is the same as the effect for a single such request.”'],
      ['stripe-blog-idempotency', 'Why retries need it — “the success of the operation is ambiguous from the perspective of the client, and it doesn’t know whether retrying the operation is safe”'],
      ['stripe-idempotent-requests', 'Replaying the first result — “For API v1, Stripe saves the status code and body of the first request made with a given idempotency key after endpoint execution begins.”'],
      ['stripe-idempotent-requests', 'Same key, different parameters — “The idempotency layer compares incoming parameters to those of the original request and errors if they’re not the same to prevent accidental misuse.”'],
      ['aws-bl-idempotent-apis', 'Record the key atomically with the effect — “the process that combines recording the idempotent token and all mutating operations related to servicing the request must meet the properties for an atomic, consistent, isolated, and durable (ACID) operation”'],
      ['brandur-idempotency-keys', 'External calls cannot be inside your transaction — “Atomic phases should be safely committed before initiating any foreign state mutation.”'],
      ['microservices-io-idempotent-consumer', 'At-least-once delivery needs idempotent consumers — “Consequently, a consumer must be idempotent: the outcome of processing the same message repeatedly must be the same as processing the message once.”']
    ],
    cards: [
      ['Define idempotency.', 'An operation is idempotent if performing it multiple times has the same effect as performing it once.'],
      ['How does an idempotency key work?', 'The client creates a unique key per logical operation and resends it on retries. The server records key → result atomically with the side effect; a repeat with the same key returns the stored result without re-executing.'],
      ['How is "exactly-once" achieved in practice?', 'At-least-once delivery (retry until acknowledged) combined with idempotent processing, so duplicates have no additional effect.']
    ],
    quiz: [
      ['A client times out on POST /payments and retries with the same Idempotency-Key. The first attempt had in fact succeeded. Correct server behaviour?', ['Return the stored result of the first attempt without charging again', 'Return 409 Conflict so that the client knows the request was a duplicate', 'Process it again — a retry means the first attempt failed', 'Return 404, because the key has been used up'], 'The server saves the outcome of the first request for a key and replays it (Stripe\'s v1 API stores the status code and body). A timeout tells the client nothing about whether the charge happened.', ['stripe-idempotent-requests', 'stripe-blog-idempotency']],
      ['Two retries with the same key arrive 5 ms apart on different servers. Each runs: look up key → not found → charge card → insert key. Result?', ['Both pass the check and both charge; the key must be claimed atomically first', 'The second request automatically waits on the first, then returns the stored result', 'The database rejects the second lookup because the key is locked', 'Exactly one charge, because the database serialises reads of the same key by default'], 'Check-then-act across separate steps is a race. Claim the key first: insert it behind a unique constraint with a pending record, commit, then charge — passing the same key to the processor.', ['brandur-idempotency-keys', 'aws-bl-idempotent-apis']],
      ['Which update is naturally idempotent?', ['SET balance = 90 WHERE version = 3', 'SET balance = balance - 10', 'INSERT a new ledger row', 'Append an event to a log'], 'Setting an absolute value guarded by a version gives the same result however many times it runs.', 'calc'],
      ['A client reuses an idempotency key with a different amount. How does Stripe\'s API respond, and why is that the safer design?', ['Reject it — one key means one operation, so the parameters must match', 'Process the new amount, since the most recent request should always win', 'Return the original response and ignore the change', 'Charge only the difference between the two amounts'], 'Replaying the old response would hide a client bug; executing would defeat the key. Stripe compares the parameters with the original request and returns an error.', ['stripe-idempotent-requests', 'stripe-error-handling']],
      ['A queue delivers messages at least once. How do you get an effectively-once side effect?', ['Make the consumer idempotent: record the operation ID with the effect and skip repeats', 'Acknowledge each message before processing it, so that the broker never has to redeliver it', 'Trust the broker\'s exactly-once setting end to end', 'Scale the consumers so duplicates arrive less often'], 'At-least-once delivery plus idempotent processing. Acknowledging first turns it into at-most-once: a crash loses the message.', ['microservices-io-idempotent-consumer', 'kafka-design']]
    ],
    explain: ['Explain idempotency and how you would make a payment API safe to retry.', ['Same effect whether applied once or many times', 'Client-generated idempotency key', 'Key stored atomically with the result; duplicates get the stored result', 'At-least-once + idempotent = effectively once']],
    duck: ['If the request failed, why can\'t I just send it again?', 'Who makes up the idempotency key, and why them?'],
    lab: {
      type: 'sort', brief: 'Is it safe to repeat?', buckets: ['Idempotent', 'Not idempotent'],
      items: [['GET /users/42', 0], ['PUT /users/42 {"name": "Ann"}', 0], ['DELETE /orders/7', 0], ['POST /payments with no key', 1], ['POST /payments with an Idempotency-Key header', 0], ['UPDATE balance = balance - 10', 1], ['UPDATE balance = 90 WHERE version = 3', 0], ['Append "hello" to a log', 1], ['SET status = "shipped"', 0]]
    }
  });

  /* ---------- 0C High-Level Design ---------- */
  T({
    id: '0C.1', mod: '0C', title: 'Drawing the box diagram', tag: 'Clients, services, stores, async paths',
    analogy: 'A subway map, not a street map. It shows the stations and which lines connect them — enough to trace any journey — and leaves out everything else.',
    points: [
      'Start with the simplest thing that satisfies the functional requirements: client → load balancer → stateless service → database.',
      'Trace each functional requirement through the diagram as a request path. If you cannot trace it, something is missing.',
      'Add a component only when a requirement or number demands it: cache for read latency, queue for slow or bursty work, CDN for static content.',
      'Keep services stateless so they scale horizontally; push state into data stores.',
      'Label arrows with what flows (protocol, sync vs async). Unlabelled arrows hide the interesting decisions.'
    ],
    pitfall: 'Opening with fifteen boxes. Every box you cannot justify is a question you will be asked.',
    say: 'I\'ll start with the minimal design and then evolve it: client, load balancer, a stateless API tier and one database. Then let me walk each requirement through it.',
    refs: [
      ['hi-delivery', 'Build the design up requirement by requirement — “In most cases, you can even go one-by-one through your API endpoints and build up your design sequentially to satisfy each one.”'],
      ['bbg-framework', 'Start simple — “Over-engineering is a real disease of many engineers as they delight in design purity and ignore tradeoffs.”'],
      ['12factor-processes', 'Stateless services — “Twelve-factor processes are stateless and share-nothing.”'],
      ['12factor-processes', 'No sticky sessions — “Sticky sessions are a violation of twelve-factor and should never be used or relied upon.”'],
      ['azure-queue-load-leveling', 'When a queue is justified — “Use a queue that acts as a buffer between a task and the service that it invokes.”'],
      ['hi-levels', 'Justify each component — “It\'s no longer sufficient to broadly state a preference for a type of technology throughout the interview, like "I\'ll use NoSQL."”']
    ],
    cards: [
      ['What is the minimal starting diagram for most systems?', 'Client → load balancer → stateless application service → database. Evolve from there.'],
      ['What rule decides whether a component belongs in the diagram?', 'It must be justified by a requirement or a number — e.g. cache because of read latency, queue because work is slow or bursty.'],
      ['Why keep the application tier stateless?', 'Any instance can serve any request, so you scale by adding instances and survive instance failures without losing data.']
    ],
    quiz: [
      ['Best first diagram for almost any prompt?', ['Client → load balancer → stateless service → database', 'A microservice mesh with an event bus, so it can scale later', 'Whatever a large tech company is known to use for this product', 'The database schema alone; boxes come later'], 'Start minimal, then evolve it with justifications. It also shows your reasoning.', ['hi-delivery', 'bbg-framework']],
      ['How do you verify a diagram is complete?', ['Trace every functional requirement through it as a request path', 'Count the boxes and compare them against a reference architecture', 'Check that it includes a cache, a queue and a replica for every database', 'Check that every box is labelled with the named technology it will run on'], 'Each requirement should have a visible path from client to data and back.', ['hi-delivery']],
      ['The interviewer asks why there is a cache in your diagram. Which answer holds up?', ['"Peak reads are 60k QPS, beyond what one primary serves; caching hot keys fixes that"', '"Every system at this scale has a cache in front of the database, so ours should too"', '"It makes reads faster, which is always worth having"', '"We will probably need one once traffic grows"'], 'Every box must be justified by a requirement or a number. Each one you cannot justify is a question you will be asked.', ['hi-levels', 'hi-openai-l4']],
      ['App servers keep user sessions in local memory. What breaks first as you scale out?', ['Restarts lose sessions, and users must be pinned to one instance', 'Nothing breaks, because in-memory sessions are the fastest option', 'The database receives more writes, because each session is saved on every request', 'TLS termination stops working, because each instance holds its own certificate'], 'Stateless processes let any instance serve any request. Put session state in a backing store.', ['12factor-processes']]
    ],
    explain: ['Explain how you build up a high-level design diagram from nothing.', ['Start minimal: client, LB, stateless service, DB', 'Trace each requirement as a path', 'Add components only with a justification', 'Stateless services / labelled arrows']],
    duck: ['Why not draw the final, complete architecture straight away?', 'What does "stateless" mean and why do you keep saying it?'],
    lab: {
      type: 'diagram', brief: 'Read-heavy product catalogue: 100:1 reads to writes, product images served to users worldwide. Add the components you need, then tap two boxes to connect them.',
      required: ['client', 'cdn', 'lb', 'app', 'cache', 'db', 'blob'],
      edges: [['client', 'cdn'], ['client', 'lb'], ['lb', 'app'], ['app', 'cache'], ['app', 'db'], ['cdn', 'blob']],
      why: { cdn: 'Images are static and global — serve them from the edge.', cache: '100:1 reads: most reads should never reach the database.', blob: 'Images belong in object storage, not the database.', lb: 'Spreads traffic over stateless app servers.' },
      decoys: { queue: 'Nothing in this brief is slow or asynchronous — a queue is unjustified here.', ws: 'Nothing here is real-time.', search: 'Search was not asked for.' },
      sim: {
        load: '500 page views a second, and each page pulls 8 images: 4,000 image requests a second.',
        goals: { errors: 1, p99: 300 },
        flows: [
          { label: 'Page views', rps: 500, aside: ['cache', 'db'], needs: ['db'],
            hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'cache'], ['app', 'db']] },
          { label: 'Image requests', rps: 4000, needs: ['blob'],
            hops: [['client', 'cdn'], ['cdn', 'blob'], ['client', 'blob', { instead: 'cdn' }], ['client', 'lb', { instead: ['cdn', 'blob'] }], ['client', 'app', { instead: ['cdn', 'blob', 'lb'] }], ['lb', 'app'], ['app', 'blob']] }
        ],
        parts: {
          cdn: { cfg: { capacity: 512, serviceMs: 2, hitRate: 0.95, queueLimit: 2048 } },
          app: { cfg: { instances: 4, capacity: 6, serviceMs: 14, serviceCv: 0.5, queueLimit: 48 }, solo: { instances: 1 }, soloWhy: 'Nothing spreads the traffic, so clients can only reach one server however many you run.', fullWhy: 'It is sized for page views. Should it be handling anything else?' },
          cache: { cfg: { capacity: 64, serviceMs: 1, hitRate: 0.9, queueLimit: 512 } },
          db: { cfg: { capacity: 8, serviceMs: 25, serviceCv: 0.7, queueLimit: 64, lockMs: 0 }, fullWhy: 'It can do about 320 reads a second (8 at once, 25 ms each). With 100 reads to every write, most reads should be answered before they get here.' },
          blob: { cfg: { capacity: 16, serviceMs: 15, serviceCv: 0.5, queueLimit: 128, prefixRps: 0 }, fullWhy: 'One bucket in one region is being asked for every image by every user. What could answer most of those closer to them?' }
        },
        needWhy: { db: 'The database is where the products are stored for good.', blob: 'The image files live in object storage.' },
        bad: { 'client>db': 'Clients never talk to the database directly.', 'client>cache': 'Clients never talk to the cache directly.', 'cdn>db': 'A CDN fetches files from an origin. It does not query a database.', 'lb>db': 'A load balancer forwards requests to servers. It does not query a database.' },
        ok: [['cache', 'db'], ['cdn', 'lb']],
        traps: [
          { name: 'no CDN: every image comes straight from the bucket', drop: ['cdn'], wire: [['client', 'blob']] },
          { name: 'images served through the app servers', drop: ['cdn'], wire: [['app', 'blob']] },
          { name: 'no cache', drop: ['cache'] },
          { name: 'no load balancer', drop: ['lb'], wire: [['client', 'app']] }
        ]
      }
    }
  });

  T({
    id: '0C.2', mod: '0C', title: 'Data model', tag: 'Access patterns drive storage',
    analogy: 'Organising a kitchen. You do not shelve by colour — you put things where you will reach for them. How you will query the data decides how you store it.',
    points: [
      'List the entities and relationships, then list the queries. The queries, more than the entities, pick the store: a relational schema can be normalised first and queried flexibly later, but a key-value or wide-column schema has to be designed from the queries.',
      'For each main query, name the key it uses. That key becomes your primary key, partition key or index.',
      'Relational is the sensible default when you need joins, transactions or flexible queries.',
      'Key-value / wide-column stores fit when access is by known key at very large scale and you can live with limited query patterns.',
      'Denormalise deliberately for read-heavy paths: duplicate data to avoid joins, and accept the cost of keeping copies in sync.'
    ],
    pitfall: 'Saying "NoSQL because it scales" without naming the access pattern that makes it fit — or the query you just made impossible.',
    say: 'The main query is "latest messages in a channel", so I\'ll partition by channel ID and order by a time-sortable message ID within it — adding a time bucket to the partition key if channels grow without bound.',
    refs: [
      ['aws-dynamodb-nosql-design', 'Design from the queries — “you shouldn\'t start designing your schema for DynamoDB until you know the questions it will need to answer”'],
      ['aws-dynamodb-nosql-design', 'A relational model can start from the entities — “For an RDBMS, you can go ahead and create a normalized data model without thinking about access patterns.”'],
      ['cassandra-data-modeling', 'Denormalisation — “Since each query is backed by a table, data is duplicated across multiple tables in a process known as denormalization.”'],
      ['discord-billions-messages', 'A real partition-key choice — “channel_id became the partition key since all queries operate on a channel”'],
      ['discord-billions-messages', 'Bounding partition size with a time bucket — “Cassandra partition keys can be compounded, so our new primary key became ((channel_id, bucket), message_id).”'],
      ['discord-billions-messages', 'Why the sort key is a message ID, not a timestamp — “created_at didn\'t make a great clustering key because two messages can have the same creation time”'],
      ['pg-tutorial-transactions', 'Transactions for multi-row atomicity — “The essential point of a transaction is that it bundles multiple steps into a single, all-or-nothing operation.”']
    ],
    cards: [
      ['What should drive your choice of database?', 'The access patterns — which queries run, by which key, at what rate — more than the shape of the entities.'],
      ['When is a relational database the right default?', 'When you need joins, multi-row transactions, strong consistency or ad-hoc queries, and the scale fits on a primary with replicas.'],
      ['What is denormalisation and its cost?', 'Storing duplicated or precomputed data so reads avoid joins. The cost is more work on writes and the risk of copies drifting out of sync.']
    ],
    quiz: [
      ['What do you write down before choosing a database?', ['The main queries and the keys they use', 'The databases the team already knows how to run', 'The entity-relationship diagram, fully normalised', 'The expected number of microservices'], 'Access patterns determine keys, indexes and store type.', ['aws-dynamodb-nosql-design', 'cassandra-data-modeling']],
      ['Main query: "the 50 latest messages in channel X". Sensible key design?', ['Partition by channel ID, order by a time-sortable message ID', 'Partition by message ID, so each message is fetched by its own key', 'Partition by timestamp only, so recent messages from every channel sit together', 'Partition by author ID, and sort by channel within each partition'], 'Messages for one channel sit together in time order, so the query reads one contiguous range. Discord orders by message ID rather than a timestamp, because two messages can share a creation time.', ['discord-billions-messages']],
      ['Messages are partitioned by channel_id alone. A few channels hold billions of messages. What is the problem and the usual fix?', ['Unbounded partitions — add a time bucket to the partition key', 'Nothing — a partition can keep growing without any limit', 'Too many partitions — merge them into one global table keyed by message ID', 'Stale reads on busy channels — switch to synchronous replication'], 'Discord keys messages by (channel_id, bucket), where the bucket is a fixed time window, to keep partitions a manageable size.', ['discord-billions-messages']],
      ['You need a transfer that debits one account and credits another atomically. Default choice?', ['A relational database with transactions', 'An eventually consistent key-value store', 'An object store', 'A cache with write-behind'], 'Multi-row atomicity is exactly what relational transactions provide.', ['pg-tutorial-transactions']]
    ],
    explain: ['Explain how you go from requirements to a data model and a storage choice.', ['Identify entities and relationships', 'List the queries / access patterns first', 'Keys and indexes follow from the queries', 'Justify SQL vs NoSQL from those patterns (or mention denormalisation)']],
    duck: ['Why not design the tables first and worry about queries later?', 'When would you NOT use a relational database?'],
    lab: {
      type: 'pick', brief: 'Chat messages go in a wide-column store such as Cassandra. The main query is "the 50 latest messages in a channel"; a second is "a user\'s recent messages"; some channels hold hundreds of millions of messages. Pick the four sound design choices.', want: 4,
      options: [
        ['Put the channel ID in the partition key, since every main query names one', true, 'One channel\'s messages sit together, so the main query reads one partition.'],
        ['Order rows in a partition by a time-sortable message ID', true, 'Recent messages form one contiguous range, and two messages never tie.'],
        ['Add a time bucket to the partition key so no partition grows forever', true, 'Discord keys messages by (channel_id, bucket) to keep partitions a manageable size.'],
        ['Serve "a user\'s recent messages" from a second table holding copies', true, 'In a query-first store each query gets its own table: deliberate denormalisation.'],
        ['Put the message ID in the partition key, so each message has its own', false, 'The 50 latest would then be 50 partitions found by no common key.'],
        ['Order rows in a partition by the created_at timestamp alone', false, 'Two messages can share a creation time, so the key is not unique.'],
        ['Partition by day, so the recent messages of every channel sit together', false, 'One partition takes every write, and a channel query must filter a huge one.'],
        ['Serve "a user\'s recent messages" by scanning every channel partition', false, 'That reads the whole table for one user; give the query its own table.']
      ]
    }
  });

  T({
    id: '0C.3', mod: '0C', title: 'Read path vs write path', tag: 'Optimise each separately',
    analogy: 'A supermarket has a loading dock at the back and tills at the front. Deliveries and shoppers have different needs, so they get different doors.',
    points: [
      'Reads and writes usually differ enormously in volume and latency needs. Draw them as two separate paths.',
      'Read-path tools: cache, read replicas, CDN, precomputed or denormalised views.',
      'Write-path tools: queues and batching, append-only logs, sharding, write-optimised (LSM) storage.',
      'The read:write ratio tells you where to spend. At 100:1, do extra work on each write to make reads trivial.',
      'Moving work from read time to write time (precomputation) is a standard optimisation in feed-like systems.'
    ],
    pitfall: 'One arrow labelled "CRUD" between service and database. It hides the most important asymmetry in the system.',
    say: 'Reads outnumber writes about 100 to 1, so I\'ll pay more on the write path — precomputing timelines — to keep reads to a single cache lookup.',
    refs: [
      ['highscalability-twitter-timelines', 'Read/write asymmetry at Twitter, 2012–13 (High Scalability\'s summary of the talk) — “300K QPS are spent reading timelines and only 6000 requests per second are spent on writes”'],
      ['highscalability-twitter-timelines', 'Precompute for most accounts, merge at read time for the largest — “For people like Taylor Swift don\'t bother with fanout anymore, instead merge in her timeline at read time.”'],
      ['cassandra-storage-engine', 'Write-optimised storage — “The architecture is based on Log Structured Merge (LSM) trees, which utilize an append-only approach”'],
      ['aws-rds-read-replicas', 'Read replicas — “In this way, you can elastically scale out beyond the capacity constraints of a single DB instance for read-heavy database workloads.”'],
      ['aws-bl-caching', 'Caching — “Data from this dependency is a good candidate for caching if such a cache would have a good cache hit ratio across requests.”']
    ],
    cards: [
      ['Name three read-path and three write-path optimisations.', 'Read: cache, read replicas, CDN, precomputed views. Write: queue/batching, append-only log, sharding, LSM-based storage.'],
      ['How does the read:write ratio guide design?', 'It shows where load is. Read-heavy → do more at write time (precompute, denormalise, cache). Write-heavy → make writes cheap (append, batch, shard) and accept costlier reads.'],
      ['What does "moving work from read time to write time" mean?', 'Precomputing the answer when data changes (e.g. building each user\'s timeline on post) so that reads become a cheap lookup.']
    ],
    quiz: [
      ['Read:write is 1000:1. Where do you invest?', ['Make reads cheap, even if writes get more expensive', 'Make writes cheap, even if reads get more expensive', 'Optimise both paths equally', 'Neither — add app servers'], 'Spend effort where the volume is.', ['highscalability-twitter-timelines']],
      ['An IoT system ingests 500k sensor writes/s and is read occasionally. Good storage fit?', ['An append-oriented, LSM-based store', 'A heavily indexed relational table', 'A document store with a secondary index per field', 'A B-tree store with synchronous replication to five replicas'], 'Write-heavy ingest favours sequential, append-style writes.', ['cassandra-storage-engine']],
      ['Precomputing a home timeline when someone posts is an example of…', ['Trading write cost for read speed', 'Trading read cost for write speed', 'Vertical scaling', 'Sharding'], 'More work per write, so each read is a simple fetch.', ['highscalability-twitter-timelines']],
      ['Fan-out on write precomputes each follower\'s timeline. For which accounts does it stop making sense, and what replaces it?', ['Accounts with millions of followers — skip the fan-out and merge their posts in at read time', 'Accounts that post rarely — fan out twice to be safe', 'New accounts — they need a dedicated shard', 'Private accounts — their timelines must be computed at read time, for security and privacy reasons'], 'One post would mean millions of timeline writes. Push for ordinary accounts, pull for the few huge ones.', ['highscalability-twitter-timelines']]
    ],
    explain: ['Explain why you treat the read path and write path separately, with an example.', ['Reads and writes differ in volume and latency needs', 'Names read-path tools', 'Names write-path tools', 'Uses the read:write ratio to decide where to spend / precomputation example']],
    duck: ['Isn\'t it all just "talking to the database"? Why split it?', 'What does it mean to do more work at write time?'],
    lab: {
      type: 'sort', brief: 'Which path does each technique mainly help?', buckets: ['Read path', 'Write path'],
      items: [['Add read replicas', 0], ['Put a cache in front of the database', 0], ['Buffer writes in a queue and batch them', 1], ['Serve from a precomputed, denormalised view', 0], ['Shard the primary by user ID', 1], ['Serve static assets from a CDN', 0], ['Use an LSM-tree store for heavy ingest', 1], ['Append to a log and process later', 1]]
    }
  });

  T({
    id: '0C.4', mod: '0C', title: 'Sync vs async', tag: 'What must finish before you reply',
    analogy: 'At a coffee shop you pay at the till (synchronous — you wait for it) and then get a buzzer for the drink (asynchronous — the till is free for the next customer).',
    points: [
      'Synchronous: the caller waits. Use it when the user needs the result to continue — validation, payment authorisation, reading data.',
      'Asynchronous: accept the work, acknowledge, and finish it later via a queue. Use it for slow, bursty, or non-critical work — emails, thumbnails, analytics.',
      'Async buys you lower response time, burst absorption and failure isolation. It costs you eventual consistency and harder debugging.',
      'Async work needs retries, so consumers must be idempotent, and failed messages need a dead-letter queue.',
      'Rule of thumb: do the minimum synchronously to give a correct response, and queue the rest.'
    ],
    pitfall: 'Making something asynchronous when the user needs the answer on the next screen — then bolting on polling to get it back.',
    say: 'Order placement is synchronous up to the payment authorisation; the confirmation email, invoice and analytics all go on a queue.',
    refs: [
      ['azure-queue-load-leveling', 'Queues level load — “The queue decouples the tasks from the service so that the service can handle the messages at its own pace even when concurrent tasks generate a high volume of requests.”'],
      ['azure-queue-load-leveling', '…but not a sustained excess — “If your average producer rate exceeds the consumer rate, the queue continues to grow and latency increases.”'],
      ['rfc9110', 'Acknowledging work that is not finished — “The 202 (Accepted) status code indicates that the request has been accepted for processing, but the processing has not been completed.”'],
      ['aws-sqs-at-least-once', 'At-least-once delivery — “Design your applications to be idempotent (they should not be affected adversely when processing the same message more than once).”'],
      ['aws-sqs-dlq', 'Dead-letter queues — “The maxReceiveCount is the number of times a consumer can receive a message from a source queue before it is moved to a dead-letter queue.”'],
      ['aws-bl-queue-backlogs', 'The cost of going async — “Asynchronous services build up backlogs during outages, leading to long recovery times, unlike synchronous services, which drop requests during outages but have quicker recover times.”'],
      ['hi-openai-l4', 'Interview relevance (candidate reports) — “If you propose a queue, explain what a worker does after a crash and whether a job can run twice. If you propose caching, explain when a cached value becomes stale and whether that is acceptable.”']
    ],
    cards: [
      ['How do you decide whether a step is sync or async?', 'Ask whether the caller needs the result to continue. If yes, sync. If it is slow, bursty or can happen later, async via a queue.'],
      ['What three things does making work asynchronous buy you?', 'Faster responses, absorption of traffic bursts, and isolation from failures in the slow dependency.'],
      ['What does async processing require of consumers?', 'Idempotency (messages may be delivered more than once), retry handling, and a dead-letter queue for messages that keep failing.']
    ],
    quiz: [
      ['A user uploads a video that takes 4 minutes to transcode. Best design?', ['Accept the upload, return 202 at once, transcode from a queue and notify when done', 'Hold the HTTP request open until transcoding finishes', 'Transcode synchronously but raise every timeout to 5 minutes', 'Reject any upload that would take longer to transcode than the HTTP request timeout allows'], 'Long work goes async; the response acknowledges receipt.', ['rfc9110', 'azure-queue-load-leveling']],
      ['Which step in checkout should stay synchronous?', ['Payment authorisation', 'Sending the confirmation email', 'Updating recommendation models', 'Generating the invoice PDF'], 'The user must know whether the payment worked before moving on.', ['azure-queue-load-leveling']],
      ['A worker crashes after charging a card but before acknowledging its message, so the queue redelivers it. What prevents a double charge?', ['The operation ID, recorded before charging and sent to the processor as its key', 'The queue\'s exactly-once delivery guarantee, which removes redeliveries', 'The dead-letter queue, which catches the duplicate before any worker can see it', 'A shorter visibility timeout, so that the message is redelivered sooner'], 'Standard queues deliver at least once, so duplicates are normal operation, not an edge case. The consumer must be idempotent — and because the charge happens in another system, that system has to de-duplicate on the same ID.', ['aws-sqs-at-least-once', 'stripe-blog-idempotency']],
      ['Jobs arrive at 1,200/s around the clock; workers process 1,000/s. Will adding a queue fix it?', ['No — the backlog grows by 200/s for as long as the excess lasts', 'Yes — the queue absorbs the difference between the two rates for good', 'Yes, provided the queue is durable and replicated', 'Yes, if consumers poll in larger batches'], 'A queue levels load only when average arrival is below processing capacity. Otherwise you need more throughput or to shed work.', ['azure-queue-load-leveling', 'aws-bl-queue-backlogs']],
      ['On a standard (unordered) queue, one malformed message makes its consumer throw every time. With plain retries, what happens, and what is the fix?', ['It is redelivered again and again; dead-letter it after N tries', 'It is silently dropped by the broker as soon as the first attempt fails', 'The whole queue pauses until someone repairs the message', 'It is automatically routed to a different, healthy consumer'], 'A dead-letter queue isolates messages that cannot be processed, so they stop consuming capacity and can be inspected. Alert on it, so somebody looks.', ['aws-sqs-dlq']]
    ],
    explain: ['Explain when to make an operation asynchronous and what that costs you.', ['Sync when the caller needs the result now', 'Async for slow / bursty / deferrable work, via a queue', 'Benefits: latency, burst absorption, isolation', 'Costs: eventual consistency, retries → idempotent consumers']],
    duck: ['If async is faster for the user, why not make everything async?', 'What happens if the background job fails?'],
    lab: {
      type: 'sort', brief: 'E-commerce checkout: must it finish before we respond?', buckets: ['Synchronous', 'Asynchronous (queue it)'],
      items: [['Authorise the card', 0], ['Check and reserve inventory', 0], ['Return the order ID', 0], ['Send the confirmation email', 1], ['Generate the invoice PDF', 1], ['Notify the warehouse', 1], ['Update analytics counters', 1], ['Retrain recommendations', 1]]
    }
  });

  /* ---------- 0D Deep Dive ---------- */
  T({
    id: '0D.1', mod: '0D', title: 'Bottleneck identification', tag: 'Find the weakest link, with numbers',
    analogy: 'A motorway that narrows from four lanes to one. Widening any other stretch does nothing — the queue forms at the narrow point.',
    points: [
      'Walk a request hop by hop. For each hop compare the load arriving with the capacity available.',
      'The bottleneck is the hop with the least headroom. Fixing anything else will not help.',
      'It is usually the stateful tier: stateless servers scale by adding more; a database does not.',
      'Prove it with numbers: "60k QPS of reads against a primary we expect to serve ~20k of this query mix" is an argument; "the DB might be slow" is not. State the capacity figure as an assumption.',
      'After you fix one bottleneck the next one appears. Name it.'
    ],
    pitfall: 'Scaling the part you know best rather than the part that is actually saturated.',
    say: 'At 60k read QPS the app tier is fine with more servers, but I\'d expect a single primary to serve around 20k of these queries — that\'s the bottleneck, so that\'s where I\'ll go deeper.',
    refs: [
      ['gregg-use-method', 'The USE method — “For every resource, check utilization, saturation, and errors.”'],
      ['gregg-use-method', 'Confirm with saturation — “100% utilization is usually a sign of a bottleneck (check saturation and its effect to confirm)”'],
      ['gregg-use-method', 'Averages hide bursts — “A burst of high utilization can cause saturation and performance issues, even though utilization is low when averaged over a long interval”'],
      ['bbg-framework', 'What senior interviews probe — “Sometimes, for a senior candidate interview, the discussion could be on the system performance characteristics, likely focusing on the bottlenecks and resource estimations.”'],
      ['hi-levels', 'Find your own bottlenecks — “They are expected to proactively recognize some limitations in their own design and discuss alternatives.”']
    ],
    cards: [
      ['How do you find the bottleneck in a design?', 'Trace a request through each hop and compare load with capacity at each. The hop with the least headroom — highest utilisation, with work queueing for it — is the bottleneck.'],
      ['Why is the bottleneck usually the database?', 'Stateless tiers scale horizontally by adding instances. The stateful tier holds data that must stay consistent, so it cannot be cloned freely.'],
      ['What happens after you remove a bottleneck?', 'The next-weakest component becomes the bottleneck. Say what it is.']
    ],
    quiz: [
      ['8k QPS reach the app tier (capacity 20k). The cache (capacity 100k) answers 1k of them and 7k go on to the database (capacity 6k). Where is the bottleneck?', ['The database', 'The app tier', 'The cache', 'There is none yet'], 'Compare the load arriving at each hop with its capacity: only the database receives more (7k) than it can serve (6k).', 'calc'],
      ['You double the app servers but throughput does not improve. Most likely reason?', ['The constraint is downstream, so the app tier was never the limit', 'Stateless app servers do not scale horizontally behind a load balancer', 'The new servers need a warm-up period before they can take their share of traffic', 'The load balancer is distributing requests unevenly across the new servers'], 'Adding capacity anywhere except the bottleneck changes nothing.', ['gregg-use-method']],
      ['Which claim is strongest in an interview?', ['"Writes are 3k/s and one primary handles about 1k, so we must partition"', '"Databases get slow as they grow, so we should shard before the table gets large"', '"Companies at this scale all shard their databases, so we should do the same"', '"Sharding is best practice for any system expected to grow"'], 'It is backed by a number tied to a capacity.', ['hi-levels']],
      ['Which evidence best identifies a saturated resource?', ['High utilisation together with a growing queue of work waiting for it', 'High CPU utilisation on the load generator that is producing the traffic', 'High average latency measured at the client, across all the requests it sends', 'A rising number of log lines per second written by the service\'s instances'], 'Utilisation says how busy a resource is; saturation says work is waiting for it. Client latency tells you something is slow, not which hop.', ['gregg-use-method']]
    ],
    explain: ['Explain how you identify the bottleneck in a system and convince someone you are right.', ['Trace a request hop by hop', 'Compare load to capacity at each hop', 'Usually the stateful tier, and why', 'Back it with numbers; name the next bottleneck']],
    duck: ['Why not just add more servers everywhere to be safe?', 'How do you know the database is the problem and not something else?'],
    lab: { type: 'estimate', kinds: ['util', 'servers', 'throughput'], n: 5 }
  });

  T({
    id: '0D.2', mod: '0D', title: 'Failure modes', tag: 'What breaks, how far, how you recover',
    analogy: 'Fire doors in a building. You assume a fire will start somewhere; the design goal is that it stays in one room.',
    points: [
      'For every box ask three questions: what if it is dead, what if it is slow, what if it returns wrong answers?',
      'Slow is often worse than dead. A crashed process refuses connections at once; a slow one — or an unreachable host — makes callers wait out their timeouts, holding threads and connections, and it is harder to detect.',
      'Blast radius: how much of the system does this failure take out? Shrink it with redundancy, isolation and timeouts.',
      'Remove single points of failure with replication and failover. State how failover is triggered and how long it takes.',
      'Degrade gracefully: serve stale cache, hide a feature, queue the write — a partial answer usually beats an error.',
      'RTO = the maximum acceptable time to restore service. RPO = the maximum acceptable window of data loss. Both are targets you design to.'
    ],
    pitfall: 'Only considering crashes. Slowness, partial failure and overload are the failures that actually cause cascades.',
    say: 'If the recommendation service is slow, the timeout fires at 200 ms and we fall back to a cached popular list — the page still renders.',
    refs: [
      ['sre-cascading-failures', 'Slow dependencies hold caller resources — “When a frontend sends an RPC to a backend server, the frontend consumes resources waiting for a reply.”'],
      ['gray-failure-hotos17', 'Gray failure — “gray failure: component failures whose manifestations are fairly subtle and thus defy quick and definitive detection”'],
      ['sre-cascading-failures', 'Graceful degradation — “Graceful degradation takes the concept of load shedding one step further by reducing the amount of work that needs to be performed.”'],
      ['aws-wa-dr-objectives', 'RTO — “RTO is the maximum acceptable delay between the interruption of service and restoration of service.”'],
      ['aws-wa-dr-objectives', 'RPO — “RPO is the maximum acceptable amount of time since the last data recovery point.”'],
      ['aws-wa-cell-based', 'Limiting blast radius with cells — “This reduces the potential impact of a failure, such as a bad software update, to an individual cell and the requests that it\'s processing.”'],
      ['azure-bulkhead', 'Bulkheads — “Isolate the elements of an application into pools so that if one element fails, the others continue to function.”'],
      ['hi-networking', 'What senior interviews probe — “Senior candidates are frequently asked questions like "what happens when this service goes down".”']
    ],
    cards: [
      ['Why is a slow dependency often worse than a dead one?', 'A crashed process usually fails fast (connection refused). A slow one ties up the caller\'s threads/connections until timeout, exhausting capacity upstream and cascading — and simple health checks often miss it.'],
      ['Define blast radius, RTO and RPO.', 'Blast radius: how much of the system a failure affects. RTO: target time to recover. RPO: maximum acceptable window of data loss.'],
      ['What is graceful degradation? Give an example.', 'Serving a reduced but useful response when a dependency fails — e.g. stale cached results, or hiding recommendations while the page still loads.']
    ],
    quiz: [
      ['A downstream service starts taking 30 s to answer. With no timeouts, what happens upstream?', ['Callers\' threads fill with waiting requests until they fail too', 'Requests simply complete later, with no other effect on the calling services', 'The load balancer notices the slowness and removes the service automatically', 'Callers queue the extra work on disk and process it once the service recovers'], 'Held slots are capacity lost. That is how one slow service takes down its callers.', ['sre-cascading-failures', 'aws-bl-timeouts-retries']],
      ['Asynchronous replication lags by up to 30 s and failover takes 4 minutes. Which objectives can this design meet?', ['RPO ≈ 30 s of acknowledged writes; RTO ≈ 4 minutes of downtime', 'RPO ≈ 4 minutes of acknowledged writes; RTO ≈ 30 s of downtime', 'RPO is zero, because a replica already exists', 'RTO is zero, because the failover is automatic'], 'RPO is the maximum acceptable window of data loss; RTO is the maximum acceptable time to restore service.', ['aws-wa-dr-objectives']],
      ['The reviews service is down. Best behaviour for the product page?', ['Render the page without reviews', 'Return a 500 for the whole page', 'Retry reviews until it responds', 'Redirect to the home page'], 'Graceful degradation: the core function survives the loss of a non-critical dependency.', ['sre-cascading-failures']],
      ['A node answers health checks in 5 ms but takes 8 s on real requests. Why is this worse than a crash?', ['It is never ejected, so it keeps receiving traffic and ties up its callers', 'Its health checks use up the connection slots that real requests would have used', 'A slow node falls behind on replication, so the answers it does return are stale', 'Slow nodes cannot be restarted until every request in flight completes'], 'A degraded-but-alive component evades fail-stop detection: the checks pass, so nothing removes it, and every caller holds a connection for 8 s. A crashed node is detected and routed around in seconds. Detect it with signals from real traffic, not just pings.', ['gray-failure-hotos17', 'aws-bl-health-checks']]
    ],
    explain: ['Explain how you analyse failure modes in a design and limit their damage.', ['Ask dead / slow / wrong for each component', 'Slow is worse than dead, and why', 'Blast radius and single points of failure', 'Mitigation: redundancy, timeouts, graceful degradation (or RTO/RPO)']],
    duck: ['Why would a slow server be worse than one that is completely off?', 'What does "degrade gracefully" look like to a real user?'],
    lab: {
      type: 'order', brief: 'The product-page service calls the reviews service with no timeout. Put the cascade in order.',
      items: ['The reviews service starts taking 30 s to answer instead of 50 ms', 'Each product-page request now holds a worker thread while it waits on reviews', 'Every worker thread in the product-page service is busy waiting', 'New requests queue, including ones that never call reviews', 'The queue fills and the product-page service rejects every request']
    }
  });

  T({
    id: '0D.3', mod: '0D', title: 'Scaling the bottleneck', tag: 'The right tool for the constraint',
    analogy: 'A toolbox. A hammer is excellent, but not for screws — first identify the fastener.',
    points: [
      'Vertical (bigger machine): simplest, no code change, but there is a ceiling and it is still one machine.',
      'Horizontal (more machines): straightforward for stateless tiers, until a shared dependency becomes the limit; needs partitioning for stateful ones.',
      'Caching: for repeated reads of the same data. Useless when every request is unique, and of little help when data changes as often as it is read.',
      'Read replicas: for read-heavy workloads that tolerate slight staleness. They do nothing for writes.',
      'Sharding: when writes or data size exceed one machine. Powerful and expensive — cross-shard queries and rebalancing hurt.',
      'Async/queues: when the problem is burstiness or slow work rather than sustained volume.'
    ],
    pitfall: 'Reaching for sharding first. It adds permanent complexity; cheaper tools usually buy a lot of time.',
    say: 'The constraint is repeated reads of hot items, so a cache is the right tool; sharding would add complexity without touching that problem.',
    refs: [
      ['azure-sharding', 'Sharding is costly — “Sharding introduces substantial and permanent complexity into your data architecture.”'],
      ['azure-sharding', 'Cheaper tools first — “Read replicas and caching layers can offload read traffic without the cross-shard query complexity that sharding introduces.”'],
      ['azure-sharding', 'When sharding is the answer — “read replicas alone don\'t resolve the bottleneck because write load is also high”'],
      ['aws-bl-caching', 'When a cache does not help — “If each request typically requires a unique query to the dependent service with unique-per-request results, then a cache would have a negligible hit rate and the cache does no good.”'],
      ['azure-queue-load-leveling', 'Queues for bursts — “The queue decouples the tasks from the service so that the service can handle the messages at its own pace even when concurrent tasks generate a high volume of requests.”'],
      ['12factor-concurrency', 'Scaling stateless tiers — “The share-nothing, horizontally partitionable nature of twelve-factor app processes means that adding more concurrency is a simple and reliable operation.”']
    ],
    cards: [
      ['Which scaling tool fits each: repeated reads, read-heavy with full queries, write volume too high, bursty slow jobs?', 'Repeated reads → cache. Read-heavy queries → read replicas. Write volume or data size → sharding. Bursty/slow work → queue + workers.'],
      ['Why is sharding a last resort?', 'It complicates everything: cross-shard queries and transactions, rebalancing, hot keys, operations. Try indexes, caching, replicas and vertical scaling first.'],
      ['What can read replicas not help with?', 'Write throughput — every write still goes to the primary (and is replayed on every replica).']
    ],
    quiz: [
      ['Write volume exceeds what a single primary can handle. Which tool addresses it?', ['Sharding', 'Read replicas', 'A CDN', 'More app servers'], 'Only partitioning spreads writes across machines.', ['azure-sharding']],
      ['Traffic arrives as spikes of image-processing jobs, with quiet periods between. Best fit?', ['A queue with a worker pool', 'A bigger database', 'Read replicas', 'Sharding'], 'A queue absorbs the burst; workers drain it at their own pace.', ['azure-queue-load-leveling']],
      ['Every request asks for a different, never-repeated item. Will a cache help?', ['No — there are no repeated reads to hit', 'Yes — a cache always reduces load on the origin', 'Yes, if it is large enough to avoid evictions', 'Only if it is configured as write-through'], 'A cache only pays off when the same data is requested again.', ['aws-bl-caching']],
      ['Reads are 30k QPS on one primary. Many are "show the user what they just saved". Which plan fits?', ['Cache and replicas, but serve a user\'s own recent writes from the primary', 'Send every read to asynchronous replicas, to take as much as possible off the primary', 'Shard by user ID straight away, before load grows further', 'Scale the primary vertically only, so that every read stays strongly consistent'], 'Asynchronous replicas lag, so read-after-write needs special routing. Sharding addresses writes, which are not the constraint here.', ['aws-rds-read-replicas', 'azure-sharding']]
    ],
    explain: ['Explain how you choose between caching, replicas, sharding and queues.', ['Start from what the constraint is', 'Cache ↔ repeated reads; replicas ↔ read volume', 'Sharding ↔ write volume / data size, and it is costly', 'Queues ↔ bursts and slow work']],
    duck: ['Why not just buy a bigger server?', 'Why is sharding the thing you try last?'],
    lab: {
      type: 'sort', brief: 'Match the problem to the tool.', buckets: ['Cache', 'Read replicas', 'Sharding', 'Queue / async'],
      items: [['The same hot product page is read 50k times a second', 0], ['Reporting queries slow down the primary', 1], ['Write volume exceeds one primary', 2], ['Spiky bursts of image-processing jobs', 3], ['The dataset no longer fits on one machine', 2], ['Sending email slows down checkout', 3], ['An expensive computed result is requested repeatedly', 0], ['Dashboards need full SQL over slightly stale data', 1]]
    }
  });

  T({
    id: '0D.4', mod: '0D', title: 'Consistency vs availability', tag: 'For THIS system, which wins',
    analogy: 'Two bank branches whose phone line is cut. Either both stop handing out cash until the line is back (consistent, unavailable) or both keep serving and reconcile the books later (available, inconsistent).',
    points: [
      'The choice is forced when a partition happens — in practice, when a timeout fires and you must either answer or refuse. When the network is healthy you can have both, though consistency still costs latency.',
      'Choose consistency when a wrong answer costs more than no answer: money, inventory, locks, unique names.',
      'Choose availability when a stale answer is acceptable: feeds, likes, carts, presence, DNS.',
      'It is a per-operation decision, not a per-system one. A shop can be AP for browsing and CP for checkout.',
      'Eventual consistency needs a story for conflicts: last-write-wins (simple, but it drops one of two concurrent writes and trusts clocks) or an application-level merge (keeps both, though deleted items can reappear).'
    ],
    pitfall: 'Declaring "this is an AP system" for a product that takes payments. Decide per operation.',
    say: 'For the like count I\'ll take availability — a stale count is harmless. For the seat reservation I need consistency, even if it means rejecting requests during a partition.',
    refs: [
      ['brewer-cap-twelve-years-later', 'Only forced during a partition — “because partitions are rare, there is little reason to forfeit C or A when the system is not partitioned”'],
      ['brewer-cap-twelve-years-later', 'Decided per operation — “not only can subsystems make different choices, but the choice can change according to the operation or even the specific data or user involved”'],
      ['brewer-cap-twelve-years-later', 'ATMs choose availability… — “In the design of an automated teller machine (ATM), strong consistency would appear to be the logical choice, but in practice, A trumps C.”'],
      ['brewer-cap-twelve-years-later', '…with bounded risk — “the ATM chooses a sophisticated limit on availability that permits withdrawals but bounds the risk.”'],
      ['brewer-cap-twelve-years-later', 'Overselling is a choice when you can compensate — “If there are too many passengers, some will lose their seats, and ideally customer service will compensate those passengers in some way.”'],
      ['dynamo-sosp07', 'Dynamo\'s shopping cart — “the shopping cart application requires that an "Add to Cart" operation can never be forgotten or rejected”'],
      ['riak-conflict-resolution', 'Last-write-wins loses data — “it will necessarily drop some writes in the case of concurrent updates”'],
      ['dynamo-sosp07', 'Merging has its own cost — “However, deleted items can resurface.”'],
      ['vogels-eventually-consistent', 'DNS — “The most popular system that implements eventual consistency is DNS (Domain Name System).”']
    ],
    cards: [
      ['When does the consistency vs availability choice actually apply?', 'During a network partition. Without a partition a system can be both consistent and available — it then trades latency for consistency instead.'],
      ['Give two operations that should favour consistency and two that should favour availability.', 'Consistency: payments/ledger, seat or inventory reservation, distributed locks. Availability: social feed, like counts, shopping cart, presence.'],
      ['Why is CP vs AP a per-operation decision?', 'Different operations in one product have different costs for being wrong vs being unavailable — browsing can be stale, checkout cannot.']
    ],
    quiz: [
      ['A system sells specific numbered concert seats, with no overbooking and no way to compensate a buyer. During a partition it should…', ['Reject bookings it cannot confirm rather than risk a double booking', 'Accept all bookings on both sides and resolve the conflicts afterwards', 'Serve each booking from whichever replica happens to answer it first', 'Queue the bookings locally and confirm them to buyers optimistically'], 'A double-sold seat cannot be repaired afterwards, so refusing is the cheaper mistake. Airlines choose the opposite and overbook, because they can compensate: the decision turns on whether the error can be fixed later.', ['brewer-cap-twelve-years-later']],
      ['Which operation tolerates eventual consistency best?', ['Displaying a post\'s like count', 'Debiting a bank account', 'Acquiring a distributed lock', 'Electing a leader'], 'A slightly stale like count harms no one.', ['brewer-cap-twelve-years-later', 'vogels-eventually-consistent']],
      ['A shopping cart stays writable during a partition, and two replicas accept different edits. What must the design specify?', ['How divergent versions are reconciled — e.g. merged, not last-write-wins', 'Nothing — eventual consistency converges to the right cart without any design', 'A global lock on each cart, held across both replicas until the partition heals', 'That carts become read-only on both replicas for the whole partition'], 'Choosing availability means choosing a conflict-resolution story; last-write-wins would silently drop one of the edits. Dynamo returns both versions and lets the application merge the cart.', ['dynamo-sosp07', 'riak-conflict-resolution']],
      ['ATMs keep dispensing cash when partitioned from the bank. How does that fit with "money needs consistency"?', ['Bounded risk: a withdrawal limit caps the loss, which is settled afterwards', 'Each ATM holds a full, current copy of the account ledger, so it is never wrong', 'It does not — ATMs refuse withdrawals until their link to the bank is restored', 'ATMs reach the bank over dedicated leased lines, so they are never partitioned'], 'The choice is made per operation, by comparing the cost of being wrong with the cost of being unavailable.', ['brewer-cap-twelve-years-later']]
    ],
    explain: ['Explain the consistency vs availability trade-off and how you would decide for a given feature.', ['The choice is forced only during a partition', 'Consistency when wrong answers are costly (examples)', 'Availability when stale is fine (examples)', 'Decided per operation, not per system']],
    duck: ['Why can\'t I just have both all the time?', 'How would you decide for a shopping cart versus a payment?'],
    lab: {
      type: 'sort', brief: 'During a partition, which should each favour?', buckets: ['Consistency (CP)', 'Availability (AP)'],
      items: [['Bank transfer', 0], ['Concert seat booking', 0], ['Like counter on a post', 1], ['Adding to a shopping cart', 1], ['Distributed lock / leader election', 0], ['Social feed timeline', 1], ['Decrementing the last item of stock', 0], ['Online-presence dot', 1], ['DNS lookups', 1]]
    }
  });

  T({
    id: '0D.5', mod: '0D', title: 'Monitoring & observability', tag: 'Metrics, alerts, dashboards',
    analogy: 'A car dashboard. A few gauges tell you whether you can keep driving; a warning light comes on only when you must act; the mechanic\'s diagnostic port is for finding out why.',
    points: [
      'Four golden signals: latency, traffic, errors, saturation.',
      'RED for request-driven services: Rate, Errors, Duration. USE for resources: Utilisation, Saturation, Errors.',
      'SLI = what you measure. SLO = the target. Error budget = how much failure the SLO allows; spend it on shipping.',
      'Alert on symptoms users feel (error rate, latency vs SLO), not on causes (CPU). Causes go on dashboards.',
      'Use percentiles, not averages — and never average percentiles across hosts; merge the histograms. Three kinds of telemetry for debugging: metrics, logs, traces.'
    ],
    pitfall: 'Paging on CPU at 80%. It wakes people for non-problems and misses real outages where CPU is fine.',
    say: 'I\'d define an SLO of 99.9% of requests under 300 ms, alert on error-budget burn rate, and keep CPU and queue depth on dashboards for diagnosis.',
    refs: [
      ['sre-monitoring', 'Golden signals — “The four golden signals of monitoring are latency, traffic, errors, and saturation.”'],
      ['sre-monitoring', 'Symptoms over causes — “it\'s better to spend much more effort on catching symptoms than causes; when it comes to causes, only worry about very definite, very imminent causes”'],
      ['sre-slo', 'SLI — “a carefully defined quantitative measure of some aspect of the level of service that is provided”'],
      ['sre-slo', 'SLO — “a target value or range of values for a service level that is measured by an SLI”'],
      ['sre-embracing-risk', 'Error budget — “as long as there is error budget remaining-new releases can be pushed”'],
      ['sre-workbook-alerting-on-slos', 'Burn-rate paging (14.4× for one hour = 2% of a 30-day budget) — “We recommend 2% budget consumption in one hour and 5% budget consumption in six hours as reasonable starting numbers for paging, and 10% budget consumption in three days as a good baseline for ticket alerts.”'],
      ['grafana-red-method', 'RED — “Rate (the number of requests per second)”'],
      ['prometheus-histograms', 'Never average percentiles — “In this particular case, averaging the quantiles yields statistically nonsensical values.”'],
      ['sre-slo', 'Percentiles — “We generally prefer to work with percentiles rather than the mean (arithmetic average) of a set of values.”']
    ],
    cards: [
      ['What are the four golden signals?', 'Latency, traffic, errors and saturation.'],
      ['SLI vs SLO vs error budget?', 'SLI: the measured indicator (e.g. % of requests under 300 ms). SLO: the target for it (e.g. 99.9%). Error budget: the allowed shortfall (0.1%) you can spend on risk.'],
      ['Why alert on symptoms rather than causes?', 'Symptoms (errors, latency) mean users are hurt and someone must act. Causes (CPU, memory) often fire with no user impact and miss failures that have other causes.']
    ],
    quiz: [
      ['Which should page a human at 3 a.m.?', ['Checkout errors burned the error budget at 14.4× over the past hour', 'CPU on one node of the checkout service has been at 85% for ten minutes', 'One of twelve checkout replicas restarted and rejoined the pool within a minute', 'GC pause time on the checkout service is up 20% week over week'], 'It is a user-facing symptom that needs action. The rest are diagnostic.', ['sre-monitoring', 'sre-workbook-alerting-on-slos']],
      ['A service has a 99.9% availability SLO over 30 days. How much error budget is that, and what does a burn rate of 14.4 mean?', ['~43 minutes of full outage; at 14.4× you burn 2% of the budget in one hour', '~7 hours; 14.4× means 14.4% of requests fail', '~4 minutes; 14.4× is the normal steady rate', '~43 minutes of full outage; at 14.4× the whole budget would last 14.4 days'], '0.1% of 43,200 minutes is 43.2. A burn rate of 1 uses the budget exactly over the window; 14.4 would exhaust it in about two days.', ['sre-workbook-alerting-on-slos']],
      ['Mean latency is 80 ms but users complain. What do you check first?', ['Tail percentiles such as p99', 'The mean over a longer window', 'Average CPU utilisation', 'Total request count'], 'Averages hide the slow tail that users actually feel.', ['sre-slo', 'sre-monitoring']],
      ['Each of 40 hosts reports its own p99. A dashboard averages those 40 numbers and labels it "fleet p99". Why is that wrong?', ['Percentiles cannot be averaged — merge the histograms, then take p99', 'It should be the maximum of the 40 values, as p99 is a worst case', 'It should be the median of the 40 per-host values', 'It is correct whenever hosts receive equal traffic'], 'A percentile is a property of a distribution. Aggregate the distributions (histogram buckets), then take the percentile.', ['prometheus-histograms']]
    ],
    explain: ['Explain how you would monitor a service and decide what to alert on.', ['Golden signals or RED/USE', 'SLI / SLO / error budget', 'Alert on symptoms, dashboards for causes', 'Percentiles over averages (or metrics/logs/traces)']],
    duck: ['Why not alert on everything, just to be safe?', 'What is an error budget actually for?'],
    lab: {
      type: 'sort', brief: 'Page someone, or put it on a dashboard?', buckets: ['Page a human (symptom)', 'Dashboard / ticket (cause)'],
      items: [['p99 checkout latency above SLO for 10 minutes', 0], ['Error budget burned at 14.4× the sustainable rate over the past hour', 0], ['CPU at 85% on one node', 1], ['One of twelve replicas restarted', 1], ['Login success rate dropped to 80%', 0], ['GC pause time up 20%', 1], ['Queue depth rising, latency still within SLO', 1]]
    }
  });

  T({
    id: '0D.6', mod: '0D', title: 'Cost optimisation', tag: 'Where the money goes',
    analogy: 'A household budget. You do not save money by cutting coffee if rent is 70% of spending — find the big line first.',
    points: [
      'Find the dominant cost line first: compute, storage, or data transfer. It differs by system — typically data transfer for media delivery, GPU compute for ML, storage for logs — so read the bill rather than assume.',
      'Commit to the steady baseline (savings plans or reserved instances: a 1- or 3-year spend commitment for a lower rate, not by itself a capacity guarantee); autoscale on-demand for the peaks.',
      'Spot/preemptible instances are much cheaper (up to ~90% off on AWS) but can be reclaimed at about two minutes\' notice — use them for stateless, batch, or checkpointed work.',
      'Tier storage by access frequency: hot, infrequent-access, archive. Colder tiers are cheaper to hold but charge for retrieval and have minimum storage durations, so they suit data that is rarely read.',
      'Caching and right-sizing cut compute. Data transfer is billed per GB: internet egress most, cross-region and cross-zone traffic less but not zero. A CDN and keeping chatty services close together reduce it — though spreading across zones is also how you get availability.'
    ],
    pitfall: 'Optimising a small cost line while ignoring the dominant one — or forgetting egress entirely.',
    say: 'For a video service the bill is dominated by egress, so the levers are CDN contracts and encoding efficiency rather than app-server count.',
    refs: [
      ['aws-ec2-spot-product', 'Spot discount — “up to a 90% discount compared to On-Demand prices”'],
      ['aws-ec2-spot-userguide', 'Spot interruption — “Amazon EC2 provides a Spot Instance interruption notice, which gives the instance a two-minute warning before it is interrupted.”'],
      ['aws-savings-plans-pricing', 'Commitments — “a commitment to a consistent amount of usage (measured in $/hour) for a 1 or 3 year term”'],
      ['aws-savings-plans-faq', 'A discount, not reserved capacity — “No, Savings Plans does not provide a capacity reservation.”'],
      ['aws-s3-storage-classes', 'Storage tiers — “These storage classes require minimum storage durations and retrieval fees making them most effective for rarely accessed data.”'],
      ['aws-s3-lifecycle-transitions', 'Lifecycle policies — “In an S3 Lifecycle configuration, you can define rules to transition objects from one storage class to another to save on storage costs.”'],
      ['aws-ec2-on-demand-pricing', 'Cross-zone transfer is billed (us-east-1 list price, November 2026) — “across Availability Zones in the same AWS Region is charged at $0.01/GB in each direction”'],
      ['aws-arch-blog-data-transfer', 'Egress — “Data transfer from AWS to the internet is charged per service, with rates specific to the originating Region.”']
    ],
    cards: [
      ['What are the three main cloud cost lines, and what should you do first?', 'Compute, storage and data transfer (network egress). First find which one dominates for this system.'],
      ['When are spot/preemptible instances appropriate?', 'For interruptible work: stateless services with spare capacity, batch jobs, and training with checkpoints. Not for a single stateful primary.'],
      ['What is storage tiering?', 'Moving data, as it is accessed less, to storage classes that are cheaper to hold but costlier — and for archive tiers slower — to read: hot → infrequent access → archive, usually by lifecycle policy.']
    ],
    quiz: [
      ['A training job runs 20 hours on GPUs and checkpoints every 10 minutes. Where should it run to minimise cost, and why is that safe?', ['Spot capacity — an interruption costs about 10 minutes of work at most', 'On-demand capacity, because any interruption restarts the job from the beginning', 'Reserved instances bought for this one job', 'The inference fleet\'s capacity during its peak'], 'Interruptible, checkpointed work can take the large spot discount; a reclaim, which comes with about two minutes\' notice, only loses progress since the last checkpoint.', ['aws-ec2-spot-userguide', 'aws-ec2-spot-product']],
      ['Logs are read heavily for a week and almost never afterwards. Why not write them straight to the cheapest archive tier?', ['Archive tiers charge for retrieval and have minimum storage durations', 'Archive tiers are less durable than standard storage', 'Lifecycle rules cannot move objects between tiers once they have been written', 'Archive tiers cost more per GB than standard storage'], 'Colder tiers are cheaper to hold but costlier to read, so they suit data that is rarely accessed. Keep the hot week in standard storage and let a lifecycle rule move it afterwards.', ['aws-s3-storage-classes', 'aws-s3-lifecycle-transitions']],
      ['Best purchasing mix for a steady baseline with daily peaks?', ['Commit for the baseline, autoscale on-demand for peaks', 'On-demand for everything', 'Commit for peak capacity', 'Spot instances for everything, including the primary database'], 'Committing to the floor is cheapest; elasticity covers the rest.', ['aws-savings-plans-pricing']],
      ['A chatty service calls a dependency in another availability zone 50k times a second with 20 KB responses. Which cost line should you check?', ['Cross-zone data transfer — billed per GB, and this is ~1 GB every second', 'Load balancer hours for the internal balancer', 'DNS query charges for service discovery', 'None — traffic that stays inside a single region is never billed by the cloud provider'], '50,000 × 20 KB = 1 GB/s, roughly 2.6 PB a month. At about a cent per GB in each direction (AWS list price), that is tens of thousands of dollars a month.', ['aws-ec2-on-demand-pricing', 'aws-arch-blog-data-transfer']]
    ],
    explain: ['Explain how you would reason about and reduce the cost of a system.', ['Find the dominant cost line first', 'Commit for baseline, on-demand/autoscale for peaks', 'Spot for interruptible work', 'Storage tiering or egress reduction']],
    duck: ['Why not just run everything on the cheapest instances?', 'What is "egress" and why does it matter so much?'],
    lab: {
      type: 'estimate', brief: 'Find the big cost line, then price the levers. 1 PB = 1,000,000 GB; 1 TB = 1,000 GB; a month is 30 days.', fixed: [
        { q: 'A video service\'s monthly bill: 2 PB of internet egress at an assumed $0.05/GB, $20,000 of compute and $15,000 of storage. What share of the bill is egress?', a: 74, unit: '%', tol: 0.05, how: '2,000,000 GB × $0.05 = $100,000. Total = 100,000 + 20,000 + 15,000 = $135,000, and 100,000 ÷ 135,000 ≈ 74%. Halving compute would save about 7% of the bill; the levers that matter are on egress (CDN pricing, encoding efficiency).' },
        { q: 'Service A sends 5 TB a day to service B in another availability zone. At $0.01/GB charged in each direction, what does that traffic cost per month?', a: 3000, unit: '$ a month', tol: 0.05, how: 'Each GB is billed leaving one zone and again entering the other: $0.02. 5,000 GB × $0.02 = $100 a day × 30 = $3,000 a month, for traffic that never leaves the region.' },
        { q: 'A service needs 40 instances all day plus 60 more for an 8-hour daily peak. On-demand costs $1.00 an hour; a 1-year commitment rate is $0.60 an hour. Commit for the 40 and run the peak on demand: cost per day?', a: 1056, unit: '$ a day', tol: 0.05, how: '40 × 24 h × $0.60 = $576, plus 60 × 8 h × $1.00 = $480: $1,056. All on demand is 960 + 480 = $1,440. Committing for all 100 costs 100 × 24 × $0.60 = $1,440 too: the peak instances are paid for through the 16 hours they are not needed.' },
        { q: 'A batch fleet costs $40,000 a month on demand. Spot capacity is 70% cheaper, and interruptions mean about 10% of the work has to be redone. Monthly cost on spot?', a: 13200, unit: '$ a month', tol: 0.05, how: '$40,000 × 0.30 = $12,000 for the same hours; 10% more hours for redone work: $12,000 × 1.1 = $13,200, about a third of the on-demand bill. Checkpointing keeps the redone share small.' }
      ]
    }
  });

})(SD.T);
