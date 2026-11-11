// Module 1 — Foundations. Topics 1.1–1.6 also pull their flashcards from questions/module-1-foundations.json.
(function (T) {

  T({
    id: '1.1', mod: '1', title: 'Queues are everywhere', tag: 'When arrival exceeds throughput',
    analogy: 'A sink with the tap running. If water comes in faster than the drain takes it out, the level rises — and it only falls again when the tap is turned below the drain rate.',
    points: [
      'Every component with finite capacity has a queue in front of it, whether you drew one or not: socket backlogs, thread pools, connection pools.',
      'Queue growth = (arrival rate − service rate) × time. A 50 req/s excess for 60 s leaves 3,000 requests waiting.',
      'A queue only drains with spare capacity. At exactly 100% utilisation it never drains.',
      'Queueing time is latency. A request stuck behind 3,000 others is slow even if the server is healthy.'
    ],
    pitfall: 'Treating an unbounded queue as free buffering. It converts overload into unbounded latency, then into timeouts and memory exhaustion.',
    say: 'During the spike the excess is 50 req/s, so after a minute we have 3,000 queued; with 20 req/s of headroom afterwards that takes 150 seconds to drain.',
    cards: [],
    quiz: [
      ['Capacity is 200 req/s. Traffic is 260 req/s for 30 s. Queue depth afterwards?', ['1,800', '7,800', '6,000', '60'], '(260 − 200) × 30 = 1,800.'],
      ['After a spike, traffic returns to exactly the server\'s capacity. The backlog…', ['Never drains', 'Drains slowly', 'Drains instantly', 'Doubles'], 'Draining needs spare capacity; at 100% there is none.'],
      ['A healthy server shows high latency after a brief spike. Why?', ['Requests are waiting behind the backlog', 'The CPU overheated', 'The network slowed down', 'The cache was cleared'], 'Time in queue counts toward latency, long after the spike has ended.']
    ],
    explain: ['Explain what happens to a system when requests arrive faster than it can serve them, and how it recovers.', ['Excess requests accumulate in a queue', 'Growth = (arrival − capacity) × duration', 'Draining needs arrival below capacity', 'Queueing time is user-visible latency']],
    duck: ['The spike is over — why is everything still slow?', 'Why not just make the queue bigger?'],
    lab: { type: 'estimate', kinds: ['backlog', 'drain'], n: 5 }
  });

  T({
    id: '1.2', mod: '1', title: 'Slots + service time', tag: 'How servers model capacity',
    analogy: 'Supermarket tills. Capacity is the number of tills (slots) times how many customers each serves per minute — nobody "sets" the shop\'s throughput directly.',
    points: [
      'Throughput = slots × (1 ÷ service time). 10 slots at 100 ms each = 100 req/s.',
      'Slots are concurrency: threads, workers, connections, GPU batch positions.',
      'Two servers with identical throughput can behave very differently: few fast slots (low latency, fragile to bursts) vs many slow slots (high concurrency, high latency).',
      'When all slots are busy, new requests queue. Service time is the floor on latency; queueing adds on top.'
    ],
    pitfall: 'Quoting "requests per second" as if it were a configurable property. It is derived from concurrency and service time — change either and it moves.',
    say: 'Each instance has 50 worker threads and a 100 ms service time, so about 500 req/s per instance before queueing.',
    cards: [],
    quiz: [
      ['A server has 16 slots and a 200 ms service time. Throughput?', ['80 req/s', '3,200 req/s', '16 req/s', '32 req/s'], '16 × (1000 ÷ 200) = 80.'],
      ['Which is NOT an example of a "slot"?', ['A row in a table', 'A worker thread', 'A database connection', 'A GPU batch position'], 'Slots are units of concurrent processing capacity.'],
      ['Service time doubles and slots stay the same. Throughput…', ['Halves', 'Doubles', 'Is unchanged', 'Goes to zero'], 'Each slot now completes half as many requests per second.']
    ],
    explain: ['Explain how to work out a server\'s capacity from first principles.', ['Throughput = slots × (1 / service time)', 'What slots physically are', 'Same throughput can mean different latency/concurrency trade-offs', 'Busy slots → queueing']],
    duck: ['What is a "slot" in a real server?', 'How can two servers with the same throughput feel different?'],
    lab: { type: 'estimate', kinds: ['throughput', 'util'], n: 5 }
  });

  T({
    id: '1.3', mod: '1', title: 'Utilisation vs headroom', tag: 'Why 70% is the target, not 100%',
    analogy: 'A motorway at 95% occupancy is not "efficient" — one car braking causes a jam that takes an hour to clear. Flow needs gaps.',
    points: [
      'Utilisation ρ = arrival rate ÷ capacity. Headroom is what is left.',
      'Latency rises non-linearly with utilisation. In the simplest queueing model, time in system ≈ service time ÷ (1 − ρ): 2× at 50%, 10× at 90%, 100× at 99%.',
      'Arrivals and service times vary, so queues form well before 100%.',
      'Headroom is also your recovery capacity (draining backlogs) and your failure capacity (losing a node shifts its load onto the rest).',
      'Hence the common target of roughly 60–70% at peak.'
    ],
    pitfall: 'Running at 95% "to save money". There is nothing left to absorb a spike, a retry burst or a lost node.',
    say: 'I\'ll size for about 70% utilisation at peak so there\'s headroom for bursts and for losing an instance.',
    cards: [],
    quiz: [
      ['In the simple model latency ≈ service time ÷ (1 − ρ). At 90% utilisation latency is about…', ['10× the service time', '1.9× the service time', '90× the service time', 'Equal to the service time'], '1 ÷ (1 − 0.9) = 10.'],
      ['Three servers run at 70% each. One dies. The remaining two are at…', ['105% — overloaded', '70%', '85%', '93%'], '3 × 70 = 210 units of load over 2 servers = 105%. To survive one loss, three servers must stay under ~66%.'],
      ['Why do queues form below 100% utilisation?', ['Arrivals and service times are variable, so bursts temporarily exceed capacity', 'Servers are lazy', 'Load balancers add delay', 'They do not'], 'Averages hide bursts. Randomness creates momentary overloads.']
    ],
    explain: ['Explain why you should not run a service at 100% utilisation.', ['Latency grows non-linearly as utilisation approaches 100%', 'Variability causes queueing before 100%', 'Headroom is needed to drain backlogs', 'Headroom is needed to survive node loss']],
    duck: ['Isn\'t unused capacity just wasted money?', 'Why does latency explode instead of rising steadily?'],
    lab: { type: 'sim', sim: 'queue' }
  });

  T({
    id: '1.4', mod: '1', title: 'Little\'s Law', tag: 'L = λ × W',
    analogy: 'A shop where 10 people enter per minute and each stays 5 minutes always has about 50 people inside. Know any two numbers and you have the third.',
    points: [
      'L = λ × W: average items in the system = arrival rate × average time each spends in it.',
      'It holds for any stable system, regardless of arrival pattern or service distribution.',
      'Use it to size concurrency: 1,000 req/s × 0.2 s = 200 requests in flight → you need at least 200 slots or connections.',
      'Use it backwards: if latency doubles at the same arrival rate, in-flight requests double — which is how slow dependencies exhaust thread pools.'
    ],
    pitfall: 'Sizing a connection pool from QPS alone. The pool size depends on QPS × time each connection is held.',
    say: 'At 2,000 QPS and a 50 ms query time, Little\'s Law gives 100 concurrent queries, so the pool needs to be comfortably above 100.',
    cards: [],
    quiz: [
      ['500 req/s arrive and each takes 200 ms. Average requests in flight?', ['100', '2,500', '40', '700'], '500 × 0.2 = 100.'],
      ['A dependency slows from 50 ms to 500 ms at constant traffic. In-flight requests…', ['Increase 10×', 'Stay the same', 'Decrease 10×', 'Double'], 'L = λW: tenfold W means tenfold L — pools fill up.'],
      ['Little\'s Law requires…', ['A stable system (arrivals do not exceed capacity on average)', 'Poisson arrivals', 'Exactly one server', 'Constant service time'], 'It is distribution-free; it only needs the system to be in steady state.']
    ],
    explain: ['Explain Little\'s Law and one practical use for it.', ['L = λ × W, with each term defined', 'Holds for any stable system', 'Use: sizing threads/connections from rate × latency', 'Slower responses → more concurrent work']],
    duck: ['How does a slow database make my web server run out of threads?', 'What do L, λ and W each mean in plain words?'],
    lab: { type: 'estimate', kinds: ['littles'], n: 4 }
  });

  T({
    id: '1.5', mod: '1', title: 'Load balancers', tag: 'Routing strategies and the slow server',
    analogy: 'A host seating guests at a restaurant. Seating strictly in rotation is fair — until one waiter is ill and their tables pile up. A good host looks at who is actually busy.',
    points: [
      'Round robin: simple and even, but blind to how busy each server is.',
      'Least connections: sends to the server with the fewest in-flight requests — naturally steers away from a slow server.',
      'Consistent hashing: same key → same server. For cache locality or sticky sessions, with minimal reshuffling when servers change.',
      'The slow-server problem: under round robin a degraded server still gets its full share, so its queue grows and it drags up tail latency.',
      'Health checks remove dead servers; they often miss slow ones. L4 balances connections; L7 understands requests.'
    ],
    pitfall: 'Assuming health checks protect you from a slow server. A server that answers pings but takes 5 s per request passes them.',
    say: 'I\'d use least-connections so a degraded instance receives less traffic automatically, plus health checks to eject dead ones.',
    cards: [],
    quiz: [
      ['One of four servers becomes 10× slower. Which strategy limits the damage automatically?', ['Least connections', 'Round robin', 'Random', 'DNS round robin'], 'The slow server accumulates in-flight requests, so it is chosen less often.'],
      ['You need requests for the same cache key to reach the same node. Use…', ['Consistent hashing', 'Round robin', 'Least connections', 'Random'], 'It maps keys to nodes deterministically and moves few keys when nodes change.'],
      ['Why can a slow server pass health checks?', ['The check only tests that it responds, not how fast real requests are', 'Health checks are random', 'Slow servers are always removed', 'It cannot'], 'Liveness is not the same as performance.']
    ],
    explain: ['Explain the main load-balancing strategies and what goes wrong with a slow server.', ['Round robin and its blindness to load', 'Least connections adapts to slow servers', 'Consistent hashing for key affinity', 'Health checks miss slow-but-alive servers']],
    duck: ['Why is taking turns not the fairest way to spread load?', 'What does the balancer know that lets it avoid a slow server?'],
    lab: {
      type: 'sort', brief: 'Pick the routing strategy.', buckets: ['Round robin', 'Least connections', 'Consistent hashing'],
      items: [['Identical stateless servers, uniform short requests', 0], ['One server is degraded and slow', 1], ['Long-lived connections of very different durations', 1], ['Requests for the same key must hit the same cache node', 2], ['Sticky sessions with minimal reshuffling when nodes change', 2], ['Request cost varies wildly — some 5 ms, some 5 s', 1]]
    }
  });

  T({
    id: '1.6', mod: '1', title: 'Retry storms', tag: 'How retries amplify failure',
    analogy: 'A jammed phone line where every caller who gets the busy tone immediately redials. The redials are what keep the line jammed.',
    points: [
      'When a service is overloaded, requests fail; clients retry; retries are more load; more requests fail. A positive feedback loop.',
      'With N retries per layer, amplification multiplies across layers: 3 layers × 3 attempts each = up to 27× load at the bottom.',
      'Exponential backoff spreads retries over time; jitter stops clients retrying in sync.',
      'Retry budgets cap retries to a small fraction (say 10%) of normal traffic. Circuit breakers stop calling a failing dependency.',
      'Only retry errors that might succeed next time, and only idempotent operations.'
    ],
    pitfall: 'Adding retries at every layer "for reliability". They are harmless when healthy and catastrophic exactly when the system is struggling.',
    say: 'Retries use exponential backoff with jitter and a retry budget, and only at one layer, so a brown-out doesn\'t turn into a storm.',
    cards: [],
    quiz: [
      ['Three service layers each retry up to 3 times (4 attempts). Worst-case amplification at the bottom?', ['64×', '12×', '4×', '9×'], '4 × 4 × 4 = 64 attempts for one user request.'],
      ['What does jitter add to exponential backoff?', ['Randomness, so clients do not all retry at the same instant', 'Longer waits', 'Fewer retries', 'Encryption'], 'Without jitter, clients that failed together retry together.'],
      ['Which request is safe to retry automatically?', ['An idempotent read that timed out', 'A payment POST with no idempotency key', 'A request that got 400 Bad Request', 'A request that got 403 Forbidden'], 'Retry only transient failures of idempotent operations. 4xx errors will fail again.']
    ],
    explain: ['Explain what a retry storm is and how to prevent one.', ['Failure → retries → more load → more failure (feedback loop)', 'Amplification multiplies across layers', 'Backoff with jitter', 'Retry budgets / circuit breakers / retry only idempotent + transient']],
    duck: ['Retries make things more reliable — how can they make an outage worse?', 'Why add randomness to the wait time?'],
    lab: { type: 'sim', sim: 'retry' }
  });

  T({
    id: '1.7', mod: '1', title: 'Timeouts', tag: 'Choosing them, and cascading timeouts',
    analogy: 'Deciding how long to wait for a late friend before ordering. No limit and you never eat; too short and you leave when they were round the corner.',
    points: [
      'No timeout means a slow dependency holds your slot forever. Every network call needs one.',
      'Set timeouts from the dependency\'s tail latency (around p99–p99.9), not its average.',
      'Too short → false failures and extra retries. Too long → slots pile up waiting and the slowness spreads upstream.',
      'Timeouts must shrink going down the call chain: if A waits 1 s for B, B must give up on C sooner — otherwise B does work nobody is waiting for.',
      'Deadline propagation: pass the remaining time budget with the request so every hop knows when to stop.'
    ],
    pitfall: 'Inner timeouts longer than outer ones. The caller has already given up and retried while the callee is still working on the original.',
    say: 'The edge has a 1 s budget, so the service call gets 700 ms and its database query 300 ms, with the deadline passed down so nothing works past it.',
    cards: [
      ['What should you base a timeout on?', 'The dependency\'s tail latency (roughly p99–p99.9) plus a margin — never the average.'],
      ['What goes wrong with a timeout that is too long, and one that is too short?', 'Too long: slots stay occupied waiting, so slowness cascades to callers. Too short: healthy-but-slowish requests fail and trigger retries, adding load.'],
      ['What is deadline propagation?', 'Sending the remaining time budget along with a request so each downstream hop can stop work once the original caller would have timed out.']
    ],
    quiz: [
      ['A calls B with a 1 s timeout; B calls C with a 5 s timeout. What is wrong?', ['B keeps working after A has given up, wasting capacity', 'Nothing — longer is safer', 'A should wait 10 s', 'C will be too fast'], 'Timeouts must get shorter as you go deeper.'],
      ['A dependency has p50 = 20 ms and p99 = 250 ms. A sensible timeout is around…', ['300 ms', '20 ms', '25 ms', '30 s'], 'Just above p99: it rarely cuts off healthy requests but still bounds the wait.'],
      ['Why does a missing timeout cause cascading failure?', ['Blocked callers run out of threads/connections and become slow themselves', 'It uses more memory per request', 'It breaks TLS', 'It doesn\'t'], 'Held slots are lost capacity, one layer at a time.']
    ],
    explain: ['Explain how you choose timeouts across a chain of services.', ['Every call needs a timeout — otherwise slots leak', 'Based on tail latency, not average', 'Too short vs too long failure modes', 'Timeouts shrink down the chain / deadline propagation']],
    duck: ['Why not set a generous 60-second timeout everywhere to be safe?', 'What is a "deadline" and how is it different from a timeout?']
  });

  T({
    id: '1.8', mod: '1', title: 'Circuit breakers', tag: 'Fail fast to protect recovery',
    analogy: 'The breaker in a fuse box. When a circuit is overloaded it trips and cuts the power rather than letting the wiring burn — and you test it before switching everything back on.',
    points: [
      'Closed: calls flow normally while failures are counted.',
      'Open: once failures cross a threshold, calls fail immediately without touching the dependency.',
      'Half-open: after a cool-down, a few probe calls are let through. Success closes the breaker; failure reopens it.',
      'Two benefits: the caller stops wasting slots on doomed calls, and the struggling dependency gets room to recover.',
      'Pair it with a fallback (cached value, default, degraded feature) so "fail fast" is not just "fail".'
    ],
    pitfall: 'A breaker with no fallback and no alerting. Users just see errors sooner, and nobody notices the breaker has been open for an hour.',
    say: 'Calls to the pricing service go through a circuit breaker; when it opens we serve the last cached price and flag it as possibly stale.',
    cards: [
      ['Name the three circuit breaker states and what each does.', 'Closed: calls pass, failures counted. Open: calls fail fast without calling the dependency. Half-open: a few probes are allowed to test recovery.'],
      ['What two things does a circuit breaker protect?', 'The caller (no slots wasted waiting on a failing dependency) and the dependency (load removed so it can recover).'],
      ['How does a breaker move from open back to closed?', 'After a cool-down it goes half-open and lets a few probes through; if they succeed it closes, if they fail it opens again.']
    ],
    quiz: [
      ['In the open state, a circuit breaker…', ['Rejects calls immediately without contacting the dependency', 'Lets all calls through', 'Queues calls until the dependency recovers', 'Retries each call three times'], 'Failing fast is the point: no waiting, no added load.'],
      ['Why is there a half-open state?', ['To test recovery with a few requests instead of releasing full traffic at once', 'To save memory', 'To log errors', 'To retry faster'], 'Full traffic on a barely-recovered service would knock it over again.'],
      ['How do circuit breakers differ from retries?', ['Retries add load hoping for success; breakers remove load when failure is likely', 'They are the same', 'Breakers add load', 'Retries stop calls'], 'They are complementary: retry transient blips, break on sustained failure.']
    ],
    explain: ['Explain how a circuit breaker works and why it helps a failing system recover.', ['Three states: closed, open, half-open', 'Trips on a failure threshold', 'Open = fail fast, sparing both caller and dependency', 'Half-open probes before closing; a fallback']],
    duck: ['Returning errors on purpose sounds bad. Why is it better?', 'How does the breaker know when it is safe to try again?'],
    lab: {
      type: 'order', brief: 'Order the life cycle of a tripping circuit breaker.',
      items: ['Closed: requests flow and failures are counted', 'Failure rate crosses the threshold', 'Open: calls fail fast without touching the dependency', 'Cool-down timer expires', 'Half-open: a few probe requests are allowed', 'Probes succeed, so the breaker closes']
    }
  });

  T({
    id: '1.9', mod: '1', title: 'Rate limiting', tag: 'Token bucket, windows, distributed',
    analogy: 'A nightclub bouncer with a clicker. The club has a capacity; past it, people wait outside — unpleasant for them, but the people inside can still breathe.',
    points: [
      'Token bucket: tokens refill at a steady rate up to a cap; each request spends one. Allows bursts up to the bucket size.',
      'Leaky bucket: requests drain at a constant rate — smooths output, no bursts.',
      'Fixed window: a counter per time window. Simple, but allows up to 2× the limit across a window boundary.',
      'Sliding window log: store each request timestamp — exact but memory-hungry. Sliding window counter: a weighted blend of two windows — a cheap approximation.',
      'Distributed limiting needs shared state (e.g. Redis with atomic operations) or accepts approximate per-node limits. Reject with 429 and a Retry-After header.'
    ],
    pitfall: 'Check-then-increment as two separate calls to the shared store. Concurrent requests both pass the check — the operation must be atomic.',
    say: 'Per-API-key token bucket in Redis, updated atomically, returning 429 with Retry-After when empty.',
    cards: [
      ['How does a token bucket work, and what does it allow that a leaky bucket does not?', 'Tokens refill at a fixed rate up to a capacity; each request consumes one and is rejected if none remain. It allows short bursts up to the bucket capacity.'],
      ['What is the boundary problem with fixed-window rate limiting?', 'A client can send the full limit at the end of one window and again at the start of the next — up to 2× the limit in a short span.'],
      ['What makes distributed rate limiting hard, and the usual solution?', 'Counters must be shared across servers and updated without races. Use a central store such as Redis with atomic operations, or accept approximate local limits.']
    ],
    quiz: [
      ['Which algorithm deliberately allows short bursts?', ['Token bucket', 'Leaky bucket', 'Sliding window log', 'None of them'], 'Saved-up tokens can be spent at once, up to the bucket size.'],
      ['Limit is 100/min using fixed windows. Worst case in a 2-second span across a boundary?', ['200 requests', '100 requests', '50 requests', '400 requests'], '100 at the end of one window plus 100 at the start of the next.'],
      ['Correct response when a client exceeds its limit?', ['429 Too Many Requests with Retry-After', '500 Internal Server Error', '200 OK with an empty body', '404 Not Found'], 'It tells the client it is being limited and when to try again.']
    ],
    explain: ['Explain how you would rate limit an API, including the algorithm and how it works across many servers.', ['Describes token bucket (rate + burst)', 'Contrasts with a window-based approach and its weakness', 'Shared state with atomic updates for distributed limiting', '429 + Retry-After']],
    duck: ['Why would you ever turn away a real user\'s request?', 'What is the difference between a burst and a sustained rate?'],
    lab: {
      type: 'sort', brief: 'Which algorithm is being described?', buckets: ['Token bucket', 'Fixed window', 'Sliding window log'],
      items: [['Allows short bursts up to the bucket size', 0], ['Can let through 2× the limit across a boundary', 1], ['Stores a timestamp for every request — exact but memory-heavy', 2], ['Two numbers per user: token count and last refill time', 0], ['A counter that resets every minute', 1], ['Most accurate for a strict "N per rolling minute" guarantee', 2]]
    }
  });

  T({
    id: '1.10', mod: '1', title: 'Backpressure', tag: 'Queues, load shedding, admission control',
    analogy: 'A restaurant that stops seating people when the kitchen is slammed. Turning guests away at the door is kinder than seating them and serving cold food two hours later.',
    points: [
      'Backpressure is the downstream telling the upstream to slow down, instead of silently drowning.',
      'Bounded queues are the basic mechanism: when full, the producer blocks, slows or gets rejected.',
      'Load shedding: under overload, reject some requests cheaply and early (503/429) so the rest are served well.',
      'Admission control: decide at the front door whether to accept work, ideally by priority — keep checkout, shed recommendations.',
      'Serving the newest requests first (or dropping the oldest) often helps: the oldest waiters have probably already timed out.'
    ],
    pitfall: 'An unbounded queue. It looks like resilience, but it just hides the overload until latency and memory blow up.',
    say: 'Queues are bounded; when they fill we shed low-priority traffic with a 503 at the edge rather than let everything slow down.',
    cards: [
      ['What is backpressure?', 'A mechanism by which an overloaded downstream component signals upstream producers to slow down or stop sending.'],
      ['Why is rejecting requests (load shedding) better than queueing them all?', 'Queued requests wait, time out and get retried — you spend capacity on work nobody will use. Rejecting early keeps latency good for the requests you do accept.'],
      ['Why are unbounded queues dangerous?', 'They hide overload: latency grows without limit, memory fills, and by the time work is processed the caller has given up.']
    ],
    quiz: [
      ['A service is at 150% of capacity. Best response?', ['Shed the excess early and serve the rest within SLO', 'Queue everything and process it eventually', 'Increase all timeouts', 'Add client retries'], 'Serving 100% of capacity well beats serving 150% badly.'],
      ['What does a bounded queue give you that an unbounded one does not?', ['A signal — "full" — that forces the producer to slow down or be rejected', 'More throughput', 'Lower memory use only', 'Guaranteed ordering'], 'The bound is what makes backpressure possible.'],
      ['Under overload, which traffic do you shed first?', ['Low-priority or non-critical requests', 'The newest requests always', 'Payments', 'Random 50% of everything'], 'Priority-aware admission control protects the critical paths.']
    ],
    explain: ['Explain backpressure and load shedding, and why turning requests away can be the right thing.', ['Downstream signals upstream to slow down', 'Bounded queues as the mechanism', 'Shed load early and cheaply under overload', 'Prioritise critical traffic / unbounded queues hide the problem']],
    duck: ['Why is dropping requests better than making people wait?', 'What is wrong with a really, really big queue?']
  });

})(SD.T);
