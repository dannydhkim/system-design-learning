// "More detail" for the key ideas of each topic: one entry per key idea, [text, source keys or 'calc'].
// Shown under each key idea on the Learn station (js/app.js). Checked by tools/check-content.mjs.
window.SD = window.SD || {}; SD.deep = SD.deep || {};
SD.deep["4.1"] = [
 [
  "A single server runs out in several separate ways. Microsoft's sharding guide lists them: disk space, computing power for concurrent queries, and network bandwidth. You can swap in bigger disks, more memory and faster processors, but each has a largest size you can buy, which is why the guide says scaling up only postpones the limits \"temporarily\". Until then it is the cheap move, because the software still sees one machine and nothing has to be redesigned.\n\nThe failure argument is arithmetic. Two machines that each carry half the load lose 50% of capacity when one dies; ten machines lose 10%. AWS's reliability guidance says the same thing in words: replace one large resource with several small ones so that they do not share a common point of failure.\n\n\"Divisible\" is the catch. Web requests from different users are independent, so any number of machines can share them. A single ledger that every write must update in order is not: ten machines still queue for the same ledger. The interview follow-up is usually \"which part of your design cannot be split this way?\", and the answer is almost always the component that holds shared, changing data.",
  [
   "azure-sharding",
   "aws-wa-rel-design-principles"
  ]
 ],
 [
  "A session is data about one user that has to survive between their requests: who is logged in, what is in the cart. If a server keeps it in its own memory, the cart exists on that one server only. With one server nobody notices. With four behind a load balancer, the next request has a three-in-four chance of reaching a server that has never heard of this user.\n\nSticky sessions are the patch: the load balancer keeps sending each visitor to the server that holds their session. The Twelve-Factor App rules this out, because a process can never assume that anything it cached in memory or on disk will still be there for a later request. A deploy, a config change or the platform moving the process restarts it, and a restart wipes local state. Stickiness also pins users to servers, so a new instance receives only new visitors and removing an instance logs its users out.\n\nThe fix is to move the session into a store every instance can reach. Twelve-Factor suggests a datastore with time-expiration such as Memcached or Redis; AWS lists ElastiCache and DynamoDB. Local memory and disk remain fine as scratch space within one request.",
  [
   "12factor-processes",
   "aws-wa-stateless"
  ]
 ],
 [
  "The USL is C(N) = N ÷ (1 + α(N − 1) + βN(N − 1)), where C(N) is throughput relative to one node. The denominator is the tax on adding nodes. The α term is queueing: Gunther calls it contention, waiting for a shared resource, and each of the other N − 1 nodes may be ahead of you in the queue. The β term is coherency: nodes exchanging data point to point so that their copies agree. There are N(N − 1) ordered pairs of nodes, so this cost grows with the square of N while capacity grows only with N.\n\nTake α = 0.05 and β = 0.001. The peak is at √(0.95 ÷ 0.001) = √950 ≈ 31 nodes, where C = 31 ÷ (1 + 1.5 + 0.93) ≈ 9.0. At 100 nodes, C = 100 ÷ (1 + 4.95 + 9.9) ≈ 6.3: more than three times the hardware for 30% less throughput.\n\nIn practice you do not derive α and β; you fit them. Gunther says about half a dozen load-test measurements are enough, and the relative sizes of the two fitted values tell you whether to hunt for a contended resource or for cross-node chatter.",
  [
   "gunther-usl"
  ]
 ],
 [
  "N is the number of instances that can carry peak traffic; the + 2 are spares for two things going wrong at once. Google's wording is that you provision for a simultaneous planned and unplanned outage: one instance is out for a rollout or kernel upgrade (planned) and, while it is out, another crashes (unplanned). The rule is stated for the largest two instances, so if instances differ in size it is the two biggest you must be able to lose. Google also allows that the N survivors may be serving in a degraded mode.\n\nThe price of two spares depends entirely on instance size. If peak needs 12 small instances, you run 14: 2 ÷ 12 ≈ 17% extra. If one large machine can carry the whole peak, N = 1 and N + 2 means three machines, 200% extra. Twenty tiny instances need 22: 10% extra. So the same safety margin gets cheaper as the units get smaller, which is the capacity-planning argument for scaling out.\n\nThe follow-up to expect: where does N come from? Google's answer in the same list is load testing, not tradition, because what a cluster handled three months ago may no longer hold after the system has changed.",
  [
   "sre-best-practices"
  ]
 ],
 [
  "Web servers are easy to multiply because they hold nothing between requests. A database is the opposite: it is the shared state. Splitting it into shards means some joins, transactions and aggregations now span machines. Microsoft's sharding guide calls the resulting complexity \"substantial and permanent\" and says sharding may not suit you when data and throughput fit in a single instance even with projected growth, because vertical scaling keeps queries simple and transactions intact.\n\nStack Overflow shows how far \"fits in a single instance\" goes. Nick Craver's 2016 write-up counts 504,816,843 SQL queries from HTTP requests in one day (about 5,800 a second on average) served by two SQL Server clusters. Each cluster had one master taking almost all the load, a replica in New York and an asynchronous replica in the Colorado disaster-recovery site. The machines had 384 GB of RAM with 2 × 12 cores, and 768 GB with 2 × 8 cores.\n\nThe honest caveat for an interview: a replica gives failover and read capacity, not write capacity. Microsoft's test for sharding is that data outgrows one instance, or that write load is too high for replicas to help.",
  [
   "azure-sharding",
   "stackoverflow-arch-2016"
  ]
 ],
 [
  "A speed-up curve compares a system with itself on one core, so a slow system can have a beautiful curve. Suppose a job needs 100 s of real computation and a framework adds 900 s of serialisation and message passing that happens to parallelise perfectly. On one core it takes 1,000 s; on ten cores about 100 s. That is a \"10× speed-up\" which has only caught up with a plain loop. The paper calls this parallelising overheads the system itself introduced, and shows a Naiad job whose optimised version scales worse because the overhead that scaled so nicely was removed.\n\nThe measurements: on a Twitter follower graph (41.6 million nodes, 1.47 billion edges, 5.76 GB), 20 PageRank iterations took Spark 857 s, Giraph 596 s, GraphX 419 s and GraphLab 249 s, all on 128 cores. The single thread took 300 s reading edges from SSD and 275 s from RAM; visiting the edges in a cache-friendlier (Hilbert curve) order brought it to 110 s. The authors' metric, COST, is the hardware a system needs before it beats that thread; for several systems no reported configuration did.\n\nThe precondition is that the graph fits on a laptop, so ask how big the data really is before reaching for a cluster.",
  [
   "cost-hotos15"
  ]
 ]
];
SD.deep["4.2"] = [
 [
  "The formula is one line of proportional reasoning. Assume the total work stays the same and is spread evenly over the pods. Eight pods at 75% CPU are doing 8 × 75 = 600 \"pod-percent\" of work. To bring each pod to 50% you need 600 ÷ 50 = 12 pods, which is exactly 8 × 75 ÷ 50. The Kubernetes docs give the same reading: a metric at twice its target doubles the replicas, a metric at half its target halves them. The ceil rounds up, since too many pods is the safer error.\n\nThe tolerance stops the controller fidgeting. With a 50% target and the default tolerance of 0.1, a measured average between 45% and 55% gives a ratio between 0.9 and 1.1, and nothing happens.\n\nAWS target tracking rounds the same way and admits the side effect: if the sums say add 1.5 instances, it adds 2, and in a small group that can leave utilisation visibly below target. Two instances at 60% with a 50% target need 2.4, so you get 3 and sit at 40%. AWS notes that step scaling is the alternative when you want more control: you write the \"if above X, add Y\" rules yourself.",
  [
   "k8s-hpa",
   "aws-asg-target-tracking"
  ]
 ],
 [
  "Target tracking is a controller that believes one thing: if I double the instances, the metric halves. So the metric has to be a per-instance measure of busyness. AWS's wording is that it must describe how busy an instance is and rise or fall in proportion to the number of instances.\n\nRun the test on each candidate. Requests per instance: 1,000 req/s over 10 instances is 100 each; add 10 more and it is 50 each. It passes. Total requests at the load balancer: still 1,000 however many instances exist, so the controller adds capacity, sees no change, and adds more until it hits its maximum. Latency: flat while there is spare capacity and steep near saturation, so it does move with load but, as AWS puts it, not necessarily proportionally. Total queue length depends on how long arrivals have outrun the workers, not just on how many workers exist; messages per instance works.\n\nEven CPU has a condition attached: it works only if load is actually distributed across the instances. If one hot instance does most of the work, the average hides it.",
  [
   "aws-asg-target-tracking"
  ]
 ],
 [
  "Walk one spike through the chain. Load jumps at 12:00:00. With 1-minute metrics the autoscaler may not see a full data point covering the jump until about 12:01; with the default 5-minute EC2 metrics it could be 12:05. Then a machine has to be launched and booted, and the application has to start and fill its caches. With 60 s to detect, 90 s to launch and 120 s to warm, new capacity arrives at 12:04:30. Until then, the instances that were running at 12:00 carry everything.\n\nWarm-up is a separate setting in AWS: how long after an instance goes InService before its metrics count towards the group average. It exists because a booting instance often shows high CPU that has nothing to do with traffic, which would distort the average. AWS strongly recommends setting it and notes it is not enabled by default.\n\nThis is why the target value is really a spike budget: at a 60% target, load can rise by two thirds before the running fleet is full. Google's advice is the same: because an autoscaler needs time to react, user-facing services should reserve spare capacity for overload and for redundancy. AWS also supports metrics published every few seconds, which shortens the first step.",
  [
   "aws-asg-target-tracking",
   "aws-asg-instance-warmup",
   "sre-workbook-managing-load"
  ]
 ],
 [
  "The two mistakes cost different amounts. Google's SRE workbook puts it plainly: scaling up matters more and is less risky than scaling down, because failing to scale up means overload and dropped traffic, while failing to scale down only costs some idle machines for a few minutes.\n\nIn Kubernetes the mechanism is a rolling maximum. Every sync (15 s by default) the HPA records how many replicas it would like. When that number says \"fewer\", it does not act on the latest value; it takes the highest recommendation from the last 300 s. If the last five minutes of recommendations were 10, 14, 9, 8, the deployment stays at 14 until the 14 is more than five minutes old. Scale-up has a window of 0: it acts at once, and the default policy lets it add 4 pods or 100% of the current pods, whichever is more, every 15 s. Ten pods can become 20, 40, then 80 within 45 s if the metric demands it.\n\nAWS gets the same effect differently: while newly launched instances are warming up, scale-in is blocked. Without these guards, a load that wobbles around the threshold makes the group flap, and each flap pays the launch and warm-up delay again.",
  [
   "k8s-hpa",
   "aws-asg-instance-warmup",
   "sre-workbook-managing-load"
  ]
 ],
 [
  "Reactive scaling always starts late, because it waits for the metric to move. Predictable load lets you skip detection. A scheduled action is the manual version: you know the 9 a.m. ramp, so you raise capacity at 8:45.\n\nAWS predictive scaling automates that. It analyses up to the past 14 days of a metric, produces an hourly capacity forecast for the next 48 hours and refreshes it every 6 hours. By default it scales at the start of each hour for that hour's forecast; a buffer setting makes it launch earlier so instances have booted before the demand arrives. It starts in forecast-only mode so you can check its predictions first, and it suits loads with recurring time-of-day or day-of-week patterns. It only ever adds capacity, so you pair it with a target tracking policy to remove capacity. When both are active, each computes a desired size and the larger wins: 10 from target tracking and 8 from the forecast gives 10.\n\nWarm pools attack a different term, the boot. Instances are initialised in advance and then kept stopped or hibernated, so you pay for their disks but not for compute. By default the pool holds the gap between maximum and desired capacity: desired 6, maximum 10, pool of 4. AWS aims them at applications with exceptionally long boot times.",
  [
   "aws-asg-predictive-how",
   "aws-asg-warm-pools"
  ]
 ],
 [
  "A control plane is the machinery that changes a system: launching, deleting and reconfiguring resources. The data plane is those resources doing their daily job. A running instance is data plane; asking for a new one is control plane. AWS's observation is that control planes have more moving parts, so they are statistically more likely to be impaired. So AWS's own services do not plan to scale their way out. With three zones they overprovision by 50%, running each zone at 66% of its load-tested level: if peak needs 12 instances, they run 18, six per zone, and any two zones can carry everything with no launches.\n\nThe second failure is the autoscaler doing its job on a misleading signal. Google gives two cases. A release with a bug that burns CPU without doing work: the autoscaler upsizes again and again until the quota is gone. And a failing dependency: requests get stuck on your servers and hold resources, the metric rises, more servers arrive, and the extra load keeps the dependency from recovering. Hence Google's two guards: minimum and maximum bounds, and a kill switch that is easy, obvious, fast and documented.",
  [
   "aws-bl-static-stability",
   "sre-workbook-managing-load"
  ]
 ]
];
