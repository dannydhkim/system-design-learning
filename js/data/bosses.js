// Boss fights: full mock interviews that walk the Module 0 framework end to end.
// Each phase reuses a lab engine and is scored 0..1, then weighted.
SD.bosses = [
  {
    id: 'tinylink', title: 'TinyLink', sub: 'Design a URL shortener', level: 'Warm-up', icon: '🔗',
    brief: 'Users paste a long URL and get a short one. Anyone visiting the short URL is redirected.',
    refs: [
      ['rfc9110', '301 vs 302 for analytics — “A 301 response is heuristically cacheable; i.e., unless otherwise indicated by the method definition or explicit cache controls”'],
      ['rfc9110', '302 keeps clients coming back — “Since the redirection might be altered on occasion, the client ought to continue to use the target URI for future requests.”'],
      ['flickr-ticket-servers', 'Central ticket servers for unique IDs — “We divide responsibility between the two boxes by dividing the ID space down the middle, evens and odds”'],
      ['vitess-sequences', 'Handing out ID blocks — “To improve performance we also support block allocation of IDs: each update to the MySQL table is only done every N IDs (N being configurable)”'],
      ['hi-bitly', 'A worked answer to this prompt, with what is expected at each level']
    ],
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
          { need: 'Browser follows a short link', method: 'GET', path: '/{code}', status: '302', note: '302 is not cached by default, so clicks stay visible for analytics; a 301 is cacheable by default.' },
          { need: 'Delete a link', method: 'DELETE', path: '/v1/links/{code}', status: '204', note: 'Idempotent delete, nothing to return.' }
        ] } },
      { name: 'High-level design', w: 25, lab: { type: 'diagram', brief: 'Draw the design for create + redirect at ~4k redirects/s.',
        required: ['client', 'lb', 'app', 'cache', 'db', 'idgen'],
        edges: [['client', 'lb'], ['lb', 'app'], ['app', 'cache'], ['app', 'db'], ['app', 'idgen']],
        why: { cache: 'Read-heavy, and a code\'s target never changes once created — ideal for caching. Deletion or expiry needs an explicit cache delete, or a TTL no longer than the link\'s lifetime.', idgen: 'Unique codes without collisions: a counter/ID service whose output is base-62 encoded.', lb: 'Spreads load across stateless app servers.' },
        decoys: { queue: 'Create and redirect are simple synchronous lookups. A queue is only justified if analytics is in scope.', ws: 'Nothing here is real-time.', search: 'Nobody asked to search links.' },
        sim: {
          load: '3,900 redirects a second and 39 new links a second: the averages you estimated in phase 2.',
          goals: { errors: 1, p99: 200 },
          flows: [
            { label: 'Redirects', rps: 3900, aside: ['cache', 'db'], needs: ['db'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'cache'], ['app', 'db']] },
            { label: 'New links', rps: 39, needs: ['idgen', 'db'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'idgen'], ['app', 'db']] }
          ],
          parts: {
            app: { cfg: { instances: 6, capacity: 16, serviceMs: 4, serviceCv: 0.5, queueLimit: 64 }, solo: { instances: 1 }, soloWhy: 'Nothing spreads the traffic, so clients can only reach one server however many you run.' },
            cache: { cfg: { capacity: 64, serviceMs: 1, hitRate: 0.9, queueLimit: 512 } },
            db: { cfg: { capacity: 16, serviceMs: 20, serviceCv: 0.7, queueLimit: 64, lockMs: 0 }, fullWhy: 'It can do about 800 lookups a second (16 at once, 20 ms each). Something has to answer most redirects before they get this far.' },
            idgen: { cfg: { capacity: 8, serviceMs: 1, queueLimit: 64 } }
          },
          needWhy: { db: 'The database is the only place a code\'s target is stored for good.', idgen: 'Without it two servers can hand out the same code.' },
          bad: { 'client>db': 'Clients never talk to the database directly: there is nothing to check who they are or what they may do.', 'client>cache': 'Clients never talk to the cache directly.', 'lb>db': 'A load balancer forwards requests to servers. It does not query a database.', 'lb>cache': 'A load balancer forwards requests to servers. It does not read a cache.' },
          ok: [['cache', 'db']],
          traps: [
            { name: 'no cache', drop: ['cache'] },
            { name: 'no load balancer', drop: ['lb'], wire: [['client', 'app']] },
            { name: 'cache drawn but the app never reads the database', cut: [['app', 'db']] },
            { name: 'no ID generator', drop: ['idgen'] }
          ]
        } } },
      { name: 'Deep dive', w: 15, lab: { type: 'quiz', qs: [
        ['Analytics is in scope. 301 or 302 for the redirect?', ['302 — not cached by default, so every click reaches us', '301 — the mapping is permanent, so it is the more correct choice', 'Either — browsers and crawlers treat the two codes identically', '200 with a JavaScript redirect in the page body'], 'A 301 is cacheable by default, so browsers may never ask again: less load, but later clicks are invisible. A 302 is only cached if you send explicit cache headers.', ['rfc9110']],
        ['Two servers must never issue the same short code. Most robust approach?', ['Hand each server a disjoint range from a counter and base-62 encode it', 'Hash the URL and truncate the result, accepting that collisions will be rare', 'Check whether the code exists, then insert it', 'Use longer random codes with no uniqueness check'], 'Disjoint ranges are collision-free by construction. Check-then-insert is a race without a unique constraint. Counter-based codes are sequential, though, which reveals your volume.', ['flickr-ticket-servers', 'vitess-sequences']],
        ['One link goes viral: 50k requests/s for a single code. What absorbs it?', ['The cache — a code\'s target never changes, so cache it aggressively', 'Sharding the database by short code, so that the hot key is spread across shards', 'A message queue in front of the redirect service, to smooth out the burst', 'More ID generators, so codes are issued faster'], 'A hot key is served from memory; the database never sees it. Cache it at the edge only if the CDN\'s logs feed your analytics — otherwise those clicks vanish, which is why the redirect is a 302.', ['hi-bitly', 'aws-bl-caching']]
      ] } },
      { name: 'Teach it back', w: 15, lab: { type: 'teach', prompt: 'Explain end to end what happens when someone clicks a short link, and where the first bottleneck appears at 10× traffic.', rubric: ['Path: load balancer → app → cache → database on a miss → 302 with Location', 'Read-heavy, so cache hit ratio is the main lever', 'A code\'s target never changes, so long TTLs are safe (invalidate on delete or expiry)', 'First bottleneck: database reads on misses / cold cache → replicas', 'How unique codes are generated'] } }
    ]
  },
  {
    id: 'chirp', title: 'Chirp', sub: 'Design a social home timeline', level: 'Core', icon: '🐦',
    brief: 'Users post short messages, follow other users, and see a home timeline of posts from the people they follow.',
    refs: [
      ['highscalability-twitter-timelines', 'Twitter\'s numbers, 2012–13 (High Scalability\'s summary of the talk) — “300K QPS are spent reading timelines and only 6000 requests per second are spent on writes”'],
      ['highscalability-twitter-timelines', 'Hybrid for the largest accounts — “For people like Taylor Swift don\'t bother with fanout anymore, instead merge in her timeline at read time.”'],
      ['highscalability-twitter-timelines', 'Fan-out time for a huge account — “it can take up to 5 minutes for a tweet to flow from Lady Gaga\'s fingers”'],
      ['highscalability-twitter-timelines', 'Skip inactive users — “If you are not an active user then the tweet does not go into the cache.”'],
      ['highscalability-twitter-timelines', 'The cache is rebuildable — “If you fall out of the Redis cluster then you go through a process called reconstruction.”'],
      ['rfc9110', 'A PUT that creates returns 201 — “If the target resource does not have a current representation and the PUT successfully creates one, then the origin server MUST inform the user agent by sending a 201 (Created) response.”'],
      ['slack-evolving-pagination', 'Cursor pagination — “the page window becomes unreliable, potentially skipping or returning duplicate results”']
    ],
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
        { q: 'A celebrity with 100M followers posts. If the workers can spare 100k inserts/s for this one post, how many seconds to fan out?', a: 1000, unit: 'seconds', tol: 0.1, how: '100M ÷ 100k = 1,000 s ≈ 17 minutes — for a single post. This is the celebrity problem.' }
      ] } },
      { name: 'API', w: 15, lab: { type: 'api', brief: 'Define the endpoints.',
        paths: ['/v1/posts', '/v1/timeline?cursor=…&limit=20', '/v1/me/following/{userId}', '/v1/createPost', '/v1/timeline?page=3', '/v1/follow?user={userId}'],
        tasks: [
          { need: 'Publish a post', method: 'POST', path: '/v1/posts', status: '201', note: 'Creates a resource.' },
          { need: 'Read my home timeline, paged', method: 'GET', path: '/v1/timeline?cursor=…&limit=20', status: '200', note: 'Cursor pagination: new posts arrive constantly, so offsets would shift.' },
          { need: 'Follow a user (safe to retry)', method: 'PUT', path: '/v1/me/following/{userId}', status: ['201', '204'], note: 'PUT makes "follow" idempotent — following twice is the same as once. A PUT that creates the relationship returns 201; repeating it changes nothing and returns 200 or 204.' },
          { need: 'Unfollow a user', method: 'DELETE', path: '/v1/me/following/{userId}', status: '204', note: 'Removes the relationship; idempotent.' }
        ] } },
      { name: 'High-level design', w: 25, lab: { type: 'diagram', brief: 'Draw post + home timeline with fan-out on write. The timeline is precomputed into a cache.',
        labels: { app: 'API service', db: 'Post store', worker: 'Fan-out workers', cache: 'Timeline cache' },
        required: ['client', 'lb', 'app', 'db', 'queue', 'worker', 'cache'],
        edges: [['client', 'lb'], ['lb', 'app'], ['app', 'db'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'cache'], ['app', 'cache']],
        why: { queue: 'Fan-out is slow and bursty — acknowledge the post, then fan out asynchronously.', worker: 'Workers read the follower list and write the post into each follower\'s timeline.', cache: 'Each user\'s timeline is precomputed, so a read is one lookup.', db: 'The post store is the source of truth; the timeline cache is derived from it.' },
        decoys: { blob: 'Media was not in the core scope.', search: 'Search was parked as out of scope.', idgen: 'Useful in practice, but not the point of this design.' },
        sim: {
          load: '11,600 timeline reads a second and 1,160 posts a second: the averages you estimated in phase 2. Fanning one post out to 200 followers takes a worker about 150 ms.',
          scale: 10,
          goals: { errors: 1, p99: 300 },
          flows: [
            { label: 'Timeline reads', rps: 11600, needs: ['cache'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'cache'], ['app', 'db', { instead: 'cache' }]] },
            { label: 'Posts', rps: 1160, needs: ['db', 'worker', 'cache'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'db'], ['app', 'queue'], ['app', 'worker', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'cache']] }
          ],
          parts: {
            app: { cfg: { instances: 4, capacity: 6, serviceMs: 6, serviceCv: 0.5, queueLimit: 48 }, solo: { instances: 1 }, soloWhy: 'Nothing spreads the traffic, so clients can only reach one server however many you run.', fullWhy: 'A request holds its slot until everything it called has answered. Is anything slow being done while the user waits?' },
            cache: { cfg: { capacity: 64, serviceMs: 1, hitRate: 1, queueLimit: 512 } },
            db: { cfg: { capacity: 8, serviceMs: 10, serviceCv: 0.7, queueLimit: 64, lockMs: 0 }, fullWhy: 'It is sized for posts, about a tenth of the traffic. Timeline reads need to be answered from something precomputed.' },
            queue: { cfg: { queueLimit: 20000 } },
            worker: { cfg: { instances: 4, capacity: 8, serviceMs: 150, serviceCv: 0.6, queueLimit: 16 } }
          },
          needWhy: { cache: 'A timeline that is not precomputed has to be assembled from 200 accounts on every read.', worker: 'Something has to copy each post into its followers\' timelines.', db: 'The post store is the source of truth; the timeline cache can be rebuilt from it.' },
          bad: { 'client>db': 'Clients never talk to the database directly.', 'client>cache': 'Clients never talk to the cache directly.', 'client>queue': 'Clients do not publish to your internal queue; the API service does, after it has checked the request.' },
          ok: [['worker', 'db']],
          traps: [
            { name: 'no queue: the API calls the fan-out workers and waits', drop: ['queue'], wire: [['app', 'worker']] },
            { name: 'no load balancer', drop: ['lb'], wire: [['client', 'app']] },
            { name: 'no timeline cache: reads hit the post store', drop: ['cache'] },
            { name: 'workers never write the timelines', cut: [['worker', 'cache']] }
          ]
        } } },
      { name: 'Deep dive', w: 15, lab: { type: 'quiz', qs: [
        ['How do you handle an account with 100M followers?', ['Hybrid: do not fan out their posts; fetch them at read time and merge', 'Fan out anyway, with a larger pool of workers for big accounts', 'Cap follower counts so that fan-out always stays cheap', 'Shard the celebrity\'s followers across more databases'], 'Push for ordinary accounts, pull for the few huge ones. One merge at read time is far cheaper than 100M writes. Twitter described moving in this direction in 2013, when fan-out for its largest accounts could take minutes.', ['highscalability-twitter-timelines']],
        ['Why does fan-out on write suit this system at all?', ['Timeline reads outnumber posts about 10:1 and must be fast, so the work moves to the write path', 'Posts outnumber timeline reads by about 10:1, so it is the write path that needs the optimisation', 'It uses less storage than computing timelines at read time', 'It is simpler to build and to operate than fan-out on read'], 'You pay per post, asynchronously, so that a billion reads a day are each one cache fetch.', ['highscalability-twitter-timelines']],
        ['A user\'s precomputed timeline has been evicted or lost from the cache. What now?', ['Rebuild it on demand from the follow graph and the post store', 'Nothing can be done; the timeline is gone for good', 'Restore that user\'s timeline from last week\'s backup', 'Show an empty timeline until the user follows someone new'], 'The cache is derived data. The source of truth is intact.', ['highscalability-twitter-timelines']],
        ['Most accounts have not logged in for months. Fan-out optimisation?', ['Skip inactive users and build their timeline when they return', 'Fan out to everyone regardless, so that all timelines stay consistent', 'Delete accounts that have been inactive for a month, to shrink the graph', 'Fan out to inactive users at a lower priority only'], 'No point precomputing timelines nobody reads. Twitter kept cached timelines only for recently active users.', ['highscalability-twitter-timelines']]
      ] } },
      { name: 'Teach it back', w: 15, lab: { type: 'teach', prompt: 'Explain fan-out on write versus fan-out on read, and why a system like this ends up with a hybrid.', rubric: ['On write: build each follower\'s timeline when a post is made — cheap reads, expensive writes', 'On read: merge followees\' posts at request time — cheap writes, expensive reads', 'The choice depends on read:write ratio and follower distribution', 'Celebrities make fan-out on write explode → pull and merge for them', 'The timeline cache is derived and rebuildable'] } }
    ]
  },
  {
    id: 'ledgerpay', title: 'LedgerPay', sub: 'Design a payment system', level: 'Hard', icon: '💳',
    brief: 'Merchants charge customers through your API. You call an external card processor, record every movement of money, and must never charge anyone twice.',
    refs: [
      ['stripe-blog-idempotency', 'Idempotency keys — “you can safely retry it with the same idempotency key, and the customer is charged only once”'],
      ['brandur-idempotency-keys', 'Commit before calling the processor — “Atomic phases should be safely committed before initiating any foreign state mutation.”'],
      ['stripe-error-handling', 'A timeout means "unknown" — “When a connection fails, you might not know whether Stripe received or executed the request.”'],
      ['stripe-error-handling', 'Reconciliation — “If you still haven’t received a result when that window ends, stop retrying and reconcile the outcome”'],
      ['stripe-webhooks', 'Webhook handling — “Quickly returns a successful status code (`2xx`) before any complex logic that might cause a timeout.”'],
      ['stripe-webhooks', 'Webhooks are delivered at least once — “Webhook endpoints might occasionally receive the same event more than once.”'],
      ['stripe-ledger', 'Immutable ledger — “At its core, Ledger is an immutable log of events. Transactions previously published into Ledger cannot be deleted or modified”'],
      ['square-books', 'Corrections are new entries — “if you make a mistake what you want to do instead of updating is to write a new entry that corrects the previous one”']
    ],
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
          { need: 'Create a payment', method: 'POST', path: '/v1/payments', status: ['201', '202'], note: 'Sent with an Idempotency-Key header so retries are safe. 201 when the payment record is created; 202 is equally defensible while the outcome is still pending.' },
          { need: 'Check a payment\'s status', method: 'GET', path: '/v1/payments/{id}', status: '200', note: 'Clients poll this when the outcome was pending.' },
          { need: 'Refund a payment', method: 'POST', path: '/v1/payments/{id}/refunds', status: '201', note: 'A refund is a new resource under the payment, not an edit of it.' },
          { need: 'Processor reports an async result', method: 'POST', path: '/v1/webhooks/processor', status: ['200', '202', '204'], note: 'Acknowledge quickly with any 2xx; process the event idempotently.' }
        ] } },
      { name: 'High-level design', w: 25, lab: { type: 'diagram', brief: 'Draw the payment flow, including the external processor and the path that resolves uncertain outcomes.',
        labels: { app: 'Payment service', db: 'Payments DB + idempotency keys', worker: 'Reconciliation worker', gateway: 'API gateway' },
        required: ['client', 'gateway', 'app', 'db', 'ledger', 'psp', 'queue', 'worker'],
        edges: [['client', 'gateway'], ['gateway', 'app'], ['app', 'db'], ['app', 'psp'], ['app', 'ledger'], ['app', 'queue'], ['queue', 'worker']],
        why: { ledger: 'An append-only, double-entry record of every movement of money.', psp: 'The external processor is a slow, unreliable dependency — draw it so you can discuss its failures.', queue: 'Uncertain or follow-up work is queued rather than done inside the request.', worker: 'Resolves "unknown" payments by asking the processor and reconciling.', gateway: 'Authentication and rate limiting for merchant API keys.' },
        decoys: { cache: 'Caching payment state invites stale decisions, and ~600 writes/s does not need it.', cdn: 'There is no static content in this flow.' },
        sim: {
          load: '580 payments a second, the peak you estimated in phase 2. The card processor takes about 300 ms to answer, and about 1 payment in 50 ends in a timeout that has to be resolved later.',
          timeoutMs: 6000,
          goals: { errors: 1, p99: 1500 },
          flows: [
            { label: 'Payments', rps: 568, needs: ['db', 'psp', 'ledger'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['app', 'db'], ['app', 'psp'], ['app', 'ledger']] },
            { label: 'Payments with an unknown outcome', rps: 12, needs: ['db', 'psp', 'worker'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['app', 'db'], ['app', 'psp'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'psp'], ['worker', 'db'], ['worker', 'ledger']] }
          ],
          parts: {
            gateway: { cfg: { capacity: 512, serviceMs: 1, queueLimit: 1024, rateLimitRps: 2000, burst: 2000, authFailRate: 0 } },
            app: { cfg: { instances: 20, capacity: 16, serviceMs: 6, serviceCv: 0.5, queueLimit: 128 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of it spreads merchants over the fleet, so they can only reach one server.', fullWhy: 'Each payment holds a slot for as long as the processor takes to answer.' },
            db: { cfg: { capacity: 32, serviceMs: 8, serviceCv: 0.6, queueLimit: 128, lockMs: 0 } },
            ledger: { cfg: { capacity: 32, serviceMs: 8, serviceCv: 0.6, queueLimit: 128, lockMs: 0 } },
            psp: { cfg: { capacity: 2000, serviceMs: 300, serviceCv: 0.6, queueLimit: 2000 } },
            worker: { cfg: { instances: 2, capacity: 16, serviceMs: 20, serviceCv: 0.6 } }
          },
          needWhy: { worker: 'A timeout from the processor means "unknown", not "failed". Something has to ask again later and settle it.', psp: 'Only the processor can move the money.', ledger: 'Every movement of money has to be written to the ledger.', db: 'The idempotency key and the payment\'s state live here.' },
          bad: { 'client>psp': 'Merchants call you, not the card processor: that is the product.', 'client>db': 'Clients never talk to the database directly.', 'gateway>db': 'The gateway checks API keys and limits; the payment service owns the data.', 'gateway>psp': 'The gateway forwards requests to your service. It does not charge cards.' },
          traps: [
            { name: 'no reconciliation path', drop: ['queue', 'worker'] },
            { name: 'queue drawn but nothing reads from it', drop: ['worker'] },
            { name: 'no gateway in front of the fleet', drop: ['gateway'], wire: [['client', 'app']] },
            { name: 'no ledger', drop: ['ledger'] }
          ]
        } } },
      { name: 'Deep dive', w: 20, lab: { type: 'quiz', qs: [
        ['The client times out on create-payment and retries. What prevents a double charge?', ['The key was committed with a pending payment before the processor call', 'The retry is rejected with a 500, and the client gives up after a few attempts', 'A longer client timeout, so that the retries which cause it never happen', 'Per-merchant rate limiting on the create endpoint, to block the second call'], 'The key sits behind a unique constraint in the same transaction as the pending payment, committed before the external call. A retry returns the recorded result (or "still pending") instead of charging again, and the same key is forwarded to the processor.', ['brandur-idempotency-keys', 'stripe-idempotent-requests']],
        ['Your call to the processor times out. Was the card charged?', ['Unknown — mark it pending and resolve it from the processor or its webhook', 'No — a timeout always means the charge failed, so retry with a new key at once', 'Yes — a timeout means the request reached the processor', 'Possibly — issue a refund straight away to be safe'], 'A timeout tells you nothing about the outcome. Model "unknown" explicitly and reconcile.', ['stripe-error-handling', 'stripe-blog-idempotency']],
        ['During a network partition between your database replicas, the payment service should…', ['Refuse payments it cannot record consistently', 'Accept payments on both sides and merge them later', 'Serve payment state from the cache until it heals', 'Send each payment to whichever replica answers'], 'A payment you cannot record consistently is one you cannot account for, so refuse it. Availability is defensible only where the risk can be bounded and compensated afterwards, as with ATM withdrawal limits.', ['brewer-cap-twelve-years-later']],
        ['A ledger entry was wrong. How do you fix it?', ['Append a compensating entry; never edit or delete', 'Update the row in place and log who changed it', 'Delete the entry and insert a corrected one', 'Restore the ledger from the last good backup'], 'An append-only ledger keeps a complete audit trail.', ['square-books', 'stripe-ledger']]
      ] } },
      { name: 'Teach it back', w: 15, lab: { type: 'teach', prompt: 'Explain how you guarantee a customer is never charged twice, even with retries, timeouts and crashes.', rubric: ['The client generates one idempotency key per logical payment', 'The key is committed with a pending payment row (same transaction, unique constraint) before the processor is called', 'A retry returns the stored result or pending status instead of re-executing', 'The same key is passed to the processor, and unknown outcomes are reconciled', 'At-least-once delivery + idempotent handling = effectively once'] } }
    ]
  },
  {
    id: 'nextup', title: 'NextUp', sub: 'Design a real-time recommendation feed', level: 'ML', icon: '🎯',
    brief: 'A video app\'s home feed. Opening the app shows a ranked list of videos chosen for that user, and what the user watches should shape the next list.',
    refs: [
      ['youtube-dnn-recs', 'The funnel — “During candidate generation, the enormous YouTube corpus is winnowed down to hundreds of videos that may be relevant to the user.”'],
      ['youtube-dnn-recs', 'The latency budget — “Scoring millions of items under a strict serving latency of tens of milliseconds requires an approximate scoring scheme sublinear in the number of classes.”'],
      ['instagram-explore-scaling', 'Retrieval at Instagram — “The main purpose of a source is to select hundreds of relevant items from a media pool of billions of items.”'],
      ['instagram-explore-scaling', 'Fresh and precomputed sources — “retrieval sources can be real-time (capturing most recent interactions) and pre-generated (capturing long-term interests).”'],
      ['uber-michelangelo', 'Online features are fast — “In the case of models that do require features from Cassandra, we typically see P95 latency of less than 10ms.”'],
      ['monolith-bytedance', 'Events flow back through a stream — “we use one Kafka [13] queue to log actions of users (E.g. Click on an item or like an item etc.) and another Kafka queue for features.”'],
      ['aws-wa-graceful-degradation', 'Degrade, do not fail — “When one upstream system fails, it still makes sense to display everything else instead of showing an error page to a customer.”'],
      ['hi-ml-video-recs', 'A worked answer to a similar prompt — “How quickly do we need to show recommendations when the user views a video? We display within a small window, say 250ms.”']
    ],
    phases: [
      { name: 'Requirements', w: 15, lab: { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['How many daily users and videos, and how fast does the catalogue change?', true, 'Sizes retrieval and says how fresh the index has to be.'],
        ['What latency budget does the feed have?', true, 'The budget decides how many videos the ranker can afford to score.'],
        ['What are we optimising: clicks, watch time, something longer-term?', true, 'The objective defines the labels and the ranking model.'],
        ['How quickly must a user\'s latest actions change their feed?', true, 'Minutes means a streaming feature path; a day means batch is enough.'],
        ['PyTorch or TensorFlow?', false, 'Does not change the architecture.'],
        ['How many layers should the ranking model have?', false, 'A modelling detail, for much later if at all.'],
        ['Which vector database vendor do you prefer?', false, 'Your decision, made from the requirements.'],
        ['Can we train on GPUs?', false, 'Yes, and it does not shape the serving design.']
      ] } },
      { name: 'Estimation', w: 15, lab: { type: 'estimate', brief: 'Given: 10M daily users · 10 feed loads each a day · peak is 3× the average · 10M videos · 500 candidates ranked per request.', fixed: [
        { q: 'Average feed loads per second?', a: 1160, unit: 'req/s', tol: 0.25, how: '10M × 10 = 100M a day ÷ 86,400 s ≈ 1,160 a second.' },
        { q: 'Peak feed loads per second?', a: 3500, unit: 'req/s', tol: 0.25, how: '3 × 1,160 ≈ 3,500. Size for the peak, not the average.' },
        { q: 'One ranking replica scores 4 requests at once and each takes 50 ms. Requests per second per replica?', a: 80, unit: 'req/s', tol: 0.05, how: '4 slots ÷ 0.05 s = 80 a second. A GPU model server is a slow server with few slots.' },
        { q: 'How many ranking replicas for the peak, at no more than 70% busy?', a: 63, unit: 'replicas', tol: 0.1, how: '3,500 ÷ (80 × 0.7) = 62.5, so 63. The ranking fleet is where the money goes.' },
        { q: 'Item embeddings for retrieval: 10M videos × 256 float32 dimensions. Size in GB?', a: 10.2, unit: 'GB', tol: 0.15, how: '10,000,000 × 256 × 4 bytes ≈ 10 GB. It fits in memory on one node, before replicas.' }
      ] } },
      { name: 'API', w: 10, lab: { type: 'api', brief: 'Define the endpoints.',
        paths: ['/v1/feed', '/v1/events', '/v1/feed/hidden/{videoId}', '/v1/getFeed', '/v1/events/create'],
        tasks: [
          { need: 'Load the feed for the signed-in user', method: 'GET', path: '/v1/feed', status: '200', note: 'A read. The user comes from the auth token, and the response carries a cursor for the next page.' },
          { need: 'Report a batch of watch and click events', method: 'POST', path: '/v1/events', status: '202', note: '202 Accepted: the events are queued and processed later. The client does not wait for the feature pipeline.' },
          { need: 'Hide a video from this user\'s feed for good', method: 'PUT', path: '/v1/feed/hidden/{videoId}', status: '204', note: 'PUT is idempotent: hiding the same video twice leaves it hidden once. Nothing to return.' }
        ] } },
      { name: 'High-level design', w: 25, lab: { type: 'diagram', brief: 'Draw both paths: a feed load at 3,500 a second, and the watch events that flow back.',
        labels: { app: 'Feed service', queue: 'Event stream', worker: 'Feature pipeline', gateway: 'API gateway' },
        required: ['client', 'gateway', 'app', 'index', 'features', 'ranker', 'queue', 'worker', 'warehouse'],
        edges: [['client', 'gateway'], ['gateway', 'app'], ['app', 'index'], ['app', 'features'], ['app', 'ranker'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'features'], ['worker', 'warehouse']],
        layout: { client: [10, 120], gateway: [165, 120], app: [320, 120], index: [480, 16], ranker: [632, 120], features: [480, 232], queue: [320, 340], worker: [480, 372], warehouse: [636, 372] },
        why: { index: 'Cuts ten million videos to a few hundred in milliseconds, so that the ranker has something it can afford to score.', features: 'The latest feature values, read in a few milliseconds. The warehouse holds the same data and answers far too slowly.', ranker: 'The heavy model: a GPU fleet scoring a few hundred candidates per request.', queue: 'Events are acknowledged at once and processed later, so a slow pipeline never slows the feed.', worker: 'Turns events into fresh feature values and into rows of training data.', warehouse: 'The history. Training sets and offline features are built from here.', gateway: 'Authentication and rate limiting in front of the feed service fleet.' },
        decoys: { cdn: 'Every feed is personal and changes with the last thing the user watched, so there is nothing shared to cache at the edge.', ws: 'The app asks for a feed when it opens. Nothing here is pushed to the client.', search: 'Nobody asked for search. Retrieval here is by embedding, in the candidate index.' },
        sim: {
          load: '3,500 feed loads a second, the peak you estimated in phase 2, and 7,000 watch and click events a second.',
          scale: 10,
          goals: { errors: 1, p99: 250 },
          flows: [
            { label: 'Feed loads', rps: 3500, needs: ['index', 'features', 'ranker'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['app', 'index'], ['app', 'features'], ['app', 'warehouse', { instead: 'features' }], ['app', 'ranker'], ['ranker', 'features', { instead: 'app' }]] },
            { label: 'Watch events', rps: 7000, needs: ['features', 'warehouse'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['app', 'queue'], ['app', 'warehouse', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'features'], ['worker', 'warehouse']] }
          ],
          parts: {
            gateway: { cfg: { capacity: 512, serviceMs: 1, queueLimit: 1024, rateLimitRps: 5000, burst: 5000, authFailRate: 0 } },
            app: { cfg: { instances: 12, capacity: 16, serviceMs: 4, serviceCv: 0.5, queueLimit: 128 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of it spreads users over the fleet, so they can only reach one server.', fullWhy: 'A feed load holds a slot for as long as the slowest thing it calls takes to answer.' },
            index: { cfg: { capacity: 32, serviceMs: 8, serviceCv: 0.4, queueLimit: 128 } },
            features: { cfg: { capacity: 64, serviceMs: 3, serviceCv: 0.4, queueLimit: 256 } },
            ranker: { cfg: { instances: 8, capacity: 4, serviceMs: 50, serviceCv: 0.3, queueLimit: 64 }, fullWhy: 'Each request holds a GPU slot for about 50 ms. Scoring more candidates, or losing replicas, fills the fleet.' },
            worker: { cfg: { instances: 6, capacity: 16, serviceMs: 20, serviceCv: 0.6 } },
            warehouse: { cfg: { capacity: 56, serviceMs: 60, serviceCv: 0.7, queueLimit: 256, lockMs: 0 }, fullWhy: 'A warehouse is built for large scans, not for thousands of small lookups a second. Reads on the request path belong in the online store.' }
          },
          needWhy: { index: 'Without retrieval the ranker would have to score all ten million videos for every request.', features: 'The ranker needs current features, read from a store that answers in milliseconds, and the feature pipeline has to keep that store fresh.', ranker: 'Nothing has put the candidates in order.', warehouse: 'Training data comes from here. Without the events there is nothing to train the next model on.' },
          bad: { 'client>ranker': 'Clients never call the model directly: the feed service has to fetch candidates and features first.', 'client>features': 'Clients never read the feature store directly.', 'client>index': 'Clients never query the candidate index directly.', 'gateway>ranker': 'The gateway checks who is calling and forwards the request. It does not run models.', 'ranker>warehouse': 'The ranker answers in tens of milliseconds. A warehouse query does not.', 'queue>features': 'A stream holds events. Something has to read them and compute the feature values: draw the pipeline between the two.', 'queue>warehouse': 'A stream holds events. Something has to read them and write the rows: draw the pipeline between the two.' },
          traps: [
            { name: 'no candidate index', drop: ['index'] },
            { name: 'no online feature store: features are read from the warehouse', drop: ['features'], wire: [['app', 'warehouse']] },
            { name: 'no gateway in front of the fleet', drop: ['gateway'], wire: [['client', 'app']] },
            { name: 'event stream drawn but nothing reads from it', drop: ['worker'] },
            { name: 'events never reach the warehouse', cut: [['worker', 'warehouse']] },
            { name: 'events written to the warehouse inside the request', drop: ['queue', 'worker'], wire: [['app', 'warehouse']] }
          ]
        } } },
      { name: 'Deep dive', w: 20, lab: { type: 'quiz', qs: [
        ['Why does the feed service retrieve about 500 candidates before ranking, instead of ranking the catalogue?', ['Scoring 10M videos per request cannot fit a budget of tens of milliseconds', 'A ranking model is markedly less accurate on unpopular videos', 'The online feature store only holds features for about 500 videos', 'Retrieval is what removes the videos a user has already watched'], 'The heavy model\'s cost per item × the number of items has to fit the latency budget. A cheap, approximate stage cuts millions to hundreds, and the expensive model is spent on those.', ['youtube-dnn-recs', 'wide-deep']],
        ['Product wants the ranker to score 5,000 candidates per request instead of 500, "for quality". The ranking fleet is 63 replicas. What does that cost?', ['About ten times the replicas, or ten times the ranking latency', 'Nothing: batching absorbs the extra candidates for free', 'About twice the replicas, since cost grows with the square root', 'Nothing: only the candidate index has more work to do'], 'Scoring work is roughly proportional to the number of candidates. Ten times the candidates is ten times the GPU time per request: either about 630 replicas, or a 500 ms ranking stage. A cheap pre-ranking pass is the usual answer.', 'calc'],
        ['A user watches three cooking videos in a row, and the next feed load should reflect it. Which path makes that possible?', ['Events → stream → feature pipeline → online feature store', 'Events → warehouse → nightly batch job → online feature store', 'Events → ranking model, which is retrained on every request', 'Events → candidate index, which is rebuilt after every watch'], 'Fresh behaviour reaches the model as features, not as new weights. A streaming job turns events into feature values within seconds and writes them where the ranker reads them; the same events are logged for training later.', ['uber-michelangelo', 'monolith-bytedance']],
        ['The online feature store is unreachable for two minutes. What should the feed do?', ['Degrade: serve a cached or popular list, not an error page', 'Fail each request, so that clients keep retrying until it recovers', 'Read the same features from the warehouse in the meantime', 'Rank the candidates using random feature values for now'], 'Recommendations are a soft dependency of the screen: a less personal list is far better than an error. The warehouse cannot take request-path traffic, and retries would pile load onto a struggling store.', ['aws-wa-graceful-degradation', 'hi-ml-video-recs']]
      ] } },
      { name: 'Teach it back', w: 15, lab: { type: 'teach', prompt: 'Explain what happens between a user opening the app and seeing their feed, and how a video they watch changes the next feed.', rubric: ['Feed service → retrieve a few hundred candidates → read features from the online store → rank on GPUs → re-rank', 'Why two stages: the heavy model cannot score the catalogue inside the latency budget', 'Events go through a stream to the feature pipeline, off the request path', 'The online store serves fresh features; the warehouse keeps history for training', 'What happens when a dependency fails: a cached or popular list, not an error'] } }
    ]
  }
];
