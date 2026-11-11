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
    refs: [
      ['sre-cascading-failures', 'The queue is already there — “Most thread-per-request servers use a queue in front of a thread pool to handle requests.”'],
      ['wikipedia-mmc-queue', 'Arrivals above capacity — “If the traffic intensity is greater than one then the queue will grow without bound”'],
      ['aws-bl-queue-backlogs', 'Queued work goes stale — “Work can be completed too late for the results to be useful, essentially causing the availability hit that queueing was meant to guard against.”'],
      ['aws-bl-queue-backlogs', 'Draining needs spare capacity — “Regardless of the given rate and processing capacity, recovering from the outage requires double the system’s capacity for another hour after the recovery.”'],
      ['exponent-anthropic-sd', 'Interview relevance (candidate reports) — “What happens when the message queue goes down? What if there are too many requests? What if there aren\'t enough to fill a batch?”']
    ],
    cards: [],
    quiz: [
      ['Capacity is 200 req/s. Traffic is 260 req/s for 30 s. Queue depth afterwards?', ['1,800', '7,800', '6,000', '60'], '(260 − 200) × 30 = 1,800.', 'calc'],
      ['After a spike, traffic returns to exactly the server\'s capacity. The backlog…', ['Never drains', 'Drains slowly', 'Drains at the service rate', 'Drains once the queue is full'], 'Draining needs spare capacity; at 100% there is none.', 'calc'],
      ['A 60 s spike has ended and arrivals are back to normal, yet p99 stays high for minutes. Most likely cause?', ['Requests are still queued behind the backlog, which drains slowly', 'The spike invalidated the cache, which is still refilling', 'Connections are in TCP slow start after the spike', 'Garbage collection is still catching up after the spike'], 'The backlog drains only at (capacity − arrival rate), and time in queue counts toward latency long after the spike has ended.', 'calc'],
      ['A server completes 200 req/s and has 3,000 requests queued, served oldest first. Clients give up after 10 s. What is the server mostly doing?', ['Finishing requests whose callers have already given up', 'Serving the newest requests first, so that most still succeed', 'Idling for most of each second until the backlog has cleared', 'Serving everyone within the timeout, just more slowly than usual'], 'A new arrival waits 3,000 ÷ 200 = 15 s, longer than any client waits, so what the server completes has already been abandoned. Work nobody is waiting for is pure waste: bound the queue, or drop work that has already expired.', ['aws-bl-load-shedding', 'aws-bl-queue-backlogs']]
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
      'Two servers with identical throughput can behave very differently: few fast slots (low latency, but little spare concurrency, so bursts queue) vs many slow slots (bursts fit without queueing, but every request is slow).',
      'When all slots are busy, new requests queue. Service time is the floor on latency; queueing adds on top.'
    ],
    pitfall: 'Quoting "requests per second" as if it were a configurable property. It is derived from concurrency and service time — change either and it moves.',
    say: 'Each instance has 50 worker threads and a 100 ms service time, so about 500 req/s per instance before queueing.',
    refs: [
      ['hi-core-concepts', 'Capacity arithmetic in interviews — “each server can handle maybe 5K requests, so we need around 10 servers plus some headroom.”'],
      ['nginx-core-worker-connections', 'A real "slot" setting — “Sets the maximum number of simultaneous connections that can be opened by a worker process.”'],
      ['sre-cascading-failures', 'Slower requests occupy more slots — “Because requests take longer to handle, more requests are handled concurrently (up to a possible maximum capacity at which queuing may occur).”'],
      ['triton-batchers', 'GPU batching — “try one or both of the following to trade off increased latency for increased throughput”'],
      ['triton-batchers', 'The batching delay is bounded — “the dynamic batcher will delay sending the batch as long as no request is delayed longer than the configured max_queue_delay_microseconds value”'],
      ['exponent-anthropic-sd', 'Interview relevance (candidate reports) — “Design an inference batching system. You have a single GPU that can process up to 100 inputs per batch.”']
    ],
    cards: [],
    quiz: [
      ['A server has 16 slots and a 200 ms service time. Throughput?', ['80 req/s', '3,200 req/s', '16 req/s', '32 req/s'], '16 × (1000 ÷ 200) = 80.', 'calc'],
      ['Two services each top out at 100 req/s: A has 10 slots at 100 ms, B has 100 slots at 1 s. Both run at 70% load when 20 extra requests arrive at once. Which is right?', ['B fits them into free slots, each taking ≥ 1 s; A queues them but serves each fast', 'They behave identically, because their maximum throughput is equal', 'A absorbs the burst without any queueing, because its service time is lower', 'B has the higher throughput, because it has ten times as many slots'], 'At 70%, A has 3 free slots and B has 30, so A queues most of the burst and B none. A still finishes them sooner: a short wait plus 100 ms beats B\'s 1 s. Same throughput, different latency-versus-concurrency trade-off.', 'calc'],
      ['A GPU model server runs 4 concurrent slots at 200 ms each. A new model version takes 400 ms. The fleet was sized for 70% utilisation. What now?', ['Capacity halves to 10 req/s per server, so the fleet is at 140%', 'Capacity is unchanged; only latency doubles', 'Capacity doubles, because each batch does more work', 'Utilisation rises to 85%'], 'Throughput = slots ÷ service time. Doubling service time halves capacity, and 70% becomes 140%.', 'calc'],
      ['A model server is configured to hold requests for up to 5 ms so it can form larger GPU batches. What is being traded?', ['A bounded queue delay per request, for higher throughput', 'Nothing — batching is free throughput on a GPU', 'Accuracy, which falls as the batch size grows', 'Throughput, in exchange for lower latency'], 'Batching raises throughput; waiting to fill batches adds latency, capped by the configured maximum queue delay.', ['triton-batchers']]
    ],
    explain: ['Explain how to work out a server\'s capacity from first principles.', ['Throughput = slots × (1 / service time)', 'What slots physically are', 'Same throughput can mean different latency/concurrency trade-offs', 'Busy slots → queueing']],
    duck: ['What is a "slot" in a real server?', 'How can two servers with the same throughput feel different?'],
    lab: { type: 'estimate', kinds: ['throughput', 'util'], n: 5 }
  });

  T({
    id: '1.3', mod: '1', title: 'Utilisation vs headroom', tag: 'Why you leave headroom',
    analogy: 'A motorway at 95% occupancy is not "efficient" — one car braking causes a jam that takes an hour to clear. Flow needs gaps.',
    points: [
      'Utilisation ρ = arrival rate ÷ capacity. Headroom is what is left.',
      'Latency rises non-linearly with utilisation. For a single server, time in system ≈ service time ÷ (1 − ρ): 2× at 50%, 10× at 90%, 100× at 99%. A pool of many slots queues far less at the same ρ, but hits the same wall closer to 100%.',
      'Arrivals and service times vary, so queues form well before 100%.',
      'Headroom is also your recovery capacity (draining backlogs) and your failure capacity (losing a node shifts its load onto the rest).',
      'Hence rules of thumb such as 60–70% at peak. The real ceiling comes from your failure model — to survive losing one of N equal zones you must stay under (N−1)/N, which is 66% for three — and from load testing rather than tradition.'
    ],
    pitfall: 'Running at 95% "to save money". There is nothing left to absorb a spike, a retry burst or a lost node.',
    say: 'I\'ll size for about 70% utilisation at peak so there\'s headroom for bursts and for losing an instance.',
    refs: [
      ['wikipedia-mm1-queue', 'Single-server time in system, 1/(μ − λ) — “The average response time or sojourn time (total time a customer spends in the system) does not depend on scheduling discipline and can be computed using Little\'s law as 1/(μ − λ).”'],
      ['wikipedia-kingman', 'Variability drives waiting — “The formula is the product of three terms which depend on utilization (U), variability (V) and service time (T).”'],
      ['mathijsen-pooling', 'Pooling — “Indeed Figure 1.1 shows that the reduction in expected waiting time can be substantial.”'],
      ['gregg-use-method', 'Where "70%" comes from — a rule of thumb — “Once their utilization is over 70%, queueing delays can become more frequent and noticeable.”'],
      ['aws-bl-static-stability', 'Headroom for losing a zone — “we overprovision such that each Availability Zone is operating at only 66 percent of the level for which we have load-tested it”'],
      ['sre-best-practices', 'Derive the target; do not inherit it — “Use load testing rather than tradition to establish the resource-to-capacity ratio”']
    ],
    cards: [],
    quiz: [
      ['For a single server, latency ≈ service time ÷ (1 − ρ). At 90% utilisation latency is about…', ['10× the service time', '1.9× the service time', '90× the service time', '1.1× the service time'], '1 ÷ (1 − 0.9) = 10.', ['wikipedia-mm1-queue']],
      ['Six instances across three zones each run at 80%. One zone (two instances) fails. The remaining four are at…', ['120% — overloaded', '100% — just enough', '90%', '80% — the balancer redistributes'], '6 × 80 = 480 units of load over 4 instances = 120%. To survive losing a third of the fleet you must stay at or below two-thirds utilisation.', 'calc'],
      ['Why do queues form at 80% average utilisation?', ['Arrivals and service times vary, so bursts momentarily exceed capacity', 'Load balancers add a fixed delay to each request', 'Servers throttle themselves above 75%', 'They do not — queueing needs over 100%'], 'Averages hide bursts. The more variable the arrivals and service times, the longer the wait at the same utilisation.', ['wikipedia-kingman', 'gregg-use-method']],
      ['A pool of 50 slots at 90% utilisation adds only a few percent to latency, while a single slot at 90% has 10× latency. What should you conclude?', ['Pooling pushes the knee much closer to 100%, but the wall is still there', 'Large pools can safely be run at 100% utilisation, since slots are shared', 'The single-server formula overstates queueing for every kind of system', 'Utilisation stops mattering once servers are pooled behind one queue'], 'With many slots, an arrival usually finds one free. Near saturation that stops being true: the same pool is at about 1.8× service time by 98%, and climbing fast.', ['wikipedia-mmc-queue', 'mathijsen-pooling']]
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
      'Use it to size concurrency: 1,000 req/s × 0.2 s = 200 requests in flight on average → you need comfortably more than 200 slots or connections (about 286 to sit at 70% utilisation).',
      'Use it backwards: if latency doubles at the same arrival rate, in-flight requests double — which is how slow dependencies exhaust thread pools.'
    ],
    pitfall: 'Sizing a connection pool from QPS alone. The pool size depends on QPS × time each connection is held.',
    say: 'At 2,000 QPS and a 50 ms query time, Little\'s Law gives 100 concurrent queries, so the pool needs to be comfortably above 100.',
    refs: [
      ['wikipedia-littles-law', 'The law — “the long-term average number of customers (L) in a stationary system is equal to the long-term average effective arrival rate (λ) multiplied by the average time that a customer spends in the system (W)”'],
      ['wikipedia-littles-law', 'Distribution-free — “The relationship is not influenced by the arrival process distribution, the service distribution, the service order, or practically anything else.”'],
      ['sre-cascading-failures', 'Slow dependencies raise concurrency — “Because requests take longer to handle, more requests are handled concurrently (up to a possible maximum capacity at which queuing may occur).”']
    ],
    cards: [],
    quiz: [
      ['500 req/s arrive and each takes 200 ms. Average requests in flight?', ['100', '2,500', '40', '700'], '500 × 0.2 = 100.', ['wikipedia-littles-law']],
      ['A dependency slows from 50 ms to 500 ms at constant traffic. In-flight requests…', ['Increase 10×', 'Stay the same', 'Decrease 10×', 'Double'], 'L = λW: tenfold W means tenfold L — which is how a slow dependency exhausts thread pools.', ['wikipedia-littles-law']],
      ['Little\'s Law requires…', ['A stable system — on average, arrivals do not exceed capacity', 'Poisson arrivals and exponential service times', 'Exactly one server working first-come-first-served', 'A queue that never holds more than a few requests'], 'It is distribution-free; it only needs the system to be in steady state.', ['wikipedia-littles-law']],
      ['An LLM endpoint receives 200 requests/s, and a response streams for 10 s on average. How many streams are in flight?', ['~2,000', '~20', '~200', '~20,000'], 'L = λW = 200 × 10 = 2,000. For long-lived requests it is concurrency — connections, memory, GPU sequence slots — rather than requests per second that you provision.', ['wikipedia-littles-law']],
      ['2,000 QPS at 50 ms per query, through a pool of 80 connections. What happens?', ['The pool caps out at 1,600 QPS, so requests queue for a connection', 'Nothing — 80 connections is ample for 50 ms queries', 'The database rejects the excess queries with errors', 'Throughput settles at 80 QPS, one per connection'], 'Little\'s Law says 2,000 × 0.05 = 100 concurrent queries are needed. 80 connections ÷ 0.05 s = 1,600 QPS at most, so the other 400/s wait and latency climbs without bound.', 'calc']
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
      'Least connections: sends to the server with the fewest in-flight requests — naturally steers away from a slow server. Its trap: a server that fails fast looks idle and attracts traffic, so pair it with ejection on error rate.',
      'Consistent hashing: same key → same server. For cache locality or sticky sessions, with minimal reshuffling when servers change.',
      'The slow-server problem: under round robin a degraded server still gets its full share, so its queue grows and it drags up tail latency.',
      'Health checks remove dead servers; they often miss slow ones. L4 balances connections; L7 understands requests.'
    ],
    pitfall: 'Assuming health checks protect you from a slow server. A server that answers pings but takes 5 s per request passes them.',
    say: 'I\'d use least-connections so a slow instance receives less traffic automatically, with health checks for dead instances and error-rate ejection for ones that fail fast.',
    refs: [
      ['nginx-http-load-balancing', 'Least connections — “least-connected — next request is assigned to the server with the least number of active connections”'],
      ['nginx-http-load-balancing', 'When least connections wins — “Least-connected allows controlling the load on application instances more fairly in a situation when some of the requests take longer to complete.”'],
      ['aws-bl-health-checks', 'Its trap: fast-failing servers — “some load-balancing algorithms, such as "least requests," give more work to the fastest server. When a server fails, it often begins failing requests quickly, creating a "black hole" in the service fleet”'],
      ['karger-consistent-hashing', 'Consistent hashing — “Roughly speaking, a consistent hash function is one which changes minimally as the range of the function changes.”'],
      ['envoy-load-balancers', 'Power of two choices — “P2C selection is particularly useful for load balancer implementations due to its resistance to herding behavior.”'],
      ['aws-bl-health-checks', 'Health checks miss slow servers — “Servers may slow down instead of failing, or they may respond faster than their peers, which is a sign that they’re returning false responses to their callers.”'],
      ['aws-nlb-docs', 'L4 balances connections — “Each individual TCP connection is routed to a single target for the life of the connection.”'],
      ['hi-core-concepts', 'Interview relevance — “Load balancing is another area interviewers love to probe.”']
    ],
    cards: [],
    quiz: [
      ['One of four servers becomes 10× slower. Which strategy limits the damage automatically?', ['Least connections', 'Round robin', 'Random', 'DNS round robin'], 'The slow server accumulates in-flight requests, so it is chosen less often.', ['sre-lb-datacenter', 'nginx-http-load-balancing']],
      ['You need requests for the same cache key to reach the same node. Use…', ['Consistent hashing', 'Round robin', 'Least connections', 'Weighted random'], 'It maps keys to nodes deterministically and moves few keys when nodes change.', ['karger-consistent-hashing', 'sre-lb-frontend']],
      ['Least-connections is in use. One backend starts answering every request with a 500 in 2 ms. What happens?', ['It looks least loaded and attracts more traffic — eject it on error rate', 'It receives less traffic, because errors count as load', 'Nothing changes; traffic stays evenly spread', 'The balancer retries its requests on the same backend'], 'A fast-failing server finishes requests quickly, so it always has the fewest in flight: a black hole. Liveness checks do not catch it either; watch error rates and eject outliers.', ['aws-bl-health-checks', 'sre-lb-datacenter']],
      ['Inference requests take anywhere from 200 ms to 60 s. Why does round robin do badly, and what is better?', ['It ignores in-flight work, so long requests pile up; use least connections', 'It sends too many requests to the fastest servers; use random', 'It cannot be used with streaming responses; use IP hash', 'Nothing — request cost averages out across the fleet'], 'When request cost varies widely, equal request counts do not mean equal load.', ['nginx-http-load-balancing', 'sre-lb-datacenter']],
      ['Several load balancers each independently send every request to the backend with the fewest connections. What goes wrong, and what is the standard fix?', ['They can all pick the same backend at once; choose the better of two random picks', 'Nothing — least-loaded is optimal however many balancers there are', 'Backends are starved of traffic; fall back to plain round robin', 'Their counts are too precise; refresh them less often'], '"Power of two choices" gets most of the benefit of least-loaded while avoiding the herd.', ['haproxy-power-of-two', 'envoy-load-balancers', 'mitzenmacher-power-of-two-choices']]
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
      'Retries at every layer multiply: three layers each making 4 attempts (3 retries) can turn one user action into 4³ = 64 attempts at the bottom. Retry at one layer only.',
      'Exponential backoff spreads retries over time; jitter stops clients retrying in sync.',
      'Retry budgets cap retries to a small fraction of traffic (Google uses 10% per client; Envoy defaults to 20%). Circuit breakers stop calling a failing dependency.',
      'Only retry errors that might succeed next time, and only idempotent operations.'
    ],
    pitfall: 'Adding retries at every layer "for reliability". They are harmless when healthy and catastrophic exactly when the system is struggling.',
    say: 'Retries use exponential backoff with jitter and a retry budget, and only at one layer, so a brown-out doesn\'t turn into a storm.',
    refs: [
      ['sre-cascading-failures', 'Amplification across layers — “the backend, frontend, and JavaScript layers all issue 3 retries (4 attempts), then a single user action may create 64 attempts (4^3) on the database”'],
      ['aws-bl-timeouts-retries', 'Retries are selfish — “Retries are "selfish." In other words, when a client retries, it spends more of the server\'s time to get a higher chance of success.”'],
      ['aws-bl-timeouts-retries', 'Jitter — “If all the failed calls back off to the same time, they cause contention or overload again when they are retried. Our solution is jitter.”'],
      ['sre-handling-overload', 'Retry budgets — “layering on the per-client retry budget (a 10% retry ratio) reduces the growth to just 1.1x in the general case”'],
      ['sre-handling-overload', 'Retry at one layer — “requests should only be retried at the layer immediately above the layer that is rejecting them”'],
      ['bronson-metastable-failures', 'Metastable failure — “Metastable failures occur in open systems with an uncontrolled source of load where a trigger causes the system to enter a bad state that persists even when the trigger is removed.”'],
      ['sre-cascading-failures', 'What not to retry — “Don’t retry permanent errors or malformed requests in a client, because neither will ever succeed.”'],
      ['hi-networking', 'Interview relevance — “In more senior interviews, you may be asked to elaborate about adding jitter.”']
    ],
    cards: [],
    quiz: [
      ['Three service layers each retry up to 3 times (4 attempts). Worst-case amplification at the bottom?', ['64×', '12×', '4×', '9×'], '4 × 4 × 4 = 64 attempts for one user request.', ['sre-cascading-failures']],
      ['1,000 clients fail at the same instant and retry with exponential backoff: 100 ms, 200 ms, 400 ms. What is still wrong?', ['They stay synchronised, so each wave arrives together — add jitter', 'Nothing — backoff alone prevents the spike', 'The delays should grow linearly', 'The first retry should be immediate'], 'Backoff spaces the waves out; jitter spreads each wave. Clients that failed together otherwise retry together.', ['aws-blog-exponential-backoff-jitter', 'aws-bl-timeouts-retries']],
      ['Which request is safe to retry automatically?', ['An idempotent read that timed out', 'A payment POST with no idempotency key', 'A request that got 400 Bad Request', 'A request that got 403 Forbidden'], 'Retry only transient failures of idempotent operations. A malformed or forbidden request will fail the same way again; overload responses (429, 503) can be retried after a delay, honouring Retry-After when it is sent.', ['sre-cascading-failures', 'rfc9110']],
      ['A 2-minute network blip triggers a retry storm. The network recovers, but the service stays down for an hour at normal user traffic. Why, and what ends it?', ['Retries alone keep load above capacity; cut load until it recovers', 'The network is still degraded; wait for it to settle', 'The service is under-provisioned; add replicas', 'The caches are cold; wait for them to refill'], 'A metastable failure: a feedback loop sustains the bad state after the trigger is gone. Recovery needs load pushed well below normal, or the retry policy changed.', ['bronson-metastable-failures']],
      ['Which control caps retry amplification however bad the failure gets?', ['A retry budget — for example, retries may be at most 10% of requests', 'More attempts per request, each with a shorter timeout', 'Exponential backoff on its own, without a budget', 'A larger connection pool on every client'], 'Backoff delays retries but each failing request still makes all its attempts. A budget bounds the total extra load.', ['sre-handling-overload']]
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
      'Set timeouts from the dependency\'s tail latency, not its average: choose the false-timeout rate you can accept (say 0.1%), take that percentile (p99.9), and add some padding.',
      'Too short → false failures and extra retries. Too long → slots pile up waiting and the slowness spreads upstream.',
      'Timeouts must shrink going down the call chain: if A waits 1 s for B, B must give up on C sooner — otherwise B does work nobody is waiting for.',
      'Deadline propagation: pass the remaining time budget with the request so every hop knows when to stop.'
    ],
    pitfall: 'Inner timeouts longer than outer ones. The caller has already given up and retried while the callee is still working on the original.',
    say: 'The edge has a 1 s budget, so the service call gets 700 ms and its database query 300 ms, with the deadline passed down so nothing works past it.',
    refs: [
      ['aws-bl-timeouts-retries', 'Every call needs one — “A best practice in Amazon is to set a timeout on any remote call, and generally on any call across processes even on the same box.”'],
      ['aws-bl-timeouts-retries', 'Choosing the value — “we choose an acceptable rate of false timeouts (such as 0.1%). Then, we look at the corresponding latency percentile on the downstream service (p99.9 in this example).”'],
      ['aws-bl-timeouts-retries', 'Too long — “Setting a timeout too high reduces its usefulness, because resources are still consumed while the client waits for the timeout.”'],
      ['sre-cascading-failures', 'Inner timeouts longer than outer ones — “server C processes the request thinking it has 15 seconds to spare, but is not doing useful work, since the request from server A to server B has already exceeded its deadline”'],
      ['sre-cascading-failures', 'Deadline propagation — “With deadline propagation, a deadline is set high in the stack (e.g., in the frontend). The tree of RPCs emanating from an initial request will all have the same absolute deadline.”'],
      ['grpc-deadlines', 'Deadlines in gRPC — “gRPC converts the deadline to a timeout from which the already elapsed time is already deducted”']
    ],
    cards: [
      ['What should you base a timeout on?', 'The dependency\'s tail latency — the percentile matching the false-timeout rate you accept, e.g. p99.9 for 0.1% — plus some padding. Never the average.'],
      ['What goes wrong with a timeout that is too long, and one that is too short?', 'Too long: slots stay occupied waiting, so slowness cascades to callers. Too short: healthy-but-slowish requests fail and trigger retries, adding load.'],
      ['What is deadline propagation?', 'Sending the remaining time budget along with a request so each downstream hop can stop work once the original caller would have timed out.']
    ],
    quiz: [
      ['A calls B with a 1 s timeout; B calls C with a 5 s timeout. What is wrong?', ['B keeps working after A has given up, wasting capacity', 'Nothing — a longer inner timeout is safer', 'A should wait at least 6 s', 'C will be cancelled too early'], 'Timeouts must get shorter as you go deeper.', ['sre-cascading-failures']],
      ['A dependency has p50 = 20 ms, p99 = 250 ms and p99.9 = 400 ms. You can accept about 0.1% false timeouts. A sensible starting timeout?', ['~400 ms — the percentile that matches the false-timeout rate you accept', '~20 ms — the typical response time', '~40 ms — twice the median', '30 s — never cut off a request that might succeed'], 'Choose an acceptable rate of false timeouts, then read the timeout off the matching latency percentile — not the average.', ['aws-bl-timeouts-retries']],
      ['Why does a missing timeout cause cascading failure?', ['Blocked callers run out of threads or connections and become slow themselves', 'It uses more memory per request', 'The dependency is retried indefinitely', 'Idle connections are closed by the load balancer'], 'Held slots are lost capacity, one layer at a time.', ['sre-cascading-failures', 'aws-bl-timeouts-retries']],
      ['The edge gives a request 1 s. The service has used 700 ms when it is about to call the database (timeout 500 ms). With deadline propagation, what should happen?', ['Call with the remaining ~300 ms — or not at all if none is left', 'Use the configured 500 ms; timeouts are per hop', 'Each hop gets a fresh 1 s', 'Return an error and let the edge retry'], 'A deadline is an absolute point in time carried with the request, so no hop works past the moment the caller stops waiting.', ['sre-cascading-failures', 'grpc-deadlines']],
      ['A timeout is 100 ms. Under load the dependency\'s p99 drifts to 150 ms, and clients retry twice. What is the timeout doing now?', ['Failing healthy-but-slow requests, whose retries add yet more load', 'Protecting the dependency from its slowest requests', 'Nothing — the retries hide the failures from users', 'Holding the dependency\'s p99 down to 100 ms'], 'A timeout set too tight turns slowness into extra load exactly when the dependency can least afford it.', ['aws-bl-timeouts-retries']]
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
      'Half-open: after a cool-down, a trial call (some implementations allow a few) is let through. Success closes the breaker; failure reopens it.',
      'Two benefits: the caller stops wasting slots on doomed calls, and the struggling dependency gets room to recover.',
      'Pair it with a fallback (cached value, default, degraded feature) so "fail fast" is not just "fail".'
    ],
    pitfall: 'A breaker with no fallback and no alerting. Users just see errors sooner, and nobody notices the breaker has been open for an hour.',
    say: 'Calls to the pricing service go through a circuit breaker; when it opens we serve the last cached price and flag it as possibly stale.',
    refs: [
      ['fowler-circuit-breaker', 'Closed → open — “Once the failures reach a certain threshold, the circuit breaker trips, and all further calls to the circuit breaker return with an error, without the protected call being made at all.”'],
      ['fowler-circuit-breaker', 'Half-open — “There is now a third state present - half open - meaning the circuit is ready to make a real call as trial to see if the problem is fixed.”'],
      ['fowler-circuit-breaker', 'Alert on it — “Usually you\'ll also want some kind of monitor alert if the circuit breaker trips.”'],
      ['fowler-circuit-breaker', 'Fallbacks — “failure to get some data may be mitigated by showing some stale data that\'s good enough to display”'],
      ['aws-bl-timeouts-retries', 'The cost: a second operating mode — “circuit breakers introduce modal behavior into systems that can be difficult to test, and can introduce significant addition time to recovery”'],
      ['aws-bl-avoiding-fallback', 'Fallbacks are rarely exercised — “It is easy to develop fallback strategies that rarely trigger in production.”'],
      ['hi-networking', 'Interview relevance — “Circuit breakers can be a great response when an interviewer is deep-diving on reliability, failure modes, or disaster recovery.”']
    ],
    cards: [
      ['Name the three circuit breaker states and what each does.', 'Closed: calls pass, failures counted. Open: calls fail fast without calling the dependency. Half-open: a few probes are allowed to test recovery.'],
      ['What two things does a circuit breaker protect?', 'The caller (no slots wasted waiting on a failing dependency) and the dependency (load removed so it can recover).'],
      ['How does a breaker move from open back to closed?', 'After a cool-down it goes half-open and lets a few probes through; if they succeed it closes, if they fail it opens again.']
    ],
    quiz: [
      ['A dependency is timing out on every call and the breaker in front of it has opened. What do callers experience now?', ['An immediate error or fallback, with no call made to the dependency', 'The same timeouts as before, now counted by the breaker', 'Requests held in a queue until the dependency recovers', 'Automatic retries against the dependency with backoff'], 'Failing fast is the point: no waiting, no added load.', ['fowler-circuit-breaker']],
      ['Why is there a half-open state?', ['To test recovery with a trial call before releasing full traffic', 'To give the dependency time to warm its caches', 'To retry the calls rejected while open', 'To reset the failure counter'], 'Full traffic on a barely-recovered service would knock it over again.', ['fowler-circuit-breaker']],
      ['How do circuit breakers differ from retries?', ['Retries add load hoping for success; breakers remove load when failure is likely', 'Breakers add load; retries remove it', 'They are the same mechanism at different layers', 'Retries protect the dependency; breakers protect only the caller'], 'They are complementary: retry transient blips, break on sustained failure.', ['fowler-circuit-breaker']],
      ['A breaker opens and the service switches to a fallback path that has rarely run in production. What is the risk?', ['The fallback is a rarely-tested mode that may fail when you need it', 'None — a fallback is simpler than the main path', 'The breaker cannot close again once a fallback runs', 'Fallbacks are always slower than the main path'], 'Fallbacks and breakers add a second operating mode that is hard to test and rarely exercised — and a fallback can itself amplify the problem. Exercise those paths deliberately.', ['aws-bl-avoiding-fallback', 'aws-bl-timeouts-retries']]
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
      'Leaky bucket (as a queue): requests are queued and drained at a constant rate — output is smooth, and bursts are delayed or dropped rather than passed through.',
      'Fixed window: a counter per time window. Simple, but allows up to 2× the limit across a window boundary.',
      'Sliding window log: store each request timestamp — exact but memory-hungry. Sliding window counter: a weighted blend of two windows — a cheap approximation.',
      'Distributed limiting needs shared state (e.g. Redis with atomic operations) or accepts approximate per-node limits. Reject with 429 and a Retry-After header.'
    ],
    pitfall: 'Check-then-increment as two separate calls to the shared store. Concurrent requests both pass the check — the operation must be atomic.',
    say: 'Per-API-key token bucket in Redis, updated atomically, returning 429 with Retry-After when empty.',
    refs: [
      ['wikipedia-token-bucket', 'Token bucket — “A conforming flow can thus contain traffic with an average rate up to the rate at which tokens are added to the bucket, and have a burstiness determined by the depth of the bucket.”'],
      ['figma-rate-limiting', 'Fixed-window boundary — “Although the fixed window approach offers a straightforward mental model, it can sometimes let through twice the number of allowed requests per minute.”'],
      ['cloudflare-rate-limiting', 'Sliding-window counter accuracy — “0.003% of requests have been wrongly allowed or rate limited”'],
      ['figma-rate-limiting', 'The read-then-write race — “In a distributed environment, the "read-and-then-write" behavior creates a race condition, which means the rate limiter can at times be too lenient.”'],
      ['redis-incr', 'Atomic updates in Redis — “This can be easily fixed by turning the INCR with optional EXPIRE into a Lua script that is then sent using the EVAL command”'],
      ['rfc6585', '429 — “The 429 status code indicates that the user has sent too many requests in a given amount of time ("rate limiting").”'],
      ['stripe-rate-limiters', 'Concurrency limits — “Instead of "You can use our API 1000 times a second", this rate limiter says "You can only have 20 API requests in progress at the same time".”'],
      ['anthropic-rate-limits', 'LLM APIs limit tokens as well as requests — “The rate limits for the Messages API are measured in requests per minute (RPM), input tokens per minute (ITPM), and output tokens per minute (OTPM) for each model class.”'],
      ['anthropic-rate-limits', '…using a token bucket — “The API uses the token bucket algorithm to do rate limiting. This means that your capacity is continuously replenished up to your maximum limit, rather than being reset at fixed intervals.”'],
      ['hi-ratelimiter', 'What senior interviews probe — “E5 candidates should move quickly through basic algorithm discussion to spend time on distributed systems challenges”']
    ],
    cards: [
      ['How does a token bucket work, and what does it allow that a leaky bucket used as a queue does not?', 'Tokens refill at a fixed rate up to a capacity; each request consumes one and is rejected if none remain. It allows short bursts up to the bucket capacity.'],
      ['What is the boundary problem with fixed-window rate limiting?', 'A client can send the full limit at the end of one window and again at the start of the next — up to 2× the limit in a short span.'],
      ['What makes distributed rate limiting hard, and the usual solution?', 'Counters must be shared across servers and updated without races. Use a central store such as Redis with atomic operations, or accept approximate local limits.']
    ],
    quiz: [
      ['An API allows 100 requests/min per key and must tolerate a client that has been idle sending 20 requests in one second. Which algorithm fits?', ['Token bucket — unused allowance accrues up to the bucket size and can be spent as a burst', 'Leaky bucket as a queue — it releases at a constant rate', 'Fixed window with a one-second window', 'Sliding window log with one request per 600 ms'], 'The bucket size sets the burst; the refill rate sets the sustained limit.', ['wikipedia-token-bucket', 'stripe-rate-limiters']],
      ['The limit is 100/min using fixed windows. Worst case in a 2-second span across a boundary?', ['200 requests', '100 requests', '50 requests', '400 requests'], '100 at the end of one window plus 100 at the start of the next.', ['figma-rate-limiting']],
      ['Correct response when a client exceeds its limit?', ['429 Too Many Requests with Retry-After', '503 Service Unavailable', '403 Forbidden', '200 OK with an error in the body'], 'It tells the client it is being limited and when to try again.', ['rfc6585']],
      ['An LLM API limits each key to 1,000 requests/min. One customer sends 900 requests/min, each with a 150k-token prompt, and saturates the GPUs. What is missing?', ['A limit on tokens per minute — the unit that tracks cost', 'A lower request limit for everyone', 'A fixed window in place of the token bucket', 'Nothing; the customer is under the limit'], 'Requests differ in cost by orders of magnitude. LLM APIs limit both requests and tokens per minute.', ['anthropic-rate-limits']],
      ['Twenty gateway nodes enforce a shared limit by reading a counter from Redis, checking it, then writing it back plus one. Under load, clients exceed the limit. Why?', ['Read-then-write is a race; use one atomic increment instead', 'Redis drops writes under load unless persistence is on', 'The limit should have been divided across the 20 nodes', 'The gateways\' clocks have drifted apart'], 'Concurrent requests read the same value and all pass. The check and the update must be a single atomic operation.', ['figma-rate-limiting', 'redis-incr']]
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
    refs: [
      ['aws-bl-load-shedding', 'Load shedding — “The goal of load shedding is to keep latency low for the requests that the server decides to accept so that the service replies before the client times out.”'],
      ['aws-bl-load-shedding', 'Goodput — “Throughput is the total number of requests per second that is being sent to the server. Goodput is the subset of the throughput that is handled without errors and with low enough latency”'],
      ['sre-handling-overload', 'Shed by priority — “As utilization approaches configured thresholds, we start rejecting requests based on their criticality (higher thresholds for higher criticalities).”'],
      ['sre-cascading-failures', 'Bounded queues — “it is usually better to have small queue lengths relative to the thread pool size (e.g., 50% or less), which results in the server rejecting requests early”'],
      ['sre-cascading-failures', 'LIFO and CoDel under overload — “last-in, first-out (LIFO) or using the controlled delay (CoDel) algorithm [Nic12] or similar approaches can reduce load by removing requests that are unlikely to be worth processing”'],
      ['aws-bl-queue-backlogs', 'Fresh work first — “Real time systems often are implemented with FIFO-ish queues, but prefer LIFO-ish behavior.”']
    ],
    cards: [
      ['What is backpressure?', 'A mechanism by which an overloaded downstream component signals upstream producers to slow down or stop sending.'],
      ['Why is rejecting requests (load shedding) better than queueing them all?', 'Queued requests wait, time out and get retried — you spend capacity on work nobody will use. Rejecting early keeps latency good for the requests you do accept.'],
      ['Why are unbounded queues dangerous?', 'They hide overload: latency grows without limit, memory fills, and by the time work is processed the caller has given up.']
    ],
    quiz: [
      ['A service is at 150% of capacity. Best response?', ['Shed the excess early and serve the rest within SLO', 'Queue everything and process it eventually', 'Increase every timeout', 'Add client retries'], 'Serving 100% of capacity well beats serving 150% badly.', ['aws-bl-load-shedding']],
      ['What does a bounded queue give you that an unbounded one does not?', ['A signal — "full" — that forces the producer to slow down or be rejected', 'Higher peak throughput for the same workers', 'Guaranteed first-in-first-out ordering', 'Protection against processing a message twice'], 'The bound is what makes backpressure possible.', ['sre-cascading-failures']],
      ['Under overload, which traffic do you shed first?', ['Low-priority or non-critical requests', 'Whatever arrived most recently', 'A random half of everything', 'The largest requests'], 'Priority-aware admission control protects the critical paths.', ['sre-handling-overload', 'stripe-rate-limiters']],
      ['An overloaded server works its queue oldest-first. Clients give up after 2 s and the queue holds 5 s of work. How much of what it completes is useful, and what helps?', ['Almost none — serve newest-first, or drop expired requests', 'All of it; oldest-first is fair', 'About half; add retries', 'Almost none; raise the client timeout to 10 s'], 'Every request it reaches has already been abandoned. Under overload, the newest requests are the ones most likely to still matter.', ['sre-cascading-failures', 'aws-bl-queue-backlogs']],
      ['During overload, throughput holds at 100% of capacity, yet users see almost total failure. Which metric exposes this?', ['Goodput — responses delivered while the client is still waiting', 'CPU utilisation on the servers', 'Requests received per second at the edge', 'Queue length sampled once a minute'], 'The server is busy, but on work that arrives too late. Shedding load keeps goodput up.', ['aws-bl-load-shedding']]
    ],
    explain: ['Explain backpressure and load shedding, and why turning requests away can be the right thing.', ['Downstream signals upstream to slow down', 'Bounded queues as the mechanism', 'Shed load early and cheaply under overload', 'Prioritise critical traffic / unbounded queues hide the problem']],
    duck: ['Why is dropping requests better than making people wait?', 'What is wrong with a really, really big queue?']
  });

})(SD.T);
