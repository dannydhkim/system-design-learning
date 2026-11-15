// "More detail" for the key ideas of each topic: one entry per key idea, [text, source keys or 'calc'].
// Shown under each key idea on the Learn station (js/app.js). Checked by tools/check-content.mjs.
window.SD = window.SD || {}; SD.deep = SD.deep || {};
SD.deep["7.1"] = [
 [
  "The arithmetic first. 10M users × 10 loads is 100M feed loads a day; a day has 86,400 seconds, so the average is about 1,160 a second. Traffic is never flat, so you size for a peak, here 3× or roughly 3,500. The target is a p99 and not an average because of volume: 1% of 100M is a million slow loads a day, about one for every user every ten days.\n\nThe catalogue size is what forces the architecture. Even at one microsecond per item, scoring all 10M items for one request would take 10 seconds, forty times the whole budget. YouTube's paper states the same constraint, scoring millions of items under a strict serving latency of tens of milliseconds, and answers it with a funnel: candidate generation cuts millions of videos to hundreds, and ranking orders those.\n\nFreshness is the third number to pin down, and it has two sides: how soon a new item can be recommended, and how soon your last action changes your feed. They are built by different parts of the system, so say which one you mean.",
  [
   "youtube-dnn-recs"
  ]
 ],
 [
  "The two endpoints are split because they have different jobs. The feed call must answer inside the latency budget. The events call only has to be accepted: 202 means \"received, will be processed later\", so the client can send events in batches and the server can put them on a stream without making anyone wait.\n\nThe request ID is the join key. When a feed is served, the features the model saw are logged under that ID; when a click arrives minutes later it carries the same ID, so the two can be paired. Monolith does this with two Kafka queues, one for features and one for user actions, and a Flink job it calls the online joiner, which concatenates features with labels into training examples. Its paper notes that the two streams arrive with no guarantee of time order, which is why each request needs a unique key.\n\nTwo follow-ups. Impressions must be sent as events too: an item shown and ignored is the negative example, and without it the model sees only successes. And clients retry batches, so each event needs its own ID for the stream job to drop duplicates.",
  [
   "monolith-bytedance"
  ]
 ],
 [
  "Parallel calls cost the maximum, not the sum. If three sources take 25, 40 and 35 ms, calling them one after another costs 100 ms; calling them together costs 40. A full budget might read: 50 ms network, 40 retrieval, 10 features, 15 light ranker, 50 heavy ranker, 5 re-ranking. That is 170 ms, leaving 80 of the 250 as headroom for the slow tail.\n\nThe stages differ in what the model may look at. In Instagram's two-tower retrieval the user tower computes a user embedding on the fly, item embeddings are cached, and a nearest-neighbour service finds the closest items. The price of that cacheability is that the model cannot use user-item interaction features, which Instagram calls usually the most powerful. Its heavy ranker can use them, which is why it is costly and sees only the best 100. Its light ranker is another two-tower model, trained to predict which items the heavy ranker would put in its top K, a form of distillation.\n\nSo each stage is a cheaper approximation of the next one, and anything retrieval drops, the ranker never sees.",
  [
   "instagram-explore-scaling"
  ]
 ],
 [
  "There are three clocks here, and each kind of state is refreshed on the cheapest clock that works. Features about what you just did are updated by the stream job; no model changes at all. At Pinterest a Flink application reads the action stream from Kafka, validates each record and combines duplicates, and the ranker reads each user's most recent 100 actions, a length chosen for infrastructure cost and latency.\n\nModel parameters are slower. Monolith's production models are usually several terabytes, dominated by the embedding tables, so replacing everything takes a while. But in a short window only a small subset of IDs is trained. Monolith keeps a set of the keys touched since the last sync and pushes only those. Its own sum: 100,000 IDs updated in a minute at 1,024 dimensions is 4 KB each, about 400 MB a minute. Dense weights move much more slowly than sparse embeddings, so they are synced daily, when traffic is lowest.\n\nThe consequence is that serving runs fresh embeddings against slightly stale dense weights. Monolith reports no conspicuous loss from that inconsistency.",
  [
   "transact-pinterest",
   "monolith-bytedance"
  ]
 ],
 [
  "A feed that returns nothing is worse than a feed that is a little less personal, so the design needs something to serve when the expensive path cannot answer. Instagram says applying its heavy model during peak hours could be tricky, so it precomputes recommendations for some users during off-peak hours, which helps ensure availability for every Explore user. A popular list is the last resort: no user features, no model, one read.\n\nAWS's advice explains \"simpler and tested\". The path taken on failure runs rarely, so nobody notices when it rots, and it is needed at the moment the system is already in trouble. If the fallback calls the same feature store that just failed, it fails too. So it should depend on as little as possible and be exercised on purpose.\n\nMonolith's snapshot choice is the same trade applied to training. With parameters on 1,000 servers and a 0.01% daily failure rate, one goes down about every 10 days and loses one day of updates. At 15M daily users spread evenly, that is one day of feedback from 15,000 users, which they judged acceptable against the cost of snapshotting a multi-terabyte model more often.",
  [
   "instagram-explore-scaling",
   "aws-wa-graceful-degradation",
   "monolith-bytedance"
  ]
 ],
 [
  "Cold start is a missing-history problem with two halves. A new item has no interactions, so a model trained on past engagement has little reason to pick it. YouTube calls this an implicit bias towards the past, and its fix is the \"example age\" feature: the age of each training example is fed in during training, and at serving time it is set to zero, so the model predicts for right now. A new or occasional user has almost no long-term profile, so the last few actions are nearly all there is. Pinterest defines non-core users as those who have not saved a pin in the past 28 days; offline, its real-time action model lifted their repin metric by 10.42% against 9.40% for all users, because for them those actions are the only source of information.\n\nOn evaluation, YouTube uses offline metrics such as precision, recall and ranking loss to guide development, but relies on live A/B tests for the final call. One reason the two can disagree: offline data was logged under the old model, so it cannot show how users react to items the old model never showed them.",
  [
   "youtube-dnn-recs",
   "transact-pinterest"
  ]
 ]
];
SD.deep["7.2"] = [
 [
  "Each of the three questions settles a different part of the design. The number of models times their size gives the memory you would need to keep everything loaded. The skew tells you how little of that is in use at any moment. The caller types tell you who may wait.\n\nTake 2,000 models of 3 GB on GPUs with 72 GB usable. One replica per model is 2,000 GPUs. Packed 24 to a GPU, one copy of everything is 84 GPUs, and if only 400 models are hot, two copies of the hot set fit on 34. The skew is where the saving comes from.\n\nThe two ends of the skew want opposite things. Uber's busiest models served over 250,000 predictions a second in 2017, with a typical P95 under 5 ms when no feature lookup was needed; a model like that needs its own fleet. SageMaker's multi-model endpoints are for the other end: many models share one fleet and are loaded when called, and the documentation says the application should tolerate an occasional cold-start penalty on rarely used models.\n\nSo the first follow-up is usually: which models may never be cold, and who pays for keeping them warm?",
  [
   "uber-michelangelo",
   "sagemaker-mme"
  ]
 ],
 [
  "The split into two planes follows how often each verb is called. Predict runs thousands of times a second and must be fast and always available. Register, deploy and set-quota run a few times a day and may be slow and careful.\n\nThe alias is the interesting part of the data model. A UUID names one exact trained model, like a git commit hash. A tag is a movable label, like a branch name. In Michelangelo the client sends its feature vector with either one; given a tag, the serving container uses whichever model was most recently deployed to that tag. So shipping a new version means deploying it to the same tag, and no caller changes its code or redeploys. Uber notes this works when the old and new models have the same signature, meaning they expect the same set of features.\n\nMichelangelo also allows more than one model in a serving container at once, which is what makes safe transitions and side-by-side A/B tests possible: both versions are live and the request says which one it wants.\n\nWhere it bites: a caller that follows a tag gets new behaviour without doing anything, so anyone who needs reproducible results should pin the UUID.",
  [
   "uber-michelangelo"
  ]
 ],
 [
  "A model can only run if its weights are in GPU memory, and GPU memory is small. Clockwork gives the scale: up to 32 GB on a GPU against up to 4 TB of host memory. So most of a large catalogue has to live off the GPU and be copied in on demand.\n\nThe ResNet-50 numbers say what a miss costs. A hit is 2.9 ms. A miss is 8.3 ms of copying plus 2.9 ms of inference, 11.2 ms, almost four times as long, and that is the best case, with the weights already in host memory. If they must come from object storage, a 3 GB model at 1 GB/s is about three seconds.\n\nClockwork also shows what happens when the working set outgrows the cache. On one worker it activated a new model every second up to 3,600, each sending about 0.28 requests a second. GPU memory was full after 201 models, the worker began swapping models in and out, and cold starts rose to 70% of requests. A second workload sending a steady 200 requests a second to its model saw none, because its demand dwarfed every other model's, so its model stayed loaded.\n\nThat is why you count hot models, not registered ones.",
  [
   "clockwork"
  ]
 ],
 [
  "A cache only helps if requests arrive where the cached thing is. With one server that is automatic. With twenty replicas, each holding a different subset of models, the router has to know or guess which replica holds what.\n\nSageMaker's documentation gives the sequence. The first request for a model is routed to an instance, which downloads the model from S3 and loads it into memory. Later requests keep going to that instance. If the model gets many requests and other instances exist, some are sent to a second instance, which loads its own copy. When memory runs high, unused models are unloaded, but they stay on the instance's disk, so reloading skips the download. Ray Serve does the same from a model ID in the request header, with a cap on models per replica and least-recently-used eviction.\n\nThe arithmetic for getting it wrong: 50 equally busy models, 20 replicas, 10 slots each. With random routing each replica sees all 50 models but holds 10, so about one request in five finds its model. With affinity the same 200 slots hold every model four times over.\n\nRay's documentation notes that a request without the model ID header is routed to a random replica.",
  [
   "sagemaker-mme",
   "ray-serve-multiplexing"
  ]
 ],
 [
  "The two limits act at different moments and on different things. A ResourceQuota is checked when someone creates a pod. Kubernetes adds up the GPUs requested in the namespace, and if the new pod would pass the limit, the control plane rejects the request with a 403. For GPUs the quota key is requests.nvidia.com/gpu, and only the requests. prefix is allowed, because extended resources such as GPUs cannot be overcommitted. The documentation also cautions that changing a quota does not affect resources already created.\n\nNone of that sees prediction traffic. If team A sends 20 times its usual load to a shared pool, no pod is being created, so the quota has nothing to check. That needs a limiter in the request path. Stripe describes two that map onto this. A request rate limiter restricts each user to N requests a second. A fleet usage load shedder reserves part of the fleet for critical requests: with a 20% reservation, any non-critical request beyond the other 80% is rejected with a 503.\n\nOn an inference platform, read \"critical\" as interactive and \"non-critical\" as batch. A backfill can then fill spare capacity but can never take the last fifth.",
  [
   "k8s-resource-quotas",
   "stripe-rate-limiters"
  ]
 ],
 [
  "The first sentence is what AWS calls static stability. A data plane depends on data that arrives from the control plane, but it keeps its existing state and carries on when the control plane is impaired; it just gets no updates. AWS's example is EC2: the physical machine has local access to everything it needs to route packets, so a control-plane outage means new instances or rules do not appear, while existing traffic flows. The reason to design this way is that control planes have more moving parts, so they are more likely to be impaired, and the data plane handles far more volume.\n\nFor this platform: the router holds the placement table in memory. During an outage nobody can deploy or rescale, and predictions continue.\n\nScale-to-zero is the opposite trade. A model with no replicas costs nothing and has nothing to keep serving. KServe's documentation shows the price in a load test: the requests that arrived while pods were being created took around 10 seconds, the cost of spawning the pods and downloading the model. With minReplicas at its default of 1 that never happens, but 2,000 rarely used models then hold 2,000 replicas. So zero for batch and the long tail, a warm minimum for anything a person is waiting on.",
  [
   "aws-bl-static-stability",
   "kserve-autoscaling"
  ]
 ]
];
SD.deep["7.3"] = [
 [
  "NDCG is a score for one ranked list, and each of its four parts answers a design choice. Graded labels: a human rates each result 0 to 4, where measures such as MRR and MAP only handle relevant or not. Gain: the label becomes 2^label − 1, so labels 0 to 4 are worth 0, 1, 3, 7 and 15, and one perfect result outweighs several fair ones. Discount: each gain is divided by the log of 1 + rank, so the same result counts less the lower it sits. Truncation: add up only the first T positions, the page the user sees. That sum is DCG@T. Dividing by the best DCG any ordering of those results could reach gives NDCG, between 0 and 1, so easy and hard queries can be averaged.\n\nWorked example with base-2 logs: you show labels 1, 3, 0. DCG = 1 ÷ 1 + 7 ÷ 1.585 + 0 = 5.42. The ideal order 3, 1, 0 gives 7 + 1 ÷ 1.585 = 7.63. NDCG@3 = 5.42 ÷ 7.63 ≈ 0.71.\n\nWhere it bites: Burges points out that, as a function of the model's scores, such a measure is everywhere flat or discontinuous, because it only changes when two results swap. You cannot train on it by plain gradient descent, which is why LambdaRank and LambdaMART exist.",
  [
   "burges-lambdamart"
  ]
 ],
 [
  "Splitting by document means each shard holds whole documents and a complete inverted index over just those documents. A shard can answer any query alone, for its slice. But the best result for a query could sit in any slice, so the root has to ask all of them and keep the best of the replies. The Tail at Scale describes this shape: a root fans a request out to many leaf servers, each working on its own portion of the data, and merges the responses.\n\nThe cost is multiplication. With 8 billion documents at 10 million per shard there are 800 shards, so 20,000 queries a second become 16 million leaf requests a second.\n\nThe second cost is the slowest leaf. The paper's sum: if one server is slow 1% of the time and a request needs 100 of them, 1 − 0.99^100 = 63% of requests hit at least one slow server. In its measurements from a real Google service, a single leaf finished within 10 ms at the 99th percentile, but waiting for all leaves took 140 ms. A rare event on one machine becomes the normal case for the query.\n\nSo the natural follow-up is how you stop one slow shard from setting your latency, which is the tail-latency key idea.",
  [
   "tail-at-scale"
  ]
 ],
 [
  "The two methods fail in opposite places, which is why they are combined. Term matching looks up the query's words in the inverted index. It is cheap and exact, so it is hard to beat for names, codes and rare words, but it finds nothing when the user and the document use different spellings or words. Embedding retrieval maps the query and each document to vectors and returns the nearest ones, so it can match on meaning.\n\nFacebook's paper gives two cases where embeddings won. The query \"kacis creations\" matched the page \"Kasie's creations\", which term matching could not. And for \"mini cooper nw\" the model learned to retrieve a Mini Cooper owners' group by treating \"nw\" as optional.\n\nFacebook did not run a separate vector system beside search. It added a nearest-neighbour operator to its Boolean query language, so one retrieval expression can say: location must match one of these terms exactly, and the name must match either these terms or fall within a given radius of the query embedding.\n\nThe follow-up to expect is how to merge two candidate lists whose scores are on different scales. A common answer is to take the union and let the next ranking stage score everything with one model.",
  [
   "fb-embedding-retrieval"
  ]
 ],
 [
  "The cascade is forced by arithmetic on model cost. Bing's post gives the numbers for one model: a distilled three-layer BERT took 77 ms per inference on twenty CPU cores, 20 ms on a GPU, and after rewriting it for the GPU and using mixed precision, a batch of 64 took 6 ms. That is 64 ÷ 0.006 ≈ 10,700 query-document pairs a second per GPU.\n\nNow place it in the pipeline at 1,000 queries a second. Reranking the top 50 is 50,000 pairs a second, about 5 GPUs. Reranking 16,000 merged candidates per query is 16 million pairs a second, about 1,500 GPUs. Same model, 300 times the hardware, and almost all of it spent on documents that were never going to make the first page. Bing reported using more than 2,000 GPU machines to serve over a million BERT inferences a second worldwide.\n\nElasticsearch builds the same idea in as rescoring: a costlier second scorer runs only on a window of top documents, on each shard before results are merged, and that window defaults to 10.\n\nThe catch is that a later stage can only reorder what it is handed. If the cheap stage drops the right document, no transformer downstream can bring it back.",
  [
   "bing-bert-gpus",
   "es-rescore"
  ]
 ],
 [
  "All three techniques accept that some server will be slow and avoid waiting for it. A hedged request works like this: send to one replica; if no reply has come by the time 95% of such requests would have finished, send a copy to another replica, use whichever answers first and cancel the other. Only about 5% of requests ever reach that point, hence about 5% extra load. It works because the slowness usually comes from interference on that machine, not from the request itself. In a Google benchmark reading 1,000 keys from BigTable across 100 servers, hedging after 10 ms cut 99.9th-percentile latency from 1,800 ms to 74 ms for 2% more requests.\n\nGood-enough results rest on two measurements in the paper. Waiting for the last 5% of leaves doubled the 99th percentile, from 70 to 140 ms. And the chance that one particular leaf holds the best result is under one in 1,000. So the last few leaves cost half the latency and rarely matter.\n\nA canary request protects against a different failure: a query that crashes whatever runs it. The root tries one or two leaves first and fans out only if they answer. It adds little delay, since waiting for one server is far quicker than waiting for thousands.",
  [
   "tail-at-scale"
  ]
 ],
 [
  "A click needs two things: the user looked at the result, and found it relevant. Joachims models them separately. The chance of being looked at depends only on rank; the click then depends on relevance. A logged click therefore tells you about relevance only where the user looked, and people look at the top far more.\n\nInverse propensity scoring undoes that by weighting. If rank 10 is examined 10% of the time, a click there is counted ten times, because for each click you saw, there were about nine other times when a relevant result at that rank was never looked at. To learn the examination probabilities, the paper runs a small intervention that randomly swaps results into the top position and compares click rates.\n\nAirbnb skipped the explicit propensity model. Its network takes position as an input during training, so position can absorb the \"it was at the top\" effect. At scoring time every listing gets position 0, so that part is the same constant for all of them and the order depends on relevance alone. Done naively this cost about 1.3% NDCG, because the network leaned on position in training and then lost it at scoring. The fix was dropout on the position input, at a rate of 0.15.\n\nEither way, check the result online, since offline NDCG computed from clicks inherits the same bias.",
  [
   "joachims-unbiased-ltr",
   "airbnb-search-abc"
  ]
 ]
];
SD.deep["7.4"] = [
 [
  "Three facts in this requirement shape everything after it. First, the check sits inside the payment: Stripe describes the moment as starting when someone clicks \"purchase\" and ending when the transaction is confirmed, so every millisecond of scoring is a millisecond the buyer waits, and a late answer is as bad as none. Second, the output is a decision with more than two values. Besides allow and block, a risky payment can be diverted to an additional security check, which lets a real customer prove themselves where a block would lose the sale.\n\nThird, rarity changes how you measure. With fraud at 1 in 1,000, a model that calls everything legitimate is 99.9% accurate and useless. Take a million payments: 1,000 are fraud. A model that catches every one of them and wrongly flags just 1% of good payments blocks 1,000 frauds and 9,990 good customers, so only about 9% of what it blocks is fraud. That is why fraud teams talk in precision (what share of blocked payments were fraud) and recall (what share of fraud was caught), not accuracy.\n\nFor scale, Stripe says Radar wrongly blocks about 0.1% of legitimate payments. An interviewer will expect you to ask what each kind of error costs before choosing a model.",
  [
   "stripe-radar-built"
  ]
 ],
 [
  "The score and the rules do different jobs. The score is the model's estimate, squeezed onto 0 to 99 so that people can set cut-offs on it; 65 and 75 are only the default lines for \"elevated\" and \"high\". Rules carry what a merchant knows and the model does not, and they can be changed without retraining anything.\n\nThe ordering is the part people get wrong. Radar does not run rules in the order you wrote them. It groups them by action: rules that request 3D Secure first, then allow, then block, then review. Within a group there is no order, and the first match ends evaluation. Stripe's own example: with the rules \"allow payments under $10\" and \"block payments where the risk level is high\", every payment under $10 is processed whatever its risk level, because the allow rule matched first and nothing else was looked at.\n\nSo an allow rule is not a hint; it is an override of the model. A broad one, such as allowing all small payments, is a hole in the wall: anyone who discovers it can send high-risk payments straight through it. In a design discussion, say that allow rules should be narrow, and that you would log which rule decided each payment so a bad rule can be found afterwards.",
  [
   "stripe-radar-risk",
   "stripe-radar-rules-ref"
  ]
 ],
 [
  "The three paths exist because features age at different speeds. What is in the request (amount, country, card type) is free. A velocity count such as \"charges on this card in the last hour\" is only useful if it includes the charge from a second ago, which is exactly the pattern of someone testing stolen cards. Relationships between accounts change slowly and are expensive to compute, so they are done in batch.\n\nFor the streaming path, Stripe moved feature updates to Flink and reported p99 freshness of 150 ms. Freshness is not the same as read speed, though. If every event is stored separately, a lookup must fetch and add them all. Stripe instead keeps pre-aggregated partial counts, which it calls tiles, in the Flink job and flushes them to the key-value store. A 7-day count over hourly tiles is 168 small reads and a sum, even if the window holds 2 million events.\n\nFor the graph path, Uber's idea is that fraudsters are connected and clustered through shared information, so a user's score should draw on neighbours several hops away. In its case study, two graph-learned scores added to an existing model's 200 features gave 15% better precision and ranked 4th and 39th in importance. Uber notes that model was not in production.",
  [
   "stripe-shepherd",
   "uber-graph-fraud"
  ]
 ],
 [
  "A fraud label is not observed when the payment happens. It appears when a cardholder reads a statement, does not recognise a charge and contacts the bank, and Stripe's documentation says networks typically allow 120 days for that. For something bought ahead of time, such as an event ticket, the clock generally starts on the event date, so the label can be later still.\n\nUntil then the payment sits in your data looking legitimate. An illustration with assumed numbers: true fraud is 1 in 1,000, and for payments made last week only a fifth of the eventual disputes have arrived. The data then shows 0.02% fraud, and four out of five fraudulent payments are labelled good. A model trained on that week learns that the newest fraud pattern is safe, and a test set from the same week agrees with it.\n\nThere is a second gap in the labels. Stripe's guide points out that a blocked payment has no outcome at all: you cannot know whether it would have been disputed. So measuring a live model needs an estimate of what would have happened to the blocked payments, which it calls counterfactual analysis.\n\nThe trade-off to state: wait longer and labels are more complete, but the model learns about new fraud later.",
  [
   "stripe-disputes",
   "stripe-radar-guide"
  ]
 ],
 [
  "The formula comes from comparing two mistakes in the same unit. Say good sales earn profit G each and a fraudulent sale loses L. If you block a group of payments of which a fraction p is fraud, each blocked payment saves p × L on average and gives up (1 − p) × G. Blocking pays when p × L is greater than (1 − p) × G, which rearranges to p greater than G ÷ (G + L), or 1 ÷ (1 + L ÷ G).\n\nStripe's example fills it in. A $26 sale at 8% margin earns G = $2.08. A fraudulent one loses the $23.92 the product cost plus a $15 chargeback fee, so L = $38.92, which is 18.71 good sales' worth of profit. Break-even is 1 ÷ 19.71 = 5.07%. In words: it is worth blocking a group of payments even if only about one in twenty of them is fraud.\n\nThat is far lower than intuition suggests, and it moves with margin. At $50 and 10% margin the same sum gives 7.7%.\n\nTwo cautions. Apply it to the slice of payments at the threshold, not the average of everything blocked, since the average hides a losing tail. And Stripe warns that businesses tend to overweight missed fraud and underweight good customers blocked.",
  [
   "stripe-radar-guide"
  ]
 ],
 [
  "Fail open and fail closed describe what a check does when it cannot run. Open: the payment goes through unchecked, so the service stays up. Closed: the payment is refused, so nothing unchecked gets through. Google's book frames the two as reliability against security.\n\nThe trouble with failing open is that it gives attackers a switch. If overloading the feature store turns the fraud check off, then a flood of requests is no longer just a nuisance; it is the first step of the fraud. The trouble with failing closed is arithmetic: at 500 payments a second, if 3% cannot be scored, that is 15 declined payments a second, 54,000 an hour, almost all from honest customers.\n\nThe book's way out is a third behaviour: replace the failed control with a lower-cost alternative. It adds a useful condition. If the fallback is stricter than the normal control, knocking over the normal one gains an attacker nothing. For payments that suggests fallback rules that use only fields already in the request and are deliberately tight, such as a low amount cap.\n\nThe book also says each organisation must decide its minimal non-negotiable security posture first. So the limit, and who accepts the lost sales, is agreed before the outage, not during it.",
  [
   "bsrs-resilience"
  ]
 ]
];
SD.deep["7.6"] = [
 [
  "The point of quoting YouTube is that it shows what the latency requirement is measured in: views, not milliseconds. A violating video that is removed after an hour with zero views did no harm; one removed after five minutes with 50,000 views did. So the question to ask is how many views a violation may collect, per category.\n\nWork the numbers through. Of just over 8M removals, 6.7M (about 84%) were first flagged by machines. 76% of 6.7M is about 5.1M removed before anyone watched, which leaves about 1.6M machine-flagged videos that were seen at least once. For violent extremism the same post says that at the start of 2017 only 8% of removed videos came down with fewer than 10 views, and after machine flagging arrived in June 2017 it was more than half. Videos matched to known extremist content at upload are excluded from that figure because they never went live.\n\nOne thing the post is explicit about: machines flag, people still decide. In its words, more machine learning meant more people reviewing content, not fewer. That is why the rest of this design is sized in reviewers.",
  [
   "youtube-enforcement-2018"
  ]
 ],
 [
  "Three terms carry this idea. At-least-once means the queue may hand the same message to a worker twice. Amazon's SQS documentation gives the reason: a message is copied to several servers, and if one of them is unreachable when you delete the message, its copy survives and can be delivered again. A worker that crashes after deciding but before acknowledging has the same effect.\n\nIdempotent means the second delivery changes nothing. The worker first looks up the pair (content ID, model version) in the decision store. If a row exists it acknowledges and stops; otherwise it does the work and writes the row. The model version is part of the key on purpose: the same image scored by a new classifier is a new decision, not a duplicate. Without this, a redelivered message could send two removal notices or put one item in front of two reviewers.\n\nAppend-only means a decision is never edited, only followed by a later row. An appeal then reads exactly what the system knew at the time (scores, model version, who decided), and a re-scan can reuse the stored hashes instead of fetching the file again.",
  [
   "aws-sqs-at-least-once"
  ]
 ],
 [
  "An exact hash such as SHA-256 changes completely if one byte changes, so re-saving a JPEG defeats it. A perceptual hash is built to survive that. Meta's description of PDQ: shrink the image to a 64x64 grid, take a discrete cosine transform (which describes the picture as coarse light-and-dark patterns), keep a 16x16 block of it, and emit one bit per value: 1 if it is above the median, else 0. That gives 256 bits, about half of them 1s.\n\nNow the threshold makes sense. Two unrelated images differ in about 128 of the 256 bits, and in practice between roughly 90 and 160. A re-encoded copy differs in a handful. A cut-off of 31 sits far below the unrelated range, so a match is strong evidence of a copy. The paper says PDQ runs at about the speed of reading the file from disk, which is why it goes before any GPU.\n\nThe weakness follows from the mechanism. The hash describes the whole frame's layout, so a deep crop moves every pattern and the bits change. Meta calls these hashers syntactic: they compare pixels without understanding content, so new material and deliberate edits are left to classifiers.",
  [
   "meta-pdq-tmk-paper",
   "pdq-readme"
  ]
 ],
 [
  "A classifier gives a score, not a decision. Two cut-offs turn it into three outcomes, and the width of the middle band is the number of items a person must look at. The arithmetic: 10M uploads x 2% = 200,000 reviews; x 30 s = 6M seconds; / 3,600 = about 1,667 hours a day. At 6 productive hours a shift that is about 278 reviewers working every day. Widen the band to AWS's upper figure of 5% and it becomes 500,000 reviews, about 4,167 hours, about 694 reviewers. So lowering the review floor to catch more is a request to hire, and if nobody is hired the queue grows without limit.\n\nAmazon A2I has these as two named conditions: one starts a human review when a moderation label's confidence falls inside a range you set, the other sends a random percentage of items to people. The random sample matters because the band only shows you cases the model was unsure about. A model that is confidently wrong at 0.99 never enters the band, so without a sample of the automatic decisions you cannot measure their precision or notice when it drifts.",
  [
   "aws-rekognition-a2i",
   "aws-rekognition-moderation"
  ]
 ],
 [
  "Reviewers are the scarce resource, so the queue should not be first-in, first-out. One way to see why the three factors fit together: the harm of leaving an item unreviewed is roughly the chance it violates, times how bad that category is, times how many people will see it while it waits. A probable violation that is spreading fast outranks an older item nobody is viewing.\n\nSeparate queues solve a different problem. In a shared queue, by the time work is enqueued it is hard to tell one workload from another, so a 2-billion-image re-scan sits in front of today's uploads. Amazon's Builders' Library describes giving each workload its own queue, and moving old traffic to a backlog queue that is worked only after the live queue is caught up, because people faced with a backlog want fresh data handled first.\n\nThe two kinds of re-scan differ hugely in cost. Meta notes that hashes can tell whether two files are the same or similar without the original media, so a new bad hash is compared against stored 256-bit hashes: 2 billion x 32 bytes is 64 GB, a memory-sized job. A new classifier has to read and score every file again on GPUs.",
  [
   "aws-bl-queue-backlogs",
   "meta-pdq-open-source"
  ]
 ],
 [
  "Put numbers on both sides. Holding: if a check takes a median of 10 minutes, every one of 10M daily uploaders waits 10 minutes, although nearly all of them broke no rule. Publishing first: exposure is views per minute times minutes until removal, so a post gaining 500 views a minute collects 5,000 views in the same 10 minutes. Neither is right everywhere. The cost of a view depends on the category, so the choice is made per category: hold where a handful of views is already serious harm, publish and check afterwards where it is not. Hash matches at upload are the cheap middle ground, because they finish before publication anyway.\n\nThe second trade is about the thresholds. Precision is the share of removals that were correct. Auto-remove 100,000 items a day at 99% precision and 1,000 people a day are wrongly removed; each may appeal, and each appeal is another human review. Recall is the share of real violations you catch. To raise it you lower a threshold, which either cuts precision (more wrongful removals) or widens the review band (more reviewer hours). Whatever you still miss stays up and collects views. An interviewer will ask which of the four costs you chose to pay, per category.",
  "calc"
 ]
];
SD.deep["7.7"] = [
 [
  "Why does every team end up with its own pipeline? Because a feature pipeline is more than a query. LinkedIn lists what it has to do: bring together time-sensitive data from many sources, join features to training labels at the right point in time, push the values into a low-latency store for serving, and compute them identically for training and inference. A team that builds all that for one model has no reason to build it for anyone else's.\n\nLinkedIn names the missing piece precisely: without a common abstraction there was no uniform way to name features across models, no uniform type system, and no uniform way to deploy and serve them. Two teams could each compute member-job-views-7d and never find out, because nothing made the two comparable.\n\nTheir analogy for the fix is a package manager. You list the libraries you want by name and the build system fetches and links them; with Feathr you list feature names and the platform works out how to source and compute them. After adoption across dozens of applications and hundreds of model workflows, they reported that adding and trying new features went from weeks to days. So the requirement to state in an interview is reuse by name, not storage.",
  [
   "linkedin-feathr"
  ]
 ],
 [
  "Treating a feature as code means its definition lives in a repository, goes through review, and is applied to the registry by the pipeline rather than by hand. Feast recommends exactly that, and adds that staging and production registries should have locked-down write access because they can affect real user traffic. The registry is then the catalogue: what exists, who owns it, how fresh it promises to be.\n\nThe two APIs answer two different questions. Online asks: what is the value now, for these keys? Offline asks: what was the value then? Point in time means that for each labelled event the join returns the feature as it stood at that event's timestamp. Say a user clicked at 14:05 on 3 March and the feature is purchases in the last 7 days. The training row must count purchases up to 14:05 on 3 March. If it uses today's value, it includes purchases made after the click, which is information the model will never have when serving.\n\nLinkedIn's Feathr does this by replaying the registered definition over historical time-series data to compute features at specific points in time. That only works because the definition is declarative code the platform can re-run; a number someone pasted into a table cannot be replayed.",
  [
   "feast-registry",
   "linkedin-feathr"
  ]
 ],
 [
  "The reason to insist on one definition is that two hand-written versions of the same feature, one in Spark for training and one in a streaming job for serving, drift apart. A different rounding rule or window edge and the model is served numbers it was never trained on, with no error raised.\n\nChronon makes the two modes a property of a single definition. Its accuracy setting is either SNAPSHOT, where values are computed as of midnight and refreshed once a day, or TEMPORAL, where the same definition is evaluated in real time when serving and point-in-time correct when backfilling. If the source has a stream topic, TEMPORAL is the default.\n\nStripe's account of adopting it shows what one definition costs in engineering. Chronon definitions are Python plus Spark SQL, so to keep online and offline consistent Stripe had to run those Spark SQL expressions inside Flink. That was feasible because the expressions only need maps and filters, which apply to one row at a time with no shuffle. With Flink doing the updates, p99 freshness was 150 ms. The interview follow-up is usually: how do you know the two engines agree? Log the served values and compare them with the backfill for the same keys and times.",
  [
   "chronon-groupby",
   "stripe-shepherd"
  ]
 ],
 [
  "Count lookups, not requests. One call scoring 500 candidates with 30 features each needs 500 x 30 = 15,000 values. Fetched one at a time at 0.5 ms per round trip, that is 15,000 x 0.5 ms = 7.5 s. The store is not slow; the waiting is. Redis's documentation makes the same point with an extreme case: with a 250 ms round trip, a server able to process 100k requests a second gives you four a second. Batching fixes it: send 500 keys per call and 15,000 values become 30 calls, which can run in parallel.\n\nDistance is the other term. Dropbox keeps its store co-located with inference and reports about 20 ms client-side latency, with p95 for feature serving around 25-35 ms, inside a sub-100 ms budget.\n\nTiles handle windowed aggregates. Without them, a count over the last 7 days means reading every event in the window at request time. Stripe keeps pre-aggregated partial results (tiles) and flushes them to the store, so a read fetches and combines tiles. With one-hour tiles a 7-day window is at most 168 small reads however many events occurred. Chronon describes the same idea as hops: a 1-hour window in 10-minute hops is 6 pieces.",
  [
   "redis-pipelining",
   "dropbox-dash-feature-store",
   "stripe-shepherd",
   "chronon-groupby"
  ]
 ],
 [
  "Stripe defines the two quantities separately: latency is the time to retrieve features during inference, freshness is the time for a feature's value to catch up with new data. They pull against each other because the work has to happen somewhere. Aggregate when the event arrives and the read is a cheap lookup, but the value is only as new as the last update. Aggregate at request time and it is fully current, but the request pays for it. So a fraud velocity counter and a lifetime-spend total should not share a setting.\n\nThe batch-delay trap, with numbers. A daily feature covers data up to midnight, and the job publishes it at, say, 03:00. A request at 15:00 reads a value 15 hours behind. A request at 02:00, before the job lands, reads yesterday's partition: 26 hours behind. Now build training data naively by joining each label to the feature computed up to the label's own timestamp. Training rows are zero hours behind; serving rows are 15 to 26. The model learns from signal it never gets in production.\n\nStripe's fix, built for its SEPA fraud model, was to model that delay in the offline data, so the backfill returns the value the online store would actually have held at that moment.",
  [
   "stripe-shepherd"
  ]
 ],
 [
  "A model's weights are fitted to the distribution of each input. Suppose a producer changes purchases-7d to count 30 days because their own model wants that. Values become roughly four times larger. Every other model reading that name now sees inputs far outside what it was trained on, nothing errors, and its predictions quietly degrade. Hence the rule: the old name keeps its meaning, the change ships as a new version, and consumers move when they retrain. LinkedIn described where this leads: upgraded versions of widely shared features that are automatically tested against the existing models that depend on them.\n\nMonitoring follows from the contract. Each feature promised a freshness, so measure the age of its newest value against that promise; Dropbox lists freshness tracking and job-failure monitoring among what it added around its store.\n\nCost: the online store must keep every value ready to read at low latency, which is the expensive kind of storage. Stripe split by write pattern: a cheaper store for bulk uploads that is written once and read many times, and a costlier memcache-based one for values written often. Dropbox attacked the write side instead, writing only changed records, which cut a batch run from hundreds of millions of writes to under one million.",
  [
   "linkedin-feathr",
   "stripe-shepherd",
   "dropbox-dash-feature-store"
  ]
 ]
];
SD.deep["7.8"] = [
 [
  "The asymmetry comes from how generation works. Databricks describes two steps: prefill, where all the tokens of the prompt are processed in parallel, and decoding, where text is produced one token at a time, each new token appended and fed back in for the next. So 512 input tokens are roughly one parallel pass, while 8 output tokens are 8 passes in sequence. That is why adding input barely moves latency and adding output moves it directly.\n\nIt also explains the two SLOs. Time to first token (TTFT) covers waiting plus processing the prompt. Time per output token (TPOT) is the streaming speed each user perceives. Their formula: latency = TTFT + TPOT x output tokens. At their example TPOT of 100 ms, a user sees 10 tokens a second, so a 400-token answer takes about 40 s after the first token, whatever the prompt length. They note output length dominates overall latency.\n\nWhere it bites: throughput and TPOT trade against each other. Run 16 queries concurrently and the server produces more tokens a second in total, but each user's tokens arrive more slowly. So capacity is stated as output tokens a second at a given TPOT, and a requests-per-second figure alone says almost nothing.",
  [
   "databricks-llm-inference"
  ]
 ],
 [
  "A token bucket is a counter that refills steadily up to a cap; each request takes out what it uses, and an empty bucket means a 429. Anthropic describes its limits this way: capacity is continuously replenished rather than reset at fixed intervals, so a tenant cannot burn a whole minute's allowance in the first second of every minute.\n\nWhy three buckets? Requests, input tokens and output tokens load the system differently. One request can carry a 200,000-token document, so counting requests alone would let a single tenant flood prefill. The two token buckets are also charged at different moments. Input is known up front: Anthropic estimates it when the request starts and adjusts afterwards. Output is unknown until generated, so it is counted in real time as tokens are produced, and the max_tokens setting does not count against the limit.\n\nThe cache arithmetic: if 80% of input tokens are cache reads, only 20% are charged. A 2M limit is therefore used up when total input reaches 2M / 0.2 = 10M, of which 8M were cached. The practical consequence for a gateway design is that the input bucket must be charged after the cache lookup, with the uncached count, or tenants with long shared system prompts are throttled five times too early.",
  [
   "anthropic-rate-limits"
  ]
 ],
 [
  "Two terms need unpacking. Continuous batching means the batch is rebuilt at every decode step: finished requests leave and waiting ones join, instead of everyone waiting for the longest answer in a fixed batch. The Sarathi-Serve paper calls this iteration-level batching, where requests enter or exit a batch at the granularity of individual iterations.\n\nThe KV cache is the per-token state the engine keeps for each active sequence so that earlier tokens are not recomputed at every step. It lives in GPU memory and grows with every token of prompt and output, so the thing a replica runs out of is tokens held, not requests. Hugging Face TGI exposes it as a single setting, the total tokens allowed in a batch, and advises making it the largest number that fits the memory left after the model is loaded.\n\nA worked case with made-up but typical numbers: a budget of 40,000 tokens and chat requests of 1,500 input plus 400 output, 1,900 each, gives 40,000 / 1,900 = 21 concurrent streams. One 30,000-token document request takes the room of about 15 of them. So a router or autoscaler that counts requests will overload a replica serving long prompts and underuse one serving short ones; count tokens.",
  [
   "tgi-launcher",
   "sarathi-serve"
  ]
 ],
 [
  "Prefix affinity pays because of the KV cache. If a replica has already processed a prompt that begins the same way (the same system prompt or few-shot examples), the engine can reuse those cached entries and skip that part of prefill. The saving only exists on the replica that holds the entries, so the router has to remember who has seen what. Ray Serve's router keeps a prefix tree of previously processed text for this.\n\nIts decision order is worth knowing step by step. First compare queue lengths; if the gap between the longest and shortest is under a threshold, load is considered balanced. Then look up the prompt in the prefix tree: with a match rate of 10% or more, send it to the best-matching replica; below that, send it to the replica with the least prefix-cache use. If load is not balanced, ignore the cache and use power of two choices: pick two replicas at random and take the less loaded, which gets fairness without checking every server.\n\nThe reason for the fallback: pure affinity sends every request with the popular system prompt to one replica, which then queues while its neighbours idle. A cache hit saves some prefill; a long queue costs far more. Load has to win.",
  [
   "rayserve-prefix-routing",
   "haproxy-power-of-two"
  ]
 ],
 [
  "Start with why CPU-style autoscaling signals fail here: a GPU that is batching looks busy whether it is comfortable or drowning. The signals that mean something are requests waiting for a slot and how full the KV cache is, which is what KServe's KEDA integration scales on, read from vLLM's own metrics.\n\nThen the delay. AWS lists what happens between the scale-up trigger and the first served request: provision an instance, download and load the container image, download the model from S3, load it on the host, prepare it for the GPU, load it onto the GPU. It says the total can reach tens of minutes. Simple arithmetic shows the floor: 140 GB of weights at 2 GB/s is 70 s for the read alone, before any of the other steps.\n\nSo size with headroom. If peak is 30 requests/s x 400 output tokens = 12,000 tokens/s and a replica sustains 2,000, that is 6 replicas fully busy; at 70% busy, 6 / 0.7 = 8.6, so 9. The spare 30% is what absorbs the first six minutes of a spike. Beyond that you need an ordering decided in advance. The Kubernetes inference gateway extension expresses it as serving priority: chat above latency-tolerant work such as summarisation.",
  [
   "kserve-llm-autoscaling",
   "aws-fast-model-loader",
   "gateway-api-inference-ext"
  ]
 ],
 [
  "The stall first. Prefill and decode share the same GPU step. The Sarathi-Serve authors explain that schedulers which run a new request's prefill as soon as memory frees up get good throughput, but a prefill can take arbitrarily long depending on prompt length, and meanwhile every ongoing decode waits. They call it a generation stall and show one in vLLM lasting several seconds: every user on that replica sees their text freeze. Their fix caps the number of prefill tokens per iteration, so a long prompt is processed in slices alongside the ongoing decodes.\n\nDisconnects: a user closes the tab after 50 tokens of a 2,000-token answer. Unless the server notices, the replica keeps generating for nobody and those tokens stay in the KV budget, blocking admissions. vLLM wraps its route handlers so a client disconnect cancels the handler, the scheduler accepts an abort from the API server, and finishing a request frees its KV blocks.\n\nCache isolation: a shared prefix cache answers faster when someone has already sent the same prefix. Across tenants, that speed difference would reveal what another customer's prompts contain. Anthropic's rule is that organisations never share caches even for identical prompts. In a design, put the tenant ID into the cache key.",
  [
   "sarathi-serve",
   "vllm-api-utils",
   "vllm-scheduler",
   "anthropic-prompt-caching"
  ]
 ]
];
SD.deep["7.9"] = [
 [
  "Why one decision point? Each producing team sees only its own events, and from where it sits its notification is always worth sending. The user receives the sum of all of them. Nobody owns that sum unless a single service sits in front of every channel. LinkedIn describes ATC as the ultimate decision maker: it optimises the portfolio of notifications per member rather than each notification, aiming for the right message, member, channel, time and frequency. Note what it is not: ATC decides which channel a notification goes through; other services do the sending.\n\nThe scale, converted: over a billion requests a day is 1,000,000,000 / 86,400, about 11,600 a second on average.\n\nThe two traffic classes need opposite treatment, which is why they are a requirement and not a detail. The Daily Rundown arrives as one batch of about a hundred million requests and can wait a couple of hours, so ATC spreads it out using aggregation and delivery-time choice. Member-to-member messages arrive steadily and must be handled in under a second, so they travel on high-priority Kafka topics. LinkedIn also reports that running remote calls in parallel cut the 90th-percentile end-to-end latency for messaging pushes from about 12 seconds to about 1.5.",
  [
   "linkedin-atc"
  ]
 ],
 [
  "Each candidate field exists for a later step: the dedupe key lets a replayed request be recognised, the expiry stops a held notification going out after it stopped being true, and priority picks the queue.\n\nThe interesting part is where state lives. A decision needs the member's send history, settings, devices and preferred hours. If each is a remote call, latency adds up: at LinkedIn's quoted 10-100 ms per remote call, five lookups at 50 ms is 250 ms per candidate. ATC instead partitions all its input streams (requests, tracking events, settings) by member ID, so everything about one member arrives at the same host and the same stream task, and keeps the state in RocksDB, a key-value store embedded in the process, on that host's SSD. Reads take a couple of milliseconds, so the same five lookups are about 10 ms.\n\nTwo details make it work. Keys start with the member ID, and include a timestamp where needed, so one range query returns, say, everything sent to this member in the last X days. And because local disks die, every state change is also written to Kafka; a job rescheduled onto a new host rebuilds its store by consuming that log. Data that cannot be keyed by recipient, such as a spam check on the sender, stays a remote call.",
  [
   "linkedin-atc"
  ]
 ],
 [
  "Write the decision as expected value. Sending is worth P(user acts) x value of the action, minus P(user disables) x value of everything you could have sent them afterwards. The second term is small in probability and large in size. Illustrative numbers: a 2% chance of a tap and a 0.1% chance of a disable. If a user who disables would otherwise have given you 50 taps over the next year, the expected loss is 0.001 x 50 = 0.05 taps, more than the 0.02 gained. Do not push; show it in-app, where it costs no interruption.\n\nA click model only sees the first term, and the first term is never negative. Twitter's paper states it directly: a myopic system always chooses to send, since the negative effects occur in the future. It adds that the usual patch, hand-tuned heuristics such as caps, is hard to reason about and needs retuning whenever the system changes.\n\nLinkedIn's ATC scores both outcomes, predicting the likelihood a member will act on or disable a notification. What survives the score is then shaped: ATC can hold notifications and send several as one, and picks a delivery time when the member is likely to engage. Interviewers usually push on how you would learn the disable model, given how rare disables are.",
  [
   "twitter-notif-ltv",
   "linkedin-atc"
  ]
 ],
 [
  "You do not deliver a push; you hand it to Apple or Google with instructions, and they deliver when they can. The instructions are the headers. On APNs, priority 10 means send immediately, 5 means send with the device's power in mind, and 1 puts power first and will not wake the device. The expiration says how long to keep trying: a value of 0 means one attempt and no storage; otherwise APNs may hold the notification, for 30 days or less. But it stores only one notification per app for an offline device, in most cases the latest. So ten pushes sent to a phone in flight mode usually become one when it lands. A collapse ID (64 bytes at most) asks for the same merging on purpose: a score update replaces the previous one.\n\nQuota arithmetic: 30,000,000 devices / 600,000 a minute = 50 minutes, and that is with the whole project quota. Go over and FCM answers 429 until the quota refills in the following minute. The quota counts messages, not requests.\n\nWhere it bites: a broadcast announcing something that ends in 30 minutes cannot reach everyone in time, and while it runs it is spending the same project quota your login codes need. Pace campaigns below the limit and reserve a share for urgent traffic.",
  [
   "apns-sending",
   "fcm-throttling"
  ]
 ],
 [
  "Each of the four rules answers a specific failure. Separate queues: a campaign of tens of millions and a login code are both just messages, and in one queue the code waits its turn. LinkedIn uses high-priority Kafka topics for member messages for this reason.\n\nReplays: a stream job records its progress with checkpoints. ATC processes requests in parallel, and if the job restarts after handling a request but before the checkpoint covering it, that request is processed again. Unhandled, the user gets the same notification twice. ATC drops any request it has already processed, which requires remembering what it has seen, hence the dedupe key and the send history.\n\nDead tokens: when an app is uninstalled, its device token stops being valid. APNs answers 410 Unregistered and says there is no need to send further pushes to that token; it lists Unregistered among the errors not to retry, and warns that too many error conditions slow your sending and can get the connection dropped.\n\nAccepted is not seen: Apple says notifications may be throttled, stored, and in some cases not delivered, all after your 200. FCM reports a Received count only for Android devices. So measure opens and downstream actions, and never treat the provider's 200 as the delivery metric.",
  [
   "linkedin-atc",
   "apns-responses",
   "apns-sending",
   "fcm-delivery"
  ]
 ],
 [
  "A normal A/B test runs a week or two and reads clicks. For notifications that is the wrong window: the treatment that sends more wins on clicks immediately, and the people it annoys turn notifications off weeks later, after the test has been called. A long-lived holdout is a small group kept on the old policy, or on no policy, for months, so the slow effect has time to show. Twitter ran its notification experiment for 33 days and kept each user in the same treatment throughout, noting that an approach may temporarily improve performance and then reverse.\n\nDuolingo's holdout is a different use of the same tool: checking a system that keeps learning after launch. Its bandit chooses which reminder template to send, and the reward is 1 if the user completes a lesson within two hours. In 5% of rounds the template is drawn uniformly at random instead. The paper gives two reasons. It lets them see whether the bandit ever fails to beat random, as might happen if a subtle bug were introduced. And it supplies training data for poorly performing templates the bandit would otherwise almost never try. The 2.5% gap is the measured value of the learned policy over random choice, five months and more after launch.",
  [
   "twitter-notif-ltv",
   "duolingo-notif-bandit"
  ]
 ]
];
SD.deep["7.10"] = [
 [
  "The terabyte an hour is an estimate built from stated assumptions, and it helps to see them. The NVIDIA author assumes just five cameras of two megapixels at 30 frames a second, which he says produces more than 3 TB of raw video an hour, and rounds it down to 1 TB to be conservative. A car drives 8 hours on 260 days: 2,080 hours a year. So 100 cars x 2,080 h x 1 TB = 208,000 TB, about 200 PB (his figure is 204.8). The same fleet records over a million camera-hours of video a year: 100 x 5 x 2,080 = 1.04M.\n\nNow do the upload. One car brings home 8 TB a day. A 1 Gbit/s link moves 125 MB/s, which is 0.45 TB an hour, so that single car needs about 18 hours of a dedicated gigabit line, every day. The network, not the disk, is what rules out uploading everything.\n\nThe 2020 remark explains what the waste is: data spoiled by faulty sensors, dust on a lens or badly mounted sensors, plus data that simply lacks diversity. The same author suggests a preprocessing tier close to where data is collected, which is the argument for selecting on the vehicle or at the depot before anything crosses the network.",
  [
   "nvidia-av-scale-2017",
   "nvidia-av-dgx-2020"
  ]
 ],
 [
  "A rolling buffer is a recorder that keeps only the last minute or so of sensor data and overwrites the oldest. It is needed because a trigger fires at or after the interesting moment, and what you want is the lead-up. When a trigger fires, the buffer's contents plus the next few seconds are saved as a segment and queued for upload; otherwise the data is dropped.\n\nThe triggers are proxies for the model being wrong or the scene being rare. A disengagement, in Aurora's definition, is a vehicle operator proactively taking back control because they thought an unsafe situation might develop or did not like how the vehicle was driving. Aurora's second source is the copilot in the passenger seat, who flags experiences that are interesting, uncommon or novel.\n\nnuScenes shows how selective a good dataset is: its 1,000 scenes of 20 s add up to 20,000 s, about 5.6 hours, chosen by hand for dense traffic, rare classes such as ambulances and animals, and dangerous situations such as jaywalkers.\n\nWhy keep a random sample as well? Triggered data is hard cases by construction. If you measure accuracy only on it, or estimate how often pedestrians appear from it, the answer is biased. A small uniform sample tells you what ordinary driving looks like.",
  [
   "aurora-online-to-offline",
   "nuscenes"
  ]
 ],
 [
  "Before Content Search, Waymo mined its logs with heuristics on features such as an object's estimated speed and height. To find people on scooters, you might ask for objects of a certain height moving between 0 and 20 mph. That returns scooters, and also many other things that share those attributes; the results were too broad.\n\nThe search approach converts every logged object, parked bench or moving vehicle, into an embedding: a vector placed so that similar-looking things are close together. A query is then an example. Waymo says you can give it a photo of a cactus found online, or even a drawing of one, and it returns the places where vehicles saw similar objects. The index is what turns raw logs into something you can ask questions of, so build it at ingest, for everything.\n\nStorage tiers interact with this. The embeddings and metadata are small and must stay hot. The raw sensor data is huge and mostly untouched, so it belongs in archive classes. But S3's Glacier classes are not readable in real time: objects must be restored first, with retrieval times of minutes to hours, or hours for Deep Archive, which also has a 180-day minimum storage charge. So a mining job is two-phase: search the hot index now, wait for the cold segments.",
  [
   "waymo-content-search",
   "aws-s3-storage-classes"
  ]
 ],
 [
  "Why can an offboard model label better than the model in the car? The onboard detector must answer in real time and, as Waymo's paper notes, sees only the current frame or a few past ones. Offboard, the drive is over, so the labeller can look at a whole sequence, including what happened after each frame, and spend as much compute as it likes. Waymo's pipeline detects objects in every frame, links them into tracks, gathers all the points for one object across its whole track, and then refines the box. A car seen from one side at first and from behind ten seconds later is labelled with both views in hand. They also enlarge the network and run each scene at ten rotations, things too slow for a vehicle.\n\nDensity is a cost lever. A 20 s scene labelled at 2 Hz is 40 frames; at 10 Hz it is 200. The nuScenes authors found 2 Hz annotations robust to interpolation up to 10 or 20 Hz.\n\nThe economics, with this topic's lab numbers: 2M frames by hand at $0.50 is $1M. Auto-labelled at $0.05 plus human review of 20% at $0.50 is $100,000 + $200,000 = $300,000. The review share is the knob, and it should go to the frames where the labeller is least sure.",
  [
   "waymo-offboard-autolabel",
   "nuscenes"
  ]
 ],
 [
  "A training set here is not a folder; it is the result of a query over data that keeps changing. New segments arrive daily, labels are corrected, the auto-labeller is upgraded. If a model regresses and all you know is that it trained on the pedestrian dataset, you cannot tell whether the model, the data or the labels changed. A snapshot fixes that: an immutable manifest listing exactly which segments, which label version and which code commit produced the set. Lineage is being able to walk from a model back through that manifest to the raw logs.\n\nThe Delta Lake detail is a warning against assuming a table format gives you this for free. Time travel needs both the transaction log and the old data files to still exist. By default the log history is kept 30 days and trimmed whenever a checkpoint is written, and files become candidates for VACUUM 7 days after deletion. So a query for the table as it stood four months ago, when the model now on the road was trained, fails under default settings.\n\nThe consequence: raise retention deliberately, or write each training set out as its own immutable copy or manifest, and keep it for as long as a model trained on it might need to be reproduced or investigated.",
  [
   "delta-time-travel"
  ]
 ],
 [
  "Aurora names three kinds of offline test, and they check different layers. Perception tests: specialists label what really happened in a logged event (a bicyclist, 3 mph) and new perception software is scored against that. Manual driving evaluations: compare the trajectory the software planned with what the human operator actually drove. Simulations: virtual worlds where many permutations of one situation are tried.\n\nWhy must agents be reactive? Plain log replay feeds recorded sensor data to new software. That works until the new software drives differently from the recording, say braking earlier. The recorded car behind does not know, and drives through you. Waymo's description is that as the software's position diverges from the logged scene, the environment is updated, with other cars, cyclists and pedestrians responding to the vehicle's new position. Simulation is also where scale comes from: Waymo reported around 20 million simulated miles a day.\n\nThe Aurora example shows how one road event becomes a regression suite. A vehicle ahead suddenly pulled over after a turn and the operator disengaged. From it they built 50 nudging simulations: an exact reproduction, plus variations such as changing the other vehicle's speed. Every future model must pass them, so that fix cannot quietly regress.",
  [
   "aurora-online-to-offline",
   "waymo-simulation-2020"
  ]
 ]
];
