// "More detail" for the key ideas of each topic: one entry per key idea, [text, source keys or 'calc'].
// Shown under each key idea on the Learn station (js/app.js). Checked by tools/check-content.mjs.
window.SD = window.SD || {}; SD.deep = SD.deep || {};
SD.deep["1.1"] = [
 [
  "Finite capacity means a component can work on only so many things at once. When one more arrives there are exactly two options: make it wait, or turn it away. Waiting is a queue, whether or not anyone designed one. Google's SRE book describes the usual server shape: requests come in, sit on a queue, and threads from a pool pick them off and do the work; when the queue is full, the server usually rejects new requests.\n\nThe same pattern sits one level down, in the operating system. The backlog argument to listen() sets the maximum length of the kernel's queue of connections that are established but not yet accepted by your program. Linux silently caps it at a system setting whose default is 4096 since kernel 5.4 (128 before that).\n\nSo a single request can wait in several places before any of your code runs: the kernel's accept queue, then the server's request queue, then once more for a database connection. Where it bites: a timer that starts inside your handler never sees those earlier waits, so the server can report healthy latency while clients see slow responses. Each hidden queue needs a deliberate bound.",
  [
   "sre-cascading-failures",
   "man-listen"
  ]
 ],
 [
  "Treat the queue like a bank balance. Each second, arrivals are deposits and completed requests are withdrawals; the queue is the running balance. Take a server that completes 200 req/s while 250 req/s arrive. Every second 250 go in and 200 come out, so 50 are left over. Nothing is broken: the server is finishing work at full speed. After 60 s the balance is 50 × 60 = 3,000.\n\nTwo things follow from the formula. First, only the excess matters: 250 against a capacity of 200 does the same damage as 1,050 against 1,000. Second, growth is linear in time, so a small excess that lasts beats a large one that does not: 10 req/s over for ten minutes leaves 10 × 600 = 6,000 waiting, while 100 req/s over for 30 s leaves 3,000.\n\nThe number you usually want next is the wait a new arrival faces: depth ÷ service rate = 3,000 ÷ 200 = 15 s. The same arithmetic tells you how long a bounded queue buys you. A queue capped at 1,000 fills in 1,000 ÷ 50 = 20 s; after that the server must reject, which is the honest signal that it is overloaded.",
  "calc"
 ],
 [
  "The growth formula runs in reverse. A backlog shrinks at (service rate − arrival rate), the spare capacity. In the topic's example the spike leaves 3,000 queued and traffic settles 20 req/s below capacity, so draining takes 3,000 ÷ 20 = 150 s: a one-minute spike costs two and a half more minutes of slowness. With traffic exactly at capacity the spare is zero, every completed request is replaced by a new arrival, and the 3,000 stay put indefinitely.\n\nThe AWS Builders' Library puts this at outage scale. If processing stops for an hour while messages keep arriving, you need double the system's capacity for another hour to catch up: one unit for the live traffic and one for the hour of debt. It also gives a sharper example: if a traffic surge runs for 30 minutes before an operator mitigates it, and the queued volume is ten times what the consumers were scaled for, working through it takes 300 minutes. Their conclusion is that even short spikes can turn into multi-hour recoveries.\n\nThis is why \"how fast does it recover?\" is a capacity question. The only ways to drain faster are to add capacity, admit less new work, or throw queued work away.",
  [
   "aws-bl-queue-backlogs"
  ]
 ],
 [
  "What a caller experiences is waiting time plus service time, and the server's own health says nothing about the first part. The SRE book works an example: a queue ten times the size of the thread pool, with 100 ms of handling per request. When that queue is full, a request takes 1.1 seconds, almost all of it spent queued, although every thread is doing its 100 ms of work exactly as designed. CPU, error rate and per-request handling time all look normal.\n\nIt gets worse once the wait passes the caller's patience. The same chapter describes a request with a 10-second deadline that spends 11 seconds getting from the queue to a thread: the client has already given up, so the server is doing work for which, in their words, no credit will be granted. Behind 3,000 requests at 200 req/s the wait is 15 s, so a server like that is busy and useless at once.\n\nHence the practical advice. Measure latency where the wait is included; AWS measures the age of messages in the queue for this reason. Keep queues short relative to the pool (the SRE book suggests 50% or less for steady traffic) so overload shows up as fast rejections instead of slow successes.",
  [
   "sre-cascading-failures",
   "aws-bl-queue-backlogs"
  ]
 ]
];
SD.deep["1.2"] = [
 [
  "Start with one slot. If each request occupies it for 100 ms and requests run back to back, the slot finishes 1 ÷ 0.1 s = 10 requests per second. Slots work independently, so ten of them finish 10 × 10 = 100 per second. That is the whole formula: throughput is a count of slots multiplied by how often each one turns over, like tills multiplied by customers per till per minute.\n\nIt is a ceiling, reached only when every slot is busy all the time. It also moves whenever either input moves. Double the service time to 200 ms and the same ten slots give 50 req/s, with no change in traffic or hardware.\n\nUsed in an interview: 50 worker threads at 100 ms is 50 × 10 = 500 req/s per instance. For 50,000 req/s that is 100 instances flat out, or 100 ÷ 0.7 ≈ 143 if you want them at 70%.\n\nWhere it bites: the formula assumes each slot really works in parallel. Fifty threads doing pure CPU work on 8 cores do not give 50 slots; the cores are the slots and the threads mostly wait for a core. Always ask what a request is actually holding while it is being served.",
  "calc"
 ],
 [
  "A slot is anything a request must hold for its entire duration, and that the system has a fixed number of. The supermarket till is the picture, but real servers have several kinds of till at once.\n\nIn nginx the setting is worker_connections: the maximum number of simultaneous connections one worker process can open, 512 by default. The documentation warns that the number counts all connections, including those to proxied servers and not only clients, so a proxied request can use up two of them, one facing the client and one facing the upstream. On a GPU model server the slots are batch positions. Triton's dynamic batcher combines separate inference requests into one batch, up to a maximum batch size you choose per model, and spreads those batches over the configured model instances.\n\nWhere it bites: a request usually needs several kinds of slot, and the scarcest kind sets capacity. A service with 200 worker threads and a pool of 20 database connections has 20 slots, not 200, for any request that needs the database; the other 180 threads can only wait. Finding the binding slot is the first step of any capacity estimate.",
  [
   "nginx-core-worker-connections",
   "triton-batchers"
  ]
 ],
 [
  "Take the two servers from the quiz. A has 10 slots at 100 ms; B has 100 slots at 1 s. Both top out at 100 req/s. At 70 req/s, A has about 7 slots busy and 3 free, and B has about 70 busy and 30 free (busy slots = arrival rate × service time).\n\nNow 20 requests arrive at once. On B all 20 find a free slot immediately, nobody queues, and each finishes 1 s later. On A three start at once and 17 queue. A frees a slot roughly every 10 ms, so even the last of the 17 starts within a few hundred milliseconds and finishes well under 1 s. A queued and still won on latency.\n\nSo the shapes fail differently. A's weakness is concurrency: with only 3 spare slots, anything that holds a slot longer than planned (a slow dependency, a long request) eats its capacity quickly. B's weakness is that latency is poor by construction and it carries ten times as many requests in flight, each holding memory and connections. Long-running work such as streamed model responses is shape B whether you like it or not.",
  "calc"
 ],
 [
  "Latency for one request is the wait for a slot plus the service time. The second part is what the request costs even on an empty server, so nothing you do to queues can go below it; the first part is zero until every slot is busy.\n\nA worked case: 10 slots at 100 ms, all busy, five requests already waiting. Slots free up about every 10 ms, so the sixth in line waits about 60 ms and then takes its 100 ms: 160 ms. The SRE book notes that with perfectly constant request rate and handling time there would be no reason to queue at all, because a constant number of threads would be occupied. Queues come from overload and from unevenness.\n\nSometimes the wait is added on purpose. Triton's dynamic batcher, by default, does not delay requests when forming batches. Give it a delay and it holds requests so others can join the batch, never keeping one longer than the configured max_queue_delay_microseconds; the documentation describes this as trading increased latency for increased throughput.\n\nWhere it bites: when p99 is many times the service time, faster code is the wrong fix. The time is going to waiting, and the remedy is more slots, less load or a shorter queue.",
  [
   "sre-cascading-failures",
   "triton-batchers"
  ]
 ]
];
SD.deep["1.3"] = [
 [
  "Utilisation is the fraction of your capacity that is in use. Take 10 slots at 100 ms each, so capacity is 100 req/s. If 70 req/s arrive, ρ = 70 ÷ 100 = 0.7. Read it two ways: on average 7 of the 10 slots are busy, or each slot is busy 70% of the time. Queueing theory uses the second reading; for a single server, ρ is the average proportion of time the server is occupied. Headroom is the remaining 30 req/s.\n\nThree traps hide in that simple ratio. First, capacity is derived from service time, so ρ can move with no change in traffic: if a new model version takes 200 ms, capacity falls to 50 req/s and the same 70 req/s is now ρ = 1.4, which is overload. Second, ρ is an average over some window. A service at 40% over the whole day may be at 80% during the evening peak, and peak is what you size for. Third, it must be measured against the resource that runs out first. CPU at 30% means little if the connection pool is at 95%.\n\nQueues are only stable while ρ stays below 1; the rest of this topic is about how far below.",
  [
   "wikipedia-mm1-queue"
  ]
 ],
 [
  "For one server with random arrivals, the average time in the system is 1 ÷ (μ − λ), where μ is the service rate and λ the arrival rate. Divide top and bottom by μ and you get service time ÷ (1 − ρ). The denominator is the fraction of time the server is idle, and idle moments are the only chance a queue has to shrink. At 90% that chance is a tenth of the time; at 99%, a hundredth.\n\nWith a 100 ms service time: 200 ms at 50%, 1 s at 90%, 10 s at 99%. The curve bends hard near the end: going from 90% to 95% is under 6% more traffic and doubles latency, from 10× to 20×.\n\nA pool behaves better because an arrival waits only if every slot is busy. Evaluating Erlang's C formula, which assumes the same random arrivals: 10 slots at 90% give about 1.7× the service time, 50 slots at 90% about 1.07×. But 50 slots at 98% give 1.8×, and at 99% 2.8×. The wall has moved right, not disappeared.\n\nWhere it bites: these are averages under tidy assumptions. Burstier traffic makes every figure worse, so treat them as the optimistic case.",
  [
   "wikipedia-mm1-queue",
   "wikipedia-mmc-queue"
  ]
 ],
 [
  "With clockwork arrivals and identical requests, a server at 80% would never queue. Queues before 100% come entirely from unevenness, and Kingman's formula says how much. Average wait ≈ ρ ÷ (1 − ρ) × (ca² + cs²) ÷ 2 × service time, where ca and cs are the coefficients of variation (standard deviation ÷ mean) of the gaps between arrivals and of the service times.\n\nWork it at ρ = 0.8 with a 100 ms service time. The utilisation term is 0.8 ÷ 0.2 = 4. In the clockwork case both coefficients are 0 and the wait is 0. With typical randomness, both 1, the wait is 4 × 1 × 100 = 400 ms. If a few requests are far slower than the rest, so cs = 2, the middle term is (1 + 4) ÷ 2 = 2.5 and the wait is 1 s, at the same 80%.\n\nAverages hide the cause. Brendan Gregg describes a customer with CPU latency problems whose monitoring never showed above 80%; it reported five-minute averages, and the CPUs were hitting 100% for seconds at a time.\n\nThe practical lever: cutting variability (separating slow requests from fast ones, capping request size) buys latency just as adding capacity does.",
  [
   "wikipedia-kingman",
   "gregg-use-method"
  ]
 ],
 [
  "Headroom does two jobs beyond keeping queues short, and both are simple arithmetic.\n\nRecovery. A backlog drains at capacity minus arrivals, which is the headroom. Take a service with 1,000 req/s of capacity that stalls for 30 s. Running at 70%, 700 req/s arrive, so 21,000 pile up; afterwards the spare 300 req/s clears them in 21,000 ÷ 300 = 70 s. Running at 95%, 28,500 pile up and the spare 50 req/s needs 28,500 ÷ 50 = 570 s. The same half-minute stall costs about one minute of degraded service in the first case and nearly ten in the second.\n\nFailure. When one of N equal nodes dies, its traffic lands on the others, so each survivor's utilisation is multiplied by N ÷ (N − 1). Four nodes at 70% become three at 93%: unpleasant but standing. Four nodes at 80% become three at 107%, which is overload, so the failure of one node becomes the failure of all four. Larger fleets are more forgiving per node: ten nodes at 80% become nine at 89%.\n\nThe two combine badly. A node failure usually leaves a backlog as well, so the survivors need room for the extra share and for the drain at the same moment.",
  "calc"
 ],
 [
  "The (N − 1)/N rule is the failure arithmetic turned into a ceiling. If one of N equal zones can vanish, the rest must carry everything, so each may run at most (N − 1)/N of what it can handle: 50% with two zones, 66% with three, 75% with four. AWS states the same thing from the buying side: with three Availability Zones they overprovision by 50%, so each zone operates at 66% of the level it was load-tested for. The spare capacity is provisioned before any failure instead of being launched during one, which is what they mean by static stability.\n\nNote the phrase \"load-tested\". The 66% is a fraction of a measured limit, not of a guessed one. Google's SRE book makes this point: use load testing rather than tradition, because a cluster that handled Y queries per second three months ago may not do so after the system has changed.\n\nThe familiar 70% is softer. In Brendan Gregg's USE method it appears as a rule of thumb with two stated reasons: an average of 70% can hide short bursts of 100%, and resources that cannot be interrupted mid-operation, such as hard disks, start to show more frequent and noticeable queueing delays beyond it.",
  [
   "aws-bl-static-stability",
   "sre-best-practices",
   "gregg-use-method"
  ]
 ]
];
SD.deep["1.4"] = [
 [
  "The three letters: L is how many requests are inside the system at a typical instant, λ is how many enter per second, and W is how long one stays, on average. \"The system\" is whatever box you draw: a queue, a thread pool, a whole service.\n\nWhy it must be true is bookkeeping. Imagine every request clocks up one \"request-second\" for each second it spends inside. Watch for a long time T. About λ × T requests pass through, each clocking W, so the total is λ × T × W request-seconds. But the same total is also the average number present multiplied by T. Set them equal, cancel T, and L = λ × W. The units agree: requests per second × seconds = requests.\n\nThe Wikipedia article works it in the other direction. A queue-depth meter shows nine jobs waiting on average; add the one being served, so ten in the system. Throughput is 50 per second. The mean response time must be 10 ÷ 50 = 0.2 s, with nobody having timed a single request.\n\nOne caution: these are long-term averages. At any given moment the count can sit well above L, which is why the law tells you where to start sizing and not where to stop.",
  [
   "wikipedia-littles-law"
  ]
 ],
 [
  "The bookkeeping argument never asks how requests arrive or how long each takes, only that everything entering eventually leaves. That is why, in Wikipedia's words, the relationship is not influenced by the arrival process distribution, the service distribution, the service order, or practically anything else. Bursty traffic, a mix of 5 ms and 5 s requests, priorities: the averages still obey L = λW. Compare the latency formulas for utilisation, which lean on assumptions about randomness.\n\nIt also applies to systems within systems. The article's example is a bank branch: the customer line is one subsystem, each teller another, and the law holds for each one and for the whole. For a server, apply it to the queue alone (waiting requests = arrival rate × average wait) or to a connection pool (connections in use = query rate × time each is held).\n\nWhat \"stable\" excludes: if arrivals exceed capacity the backlog grows forever, time in system has no long-run average, and there is nothing for the law to relate. The article also specifies the effective arrival rate, so requests you reject at the door do not count towards λ.\n\nWhere it bites: the law is about averages. It will not give you p99 latency or peak concurrency.",
  [
   "wikipedia-littles-law"
  ]
 ],
 [
  "The 200 comes straight from the law: 1,000 requests enter each second and each stays 0.2 s, so 1,000 × 0.2 = 200 are inside at a typical instant. That is an average, and the count swings around it. With exactly 200 slots you would be at 100% utilisation, where any swing above the mean queues and never clears. So divide by the utilisation you want: 200 ÷ 0.7 ≈ 286 slots.\n\nCheck it with the capacity formula: 286 slots ÷ 0.2 s = 1,430 req/s, and 1,000 ÷ 1,430 = 70%. The two formulas are one equation read in two directions.\n\nThe usual mistake is using the wrong W. W is how long the slot is held, not the latency of the whole request. If a 200 ms request holds a database connection for only 50 ms of it, the pool needs 1,000 × 0.05 = 50 connections on average, about 71 at 70%, not 286.\n\nThe same sum explains why long-lived work is sized by concurrency: 200 requests per second that each stream for 10 s means 2,000 open streams.",
  "calc"
 ],
 [
  "Rearranged, the law says that when λ is fixed, L moves in step with W. Users set λ: they keep sending requests at the same rate whether or not you are slow. So when each request takes longer, the only thing that can give is the number in flight.\n\nWorked through: 500 req/s call a dependency that answers in 50 ms. In flight: 500 × 0.05 = 25, in a pool of 200 threads, about 12% used. The dependency degrades to 500 ms. Now 500 × 0.5 = 250 threads are needed and only 200 exist. The pool is exhausted with no increase in traffic and no errors from the dependency, only slowness. Every other endpoint that shares the pool now queues too, including ones that never call the slow dependency.\n\nThe SRE book lists what the extra in-flight requests consume: memory, active threads, file descriptors and backend resources, almost everything.\n\nThis is what a timeout is for in capacity terms: it caps W, and so caps L. With a 100 ms timeout on that call, the worst case is 500 × 0.1 = 50 threads, and the damage stays inside one feature. The interviewer's follow-up is usually a separate pool per dependency, which fences the damage in the same way.",
  [
   "sre-cascading-failures"
  ]
 ]
];
SD.deep["1.5"] = [
 [
  "Round robin is a counter: request 1 to server A, 2 to B, 3 to C, then back to A. It needs no information from the servers, which is why it is the default in nginx. What it equalises is the number of requests each server is handed, and that equals load only if every request costs the same and every server is equally fast.\n\nGoogle's SRE book reports how far reality is from that. Round robin was their most common policy for years, and they found it could leave a spread of up to 2x in CPU consumption between the least and the most loaded task. Their reasons: the most expensive requests in many services use 1000x or more the CPU of the cheapest, and the cost often cannot be predicted in advance; machines in one datacenter differ in speed; and tasks vary unpredictably, for instance needing significantly more resources for a few minutes after a restart.\n\nDealing cards is the picture: everyone gets the same number of cards, and nobody checks who is still holding a full hand.\n\nIt remains a sensible choice when servers are identical and stateless and requests are short and uniform. The interview follow-up is always what happens when one of those assumptions breaks.",
  [
   "sre-lb-datacenter",
   "nginx-http-load-balancing"
  ]
 ],
 [
  "The balancer cannot see a server's CPU, but it knows how many requests it has sent to each one that have not yet come back. That count is a free load signal. A server holding 12 unfinished requests is, for whatever reason, slower or busier than one holding 3, so the next request goes to the 3. nginx describes the result as controlling load more fairly when some requests take longer to complete.\n\nWhy it steers away from a slow server: in-flight count = request rate × time per request. A server that takes ten times as long builds up ten times the count at the same rate, so it stops being picked until the counts level out, which happens when it is receiving roughly a tenth of the traffic. Nobody had to detect that it was slow.\n\nThe trap is that the signal measures how quickly requests end, not whether they succeeded. A server answering every request with an error in 2 ms always has the lowest count. AWS calls this a black hole that attracts more requests than healthy servers, and Google's SRE book calls it sinkholing. Their fixes: slow failed requests down to the latency of successful ones, or count recent errors as if they were active requests.",
  [
   "nginx-http-load-balancing",
   "aws-bl-health-checks",
   "sre-lb-datacenter"
  ]
 ],
 [
  "The obvious way to pin a key to a server is hash(key) mod N. It works until N changes. Go from 4 servers to 5 and a key stays put only if its hash gives the same remainder under both, which holds for 4 of every 20 hash values. So 80% of keys move, and a cache fleet loses most of its contents.\n\nConsistent hashing fixes the remapping. In Envoy's ring hash, each host is placed on a circle by hashing its address, and each request is hashed onto the same circle and sent to the nearest host clockwise. A new host takes over only the arc just before it; in the words of the original paper by Karger and colleagues, the only items that move are those now closest to the new bucket, and nothing moves between old buckets. Envoy states the outcome as: adding or removing one host from N affects only 1/N of requests.\n\nA few points on a circle land unevenly, so each host is inserted many times: in Envoy's example, 100 entries for one host and 200 for one with twice the weight.\n\nWhere it bites: the choice ignores load. A single very hot key sends all its traffic to one server regardless of how busy it is.",
  [
   "envoy-load-balancers",
   "karger-consistent-hashing"
  ]
 ],
 [
  "Put numbers on it. Four servers each have 15 slots at 100 ms, so each can do 150 req/s. Total traffic is 400 req/s, and round robin hands each server 100 req/s: 67% utilisation, comfortable.\n\nOne server degrades and now takes 200 ms per request, perhaps a noisy neighbour, or a recent restart; the SRE book notes a restarted task often needs significantly more resources for a few minutes. Its capacity halves to 75 req/s. Round robin does not know and keeps sending 100. The excess is 25 req/s, so its queue grows by 1,500 requests every minute and the wait on that server climbs without limit.\n\nNow look at the fleet. Total capacity is 150 × 3 + 75 = 525 req/s against 400 of load, plenty to spare. The spare capacity sits on the three healthy servers and round robin cannot use it. Meanwhile one request in four is routed to the sick server, so the damage shows not only in p99 but in everything above the 75th percentile.\n\nThat is the point to make in an interview: the fleet is not overloaded, the routing is wrong. A policy that reads in-flight counts would shift the surplus 25 req/s onto the healthy three, which would then run near 108 req/s each.",
  [
   "sre-lb-datacenter"
  ]
 ],
 [
  "A basic health check asks a narrow question. AWS describes liveness checks as testing basic connectivity to a service and the presence of a server process, performed by a load balancer or monitoring agent that knows nothing about how the application works. A server taking 5 s per request still accepts the connection and still has a process, so it passes. AWS lists slowing down instead of failing among the unanticipated failure modes, and recommends anomaly detection for them: compare each server with its peers and flag the one behaving oddly.\n\nL4 versus L7 is about what the balancer can see. A Network Load Balancer works at layer 4: it picks a target by hashing the connection's addresses and ports, and each TCP connection goes to a single target for its whole life. If a client opens one connection and sends ten thousand requests down it, every one lands on the same server; the balancer balanced one thing. A layer 7 balancer reads each HTTP request, so it can spread requests individually and route by content, for example API calls to one service and page requests to another.\n\nThe follow-up to expect: long-lived connections behind an L4 balancer end up unevenly loaded, and balancing request by request needs L7.",
  [
   "aws-bl-health-checks",
   "aws-nlb-docs",
   "hi-core-concepts"
  ]
 ]
];
SD.deep["1.6"] = [
 [
  "The loop needs two ingredients: a service whose capacity is fixed, and clients whose demand goes up when it fails. Bronson and colleagues give a small worked case. A web app sends one database query per user request, plus one retry if no answer arrives within 1 s. The database is fast below 300 queries per second and about ten times slower above that. The app runs happily at 280 QPS. A 10 s network outage hits; when it clears, the lost requests and their retries arrive together and push the database past 300, so it turns slow, so every query times out, so every query is retried: 280 × 2 = 560 QPS.\n\nThe outage is over, user traffic is unchanged, and the database is still drowning, because the retries alone now keep it above its limit. The paper calls this a metastable failure and says it lasts until load is cut significantly or the retry policy is changed. That is why the fix in an incident is shedding load, not waiting. The same policy that was harmless at 280 QPS is what holds the system down.",
  [
   "bronson-metastable-failures",
   "aws-bl-timeouts-retries"
  ]
 ],
 [
  "Multiplication happens because each layer treats the layer below as a single call that failed, and has no idea how many attempts were hidden inside it. Take Google's example of JavaScript calling a frontend, which calls a backend, which calls an overloaded database, each making 4 attempts. The backend tries the database 4 times and reports one failure. The frontend sees that one failure and calls the backend again, 4 times in all, so the database has now seen 4 × 4 = 16. The JavaScript does the same to the frontend: 16 × 4 = 64. The general rule is the product of attempts per layer, so depth hurts exponentially: five such layers would be 4⁵ = 1,024.\n\nIf only the backend retries, the worst case is 4. Google's rule is that a request is retried only by the layer immediately above the one rejecting it. To make that work, the rejecting layer's answer has to say which kind of failure it is: they return a distinct \"overloaded; don't retry\" error that every layer above passes straight up instead of trying again.",
  [
   "sre-cascading-failures",
   "sre-handling-overload"
  ]
 ],
 [
  "Backoff and jitter fix two different things. Exponential backoff means each wait is a multiple of the last (100 ms, 200 ms, 400 ms), usually up to a cap. That lowers how often each client knocks. But clients that failed in the same instant compute the same waits, so they come back as a crowd at 100 ms, again at 300 ms, again at 700 ms. Marc Brooker's AWS simulation shows exactly this picture: the calls get rarer, but they still arrive in clusters with idle gaps between them, and the total work barely drops.\n\nJitter adds randomness to each wait. As an illustration, instead of sleeping exactly 400 ms, sleep a random time between 0 and 400 ms; now 1,000 clients are smeared across that interval, roughly 2.5 per millisecond, rather than landing in one spike. In Brooker's test with 100 contending clients, adding jitter cut the number of calls by more than half and finished sooner. Interviewers at senior level often ask the follow-up: backoff alone, what is still wrong? The answer is synchronisation.",
  [
   "aws-blog-exponential-backoff-jitter",
   "hi-networking"
  ]
 ],
 [
  "Backoff only delays retries; a request that keeps failing still makes all its attempts, so total load still multiplies. A budget limits the total. Google describes two. The per-request budget is three attempts: if a request has failed three times, the failure goes up to the caller. On its own that still lets traffic grow to just under 3× when most requests are rejected. The per-client budget is a ratio: each client tracks what fraction of its outgoing requests are retries and only retries while that fraction is below 10%. Send 1,000 requests and you may add at most about 100 retries, so worst-case load is about 1.1×, however bad the failure.\n\nThe nice property is that it needs no tuning for healthy times: when few calls fail, every one of them gets its retry; when everything fails, retries almost vanish. Amazon does a similar thing with a local token bucket: calls retry freely while tokens remain, then at a fixed rate. Amazon also notes the trade-off with circuit breakers: they add a second mode of behaviour that is hard to test.",
  [
   "sre-handling-overload",
   "aws-bl-timeouts-retries"
  ]
 ],
 [
  "A retry is a bet that the next attempt will go differently. That is only true when the cause was temporary: a dropped packet, a server mid-restart, a brief overload. A malformed request or a permission error fails the same way every time, so retrying it is pure extra load; Google's advice is not to retry permanent errors or malformed requests because neither will ever succeed. This is why the server should use distinct response codes for retriable and non-retriable conditions: the client can only decide well if it is told which one it hit.\n\nIdempotency is the second test. A timeout does not tell you the request failed; it tells you that you did not hear back. The server may have charged the card and lost the reply. An idempotent operation is one where doing it twice has the same effect as once, so the retry is safe: reads usually are, creating a resource may not be. Amazon's example is the EC2 RunInstances API, which provides an explicit token-based mechanism so that a repeated call is safe.",
  [
   "sre-cascading-failures",
   "aws-bl-timeouts-retries"
  ]
 ]
];
SD.deep["1.7"] = [
 [
  "A server handles requests with a fixed number of slots: threads, connections in a pool, memory. A call with no timeout keeps its slot until the other side answers, and a hung dependency never answers. Work it through: a service has 200 worker threads and receives 100 requests per second, each of which calls a dependency that has just stopped responding. Every arriving request takes a thread and never returns it, so all 200 are gone in 2 seconds. From then on the service cannot even answer requests that have nothing to do with that dependency. One stuck call has become a whole stuck service, and its own callers start queueing behind it.\n\nThis is easy to do by accident, because 'wait forever' is often the default: gRPC sets no deadline unless you ask for one. Amazon's practice is a timeout on any remote call, and generally on any call across processes even on the same machine, covering both the connection and the request. Google adds that with no deadline, a problem that passed long ago can keep consuming server resources until the server restarts.",
  [
   "aws-bl-timeouts-retries",
   "grpc-deadlines",
   "sre-cascading-failures"
  ]
 ],
 [
  "A timeout is a cut across the dependency's latency distribution: every healthy call slower than the line gets thrown away. So the question is not 'how long does a call take?' but 'what share of good calls am I willing to kill?' Take a dependency with p50 = 20 ms, p99 = 250 ms, p99.9 = 400 ms. A timeout of 40 ms, twice the median, sounds generous but fails every call in the slow tail, well over 1% of healthy traffic. Set it at 400 ms and you cut off 1 call in 1,000. Amazon's method is exactly that: pick the false-timeout rate, then read off the matching percentile.\n\nThe padding matters when the distribution is tight, with p99.9 close to p50: a small shift in latency then pushes a large share of calls over the line at once. Two more traps from the same article: the percentile must include network time if clients are far away, and it must cover what the timer really measures. One Amazon system with a roughly 20 ms timeout saw failures after every deployment, because the timer included setting up a new secure connection.",
  [
   "aws-bl-timeouts-retries"
  ]
 ],
 [
  "Both failure modes come from simple arithmetic. Too long: the number of slots tied up waiting is roughly arrival rate × time held. At 100 requests per second against a dependency that has stalled, a 30 s timeout holds 100 × 30 = 3,000 slots; a 1 s timeout holds 100. Most services do not have 3,000 spare threads, so the long timeout turns the dependency's problem into the caller's, and then into the caller's caller's. Amazon's wording is that a timeout set too high loses its usefulness because resources are still consumed while the client waits.\n\nToo short: suppose the timeout is 100 ms and, under load, the dependency's typical latency drifts to 150 ms. The work is still succeeding, but the caller discards every answer and retries, so the dependency now gets several times the traffic while already slow. Amazon lists this as the worst risk of a low timeout: a small rise in backend latency leading to a complete outage because all requests start being retried. There is no safe side to err on; the value has to come from measured latency.",
  [
   "aws-bl-timeouts-retries"
  ]
 ],
 [
  "When a caller times out, it stops listening; nothing automatically tells the callee to stop working. So any time a lower hop is allowed to run longer than the hop above it, the difference is work whose result has nowhere to go. Google's example: A calls B with a 10 s deadline. B takes 8 s to start, then calls C with a hardcoded 20 s. C picks the request up 5 s later, which is 13 s in. A gave up 3 s ago, but C believes it has 15 s to spare and does the full job. During an overload this is the worst possible use of capacity: the busiest servers are busy producing answers nobody will read.\n\nRetries make the sum stricter. If B makes up to 3 attempts at C with a 300 ms timeout each, B may spend 900 ms on C alone, so A's timeout for B must be longer than that plus B's own work, or A gives up mid-retry. A quick check in a design review: walk down the chain and confirm attempts × per-try timeout at each hop fits inside the budget of the hop above.",
  [
   "sre-cascading-failures"
  ]
 ],
 [
  "Hand-tuned per-hop timeouts are static guesses; they cannot know how much time this particular request has already used. Deadline propagation replaces them with one clock set at the top. In Google's example, A picks a 30 s deadline and works for 7 s before calling B, so B's call carries 23 s. B works 4 s and calls C with 19 s. Every server in the tree is counting down to the same instant, and each should check the time left before starting another stage and stop if there is none. Google also suggests trimming the outgoing deadline by a few hundred milliseconds to allow for network transit.\n\nA deadline is a point in time; a timeout is a duration. Sending a wall-clock time between machines is fragile because their clocks may disagree, so gRPC sends the remaining duration instead, with elapsed time already subtracted. Propagation is on by default in gRPC's Java and Go libraries and must be enabled in C++. One caveat: gRPC cancels the call when the deadline passes, but your handler must still check for cancellation and stop its own long-running work.",
  [
   "sre-cascading-failures",
   "grpc-deadlines"
  ]
 ]
];
SD.deep["1.8"] = [
 [
  "A breaker is a small wrapper object around the call to a dependency, living in the caller's process. While closed it passes every call through and only watches the outcome. In Martin Fowler's reference implementation that is one counter: a timeout adds one, any success resets it to zero, and the threshold is 5. So it trips on five failures in a row, not five failures ever.\n\nTwo design choices hide in 'failures are counted'. First, which failures: Fowler notes that not every error should count, because some are normal results the caller handles as ordinary logic. A 'user not found' says nothing about the dependency's health; a timeout or refused connection does. Second, how to count: a consecutive counter is easy but a busy service rarely sees five in a row when half its calls fail, so real breakers often use a rate, for example tripping at a 50% failure rate, and may use different thresholds for different errors, such as 10 for timeouts but 3 for connection failures. The follow-up to expect is 'what is your threshold and over what window?'",
  [
   "fowler-circuit-breaker"
  ]
 ],
 [
  "Open is simply the wrapper refusing to make the call. Once the threshold is crossed, every call returns an error straight away, without the protected call being made at all. No network packet is sent and no thread waits.\n\nThe value is clearest by comparing with what came before. Suppose the dependency is hanging and the caller's timeout is 1 s. Without a breaker, each request waits a full second to learn what the previous hundred already learned; at 200 requests per second that is 200 threads permanently parked. With the breaker open, the same request gets its error in microseconds and the thread is free. The breaker is a memory of recent failures shared across requests, which a per-request timeout cannot be.\n\nIt can also trip on signals other than errors. Fowler describes running calls on a thread pool and breaking when the pool is exhausted, or, for asynchronous work, when the queue fills up. Whatever the trigger, he says a state change should be logged and usually alerted on, and that operators should be able to trip or reset a breaker by hand.",
  [
   "fowler-circuit-breaker"
  ]
 ],
 [
  "An open breaker has a problem: if it never calls the dependency, it can never find out the dependency is back. A building's fuse box solves this with a person flipping the switch. Software wants it automatic, so the breaker records the time of the last failure, and once a reset timeout has passed it enters half-open. The next call is let through as a real trial. If it succeeds, the failure count resets and the breaker is closed. If it fails, the timer restarts and the breaker is open again for another interval. In Fowler's code half-open is not stored anywhere; it is just 'over threshold, and the timeout has elapsed'.\n\nWhy a single trial rather than releasing everything: a dependency that has just come back is usually at its weakest, and the full backlog of traffic arriving at once can push it straight over again. The trial is a cheap probe; the worst case is one more failed request per interval. The tuning question is the cool-down length: too short and you keep poking a sick service, too long and you keep serving errors or fallbacks after it has recovered.",
  [
   "fowler-circuit-breaker",
   "hi-networking"
  ]
 ],
 [
  "The two benefits go to different parties, and it helps to say both. For the caller, a failing remote call does not fail quickly; it often hangs until a timeout. Fowler's warning is that with many callers on an unresponsive supplier you run out of critical resources, and the failure cascades across systems. The breaker turns a slow failure into a fast one, so the caller's threads stay available for everything else it does.\n\nFor the dependency, an overloaded service is in the retry-storm loop: it is slow, so callers time out and retry, so it is slower. An open breaker takes this caller's load off entirely, which is the room it needs to work through its backlog or restart cleanly. Hello Interview's example is a database being brought back one instance at a time while a firehose of retries keeps the first instance from ever starting.\n\nThe honest caveat, from Amazon: a breaker gives the system a second mode of behaviour that is difficult to test and can add significant time to recovery. That is why some teams prefer limiting retries with a token bucket instead.",
  [
   "fowler-circuit-breaker",
   "hi-networking",
   "aws-bl-timeouts-retries"
  ]
 ],
 [
  "A breaker only decides not to call; what the user sees is up to the code around it. Fowler's examples: put a credit card authorisation on a queue to deal with later, or show stale data that is good enough to display. The question to ask per feature is whether a degraded answer is acceptable (a cached price flagged as old, a generic list instead of a personalised one) or whether it must fail visibly.\n\nThe trap is a fallback that is heavier than the thing it replaces. Amazon's own story, from around 2001: web servers read shipping speeds through a local cache and, if the cache was unhealthy, fell back to querying the supply chain database directly. It worked for months. Then the caches all failed around the same time, every web server hit the database, the database locked up, and the whole site and the fulfilment centres went down. A partial outage became a total one because of the fallback.\n\nAmazon's lessons: a fallback that rarely runs is likely to hide bugs, so either exercise it continuously in production or prefer a path that needs no fallback, such as data already pushed to the server.",
  [
   "fowler-circuit-breaker",
   "aws-bl-avoiding-fallback"
  ]
 ]
];
SD.deep["1.9"] = [
 [
  "Nothing actually drips. An implementation stores two numbers per client, the token count and the time of the last request, and does the refill lazily when the next request arrives: tokens = min(capacity, tokens + seconds since last request × refill rate). If at least one token is there, take it and allow; otherwise reject and leave the count alone. Figma describes exactly this layout as a small hash per user in Redis.\n\nThe two parameters control different things. Take 100 requests per minute with a bucket of 20: that is 1.67 tokens per second. A client that has been idle has a full bucket and can send 20 at once; after that it is held to 1.67 per second. Over any stretch of T seconds it can never get more than 20 + 1.67 × T through, so the long-run average is the refill rate and the bucket depth is the burst allowance.\n\nThis is the default choice for public APIs. Stripe gives every user a bucket, and Anthropic's API uses it too, describing capacity as continuously replenished up to the maximum rather than reset at fixed intervals. A cost-weighted variant charges more than one token for an expensive request.",
  [
   "wikipedia-token-bucket",
   "figma-rate-limiting",
   "stripe-rate-limiters",
   "anthropic-rate-limits"
  ]
 ],
 [
  "Picture a funnel: however fast you pour, it comes out of the bottom at one speed, and if you pour too fast it overflows. Requests go into a bounded queue and a worker takes them out at a fixed pace. Say the drain rate is 10 per second and the queue holds 30. A burst of 50 arrives at once: 30 are queued, 20 overflow and are rejected, and the last queued request waits about 3 seconds. Downstream sees a perfectly even 10 per second, which is the point: Wikipedia describes this version as not allowing the output to be bursty at all. A token bucket given the same burst would pass the allowed part through immediately.\n\nSo the trade is smoothness for latency. It fits work where a steady pace matters more than a fast answer, such as feeding a fragile downstream. It fits interactive APIs badly, because a queued request may be answered after its caller has timed out.\n\nBeware the name. There are two algorithms called leaky bucket. The other, 'leaky bucket as a meter', is a counter that rises with each request and decays over time; it is the mirror image of a token bucket and does allow bursts. Cloudflare describes that one and notes the stock NGINX module uses it. In an interview, say which you mean.",
  [
   "wikipedia-token-bucket",
   "cloudflare-rate-limiting"
  ]
 ],
 [
  "The implementation is one counter whose key includes the window: for example user:1234 plus the current minute. Each request increments it and is rejected if the result exceeds the limit; the key is set to expire so old windows clean themselves up. Its appeal is that the whole thing is a single atomic increment, with no read-then-write step. Redis documents this pattern directly.\n\nThe weakness is that windows are aligned to the clock, not to the client. The counter forgets everything at the boundary. Figma's example: with a limit of 5 per minute, a user sends 5 at 11:00:59 and 5 more at 11:01:00. Each window saw only 5, so both were legal, yet 10 requests landed within about a second. Scale that up and a 100-per-minute limit can admit 200 in two seconds, which is exactly the spike the limit was meant to stop. Cloudflare makes the same complaint: the reset is arbitrary and lets regular traffic spikes through, a problem for resource-intensive endpoints.\n\nYou can patch it by adding a second, shorter limit, say 2 per second alongside 5 per minute, but Figma judged that this overcomplicates the limiter.",
  [
   "figma-rate-limiting",
   "redis-incr",
   "cloudflare-rate-limiting"
  ]
 ],
 [
  "The log keeps one timestamp per request, for instance in a Redis sorted set. On each request, drop entries older than the window and count what is left. That count is exactly the number of requests in the last rolling minute, so there is no boundary trick. The price is memory proportional to the limit. Figma's estimate: 500 requests per day for 10,000 users is 5,000,000 stored values, about 20 MB at 4 bytes each, for one rule.\n\nThe counter version keeps only two numbers: the count for the current fixed window and for the previous one. It then assumes the previous window's requests were spread evenly and counts the part of it that still overlaps the rolling window. Cloudflare's example, with a limit of 50 per minute: 42 requests last minute, 18 so far this minute, and we are 15 seconds in. Three quarters of the previous minute still overlaps, so the estimate is 42 × 0.75 + 18 = 49.5; one more request and the client is limited.\n\nThe even-spread assumption is the only source of error. Measured on 400 million requests, Cloudflare found 0.003% wrongly allowed or limited.",
  [
   "figma-rate-limiting",
   "cloudflare-rate-limiting"
  ]
 ],
 [
  "With many gateway nodes, a client's requests land on different machines, so the count must live somewhere they all see. The classic bug is doing that in two steps. Figma's case: one token is left; two servers each read 'one token', each decide to allow, each write back zero. Two requests passed on one token. The fix is to make read, decide and update a single operation inside the store: an atomic increment for counter-style limiters, or a Lua script in Redis for a token bucket, since Redis runs the script as one step.\n\nThe alternative is no shared state: divide the limit across nodes. With a limit of 100 per minute and 20 nodes, each allows 5. That is fast and has no shared dependency, but if the load balancer sends one client's traffic unevenly, a node rejects at 5 while the client is well under 100 overall.\n\nShared state also brings a failure question interviewers ask: if the store is down, do you fail open (let everything through, risking overload) or fail closed (reject everything)? Finally, the rejection itself: status 429 means too many requests in a given time, and the standard lets the server add Retry-After to say how long to wait.",
  [
   "figma-rate-limiting",
   "hi-ratelimiter",
   "rfc6585"
  ]
 ]
];
SD.deep["1.10"] = [
 [
  "Every pipeline has a slowest stage. If producers send faster than it can work, the difference has to go somewhere: into a buffer that grows, into rising latency, or back to the producer as a signal to slow down. Backpressure is choosing the third on purpose. The signal can be a rejection (a 429 or 503), a producer that blocks on a full queue, or a throttle that tightens as the backlog grows; Amazon describes measuring a workload's queue depth and scaling its inbound limit down in proportion.\n\nWhy silence is worse: an upstream that hears nothing keeps sending, and the excess becomes a debt. Amazon's worked example: a traffic spike goes unthrottled for 30 minutes at 10 times what the consumers can process. The producer side queued everything happily, and the system then needs 300 minutes to work through the backlog. A half-hour spike became a five-hour outage of freshness.\n\nIt is not always the right choice. Amazon says its order-processing systems prefer to accept orders and let a backlog build, then prioritise behind the scenes, rather than refuse a customer. So the interview answer is: decide per workload whether to slow the producer or to absorb and sort later.",
  [
   "aws-bl-queue-backlogs"
  ]
 ],
 [
  "A queue converts overload into waiting time, and its length sets how much. Google's example: a server whose queue is 10 times the size of its thread pool, with each request taking 100 ms on a thread. When the queue is full, a new request waits behind ten rounds of work and takes 1.1 seconds in total, almost all of it spent queued. Make the queue 100 times the pool and the same server answers in about 10 seconds, long after most callers have gone. Unbounded is this with no ceiling, and memory use grows along with it.\n\nSo the bound is a decision about the longest wait worth offering. Google's guidance for steady traffic is a queue that is small relative to the thread pool, 50% or less, so the server rejects early when it cannot keep up; it notes Gmail often runs queueless servers and relies on failing over to another task instead. Bursty traffic justifies a larger queue, sized from the burst size and processing time.\n\nA queue only helps with short bursts where the average rate is below capacity. If arrivals exceed capacity on average, no queue size saves you; it only delays the moment you find out.",
  [
   "sre-cascading-failures"
  ]
 ],
 [
  "The key distinction is throughput versus goodput: how many requests the server is handling versus how many it answers correctly and fast enough for the client to use. An overloaded server stays busy, but as latency passes the client's timeout its answers arrive to nobody. Amazon's illustration: when median latency equals the client timeout, half of all requests time out, so availability is 50% even though the server is working flat out. Then the clients retry, raising load further.\n\nRun the numbers on a server that can do 1,000 requests per second within the deadline and is offered 1,500. Without shedding, everything slows until most responses miss the timeout and goodput heads towards zero. With shedding, it rejects 500 immediately and serves 1,000 on time: 67% of users succeed, and the other 33% learn at once rather than after a long wait.\n\nThe catch is that a rejection must cost far less than a real answer. Amazon load-tests well past the breaking point for this reason, having found a stray log statement or socket setting can make dropping a request needlessly expensive. Google notes that if rejections are numerous enough, a backend can be overloaded by rejecting alone.",
  [
   "aws-bl-load-shedding",
   "sre-handling-overload"
  ]
 ],
 [
  "Shedding at random treats a checkout and a background sync as equal. Admission control adds a label to each request and a rule for which labels go first. Google's RPC system carries one of four criticality values: CRITICAL_PLUS, CRITICAL, SHEDDABLE_PLUS (the default for batch jobs, which can retry minutes or hours later) and SHEDDABLE. An overloaded task rejects the lower levels sooner, and the label is passed along automatically to every downstream call the request triggers, so the whole chain agrees on what matters.\n\nStripe does the same with four categories: critical methods, POSTs, GETs and test-mode traffic, shed from the bottom up. It also always reserves a fraction of the fleet for critical requests: with a 20% reservation, non-critical requests beyond their 80% share get a 503. One lesson they report is to shed and restore slowly, or the system flaps between fine and overloaded.\n\nTwo details people miss. Amazon points out the most important request of all is the load balancer's health-check ping: fail it and the server is taken out of rotation, shrinking the fleet mid-overload. And the label should be set at the front door, where the system knows who is asking.",
  [
   "sre-handling-overload",
   "stripe-rate-limiters",
   "aws-bl-load-shedding"
  ]
 ],
 [
  "First-in-first-out is fair when the queue is short. Under overload it guarantees the server always works on the request that has waited longest, which is the one most likely to have been abandoned. Take the quiz's numbers: clients give up after 2 seconds and the queue holds 5 seconds of work. Oldest-first, every request the server picks up is already 5 seconds old, so every answer goes to a caller who has left. The server is at 100% utilisation with zero goodput, and each of those callers has probably retried, adding to the queue.\n\nNewest-first flips it: the request that arrived a moment ago is served while its caller is still waiting. The old ones starve, but they were lost either way. Google's example is a web search queued for 10 seconds: the user has likely refreshed and sent a new request, so answering the first is pointless. The same source names CoDel (controlled delay) as an alternative and says these work well combined with deadline propagation, so expired requests are dropped rather than processed.\n\nAmazon reports the same preference from customers of queue-based systems: when there is a backlog, process fresh data immediately and work through the accumulated data as capacity allows.",
  [
   "sre-cascading-failures",
   "aws-bl-queue-backlogs"
  ]
 ]
];
