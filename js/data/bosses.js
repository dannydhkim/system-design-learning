// Boss fights: full mock interviews that walk the Module 0 framework end to end.
// Each phase reuses a lab engine and is scored 0..1, then weighted.
SD.bosses = [
  {
    id: 'tinylink', title: 'TinyLink', sub: 'Design a URL shortener', level: 'Warm-up', icon: '🔗',
    brief: 'Users paste a long URL and get a short one. Anyone visiting the short URL is redirected.',
    phases: [
      { name: 'Requirements', w: 15, lab: { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['What scale — new links per day and redirects per day?', true, 'Gives you the read:write ratio and sizes everything.'],
        ['Do links expire, and can users choose custom aliases?', true, 'Changes the data model and code generation.'],
        ['Is click analytics in scope?', true, 'Decides 301 vs 302 and whether you need an async pipeline.'],
        ['What latency and availability do redirects need?', true, 'The redirect is the hot path; its targets drive caching.'],
        ['Should we use Postgres or DynamoDB?', false, 'Your call, made from the requirements.'],
        ['Which language will the team use?', false, 'Does not change the architecture.'],
        ['Can I use Kubernetes?', false, 'Deployment tooling is irrelevant here.'],
        ['Should it be microservices?', false, 'A solution looking for a problem.']
      ] } },
      { name: 'Estimation', w: 15, lab: { type: 'estimate', brief: 'Given: 100M new links per month · 100:1 read:write · 500 bytes per record · kept 5 years.', fixed: [
        { q: 'Average writes per second?', a: 38.6, unit: 'writes/s', tol: 0.3, how: '100M ÷ (30 × 86,400 s) ≈ 39 per second.' },
        { q: 'Average redirects per second?', a: 3860, unit: 'reads/s', tol: 0.3, how: '100 × the write rate ≈ 3,900 per second.' },
        { q: 'Storage for 5 years, in TB?', a: 3, unit: 'TB', tol: 0.25, how: '100M × 12 × 5 = 6 billion records × 500 B = 3 TB. Fits on one machine — storage is not the hard part.' },
        { q: 'Minimum base-62 code length to cover 6 billion links?', a: 6, unit: 'characters', tol: 0, how: '62⁵ ≈ 0.9 billion (too few); 62⁶ ≈ 57 billion (enough).' }
      ] } },
      { name: 'API', w: 15, lab: { type: 'api', brief: 'Define the endpoints.',
        paths: ['/v1/links', '/v1/links/{code}', '/{code}', '/v1/createLink', '/v1/links/delete?code=…'],
        tasks: [
          { need: 'Create a short link', method: 'POST', path: '/v1/links', status: '201', note: 'POST to the collection; 201 Created.' },
          { need: 'Browser follows a short link', method: 'GET', path: '/{code}', status: '302', note: '302 keeps clicks visible for analytics; 301 would be cached by browsers.' },
          { need: 'Delete a link', method: 'DELETE', path: '/v1/links/{code}', status: '204', note: 'Idempotent delete, nothing to return.' }
        ] } },
      { name: 'High-level design', w: 25, lab: { type: 'diagram', brief: 'Draw the design for create + redirect at ~4k redirects/s.',
        required: ['client', 'lb', 'app', 'cache', 'db', 'idgen'],
        edges: [['client', 'lb'], ['lb', 'app'], ['app', 'cache'], ['app', 'db'], ['app', 'idgen']],
        why: { cache: 'Read-heavy and the mapping never changes — ideal for caching.', idgen: 'Unique codes without collisions: a counter/ID service whose output is base-62 encoded.', lb: 'Spreads load across stateless app servers.' },
        decoys: { queue: 'Create and redirect are simple synchronous lookups. A queue is only justified if analytics is in scope.', ws: 'Nothing here is real-time.', search: 'Nobody asked to search links.' } } },
      { name: 'Deep dive', w: 15, lab: { type: 'quiz', qs: [
        ['Analytics is in scope. 301 or 302 for the redirect?', ['302 — browsers do not cache it, so every click reaches us', '301 — it is permanent, so it is more correct', 'Either; they behave identically', '200 with a JavaScript redirect'], '301 is cached by browsers: less load, but later clicks never reach your servers.'],
        ['Two servers must never issue the same short code. Most robust approach?', ['Hand each server a disjoint range from a counter and base-62 encode it', 'Hash the URL and hope there are no collisions', 'Check whether the code exists, then insert', 'Use longer codes'], 'Disjoint ranges are collision-free by construction. Check-then-insert is a race without a unique constraint.'],
        ['One link goes viral: 50k requests/s for a single code. What absorbs it?', ['The cache — the mapping is immutable, so it can be cached aggressively', 'Sharding the database by code', 'A message queue', 'More ID generators'], 'A hot key is served from memory (or the edge); the database never sees it.']
      ] } },
      { name: 'Teach it back', w: 15, lab: { type: 'teach', prompt: 'Explain end to end what happens when someone clicks a short link, and where the first bottleneck appears at 10× traffic.', rubric: ['Path: load balancer → app → cache → database on a miss → 302 with Location', 'Read-heavy, so cache hit ratio is the main lever', 'The mapping is immutable, so long TTLs are safe', 'First bottleneck: database reads on misses / cold cache → replicas', 'How unique codes are generated'] } }
    ]
  },
  {
    id: 'chirp', title: 'Chirp', sub: 'Design a social home timeline', level: 'Core', icon: '🐦',
    brief: 'Users post short messages, follow other users, and see a home timeline of posts from the people they follow.',
    phases: [
      { name: 'Requirements', w: 15, lab: { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['Is the home timeline chronological or ranked?', true, 'Ranking adds a whole scoring stage.'],
        ['How many daily users and posts, and how skewed are follower counts?', true, 'Celebrities decide the fan-out strategy.'],
        ['How fresh must the timeline be — are a few seconds of delay fine?', true, 'Tolerance for staleness permits async fan-out.'],
        ['Are post, follow and home timeline the core, with search and DMs out of scope?', true, 'Scoping to three flows makes the problem tractable.'],
        ['Kafka or RabbitMQ?', false, 'Your decision, later.'],
        ['One microservice per feature?', false, 'Not a requirement.'],
        ['Can we use Redis?', false, 'A solution, not a requirement.'],
        ['How many engineers are on the team?', false, 'Does not change the design at this level.']
      ] } },
      { name: 'Estimation', w: 15, lab: { type: 'estimate', brief: 'Given: 200M daily users · each opens the timeline 5× a day · 100M posts a day · average 200 followers.', fixed: [
        { q: 'Timeline reads per second (average)?', a: 11574, unit: 'reads/s', tol: 0.3, how: '200M × 5 = 1 billion a day ÷ 86,400 ≈ 11,600.' },
        { q: 'Posts per second (average)?', a: 1157, unit: 'posts/s', tol: 0.3, how: '100M ÷ 86,400 ≈ 1,160.' },
        { q: 'If every post is pushed to every follower, timeline inserts per second?', a: 231481, unit: 'inserts/s', tol: 0.3, how: '≈ 1,160 posts/s × 200 followers ≈ 230,000 inserts/s. The write path is the heavy one.' },
        { q: 'A celebrity with 100M followers posts. At 100k inserts/s, how many seconds to fan out?', a: 1000, unit: 'seconds', tol: 0.1, how: '100M ÷ 100k = 1,000 s ≈ 17 minutes — for a single post. This is the celebrity problem.' }
      ] } },
      { name: 'API', w: 15, lab: { type: 'api', brief: 'Define the endpoints.',
        paths: ['/v1/posts', '/v1/timeline?cursor=…&limit=20', '/v1/me/following/{userId}', '/v1/createPost', '/v1/timeline?page=3', '/v1/follow?user={userId}'],
        tasks: [
          { need: 'Publish a post', method: 'POST', path: '/v1/posts', status: '201', note: 'Creates a resource.' },
          { need: 'Read my home timeline, paged', method: 'GET', path: '/v1/timeline?cursor=…&limit=20', status: '200', note: 'Cursor pagination: new posts arrive constantly, so offsets would shift.' },
          { need: 'Follow a user (safe to retry)', method: 'PUT', path: '/v1/me/following/{userId}', status: '204', note: 'PUT makes "follow" idempotent — following twice is the same as once.' },
          { need: 'Unfollow a user', method: 'DELETE', path: '/v1/me/following/{userId}', status: '204', note: 'Removes the relationship; idempotent.' }
        ] } },
      { name: 'High-level design', w: 25, lab: { type: 'diagram', brief: 'Draw post + home timeline with fan-out on write. The timeline is precomputed into a cache.',
        labels: { app: 'API service', db: 'Post store', worker: 'Fan-out workers', cache: 'Timeline cache' },
        required: ['client', 'lb', 'app', 'db', 'queue', 'worker', 'cache'],
        edges: [['client', 'lb'], ['lb', 'app'], ['app', 'db'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'cache'], ['app', 'cache']],
        why: { queue: 'Fan-out is slow and bursty — acknowledge the post, then fan out asynchronously.', worker: 'Workers read the follower list and write the post into each follower\'s timeline.', cache: 'Each user\'s timeline is precomputed, so a read is one lookup.', db: 'The post store is the source of truth; the timeline cache is derived from it.' },
        decoys: { blob: 'Media was not in the core scope.', search: 'Search was parked as out of scope.', idgen: 'Useful in practice, but not the point of this design.' } } },
      { name: 'Deep dive', w: 15, lab: { type: 'quiz', qs: [
        ['How do you handle an account with 100M followers?', ['Hybrid: do not fan out their posts; fetch them at read time and merge', 'Fan out anyway with more workers', 'Limit accounts to 10k followers', 'Shard the celebrity across databases'], 'Push for ordinary accounts, pull for the few huge ones. One merge at read time is far cheaper than 100M writes.'],
        ['Why does fan-out on write suit this system at all?', ['Reads vastly outnumber writes, so precomputing makes the common operation cheap', 'Writes are more frequent than reads', 'It uses less storage', 'It is simpler to build'], 'You pay once per post so that billions of reads are a cache fetch.'],
        ['A timeline cache node dies and its timelines are lost. What now?', ['Rebuild on demand from the follow graph and the post store', 'The data is gone for good', 'Restore from last week\'s backup', 'Ask users to re-follow'], 'The cache is derived data. The source of truth is intact.'],
        ['Most accounts have not logged in for months. Fan-out optimisation?', ['Skip inactive users and build their timeline when they return', 'Fan out to everyone for consistency', 'Delete inactive users', 'Fan out twice to be sure'], 'No point precomputing timelines nobody reads.']
      ] } },
      { name: 'Teach it back', w: 15, lab: { type: 'teach', prompt: 'Explain fan-out on write versus fan-out on read, and why a system like this ends up with a hybrid.', rubric: ['On write: build each follower\'s timeline when a post is made — cheap reads, expensive writes', 'On read: merge followees\' posts at request time — cheap writes, expensive reads', 'The choice depends on read:write ratio and follower distribution', 'Celebrities make fan-out on write explode → pull and merge for them', 'The timeline cache is derived and rebuildable'] } }
    ]
  },
  {
    id: 'ledgerpay', title: 'LedgerPay', sub: 'Design a payment system', level: 'Hard', icon: '💳',
    brief: 'Merchants charge customers through your API. You call an external card processor, record every movement of money, and must never charge anyone twice.',
    phases: [
      { name: 'Requirements', w: 15, lab: { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['Is a double charge ever acceptable, or is exactly-once a hard requirement?', true, 'Correctness is the defining non-functional requirement here.'],
        ['How slow and unreliable is the external processor we depend on?', true, 'Its timeouts and failures drive the whole state machine.'],
        ['What is the peak volume of payments per second?', true, 'It turns out to be modest — which tells you where NOT to spend effort.'],
        ['Do we need an auditable ledger and reconciliation against the processor?', true, 'Shapes the data model: append-only, double-entry.'],
        ['Should the ledger be in MongoDB?', false, 'A solution, not a requirement.'],
        ['Can we cache payment results in a CDN?', false, 'A solution — and a bad one for this data.'],
        ['Should we use GraphQL?', false, 'Not a requirement.'],
        ['How many microservices should there be?', false, 'Not a requirement.']
      ] } },
      { name: 'Estimation', w: 10, lab: { type: 'estimate', brief: 'Given: 10M payments a day · peak is 5× average · each payment writes 2 ledger entries of 250 bytes · kept 7 years.', fixed: [
        { q: 'Average payments per second?', a: 116, unit: 'payments/s', tol: 0.3, how: '10M ÷ 86,400 ≈ 116.' },
        { q: 'Peak payments per second?', a: 579, unit: 'payments/s', tol: 0.3, how: '≈ 116 × 5 ≈ 580. One well-run relational primary can take this — throughput is not the hard part.' },
        { q: 'Ledger storage over 7 years, in TB?', a: 12.8, unit: 'TB', tol: 0.3, how: '10M × 2 × 250 B = 5 GB a day × 365 × 7 ≈ 12.8 TB.' }
      ] } },
      { name: 'API', w: 15, lab: { type: 'api', brief: 'Define the endpoints.',
        paths: ['/v1/payments', '/v1/payments/{id}', '/v1/payments/{id}/refunds', '/v1/webhooks/processor', '/v1/pay?amount=…', '/v1/refundPayment'],
        tasks: [
          { need: 'Create a payment', method: 'POST', path: '/v1/payments', status: '201', note: 'Sent with an Idempotency-Key header so retries are safe.' },
          { need: 'Check a payment\'s status', method: 'GET', path: '/v1/payments/{id}', status: '200', note: 'Clients poll this when the outcome was pending.' },
          { need: 'Refund a payment', method: 'POST', path: '/v1/payments/{id}/refunds', status: '201', note: 'A refund is a new resource under the payment, not an edit of it.' },
          { need: 'Processor reports an async result', method: 'POST', path: '/v1/webhooks/processor', status: '200', note: 'Acknowledge quickly with 200; process the event idempotently.' }
        ] } },
      { name: 'High-level design', w: 25, lab: { type: 'diagram', brief: 'Draw the payment flow, including the external processor and the path that resolves uncertain outcomes.',
        labels: { app: 'Payment service', db: 'Payments DB + idempotency keys', worker: 'Reconciliation worker', gateway: 'API gateway' },
        required: ['client', 'gateway', 'app', 'db', 'ledger', 'psp', 'queue', 'worker'],
        edges: [['client', 'gateway'], ['gateway', 'app'], ['app', 'db'], ['app', 'psp'], ['app', 'ledger'], ['app', 'queue'], ['queue', 'worker']],
        why: { ledger: 'An append-only, double-entry record of every movement of money.', psp: 'The external processor is a slow, unreliable dependency — draw it so you can discuss its failures.', queue: 'Uncertain or follow-up work is queued rather than done inside the request.', worker: 'Resolves "unknown" payments by asking the processor and reconciling.', gateway: 'Authentication and rate limiting for merchant API keys.' },
        decoys: { cache: 'Caching payment state invites stale decisions, and ~600 writes/s does not need it.', cdn: 'There is no static content in this flow.' } } },
      { name: 'Deep dive', w: 20, lab: { type: 'quiz', qs: [
        ['The client times out on create-payment and retries. What prevents a double charge?', ['The idempotency key was stored in the same transaction as the payment, so the retry returns the original result', 'The retry is rejected with a 500', 'A longer timeout', 'Rate limiting'], 'Atomic storage of key and outcome is what makes the retry a no-op.'],
        ['Your call to the processor times out. Was the card charged?', ['Unknown — mark the payment pending and resolve it by querying the processor or waiting for its webhook', 'No — a timeout means failure, so retry immediately', 'Yes — a timeout means success', 'Refund it to be safe'], 'A timeout tells you nothing about the outcome. Model "unknown" explicitly and reconcile.'],
        ['During a network partition between your database replicas, the payment service should…', ['Refuse payments it cannot record consistently', 'Accept payments on both sides and merge later', 'Serve from cache', 'Pick a replica at random'], 'For money, a wrong answer costs more than no answer: choose consistency.'],
        ['A ledger entry was wrong. How do you fix it?', ['Append a compensating entry; never edit or delete', 'Update the row in place', 'Delete it and re-insert', 'Restore from backup'], 'An append-only ledger keeps a complete audit trail.']
      ] } },
      { name: 'Teach it back', w: 15, lab: { type: 'teach', prompt: 'Explain how you guarantee a customer is never charged twice, even with retries, timeouts and crashes.', rubric: ['The client generates one idempotency key per logical payment', 'Key and result are stored atomically (same transaction / unique constraint)', 'A retry returns the stored result instead of re-executing', 'The same key is passed to the processor, and unknown outcomes are reconciled', 'At-least-once delivery + idempotent handling = effectively once'] } }
    ]
  }
];
