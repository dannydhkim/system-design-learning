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
      'Commit to 3–5 core flows. Explicitly park everything else as out of scope and get the interviewer to agree.',
      'Identify the actors (end users, admins, internal services) — different actors mean different features.',
      'Each functional requirement becomes at least one API endpoint and one path through your diagram. It is your completeness checklist.'
    ],
    pitfall: 'Listing twelve features and designing none of them deeply. Breadth without prioritisation reads as no judgment.',
    say: 'I\'ll focus on three core flows: X, Y and Z. I\'m treating search and analytics as out of scope unless you\'d like them in.',
    cards: [
      ['What test tells you a requirement is functional rather than non-functional?', 'It describes a capability — you can write it as "<Actor> can ___". Non-functional requirements describe qualities (how fast, how reliable) of those capabilities.'],
      ['How many functional requirements should you commit to in a 45-minute interview, and what happens to the rest?', '3–5 core flows. The rest are named out loud as out of scope, with the interviewer\'s agreement.'],
      ['How do functional requirements get used later in the interview?', 'Each maps to API endpoint(s) and a request path through the high-level design. At the end you walk the list to check the design is complete.']
    ],
    quiz: [
      ['Which of these is a functional requirement for a ride-sharing app?', ['Riders can request a ride and see the matched driver', 'p99 matching time is under 5 seconds', 'The service is available 99.99% of the time', 'Trip data survives the loss of a datacenter'], 'Only the first describes a capability. The others are qualities: latency, availability, durability.'],
      ['The prompt is "Design YouTube" and you have 45 minutes. Best opening move?', ['Agree on upload + watch as the core, and park comments, recommendations and live streaming', 'List every feature you can think of to show breadth', 'Start drawing the CDN, since video is obviously the hard part', 'Ask which database the interviewer prefers'], 'Scoping is the skill being tested. You cannot design everything; choose and get agreement.'],
      ['What is a good check that your functional requirements list is usable?', ['Each one maps to an endpoint and a path through the diagram', 'Each one has a latency number attached', 'Each one names a technology', 'There are at least ten of them'], 'Requirements drive the API and the diagram. Numbers belong to non-functional requirements; technologies come later.']
    ],
    explain: ['In your own words: what is a functional requirement, and how do you decide what is in scope versus out?', ['Describes behaviour — something an actor can do', 'Prioritise 3–5 core flows', 'Explicitly park the rest, with interviewer buy-in', 'Requirements map onto the API and the diagram later']],
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
      'The usual suspects: latency, throughput, availability, consistency, durability, scalability.',
      'Quantify them. "p99 under 200 ms" is a requirement; "fast" is a wish.',
      'Availability in nines: 99.9% ≈ 8.8 hours of downtime a year, 99.99% ≈ 53 minutes, 99.999% ≈ 5 minutes.',
      'Durability ≠ availability. Durable = acknowledged data is never lost. Available = the system answers right now.',
      'Pick the 2–3 that drive this design and say what you will trade for them. Every later component should be justified by one.'
    ],
    pitfall: 'Reciting all of them with no priorities. A payment system and a like-counter want opposite trade-offs — say which one you are building.',
    say: 'For this system I care most about read latency and availability, and I\'m willing to accept eventual consistency on the feed to get them.',
    cards: [
      ['Roughly how much downtime per year do 99.9%, 99.99% and 99.999% availability allow?', '99.9% ≈ 8.8 hours · 99.99% ≈ 53 minutes · 99.999% ≈ 5 minutes.'],
      ['What is the difference between durability and availability?', 'Durability: once a write is acknowledged, the data is not lost. Availability: the system responds to requests. A system can be down (unavailable) without losing anything (durable).'],
      ['Why state latency as a percentile (p99) instead of an average?', 'Averages hide the tail. A 50 ms average can coexist with 1% of requests taking 3 seconds — and a page that makes many calls becomes increasingly likely to hit that tail (with 100 calls, about 63% of page loads see at least one p99-slow call).']
    ],
    quiz: [
      ['Which statement is a well-formed non-functional requirement?', ['p99 read latency under 200 ms at 10k QPS', 'The system should be fast and scalable', 'Users can upload photos', 'We will use Cassandra for storage'], 'It is measurable and names the condition it holds under. "Fast" is not testable; the others are a feature and a solution.'],
      ['A bank can be offline for an hour during maintenance but must never lose a committed transfer. Which matters more here?', ['Durability over availability', 'Availability over durability', 'Latency over consistency', 'Throughput over durability'], 'Being down is tolerated; losing acknowledged data is not. That is durability.'],
      ['99.99% availability allows roughly how much downtime per year?', ['About 53 minutes', 'About 9 hours', 'About 5 minutes', 'About 3.5 days'], 'A year is ~525,600 minutes; 0.01% of that is ~53 minutes.']
    ],
    explain: ['Explain the main non-functional requirements and how you choose which ones drive a design.', ['Names several: latency, availability, consistency, durability, throughput', 'They must be quantified (percentiles, nines, QPS)', 'Distinguishes durability from availability', 'Prioritises 2–3 and states the trade-off accepted']],
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
      'Peak is typically 2–10× the average. Size for peak, not average.',
      'Storage = writes per day × bytes per write × retention. Bandwidth = QPS × payload size.',
      'Always end with "so what": "12k read QPS → we need caching and replicas; 2 TB a year → fits on one node".'
    ],
    pitfall: 'Five minutes of silent long division that changes no design decision. Round hard, speak your assumptions, and tie the number to a consequence.',
    say: 'Let me sanity-check scale: 100M daily users × 10 reads is a billion a day, roughly 12k QPS average, maybe 50k at peak. That\'s read-heavy enough that I\'ll plan for caching.',
    cards: [
      ['1 million requests per day is roughly how many per second?', 'About 12 QPS (1,000,000 ÷ 86,400). With the 10⁵ shortcut you get 10 — close enough.'],
      ['What is the formula for storage growth?', 'Writes per day × bytes per write × retention period (× replication factor if asked).'],
      ['What should every estimate end with?', 'A "so what" — the design consequence. E.g. "this fits on one machine" or "this needs sharding".']
    ],
    quiz: [
      ['50M daily users each do 20 reads. Average read QPS is closest to…', ['~12,000', '~1,200', '~120,000', '~1,000,000'], '50M × 20 = 1B per day; 1B ÷ 86,400 ≈ 11,600.'],
      ['Why estimate at all in an interview?', ['To discover which resource is the hard constraint and justify design choices', 'To prove you can do long division', 'Because the exact server count is the deliverable', 'To fill the first ten minutes'], 'Estimates exist to drive decisions: cache or not, shard or not, one region or many.'],
      ['10M writes/day at 1 KB each, kept 5 years. Storage is about…', ['~18 TB', '~18 GB', '~180 TB', '~1.8 PB'], '10M × 1 KB = 10 GB/day → 3.65 TB/year → ~18 TB over five years.']
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
      'Budget your time: roughly 5 min requirements, 5 min estimation and API, 15 min high-level design, 15 min deep dive, 5 min wrap-up.'
    ],
    pitfall: 'Silently assuming global scale and designing a multi-region system for a prompt that needed one database.',
    say: 'I\'ll assume a single region to start, read-heavy traffic around 100:1, and that auth already exists. Tell me if any of those are wrong.',
    cards: [
      ['What are the three piles to sort facts into at the start of a design interview?', 'Given (by the interviewer), assumed (by you, stated out loud), and out of scope.'],
      ['Why state assumptions explicitly?', 'So the interviewer can correct them early, and so your later choices are judged against the problem you both agreed on.'],
      ['Give a rough time budget for a 45-minute system design interview.', '~5 min requirements · ~5 min estimation/API · ~15 min high-level design · ~15 min deep dive · ~5 min wrap-up.']
    ],
    quiz: [
      ['The interviewer has not mentioned scale. What do you do?', ['Propose a number, say it is an assumption, and ask if it is reasonable', 'Assume planet scale to be safe', 'Assume a tiny scale to keep it simple', 'Skip scale and start on the API'], 'Proposing and confirming shows judgment and keeps you moving.'],
      ['Which is a constraint rather than a requirement?', ['The company already runs everything on PostgreSQL', 'Users can reset their password', 'p99 latency under 300 ms', 'Users can upload a profile photo'], 'A constraint limits your solution space; it is not something the product does or a quality it must have.'],
      ['You are 25 minutes in and still on requirements. What went wrong?', ['No time budget — the design and deep dive carry most of the signal', 'Nothing; requirements are the most important phase', 'You should have skipped requirements entirely', 'You should have started with the database schema'], 'Requirements deserve about five minutes. Most of the evaluation happens in design and deep dive.']
    ],
    explain: ['Explain how you handle constraints and assumptions at the start of a design.', ['Separates given / assumed / out of scope', 'States assumptions aloud and invites correction', 'Mentions typical constraints (infra, budget, region, compliance)', 'Keeps a time budget in mind']],
    duck: ['What if you assume wrong?', 'Isn\'t asking lots of questions a sign you don\'t know the answer?'],
    lab: {
      type: 'order', brief: 'Put the phases of a system design interview in order.',
      items: ['Clarify functional and non-functional requirements', 'Back-of-envelope capacity estimation', 'Define the API', 'High-level design: box diagram and data model', 'Deep dive on bottlenecks and failure modes', 'Wrap up: trade-offs, monitoring, what you would do next']
    }
  });

  T({
    id: '0A.5', mod: '0A', title: 'Clarifying questions', tag: 'Ask before you draw',
    analogy: 'A doctor taking a history before prescribing. Same symptom, very different treatment depending on the answers.',
    points: [
      'Ask questions whose answers change the design: scale, read:write ratio, consistency needs, latency targets, who the users are.',
      'Do not ask about solutions ("should I use Kafka?"). Those are your decisions to make and defend.',
      'Offer a default with each question: "I\'ll assume X unless you say otherwise." It keeps momentum.',
      'Stop after 4–6 good questions. Clarification is a means, not the interview.'
    ],
    pitfall: 'Twenty questions with no proposals. It hands the interview to the interviewer and burns your time.',
    say: 'Before I draw anything: roughly how many daily users, and is it more read-heavy or write-heavy? I\'ll assume read-heavy at about 100:1.',
    cards: [
      ['What makes a clarifying question worth asking?', 'Its answer would change the design — e.g. scale, read:write ratio, consistency needs, latency targets, core features.'],
      ['Why should you not ask "should I use Kafka / Postgres / Redis?"', 'Technology choices are yours to make and justify from the requirements. Asking hands away the decision you are being assessed on.'],
      ['What is the "propose a default" technique?', 'Attach an assumption to each question — "I\'ll assume X unless you say otherwise" — so you keep moving even if the interviewer is vague.']
    ],
    quiz: [
      ['Which question best changes the design of a chat system?', ['Do messages need to be delivered in order and persisted, or is best-effort fine?', 'Should I use WebSockets?', 'Which cloud provider do you prefer?', 'Is Go or Java better for this?'], 'Ordering and durability guarantees reshape the whole architecture. The others are solution choices you should own.'],
      ['The interviewer answers "up to you". What now?', ['State a reasonable assumption and move on', 'Rephrase and ask again until you get an answer', 'Assume the hardest possible case', 'Skip the topic'], '"Up to you" is an invitation to show judgment.'],
      ['How many clarifying questions is about right?', ['4–6 that each affect the design', 'One — do not waste time', 'As many as possible to be thorough', 'None; start designing immediately'], 'Enough to pin scope and scale; not so many that you never design.']
    ],
    explain: ['Explain what separates a good clarifying question from a bad one, with an example of each.', ['Good questions change the design', 'Bad questions ask the interviewer to choose your solution', 'Gives a concrete example of each', 'Mentions proposing defaults / limiting the number of questions']],
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
    cards: [
      ['Which HTTP methods are idempotent, and which common one is not?', 'GET, PUT and DELETE are idempotent (repeating them leaves the same state). POST is not. PATCH is not guaranteed to be.'],
      ['Cursor vs offset pagination — the trade-off?', 'Offset (page=3) is simple but the DB must skip rows (slow when deep) and results shift when items are inserted. Cursor ("after this ID") is stable and efficient but cannot jump to an arbitrary page.'],
      ['What do 201, 204, 409 and 429 mean?', '201 Created · 204 success with no body · 409 Conflict with current state (e.g. duplicate) · 429 rate limited.']
    ],
    quiz: [
      ['Which endpoint is the most RESTful way to delete draft order 7?', ['DELETE /v1/orders/7', 'POST /v1/deleteOrder?id=7', 'GET /v1/orders/7/delete', 'POST /v1/orders/delete/7'], 'The resource is the order; the verb says what to do. A GET must never change state. (Cancelling a placed order is different: the order still exists, so that is a state change — e.g. a PATCH of its status — not a DELETE.)'],
      ['A feed gets new items constantly. Which pagination avoids duplicates and skips as the user scrolls?', ['Cursor-based', 'Offset-based', 'Page-number-based', 'No pagination'], 'Offsets shift when new items are inserted at the top; a cursor anchors to a specific item.'],
      ['A client tries to create a username that already exists. Best status code?', ['409 Conflict', '404 Not Found', '500 Internal Server Error', '200 OK with an error message'], 'The request conflicts with current state. It is a client-side issue, so not 5xx.']
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
      'gRPC = HTTP/2 transport + Protocol Buffers (compact binary) + a schema-first contract with generated client and server code.',
      'Four call types: unary, server streaming, client streaming, bidirectional streaming.',
      'Strong fit for internal service-to-service calls: low overhead, strict types, and deadlines that can be propagated down the call chain (automatic in some languages such as Go and Java, opt-in in others).',
      'Weaker fit for public or browser APIs: browsers need a gRPC-Web proxy (which supports only unary and server-streaming calls), binary payloads are harder to debug, HTTP caching does not apply.',
      'Schema evolution: add new optional fields, never reuse or renumber existing field numbers.'
    ],
    pitfall: 'Choosing gRPC for a public third-party API "because it\'s faster". Reach and debuggability usually matter more there.',
    say: 'Externally I\'ll expose REST; between internal services I\'d use gRPC for typed contracts and deadline propagation.',
    cards: [
      ['What three things make up gRPC?', 'HTTP/2 as transport, Protocol Buffers as the binary serialization format, and a schema-first contract (.proto) with generated code.'],
      ['When is gRPC a better choice than REST, and when is it worse?', 'Better: internal service-to-service calls needing low latency, strict schemas, streaming. Worse: public/browser-facing APIs where reach, human readability and HTTP caching matter.'],
      ['What is the golden rule for evolving a protobuf schema?', 'Never reuse or change existing field numbers. Add new fields as optional so old and new clients stay compatible.']
    ],
    quiz: [
      ['Best protocol for calls between 30 internal microservices with strict latency budgets?', ['gRPC', 'REST with JSON', 'GraphQL', 'SOAP'], 'Binary encoding, HTTP/2 multiplexing, generated clients and deadlines suit internal calls.'],
      ['Which is NOT a gRPC call type?', ['Publish–subscribe', 'Unary', 'Server streaming', 'Bidirectional streaming'], 'gRPC offers unary, server-streaming, client-streaming and bidirectional. Pub/sub is a messaging pattern.'],
      ['You remove a protobuf field and give its number to a new field of a different type. What happens?', ['Old clients misinterpret the data', 'Nothing; numbers are just labels', 'The compiler fixes it automatically', 'Requests get faster'], 'The wire format identifies fields by number. Old binaries will try to decode the new field as the old one — at best a parse error, at worst silent data corruption.']
    ],
    explain: ['Explain what gRPC is and when you would pick it over REST.', ['HTTP/2 + protobuf + schema with code generation', 'Good for internal, low-latency, strongly-typed calls', 'Supports streaming', 'Poor fit for browsers/public APIs, with a reason']],
    duck: ['If gRPC is faster, why doesn\'t everyone use it everywhere?', 'What does "schema-first" buy you?']
  });

  T({
    id: '0B.3', mod: '0B', title: 'GraphQL', tag: 'The client asks for exactly what it needs',
    analogy: 'REST is a set menu — you get the whole plate even if you only wanted the fries. GraphQL is ordering à la carte from a single waiter.',
    points: [
      'One endpoint; the client sends a query describing the exact shape of data it wants.',
      'Fixes over-fetching (too many fields) and under-fetching (too many round trips) — valuable for mobile clients and many different front-ends.',
      'The N+1 problem: resolving a list then fetching each child separately. Fixed by batching (the DataLoader pattern).',
      'Costs: HTTP caching is harder (one URL, usually POST), and you must limit query depth/complexity to stop expensive queries.',
      'Federation: several teams each own a subgraph, composed into one graph behind a gateway.'
    ],
    pitfall: 'Adopting GraphQL for a simple CRUD API with one client. You pay the complexity without the benefit.',
    say: 'With several client apps needing different slices of the same data, GraphQL avoids a new endpoint per screen — I\'d add batching to avoid N+1 and a complexity limit.',
    cards: [
      ['What two problems does GraphQL solve compared with REST?', 'Over-fetching (receiving fields you do not need) and under-fetching (needing several round trips to assemble one screen).'],
      ['What is the N+1 problem in GraphQL and the standard fix?', 'One query for a list, then one more query per item to resolve a nested field. Fix: batch and cache those lookups per request (DataLoader pattern).'],
      ['Name two operational downsides of GraphQL.', 'HTTP/CDN caching is harder (single endpoint, POST), and arbitrary queries can be very expensive — you need depth/complexity limits.']
    ],
    quiz: [
      ['A mobile screen needs data from six REST resources. What does GraphQL offer?', ['One round trip returning exactly the fields needed', 'Faster database queries', 'Automatic CDN caching', 'Binary encoding'], 'It moves the composition to the server in one request. It does not make the underlying queries faster.'],
      ['A query for 100 posts triggers 101 database queries. What is this?', ['The N+1 problem', 'A cache stampede', 'A retry storm', 'Head-of-line blocking'], 'One query for the list plus one per item. Batch the child lookups.'],
      ['Why is caching harder with GraphQL than REST?', ['Every query hits the same URL, usually via POST', 'GraphQL responses cannot be stored', 'GraphQL forbids caching', 'Responses are always unique'], 'HTTP caches key on method and URL. With every query POSTed to one URL there is nothing to key on, so caching usually moves to the client or resolver layer — unless queries are sent as GET to get CDN caching back.']
    ],
    explain: ['Explain what GraphQL is, the problem it solves, and one new problem it creates.', ['Client specifies the shape of the response', 'Solves over-/under-fetching', 'N+1 and its fix (batching)', 'A cost: caching or query complexity']],
    duck: ['If GraphQL is so flexible, why would anyone still use REST?', 'Where does the N+1 problem actually come from?']
  });

  T({
    id: '0B.4', mod: '0B', title: 'WebSocket & SSE', tag: 'Real-time contracts',
    analogy: 'HTTP is sending letters and waiting for a reply. A WebSocket is an open phone call — either side can speak at any time. SSE is a radio broadcast: only the server talks.',
    points: [
      'WebSocket: starts as HTTP, upgrades to one long-lived, full-duplex TCP connection. Use for chat, collaboration, games.',
      'Server-Sent Events (SSE): one-way server → client over plain HTTP, with built-in reconnection and Last-Event-ID resume. Use for feeds, tickers, notifications.',
      'Connections are stateful: you need to know which server holds which user (a connection registry or pub/sub), and deploys must drain connections.',
      'Reconnection: clients back off with jitter and send the last message ID they saw; the server replays from there (so it must retain recent messages) and the client de-duplicates by ID. SSE sends Last-Event-ID for you; with WebSocket you build this yourself.',
      'Backpressure: a slow client must not grow an unbounded buffer. Bound it, then drop, coalesce or disconnect.'
    ],
    pitfall: 'Forgetting that a deploy or load balancer restart disconnects everyone at once — and they all reconnect at the same instant.',
    say: 'Chat needs server push in both directions, so WebSockets, with a pub/sub layer so any gateway can reach any user, and resume-from-last-ID on reconnect.',
    cards: [
      ['WebSocket vs SSE — the key difference and when to pick each?', 'WebSocket is bidirectional over an upgraded TCP connection (chat, games). SSE is server-to-client only over plain HTTP with automatic reconnect (feeds, tickers, notifications).'],
      ['How does a client avoid losing messages across a reconnect?', 'It remembers the last message/event ID it received and sends it on reconnect; the server replays everything after that ID.'],
      ['What is backpressure on a real-time connection and how do you handle it?', 'A consumer slower than the producer. Use a bounded per-connection buffer and, when full, drop or coalesce messages or disconnect the client.']
    ],
    quiz: [
      ['Live sports scores pushed to millions of browsers, no client messages needed. Simplest fit?', ['Server-Sent Events', 'WebSocket', 'gRPC unary calls', 'Polling every 100 ms'], 'One-way push over ordinary HTTP with reconnect built in.'],
      ['User A is connected to gateway 1 and user B to gateway 2. How does A\'s message reach B?', ['A pub/sub layer or connection registry routes it to gateway 2', 'The load balancer forwards it automatically', 'Gateway 1 broadcasts to every user', 'It cannot; they must share a server'], 'Connections are pinned to servers, so you need a routing layer between gateways.'],
      ['After a deploy, 500k clients reconnect at once and overload the gateways. The fix?', ['Exponential backoff with jitter on the client', 'Shorter client timeouts', 'Reconnect immediately but in a loop', 'Disable reconnection'], 'Jitter spreads the reconnects out in time instead of creating a synchronized spike.']
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
    cards: [
      ['Name four responsibilities of an API gateway.', 'Any four of: TLS termination, authentication/authorization, rate limiting, routing, request transformation, response aggregation, logging/metrics.'],
      ['What should NOT live in an API gateway and why?', 'Business logic. It couples every team to one deployable and turns the gateway into a bottleneck for change.'],
      ['What is the Backend-for-Frontend pattern?', 'A dedicated thin gateway per client type (web, mobile, partner) that tailors and aggregates responses for that client.']
    ],
    quiz: [
      ['Which belongs in an API gateway?', ['Validating the auth token and enforcing per-client rate limits', 'Calculating order totals and tax', 'Storing user profiles', 'Running nightly reports'], 'Cross-cutting concerns belong there; domain logic belongs in services.'],
      ['Why is a gateway a reliability risk?', ['Every request passes through it, so it is a single point of failure unless redundant', 'It stores all the data', 'It cannot be load balanced', 'It makes services stateful'], 'Run several stateless instances behind a load balancer.'],
      ['Mobile needs small payloads; web needs rich ones. Which pattern helps?', ['Backend-for-Frontend', 'Circuit breaker', 'Write-behind cache', 'Saga'], 'One tailored gateway per client type.']
    ],
    explain: ['Explain what an API gateway does and one way it can go wrong.', ['Single entry point for cross-cutting concerns', 'Lists concrete responsibilities (auth, rate limit, routing)', 'No business logic in the gateway', 'Must be redundant — on every request path']],
    duck: ['Why not let clients call each service directly?', 'What happens to the whole system if the gateway goes down?']
  });

  T({
    id: '0B.6', mod: '0B', title: 'Idempotency', tag: 'Safe to retry',
    analogy: 'A lift call button. Pressing it once or ten times has the same effect — the lift comes once. A vending machine button is the opposite.',
    points: [
      'An operation is idempotent if doing it many times has the same effect as doing it once. Networks time out, so clients will retry.',
      'Idempotency key: the client generates a unique ID per logical operation and sends it with every retry. The server stores key → result and replays the result for duplicates.',
      'Store the key in the same transaction as the side effect (or behind a unique constraint). Check-then-act in two steps is a race.',
      '"Exactly-once" effects are usually achieved with at-least-once delivery plus idempotent (or transactional) processing.',
      'Make updates naturally idempotent where you can: "set status = shipped" rather than "increment counter".'
    ],
    pitfall: 'Retrying a non-idempotent POST after a timeout. The first request may have succeeded — you just did not hear back.',
    say: 'Create-payment takes a client-supplied idempotency key, stored atomically with the payment row, so a retry returns the original result instead of charging twice.',
    cards: [
      ['Define idempotency.', 'An operation is idempotent if performing it multiple times has the same effect as performing it once.'],
      ['How does an idempotency key work?', 'The client creates a unique key per logical operation and resends it on retries. The server records key → result atomically with the side effect; a repeat with the same key returns the stored result without re-executing.'],
      ['How is "exactly-once" achieved in practice?', 'At-least-once delivery (retry until acknowledged) combined with idempotent processing, so duplicates have no additional effect.']
    ],
    quiz: [
      ['A client times out on POST /payments and retries. What prevents a double charge?', ['An idempotency key stored atomically with the payment', 'A longer client timeout', 'Using PUT instead of POST with a new ID each time', 'Rate limiting the client'], 'The server recognises the retry and returns the original outcome.'],
      ['Which update is naturally idempotent?', ['SET balance = 90 WHERE version = 3', 'SET balance = balance - 10', 'INSERT a new ledger row', 'Append an event to a log'], 'Setting an absolute value guarded by a version gives the same result however many times it runs.'],
      ['Why must the key and the side effect be written atomically?', ['Otherwise two concurrent retries can both pass the check and both execute', 'To make the request faster', 'Because keys expire', 'It is not necessary'], 'Check-then-act across two steps is a race. Use one transaction or a unique constraint.']
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
    cards: [
      ['What is the minimal starting diagram for most systems?', 'Client → load balancer → stateless application service → database. Evolve from there.'],
      ['What rule decides whether a component belongs in the diagram?', 'It must be justified by a requirement or a number — e.g. cache because of read latency, queue because work is slow or bursty.'],
      ['Why keep the application tier stateless?', 'Any instance can serve any request, so you scale by adding instances and survive instance failures without losing data.']
    ],
    quiz: [
      ['Best first diagram for almost any prompt?', ['Client → load balancer → stateless service → database', 'A full microservice mesh with Kafka', 'Whatever a big tech company uses', 'Just the database schema'], 'Start minimal, then evolve it with justifications. It also shows your reasoning.'],
      ['How do you verify a diagram is complete?', ['Trace every functional requirement through it as a request path', 'Count the boxes', 'Check it has a cache and a queue', 'Compare it to a blog post'], 'Each requirement should have a visible path from client to data and back.'],
      ['When is adding a message queue justified?', ['When work is slow, bursty, or does not need to finish before responding', 'Always — queues add scalability', 'Never in an interview', 'Whenever there is a database'], 'A queue decouples and buffers. Without that need it is just latency and complexity.']
    ],
    explain: ['Explain how you build up a high-level design diagram from nothing.', ['Start minimal: client, LB, stateless service, DB', 'Trace each requirement as a path', 'Add components only with a justification', 'Stateless services / labelled arrows']],
    duck: ['Why not draw the final, complete architecture straight away?', 'What does "stateless" mean and why do you keep saying it?'],
    lab: {
      type: 'diagram', brief: 'Read-heavy product catalogue: 100:1 reads to writes, product images served to users worldwide. Add the components you need, then tap two boxes to connect them.',
      required: ['client', 'cdn', 'lb', 'app', 'cache', 'db', 'blob'],
      edges: [['client', 'cdn'], ['client', 'lb'], ['lb', 'app'], ['app', 'cache'], ['app', 'db'], ['cdn', 'blob']],
      why: { cdn: 'Images are static and global — serve them from the edge.', cache: '100:1 reads: most reads should never reach the database.', blob: 'Images belong in object storage, not the database.', lb: 'Spreads traffic over stateless app servers.' },
      decoys: { queue: 'Nothing in this brief is slow or asynchronous — a queue is unjustified here.', ws: 'Nothing here is real-time.', search: 'Search was not asked for.' }
    }
  });

  T({
    id: '0C.2', mod: '0C', title: 'Data model', tag: 'Access patterns drive storage',
    analogy: 'Organising a kitchen. You do not shelve by colour — you put things where you will reach for them. How you will query the data decides how you store it.',
    points: [
      'List the entities and relationships, then list the queries. The queries — not the entities — pick the database.',
      'For each main query, name the key it uses. That key becomes your primary key, partition key or index.',
      'Relational is the sensible default when you need joins, transactions or flexible queries.',
      'Key-value / wide-column stores fit when access is by known key at very large scale and you can live with limited query patterns.',
      'Denormalise deliberately for read-heavy paths: duplicate data to avoid joins, and accept the cost of keeping copies in sync.'
    ],
    pitfall: 'Saying "NoSQL because it scales" without naming the access pattern that makes it fit — or the query you just made impossible.',
    say: 'The main query is "latest messages in a channel", so I\'ll key on channel ID and sort by time within it.',
    cards: [
      ['What should drive your choice of database?', 'The access patterns — which queries run, by which key, at what rate — more than the shape of the entities.'],
      ['When is a relational database the right default?', 'When you need joins, multi-row transactions, strong consistency or ad-hoc queries, and the scale fits on a primary with replicas.'],
      ['What is denormalisation and its cost?', 'Storing duplicated or precomputed data so reads avoid joins. The cost is more work on writes and the risk of copies drifting out of sync.']
    ],
    quiz: [
      ['What do you write down before choosing a database?', ['The main queries and the keys they use', 'The list of databases you know', 'The programming language', 'The number of microservices'], 'Access patterns determine keys, indexes and store type.'],
      ['Main query: "the 50 latest messages in channel X". Sensible key design?', ['Partition by channel ID, sort by timestamp', 'Partition by message ID', 'Partition by timestamp only', 'A single global table scan'], 'Messages for one channel sit together in time order, so the query reads one contiguous range.'],
      ['You need a transfer that debits one account and credits another atomically. Default choice?', ['A relational database with transactions', 'An eventually consistent key-value store', 'An object store', 'A cache'], 'Multi-row atomicity is exactly what relational transactions provide.']
    ],
    explain: ['Explain how you go from requirements to a data model and a storage choice.', ['Identify entities and relationships', 'List the queries / access patterns first', 'Keys and indexes follow from the queries', 'Justify SQL vs NoSQL from those patterns (or mention denormalisation)']],
    duck: ['Why not design the tables first and worry about queries later?', 'When would you NOT use a relational database?']
  });

  T({
    id: '0C.3', mod: '0C', title: 'Read path vs write path', tag: 'Optimise each separately',
    analogy: 'A supermarket has a loading dock at the back and tills at the front. Deliveries and shoppers have different needs, so they get different doors.',
    points: [
      'Reads and writes usually differ enormously in volume and latency needs. Draw them as two separate paths.',
      'Read-path tools: cache, read replicas, CDN, precomputed or denormalised views.',
      'Write-path tools: queues and batching, append-only logs, sharding, write-optimised (LSM) storage.',
      'The read:write ratio tells you where to spend. At 100:1, do extra work on each write to make reads trivial.',
      'Moving work from read time to write time (precomputation) is the single most common optimisation in feed-like systems.'
    ],
    pitfall: 'One arrow labelled "CRUD" between service and database. It hides the most important asymmetry in the system.',
    say: 'Reads outnumber writes about 100 to 1, so I\'ll pay more on the write path — precomputing timelines — to keep reads to a single cache lookup.',
    cards: [
      ['Name three read-path and three write-path optimisations.', 'Read: cache, read replicas, CDN, precomputed views. Write: queue/batching, append-only log, sharding, LSM-based storage.'],
      ['How does the read:write ratio guide design?', 'It shows where load is. Read-heavy → do more at write time (precompute, denormalise, cache). Write-heavy → make writes cheap (append, batch, shard) and accept costlier reads.'],
      ['What does "moving work from read time to write time" mean?', 'Precomputing the answer when data changes (e.g. building each user\'s timeline on post) so that reads become a cheap lookup.']
    ],
    quiz: [
      ['Read:write is 1000:1. Where do you invest?', ['Make reads cheap, even if writes get more expensive', 'Make writes cheap, even if reads get more expensive', 'Optimise both equally', 'Neither — add servers'], 'Spend effort where the volume is.'],
      ['An IoT system ingests 500k sensor writes/sec and is read occasionally. Good storage fit?', ['An append-oriented, LSM-based store', 'A heavily indexed relational table', 'A CDN', 'An in-memory cache only'], 'Write-heavy ingest favours sequential, append-style writes.'],
      ['Precomputing a home timeline when someone posts is an example of…', ['Trading write cost for read speed', 'Trading read cost for write speed', 'Vertical scaling', 'Sharding'], 'More work per write, so each read is a simple fetch.']
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
    cards: [
      ['How do you decide whether a step is sync or async?', 'Ask whether the caller needs the result to continue. If yes, sync. If it is slow, bursty or can happen later, async via a queue.'],
      ['What three things does making work asynchronous buy you?', 'Faster responses, absorption of traffic bursts, and isolation from failures in the slow dependency.'],
      ['What does async processing require of consumers?', 'Idempotency (messages may be delivered more than once), retry handling, and a dead-letter queue for messages that keep failing.']
    ],
    quiz: [
      ['A user uploads a video that takes 4 minutes to transcode. Best design?', ['Accept the upload, return immediately, transcode via a queue and notify when done', 'Hold the HTTP request open until transcoding finishes', 'Transcode in the browser', 'Reject videos that take too long'], 'Long work goes async; the response acknowledges receipt.'],
      ['Which step in checkout should stay synchronous?', ['Payment authorisation', 'Sending the confirmation email', 'Updating recommendation models', 'Generating the invoice PDF'], 'The user must know whether the payment worked before moving on.'],
      ['What is the main cost of going async?', ['Eventual consistency and harder debugging', 'Higher response latency', 'It cannot be scaled', 'It requires GraphQL'], 'The result is not there yet when you respond, and flows span multiple components and time.']
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
      'Prove it with numbers: "12k QPS of reads against a database that handles ~5k" is an argument; "the DB might be slow" is not.',
      'After you fix one bottleneck the next one appears. Name it.'
    ],
    pitfall: 'Scaling the part you know best rather than the part that is actually saturated.',
    say: 'At 12k read QPS the app tier is fine with eight servers, but a single database tops out around 5k — that\'s the bottleneck, so that\'s where I\'ll go deeper.',
    cards: [
      ['How do you find the bottleneck in a design?', 'Trace a request through each hop and compare load with capacity at each. The hop with the least headroom (highest utilisation) is the bottleneck.'],
      ['Why is the bottleneck usually the database?', 'Stateless tiers scale horizontally by adding instances. The stateful tier holds data that must stay consistent, so it cannot be cloned freely.'],
      ['What happens after you remove a bottleneck?', 'The next-weakest component becomes the bottleneck. Say what it is.']
    ],
    quiz: [
      ['Load is 8k QPS. App tier capacity 20k, cache 100k, database 6k. Where is the bottleneck?', ['The database', 'The app tier', 'The cache', 'There is none'], 'Only the database has less capacity than the load.'],
      ['You double the app servers but throughput does not improve. Most likely reason?', ['The bottleneck is downstream, so the app tier was never the limit', 'App servers do not scale horizontally', 'The load balancer is misconfigured', 'You need to triple them'], 'Adding capacity anywhere except the bottleneck changes nothing.'],
      ['Which claim is strongest in an interview?', ['"Writes are 3k/s and one primary handles about 1k, so we must partition"', '"Databases are slow, so we should shard"', '"Big companies shard, so we should"', '"Sharding is best practice"'], 'It is backed by a number tied to a capacity.']
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
      'Slow is worse than dead. A dead server fails fast; a slow one holds connections and drags its callers down with it.',
      'Blast radius: how much of the system does this failure take out? Shrink it with redundancy, isolation and timeouts.',
      'Remove single points of failure with replication and failover. State how failover is triggered and how long it takes.',
      'Degrade gracefully: serve stale cache, hide a feature, queue the write — a partial answer usually beats an error.',
      'RTO = how long until you are back. RPO = how much recent data you may lose.'
    ],
    pitfall: 'Only considering crashes. Slowness, partial failure and overload are the failures that actually cause cascades.',
    say: 'If the recommendation service is slow, the timeout fires at 200 ms and we fall back to a cached popular list — the page still renders.',
    cards: [
      ['Why is a slow dependency often worse than a dead one?', 'A dead one fails fast. A slow one ties up the caller\'s threads/connections until timeout, exhausting capacity upstream and cascading.'],
      ['Define blast radius, RTO and RPO.', 'Blast radius: how much of the system a failure affects. RTO: target time to recover. RPO: maximum acceptable window of data loss.'],
      ['What is graceful degradation? Give an example.', 'Serving a reduced but useful response when a dependency fails — e.g. stale cached results, or hiding recommendations while the page still loads.']
    ],
    quiz: [
      ['A downstream service starts taking 30 s to answer. With no timeouts, what happens upstream?', ['Callers\' threads fill with waiting requests and they fail too', 'Nothing; requests just complete later', 'The load balancer removes the slow service automatically', 'Latency improves'], 'Held slots are capacity lost. That is how one slow service takes down its callers.'],
      ['RPO of 5 minutes means…', ['You may lose up to 5 minutes of recent data after a failure', 'Recovery must finish within 5 minutes', 'Backups run for 5 minutes', 'Replication lag is always 5 minutes'], 'RPO is about data loss; RTO is about recovery time.'],
      ['The reviews service is down. Best behaviour for the product page?', ['Render the page without reviews', 'Return a 500 for the whole page', 'Retry reviews until it works', 'Redirect to the home page'], 'Graceful degradation: the core function survives the loss of a non-critical dependency.']
    ],
    explain: ['Explain how you analyse failure modes in a design and limit their damage.', ['Ask dead / slow / wrong for each component', 'Slow is worse than dead, and why', 'Blast radius and single points of failure', 'Mitigation: redundancy, timeouts, graceful degradation (or RTO/RPO)']],
    duck: ['Why would a slow server be worse than one that is completely off?', 'What does "degrade gracefully" look like to a real user?']
  });

  T({
    id: '0D.3', mod: '0D', title: 'Scaling the bottleneck', tag: 'The right tool for the constraint',
    analogy: 'A toolbox. A hammer is excellent, but not for screws — first identify the fastener.',
    points: [
      'Vertical (bigger machine): simplest, no code change, but there is a ceiling and it is still one machine.',
      'Horizontal (more machines): effectively unlimited for stateless tiers; needs partitioning for stateful ones.',
      'Caching: for repeated reads of the same data. Useless for unique or write-heavy workloads.',
      'Read replicas: for read-heavy workloads that tolerate slight staleness. They do nothing for writes.',
      'Sharding: when writes or data size exceed one machine. Powerful and expensive — cross-shard queries and rebalancing hurt.',
      'Async/queues: when the problem is burstiness or slow work rather than sustained volume.'
    ],
    pitfall: 'Reaching for sharding first. It is the last resort; cheaper tools usually buy years.',
    say: 'The constraint is repeated reads of hot items, so a cache is the right tool; sharding would add complexity without touching that problem.',
    cards: [
      ['Which scaling tool fits each: repeated reads, read-heavy with full queries, write volume too high, bursty slow jobs?', 'Repeated reads → cache. Read-heavy queries → read replicas. Write volume or data size → sharding. Bursty/slow work → queue + workers.'],
      ['Why is sharding a last resort?', 'It complicates everything: cross-shard queries and transactions, rebalancing, hot keys, operations. Try indexes, caching, replicas and vertical scaling first.'],
      ['What can read replicas not help with?', 'Write throughput — every write still goes to the primary (and is replayed on every replica).']
    ],
    quiz: [
      ['Write volume exceeds what a single primary can handle. Which tool addresses it?', ['Sharding', 'Read replicas', 'A CDN', 'More app servers'], 'Only partitioning spreads writes across machines.'],
      ['Traffic arrives in spikes of image-processing jobs, with quiet periods between. Best fit?', ['A queue with worker pool', 'A bigger database', 'Read replicas', 'Sharding'], 'A queue absorbs the burst; workers drain it at their own pace.'],
      ['Every request asks for a different, never-repeated item. Will a cache help?', ['No — there are no repeated reads to hit', 'Yes — caches always help', 'Yes, if it is big enough', 'Only with write-through'], 'A cache only pays off when the same data is requested again.']
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
      'The choice only bites during a network partition. When the network is healthy you can have both.',
      'Choose consistency when a wrong answer costs more than no answer: money, inventory, locks, unique names.',
      'Choose availability when a stale answer is acceptable: feeds, likes, carts, presence, DNS.',
      'It is a per-operation decision, not a per-system one. A shop can be AP for browsing and CP for checkout.',
      'Eventual consistency needs a story for conflicts: last-write-wins, merge, or ask the user.'
    ],
    pitfall: 'Declaring "this is an AP system" for a product that takes payments. Decide per operation.',
    say: 'For the like count I\'ll take availability — a stale count is harmless. For the seat reservation I need consistency, even if it means rejecting requests during a partition.',
    cards: [
      ['When does the consistency vs availability choice actually apply?', 'During a network partition. Without a partition a system can be both consistent and available.'],
      ['Give two operations that should favour consistency and two that should favour availability.', 'Consistency: payments/ledger, seat or inventory reservation, distributed locks. Availability: social feed, like counts, shopping cart, presence.'],
      ['Why is CP vs AP a per-operation decision?', 'Different operations in one product have different costs for being wrong vs being unavailable — browsing can be stale, checkout cannot.']
    ],
    quiz: [
      ['During a partition, a seat-booking system should…', ['Reject bookings it cannot confirm rather than risk double-booking', 'Accept all bookings and sort it out later', 'Pick a random replica', 'Disable the partition'], 'A double-booked seat is worse than a failed request.'],
      ['Which operation tolerates eventual consistency best?', ['Displaying a post\'s like count', 'Debiting a bank account', 'Acquiring a distributed lock', 'Reserving the last item in stock'], 'A slightly stale like count harms no one.'],
      ['When the network is healthy, can a system be both consistent and available?', ['Yes — the trade-off is only forced during a partition', 'No — you must always pick one', 'Only with a cache', 'Only on a single machine'], 'CAP constrains behaviour under partition.']
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
      'Use percentiles, not averages. Three pillars for debugging: metrics, logs, traces.'
    ],
    pitfall: 'Paging on CPU at 80%. It wakes people for non-problems and misses real outages where CPU is fine.',
    say: 'I\'d define an SLO of 99.9% of requests under 300 ms, alert on error-budget burn rate, and keep CPU and queue depth on dashboards for diagnosis.',
    cards: [
      ['What are the four golden signals?', 'Latency, traffic, errors and saturation.'],
      ['SLI vs SLO vs error budget?', 'SLI: the measured indicator (e.g. % of requests under 300 ms). SLO: the target for it (e.g. 99.9%). Error budget: the allowed shortfall (0.1%) you can spend on risk.'],
      ['Why alert on symptoms rather than causes?', 'Symptoms (errors, latency) mean users are hurt and someone must act. Causes (CPU, memory) often fire with no user impact and miss failures that have other causes.']
    ],
    quiz: [
      ['Which should page a human at 3 a.m.?', ['Checkout error rate is burning the error budget 14× too fast', 'CPU on one node is at 85%', 'One of twelve replicas restarted', 'GC pauses rose 20%'], 'It is a user-facing symptom that needs action. The rest are diagnostic.'],
      ['RED stands for…', ['Rate, Errors, Duration', 'Requests, Events, Disk', 'Resources, Errors, Delay', 'Replication, Eviction, Durability'], 'The standard trio for request-driven services.'],
      ['Mean latency is 80 ms but users complain. What do you check first?', ['Tail percentiles such as p99', 'The mean over a longer window', 'CPU average', 'Total request count'], 'Averages hide the slow tail that users actually feel.']
    ],
    explain: ['Explain how you would monitor a service and decide what to alert on.', ['Golden signals or RED/USE', 'SLI / SLO / error budget', 'Alert on symptoms, dashboards for causes', 'Percentiles over averages (or metrics/logs/traces)']],
    duck: ['Why not alert on everything, just to be safe?', 'What is an error budget actually for?'],
    lab: {
      type: 'sort', brief: 'Page someone, or put it on a dashboard?', buckets: ['Page a human (symptom)', 'Dashboard / ticket (cause)'],
      items: [['p99 checkout latency above SLO for 10 minutes', 0], ['Error budget burning 14× too fast', 0], ['CPU at 85% on one node', 1], ['One of twelve replicas restarted', 1], ['Login success rate dropped to 80%', 0], ['GC pause time up 20%', 1], ['Queue depth rising, latency still within SLO', 1]]
    }
  });

  T({
    id: '0D.6', mod: '0D', title: 'Cost optimisation', tag: 'Where the money goes',
    analogy: 'A household budget. You do not save money by cutting coffee if rent is 70% of spending — find the big line first.',
    points: [
      'Find the dominant cost line first: compute, storage, or network egress. It differs by system (video → egress; ML → GPUs; logs → storage).',
      'Commit (reserved capacity) for the steady baseline; autoscale on-demand for the peaks.',
      'Spot/preemptible instances are much cheaper but can be reclaimed at short notice — use them for stateless, batch, or checkpointed work.',
      'Tier storage by access: hot (SSD), warm, cold (archive). Most data is rarely read after a few weeks.',
      'Caching and right-sizing cut compute; keeping traffic inside one zone/region and using a CDN cuts egress.'
    ],
    pitfall: 'Optimising a small cost line while ignoring the dominant one — or forgetting egress entirely.',
    say: 'For a video service the bill is dominated by egress, so the levers are CDN contracts and encoding efficiency rather than app-server count.',
    cards: [
      ['What are the three main cloud cost lines, and what should you do first?', 'Compute, storage and network egress. First find which one dominates for this system.'],
      ['When are spot/preemptible instances appropriate?', 'For interruptible work: stateless services with spare capacity, batch jobs, and training with checkpoints. Not for a single stateful primary.'],
      ['What is storage tiering?', 'Moving data to cheaper, slower storage as it is accessed less: hot → warm → cold/archive, usually by lifecycle policy.']
    ],
    quiz: [
      ['Where should a nightly, restartable batch job run to minimise cost?', ['Spot / preemptible instances', 'Reserved instances sized for peak', 'The primary database host', 'On-demand GPU instances'], 'It tolerates interruption, so it can take the large spot discount.'],
      ['A video streaming service\'s largest cost is most likely…', ['Network egress / CDN', 'API server compute', 'The metadata database', 'Logging'], 'Delivering large media dominates everything else.'],
      ['Best purchasing mix for a steady baseline with daily peaks?', ['Commit for the baseline, autoscale on-demand for peaks', 'On-demand for everything', 'Commit for peak capacity', 'Spot for everything, including the database'], 'Committing to the floor is cheapest; elasticity covers the rest.']
    ],
    explain: ['Explain how you would reason about and reduce the cost of a system.', ['Find the dominant cost line first', 'Reserved for baseline, on-demand/autoscale for peaks', 'Spot for interruptible work', 'Storage tiering or egress reduction']],
    duck: ['Why not just run everything on the cheapest instances?', 'What is "egress" and why does it matter so much?']
  });

})(SD.T);
