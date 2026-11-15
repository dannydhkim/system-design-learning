// "More detail" for the key ideas of each topic: one entry per key idea, [text, source keys or 'calc'].
// Shown under each key idea on the Learn station (js/app.js). Checked by tools/check-content.mjs.
window.SD = window.SD || {}; SD.deep = SD.deep || {};
SD.deep["5.1"] = [
 [
  "Think of each loaded copy of the model as one till in a shop. In Triton these copies are called instances: by default one execution instance is created per GPU, and an instance group setting can put several on a GPU so that several requests run at the same moment. A till serves one batch at a time, so its output is batch size ÷ time per batch, and the fleet's output is that times the number of tills.\n\nWorked through: a batch of 8 in 40 ms is 8 ÷ 0.04 = 200 requests a second per replica. Unbatched at 12 ms each, the same replica manages about 83.\n\nThe awkward part is that there are so few tills. A web server with hundreds of threads absorbs a burst; a replica with one slot and a 40 ms service time has nowhere to put the ninth request except a queue. That is why you size for well under 100% busy: 1,400 requests a second at 70% busy needs 1,400 ÷ (200 × 0.7) = 10 replicas, not 7.",
  [
   "triton-model-config"
  ]
 ],
 [
  "The Clipper paper names two reasons a batch is cheaper than its parts. First, some costs are paid once per call whatever the size: the RPC, and framework overheads such as copying inputs to GPU memory. A batch pays them once and shares them. Second, the framework can run many inputs through the same data-parallel operations at once, which is what a GPU is built for. In Clipper's tests, batching raised throughput by up to 26 times for one model while still meeting a 20 ms latency target.\n\nThe price is in the shape of the work. A batch goes in together and comes out together, so the first request to arrive waits for the batch to form and then for every other member to be computed. Clipper compares the idea to Nagle's algorithm in TCP, which holds back small packets to send fewer, fuller ones: the gain depends on how large the fixed cost of sending is next to the cost of adding one more item.\n\nTriton's caveat: the dynamic batcher is meant for stateless models, where it does not matter which requests end up side by side.",
  [
   "clipper",
   "triton-batchers"
  ]
 ],
 [
  "The largest batch allowed is a ceiling for two reasons: bigger batches take longer, and a batch has to fit in GPU memory. The wait is what happens when the queue holds fewer requests than that ceiling.\n\nTriton's default is not to wait at all: it takes whatever is queued, up to the maximum, and runs it. Set a delay and it holds an underfull batch until either enough requests arrive to fill it or the oldest request has waited the limit, then sends what it has. So the delay is a cap on extra queueing time per request, not a fixed pause.\n\nTensorFlow Serving's tuning advice shows the order to work in. First set the timeout very high and tune the batch size for throughput against average latency. Then, for online serving, bring the timeout down to rein in tail latency: batches normally fill, and the timeout only matters in a lull, when it is better to run an underfull batch than make the queue wait. Triton's version of the same advice: raise the delay step by step until the latency budget is exceeded.",
  [
   "triton-batchers",
   "tfserving-batching"
  ]
 ],
 [
  "Clockwork's paper publishes measured GPU execution times for ResNet50 on a Tesla V100 at each batch size: 2.61 ms for 1, 3.78 for 2, 5.61 for 4, 9.13 for 8 and 15.67 for 16. Divide batch size by time to get throughput: about 383, 529, 713, 876 and 1,021 images a second.\n\nLook at what each doubling buys. From 1 to 2, throughput rises 38%. From 8 to 16 it rises 17%, while the time every request in the batch spends executing rises 72%, from 9.13 to 15.67 ms. The early doublings were filling idle GPU capacity and sharing fixed costs; by 8 or 16 the GPU is nearly busy the whole time, so a bigger batch is mostly just more work in one go.\n\nThis is why the batch size is found by measurement, not chosen. Clipper automates it: raise the batch size by a fixed step until batch latency exceeds the target, then back off by 10%, and keep doing that as conditions change. By hand it is the same procedure: sweep batch sizes under load and take the largest whose p99 fits.",
  [
   "clockwork",
   "clipper"
  ]
 ],
 [
  "A cold start is a queue of slow steps, each of which must finish before the first request can be answered. KServe's own example shows it on a small model: the first requests took around 10 seconds, which the docs attribute to spawning the pods and downloading the model, and they add that it takes longer when the serving image is not already cached on the node. SageMaker says provisioning from zero instances takes several minutes, and calls made in that time return an error.\n\nAdd the autoscaler's reaction time on top. Knative, which KServe uses, averages concurrency over a 60-second window, with a 6-second panic window that triggers at twice the target. So even a fast decision is followed by the full start-up.\n\nWhy in-flight requests as the signal? In-flight = arrival rate × latency. At 100 requests a second and 200 ms that is 20; if traffic doubles or the model slows to 400 ms it becomes 40. Both are reasons to add replicas and one number catches both. KServe's docs note that GPU utilisation fluctuates too much to scale on easily.",
  [
   "kserve-autoscaling",
   "sagemaker-scale-to-zero"
  ]
 ]
];
SD.deep["5.2"] = [
 [
  "The two stores hold the same features in two shapes because they answer two different questions. Training asks \"what was this value for every user at every past moment?\", which is a scan over a huge timestamped table. Serving asks \"what is this value for user 42 right now?\", which is one key lookup that must return in milliseconds. No single layout does both well, so the offline store is a time series (entity, timestamp, value) and the online store is a dictionary keyed by entity. Feast describes its online store as mirroring the source schema with one difference: only the latest values per entity key are kept, with no history.\n\nThe size gap shows why. Online: 50 million users × 200 features × 8 bytes = 80 GB, fixed however long you run. Offline, if each feature is recomputed hourly and three years are kept: 24 × 365 × 3 = 26,280 values where the online store has one.\n\n\"One definition\" is the part that matters most: both stores are filled from the same registered feature view, so the number the model trained on and the number it is served mean the same thing.",
  [
   "feast-online-store"
  ]
 ],
 [
  "Materialisation is a copy job. In Feast it is a command you trigger for a time range: it reads feature values from the batch data source and writes the latest one per entity into the online store. Between runs the online store does not change, so a feature is at best as fresh as the last run.\n\nFor some features that is too slow. Chip Huyen's DoorDash-style example for estimating delivery time separates them well: the restaurant's mean preparation time in the past is a batch feature; how many other orders the restaurant has at this moment is a streaming feature, computed by a stream processor from live events. Feast's route for these is a push source, which writes values straight into the online store without waiting for the next materialisation.\n\nWriting to both stores is what keeps training honest. If the fresh value went only to the online store, there would be no record of what the model saw, and the training set would have to recompute it some other way. Huyen notes a limit worth knowing: feature stores often store and serve streaming features without managing the code that computes them.",
  [
   "feast-online-store",
   "huyen-realtime-ml"
  ]
 ],
 [
  "A point-in-time join is an \"as of\" lookup done per row. You hand Feast an entity dataframe: one row per training example with an entity id, a timestamp and the label. For each row it scans backward in time from that row's timestamp and takes the most recent feature value it finds, never a later one. It stops looking after the feature view's TTL, and that TTL is measured from each row's own timestamp, not from the moment you run the query.\n\nFeast's documented example uses a 2-hour TTL on hourly driver stats. Rows with a feature value shortly before them are joined; a row older than every feature value gets nothing; a row 11 hours after the last feature value also gets nothing, because it falls outside the TTL window.\n\nThe follow-up worth knowing: by default the join looks only at event timestamps. A value backfilled or corrected later, but stamped with the old event time, is returned as if it had been known then. Feast has a flag, filter_by_created_timestamp, that also requires the value to have existed by the row's timestamp.",
  [
   "feast-pit-joins"
  ]
 ],
 [
  "Google's Rules of ML lists three causes of skew: the training and serving pipelines handle data differently, the data changes between training and serving, and a feedback loop between the model and the algorithm. The two-code-path case is the first, and it arises naturally. Training is a batch job that can join whole tables; serving handles one request at a time with a separate lookup. Teams write each in whatever suits it, and the two versions drift: one counts cancelled orders, one rounds differently, one treats a missing value as zero.\n\nNothing crashes. The model receives a number of the right type that means something slightly different from what it learned, and accuracy drops quietly.\n\nRule 32 is the first fix: share the code, and avoid two programming languages across training and serving, which makes sharing nearly impossible. Rule 29 is the stronger one: save the features used at serving time and train on those logs, so the training data is by construction what serving produced. Google reports that the YouTube home page switched to this with significant quality improvements. Even logging a small fraction lets you measure the skew.",
  [
   "rules-of-ml"
  ]
 ],
 [
  "Freshness has a price, so it is set per feature. Hello Interview describes a ladder: static, daily batch, streaming, request-time, where each step down costs more infrastructure than the one above, and not every signal deserves the bottom rung. The test for a feature is how fast its true value moves compared with how often you refresh it. A 30-day purchase count barely changes in a day, so a nightly job is fine. A count of the last hour's activity recomputed daily describes an hour long past.\n\nA TTL covers the case where the refresh stops. If the pipeline for a user dies, the online store keeps returning the last value forever, and the model treats it as current. In SageMaker Feature Store a record expires at its event time plus the TTL duration; with no TTL it stays until overwritten.\n\nTwo practical points follow. An expired feature is a missing feature, so the model needs a sensible default for it. And SageMaker warns that the background deletion of expired items typically happens within a few days, so check your store's behaviour before relying on TTL as an exact cut-off.",
  [
   "hi-ml-features",
   "sagemaker-fs-ttl"
  ]
 ]
];
SD.deep["5.3"] = [
 [
  "Batch inference moves the model out of the request path. A scheduled job loops over every known input (every user, every product), runs the model, and writes input → prediction into a table. When a request arrives nothing is computed: the service reads one row by key. Google's course calls this static inference: predict on a set of examples, then cache the predictions.\n\nThat reordering is where the advantages come from. The job has no latency budget, so the model can be as slow as you like; Google's extreme example is a model that takes an hour per prediction, which is fine overnight and useless on demand. Inference cost stops being a worry, because the job runs at its own pace on whatever hardware is free. And since predictions exist before anyone sees them, they can be checked first, which online inference cannot offer.\n\nChip Huyen lists who has run this way: DoorDash's restaurant recommendations, Reddit's subreddit recommendations, and Netflix's recommendations around 2021, with predictions generated at an interval such as every four hours or every day. Operationally the serving side is a key-value read, with no GPU fleet, batching or cold start to manage.",
  [
   "google-mlcc-inference",
   "huyen-realtime-ml"
  ]
 ],
 [
  "Both limits come from the same fact: a lookup table can only answer the questions someone thought to ask in advance, as of the time they asked.\n\nStaleness is the gap since the last run. If the job runs nightly, a user who spent this morning looking at keyboards still gets yesterday's recommendations until tomorrow.\n\nCoverage is the harder one. Google puts the requirement bluntly: the model must make predictions for all possible inputs and store them. That works when the inputs are a list, such as registered users. It fails for free-form inputs such as search queries, which have a long tail of rare cases nobody can enumerate. It also fails for anyone who was not on the list when the job ran. Chip Huyen's example is an e-commerce site where half the visitors are new or not logged in: there is nothing precomputed for them, and by the next batch run they may have left without buying.\n\nThere is waste as well. She imagines an app where only 2% of users log in daily, citing Grubhub in 2020: 31 million users and 622,000 daily orders. Score everyone every day and 98% of that compute produces predictions nobody reads.",
  [
   "google-mlcc-inference",
   "huyen-realtime-ml"
  ]
 ],
 [
  "Online inference puts the model, and everything it reads, inside the user's wait. That buys coverage: any input that arrives gets a score, including rare ones, which Google's course calls out as the strength for long-tail inputs. It also buys recency, because the request can carry or trigger features about what happened seconds ago.\n\nThe cost is that the budget is now shared. Say the page has 100 ms end to end and network, feature lookups and business logic take 60. The model has 40 ms. A model that needs 200 ms is not slow, it is ineligible, however accurate. This is what Google means by the combination of compute-intensive and latency-sensitive limiting model complexity: you may have to ship a simpler model that answers in time.\n\nTwo further consequences. Google warns that you cannot necessarily fix prediction latency by adding more servers: replicas raise throughput, but one request still takes as long as one forward pass. And monitoring gets harder, since predictions are served the moment they are made and cannot be verified first. You watch aggregate quality and find out after the fact.",
  [
   "google-mlcc-inference"
  ]
 ],
 [
  "Asynchronous inference separates accepting a request from answering it. The caller hands over the work and gets a receipt; the result is fetched later. In SageMaker's version the payload is placed in S3, the call returns an identifier and an output location, the request waits in a queue, and the result is written to S3 when done. It is aimed at large payloads (up to 1 GB) and long processing times (up to an hour), and because nobody is blocked waiting, the endpoint can scale to zero when the queue is empty.\n\nLLM batch APIs are the same deal with a price tag. Anthropic's Message Batches API charges 50% of standard prices. A batch holds up to 100,000 requests or 256 MB; most finish within an hour; a batch that has not finished within 24 hours expires.\n\nWhy would a provider sell this at half price? The docs do not say; the likely reason is that work with no deadline can be run whenever capacity is free. The half you save is the price of not being able to say when.\n\nThe practical catch is that 24 hours is a limit and not a promise of completion, so a job due tomorrow evening should be submitted with slack to resubmit whatever expired.",
  [
   "sagemaker-async-inference",
   "anthropic-message-batches"
  ]
 ],
 [
  "The hybrid works by sorting each piece of the computation by one question: does it depend on anything known only at request time? Whatever does not can be done ahead and cached.\n\nChip Huyen's session-based recommender is a clean example. Item embeddings are computed offline. A new visitor looks at items 1, 10 and 20; the service looks up those three precomputed embeddings and averages them into a session embedding. The only online work is that average, a nearest-neighbour search for around a thousand candidates, and a ranking pass over them. She calls this stage online prediction with batch features: predictions are made after the request arrives, yet nothing is computed from streaming data.\n\nHello Interview's video recommendations answer makes the same cut: precompute and cache the embeddings for all videos, cache user embeddings, and even cache candidate generation results.\n\nThe interview follow-up is usually \"what goes stale?\" Each cached piece has its own refresh rate: an item embedding can be a day old, a cached candidate list for a user perhaps hours, and the final ranking must see the current session.",
  [
   "huyen-realtime-ml",
   "hi-ml-video-recs"
  ]
 ]
];
SD.deep["5.4"] = [
 [
  "A registry separates two things that a file path mixes up: which artefact this is, and which artefact production should use. In MLflow, the first model registered under a name is version 1, and each new one registered to that name increments the number. A version number stays attached to that one model, and the version is linked to the run that produced it, so you can trace how it was trained, with what data and parameters. The URI models:/MyModel/1 always means the same model.\n\nAn alias is the second thing: a mutable, named pointer to one version. Production code asks for models:/MyModel@champion and never mentions a number. Promoting version 8 means reassigning the champion alias from 7 to 8; rolling back means pointing it at 7 again. No code or config in the serving system changes. It is the same idea as a git branch name pointing at a commit.\n\nLineage earns its keep during an incident. When the champion misbehaves, the first questions are \"what data was this trained on?\" and \"what changed since the last version?\". With a registry those are lookups. Without one they are archaeology in someone's notebook.",
  [
   "mlflow-model-registry"
  ]
 ],
 [
  "Shadowing works by duplicating traffic at the router. In SageMaker's version, the endpoint routes a copy of each inference request to the shadow variant in real time; only the production variant's response goes back to the caller, and the shadow's response is discarded or logged for offline comparison. The caller cannot tell that a second model ran.\n\nThat makes it the right tool for the questions offline validation cannot answer: under the real request mix and rate, what is its p99 latency, does it error, does it fit on this instance type? AWS lists the same uses for things that are not models at all, such as a patched container or a different instance. Logged responses also let you compare the two models' predictions on identical inputs.\n\nWhat it cannot show follows from the same mechanism. No user ever sees a shadow prediction, so no click, purchase or complaint is caused by it. A recommender's shadow can tell you its lists differ from production's in 30% of requests, but not whether people would prefer them.\n\nOne cost to state in an interview: every request is now computed twice, so the shadow needs real capacity.",
  [
   "sagemaker-shadow-tests"
  ]
 ],
 [
  "Google's SRE workbook defines a canary as a partial and time-limited deployment of a change, plus its evaluation. The part that gets the change is the canary; the rest is the control. The word \"control\" matters: you compare canary and control over the same minutes, with the same traffic mix. The workbook warns against the alternative, replacing everything and comparing before with after, because time itself changes metrics. A release on Monday compared with the weekend before is mostly measuring Monday.\n\nThe damage arithmetic is exposure × defect rate. A build that fails 20% of requests, deployed everywhere, fails 20% of traffic. On a 5% canary it is 0.05 × 0.20 = 1%. On 2% with a 30% failure rate it is 0.6%. The impact on the error budget is proportional to the traffic exposed.\n\nChoosing what to compare is the hard part. The workbook suggests starting from your SLIs and keeping to a few metrics, perhaps no more than a dozen. In its example the best ones are HTTP return codes and latency; CPU usage is a poor one, because it can rise without harming users and makes the canary noisy enough that operators start ignoring it.",
  [
   "sre-canarying"
  ]
 ],
 [
  "Blue/green replaces \"upgrade the running thing\" with \"build a second one beside it\". Fowler's description: two production environments, as identical as possible. Blue is live. You deploy and do final testing on green while it takes no traffic, then switch the router so every request goes to green. Blue sits idle but intact, which is the whole point: if green misbehaves, you switch the router back.\n\nCompare a rolling update, where old replicas are replaced a few at a time. Rolling back means redeploying the old version across the fleet, which for a model means loading weights again on every replica. With blue/green nothing has to start, load or warm up, because blue never stopped.\n\nThe price is capacity. For the length of the rollout you pay for two fleets able to carry full load, and for GPU serving that can be the largest line on the bill. That is why the old fleet is kept for a bounded bake period and then released.\n\nFowler notes a catch that follows you into ML: anything written while green was live, such as transactions, is not automatically on blue when you switch back.",
  [
   "fowler-blue-green"
  ]
 ],
 [
  "Deciding in advance means the rollback is a rule a machine can execute, not a judgement made at 3 a.m. SageMaker's deployment guardrails show the shape: you attach CloudWatch alarms, and if any trips during the monitoring period SageMaker rolls back to the old fleet. Its example alarm watches the average error rate over two 10-minute periods; another watches model latency on the new fleet. With no alarms attached, automatic rollback simply does not happen. For a model, add a business guardrail such as click-through rate, because a model can be fast, error-free and wrong.\n\nThe second condition is the dangerous one. A model is a function of a specific list of inputs, in a specific order and encoding. If version 8 was trained with two extra features and the caller still sends version 7's, a server that fills gaps with defaults will return a confident score with a 200 status. Google's MLOps guide recommends testing the prediction service with the expected inputs on every release, precisely because this catches a new model version that expects a different input. If the inputs changed, the model and the feature code must be deployed together.",
  [
   "sagemaker-guardrails-config",
   "gcp-mlops-cd"
  ]
 ]
];
SD.deep["5.5"] = [
 [
  "The replicas stay identical for a simple reason: same starting point, same update, every step. PyTorch's DistributedDataParallel (DDP) shows the mechanics. At construction, the process with rank 0 broadcasts its weights to all the others, so every replica starts equal. Each process then runs a forward and backward pass on its own batch. As gradients become ready, DDP runs an all-reduce: a collective operation after which every process holds the mean of that gradient across all processes. The averaged values are written into each parameter's grad field, and each process's ordinary optimizer takes a step. The optimizer thinks it is training a local model; it just happens to see the same gradients as everyone else.\n\nThe arithmetic: 8 GPUs with 32 examples each, averaged, give the gradient of one batch of 256. So data parallelism is one large-batch SGD step computed in pieces.\n\nThe trap is in the name. DDP does not split the data for you. Each process loads its own batches, and you must give it a sampler, such as DistributedSampler, that hands each process a different shard. Without one, all eight GPUs can end up computing the same gradient on the same examples.",
  [
   "pytorch-ddp-notes",
   "pytorch-ddp-class"
  ]
 ],
 [
  "Scaling efficiency is speedup divided by GPU count. At 100%, 128 GPUs process 128 times the images per second of one. Every step has a part that does not shrink when you add workers: moving gradients between machines and waiting for the slowest one.\n\nHow the gradients are moved decides how bad it gets. Uber's Horovod paper starts from standard distributed TensorFlow, which used parameter servers: workers send gradients to a central process to be averaged. One parameter server becomes a network or compute bottleneck; several make the traffic all-to-all, which can saturate the network. On 128 GPUs they measured about half the hardware wasted: 128 GPUs doing the work of roughly 64.\n\nHorovod replaced this with ring all-reduce, where there is no central server and each of N nodes exchanges data with just two neighbours, 2 × (N − 1) times. The same benchmarks then reached 88% efficiency, and over 90% with RDMA networking. Goyal et al. report about 90% going from 8 to 256 GPUs.\n\nSo \"careful\" means the communication pattern and the network, not the model. In an interview, quote efficiency and turn it into time: 80 hours ÷ (16 × 0.85) ≈ 5.9 hours.",
  [
   "horovod",
   "goyal-large-minibatch"
  ]
 ],
 [
  "Goyal et al. give the intuition by comparing two ways to consume the same k batches. Small-batch SGD takes k steps, each with learning rate η on one batch of n. Large-batch SGD takes one step on all kn examples. Because the large-batch gradient is an average, a single step at rate η moves the weights only about as far as one small step, though it used k times the data. If the gradients would not have changed much over those k small steps, one large step at rate kη lands in about the same place as the k small ones. That is the whole rule, and nothing else (weight decay and so on) changes.\n\nWorked through with their reference of 0.1 per 256 images: 8 GPUs × 32 = 256 gives 0.1; 256 GPUs × 32 = 8,192 gives 0.1 × 32 = 3.2.\n\nThe assumption fails exactly when the network is changing rapidly, which is the start of training. Hence warmup: begin at η and raise the rate by a constant amount each iteration until it reaches kη after 5 epochs. They found a warmup held at a constant low rate was not enough for large k: the jump out of it made training error spike. The rule also has a ceiling: on ImageNet, accuracy degraded beyond about 8k images per batch.",
  [
   "goyal-large-minibatch"
  ]
 ],
 [
  "A training step needs two things in sequence: a batch of prepared data, then the GPU work on it. TensorFlow's performance guide starts from the naive loop, where these alternate. While the pipeline fetches data the model sits idle, and while the model trains the pipeline sits idle, so step time is the sum of the two.\n\nPrefetching runs the input work for step s+1 in the background while the model executes step s. Step time becomes the maximum of the two, not the sum. With 30 ms of input work and 50 ms of GPU work, a step drops from 80 ms to 50 ms and the GPU is always busy.\n\nNow make the input work 80 ms. Prefetching gives max(80, 50) = 80 ms, and the GPU works 50 of every 80 ms: 62% utilisation, with the rest of the bill buying waiting. This is the bottleneck case, and the fixes attack the 80: decode and augment several samples in parallel across CPU cores, read several files at once, and cache the results of expensive transformations so they run only in the first epoch.\n\nThe symptom to recognise: GPU utilisation well below 100% while CPU cores are pinned. More GPUs make that worse.",
  [
   "tf-data-performance"
  ]
 ],
 [
  "Why the optimizer state as well as the weights? Optimizers keep their own running numbers between steps; PyTorch's tutorial says the optimizer's state_dict contains buffers and parameters that are updated as the model trains. Restore only the weights and the optimizer restarts from scratch part-way through training. The tutorial also suggests saving the epoch you stopped at, and notes that such a checkpoint is often two to three times larger than the model alone.\n\nResuming is deliberately crude. In PyTorch's elastic launcher, when any worker fails, all workers are restarted with the same arguments, and the script's first act is to load the latest checkpoint. Its example checkpoints once per epoch, so the worst case is losing a full epoch.\n\nThat gives the arithmetic for choosing an interval. A failure lands at a random point, so it costs half an interval on average and a whole one at worst. At 30 minutes, 12 interruptions over a 3-day run cost about 12 × 15 minutes = 3 hours.\n\nDo not lean on the spot warning. AWS issues it two minutes ahead, on a best-effort basis, and recommends polling for it every 5 seconds. Writing a multi-gigabyte checkpoint to remote storage may not finish in that window.",
  [
   "pytorch-checkpoint",
   "torchelastic-train-script",
   "aws-spot-interruption"
  ]
 ]
];
SD.deep["5.8"] = [
 [
  "A language model stores what it knows in its weights; the RAG paper calls this parametric memory. Changing a fact stored there means more training. RAG adds a second, non-parametric memory: text sitting in an index outside the model, which the model reads at question time. In the original paper the generator was a pre-trained seq2seq model and the index was a dense vector index of Wikipedia.\n\nThe authors tested the \"update by changing the index\" claim directly. They built one index from a December 2016 Wikipedia dump and another from December 2018, and asked the same model about world leaders who had changed in between. The answers followed whichever index was plugged in, with no retraining. They called this hot-swapping the index.\n\nThe analogy is a new hire and the company wiki. You do not send the person back to university when a policy changes; you edit the wiki page. The interview follow-up is usually \"why not fine-tune instead?\", and this is the answer: an index edit takes effect on the next query, and you can point to the passage an answer came from.",
  [
   "rag-lewis"
  ]
 ],
 [
  "The two halves run on different clocks. The offline half is a batch job that runs when documents change; the online half runs on every question and has a latency budget.\n\nSizes make it concrete. Anthropic's cost example assumes 8,000-token documents cut into 800-token chunks, so ten chunks per document. A corpus of 10,000 such documents is 80 million tokens and becomes 100,000 chunks, each stored as one vector. Online, the question is turned into a vector too, and the store returns the chunks whose vectors lie nearest to it. If you keep the top 20, the prompt carries 20 × 800 = 16,000 tokens of retrieved text, out of 80 million.\n\nTwo details follow from the mechanism. The question must be embedded with the same model as the chunks, because nearness only means something when both vectors live in the same space; change the embedding model and you must re-embed the whole corpus. And chunk size is a real trade-off: one vector has to summarise the whole chunk, so a large chunk blurs several topics together, while a small one may not contain the full answer.",
  [
   "anthropic-contextual-retrieval"
  ]
 ],
 [
  "The model can only answer from what it is handed, so a chunk that is never retrieved is an answer that cannot be right. There are two common ways to miss it.\n\nFirst, the chunk does not say what it is about. Anthropic's example is a chunk reading \"The company's revenue grew by 3% over the previous quarter\": cut from its filing, it names neither the company nor the quarter, so a question about ACME in Q2 2023 does not match it. Second, embeddings encode meaning and blur exact strings. A search for \"Error code TS-999\" finds pages about error codes in general. BM25 is a keyword ranking function and matches the literal string.\n\nReciprocal rank fusion merges the two lists using ranks only: each list gives a document 1 / (60 + rank), and the scores are added. A chunk ranked 3rd and 4th scores 1/63 + 1/64 ≈ 0.0315, beating one ranked 1st in a single list (1/61 ≈ 0.0164). No score calibration between the two systems is needed.\n\nA reranker then reads the question and each candidate together. Anthropic retrieved 150 and kept 20. Their failure rate at top 20 went 5.7% to 2.9% with contextual embeddings and BM25, and to 1.9% with reranking.",
  [
   "anthropic-contextual-retrieval",
   "rrf-cormack"
  ]
 ],
 [
  "The \"lost in the middle\" experiment is simple. Give a model a question and 20 passages (about 4,000 tokens), exactly one of which contains the answer, and move that passage from first position to last. Accuracy traced a U: highest with the answer at the very start or the very end, lowest in the middle. For GPT-3.5-Turbo the middle was bad enough that it scored below its own closed-book result of 56.1%, meaning the model did worse with the answer buried in front of it than with no documents at all.\n\nThe same paper then used a real retriever. Going from 20 retrieved documents to 50 improved accuracy by only about 1.5% for GPT-3.5-Turbo and about 1% for Claude 1.3, although the retriever's recall was still rising. The extra passages contained more answers; the models did not use them.\n\nSo the cost side wins. At 800 tokens a chunk, 100 chunks is 80,000 input tokens per question against 8,000 for 10: ten times the input bill and a slower first token, for a levelled-off gain. Hence the funnel: fetch a wide set cheaply, let a reranker order it, and pass on only the top few. These results are for 2023 models; test your own.",
  [
   "lost-in-the-middle"
  ]
 ],
 [
  "A model reads the whole prompt in one pass but writes the answer one token at a time, each token needing its own pass through the network. So output length, not prompt length, sets most of the waiting time. Take an answer that takes 6 seconds: 40 ms retrieval, 150 ms reranking, and the remaining 5.81 s producing 500 tokens, about 86 tokens a second. Making retrieval twice as fast saves 20 ms. Halving the answer to 250 tokens saves about 2.9 s.\n\nStreaming does not shorten the total; it changes what the user experiences. Time to first token is the delay before any text appears, and with streaming the user starts reading then, not at second six. Capping output is a budget, not a fix: OpenAI's guide warns that a low cap can leave the response incomplete, so ask for a shorter answer in the prompt as well.\n\nPrompt caching lets the API resume from a prefix it has already processed. It only matches an identical prefix, so order the prompt from most to least stable: instructions and examples first, retrieved chunks and the question last. Put the question first and nothing can be reused.",
  [
   "openai-latency",
   "anthropic-prompt-caching",
   "anthropic-reduce-latency"
  ]
 ]
];
SD.deep["5.9"] = [
 [
  "Directed means each edge points one way: \"train\" waits for \"build features\". Acyclic means no chain of edges leads back to where it started. That second property is what makes the graph runnable: there is always at least one task with nothing left to wait for, so the orchestrator can start there and work forward. With a cycle, two tasks would each wait on the other for ever.\n\nAirflow's own docs give a four-task example, a, b, c and d, where the Dag states which task depends on which and how often the whole thing runs, for instance every day since 1 January 2020. For each scheduled run the orchestrator keeps a row of state per task: waiting, running, succeeded, failed, retrying.\n\n\"Does not care what happens inside\" cuts both ways. The good side: a task can be a SQL statement, a Spark job or a GPU training run, and the heavy work happens in those systems, not in the orchestrator. The bad side: the orchestrator learns only whether a task reported success. It cannot tell whether the rows written were correct, or whether a task that timed out had actually finished. Everything else on this page follows from that blind spot.",
  [
   "airflow-dags"
  ]
 ],
 [
  "The orchestrator sees one bit per attempt: reported success, or did not. A task that commits its write and then loses its connection looks exactly like one that crashed before writing anything, and both get retried. So the rule is not about being careful; it is that a second run must leave the same state as one run. The usual word is idempotent.\n\nTake a task that loads yesterday's one million events. As an INSERT, a retry after a hidden success leaves two million rows and no error anywhere. As \"delete partition date=2024-06-01, then write it\", or as an upsert keyed on event ID, the tenth run leaves the same one million as the first.\n\nThe inputs need the same discipline. Airflow's docs say to read from a specific partition, and suggest data_interval_start as the partition key, because someone may update the input between re-runs. now() is the same fault in another form: a run for 1 June that is retried on 3 June would silently compute 3 June. The date must come from the run, never from the clock. The follow-up question is usually \"how do you make a non-idempotent side effect, like sending an email, safe?\", and the answer is to record that it was done, keyed by the run.",
  [
   "airflow-best-practices"
  ]
 ],
 [
  "Every Airflow Dag run carries a data interval, the time range that run is responsible for. If each task reads and writes only that range, a run is a pure function of its interval, and the date it happens to execute on stops mattering.\n\nThat is all a backfill is. You give Airflow a Dag, a start date and an end date, and it creates runs for that range according to the schedule. You also choose what to reprocess: only missing runs, missing and errored runs, or all runs. Say a bug corrupted a feature from 1 to 7 June. After the fix you backfill those seven dates with \"all runs\"; each run overwrites its own partition and nothing else is touched. A max_active_runs setting on the backfill limits how many run at once, so a month of history does not starve tonight's scheduled run.\n\nThe catchup default is a version trap. In Airflow 3, missed run times between the start date and now are not created when a Dag is activated; the scheduler picks only the most recent applicable one. Setting catchup=True restores a run for every missed time. So \"I deployed it with a start date a month back\" does not mean a month of data exists.",
  [
   "airflow-dag-runs",
   "airflow-backfill"
  ]
 ],
 [
  "Step caching is memoisation applied to pipeline steps. The system remembers that this component, with these inputs and these parameters, produced that output. When the same combination comes up again it skips execution and hands back the stored output. In Kubeflow Pipelines this is on by default for every component, and a cached task is marked in the UI.\n\nTake a linear eight-step pipeline where step 2, preprocessing, takes three hours and step 7 fails on a typo. After the fix, steps 1 to 6 see the same inputs as before and return from cache in seconds. Step 7's code changed, so it runs, and step 8 runs because its input is new. A three-hour retry becomes a few minutes.\n\nWhere it bites: the cache can only compare what it can see, which is the declared inputs and parameters. A step that reaches out by itself, reading \"the newest table\" or the clock, looks unchanged from outside, so the cache returns last week's output without complaint. This is the idempotency rule again from the other side. Pass the data interval or dataset version in as a parameter so that new data means a new cache key, or turn caching off for that step (KFP: set_caching_options(enable_caching=False)).",
  [
   "kfp-caching"
  ]
 ],
 [
  "An ordinary pipeline fails loudly: a task crashes and the run stops. An ML pipeline can fail silently, because bad data still trains a model and the model still loads. The gates turn silent failures into stopped runs.\n\nGoogle's MLOps guide describes the data gate as a decision made before training. If the input breaks the expected schema (unexpected features, missing features, unexpected values), stop the pipeline and have someone investigate. If the schema is fine but the statistics have moved a lot, that is a signal to retrain. Example: an upstream team switches a price column from dollars to cents. No code changed and nothing crashes, but values are suddenly a hundred times larger; a range check catches it before any GPU time is spent.\n\nThe model gate runs after training. The same guide lists comparing the new model's metrics with the current model's, checking that quality holds across segments of the data and not just on average, and testing compatibility with the serving infrastructure and prediction API. Google's Wide & Deep paper describes both halves: a dry run before loading into the model servers, and a quality check against the previous model.\n\nNeither gate replaces the other: a model evaluated on a test set cut from the same corrupted data can pass.",
  [
   "gcp-mlops-cd",
   "wide-deep"
  ]
 ]
];
SD.deep["5.10"] = [
 [
  "A random number drawn on each request would flip a user between variants from one page to the next. Storing each user's assignment fixes that but adds a lookup. The standard trick, which Kohavi's survey calls hash and partition, needs no storage: hash the user ID joined with the experiment ID to get an integer spread evenly over a range, then cut the range into slices, one per variant. In Python terms: bucket = int(md5(f\"{exp_id}:{user_id}\").hexdigest(), 16) % 100, and buckets 0 to 49 are control. The same user always lands in the same bucket, on any server.\n\nThe experiment ID in the hash matters. Without it, the same half of your users would be the treatment group in every experiment, and one experiment's effect would leak into another's. The hash must also be good: the survey's authors tested several, and only MD5 produced no correlations between experiments; the string hash built into .NET failed.\n\n\"Anything other than chance\" is the working test for a confound. If treatment runs on newer servers, or control is \"everyone who signed up before March\", any difference you measure may come from the servers or the cohort, not the change.",
  [
   "kohavi-survey-2009"
  ]
 ],
 [
  "Both checks test the experiment machinery before you trust what it says about the product.\n\nIn an A/A test the two groups get an identical experience, so any \"significant\" difference is a false alarm. At 95% confidence that should happen about 5% of the time. If it happens far more often, something is wrong with assignment, logging or the statistics; Kohavi's survey reports robots doing exactly this.\n\nA sample ratio mismatch (SRM) asks: I configured 50/50, did I get it? Take the paper's case, 821,588 against 815,482 users. The expected count is 818,535 each, so each group is off by 3,053. The chi-square statistic is 2 × 3,053² ÷ 818,535 ≈ 22.8, where anything above 3.84 is already significant at 5%. The paper puts the chance of this under a true 50/50 split at less than 1 in 500,000, even though the split reads as 50.2/49.8.\n\nWhy does a small imbalance spoil everything? The missing users are rarely a random sample. If the treatment page crashes on slow phones before the logging call fires, those users vanish from treatment, and the remaining group looks better than control for reasons unrelated to the feature. The paper warns that ignoring an SRM can make a bad change appear good and ship.",
  [
   "kohavi-survey-2009",
   "fabijan-srm"
  ]
 ],
 [
  "A 5% significance level means: if there is no real difference, one look at the end shows a false \"significant\" 5% of the time. That guarantee assumes one look. A noisy difference wanders above and below the threshold as data arrives, and if you stop the first time it crosses, you keep every lucky crossing. Evan Miller's simulation, checking after every observation up to 150 on a change that does nothing, found a false positive 26.1% of the time. His table: peek ten times and you need a reported 1.0% to have a real 5%.\n\nTo fix the size in advance, his rule of thumb is n = 16σ²/δ² per variant, which Kohavi's survey gives for 95% confidence and 80% power. For a conversion rate, σ² = p(1 − p). With a 5% baseline and a smallest effect worth detecting of half a point: σ² = 0.05 × 0.95 = 0.0475, so n = 16 × 0.0475 ÷ 0.005² = 30,400 users per variant. Asking for a tenth of a point multiplies that by 25, to 760,000, because n grows with 1/δ².\n\nIf stopping early matters, a sequential design sets the checkpoints in advance and adjusts the thresholds so the overall error rate is still correct.",
  [
   "evan-miller-peeking",
   "kohavi-survey-2009"
  ]
 ],
 [
  "Offline evaluation replays logged data, and the log was produced by the old model: it records clicks only on what the old model chose to show, and the offline metric is a stand-in for what the business wants. The YouTube recommendations paper says the final decision there rests on live A/B tests, because live results are not always correlated with offline experiments.\n\nGuardrails exist because the target metric cannot see everything a change does. Microsoft's experimenters define them as metrics that do not indicate the success of the feature but that you do not want to harm when deciding to ship; page load time is their standard example.\n\nThe Bing number comes from an experiment that deliberately slowed 10% of users by 100 ms and another 10% by 250 ms for two weeks, and found every 100 ms of speed-up worth 0.6% of revenue. Use it as a budget. Suppose a heavier ranking model lifts revenue 0.5% through better results but adds 100 ms of latency. On Bing's ratio the delay costs about 0.6%, so the change is a small net loss despite a real modelling gain. An interviewer who hears \"the new model is more accurate\" will often ask what it costs in milliseconds for this reason.",
  [
   "youtube-dnn-recs",
   "dmitriev-dirty-dozen",
   "kohavi-rules-of-thumb"
  ]
 ],
 [
  "Layers solve a traffic shortage. If each request may be in at most one experiment, you run out of users. Google's design splits the system's parameters into layers, where a parameter belongs to one layer only, and assigns traffic independently in each layer. A request is then in one experiment per layer, so N experiments with N layers, and two experiments can never fight over the same parameter.\n\nInterleaving removes noise between users. An A/B test compares different people; interleaving shows one person a single list built from both rankers. In team-draft interleaving the rankers act like two captains picking players in turn, each adding its best result not yet taken, and a click is credited to whichever ranker contributed that result. Because it is a paired comparison it detects small differences with far fewer queries; Hello Interview's guide puts the saving at typically 10 to 20 times less traffic.\n\nTwo biases remain in plain A/B tests. Novelty: Microsoft describes a change that looked positive at first and was flat in the long term, and recommends splitting the effect by day. Interference: A/B analysis assumes treating one user does not affect another; with social features it does, so one remedy is to randomise whole clusters of connected users.",
  [
   "tang-overlapping-experiments",
   "chapelle-interleaving",
   "hi-ml-evaluation",
   "dmitriev-dirty-dozen",
   "saveski-network-effects"
  ]
 ]
];
SD.deep["5.11"] = [
 [
  "A traditional queue is an inbox: once a message is read and acknowledged it is gone. A log is closer to a ledger. Producers write lines at the end, nothing is erased when someone reads it, and each reader keeps a bookmark. In Kafka the bookmark is the offset: per partition, a single integer naming the next message to consume. Events are kept for as long as the topic's retention setting says, whether or not anyone has read them.\n\nTwo consequences. Producers never wait for consumers, so a slow or crashed training-data job does not slow the app that emits clicks; the events simply wait in the log. And because the bookmark belongs to the consumer, it can deliberately move it back. Kafka's design notes call this a break with the usual contract of a queue that turned out to be essential.\n\nConcretely: a feature job has a bug from Monday to Friday. With seven days of retention you deploy the fix, rewind that consumer's offset to Monday and let it re-read the week. A brand-new feature is the same move with a new consumer starting from the oldest retained event. The limit is retention: anything older than the window is gone from the log, so history you may want to replay later needs archiving somewhere cheaper.",
  [
   "kafka-intro",
   "kafka-design"
  ]
 ],
 [
  "Duplicates come from the order of two steps. A consumer must both process a batch and save its position, and it can crash in between. If it saves the position first and then crashes, the unprocessed messages are skipped for ever: at most once, with data loss. If it processes first and crashes before saving, its replacement starts from the old position and receives messages that were already handled: at least once, with duplicates. Most pipelines prefer a duplicate to a hole, so that is the usual choice. The producer side has the same shape: if an acknowledgement is lost, the producer resends, and the message may be written twice.\n\nWhether a duplicate hurts depends on the write. \"counter += 1\" applied twice gives 2 where the truth is 1. \"Set clicks for event e-123 to 1\", an upsert on a key, applied twice gives the same row; Kafka's docs describe this as receiving the same message twice just overwriting a record with another copy of itself. Deduplicating on an event ID works too, but you have to remember the IDs you have seen for as long as a duplicate could still turn up.\n\nKafka also offers an idempotent producer, where the broker deduplicates resends using a producer ID and sequence number. That covers the producer's retries, not your consumer's database write.",
  [
   "kafka-design"
  ]
 ],
 [
  "A schema here is more than column names. In TensorFlow Data Validation it records properties the data is expected to satisfy, such as types and the allowed values of a categorical feature. You do not write it from scratch: infer_schema() drafts one from statistics of the training data, and a person reviews it and checks it into version control. Each new batch is then compared with it. Google's paper on this system reports that the most common anomalies it caught were new feature columns, unexpected string values and missing feature columns: plain breakages, not subtle statistics.\n\nThe two distribution checks differ only in what is compared. Skew is training data against serving data. Drift is one span of data against the next, for example consecutive days. TFDV measures drift with L-infinity distance for categorical features and an approximate Jensen-Shannon divergence for numeric ones, and you choose the threshold.\n\nL-infinity is just the largest change in any one category's share. Yesterday a country feature was 50% US, 30% UK, 20% DE; today it is 50%, 10%, 40%. The biggest move is 0.20, so a threshold of 0.05 fires. The practical difficulty is the threshold: too tight and people learn to ignore the alerts, and the TFDV guide says setting it takes domain knowledge and iteration.",
  [
   "tfdv-guide",
   "breck-data-validation"
  ]
 ],
 [
  "The two clocks disagree whenever there is a delay between something happening and the pipeline hearing about it. A phone is offline from 14:10 to 15:20 and then uploads 30 clicks made at 14:30. Event time says 14:30; processing time says 15:20. An hourly \"clicks\" window on processing time puts them in 15:00 to 16:00, the wrong hour. On event time they belong to 14:00 to 15:00, but that window's hour ended twenty minutes before they arrived.\n\nSo event-time windows raise a new question: when do I stop waiting and publish the 14:00 window? A watermark is the system's running estimate that it has now seen everything up to some event time. The Dataflow paper is blunt that it is a heuristic with two failure modes. Too fast: data arrives behind the watermark, already late. Too slow: a single slow record holds back results for the whole pipeline.\n\nYou therefore also choose what to do with late events: drop them, or emit a corrected result for the old window. The interview point for ML is that a backfill sees every event, including the late ones, while the live feature was computed from what had arrived at the time, so the same feature can differ between training and serving.",
  [
   "dataflow-model"
  ]
 ],
 [
  "Two implementations usually exist for a good reason. Google's data validation paper notes that training data is generated offline and serving data online, with very different latency and throughput needs: a batch job can join a month of history in one go, while the serving path must answer each request in milliseconds. So one team writes a Spark or SQL job and another writes a streaming job, and the two slowly disagree.\n\nThe disagreements are mundane. One version counts \"purchases in the last 30 days\" including today and the other stops at midnight. One fills a missing value with 0 and the other with −1. Each is defensible alone; together they mean the model is trained on one feature and served a slightly different one, and nothing raises an error.\n\nGoogle's Rules of ML gives two remedies. Re-use code between the training and serving pipelines wherever possible. Or remove the second path altogether: save the features actually used at serving time to a log and train on those. It reports that the YouTube home page switched to logging features at serving time, with significant quality improvements and less code. Even logging a small fraction lets you check the two paths against each other, which is the measurement interviewers ask for.",
  [
   "breck-data-validation",
   "rules-of-ml"
  ]
 ]
];
