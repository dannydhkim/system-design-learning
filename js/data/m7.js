// Module 7 — ML Case Studies: end-to-end ML design prompts. Module 5 teaches the building blocks; these combine them.
// A topic with a `boss` field is the study page for that boss fight in bosses.js.
(function (T) {

  T({
    id: '7.1', boss: 'nextup', mod: '7', title: 'Real-time recommendation service', tag: 'Retrieve, rank, and learn within minutes',
    analogy: 'A bookshop assistant who keeps a shelf of staff picks ready for anyone, glances at what you have picked up in the last few minutes before pulling a dozen books for you, and rereads the till receipts every evening. If she is swamped, you still get the staff picks.',
    points: [
      'Requirements and scale (the NextUp numbers): 10M daily users × 10 feed loads is about 1,160 requests a second, 3,500 at a 3× peak, over a 10M-item catalogue, with a 250 ms p99 and the next load shaped by what the user just did. YouTube\'s paper states the same need: respond to newly uploaded content and to the latest actions taken by the user.',
      'API and data: GET /v1/feed returns a ranked page tagged with a request ID; POST /v1/events sends batches of impressions and actions and gets 202. The request ID ties each served feature vector to the actions that follow, which is how ByteDance\'s Monolith joins features and labels into training examples on a stream.',
      'Request path, with a budget per stage: retrieval sources run in parallel (nearest-neighbour search over two-tower embeddings, real-time sources built from recent actions, pre-generated popular lists), so retrieval costs the slowest source, not the sum. Then online features (Uber reported in 2017 a P95 under 10 ms for a whole prediction that reads features from its Cassandra store), the GPU heavy ranker on about 500 candidates, and re-ranking rules; when retrieval returns thousands, a light ranker trims them first (Instagram Explore\'s heavy ranker, in 2023, saw the best 100).',
      'Feedback path and freshness: events go to Kafka; a Flink job validates and dedupes them and materialises recent-action features (Pinterest uses the last 100 actions), and a joiner turns served features plus labels into training examples. Monolith pushes the embeddings touched since the last sync every minute and dense weights daily; Instagram fine-tunes its rankers every hour.',
      'Failure and fallbacks: precompute recommendations off-peak so every user has a list when the heavy model is under pressure (Instagram), serve that or a popular list when a dependency fails, and keep the fallback path tested and much simpler than the main one (AWS). Monolith snapshots its parameter servers once a day and found that losing a day of updates on one shard did little harm.',
      'Cold start and evaluation: new items need a freshness signal or pre-generated sources; new and occasional users gain most from real-time features (Pinterest saw larger gains for non-core users). Judge a change offline first, then decide with a live A/B test, because YouTube found live A/B results are not always correlated with offline experiments.'
    ],
    pitfall: 'Making the system "real-time" by retraining the whole model from scratch every few minutes. Freshness comes more cheaply from streamed features and incremental updates of the parameters that changed, with full retrains on a schedule; Pinterest found a model built on real-time features goes stale within days if it is never retrained.',
    say: 'At 3,500 feed loads a second I would run the retrieval sources in parallel in about 40 ms, read features in under 10 ms, score about 500 candidates on GPUs in about 50 ms and re-rank; events flow through Kafka into streamed features within seconds and into incremental model updates within minutes, with a precomputed list as the fallback.',
    refs: [
      ['youtube-dnn-recs', 'Freshness is a requirement — “The recommendation system should be responsive enough to model newly uploaded content as well as the latest actions taken by the user.”'],
      ['youtube-dnn-recs', 'Offline is not the verdict — “This is important because live A/B results are not always correlated with offline experiments.”'],
      ['instagram-explore-scaling', 'Light, then heavy ranking — “A second-stage ranker (i.e., heavy model), which is more precise and compute intensive and operates on the 100 best candidates from the first stage.”'],
      ['instagram-explore-scaling', 'Hourly fine-tuning — “we can re-train (fine-tune) our models every hour as soon as we have new data.”'],
      ['instagram-explore-scaling', 'A precomputed fallback — “That’s why we precompute recommendations for some users during off-peak hours.”'],
      ['uber-michelangelo', 'Serving with feature-store lookups, 2017 — “In the case of models that do require features from Cassandra, we typically see P95 latency of less than 10ms.”'],
      ['monolith-bytedance', 'Push only what changed — “We push the subset of sparse parameters whose keys are in the touched-keys set with a minute-level time interval from the training PS to the online serving PS.”'],
      ['monolith-bytedance', 'Labels that arrive late — “In our system, an on-disk key-value storage is utilized to store features that are waiting for over certain time period.”'],
      ['transact-pinterest', 'Stale within days, so retrain twice a week — “Otherwise, the model can become stale in a matter of days, leading to less accurate predictions. We retrain Pinnability from scratch twice per week.”'],
      ['aws-wa-graceful-degradation', 'Keep the fallback simple — “Note that the pathways taken in case of component failure need to be tested and should be significantly simpler than the primary pathway.”']
    ],
    cards: [
      ['Why do retrieval sources run in parallel, and what does that do to the latency budget?', 'They are independent, so the feed service calls them all at once and waits for the slowest. Retrieval then costs the slowest source plus a merge, not the sum of the sources, which leaves more of the budget for ranking.'],
      ['How does Monolith keep a very large model fresh without shipping all of it every minute?', 'It trains online from a Kafka stream of joined examples and, every minute, pushes only the sparse embeddings touched since the last sync to the serving parameter servers. Dense weights change slowly and are synced once a day, at the quietest hour.'],
      ['How do you decide whether a new ranking model ships?', 'Offline metrics (precision, recall, ranking loss) guide development, but the decision is a live A/B test on the target engagement metric with guardrails such as hides, because live results are not always correlated with offline ones.']
    ],
    quiz: [
      ['The feed has a 250 ms p99 budget, 50 ms of it network. Three retrieval sources run in parallel and take 25, 40 and 35 ms; features take 10 ms, the light ranker 15, the heavy ranker 50 and re-ranking 5. How much budget is left?', ['80 ms', '20 ms', '130 ms', '90 ms'], '50 + 40 (the slowest source) + 10 + 15 + 50 + 5 = 170 ms, leaving 80. Adding the three sources (100 ms) leaves 20; forgetting the network leaves 130; forgetting the feature read leaves 90.', 'calc'],
      ['A recommender holds terabytes of sparse embeddings and a small dense network, trained online from a stream. Shipping the whole model to serving every minute is too heavy. What schedule did ByteDance\'s Monolith use?', ['Touched embeddings every minute; dense weights once a day', 'Dense weights every minute; all embeddings once a day', 'The whole model every hour, compressed before it is sent', 'The whole model, but only after a nightly batch retrain'], 'In a short window only a small set of IDs is trained, and dense weights move slowly, so Monolith pushes just the touched embeddings each minute and the dense part daily at low traffic. Reversing that ships the big part often and the fast-changing part rarely.', ['monolith-bytedance']],
      ['A streaming joiner pairs each served feature vector with later user actions by request ID, holding the features in memory for one hour. Purchases often come days after the impression. What goes wrong, and what did Monolith do?', ['Late purchases miss their features; park waiting features in an on-disk store', 'Nothing; join each purchase to the features the item has when it happens', 'Purchases get counted twice; keep a single label per user per day instead', 'The joiner runs out of memory; drop purchases and train on clicks alone'], 'After an hour the served features are gone, so a purchase on day three has nothing to join to and that impression is never learned as positive. Monolith looks in memory first, then in an on-disk key-value store. Joining to features as of the purchase would train on values the model never saw at serving time.', ['monolith-bytedance']],
      ['A ranker that reads each user\'s last 100 actions beats the baseline by a wide margin on day one of an A/B test. With the model frozen the gain shrinks over two weeks, while a copy retrained on fresh data keeps it. Cause and fix?', ['The model goes stale as behaviour shifts; retrain it on a schedule','A novelty effect; end the test early and ship the day-one result', 'Feature drift in the store; rebuild the online store from the warehouse', 'Sample ratio mismatch; reassign users to the two arms and restart'], 'A retrained copy holding the gain rules out novelty and assignment problems: the frozen model ages. Models fed with real-time features are more time-sensitive, and Pinterest retrains its Homefeed ranker from scratch twice a week because otherwise it goes stale within days.', ['transact-pinterest']],
      ['A new ranker raises offline recall@100 by 4%. In a two-week A/B test, watch time is flat and the share of hidden items rises. Product asks whether to ship on the strength of the offline gain. What do you answer?', ['No: the live test decides, and it shows no gain and a worse guardrail', 'Yes: the offline set is larger than two weeks of traffic, so it is surer', 'Yes: hides are a noisy metric and should not block a model that recalls more', 'Ship it to half the users, since flat watch time means it does no harm'], 'Offline metrics guide development; the live experiment decides, because offline and live results do not always agree. Here the target metric did not move and a guardrail got worse, so the change does harm, whatever its offline recall.', ['youtube-dnn-recs']]
    ],
    explain: ['Explain how you would design a real-time recommendation service for 10M daily users, end to end.', ['Requirements and scale: about 3,500 requests a second at peak, a latency budget, freshness of actions and items', 'Request path with a budget per stage: parallel retrieval, features, (light then) heavy ranking, re-ranking', 'Feedback path: events through a stream into features and joined training examples; incremental model updates', 'Failures: a precomputed or popular fallback that is simpler than the main path and tested', 'Cold start for users and items, and evaluation offline then by A/B test with guardrails']],
    duck: ['If the model is retrained every night, how can it know what I watched five minutes ago?', 'Why not just call the warehouse for features when a request comes in?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['What should a brand-new user see on their very first feed load?', true, 'Cold start needs popular, contextual or onboarding sources.'],
        ['How soon after upload must a new video be able to appear in feeds?', true, 'Sets how often item embeddings and the index are refreshed.'],
        ['What should the feed show if the ranker or the feature store is down?', true, 'A fallback list has to exist before the incident.'],
        ['Which A/B metric decides a launch, and which guardrails can veto it?', true, 'Defines how every change will be judged.'],
        ['Should the embeddings have 128 or 256 dimensions in the first version?', false, 'A modelling detail you tune later.'],
        ['Should the stream processor be Flink or Spark Structured Streaming?', false, 'A tool choice, not a requirement.'],
        ['Which GPU model should the ranking fleet be bought with?', false, 'Procurement detail; it does not shape the design.'],
        ['Should the feed service be written in Python or in Go?', false, 'A language choice that changes nothing here.']
      ] },
      { type: 'estimate', brief: 'Given: 10M daily users · 10 feed loads a day · 20 items shown per load · 1 KB per logged training example · embeddings of 256 float32 values · each user\'s last 100 actions kept at 64 bytes each.', fixed: [
        { q: 'One training example is logged per item shown. Data logged a day, in TB?', a: 2, unit: 'TB', tol: 0.1, how: '10M × 10 × 20 = 2 billion impressions × 1 KB = 2 TB a day.' },
        { q: 'Purchases can come 3 days after an impression, so served features wait that long for their labels. Storage for 3 days of waiting features, in TB?', a: 6, unit: 'TB', tol: 0.1, how: '2 TB × 3 = 6 TB: far too much for memory, which is why Monolith keeps waiting features in an on-disk key-value store.' },
        { q: '100,000 embeddings change in a minute and are pushed to serving. Megabytes a minute?', a: 102.4, unit: 'MB', tol: 0.1, how: '100,000 × 256 × 4 bytes ≈ 102 MB a minute. Monolith works the same sum for 1,024 dimensions: about 400 MB a minute, small enough to ship continuously.' },
        { q: 'Online store for the last 100 actions of every daily user, in GB?', a: 64, unit: 'GB', tol: 0.1, how: '10M × 100 × 64 bytes = 64 GB before replicas: one memory-heavy node, or a few shards.' }
      ] },
      { type: 'sort', brief: 'Where does each piece of work run?', buckets: ['Request path (milliseconds)', 'Feedback stream (seconds to minutes)', 'Offline batch (hours to days)'], items: [
        ['Nearest-neighbour lookup from the user embedding', 0], ['Read the user\'s last 100 actions from the online store', 0], ['GPU heavy ranker scores the 500 retrieved candidates', 0], ['No two items from the same creator in a row', 0],
        ['Validate and dedupe action events read from Kafka', 1], ['Join served features to clicks by request ID', 1], ['Push the embeddings touched in the last minute to serving', 1],
        ['Daily snapshot of the training parameter servers', 2], ['Re-embed the catalogue and rebuild the ANN index', 2], ['Precompute a fallback list for each user off-peak', 2], ['Replay two weeks of logs to compare two models', 2]
      ] }
    ] }
  });

  T({
    id: '7.2', mod: '7', title: 'ML inference platform', tag: 'Many teams\' models on shared GPUs',
    analogy: 'A library reading room with a few desks. Books live in the stacks and a desk holds only the books being read. The librarian sends you to the desk that already has your book, and when a desk is full, the book nobody has opened for longest goes back to the shelves.',
    points: [
      'Requirements first: how many models, how skewed their traffic is, and which callers are interactive and which are batch. The usual shape is a few very hot models and a long tail: Uber reported (2017) its busiest models at over 250,000 predictions a second, while multi-model hosting exists for fleets of rarely called ones.',
      'API and data model: predict(model ID or alias, tenant, payload) on the data plane; register, deploy, canary and set quotas on the control plane. Michelangelo (2017) addressed a model by its UUID or by a tag set at deployment, so callers can follow a tag instead of a version.',
      'Model packing: GPU memory is the scarce resource, so treat it as a cache. In Clockwork, copying ResNet-50 into GPU memory took about 8.3 ms and running it about 2.9 ms, so commonly or recently used models stay resident. Size the pool for the hot set, not for the whole catalogue.',
      'Routing: send each request to a replica that already holds its model, and spill to another replica only when those are busy; that replica then loads it (SageMaker multi-model endpoints, Ray Serve multiplexing). Models with far more traffic or tighter latency than the rest get dedicated replicas.',
      'Tenancy needs limits at both layers. A Kubernetes ResourceQuota caps the GPUs a team\'s namespace can request (requests.nvidia.com/gpu); per-tenant request limits at the gateway stop one tenant\'s burst from reaching a shared pool, and interactive traffic is served ahead of batch.',
      'Failure modes and trade-offs: the data plane keeps serving the last known placement when the control plane is down. Scale-to-zero (KServe minReplicas: 0, default 1) suits batch and rarely used models, at the price of a cold start; interactive models keep a warm minimum (topic 5.1).'
    ],
    pitfall: 'Sizing a shared pool for the number of models instead of the working set, then routing at random. Every replica ends up needing every model, LRU evicts what the next request wants, and requests pay a full model load instead of a few milliseconds of inference.',
    say: 'The control plane registers models, places them and enforces per-team GPU quotas; the data plane routes each request to a replica that already holds its model. Hot models get dedicated replicas with a warm minimum, the long tail shares an LRU-cached multi-model pool, and batch tenants are rate-limited behind interactive traffic.',
    refs: [
      ['uber-michelangelo', 'Scale at Uber, 2017 — “The highest traffic models right now are serving more than 250,000 predictions per second.”'],
      ['uber-michelangelo', 'Addressing a model — “At serving time, a model is identified by its UUID and an optional tag (or alias) that is specified during deployment.”'],
      ['sagemaker-mme', 'The long tail shares a fleet — “If you have a mix of frequently and infrequently accessed models, a multi-model endpoint can efficiently serve this traffic with fewer resources and higher cost savings.”'],
      ['sagemaker-mme', 'Hot models get their own — “If you have models that have significantly higher transactions per second (TPS) or latency requirements, we recommend hosting them on dedicated endpoints.”'],
      ['clockwork', 'GPU memory as a cache — “host-to-GPU memory transfers (≈8.3ms for ResNet50) typically take longer than running the DNN inference on the GPU (≈2.9 ms). Consequently, Clockwork treats GPU memory as a cache, letting commonly or recently used models avoid expensive loads.”'],
      ['ray-serve-multiplexing', 'Route to a warm replica — “If any replica for the deployment has the model loaded, incoming traffic for that model (based on request header) will automatically be routed to that replica avoiding unnecessary load time.”'],
      ['k8s-resource-quotas', 'Quota per team namespace — “A resource quota, defined by a ResourceQuota object, provides constraints that limit aggregate resource consumption per namespace.”'],
      ['stripe-rate-limiters', 'Noisy neighbours — “A user is sending you a lot of lower-priority requests, and you want to make sure that it doesn’t affect your high-priority traffic.”'],
      ['aws-bl-static-stability', 'Control plane vs data plane — “However, to achieve a higher availability target, the data plane maintains its existing state and continues working even in the face of a control plane impairment.”'],
      ['kserve-autoscaling', 'Scale-to-zero is opt-in — “KServe by default sets minReplicas to 1. If you want to enable scaling down to zero, especially for use cases like serving on GPUs, you can set minReplicas to 0 so that the pods automatically scale down to zero when no traffic is received.”']
    ],
    cards: [
      ['Why treat GPU memory as a cache on a multi-model platform?', 'GPU memory is small next to host memory, and loading a model can take longer than running it (Clockwork: about 8.3 ms to copy ResNet-50 in, 2.9 ms to run it). Keeping commonly and recently used models resident avoids most loads.'],
      ['What does model-affinity routing do, and what happens without it?', 'It sends each request to a replica that already holds the model and spills to another only when those are busy. With random routing every replica needs every model, and LRU evicts the model the next request wants.'],
      ['Which models belong on dedicated replicas rather than a shared pool?', 'Those with much higher traffic or tighter latency targets than the rest. A shared multi-model pool suits many rarely called models that can tolerate an occasional cold load.']
    ],
    quiz: [
      ['A shared pool must keep 120 hot models resident, each on 2 replicas for redundancy. Each replica has a 24 GB GPU with 4 GB kept for workspace, and each model takes 2.5 GB. How many replicas does the hot set need?', ['30 replicas', '15 replicas', '27 replicas', '14 replicas'], '(24 − 4) ÷ 2.5 = 8 models per replica; 120 × 2 = 240 placements ÷ 8 = 30. Fifteen forgets the second copy; 27 forgets the workspace (9 per replica); 14 forgets both.', 'calc'],
      ['A pool of 20 replicas serves 50 equally busy models. Each GPU holds 10 models with LRU eviction, a load takes about 2 s, and the router sends each request to a random replica. What do users see?', ['Most requests miss, evict another model, and wait about 2 s for a load', 'A small rise in latency, since LRU keeps the busiest models resident on each GPU', 'Out-of-memory errors, as loaded models keep piling up on each replica\'s GPU', 'Higher throughput, since one batch can now mix requests for different models'], 'Every replica sees all 50 models but holds 10, so only about one request in five finds its model, and each load evicts a model another request needs. With equal traffic there is no "busiest" set for LRU to keep. Routing by model fixes it: 20 × 10 = 200 slots hold each model four times over.', ['clockwork', 'ray-serve-multiplexing', 'sagemaker-mme']],
      ['One fraud model takes 4,000 req/s with a 30 ms p99 target. 900 other models each get under one request a minute. How should the platform host them?', ['The hot model on dedicated replicas; the tail in a multi-model pool', 'The whole fleet in one multi-model pool, as LRU keeps the hot model resident', 'Each model on its own replica, so no tenant can affect another', 'The hot model in the shared pool, with replicas capped to protect the tail'], 'Multi-model hosting suits many rarely used models that tolerate an occasional cold load; a model with far higher traffic or a tight latency target goes on dedicated capacity. In a shared pool it competes for memory and its spikes reach everyone else; a replica per model leaves 900 GPUs almost idle.', ['sagemaker-mme']],
      ['Tenant A starts a backfill that sends 20× its usual traffic to a shared pool, and tenant B\'s interactive p99 triples. A already has a ResourceQuota of 4 GPUs on its own namespace. What fixes it?', ['Per-tenant request limits at the gateway, with interactive traffic first', 'Lower the ResourceQuota on tenant A\'s namespace from 4 GPUs down to 2 GPUs', 'Let the shared pool autoscale until its new replicas absorb A\'s extra load', 'Raise the batch delay so that A\'s requests are grouped into larger batches'], 'A ResourceQuota limits what a namespace can create, not the requests it sends to replicas that live elsewhere, so lowering it changes nothing here. Autoscaling hands A more of the pool and reacts only after new replicas have loaded their models. A larger batch delay slows B as well. Limit each tenant\'s rate and keep capacity for high-priority traffic.', ['stripe-rate-limiters', 'k8s-resource-quotas']],
      ['The platform\'s control plane (model registry, placement service and autoscaler) is down for 30 minutes. What should happen to prediction traffic?', ['It keeps flowing on the last known placement; deploys and rescaling wait', 'It stops, since routers look up each request in the registry before routing it', 'It fails over to CPU replicas, which do not depend on placement', 'It keeps flowing, but replicas unload their models so they stay consistent'], 'The control plane makes changes; the data plane does the daily work. A statically stable data plane keeps its existing state and continues working during a control-plane impairment; it just gets no updates. A router that consults the registry per request turns every control-plane blip into an outage.', ['aws-bl-static-stability']]
    ],
    explain: ['Design an inference platform that serves many teams\' models on shared GPUs.', ['Requirements: number of models, traffic skew, interactive vs batch callers, latency targets', 'A control plane (registry, placement, quotas, rollout) separate from a data plane that keeps serving if the control plane fails', 'GPU memory as a cache: multi-model replicas sized for the hot set, recently used models kept resident', 'Routing by model affinity, and dedicated replicas for the hottest or strictest models', 'Tenant fairness: quotas, per-tenant rate limits, interactive ahead of batch; scale-to-zero only where a cold start is acceptable']],
    duck: ['Why not give every team its own GPUs and be done with it?', 'If the model file is already on the machine, why is loading it slow?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['How many models, and what share of traffic goes to the top ten?', true, 'Skew decides between dedicated replicas and shared multi-model pools.'],
        ['Which callers are interactive, and which can wait minutes?', true, 'Sets the SLO classes, warm minimums and where scale-to-zero is allowed.'],
        ['How much GPU memory does a typical model need?', true, 'Memory per model sets how many fit per replica, which sizes the pool.'],
        ['Must one tenant\'s crash or burst be kept from the others?', true, 'Decides process isolation, per-tenant limits and quotas.'],
        ['Should the platform be written in Go or in Python?', false, 'An implementation choice that does not change the design.'],
        ['Do we run Kubernetes, or do we run Nomad?', false, 'Tooling; the packing and routing problems are the same on either.'],
        ['What colour scheme should the model dashboard use?', false, 'Has no effect on capacity, latency or isolation.'],
        ['Can each team pick its own name for its models?', false, 'A naming detail, settled in the registry later.']
      ] },
      { type: 'estimate', brief: 'Given: 2,000 models, 400 of them hot · each needs 3 GB of GPU memory · each GPU has 80 GB, 8 GB of it kept for workspace · a cold model loads from object storage at 1 GB/s, plus 0.5 s to initialise.', fixed: [
        { q: 'How many models fit on one GPU?', a: 24, unit: 'models', tol: 0, how: '(80 − 8) ÷ 3 = 24.' },
        { q: 'How many GPUs keep every hot model resident on 2 replicas?', a: 34, unit: 'GPUs', tol: 0.05, how: '400 × 2 = 800 placements ÷ 24 ≈ 33.3, so 34.' },
        { q: 'One replica per model (minReplicas 1) needs 2,000 GPUs. How many times more is that than one pooled copy of all 2,000 models?', a: 24, unit: '×', tol: 0.1, how: 'Pooled: 2,000 ÷ 24 ≈ 83.3, so 84 GPUs. 2,000 ÷ 84 ≈ 24×.' },
        { q: 'Seconds before the first request to a cold model is answered?', a: 3.5, unit: 'seconds', tol: 0.1, how: '3 GB ÷ 1 GB/s = 3 s, plus 0.5 s = 3.5 s, against an inference that takes milliseconds.' }
      ] },
      { type: 'sort', brief: 'Control plane or data plane?', buckets: ['Control plane', 'Data plane'], items: [
        ['Register a new model version and record its owner', 0], ['Route a request to a replica that holds its model', 1],
        ['Decide which replicas should hold which models', 0], ['Run the forward pass and return the prediction', 1],
        ['Reject a pod that would exceed a team\'s GPU quota', 0], ['Reject a request when its tenant is over its rate limit', 1],
        ['Set the canary share for a new version to 10%', 0], ['Send each request to v1 or v2 according to the split', 1],
        ['Change a model\'s replica count from its traffic metrics', 0], ['Group requests for the same model into one batch', 1]
      ] },
      { type: 'diagram', brief: 'Draw the data plane of a shared inference platform: 4,000 interactive predictions a second, plus one tenant\'s backfill of 6,000 batch rows a second that must not slow them down.',
        labels: { gateway: 'API gateway', app: 'Model router', ranker: 'GPU model servers', queue: 'Batch job queue', worker: 'Batch workers (own GPUs)', blob: 'Model artefact store', db: 'Model registry' },
        required: ['client', 'gateway', 'app', 'ranker', 'queue', 'worker', 'blob'],
        edges: [['client', 'gateway'], ['gateway', 'app'], ['app', 'ranker'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'blob']],
        layout: { client: [0, 150], gateway: [150, 150], app: [300, 150], ranker: [470, 40], queue: [470, 240], worker: [620, 240], blob: [620, 360] },
        why: {
          gateway: 'Checks each tenant\'s key and enforces its request limit, so one team\'s burst is turned away before it reaches the shared GPUs.',
          app: 'Keeps the last known placement in memory and sends each request to a replica that already holds its model. Bulk jobs go to the queue instead.',
          ranker: 'The interactive fleet: slow servers with a few slots each, keeping the hot models resident in GPU memory.',
          queue: 'Accepts a tenant\'s bulk scoring jobs at once and lets them wait, so a backfill never competes with interactive requests for GPU slots.',
          worker: 'Batch workers on their own GPUs work through the queue at their own pace and write the results back to object storage.',
          blob: 'Holds every model version\'s weights, and the batch inputs and outputs. A replica pulls a model once, when it is placed there, never per request.'
        },
        decoys: {
          db: 'The registry belongs to the control plane. The router keeps the last known placement in memory, so predictions keep flowing when the registry is slow or down.',
          cdn: 'Each prediction is computed from the caller\'s own inputs, so there is nothing shared to serve from the edge.',
          features: 'Callers send their features with each request. The platform hosts models; it does not own anyone\'s feature data.'
        },
        sim: {
          load: '4,000 interactive predictions a second spread over many tenants\' models, and one tenant\'s backfill of 6,000 batch rows a second.',
          scale: 10,
          goals: { errors: 1, p99: 100 },
          flows: [
            { label: 'Interactive predictions', rps: 4000, needs: ['app', 'ranker'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['gateway', 'ranker', { instead: 'app' }], ['app', 'ranker'], ['app', 'db'], ['ranker', 'blob']] },
            { label: 'Batch rows', rps: 6000, needs: ['worker', 'blob'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app', { instead: 'queue' }], ['gateway', 'queue'], ['app', 'queue'], ['app', 'ranker', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'blob'], ['worker', 'ranker']] }
          ],
          parts: {
            gateway: { cfg: { capacity: 512, serviceMs: 1, queueLimit: 1024, rateLimitRps: 3000, burst: 3000, authFailRate: 0 } },
            app: { cfg: { instances: 8, capacity: 8, serviceMs: 3, serviceCv: 0.5, queueLimit: 64 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of the router fleet spreads tenants over it or enforces their limits, so every caller lands on one server.', fullWhy: 'A prediction holds a router slot until the GPU server answers.' },
            ranker: { cfg: { instances: 4, capacity: 4, serviceMs: 20, serviceCv: 0.3, queueLimit: 32 }, fullWhy: 'Each request holds one of a few GPU slots for about 20 ms. Anything else sent here, bulk rows or a model download, takes slots that interactive requests need.' },
            worker: { cfg: { instances: 20, capacity: 12, serviceMs: 20, serviceCv: 0.5 } },
            blob: { cfg: { capacity: 256, serviceMs: 200, serviceCv: 0.4, queueLimit: 1024, prefixRps: 100000 }, fullWhy: 'Fetching a model file takes far longer than running the model. Replicas pull weights once, when a model is placed on them, and keep it in GPU memory.' },
            db: { cfg: { capacity: 6, serviceMs: 25, serviceCv: 0.6, queueLimit: 64, lockMs: 0 }, fullWhy: 'The registry is built for deploys and placement changes, a few a minute. Asked on every prediction, it becomes the bottleneck, and its outages become prediction outages.' }
          },
          needWhy: {
            app: 'Something has to know which replicas hold which model. A request that lands on a replica without its model waits seconds for a load instead of milliseconds for inference.',
            ranker: 'Nothing runs the models.',
            worker: 'Bulk rows need workers of their own that read the queue at their own pace. Sent to the interactive GPU servers, they take the slots interactive requests need.',
            blob: 'Batch results have to land where the tenant can collect them, and batch workers load their model\'s weights from here.'
          },
          bad: {
            'client>ranker': 'Callers go through the gateway and the router: something has to check the tenant\'s limit and pick a replica that holds the model.',
            'client>blob': 'Tenants ask for predictions. They never read model files directly.',
            'gateway>blob': 'The gateway checks keys and limits. It does not fetch model files.',
            'app>blob': 'The router only forwards requests. A replica pulls weights when a model is placed on it, not per request.',
            'queue>ranker': 'A queue holds jobs. Something has to read them at a controlled pace: draw the batch workers after it.',
            'queue>blob': 'A queue holds jobs. Something has to read them and do the work: draw the batch workers between the two.'
          },
          traps: [
            { name: 'no batch tier: bulk rows go straight to the interactive GPU servers', drop: ['queue', 'worker'] },
            { name: 'batch workers send their rows to the interactive GPU servers', wire: [['worker', 'ranker']] },
            { name: 'model weights fetched from the artefact store on every request', wire: [['ranker', 'blob']] },
            { name: 'the router asks the registry on every request', add: ['db'], wire: [['app', 'db']] },
            { name: 'no router: the gateway sends each request to any replica', drop: ['app'], wire: [['gateway', 'ranker'], ['gateway', 'queue']] },
            { name: 'batch queue drawn but nothing reads it', drop: ['worker'] },
            { name: 'no gateway in front of the router fleet', drop: ['gateway'], wire: [['client', 'app']] }
          ]
        } }
    ] }
  });

  T({
    id: '7.3', mod: '7', title: 'Search ranking system', tag: 'Retrieve thousands, rank hundreds, rerank tens',
    analogy: 'Hiring for one job from 10,000 applicants. A keyword screen cuts the pile to a few hundred CVs, a recruiter call cuts those to ten, and only those ten get a day of interviews. Nobody the keyword screen dropped can be hired, however good.',
    points: [
      'Requirements: queries a second, corpus size, latency budget, index freshness, and how relevance is judged. Quality is usually NDCG at the first page: graded labels from 0 to 4, a gain that grows with the label, a discount that grows with rank, and T = 10 for one page of results.',
      'Index: the corpus is split by document into shards, each with its own inverted index (topic 2.7). A root fans every query out to a leaf server per shard and merges the replies, so each query touches every shard and waits for the slowest.',
      'Retrieval: each shard pulls a few thousand candidates cheaply, by term matching (BM25) and by embedding nearest-neighbour search (topic 5.6), and merges them. Facebook reported (2020) that a search engine usually needs both kinds of retrieval in its retrieval layer.',
      'Ranking is a cascade: each stage affords a costlier model because the last one cut the list. A learned ranker, such as gradient-boosted trees, rescores the top 100–500; a transformer reranks the last few dozen. Bing reported (2019) running a distilled BERT at a batch of 64 in 6 ms on one GPU.',
      'Tail latency: hedge a slow leaf request after the p95 latency (about 5% extra load), return good-enough results once most of the corpus has answered, and send a new query to one or two leaves first (canary requests) so a query that crashes leaves cannot take down thousands at once.',
      'Learning and evaluation: position changes how many clicks a result gets, so clicks are biased labels. Weight each click by the inverse of the probability that its position is seen (inverse propensity scoring, Joachims et al. 2017), or, as Airbnb reported (2020), train with position as a feature and set it to 0 when scoring. Confirm offline NDCG gains online (topic 5.10).'
    ],
    pitfall: 'Training the ranker on raw clicks as if they were relevance labels. Results at the top are clicked because they are at the top, so the model learns to reproduce the current order, and offline metrics computed on the same clicks reward it for doing so.',
    say: 'Each index shard retrieves a few thousand candidates by BM25 and embeddings and rescores its top few hundred with a boosted-tree ranker; the root merges, and a distilled transformer reranks the top 50. Leaf calls are hedged after the p95, and when a leaf still misses the deadline I occasionally return good-enough results, keeping that rare.',
    refs: [
      ['burges-lambdamart', 'NDCG at one page — “where T is the truncation level (for example, if we only care about the first page of returned results, we might take T = 10), and li is the label of the ith listed URL. We typically use five levels of relevance: li ∈ {0, 1, 2, 3, 4}.”'],
      ['tail-at-scale', 'Fan-out to leaves — “parallelize sub-operations across many different machines, where each sub-operation is co-located with its portion of a large dataset.”'],
      ['fb-embedding-retrieval', 'Term and embedding retrieval together — “search engine usually needs to incorporate both embedding-based retrieval and term matching based retrieval together to score documents in the retrieval layer.”'],
      ['es-rescore', 'Costly models on the top only — “Rescoring can help improve precision by reordering just the top (e.g. 100 - 500) documents returned by the initial retrieval phase (query, knn search) by using a secondary (usually more costly) algorithm, instead of applying the costly algorithm to all documents in the index.”'],
      ['bing-bert-gpus', 'Transformer reranking on GPUs, 2019 — “We then leveraged Tensor Cores with mixed precision on a NC6s_v3 Virtual Machine to even further optimize the performance, benchmarking a batch size of 64 inferences at 6ms (~800x throughput improvement compared to CPU).”'],
      ['tail-at-scale', 'Hedged requests — “This approach limits the additional load to approximately 5% while substantially shortening the latency tail.”'],
      ['tail-at-scale', 'Good-enough results — “Since waiting for exceedingly slow servers might stretch service latency to unacceptable levels, Google’s IR systems are tuned to occasionally respond with good-enough results when an acceptable fraction of the overall corpus has been searched, while being careful to ensure good-enough results remain rare.”'],
      ['tail-at-scale', 'Canary requests — “rather than initially send a request to thousands of leaf servers, a root server sends it first to one or two leaf servers.”'],
      ['joachims-unbiased-ltr', 'Position bias in clicks — “For example, position bias in search rankings strongly influences how many clicks a result receives, so that directly using click data as a training signal in Learning-to-Rank (LTR) methods yields sub-optimal results.”'],
      ['joachims-unbiased-ltr', 'The correction — “Our approach uses inverse propensity scoring (IPS), originally employed in causal inference from observational studies”'],
      ['airbnb-search-abc', 'Position as a feature at Airbnb — “Instead, we introduce position as a feature in the DNN, regularized by dropout. During scoring we set the position feature to 0.”']
    ],
    cards: [
      ['Why is search ranking a cascade of stages?', 'Each stage can afford a costlier model only because the previous one cut the list: retrieval scans the whole index cheaply, a learned ranker rescores the top few hundred, and a transformer reranks the last few dozen.'],
      ['What is a hedged request, and what does it cost?', 'A second copy of a slow leaf request sent to another replica; whichever answers first is used and the other is cancelled. Waiting until the p95 latency before hedging limits the extra load to about 5%.'],
      ['Why can\'t raw clicks be used as relevance labels?', 'Position changes how many clicks a result gets, so a model trained on raw clicks learns the old order. Correct for it by dividing each click by the probability that its position is seen (inverse propensity weighting), or train with position as a feature and set it to a constant when scoring.']
    ],
    quiz: [
      ['Labels run 0–4, gain is 2^label − 1 and the discount is log₂(1 + rank). Your top three results have labels 1, 3, 0; the ideal order is 3, 1, 0. What is NDCG@3?', ['About 0.71', 'About 0.80', 'About 0.60', 'About 5.4'], 'DCG = 1 ÷ log₂2 + 7 ÷ log₂3 = 1 + 4.42 = 5.42. Ideal = 7 + 1 ÷ 1.585 = 7.63. 5.42 ÷ 7.63 ≈ 0.71, whatever the log base. 0.80 uses the label itself as the gain; 0.60 divides by the rank instead of its log (4.5 ÷ 7.5); 5.4 is the DCG before normalising.', ['burges-lambdamart']],
      ['Retrieval fans out to 2,000 leaf servers. A single leaf\'s p99 is 10 ms, but for one query the fastest 95% of leaves take up to 70 ms and the last leaf up to 140 ms (both p99). Retrieval has a 100 ms budget, and the leaf servers already run at 80% utilisation. Which design meets the budget?', ['Answer once enough of the corpus has replied; replicate key documents', 'Send every leaf request to two replicas, let both run, and use the first reply', 'Use 100 leaves with shards 20× larger, so that far fewer replies are awaited', 'Wait for the slowest leaf, and cache results so that repeat queries are fast'], 'Waiting for the slowest 5% of leaves doubles the p99, from 70 to 140 ms. Google\'s search systems return good-enough results once an acceptable fraction of the corpus has been searched: any one leaf rarely holds the best result, and important documents are replicated; they keep such partial answers rare. Running two full copies of every request doubles leaf load, which servers already at 80% utilisation cannot take (the paper\'s own hedging cancels the duplicate so that it costs little); 20× larger shards make each leaf 20× slower; a cache misses on new queries.', ['tail-at-scale']],
      ['A malformed query hits a bug that crashes the leaf server process. The root sends every query to all 3,000 leaves at once. What protects the tier, as in Google\'s search systems?', ['Send each query to one or two leaves first, and fan out once they reply', 'Retry the query on other replicas until one of them succeeds', 'Hedge each leaf request so that a second replica can answer it', 'Restart crashed leaves automatically and serve partial results'], 'A canary request goes to one or two leaves; the rest are queried only if those reply in time, so a query of death crashes two servers instead of 3,000. Retries and hedging send the same poison to more replicas. Restarting is too late when every leaf crashed at the same moment.', ['tail-at-scale']],
      ['A search team adds "position shown" as a training feature to absorb position bias. At serving time a result has no position yet. What did Airbnb report doing (2020)?', ['Set position to 0 when scoring, with dropout on it in training', 'Use each listing\'s average past position as its value when scoring', 'Leave the feature out at serving time and rescale the other weights', 'Train with and without the feature, and average the two scores'], 'Airbnb set the position feature to 0 at scoring and used dropout so relevance would not lean on it; a plain position feature cost about 1.3% NDCG. Feeding in past positions brings back the old ranking the feature was meant to factor out, which is the click bias Joachims describes.', ['airbnb-search-abc', 'joachims-unbiased-ltr']],
      ['Bing reported (2019) running a distilled BERT ranker at a batch of 64 in 6 ms on one GPU. You rerank the top 50 results for 1,000 queries a second. Roughly how many fully busy GPUs is that?', ['About 5', 'About 300', 'About 0.1', 'About 4,700'], 'One GPU: 64 ÷ 0.006 s ≈ 10,700 inferences a second. Load: 50 × 1,000 = 50,000 a second, and 50,000 ÷ 10,700 ≈ 4.7. 300 treats 6 ms as the time for each document with no batching; 0.1 forgets that each query scores 50 documents (1,000 ÷ 10,700); 4,700 reads 6 ms as 6 s.', ['bing-bert-gpus']]
    ],
    explain: ['Design the ranking system behind a web search engine, from index to results page.', ['Requirements: query rate, corpus size, latency budget, freshness; NDCG at the first page as the quality metric', 'Index sharded by document; the root fans out to every shard and merges', 'Hybrid retrieval (BM25 and embeddings), then a cascade: boosted trees on hundreds, a transformer on tens', 'Tail control: hedged requests, good-enough partial results, canary requests', 'Learning from clicks with position-bias correction, and online confirmation by A/B test or interleaving']],
    duck: ['Why not run the best model on every document?', 'If people click the first result most, doesn\'t that make it the best one?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['How many queries a second, and how large is the corpus?', true, 'Sizes the shards, the fan-out and the serving fleet.'],
        ['What end-to-end latency must a results page meet?', true, 'Sets how many ranking stages fit and how hard to cut the tail.'],
        ['How soon must a changed page show up in results?', true, 'Freshness decides batch rebuilds versus incremental indexing.'],
        ['How is relevance judged: clicks, human grades, or both?', true, 'Decides the labels, the bias correction and the offline metric.'],
        ['Should the index live in Elasticsearch or in Solr?', false, 'A product choice, made after the requirements are known.'],
        ['Which language should the crawler be written in?', false, 'Does not change the ranking architecture.'],
        ['Should the results page use infinite scroll?', false, 'A front-end decision outside the ranking system.'],
        ['How many engineers will look after the crawler?', false, 'Staffing, not system design.']
      ] },
      { type: 'estimate', brief: 'Given: 8 billion documents · 10 million documents per shard · 20,000 queries/s at peak · each shard returns its top 20 · leaf requests are hedged after the p95 latency.', fixed: [
        { q: 'How many shards?', a: 800, unit: 'shards', tol: 0, how: '8,000,000,000 ÷ 10,000,000 = 800.' },
        { q: 'Leaf requests per second at peak, before hedging?', a: 16000000, unit: 'requests/s', tol: 0.05, how: 'Every query touches every shard: 20,000 × 800 = 16 million a second.' },
        { q: 'Roughly how many extra leaf requests per second does hedging after the p95 add?', a: 800000, unit: 'requests/s', tol: 0.15, how: 'Only the slowest 5% get a second copy: 0.05 × 16 million ≈ 800,000 a second.' },
        { q: 'How many candidates does the root merge per query?', a: 16000, unit: 'candidates', tol: 0, how: '800 shards × 20 = 16,000, which is why the expensive model runs only on the merged top few dozen.' }
      ] },
      { type: 'order', brief: 'Order the path of one query.', items: [
        'Parse and rewrite the query: spelling, synonyms, intent',
        'Root fans the query out to one replica of every shard',
        'Each shard retrieves candidates by BM25 and embedding search',
        'Each shard rescores its top few hundred with a boosted-tree ranker',
        'Root merges the shard results, waiting no longer than its deadline',
        'A transformer reranks the merged top 50',
        'Log the results shown, with positions, for click-model training'
      ] },
      { type: 'diagram', brief: 'Draw the query path and the click loop: 20,000 queries a second at peak, most of them repeats of a recent query, and the clicks that flow back for training.',
        labels: { app: 'Search service (root)', cache: 'Results cache', search: 'Index shards', features: 'First-pass ranker (CPU)', ranker: 'Reranker (GPU)', queue: 'Click stream', worker: 'Log pipeline', warehouse: 'Training logs (data lake)' },
        required: ['client', 'app', 'cache', 'search', 'features', 'ranker', 'queue', 'worker', 'warehouse'],
        edges: [['client', 'app'], ['app', 'cache'], ['app', 'search'], ['app', 'features'], ['features', 'ranker'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'warehouse']],
        layout: { client: [0, 160], app: [150, 160], cache: [310, 16], search: [310, 108], features: [310, 200], ranker: [470, 200], queue: [310, 320], worker: [470, 320], warehouse: [620, 320] },
        why: {
          app: 'The root: rewrites the query, checks the results cache, fans out to every shard, merges, and sends the survivors through the ranking stages.',
          cache: 'Repeats of a recent query are answered here without touching the shards or the GPUs, so the fleets behind it are sized for the misses.',
          search: 'Each shard holds a slice of the corpus and retrieves its candidates by BM25 and embeddings. Every new query goes to all of them.',
          features: 'Boosted trees on CPUs rescore the merged candidates cheaply and pass only the top 50 to the expensive model.',
          ranker: 'A distilled transformer on GPUs. It is costly per document, so it only ever sees the top few dozen candidates.',
          queue: 'The results shown, with their positions, and the clicks on them are accepted at once and processed later, so logging never slows a query.',
          worker: 'Joins clicks to the results that were shown and writes training rows, with positions, for the next ranker.',
          warehouse: 'The history the next ranker is trained on. It is built for large scans, not for writes inside a query.'
        },
        decoys: {
          cdn: 'Results are built per query from an index that keeps changing. Repeats are served from the results cache behind the search service.',
          db: 'Nothing here reads or writes rows in transactions. Queries are served from the index, and logs go to the data lake.'
        },
        sim: {
          load: '20,000 queries a second, the peak from the estimate. Taken here as 12,000 that repeat a query asked in the last few minutes and 8,000 new ones, plus 2,000 clicks a second flowing back.',
          scale: 20,
          goals: { errors: 1, p99: 200 },
          flows: [
            { label: 'Repeated queries', rps: 12000, needs: [],
              hops: [['client', 'app'], ['app', 'cache'], ['app', 'search', { instead: 'cache' }], ['app', 'features', { instead: 'cache' }], ['search', 'features'], ['app', 'ranker', { instead: 'cache' }], ['features', 'ranker'], ['app', 'queue'], ['app', 'warehouse', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'warehouse']] },
            { label: 'New queries', rps: 8000, needs: ['search', 'features', 'ranker', 'warehouse'],
              hops: [['client', 'app'], ['app', 'cache'], ['app', 'search'], ['app', 'features'], ['search', 'features'], ['features', 'ranker'], ['app', 'ranker'], ['app', 'queue'], ['app', 'warehouse', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'warehouse']] },
            { label: 'Clicks', rps: 2000, needs: ['warehouse'],
              hops: [['client', 'app'], ['app', 'queue'], ['app', 'warehouse', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'warehouse']] }
          ],
          parts: {
            app: { cfg: { instances: 5, capacity: 16, serviceMs: 3, serviceCv: 0.5, queueLimit: 128 }, fullWhy: 'A query holds a slot in the root until the slowest thing it calls has answered, so a slow write inside the query holds it too.' },
            cache: { cfg: { capacity: 128, serviceMs: 2, serviceCv: 0.4, queueLimit: 512 } },
            search: { cfg: { instances: 4, capacity: 16, serviceMs: 20, serviceCv: 0.5, queueLimit: 256 }, fullWhy: 'Every query that misses the cache goes to every shard, so the whole index tier works for each one.' },
            features: { cfg: { instances: 4, capacity: 16, serviceMs: 5, serviceCv: 0.4, queueLimit: 256 } },
            ranker: { cfg: { instances: 5, capacity: 4, serviceMs: 25, serviceCv: 0.3, queueLimit: 32 }, fullWhy: 'Each query holds a GPU slot for about 25 ms while the transformer scores its top 50. The fleet is sized for the queries the cache does not answer.' },
            worker: { cfg: { instances: 12, capacity: 16, serviceMs: 5, serviceCv: 0.5 } },
            warehouse: { cfg: { capacity: 192, serviceMs: 80, serviceCv: 0.7, queueLimit: 512, lockMs: 0 }, fullWhy: 'A data lake is built for bulk writes and large scans. A write inside every query adds its slowest moments to the results page.' }
          },
          needWhy: {
            search: 'Nothing retrieves candidates from the corpus.',
            features: 'Without a cheap first pass, all 16,000 merged candidates go to the GPU model: hundreds of times the work of reranking the top 50.',
            ranker: 'Nothing puts the top candidates in their final order.',
            warehouse: 'The next ranker is trained on logged results and clicks. If they never land, there is nothing to learn from.'
          },
          bad: {
            'client>search': 'Searchers ask the search service, which fans the query out to the shards and merges the replies.',
            'client>ranker': 'The reranker needs candidates from retrieval and the first pass before it has anything to score.',
            'client>warehouse': 'Clients send clicks to the service, which hands them to the stream.',
            'client>queue': 'Clicks come in through the service, which checks them before they reach the stream.',
            'search>ranker': 'Sending every shard\'s candidates to the GPU model skips the cheap pass that cuts them to the top 50.',
            'queue>warehouse': 'A stream holds events. Something has to read them and write the rows: draw the log pipeline between the two.'
          },
          traps: [
            { name: 'no results cache: repeated queries run the whole pipeline again', drop: ['cache'] },
            { name: 'no first-pass ranker: every candidate goes to the GPU reranker', drop: ['features'], wire: [['app', 'ranker']] },
            { name: 'results shown and clicks written to the data lake inside the query path', drop: ['queue', 'worker'], wire: [['app', 'warehouse']] },
            { name: 'click stream drawn but nothing reads it', drop: ['worker'] },
            { name: 'the log pipeline writes nothing to the data lake', cut: [['worker', 'warehouse']] }
          ]
        } }
    ] }
  });

  T({
    id: '7.4', mod: '7', title: 'Fraud detection pipeline', tag: 'Score in the payment path, learn later',
    analogy: 'A nightclub door. The bouncer has seconds per guest, a list of banned faces (rules) and a feel built from experience (the model); doubtful guests are asked for more ID. Whether a guest caused trouble is often learned weeks later, so what he learns from is always behind.',
    points: [
      'Requirements: a decision (allow, block, review or step-up authentication) inside the authorisation path, under a hard latency budget, on a rare positive class. Stripe reported (2023) Radar weighing more than 1,000 characteristics in under 100 ms, with fraud around 1 in 1,000 payments.',
      'API and data model: score(payment) returns a risk score and a decision. Radar\'s score runs 0–99, with 65 and above elevated and 75 and above high by default. Rules sit beside the model: allow rules run before block and review rules, and a matching allow, block or review rule ends evaluation, so an allow rule overrides everything after it.',
      'Features come from three paths. The request itself. Streaming velocity counts per card, email, IP and merchant: Stripe (2024) used Flink for p99 feature freshness of 150 ms and pre-aggregated tiles so a lookup reads tiles, not events. Batch entity and graph features: Uber (2021) saw 15% better precision from two graph-learned scores.',
      'Labels arrive late. Card networks typically allow disputes up to 120 days after payment, so recent payments look cleaner than they are. Train and evaluate on windows old enough for most disputes to have arrived; where to cut is a trade-off between fresher data and more complete labels.',
      'Thresholds are set in money. Break-even precision = 1 ÷ (1 + loss per fraud ÷ profit per good sale). In Stripe\'s example, a $26 sale at 8% margin with a $15 chargeback fee, it is 5.07%. Block where the blocked set\'s precision beats it.',
      'Failure modes: Google\'s security and reliability guidance says security-critical operations should not fail open, because then an attacker only has to overload them, and that a lower-cost alternative control can stand in. For a fraud check, failing closed would turn an outage into lost sales, so when the feature store or model is down, fall back to a cheaper control, such as rules on request fields with amount limits, and agree that choice with the business in advance.'
    ],
    pitfall: 'Labelling payments by whether a dispute exists yet and training on data up to yesterday. Fraud from the last few weeks has not been disputed, so it is taught as legitimate, and offline metrics on the same immature labels hide the damage.',
    say: 'Inside 100 ms I read about a thousand features from the online store, streaming velocity counters fresh to well under a second plus nightly graph scores, score with one model and apply allow, block and review rules. The block threshold comes from break-even precision, labels take about 120 days, sometimes longer, to mature, and if the store fails I fall back to rules, not to allow-all.',
    refs: [
      ['stripe-radar-built', 'Radar in the payment path, 2023 — “It assesses more than 1,000 characteristics of a potential transaction in order to determine the likelihood that it’s fraudulent, letting good transactions through and either blocking risky transactions or diverting them to additional security checks. It makes this decision, accurately, in less than 100 milliseconds.”'],
      ['stripe-radar-built', 'A rare class — “The challenge is compounded by the fact that fraud is rare—on the order of 1 out of every 1,000 payments.”'],
      ['stripe-radar-risk', 'Score and default thresholds — “By default, a score of 65 or above indicates elevated risk, while a score of 75 or above indicates high risk.”'],
      ['stripe-radar-rules-ref', 'Ordered by action type; first match wins — “Rules of the same action type aren’t ordered. If a payment matches the criteria for a rule, Radar takes the appropriate action and discontinues evaluation. For example, if a payment matches an allow rule, it’s processed normally, without evaluating any subsequent block or review rules, even if the payment would also meet their criteria.”'],
      ['stripe-shepherd', 'Streaming freshness, 2024 — “With Flink now powering our feature updates, we achieved p99 feature freshness of 150ms.”'],
      ['stripe-shepherd', 'Tiles — “With tiling, computing a feature only requires retrieving and aggregating the tiles for the feature rather than all the individual events.”'],
      ['uber-graph-fraud', 'Graph features, 2021 — “During the experiment we observed 15% better precision with minimal increase in false positives by adding two fraud score features to the existing production model.”'],
      ['stripe-disputes', 'Late labels — “Card networks typically allow cardholders to initiate disputes within 120 days of the original payment, but their rules allow more time in some situations. Certain industries, such as travel or event ticketing, are prone to longer intervals between the original purchase and a dispute. Generally, when a customer pays for a future event or service (like a vacation reservation, professional services appointment, or event ticket), the dispute window starts on the event date, not the payment date.”'],
      ['stripe-radar-rules-ref', 'Radar velocity attributes use buckets — “This means the velocity for any attribute might include data that occurred within the interval plus one bucket. For example, an hourly attribute interval might be 3900 seconds (one hour and five minutes) of the current transaction because the interval uses five minute buckets.”'],
      ['stripe-radar-guide', 'Break-even precision — “Therefore, one fraudulent sale costs you the profit of $38.92 / $2.08 = 18.71 legitimate sales, and your break-even precision is 1 / (1 + 18.71) = 5.07%.”'],
      ['bsrs-resilience', 'Do not fail open — “Security-critical operations should not fail open. Failing open could permit an attacker to degrade the security of a system by using DoS attacks alone, for example. However, this doesn’t mean that security-critical operations don’t qualify for controlled degradation at all. A lower-cost alternative component (see Component Types) could replace failing regular security controls.”']
    ],
    cards: [
      ['What happens inside the authorisation budget?', 'Look up the payment\'s features in the online store, score it with the model, then apply rules (allow, block, review) to reach a decision. Stripe reports doing this in under 100 ms using more than 1,000 characteristics.'],
      ['Why are fraud labels late, and what do you do about it?', 'A chargeback typically can arrive up to 120 days after the payment, and later in some cases (for a payment made ahead of an event, the window starts on the event date), so recent payments look legitimate. Train only on payments old enough for most disputes to have arrived, and evaluate on matured windows too.'],
      ['How do you set the block threshold?', 'From money: break-even precision = 1 ÷ (1 + loss per fraud ÷ profit per good sale). Block where the precision of the blocked payments beats it; borderline scores can go to review or step-up authentication instead.']
    ],
    quiz: [
      ['The average sale is $50 at a 10% margin, so the goods cost you $45. A fraudulent sale loses those goods plus a $15 chargeback fee, and blocking a good sale loses its $5 profit. Above what precision does blocking a group of payments start to make money?', ['About 7.7%', 'About 8.3%', 'About 10%', 'About 92%'], 'Profit per good sale is $5. A fraud loses $45 of goods plus $15 = $60, the profit of 12 good sales. Break-even precision = 1 ÷ (1 + 12) ≈ 7.7%. 8.3% is 1 ÷ 12, odds read as a probability; 10% is the margin; 92% inverts the answer.', ['stripe-radar-guide']],
      ['A fraud model is retrained weekly on all payments up to yesterday, each labelled fraud if a dispute has been filed so far. Card networks typically let cardholders dispute up to 120 days after paying. What is wrong with this training set?', ['Recent fraud has no dispute yet, so it trains as legitimate', 'Fraud is so rare that the classes need rebalancing first', 'Old payments dominate it, so the model learns stale patterns', 'Disputed payments were refunded, so they should be dropped'], 'Payments from the last few weeks have not had time to be disputed, so fraud among them is labelled legitimate and the model learns to let it through. Rarity is a modelling concern but does not mislabel anything. Train on windows old enough for most disputes to have arrived.', ['stripe-disputes']],
      ['Radar rules on an account: block if the risk level is highest; review if the card was issued outside the US; allow if the amount is under $10. A $6 payment scores highest risk on a non-US card. What happens?', ['It is processed, because the allow rule ends evaluation', 'It is blocked, because block rules outrank allow rules', 'It goes to review, as the most specific rule that matches', 'It is blocked, and it is also queued for manual review'], 'Radar orders rules by action type, not by the order they are listed: allow, then block, then review, and the first match ends evaluation, so the allow rule wins over Stripe\'s own risk assessment. That is why allow rules need care: one broad allow rule bypasses every block and review rule after it.', ['stripe-radar-rules-ref']],
      ['During a card-testing attack the online feature store times out, and 3% of authorisations cannot be scored inside the 100 ms budget. Someone proposes letting unscored payments through so that no sale is lost. Google\'s Building Secure and Reliable Systems argues against failing open for a security check. Why, and what does it allow instead?', ['An attacker can turn the check off by overloading it; degrade to a cheaper control', 'Failing open hides the outage from monitoring; retry the check until it answers', 'A failed check proves the request is hostile; block the caller for a fixed period', 'Failing open breaks audit requirements; queue each request for manual approval'], 'The book says security-critical operations should not fail open, because an attacker could then degrade security with a denial-of-service attack alone, and here attackers are already sending the traffic. It allows controlled degradation instead: a lower-cost alternative component can replace the failing control, here rules on fields in the request. Blocking every unscored payment would turn a store outage into 3% of sales lost, retrying adds load to a store that is already timing out, and a manual approval cannot happen inside a 100 ms authorisation. The exact fallback rules and amount limits are a business decision made in advance.', ['bsrs-resilience']],
      ['A feature counts a merchant\'s charges over the last 7 days, about 2 million events. The streaming job keeps pre-aggregated tiles, one per hour (Stripe\'s Shepherd stores tiles rather than raw events). Roughly how much does the scorer read for one lookup?', ['About 168 tiles, instead of up to 2 million events', 'Seven tiles, one for each day the window covers', 'The 2 million events; tiles just save storage', 'One tile, which holds the running 7-day total'], '7 days × 24 hours = 168 hourly tiles, read and summed at request time. Reading raw events would mean up to 2 million rows inside the payment path. Daily tiles would be 7, but the job keeps hourly ones, and a single running total cannot drop events as they age out of the window.', ['stripe-shepherd']]
    ],
    explain: ['Design a fraud detection pipeline for card payments, with a real-time decision and batch learning.', ['Requirements: decision types, latency budget inside authorisation, rarity of fraud, cost of each error', 'Synchronous path: online features, one model, then allow, block and review rules', 'Feature paths: streaming velocity counters (tiles), batch entity and graph features', 'Delayed labels from disputes (typically up to 120 days), matured training windows, regular retraining', 'Threshold from break-even precision, and a cheaper fallback rather than fail-open when the store or model is down']],
    duck: ['Why not block anything that looks even slightly risky?', 'If the model is down, why not just let the payments through?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['How much of the authorisation latency can scoring use?', true, 'Sets the feature lookups and model size that fit in the path.'],
        ['What does a missed fraud cost versus a blocked good sale?', true, 'Gives the break-even precision, and so the block threshold.'],
        ['Is there a review team, and how many cases a day can it take?', true, 'Decides how large the review band between allow and block can be.'],
        ['How long after a payment do chargebacks usually arrive?', true, 'Sets the label delay, the training windows and evaluation.'],
        ['Should the model be a neural network or boosted trees?', false, 'A modelling choice made later, from data and constraints.'],
        ['Which cloud provider hosts the payment service today?', false, 'Does not change the shape of the design.'],
        ['Should risk scores run from 0 to 1 or from 0 to 100?', false, 'A presentation detail with no effect on the system.'],
        ['Can the fraud team work in Python notebooks?', false, 'A tooling preference, not a requirement.']
      ] },
      { type: 'estimate', brief: 'Given: 500 payments/s on average · fraud is 1 in 1,000 payments · 0.2% of payments go to manual review · an analyst clears 15 reviews an hour for 8 hours a day · Stripe Radar\'s hourly velocity attributes span up to 3,900 s in 5-minute buckets.', fixed: [
        { q: 'Fraudulent payments attempted per day?', a: 43200, unit: 'payments/day', tol: 0.05, how: '500 × 86,400 s = 43.2 million payments a day × 0.001 = 43,200.' },
        { q: 'Payments sent to review per day?', a: 86400, unit: 'reviews/day', tol: 0.05, how: '43.2 million × 0.002 = 86,400.' },
        { q: 'Analysts needed to clear the review queue each day?', a: 720, unit: 'analysts', tol: 0.05, how: 'One analyst clears 15 × 8 = 120 a day. 86,400 ÷ 120 = 720, which is why the review band must stay thin.' },
        { q: 'At most, how many 5-minute buckets does one hourly velocity attribute cover?', a: 13, unit: 'buckets', tol: 0, how: '3,900 s ÷ 300 s = 13: the hour\'s twelve buckets plus one more, which is why Stripe says a velocity can include data from the interval plus one bucket.' }
      ] },
      { type: 'sort', brief: 'Where does this work run?', buckets: ['In the payment path', 'Streaming (seconds)', 'Batch (hours to days)'], items: [
        ['Read the card\'s features from the online store', 0], ['Score the payment with the fraud model', 0], ['Evaluate the allow, block and review rules', 0],
        ['Add each new charge to the card\'s hourly counter', 1], ['Count distinct cards per IP address over the last hour', 1], ['Update a merchant\'s 10-minute decline rate as declines arrive', 1],
        ['Join chargebacks to past payments to build labels', 2], ['Retrain the model on labels that have matured', 2], ['Recompute graph scores for linked accounts', 2], ['Backfill a new feature over a year of history', 2]
      ] },
      { type: 'diagram', brief: 'Draw the fraud check inside card authorisation: 500 payments a second, each decided within 100 ms, with velocity features kept fresh and 0.2% of payments sent to manual review.',
        labels: { client: 'Payment service', lb: 'Load balancer', app: 'Fraud scoring service', features: 'Online feature store', ranker: 'Fraud model servers', queue: 'Payment event stream', worker: 'Streaming feature jobs', warehouse: 'Data warehouse', db: 'Review queue' },
        required: ['client', 'lb', 'app', 'features', 'ranker', 'db', 'queue', 'worker', 'warehouse'],
        edges: [['client', 'lb'], ['lb', 'app'], ['app', 'features'], ['app', 'ranker'], ['app', 'db'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'features'], ['worker', 'warehouse']],
        layout: { client: [0, 150], lb: [150, 150], app: [300, 150], ranker: [470, 16], db: [470, 108], features: [470, 200], queue: [300, 320], worker: [470, 320], warehouse: [620, 320] },
        why: {
          lb: 'Spreads authorisations over the scoring fleet, so one slow instance does not hold up payments.',
          app: 'Reads the payment\'s features, gets a score from the model, applies the allow, block and review rules, and answers inside the budget.',
          features: 'Serves about a thousand features per payment in a few milliseconds, with velocity counters only seconds old.',
          ranker: 'A fast model, such as boosted trees, that scores one payment in a few milliseconds.',
          db: 'Holds the payments in the review band until an analyst clears them. Keeping that band at 0.2% keeps the team\'s queue manageable.',
          queue: 'Each payment is published once it is decided, so updating counters and history never adds to the authorisation time.',
          worker: 'Keeps the velocity counters per card, email, IP and merchant fresh in the online store, and appends each payment to the warehouse.',
          warehouse: 'The payment history. Chargebacks are joined to it to build labels, and the model is retrained from it, all off the payment path.'
        },
        decoys: {
          cache: 'Velocity counters change with every payment, and a stale count is exactly what a card-testing attack exploits. The feature store already answers in milliseconds.',
          psp: 'The payment service calls the card processor once the fraud check has answered. The fraud check itself never charges a card.'
        },
        sim: {
          load: '500 payments a second, the average from the estimate, of which 0.2% (1 a second) are sent to manual review. Every payment has to be decided inside the 100 ms authorisation budget.',
          scale: 1,
          goals: { errors: 1, p99: 100 },
          flows: [
            { label: 'Authorisations', rps: 499, needs: ['features', 'ranker', 'worker', 'warehouse'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'features'], ['app', 'warehouse', { instead: 'features' }], ['app', 'ranker'], ['ranker', 'features'], ['app', 'queue'], ['app', 'warehouse', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'features'], ['worker', 'warehouse']] },
            { label: 'Payments sent to review', rps: 1, needs: ['features', 'ranker', 'db'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'features'], ['app', 'warehouse', { instead: 'features' }], ['app', 'ranker'], ['ranker', 'features'], ['app', 'db'], ['app', 'queue'], ['app', 'warehouse', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'features'], ['worker', 'warehouse']] }
          ],
          parts: {
            app: { cfg: { instances: 8, capacity: 8, serviceMs: 12, serviceCv: 0.5, queueLimit: 64 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of the scoring fleet spreads payments over it, so they can only reach one server.', fullWhy: 'A payment holds a slot until its features, its score and its rules are all done, so anything slow it waits on fills the fleet.' },
            features: { cfg: { capacity: 64, serviceMs: 3, serviceCv: 0.4, queueLimit: 256 } },
            ranker: { cfg: { instances: 4, capacity: 4, serviceMs: 8, serviceCv: 0.3, queueLimit: 64 } },
            db: { cfg: { capacity: 16, serviceMs: 10, serviceCv: 0.5, queueLimit: 64, lockMs: 0 } },
            worker: { cfg: { instances: 8, capacity: 16, serviceMs: 5, serviceCv: 0.5 } },
            warehouse: { cfg: { capacity: 128, serviceMs: 120, serviceCv: 0.7, queueLimit: 256, lockMs: 0 }, fullWhy: 'A warehouse is built for large scans and bulk loads. On the payment path its slowest moments become declined or late authorisations.' }
          },
          needWhy: {
            features: 'The model needs the card\'s current features, read from a store that answers in milliseconds.',
            ranker: 'Every payment has to be scored before it is authorised. Scored afterwards, the fraud is found once the money has gone.',
            worker: 'Velocity counters, such as charges per card in the last hour or cards per IP address, go stale unless a streaming job updates them as payments arrive.',
            warehouse: 'Labels are built by joining chargebacks to past payments, and the next model is trained on them. Without the payment history there is nothing to join.',
            db: 'Payments in the review band need somewhere analysts can pick them up.'
          },
          bad: {
            'client>features': 'The payment service asks for a decision. It does not read fraud features itself.',
            'client>ranker': 'The scoring service assembles the features and applies the rules; a model score alone is not a decision.',
            'client>warehouse': 'The warehouse is never on the payment path.',
            'worker>ranker': 'Scoring after the payment has gone through is too late: the money has already left. The decision is made inside the authorisation.',
            'ranker>warehouse': 'The model answers in milliseconds. A warehouse query does not.',
            'queue>features': 'A stream holds events. Something has to read them and update the counters: draw the streaming jobs between the two.',
            'queue>warehouse': 'A stream holds events. Something has to read them and write the rows: draw the streaming jobs between the two.'
          },
          traps: [
            { name: 'features read from the warehouse in the payment path', cut: [['app', 'features']], wire: [['app', 'warehouse']] },
            { name: 'payments scored after they are authorised', cut: [['app', 'ranker']], wire: [['worker', 'ranker']] },
            { name: 'no stream: payment events written to the warehouse inside the payment path', drop: ['queue', 'worker'], wire: [['app', 'warehouse']] },
            { name: 'event stream drawn but nothing reads it', drop: ['worker'] },
            { name: 'no load balancer in front of the scoring fleet', drop: ['lb'], wire: [['client', 'app']] }
          ]
        } }
    ] }
  });

  T({
    id: '7.5', mod: '7', title: 'RAG Q&A system', tag: 'Permission-aware retrieval, grounded answers',
    analogy: 'A reference librarian in an archive of locked rooms. She checks your badge before fetching anything, so she never carries a folder you could not open yourself; she reads you only what she fetched, points to the page for each fact, and says "nothing here covers that" rather than guess.',
    points: [
      'Requirements: answer employees\' questions from millions of documents across wiki, drive and tickets, cite the sources, and show nobody text they cannot already open (Slack\'s stated rule for its assistant). Budget: retrieval in hundreds of milliseconds; Dropbox reported in 2025 keeping Dash retrieval under 1–2 s for over 95% of queries, to leave time for the rest of the pipeline.',
      'Ingestion: connectors sync on a schedule and on webhooks; each document is parsed, chunked and embedded, and every chunk is stored with its document ID, chunk number, tenant and the document\'s ACL groups. When a document changes or is deleted, delete all its chunks by document ID and upsert the new set; upserting by chunk ID alone leaves orphans.',
      'Query path: authenticate, resolve the user\'s groups, run hybrid (BM25 + vector) retrieval with the ACL filter inside the query, rerank about 150 candidates down to 20 (Anthropic\'s published setup), build the prompt as a stable prefix, then the chunks, then the question, and stream the answer.',
      'Permissions are the hard part. Filtering after the search returns about k × the share the user can see: 2% of 100 is 2. Filtering during the search keeps k results, but HNSW has to explore more of the graph to find them. For hard tenant isolation use a namespace per tenant: in Pinecone a tenant\'s search then scans its 1 GB, not all 100 GB.',
      'Grounding: return a citation for each claim (Claude\'s citations API returns pointers into the supplied documents), and refuse when no chunk clears the relevance bar instead of answering from the model\'s memory. Evaluate retrieval (did the needed passages arrive?) and generation (are the claims supported by them?) separately.',
      'Cost and failure: cost per question ≈ input tokens × input price + output tokens × output price. Only the stable prefix can be cached (reads at 0.1× the input price on most Claude models, less on some newer ones; the occasional 1.25× cache write is negligible at steady traffic); the 10,000 tokens of chunks change every question. Failure modes: permission changes that lag the source, deleted documents that linger, and a new embedding model forcing a full re-index (topic 5.6).'
    ],
    pitfall: 'Enforcing permissions in the prompt ("only use documents this user may see") or by checking answers afterwards. The model has already read the restricted text, and a paraphrase or a prompt injection carries it out. Enforce the ACL as a filter inside the retrieval query, so the text never reaches the model.',
    say: 'Every chunk carries its document\'s ACL groups, and the user\'s groups go into the retrieval filter, so the model only sees text the user can open. I retrieve about 150 candidates with hybrid search, rerank to 20, stream the answer with citations, and refuse when nothing clears the relevance bar. At 10,000 input and 300 output tokens, priced at $3 and $15 per million, that is about 3.5 cents a question.',
    refs: [
      ['slack-ai-secure', 'The requester\'s ACL at fetch time — “We ensure this by using the requesting user’s Access Control List (ACLs) when fetching the data to summarize or search”'],
      ['dropbox-dash-rag', 'Retrieval budget at Dropbox (2025) — “we stayed under 1–2 seconds for over 95% of our queries, which allows us some latency budget for the rest of the pipeline”'],
      ['pinecone-doc-chunks', 'Re-indexing a changed document — “When the number or order of a source document’s chunks changes, delete all of its chunks with a metadata filter, and then upsert the new ones.”'],
      ['es-knn-filtered', 'Filter inside the search — “The filter is applied during approximate kNN search to ensure that k matching documents are returned.”'],
      ['pinecone-multitenancy', 'Namespace per tenant — “With 100 tenants of 1 GB each, searching one tenant’s namespace costs 1 RU. Using metadata filtering in a single 100 GB namespace would cost 100 RUs for the same search, because it scans all data regardless of filters.”'],
      ['anthropic-contextual-retrieval', 'Retrieve wide, rerank narrow — “Perform initial retrieval to get the top potentially relevant chunks (we used the top 150);”'],
      ['anthropic-prompt-caching', 'Cache writes and reads — “Cache write tokens with a 5-minute TTL are 1.25 times the base input tokens price. Cache write tokens with a 1-hour TTL are 2 times the base input tokens price. Cache read tokens are 0.1 times the base input tokens price (see the table footnote for per-model exceptions).”'],
      ['anthropic-citations', 'Citations point into the sources — “citations are guaranteed to contain valid pointers to the provided documents.”'],
      ['anthropic-reduce-hallucinations', 'Allow a refusal — “Explicitly give Claude permission to admit uncertainty. This technique can drastically reduce false information.”'],
      ['ragas', 'Two things to evaluate — “the ability of the retrieval system to identify relevant and focused context passages, the ability of the LLM to exploit such passages in a faithful way”']
    ],
    cards: [
      ['Where must document permissions be enforced in an enterprise RAG system, and why there?', 'In the retrieval query. Each chunk carries its document\'s ACL groups and the search filters on the asking user\'s groups, so restricted text never enters the prompt. A prompt instruction is not enforcement: by then the model has already read the text.'],
      ['Search-then-filter vs filter-during-search for permissions: what does each cost?', 'Search-then-filter takes the top k and drops what the user cannot open, so a user who can see 2% of the corpus gets about 2% of k back and answers starve. Filtering inside the search returns k matching chunks, at the price of a slower HNSW search that explores more of the graph.'],
      ['How do you evaluate a RAG assistant, and why two kinds of metric?', 'Retrieval: recall and precision of the passages a labelled question needs. Generation: faithfulness (every claim supported by the retrieved context) and relevance. A refusal is perfectly faithful while retrieval is failing, so each needs its own number.']
    ],
    quiz: [
      ['An assistant retrieves the top 20 chunks from the whole company index, labels each with its ACL, and its system prompt says "use only chunks this user may open". What is the flaw?', ['The model has already read text the user may not open; filter in retrieval', 'Nothing, if the model is a recent one that follows its instructions closely', 'The labels waste tokens; move them into chunk metadata and keep the prompt', 'It should scan each finished answer for restricted text after generation'], 'Slack applies the requesting user\'s ACL when the data is fetched, so the model only receives what the user can already see. An instruction is a request to the model, not a control: the restricted text is in the context, and a paraphrase or an injected instruction can carry it out. Scanning answers afterwards misses paraphrases.', ['slack-ai-secure']],
      ['Each question sends a 2,000-token system prompt, then 10,000 tokens of retrieved chunks and a 50-token question, and gets 300 tokens back. Input is $3 per million tokens, output $15, cache reads 0.1×. Caching is turned on for the prefix, and steady traffic keeps it warm. Roughly how much does it cut the cost per question?', ['About 13%; only the 2,000-token prefix can be cached', 'About 90%; cache reads cost a tenth of the input price', 'About 80%; all input is cached, but the output is not', 'About 0%; since the chunks differ, there is no cache hit'], 'Uncached: 12,050 × $3/M + 300 × $15/M = $0.0407. With the prefix cached: 2,000 × $0.30/M + 10,050 × $3/M + $0.0045 = $0.0353, about 13% less (the 1.25× write price is paid only when the entry has expired, which a warm cache makes rare). The 0.1× price applies only to tokens read from the cache; the chunks change every question, so 80% assumes they cache too. The prefix still hits because the stable part comes first and a cache entry covers everything up to its breakpoint.', ['anthropic-prompt-caching']],
      ['A SaaS RAG product stores 2,000 GB of vectors for 2,000 customers of about 1 GB each in Pinecone serverless, where a search costs 1 read unit per GB scanned. Moving from one shared namespace filtered by tenant ID to one namespace per tenant changes what?', ['Each search costs about 1 RU instead of 2,000, and tenants are stored apart', 'Nothing for cost, because the tenant filter already skips other tenants\' data', 'Each search costs more, because each namespace keeps an index of its own', 'Recall falls, because each small namespace has too few vectors to search well'], 'Pinecone charges by the size of the namespace searched, and a metadata filter does not shrink the scan: it scans all data regardless of filters. Per-tenant namespaces are also stored separately, which is physical isolation rather than a filter that one bug can drop.', ['pinecone-multitenancy']],
      ['An edited wiki page is re-chunked from 30 chunks to 24. The indexer upserts the new chunks under IDs page#1 to page#24 and does nothing else. What do users see?', ['Old chunks 25 to 30 stay searchable and can still be cited', 'The 30 old chunks are replaced, since upsert works per document', 'The upsert is rejected, since the chunk count no longer matches', 'Nothing odd, since stale chunks are ranked below current ones'], 'An upsert replaces only the IDs it names, so six chunks of the old text remain and can be retrieved and quoted. Pinecone\'s guidance when a document\'s chunk count or order changes is to delete all its chunks by a document ID filter and then upsert the new ones; a deleted source document needs the same delete. Nothing ranks stale chunks lower.', ['pinecone-doc-chunks']],
      ['After a chunking change, the faithfulness score holds at 0.95 but more answers say "I could not find that in the documents". Which measurement locates the cause?', ['Recall of the needed chunks on a labelled question set', 'Faithfulness again, rescored with a stronger judge model', 'Average answer length before and after the change', 'Time to first token at the 99th percentile'], 'Faithfulness asks whether the answer\'s claims follow from the retrieved context; a refusal makes no unsupported claims, so it stays high while retrieval fails. Ragas treats finding relevant passages and using them faithfully as separate dimensions, and recall on questions with known answers shows whether the right chunks stopped arriving.', ['ragas']]
    ],
    explain: ['Design an enterprise assistant that answers employees\' questions from company documents.', ['Ingestion: connectors, chunk and embed, re-index on edit and delete by document ID', 'Permissions: ACL groups on every chunk, enforced as a filter inside retrieval', 'Query path: hybrid retrieval, rerank, cached stable prefix, streamed answer', 'Grounding: citations, and refusing when nothing relevant is retrieved', 'Evaluation and cost: retrieval recall vs faithfulness; tokens per question']],
    duck: ['Why not just tell the model which documents the user is allowed to see?', 'Someone deleted a document last week. How can the bot still be quoting it?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Prompt: "Design a Q&A assistant over our company\'s documents." Pick the four questions most worth asking.', want: 4, options: [
        ['Must answers respect each user\'s existing document permissions?', true, 'Decides that ACLs ride on every chunk and filter every retrieval.'],
        ['How many documents, and how often are they edited or deleted?', true, 'Sizes the index and the re-indexing pipeline.'],
        ['How long may a user wait before the first words appear?', true, 'Splits the budget between retrieval and generation, and calls for streaming.'],
        ['Must answers cite sources, and may the assistant say it does not know?', true, 'Shapes the prompt, the citation format and the refusal threshold.'],
        ['Which vector database should we standardise on for this?', false, 'Your choice, made later from the requirements.'],
        ['Which programming language is the indexer written in?', false, 'Does not change the design.'],
        ['Can the ingestion workers run on our Kubernetes cluster?', false, 'Deployment detail, not a requirement.'],
        ['Should the chat window open in a side panel or a new tab?', false, 'A UI detail that changes nothing behind it.']
      ] },
      { type: 'estimate', brief: 'Given: 50,000 employees, 20% ask 5 questions each on a workday (8 hours). 2M documents averaging 4,000 tokens, cut into 500-token chunks. Each prompt: a 2,000-token cached prefix + 20 chunks + a 50-token question; each answer 300 tokens. Prices: $3 per million input tokens, $15 per million output tokens, cache reads at 0.1×.', fixed: [
        { q: 'Average questions per second over the 8-hour day?', a: 1.74, unit: 'questions/s', tol: 0.1, how: '50,000 × 0.2 × 5 = 50,000 questions ÷ 28,800 s ≈ 1.7 per second. Small: generation time, not request rate, sets the size of this system.' },
        { q: 'How many chunks in the index, in millions?', a: 16, unit: 'M chunks', tol: 0.05, how: '2M × 4,000 tokens = 8 billion tokens ÷ 500 = 16M chunks: about 65 GB of raw vectors at 1,024 float32 dimensions, before the index.' },
        { q: 'Cost of one question, in cents?', a: 3.5, unit: 'cents', tol: 0.1, how: 'Uncached input: 20 × 500 + 50 = 10,050 tokens × $3/M = $0.0302. Cached prefix: 2,000 × $0.30/M = $0.0006. Output: 300 × $15/M = $0.0045. Total ≈ $0.035, about $1,760 a day for 50,000 questions.' },
        { q: 'Drop the reranker and send all 150 retrieved candidates instead of 20. Uncached input tokens per question?', a: 75050, unit: 'tokens', tol: 0.02, how: '150 × 500 + 50 = 75,050, 7.5× the 10,050 with reranking: about $0.23 a question instead of $0.035, with worse use of the middle of the context (topic 5.8).' }
      ] },
      { type: 'sort', brief: 'Where does this belong?', buckets: ['Ingestion pipeline', 'Query path', 'Evaluation'], items: [
        ['Delete every chunk of a document deleted at the source', 0], ['Copy a document\'s ACL group IDs onto each of its chunks', 0], ['Embed the changed chunks named by a webhook event', 0],
        ['Put the asking user\'s groups into the search filter', 1], ['Rerank 150 candidates down to the best 20', 1], ['Refuse when no chunk clears the relevance threshold', 1], ['Stream the answer with a citation for each claim', 1],
        ['Measure recall@20 on a labelled set of real questions', 2], ['Score whether each answer\'s claims follow from its chunks', 2], ['Compare two chunk sizes on the same question set', 2]
      ] },
      { type: 'diagram', brief: 'Draw both paths at the peak: about 5 questions a second (three times the 1.7 you estimated), each retrieving permitted chunks and then streaming an answer from the model, and 40 document changes a second while a connector re-syncs a large drive.',
        labels: { gateway: 'API gateway', app: 'Q&A service', index: 'Vector index (ACL filter)', ranker: 'LLM fleet (GPU)', queue: 'Change queue', worker: 'Ingest workers' },
        required: ['client', 'gateway', 'app', 'index', 'ranker', 'queue', 'worker'],
        edges: [['client', 'gateway'], ['gateway', 'app'], ['app', 'index'], ['app', 'ranker'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'index']],
        layout: { client: [10, 120], gateway: [165, 120], app: [320, 120], ranker: [500, 30], index: [500, 210], queue: [320, 300], worker: [500, 372] },
        why: {
          gateway: 'Signs the user in and resolves their groups, then spreads questions and connector webhooks over the Q&A service fleet.',
          app: 'Runs each question: searches with the asker\'s groups in the filter, builds the prompt and relays the streamed answer. For a document change it only puts an event on the queue.',
          index: 'Holds the 16M chunks, each tagged with its document ID and ACL groups. The search filters on the asker\'s groups, so the model never sees text they cannot open.',
          ranker: 'Writes the answer from about 20 chunks and streams it back. Each answer holds a GPU slot for seconds, so this fleet is sized by answers in progress, not by requests a second.',
          queue: 'A document change is acknowledged at once and processed later, so a connector re-sync never takes capacity from people asking questions.',
          worker: 'Parse, chunk and embed each changed document, then delete its old chunks by document ID and upsert the new ones with their ACL groups.'
        },
        decoys: {
          cache: 'Two people asking the same question may be allowed different documents, so a cached answer can show one of them text only the other may open.',
          cdn: 'Every answer is built for one user from the documents they may open. There is nothing shared to serve from the edge.',
          warehouse: 'Evaluation runs offline on logged questions. Nothing on either path reads a warehouse.'
        },
        sim: {
          load: 'About 5 questions a second, three times the 1.7 average you estimated, and 40 document changes a second while a connector re-syncs a large drive (that rate is an assumption for this exercise). The model takes about 3 seconds to stream a 300-token answer, and the test times the whole answer. Parsing, chunking and embedding one changed document (8 chunks) takes about 2 seconds.',
          timeoutMs: 15000,
          windowS: 40,
          goals: { errors: 1, p99: 6000 },
          flows: [
            { label: 'Questions', rps: 5.2, needs: ['index', 'ranker'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['app', 'index'], ['app', 'ranker']] },
            { label: 'Document changes', rps: 40, needs: ['worker', 'index'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'queue'], ['gateway', 'app', { instead: 'queue' }], ['app', 'queue'], ['app', 'worker', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'index']] }
          ],
          parts: {
            gateway: { cfg: { capacity: 256, serviceMs: 2, queueLimit: 1024, rateLimitRps: 500, burst: 500, authFailRate: 0 } },
            app: { cfg: { instances: 4, capacity: 10, serviceMs: 5, serviceCv: 0.5, queueLimit: 32 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of it spreads the users over the fleet, so they all reach one server.', fullWhy: 'A question holds its slot for the seconds its answer streams. Anything else slow done inside a request takes slots that questions need.' },
            index: { cfg: { capacity: 32, serviceMs: 30, serviceCv: 0.4, queueLimit: 128 } },
            ranker: { cfg: { instances: 8, capacity: 4, serviceMs: 3000, serviceCv: 0.3, queueLimit: 64 }, fullWhy: 'Each answer holds a GPU slot for about 3 seconds while it streams. More answers at once, or longer ones, fill the fleet.' },
            queue: { cfg: { queueLimit: 5000 } },
            worker: { cfg: { instances: 8, capacity: 16, serviceMs: 2000, serviceCv: 0.4, queueLimit: 64 }, fullWhy: 'Embedding a document takes about 2 seconds of a worker\'s time. A re-sync is absorbed by the queue and worked through at the workers\' pace.' }
          },
          needWhy: {
            index: 'Questions are answered from the chunks found here, filtered by the asker\'s groups, and every document change has to end up here. Without it the model is sent whole documents with no permission filter.',
            ranker: 'Retrieval returns chunks, not an answer. Something has to write the answer and cite them.',
            worker: 'Something has to parse, chunk and embed each changed document and delete its old chunks. Until then the index serves the old text, or a document that was deleted.'
          },
          bad: { 'client>index': 'Clients never query the index directly: your service adds the permission filter, and a caller cannot be trusted to.', 'client>ranker': 'Clients never call the model directly: it must only see chunks retrieved with the user\'s permissions.', 'gateway>ranker': 'The gateway checks who is calling and forwards the request. It does not run the model.', 'gateway>index': 'The gateway checks who is calling and forwards the request. It does not search.', 'queue>index': 'A queue holds change events. Something has to parse, chunk and embed each document: draw the workers between the two.', 'client>queue': 'Connectors send changes to your API, which checks them before anything goes on the internal queue.', 'ranker>index': 'The model is given the chunks your service retrieved with the user\'s groups. A search the model runs itself can leave the permission filter out.' },
          traps: [
            { name: 'documents chunked and embedded inside the upload request', drop: ['queue'], wire: [['app', 'worker']] },
            { name: 'no retrieval: whole documents go to the model', drop: ['index'] },
            { name: 'change queue drawn but nothing reads from it', drop: ['worker'] },
            { name: 'changes never reach the index', cut: [['worker', 'index']] },
            { name: 'no gateway in front of the fleet', drop: ['gateway'], wire: [['client', 'app']] }
          ]
        } }
    ] }
  });

  T({
    id: '7.6', mod: '7', title: 'Content moderation pipeline', tag: 'Hash first, classify, people for the middle',
    analogy: 'Airport baggage screening. Every bag is checked against a list of known items, then X-rayed; the machine clears most bags, flags a few for certain, and sends the doubtful ones to a person who opens them. How many bags you send to that desk decides how many people you need there.',
    points: [
      'Requirements: millions of image and video uploads a day; decide allow, remove or send to a person, per policy category; and decide when. YouTube reported that of the over 8M videos it removed in Oct–Dec 2017, 6.7M were first flagged by machines, and 76% of those were removed before a single view; violent-extremist videos matched to known content at upload would all have had none.',
      'Data path: the client uploads to object storage and an event with the content ID goes on a queue. Every decision is stored with the content ID, hashes, scores, model version, who or what decided and why: an append-only audit log that appeals and re-scans read. Queues deliver at least once, so workers are idempotent on content ID and model version.',
      'Cheap checks first: exact hashes, then perceptual hashes (Microsoft\'s PhotoDNA, or Meta\'s open-source PDQ: 256 bits compared by Hamming distance, with 31 or less the suggested starting match threshold) against banks of known-bad content. Then GPU classifiers, with video sampled into frames. Hashes catch copies and re-encodes, not new content or deliberate crops.',
      'Thresholds are staffing decisions. Above a high score remove, below a low score allow, and the band between goes to people, plus a random sample of automatic decisions for audit (the two triggers Amazon A2I offers). AWS puts the human share at typically 1–5% of volume; at 10M uploads a day, 2% at 30 s each is about 1,700 reviewer-hours a day.',
      'Order the review queue by severity, virality and likelihood of violation (Meta\'s three factors). Keep separate queues for fresh uploads and back-catalogue re-scans, so a spike or a re-scan cannot starve new uploads. When a hash list grows, match the new hashes against the hashes stored at upload, without re-reading any media; when a classifier changes, re-scan as a low-priority batch job.',
      'Trade-offs: holding an upload until it is checked means no exposure but a delay for every uploader; publishing first is instant, but a violation collects views until it is removed. Hold for high-severity categories and check after publishing elsewhere. Precision is paid for in wrongful removals and appeals; recall in reviewer hours and exposure.'
    ],
    pitfall: 'Running every upload through the GPU classifiers and skipping hash matching, or trusting hashes alone. Hashing costs about as much as reading the file and catches re-uploads of known content; it misses new content and deliberate edits, which is what the classifiers are for.',
    say: 'Uploads land in object storage and go on a queue; idempotent workers hash-match against known-bad banks first, then run classifiers, and score bands decide remove, allow or human review. I size the review band in people: 10M uploads a day with 2% in the band at 30 s each is about 1,700 reviewer-hours a day.',
    refs: [
      ['youtube-enforcement-2018', 'Removed before a view, late 2017 — “Of those 6.7 million videos, 76 percent were removed before they received a single view.”'],
      ['meta-pdq-tmk-paper', 'What hashes miss — “They are unsuitable for detecting intentional attack/obfuscation, including deeper crops.”'],
      ['meta-pdq-tmk-paper', 'Unrelated images are far apart — “the hamming distance between random pairs of PDQ hashes averages 128, supported on the range of 90 to 160 or so.”'],
      ['pdq-readme', 'Starting threshold — “Distance Threshold to consider two hashes to be similar/matching: <=31”'],
      ['meta-pdq-open-source', 'Matching without the media — “These technologies create an efficient way to store files as short digital hashes that can determine whether two files are the same or similar, even without the original image or video.”'],
      ['aws-rekognition-moderation', 'The human share — “human moderators can review a much smaller set of content, typically 1-5% of the total volume, already flagged by machine learning.”'],
      ['aws-rekognition-a2i', 'The review band — “ModerationLabelConfidenceCheck creates a human loop when confidence of a moderation label is within a range.”'],
      ['meta-prioritizing-review', 'What is reviewed first (severity, virality, likelihood of violating) — “When determining which content our human review teams should review first, we consider 3 main factors:”'],
      ['aws-bl-queue-backlogs', 'Separate queues — “Instead of sharing one queue across all customers, in some systems we give each customer its own queue.”'],
      ['aws-sqs-at-least-once', 'Workers must be idempotent — “Design your applications to be idempotent (they should not be affected adversely when processing the same message more than once).”']
    ],
    cards: [
      ['Why hash-match before running classifiers, and why not hash-match alone?', 'Perceptual hashing costs about as much as reading the file and catches re-uploads and re-encodes of known content with no GPU time. It does not recognise new content or deliberate edits such as deep crops, which need classifiers.'],
      ['How do confidence thresholds turn into staffing?', 'Above a high score remove, below a low score allow, and the band between goes to people. Uploads × share in the band × seconds per review = reviewer-hours, so widening the band to catch more is a hiring decision.'],
      ['Pre-publication vs post-publication moderation: the trade.', 'Holding an upload until it is checked means zero exposure and a delay for every uploader. Publishing first is instant, but a violation collects views until it is removed. Hold where a few views do real harm, publish-then-check elsewhere.']
    ],
    quiz: [
      ['10M images are uploaded a day and 1.5% land in the human-review band. A review takes 30 s, and a reviewer has 6 productive hours a shift. How many reviewer shifts a day?', ['About 208', 'About 1,250', 'About 12,500', 'About 35'], '150,000 reviews × 30 s = 4.5M s = 1,250 hours ÷ 6 hours a shift ≈ 208 shifts. 1,250 is the hours, not the shifts; 12,500 reads 30 s as 30 minutes; 35 divides by the 6-hour shift twice.', 'calc'],
      ['A classifier auto-removes at a score of 0.95 or more, sends 0.70–0.95 to people and allows the rest. To catch more violations, the team lowers the review floor to 0.50. What changes first?', ['The review queue grows, so reviewer hours must grow with it', 'More items are removed automatically, with no person involved', 'Fewer items reach reviewers, because more are decided by the model', 'Auto-removals become less precise, because the removal bar moved'], 'The review trigger is a confidence range, and only its lower edge moved: everything scoring 0.50–0.70 that used to be allowed now goes to a person. The auto-remove bar is unchanged, so automatic removals and their precision are unchanged. If reviewers do not grow with the band, the queue backs up.', ['aws-rekognition-a2i', 'aws-rekognition-moderation']],
      ['A known propaganda image is re-uploaded after a heavy crop and a new text overlay. PDQ matching at a distance of 31 or less finds no match. What should catch it?', ['A trained classifier, since perceptual hashes target near-copies', 'Raising the PDQ match threshold from 31 up to 128 bits of distance', 'Matching on the SHA-256 of the file in place of the PDQ hash', 'Re-hashing with PDQ after converting the upload to PNG format'], 'Meta describes PDQ-style hashers as suited to copies that lost quality or changed format, and unsuitable for intentional obfuscation such as deeper crops; that is the job of machine-learning detection. 128 is the average distance between unrelated images, so it would match almost everything. SHA-256 is stricter still, and a format change is what PDQ already tolerates.', ['meta-pdq-tmk-paper', 'pdq-readme']],
      ['A new classifier version starts re-scanning 2 billion stored images through the same queue and GPU pool as new uploads. New uploads now wait hours for a decision. Best fix?', ['Give the re-scan its own low-priority queue, so new uploads go first', 'Shard the shared queue by content ID so more workers take the re-scan', 'Raise the queue\'s visibility timeout so workers hold items longer', 'Batch the re-scan into bigger messages so it takes up fewer queue slots'], 'Two workloads with different urgency share one queue, so the bulk one sets everyone\'s wait. Amazon\'s answer is separate queues per workload, with fresh work drained first. Sharding by content ID mixes re-scan items into every shard, so uploads still wait behind them; bigger messages carry the same images to the same GPUs; a longer visibility timeout changes redelivery, not order.', ['aws-bl-queue-backlogs']],
      ['Uploads are published at once and moderated afterwards, with a median of 10 minutes to a decision. A fast-spreading post can collect thousands of views in those 10 minutes. Where is holding publication until the check finishes worth its delay?', ['For high-severity categories, where even a few views do real harm', 'Nowhere, since hashing at upload already blocks known harmful copies', 'For each upload, since 10 minutes of views is too much exposure to accept', 'For images alone, since videos take too long to check before posting'], 'Exposure is counted in views: YouTube reported most machine-flagged removals in late 2017 happened before a single view, and known extremist videos matched at upload had none. Holding every upload makes every uploader wait, mostly for posts that break no rule or do little harm, so spend the delay where severity is high, the first of Meta\'s three review factors. Hash matching catches copies of known content only; new violations still go live.', ['youtube-enforcement-2018', 'meta-prioritizing-review']]
    ],
    explain: ['Design a moderation pipeline for user-uploaded images and video.', ['Upload to object storage, event on a queue, idempotent workers keyed by content ID', 'Cascade: exact and perceptual hash match first, then GPU classifiers on sampled frames', 'Score bands decide remove, allow or review, sized in reviewer-hours and ordered by severity', 'Separate queues for spikes and re-scans; re-match stored hashes when a hash list changes', 'Pre- vs post-publication; audit log and appeals']],
    duck: ['Why not just have people look at everything?', 'If a picture is cropped a little, is it still the same picture to the computer?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Prompt: "Design content moderation for image and video uploads." Pick the four questions most worth asking.', want: 4, options: [
        ['Must content be blocked before anyone sees it, or removed after?', true, 'Pre- or post-publication: decides whether checks sit on the upload path.'],
        ['How many images and video minutes arrive per day, and at peak?', true, 'Sizes the queue, the GPU pool and the review band.'],
        ['Which harm categories, and which are severe enough to act at once?', true, 'Sets thresholds and queue priority per category.'],
        ['How many reviewers are there, and how long does a review take?', true, 'Caps how wide the human-review band can be.'],
        ['Which GPU model should the classifiers be deployed on?', false, 'An implementation choice made after sizing.'],
        ['Should the upload queue be built on Kafka or on SQS?', false, 'Your call, made from the requirements.'],
        ['Should the moderation service be written in Go or Java?', false, 'Does not change the design.'],
        ['Should reviewers use a web app or a desktop application?', false, 'Tooling detail, not a requirement.']
      ] },
      { type: 'estimate', brief: 'Given: 20M images and 1M videos (average 60 s) uploaded a day. Video is sampled at 1 frame per second. One GPU classifies 500 frames a second. 2% of items land in the human-review band; a review takes 20 s; a reviewer has 6 productive hours a day.', fixed: [
        { q: 'Frames to classify per day, in millions?', a: 80, unit: 'M frames', tol: 0.05, how: '20M images + 1M videos × 60 frames = 80M frames.' },
        { q: 'GPUs needed at a peak of 3× the daily average rate?', a: 6, unit: 'GPUs', tol: 0.1, how: '80M ÷ 86,400 s ≈ 926 frames/s on average × 3 = 2,778 ÷ 500 ≈ 5.6, so 6. Hash matching first shrinks this, since matched items skip the classifier.' },
        { q: 'Reviewers needed per day?', a: 389, unit: 'reviewers', tol: 0.1, how: '21M items × 2% = 420,000 reviews × 20 s = 8.4M s ≈ 2,333 hours ÷ 6 ≈ 389 reviewers.' },
        { q: 'Workers stop for 2 hours while uploads keep arriving. Once restarted at 2× the average processing rate, hours to clear the backlog?', a: 2, unit: 'hours', tol: 0.1, how: 'The backlog is 2 hours of arrivals. At 2× capacity, 1× keeps up with new arrivals and the spare 1× drains the backlog: 2 more hours. With 1.5× it would take 4.' }
      ] },
      { type: 'order', brief: 'Order the path of one upload through moderation.', items: ['The client uploads the file to object storage and gets a content ID', 'An event with the content ID is put on the moderation queue', 'A worker computes exact and perceptual hashes and checks the hash banks', 'With no hash match, GPU classifiers score the image or sampled frames', 'Score bands decide: remove, allow, or send to the human review queue', 'The decision, scores and model version are written to the audit log', 'The uploader is told the logged outcome and may appeal a removal against that record'] },
      { type: 'diagram', brief: 'Draw the path of an upload at the peak: 730 items a second (three times the daily average of 21M images and videos), stored and acknowledged at once, then hash-matched, classified on GPUs, with the uncertain ones sent to people.',
        labels: { lb: 'Load balancer', app: 'Upload service', blob: 'Object storage', queue: 'Moderation queue', worker: 'Moderation workers', index: 'Hash banks (PDQ)', ranker: 'GPU classifiers', db: 'Human review queue' },
        required: ['client', 'lb', 'app', 'blob', 'queue', 'worker', 'index', 'ranker', 'db'],
        edges: [['client', 'lb'], ['lb', 'app'], ['app', 'blob'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'blob'], ['worker', 'index'], ['worker', 'ranker'], ['ranker', 'db']],
        layout: { client: [0, 120], lb: [130, 120], app: [260, 120], blob: [390, 16], queue: [260, 260], worker: [390, 260], index: [520, 160], ranker: [520, 330], db: [632, 250] },
        why: {
          lb: 'Spreads the uploads over the upload service fleet, so no one server takes them all.',
          app: 'Stores the file, puts an event with the content ID on the queue and answers at once. It never waits for a check.',
          blob: 'Holds every uploaded file. The upload service writes it once, and the workers read it back to hash and classify it.',
          queue: 'Carries new uploads only, so the uploader is answered before any check runs. A back-catalogue re-scan gets a low-priority queue of its own, so it can never sit in front of fresh uploads.',
          worker: 'Reads each file, computes its exact and perceptual hashes, and sends only what no hash bank recognises on to the classifiers. Idempotent on content ID, since the queue delivers at least once.',
          index: 'Banks of known-bad hashes. A match settles an item in milliseconds with no GPU time, so the classifiers only see what is new.',
          ranker: 'Scores each image, or frames sampled from a video, per policy category. A high score removes, a low one allows, and the band between goes to people.',
          db: 'The uncertain middle band, about 2% of items, ordered by severity, virality and likelihood of violation for reviewers to work through.'
        },
        decoys: {
          cdn: 'Nothing here is served to viewers. Moderation reads each file once, from object storage.',
          ws: 'The uploader is told the outcome later. Nothing needs a connection held open while the checks run.',
          search: 'Matching is by hash distance in the hash banks, not by searching text.'
        },
        sim: {
          load: '730 uploads a second, three times the daily average of 21M images and videos. Storing a file takes about 40 ms. In this test half the uploads are copies or re-encodes of content already in the hash banks (an illustrative share), and the GPU pool is sized for the new half. About 2% of items fall in the band that goes to people.',
          scale: 5,
          goals: { errors: 1, p99: 300 },
          flows: [
            { label: 'Re-uploads of known content', rps: 365, needs: ['blob', 'worker', 'index'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'blob'], ['app', 'queue'], ['app', 'worker', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'blob'], ['worker', 'index'], ['worker', 'ranker', { instead: 'index' }], ['ranker', 'db'], ['worker', 'db']] },
            { label: 'New uploads', rps: 365, needs: ['blob', 'worker', 'index', 'ranker', 'db'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'blob'], ['app', 'queue'], ['app', 'worker', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'blob'], ['worker', 'index'], ['worker', 'ranker'], ['index', 'ranker'], ['ranker', 'db'], ['worker', 'db']] }
          ],
          parts: {
            app: { cfg: { instances: 4, capacity: 3, serviceMs: 5, serviceCv: 0.5, queueLimit: 32 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of it spreads the uploads over the fleet, so every uploader reaches the same server.', fullWhy: 'Each upload holds a slot until everything it called has answered. Is anything slow being done while the uploader waits?' },
            blob: { cfg: { capacity: 32, serviceMs: 40, serviceCv: 0.4, queueLimit: 256, prefixRps: 0 } },
            queue: { cfg: { queueLimit: 20000 } },
            worker: { cfg: { instances: 4, capacity: 8, serviceMs: 40, serviceCv: 0.5 }, fullWhy: 'A worker holds its slot while the file is read and the classifiers answer.' },
            index: { cfg: { capacity: 64, serviceMs: 2, serviceCv: 0.3, queueLimit: 256 } },
            ranker: { kind: 'cache', cfg: { instances: 3, capacity: 3, serviceMs: 80, serviceCv: 1, hitRate: 0.98, queueLimit: 64 }, fullWhy: 'The GPU pool is sized for what the hash banks leave over. Every item that skips the cheap first pass costs GPU time.' },
            db: { cfg: { capacity: 16, serviceMs: 10, serviceCv: 0.5, queueLimit: 64, lockMs: 0 } }
          },
          needWhy: {
            blob: 'The file has to be stored where the checks can read it, and the upload acknowledged once it is safe.',
            worker: 'Something has to take each upload off the queue and run the checks on it.',
            index: 'Without the hash banks, every copy of known-bad content costs GPU time and is caught only if a classifier happens to score it high.',
            ranker: 'Hashes only recognise copies of known content. New content needs a classifier.',
            db: 'Items the classifiers are unsure about need a person, or the system has to guess on every one of them.'
          },
          bad: { 'client>queue': 'Clients do not publish to your internal queue. The upload service does, once the file is stored.', 'client>ranker': 'Clients never call the classifiers: an uploader could simply skip the check.', 'client>db': 'Reviewers work through the review queue in their own tool. Uploaders never touch it.', 'queue>ranker': 'A queue holds content IDs. Something has to read the file, hash it and call the classifiers: draw the workers between the two.', 'queue>index': 'A queue holds content IDs. Something has to read the file and hash it: draw the workers between the two.', 'lb>blob': 'A load balancer forwards requests to servers. It does not store files.', 'app>ranker': 'Classifying inside the upload request makes every uploader wait for a GPU. Put the item on the queue and let the workers call the classifiers.', 'app>index': 'Hash matching reads the whole file. Leave it to the workers, after the upload has been acknowledged.' },
          ok: [['client', 'blob'], ['blob', 'queue']],
          traps: [
            { name: 'classified inside the upload request', drop: ['queue'], wire: [['app', 'worker']] },
            { name: 'no hash matching: every item goes to the GPU classifiers', drop: ['index'] },
            { name: 'moderation queue drawn but nothing reads from it', drop: ['worker'] },
            { name: 'uncertain items never reach people', cut: [['ranker', 'db']] },
            { name: 'no load balancer in front of the fleet', drop: ['lb'], wire: [['client', 'app']] }
          ]
        } }
    ] }
  });

  T({
    id: '7.7', mod: '7', title: 'Feature platform', tag: 'Shared features for many teams, sized',
    analogy: 'A company parts catalogue. Every part has a number, a datasheet and a named owner; product teams order by part number instead of machining their own. A revised part gets a new number, because changing the old one in place would quietly alter every product that uses it.',
    points: [
      'Requirements: dozens of teams and hundreds of models sharing thousands of features. Uber reported about 10,000 features in Michelangelo\'s feature store in 2017; LinkedIn wrote in 2022 that before Feathr each team ran its own feature pipeline, so the cost was paid many times over and features were rarely reused.',
      'Data model: a feature is reviewed code: source, entity key, transformation and windows, owner and freshness SLA. CI/CD applies it to a registry that teams search (Feast\'s recommended setup), and consumers ask for features by name. Two APIs: online, get(entity keys, feature names); offline, "join these labelled events, point in time".',
      'One definition, two engines: a batch job (Spark) for backfills and daily values, and a streaming job (Flink) for fresh aggregates, writing both the offline warehouse and the online key-value store. Chronon\'s TEMPORAL mode computes values in real time when serving and point-in-time correct when backfilling; Stripe reported p99 freshness of 150 ms with Flink in 2024.',
      'Serving fans out: one ranking call is M candidates × N features. Dropbox wrote in 2025 that one Dash search fans out into thousands of lookups inside a sub-100 ms budget. Batch the keys into few round trips, keep the store next to inference, and store pre-aggregated tiles so a windowed count is a few reads, not every event.',
      'Freshness is set per feature. Precomputing more lowers serving latency and costs freshness; computing at request time does the reverse (Stripe\'s framing). A daily batch value is hours old when it is served, so the backfill must model that delay, or training sees fresher data than serving ever does.',
      'Multi-team concerns: a producer that changes a shared feature in place silently changes every consumer\'s model, so changes ship as new versions. Monitor freshness against each SLA and online-offline consistency. The online copy is the costly part to scale: Stripe (2024) split its store into a cheap bulk-loaded store and a costlier memcache-based one for values that change often.'
    ],
    pitfall: 'Sizing the online store and serving tier per request instead of per lookup. A ranking call that scores 500 candidates with 30 features each needs 15,000 values; fetched one round trip at a time, even 0.5 ms each is 7.5 s.',
    say: 'Features are reviewed code with an owner and a freshness SLA, compiled to Spark for point-in-time backfills and Flink for fresh aggregates. Online, one call is 500 candidates × 30 features = 15,000 values, so I batch keys per round trip, store pre-aggregated tiles and keep the store next to inference to stay inside about 100 ms.',
    refs: [
      ['uber-michelangelo', 'Shared features at Uber, 2017 — “we have approximately 10,000 features in Feature Store”'],
      ['linkedin-feathr', 'Why a platform — “The cost of building and maintaining feature pipelines was borne redundantly across many teams, since each team tended to have their own pipeline.”'],
      ['linkedin-feathr', 'Upgrades as versions — “users will be able to create upgraded versions of widely-shared ML features that will then be automatically tested against existing models that depend on that feature.”'],
      ['feast-registry', 'Definitions in version control — “We recommend users store their Feast feature definitions in a version controlled repository, which then via CI/CD automatically stays synced with the registry.”'],
      ['chronon-groupby', 'One definition, both modes — “TEMPORAL accuracy means that feature values are computed in realtime while serving, and in point-in-time-correct fashion while backfilling.”'],
      ['stripe-shepherd', 'Freshness at Stripe, 2024 — “With Flink now powering our feature updates, we achieved p99 feature freshness of 150ms.”'],
      ['stripe-shepherd', 'Tiles — “With tiling, computing a feature only requires retrieving and aggregating the tiles for the feature rather than all the individual events.”'],
      ['stripe-shepherd', 'Two online stores to cut cost — “To cost-efficiently scale our KV store, we split it into two implementations: a lower-cost store optimized for bulk uploads that is write-once and read-many, and a higher-cost distributed memcache-based store that is optimized for write-many and read-many.”'],
      ['stripe-shepherd', 'Model the batch delay — “we also developed support for modeling delay in the offline training data so we could accurately represent the delay of batch data in training data to avoid training-serving skew”'],
      ['dropbox-dash-feature-store', 'Fan-out at Dropbox, 2025 — “What starts as one search quickly fans out into thousands of feature lookups across interaction history, metadata, collaboration patterns, and real-time signals.”'],
      ['redis-pipelining', 'Round trips dominate — “For instance if the RTT time is 250 milliseconds (in the case of a very slow link over the Internet), even if the server is able to process 100k requests per second, we\'ll be able to process at max four requests per second.”']
    ],
    cards: [
      ['What does a feature platform add to a feature store when many teams share it?', 'Definitions as reviewed code with an owner and a freshness SLA; a registry to discover them; one definition compiled to batch backfills and streaming updates; versioning, so a producer\'s change does not silently alter consumers\' models; and freshness and consistency monitoring.'],
      ['Why does feature serving fan out, and how do you keep it inside the budget?', 'One ranking call scores hundreds of candidates with dozens of features each: thousands of values. Send keys in a few batched calls, store pre-aggregated tiles instead of raw events, and keep the store close to the model servers.'],
      ['How do you backfill a daily batch feature without skew?', 'Replay the definition over history as of each training event, and also model when the value would have reached the online store: a daily job\'s value covers up to midnight and lands hours later. Otherwise training sees fresher values than serving.']
    ],
    quiz: [
      ['A ranking call scores 400 candidates with 25 item features each, plus 30 features about the user. At 2,000 calls a second, how many feature values does the store serve?', ['10,030 per call; about 20 million a second', '55 per call; about 110,000 a second', '22,000 per call; about 44 million a second', '400 per call; about 800,000 a second'], '400 × 25 + 30 = 10,030 values a call × 2,000 = about 20M a second. 55 forgets to multiply by the candidates; 22,000 fetches the user\'s features once per candidate; 400 counts entities, not features. Size the store in lookups, not calls.', 'calc'],
      ['A daily job lands "merchant chargebacks, last 30 days" in the online store at 06:00, covering data up to midnight. The training backfill computes it as of each transaction\'s exact timestamp. What goes wrong?', ['Training sees fresher values than serving ever does', 'Nothing, since point-in-time joins remove the skew', 'Serving sees fresher values than training ever did', 'The backfill fails, as batch features have no timestamps'], 'Online, the value is 6 to 30 hours behind: up to midnight once the job lands, a day older before 06:00. The backfill hands the model data right up to each transaction, which it never gets in production. Stripe added support for modelling batch delay in training data for this reason; Chronon\'s SNAPSHOT mode computes such features as of midnight. Point-in-time joins stop leaks from the future, not this lag.', ['stripe-shepherd', 'chronon-groupby']],
      ['A fraud model needs "charges for this merchant in the last 10 minutes", fresh within 1 s and read in under 10 ms. Busy merchants have 50,000 charges in a window. How should the streaming job store it?', ['As pre-aggregated tiles that a lookup sums in a few reads', 'As raw events, summed by the feature server per lookup', 'As one count, rebuilt hourly by a job in the warehouse', 'As a query the model server runs on the payments DB'], 'Stripe found that storing individual events made features with many events too slow to serve, so its Flink job keeps pre-aggregated tiles and a lookup sums a few of them. Raw events mean reading 50,000 rows per lookup; an hourly job breaks the 1 s freshness; querying the payments database puts a scan in the payment path.', ['stripe-shepherd']],
      ['Team A owns the shared feature user_7d_orders and changes it in place to exclude cancelled orders. Team B\'s model, trained on the old definition, keeps serving. What happens?', ['B gets values it was not trained on and degrades with no error', 'B is retrained automatically, since the registry tracks consumers', 'B keeps the old values, since the registry pins each model to a version', 'B\'s requests fail, since the feature\'s schema no longer matches'], 'The name and type are unchanged, so nothing fails, but once the job rewrites the values B\'s model reads a different meaning: training-serving skew caused by another team. An in-place change creates no new version for anything to pin. Ship the change as a new version that consumers adopt and retrain on. LinkedIn described testing upgraded versions of shared features against dependent models as planned work in 2022, not something registries do for you.', ['linkedin-feathr']],
      ['Feature serving has 30 ms. One call needs features for 300 entities from a store 0.5 ms away per round trip, and the client sends one GET per entity, one after another. About how long goes on round trips, and what fixes it?', ['About 150 ms; send the keys in a few batched calls', 'About 0.5 ms; the GETs travel over a single connection', 'About 15 ms; the store holds the hot keys in memory', 'About 150 ms; add replicas to shorten each round trip'], '300 × 0.5 ms = 150 ms, five times the budget, before the store does any work. Sequential requests are limited by the round trip, not by the server; pipelining or a multi-key call pays it once per batch. Replicas add capacity, but each round trip is as long as before. Dropbox described one search fanning out into thousands of lookups.', ['redis-pipelining', 'dropbox-dash-feature-store']]
    ],
    explain: ['Design a feature platform shared by dozens of ML teams.', ['Definitions as code with owners, SLAs and a registry for discovery', 'One definition compiled to batch backfills and streaming updates, point-in-time correct', 'Online store and serving API sized for M entities × N features per call', 'Freshness per feature: precompute vs compute at request, tiles, batch delay', 'Multi-team concerns: versioning, consistency monitoring, cost of the online copy']],
    duck: ['Why can\'t every team just compute its own features?', 'The model asks about one user. Why does the store see thousands of reads?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Prompt: "Design a feature platform for all our ML teams." Pick the four questions most worth asking.', want: 4, options: [
        ['How many teams and models will use it, and how many features each?', true, 'Sizes the registry, the pipelines and the online store.'],
        ['What serving latency, and how many entities per request?', true, 'The fan-out sets the serving tier and the store layout.'],
        ['How fresh must features be: seconds, minutes or a day?', true, 'Decides which features need a streaming path.'],
        ['Must training sets be rebuilt for past dates from definitions?', true, 'Point-in-time backfills shape the offline engine.'],
        ['Should the online store be Redis or DynamoDB?', false, 'Your choice, made from the latency and size numbers.'],
        ['Should feature code be written in Python or Scala?', false, 'Does not change the architecture.'],
        ['Can the platform run on our Kubernetes cluster?', false, 'Deployment detail, not a requirement.'],
        ['Which team will build the registry\'s web interface?', false, 'Staffing, not design.']
      ] },
      { type: 'estimate', brief: 'Given: the online store holds 100M users × 200 features and 50M items × 100 features, at 12 bytes per value, with 2 replicas. Ranking: 2,500 calls a second, each scoring 500 candidates × 30 item features, plus 50 user features. A batch job rewrites 400M rows in 80 minutes, and 3% of values change between runs.', fixed: [
        { q: 'Online store size including replicas, in GB?', a: 600, unit: 'GB', tol: 0.05, how: '(100M × 200 + 50M × 100) = 25 billion values × 12 bytes = 300 GB × 2 replicas = 600 GB.' },
        { q: 'Feature values per ranking call?', a: 15050, unit: 'values', tol: 0.02, how: '500 × 30 + 50 = 15,050.' },
        { q: 'Feature values served per second, in millions?', a: 37.6, unit: 'M values/s', tol: 0.05, how: '15,050 × 2,500 ≈ 37.6M a second. Sized per call this looks like 2,500 req/s; per lookup it is a large key-value cluster.' },
        { q: 'If the job writes only changed values, at the same rows per minute, how many minutes does a run take?', a: 2.4, unit: 'minutes', tol: 0.05, how: '400M × 3% = 12M rows. 80 minutes × 0.03 = 2.4 minutes. Dropbox reported the same move: only 1–5% of values changed per 15 minutes, and runs fell from over an hour to under five minutes.' }
      ] },
      { type: 'sort', brief: 'Which alert catches this?', buckets: ['Freshness SLA', 'Online-offline consistency', 'Serving latency'], items: [
        ['The streaming job\'s consumer lag has grown to 40 minutes', 0], ['Last night\'s batch load to the online store never ran', 0], ['A "last hour" count was last updated 3 hours ago', 0],
        ['Values served online differ from the backfill for the same key and time', 1], ['The streaming code counts cancelled orders; the batch code does not', 1], ['A feature averages 30% higher online than the backfill computes for the same requests', 1],
        ['A ranking call now makes one round trip per candidate', 2], ['p99 lookup time doubles after a store node fails', 2], ['One very popular account\'s keys overload a single shard', 2], ['A new model asks for 400 features per candidate in each call', 2]
      ] },
      { type: 'diagram', brief: 'Draw serving and freshness at the peak: 2,500 ranking calls a second, each reading 15,050 feature values from the online store, and 5,000 product events a second that a streaming job turns into fresh features for both stores.',
        labels: { lb: 'Load balancer', app: 'Product service', ranker: 'Model service', features: 'Online store (key-value)', queue: 'Event stream', worker: 'Streaming job (Flink)', warehouse: 'Offline store (warehouse)' },
        required: ['client', 'lb', 'app', 'ranker', 'features', 'queue', 'worker', 'warehouse'],
        edges: [['client', 'lb'], ['lb', 'app'], ['app', 'ranker'], ['ranker', 'features'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'features'], ['worker', 'warehouse']],
        layout: { client: [10, 120], lb: [160, 120], app: [310, 120], ranker: [460, 40], features: [620, 180], queue: [310, 300], worker: [460, 300], warehouse: [620, 372] },
        why: {
          lb: 'Spreads page requests and event posts over the product service fleet.',
          app: 'Handles the user\'s request: asks the model service to rank 500 candidates, and puts each event on the stream without waiting for any feature to be computed.',
          ranker: 'Scores the 500 candidates. It fetches their features from the online store in a few batched calls, not one round trip per value.',
          features: 'The latest value of every feature by entity key, read in a few milliseconds. Sized per lookup: 15,050 values a call, about 37.6M a second.',
          queue: 'Events are acknowledged at once and processed later, so computing features never slows the request that produced the event.',
          worker: 'Runs the reviewed feature definitions over the stream: updates pre-aggregated tiles in the online store and writes the same values to the offline store.',
          warehouse: 'History for training. The batch job backfills the same definitions here, point in time, so training sees what serving saw. Far too slow to read per request.'
        },
        decoys: {
          cdn: 'Each lookup is for one user and a particular set of candidates. Nothing is shared at the edge.',
          search: 'Features are read by entity key, never searched by text.',
          index: 'Choosing the candidates is the caller\'s job. The platform is handed 500 of them to fetch features for.'
        },
        sim: {
          load: '2,500 ranking calls a second, from your estimate, each reading 15,050 feature values in a few batched calls, and 5,000 product events a second (an assumption for this exercise). A batched read from the online store takes a few milliseconds; a query on the warehouse takes about 150 ms, and far longer under load.',
          scale: 10,
          goals: { errors: 1, p99: 100 },
          flows: [
            { label: 'Ranking calls', rps: 2500, needs: ['ranker', 'features'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'ranker'], ['ranker', 'features'], ['ranker', 'warehouse', { instead: 'features' }], ['app', 'features']] },
            { label: 'Product events', rps: 5000, needs: ['worker', 'features', 'warehouse'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'queue'], ['app', 'worker', { instead: 'queue' }], ['app', 'features', { instead: ['queue', 'worker'] }], ['app', 'warehouse', { instead: ['queue', 'worker'] }], ['queue', 'worker'], ['worker', 'features'], ['worker', 'warehouse']] }
          ],
          parts: {
            app: { cfg: { instances: 6, capacity: 8, serviceMs: 4, serviceCv: 0.5, queueLimit: 64 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of it spreads the requests over the fleet, so every user reaches the same server.', fullWhy: 'A request holds its slot until everything it called has answered. Is a feature being computed or written while the user waits?' },
            ranker: { cfg: { instances: 8, capacity: 8, serviceMs: 25, serviceCv: 0.5, queueLimit: 64 }, fullWhy: 'A ranking call holds a slot until its features arrive, so a slow store makes every call slow.' },
            features: { cfg: { capacity: 64, serviceMs: 3, serviceCv: 0.4, queueLimit: 256 } },
            queue: { cfg: { queueLimit: 20000 } },
            worker: { cfg: { instances: 8, capacity: 16, serviceMs: 10, serviceCv: 0.5 }, fullWhy: 'The job holds a slot until both stores have taken the update.' },
            warehouse: { cfg: { capacity: 128, serviceMs: 150, serviceCv: 0.7, queueLimit: 512, lockMs: 0 }, fullWhy: 'A warehouse is built for large scans, not for thousands of small lookups a second inside a 100 ms budget. Request-time reads belong in the online store.' }
          },
          needWhy: {
            ranker: 'Nothing scores the candidates.',
            features: 'The model needs current features from a store that answers in milliseconds, and the streaming job has to keep that store fresh.',
            worker: 'Something has to run the feature definitions over the events, or the stored features never change.',
            warehouse: 'Training sets are built from the offline store. If the same values never reach it, training and serving drift apart.'
          },
          bad: { 'client>features': 'Clients never read the online store directly.', 'client>ranker': 'The product service calls the model. Clients never do.', 'client>queue': 'Clients do not publish to your internal stream. The product service does, after checking the request.', 'client>warehouse': 'Clients never touch the offline store.', 'lb>features': 'A load balancer forwards requests to servers. It does not read features.', 'queue>features': 'A stream holds raw events. The streaming job has to aggregate them into features: draw it between the two.', 'queue>warehouse': 'A stream holds raw events. The streaming job has to compute the same features for the offline store: draw it between the two.' },
          ok: [['warehouse', 'features']],
          traps: [
            { name: 'features read from the warehouse at request time', cut: [['ranker', 'features']], wire: [['ranker', 'warehouse']] },
            { name: 'features computed and written inside the event request', drop: ['queue'], wire: [['app', 'worker']] },
            { name: 'the product service writes the online store itself, with no stream', drop: ['queue', 'worker'], wire: [['app', 'features']] },
            { name: 'event stream drawn but nothing reads from it', drop: ['worker'] },
            { name: 'streaming job never writes the offline store', cut: [['worker', 'warehouse']] },
            { name: 'no load balancer in front of the fleet', drop: ['lb'], wire: [['client', 'app']] }
          ]
        } }
    ] }
  });

  T({
    id: '7.8', mod: '7', title: 'LLM serving infrastructure', tag: 'A multi-tenant gateway over GPU pools',
    analogy: 'An airport taxi rank with a dispatcher. Each car carries several passengers at once, a fare goes to the car that already knows the route unless that car has a long line, account customers board before walk-ups, and a new car takes the best part of an hour to arrive from the depot, so the rank keeps spares waiting.',
    points: [
      'Requirements are in tokens, not requests: input and output tokens per minute for each model and tenant, with time to first token and time per output token as separate SLOs. Output is the expensive side: Databricks measured (2023) that 512 more input tokens added less latency than 8 more output tokens.',
      'API and limits: an OpenAI-style endpoint that names the model and streams tokens over SSE. Each tenant has token buckets for requests, input tokens and output tokens. Anthropic counts only uncached input against its input limit, so 2M input tokens a minute at an 80% cache hit rate carries 10M.',
      'High-level design: gateway (authentication, quotas, priority) → router → one pool of engine replicas per model, each running continuous batching. A replica\'s concurrency is its KV-cache budget in tokens, not a request count: in Hugging Face TGI a 1,000-token budget holds ten 100-token requests or one 1,000-token request.',
      'Routing: by model name first, then to the replica that already caches the prompt prefix while queues are even, and by load once they are not. Ray Serve\'s prefix-aware router falls back to power of two choices when queue lengths differ by more than a threshold.',
      'Scaling and overload: scale each pool on waiting requests or KV-cache usage. A new large-model replica takes minutes (AWS measured 5.1–6.8 minutes end to end for Llama 3.1 70B on SageMaker in 2024, including starting a new instance), so a spike is absorbed by headroom and priority: chat before latency-tolerant work such as summarisation and batch jobs, which are deferred or shed.',
      'Failure modes: a very long prompt stalls every stream on its replica unless prefills are chunked between decode steps; a client that disconnects must cancel its generation so its KV cache is freed (vLLM\'s API server can abort a request when its client disconnects, and finishing a request frees its KV blocks); prefix caches must never be shared between tenants (Anthropic isolates them per organisation, and per workspace on its own API).'
    ],
    pitfall: 'Treating the autoscaler as the overload plan. A replica that must pull and load over a hundred gigabytes of weights arrives minutes after the spike, so until then every tenant\'s latency degrades together. Keep headroom running and decide in advance which traffic is deferred first.',
    say: 'A gateway enforces per-tenant input and output token buckets and routes by model, prefix affinity and load to vLLM pools. I size each pool on output tokens per second at the time-per-token SLO with about 30% headroom, because a new 70B replica takes around six minutes, and under overload I defer the batch and summarisation tiers first.',
    refs: [
      ['databricks-llm-inference', 'Output costs more than input — “The addition of 512 input tokens increases latency less than the production of 8 additional output tokens in the MPT models.”'],
      ['anthropic-rate-limits', 'Cache-aware input limits — “Example: With a 2,000,000 ITPM limit and an 80 percent cache hit rate, you could effectively process 10,000,000 total input tokens per minute (2M uncached + 8M cached), because cached tokens don’t count toward your rate limit.”'],
      ['tgi-launcher', 'Concurrency is a token budget — “For `max_batch_total_tokens=1000`, you could fit `10` queries of `total_tokens=100` or a single query of `1000` tokens.”'],
      ['rayserve-prefix-routing', 'Load beats cache affinity — “When load is imbalanced (queue length difference exceeds threshold), the router prioritizes load balancing over cache locality and falls back to the standard Power of Two Choices algorithm.”'],
      ['gateway-api-inference-ext', 'Priority between workloads — “For example, you can specify that your models for online inference of chat tasks (which is more latency sensitive) have a higher priority than a model for latency tolerant tasks such as a summarization.”'],
      ['kserve-llm-autoscaling', 'Scale on LLM signals — “allowing applications to scale based on external metrics such as vLLM metrics for the number of waiting requests or KV Cache usage.”'],
      ['aws-fast-model-loader', 'End-to-end scaling takes minutes — “When using CUDA Graphs, the average scaling time was reduced from 407 seconds (6.78 minutes) to 334.6 seconds (5.58 minutes), marking a substantial 21.64% improvement. Similarly, without CUDA Graphs, the average scaling time decreased from 379 seconds (6.32 minutes) to 306 seconds (5.10 minutes), resulting in a 19.26% reduction.”'],
      ['aws-fast-model-loader', 'The test adds an instance — “For this scenario, we illustrate scaling the model by adding a new instance.”'],
      ['sarathi-serve', 'Chunked prefills — “Sarathi-Serve introduces chunked-prefills which splits a prefill request into near equal sized chunks and creates stall-free schedules that adds new requests in a batch without pausing ongoing decodes.”'],
      ['vllm-api-utils', 'Cancel on disconnect — “Decorator that allows a route handler to be cancelled by client disconnections.”'],
      ['vllm-scheduler', 'Disconnect aborts the request — “Handles the finish signal from outside the scheduler. For example, the API server can abort a request when the client disconnects.”'],
      ['vllm-scheduler', 'Finishing frees the KV cache — “Free the request\'s KV blocks, deferring the return to the block pool when an in-flight GPU step may still write them.”'],
      ['anthropic-prompt-caching', 'No cache sharing between tenants — “Caches are isolated between organizations. Different organizations never share caches, even if they use identical prompts. Caches are also isolated by workspace within an organization on the Claude API, Claude Platform on AWS, and Microsoft Foundry”']
    ],
    cards: [
      ['Why plan an LLM fleet in output tokens per second rather than requests per second?', 'Requests range from tens to tens of thousands of tokens, and output tokens dominate latency and capacity: each one is a sequential decode step, while input tokens are processed together in prefill. Size each pool on output tokens per second at the time-per-token SLO, with headroom.'],
      ['What limits how many requests one engine replica runs at once?', 'Its KV-cache budget in tokens: the GPU memory left after the weights, shared by every running sequence\'s prompt and output so far. Ten short requests or one long one can fill the same budget, and when it is full new requests wait.'],
      ['How should a router trade prefix-cache affinity against load?', 'Prefer the replica that already holds the prompt prefix while queues are roughly even, since a hit skips most of the prefill. Once one replica\'s queue is much longer, route by load (for example, power of two choices) and let another replica build the cache.']
    ],
    quiz: [
      ['A chat product peaks at 40 requests/s, averaging 2,000 input and 500 output tokens. One replica sustains 2,500 output tokens/s on this traffic mix within the time-per-token SLO, and replicas should run at most 70% busy. How many replicas?', ['12 replicas', '8 replicas', '11 replicas', '58 replicas'], '40 × 500 = 20,000 output tokens/s. At 70% a replica gives 1,750, and 20,000 ÷ 1,750 = 11.4, so 12. Eight is the same sum with no headroom; 11 comes from adding 30% to 8 instead of dividing by 0.7; 58 charges the 2,000 input tokens against output capacity as if prefill cost as much as decoding.', 'calc'],
      ['A launch doubles traffic to a 70B-model pool within two minutes. Interactive chat and a summarisation backfill share the pool. The autoscaler adds replicas on queue depth, and a new replica needs about six minutes to serve. What protects chat during those minutes?', ['Headroom that is already running, and deferring the backfill first', 'The autoscaler, since queue-depth scaling reacts within seconds', 'Doubling the maximum batch size, so each replica takes twice the load', 'Scaling on GPU utilisation instead, so replicas are requested sooner'], 'Reacting quickly does not help when the replica it starts needs minutes: AWS measured 5.1–6.8 minutes of end-to-end scaling time for Llama 3.1 70B. Until it arrives, only running capacity and priority admission (chat ahead of latency-tolerant summarisation) protect the SLO. Batch size is capped by the KV-cache token budget, so a replica cannot simply hold twice the sequences, and a different scaling signal does not shorten the load.', ['aws-fast-model-loader', 'gateway-api-inference-ext', 'tgi-launcher']],
      ['A router sends every request carrying tenant A\'s 8,000-token system prompt to replica 3, where that prefix is cached. Tenant A, within its quota, triples its traffic: replica 3 has 40 requests queued and clears about 2 a second; the others have 2 each and clear them at the same rate. Prefilling that prefix uncached takes about 1 s. Where should A\'s next request go?', ['A lightly loaded replica; one prefill there costs less than the queue', 'Replica 3, since a cache hit there skips the whole 8,000-token prefill', 'None yet: return 429 to tenant A until replica 3\'s queue drains', 'Any replica, after copying replica 3\'s KV cache to all of them'], 'A cache hit saves one prefill of about 1 s; waiting behind 40 requests at about 2 a second costs about 20 s, and the other replica will then hold the prefix itself. Ray Serve\'s prefix-aware router uses affinity only while queue lengths are within a threshold, and otherwise falls back to power of two choices. A 429 punishes a tenant that is inside its quota for the router\'s placement, and copying cache state on every request spends GPU memory on duplicates.', ['rayserve-prefix-routing']],
      ['Users streaming answers from a vLLM-style server report pauses of several seconds mid-answer whenever someone submits a 100,000-token document. Overall throughput looks fine. What is happening, and what helps?', ['The long prefill runs while decodes wait; chunk prefills between decode steps', 'The KV cache is full; add GPUs so the long document fits beside the other requests', 'Tokenising the document is slow; move tokenisation out to the gateway', 'The network buffers the stream; send the SSE events in larger groups'], 'A scheduler that admits new work eagerly runs the whole prompt\'s prefill in one step, and every ongoing decode waits for it: a generation stall. Chunked prefill splits the prompt into pieces that share each step with the decodes, so streams keep moving. A full KV cache would show as queued requests rather than pauses tied to one long arrival, and tokenisation and network buffering do not scale with the GPU work of a 100,000-token prompt.', ['sarathi-serve']],
      ['A user closes the tab 2 s into a streamed answer that would run to 2,000 tokens. The gateway closes its connection to the browser but leaves its upstream request to the engine open. What does that cost?', ['The engine decodes the rest, holding a batch slot and KV cache', 'Nothing, since the engine sees the browser\'s socket close itself', 'Just bandwidth, since the gateway drops the tokens it receives', 'A short pause, since the engine parks the sequence until reconnect'], 'vLLM cancels a request\'s handler and can abort the request, freeing its KV blocks, when its own HTTP client disconnects; its client here is the gateway, which is still connected. The sequence keeps decoding and keeps its tokens in the replica\'s fixed KV-cache budget, so each abandoned stream crowds out a waiting one. The gateway must propagate the disconnect upstream.', ['vllm-api-utils', 'vllm-scheduler', 'tgi-launcher']]
    ],
    explain: ['Walk through your design for a multi-model, multi-tenant LLM serving platform, from the API to overload.', ['Requirements in tokens: input vs output, with TTFT and time-per-token SLOs', 'Gateway with per-tenant token buckets and priority classes; streaming over SSE', 'Per-model pools with continuous batching, where the KV-cache budget limits concurrency', 'Routing by model, prefix affinity and load; autoscaling on queue or KV usage, with headroom for slow cold starts', 'Overload and failures: defer latency-tolerant work first, chunk long prefills, cancel on disconnect, isolate caches per tenant']],
    duck: ['If one GPU can run the model, why not give every customer their own GPU?', 'Why can\'t the autoscaler just add replicas when a traffic spike arrives?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['What are peak input and output tokens per minute, for each model?', true, 'Capacity, cost and rate limits are all counted in tokens, and output tokens cost the most.'],
        ['What time to first token and time per token does each product need?', true, 'Two separate SLOs, and they pull batch size in opposite directions.'],
        ['Which traffic can wait minutes or hours, such as offline batch jobs?', true, 'Latency-tolerant work is what you defer or shed when a spike arrives.'],
        ['How many tenants are there, and does any need reserved capacity?', true, 'Decides quotas, isolation, and whether some capacity is held back.'],
        ['Should the gateway itself be written in Go, Rust or Python?', false, 'An implementation detail that does not change the architecture.'],
        ['Which Kubernetes distribution does the platform team run today?', false, 'Deployment tooling, not a requirement.'],
        ['Should we pick vLLM or TGI as the inference engine for every model?', false, 'Your decision, made later from the requirements.'],
        ['Will the admin dashboard show charts of requests per second?', false, 'Requests are the wrong unit, and dashboards come later.']
      ] },
      { type: 'estimate', brief: 'Given: peak 30 requests/s · 1,500 input tokens per request, 60% of them a cached prefix · 400 output tokens per request · one replica sustains 2,000 output tokens/s within the SLO · replicas at most 70% busy · weights 140 GB, read at 2 GB/s.', fixed: [
        { q: 'Output tokens per second at peak?', a: 12000, unit: 'tokens/s', tol: 0.05, how: '30 × 400 = 12,000 tokens/s. This, not requests per second, sizes the pool.' },
        { q: 'Replicas needed to stay at or below 70% busy?', a: 9, unit: 'replicas', tol: 0, how: '2,000 × 0.7 = 1,400 tokens/s per replica; 12,000 ÷ 1,400 = 8.6, so 9.' },
        { q: 'Uncached input tokens per minute counted against a cache-aware input limit, in millions?', a: 1.08, unit: 'M tokens/min', tol: 0.05, how: '30 × 60 × 1,500 = 2.7M input tokens a minute; 40% uncached = 1.08M. Without the cache it would count 2.7M.' },
        { q: 'Seconds just to read the weights into a new replica?', a: 70, unit: 'seconds', tol: 0.1, how: '140 GB ÷ 2 GB/s = 70 s, before image pull, sharding and warm-up. Measured end-to-end scaling for a 70B model was over five minutes.' }
      ] },
      { type: 'order', brief: 'Order the path of one streamed chat request.', items: [
        'Authenticate the API key and resolve the tenant and model',
        'Charge the tenant\'s request and input-token buckets, or return 429',
        'Choose a replica in that model\'s pool by prefix match and queue length',
        'Admit the request when KV-cache space is free and run its prefill',
        'Stream tokens over SSE, charging output tokens as they are produced',
        'On completion or client disconnect, free the KV cache and record usage'
      ] },
      { type: 'diagram', brief: 'Draw the serving platform for 30 chat requests a second at peak, each streaming about 400 tokens, plus batch jobs that submit another 36 prompts a second.',
        labels: { gateway: 'API gateway (tenant limits)', app: 'Router', ranker: 'Model replicas (GPU)', cache: 'Usage buffer', ledger: 'Usage ledger', queue: 'Batch queue', worker: 'Batch pool (GPU)', blob: 'Batch results (object storage)' },
        required: ['client', 'gateway', 'app', 'ranker', 'cache', 'ledger', 'queue', 'worker', 'blob'],
        edges: [['client', 'gateway'], ['gateway', 'app'], ['app', 'ranker'], ['app', 'cache'], ['cache', 'ledger'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'blob']],
        layout: { client: [10, 160], gateway: [150, 160], app: [300, 160], ranker: [470, 40], cache: [470, 160], ledger: [630, 160], queue: [470, 290], worker: [630, 290], blob: [630, 378] },
        why: { gateway: 'Checks each API key and charges the tenant\'s request and token buckets before anything reaches a GPU, so one tenant\'s burst gets a 429 instead of slowing everyone.', app: 'Picks a replica in the right model\'s pool: the one that already caches the prompt prefix while queues are even, the least loaded one when they are not. Batch work goes to the queue instead.', ranker: 'The interactive pool. Each answer holds KV-cache memory for its whole stream, so a replica runs only about 40 streams at once.', cache: 'Counts input and output tokens as they stream and writes them to the ledger in batches, so billing never holds a stream open.', ledger: 'The durable record of tokens used by each tenant, which invoices and usage reports are built from.', queue: 'Holds batch prompts until the batch pool is free, so bulk work waits its turn instead of taking slots from chat.', worker: 'GPUs of their own that pull batch prompts at their own pace and run large batches, because nobody is watching these answers stream.', blob: 'Batch answers are written to a results file that the tenant downloads when the job is done.' },
        decoys: { cdn: 'Every answer is generated for one prompt, so there is nothing shared to serve from the edge.', ws: 'Tokens stream back as server-sent events on the same HTTP request. A separate WebSocket fleet adds nothing.', index: 'Retrieval belongs to the applications that call the API. This platform serves models.' },
        sim: {
          load: '30 chat requests a second, the peak from the estimate, each streaming about 400 tokens for some 8 seconds, plus batch jobs submitting 36 prompts a second. A GPU replica holds about 40 streams in its KV cache, so it finishes about 5 answers a second: the 2,000 tokens a second of the estimate.',
          timeoutMs: 30000, warmupS: 30, windowS: 60,
          goals: { errors: 1, p99: 20000 },
          flows: [
            { label: 'Chat requests', rps: 30, needs: ['app', 'ranker', 'ledger'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['app', 'ranker'], ['app', 'queue', { instead: 'ranker' }], ['queue', 'worker'], ['app', 'cache'], ['gateway', 'cache'], ['cache', 'ledger'], ['app', 'ledger', { instead: 'cache' }], ['gateway', 'ledger', { instead: 'cache' }]] },
            { label: 'Batch prompts', rps: 36, needs: ['worker', 'blob'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'queue'], ['gateway', 'app', { instead: 'queue' }], ['app', 'queue'], ['app', 'ranker', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'blob'], ['worker', 'cache'], ['cache', 'ledger']] }
          ],
          parts: {
            gateway: { cfg: { capacity: 256, serviceMs: 2, queueLimit: 1024, rateLimitRps: 200, burst: 200, authFailRate: 0 } },
            app: { cfg: { instances: 4, capacity: 128, serviceMs: 3, serviceCv: 0.5, queueLimit: 256 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of it spreads tenants over the routers or holds back a tenant over its budget, so every stream lands on one router.', fullWhy: 'A router holds a slot for as long as the answer streams through it.' },
            ranker: { cfg: { instances: 9, capacity: 40, serviceMs: 8000, serviceCv: 0.3, queueLimit: 16 }, fullWhy: 'Each answer holds KV-cache space for its whole 8-second stream, so nine replicas finish about 45 answers a second. Chat alone uses two thirds of that.' },
            cache: { kind: 'writebehind', cfg: { capacity: 256, serviceMs: 1, queueLimit: 2048, flushDelayMs: 2000 } },
            ledger: { cfg: { capacity: 8, serviceMs: 15, serviceCv: 0.6, queueLimit: 128, lockMs: 0 } },
            queue: { cfg: { queueLimit: 20000 } },
            worker: { cfg: { instances: 6, capacity: 96, serviceMs: 12000, serviceCv: 0.3 }, fullWhy: 'The batch pool finishes about 48 prompts a second. Anything more has to wait in the queue.' },
            blob: { cfg: { capacity: 64, serviceMs: 40, serviceCv: 0.4, queueLimit: 1024, prefixRps: 0 } }
          },
          needWhy: { app: 'Something has to pick a replica by model, cached prefix and queue length; without it requests land on replicas that are already full.', ranker: 'Chat has to stream from GPUs that answer while the user watches.', ledger: 'Without a record of the tokens each tenant used, nobody can be billed or shown their usage.', worker: 'Batch prompts need GPUs of their own, fed from the queue; otherwise they take KV-cache slots from chat.', blob: 'A batch job\'s answers are collected into a results file that the tenant fetches later.' },
          bad: { 'client>ranker': 'Clients never reach a GPU replica directly: nothing would check their key or charge their token budget.', 'client>queue': 'Tenants submit batch jobs through the API, which checks their key and quota before anything is queued.', 'client>ledger': 'Clients never write usage records. The platform counts the tokens it served.', 'gateway>ranker': 'The gateway checks keys and budgets. Choosing a replica by model, cached prefix and queue length is the router\'s job.', 'queue>ranker': 'A queue holds work until something pulls it. The interactive replicas do not pull work; the batch pool does, so batch work never takes their slots.', 'queue>blob': 'A queue holds prompts. Something has to run them and write the answers: draw the batch pool between the two.', 'ranker>ledger': 'A replica generates tokens. Counting them per tenant happens on the way back, in the router or gateway.' },
          traps: [
            { name: 'batch prompts sent straight to the interactive replicas', drop: ['queue', 'worker'] },
            { name: 'no gateway: clients call the router directly', drop: ['gateway'], wire: [['client', 'app']] },
            { name: 'batch queue drawn but nothing reads from it', drop: ['worker'] },
            { name: 'chat requests queued with the batch work', cut: [['app', 'ranker']] }
          ]
        } }
    ] }
  });

  T({
    id: '7.9', mod: '7', title: 'Personalised notification system', tag: 'Decide, cap, time, then deliver',
    analogy: 'A good personal assistant screening your post. A call from the bank about fraud interrupts you at once; low-value letters are bundled into a weekly pile or binned; nothing arrives during dinner. The assistant keeps count, because every interruption spends some of your patience, and patience lost does not come back.',
    points: [
      'Requirements: all teams\' notifications go through one decision point that owns each user\'s portfolio rather than each event. LinkedIn built Air Traffic Controller for this (2018); it handled over a billion requests a day and halved member complaints. Traffic splits into classes: a daily digest of about 100 million requests can take hours, member messages need under a second.',
      'API and data: producers submit candidates (recipient, type, payload, dedupe key, priority, expiry). Per-user state (past sends, settings, devices and tokens, preferred hours) lives with the decision service, partitioned by user ID so lookups stay local; LinkedIn reported a couple of milliseconds from embedded RocksDB against 10–100 ms for remote calls.',
      'The send decision weighs value against harm: predict the chance the user acts and the chance they disable notifications, then drop, send in-app only, or also push. A model that predicts only clicks sends almost everything, because fatigue costs arrive later. Per-user budgets, aggregation into digests and send-time choice spend the remaining volume well.',
      'Delivery runs through APNs and FCM, each with its own rules: priority (APNs 10 = now, 5 = when power allows), an expiry, a collapse ID of at most 64 bytes, and an APNs offline store that keeps one notification per app. FCM\'s default quota is 600,000 messages a minute per project, so a 30-million-device broadcast takes at least 50 minutes.',
      'Reliability: a queue per priority so that a login code never waits behind a campaign; idempotent processing, because a restarted stream job replays requests (ATC drops any it has already processed); stop sending to tokens that return 410 Unregistered. A 200 from APNs means accepted, not seen.',
      'Measure with long-lived holdouts, since disables and unsubscribes appear weeks later. A holdout also keeps checking a learned policy after launch: Duolingo (KDD 2020) added one five months after launching its notification bandit, picking the reminder template at random in 5% of rounds, and found the bandit\'s rounds 2.5% ahead on engagement.'
    ],
    pitfall: 'Optimising on click-through alone. Each extra send adds a few clicks this week, while the disables and unsubscribes it causes arrive later and remove the channel for good. Without a harm term in the score and a holdout that runs for weeks, every test says "send more".',
    say: 'Producers send candidates to one decision service partitioned by user, which scores the chance of a tap against the chance of a disable, enforces a per-user budget and picks the hour. Survivors go to per-channel senders on separate priority queues, paced under FCM\'s 600k-a-minute quota, and I judge it against a holdout kept for months because disables show up late.',
    refs: [
      ['linkedin-atc', 'Score both outcomes — “ATC scores the notification based on the recipient member’s historical notifications and historical actions to predict the likelihood that this member will act on or disable the notification.”'],
      ['linkedin-atc', 'Two traffic classes — “For the Daily Rundown, we’ll spread the requests over a range of time using aggregation and delivery time optimization. For messaging, we use high-priority Kafka topics to prioritize member messages.”'],
      ['linkedin-atc', 'Replays after a restart — “ATC handles the duplicated requests by dropping any request it has already processed, but is okay if the requests are sent slightly out of order.”'],
      ['twitter-notif-ltv', 'Why click models over-send — “However, a myopic system will always choose to send a notification since negative effects occur in the future.”'],
      ['duolingo-notif-bandit', 'Arms are templates, reward is engagement — “In our setting, the arms represent different notification templates and the rewards are successful user engagements.”'],
      ['duolingo-notif-bandit', 'Holdout added after launch — “5 months after launching the algorithm, we added a provision that, for a small percentage of rounds (5 %), the arm is selected using the random uniform distribution instead of the bandit’s learned policy.”'],
      ['duolingo-notif-bandit', 'The bandit against the holdout — “The 95 % of rounds that used the bandit’s optimized policy had 2.5 % higher reward than the holdout set”'],
      ['apns-sending', 'One stored notification per app — “APNs stores only one notification per bundle ID. When you send multiple notifications to the same device for a bundle ID, APNs selects only one notification to store.”'],
      ['apns-sending', 'Best effort — “Your notifications may also get throttled, saved in storage, and in some cases, not delivered.”'],
      ['apns-responses', 'One answer per request — “Apple Push Notification service (APNs) provides a response to each POST request your server transmits.”'],
      ['apns-responses', 'Dead tokens — “The device token is inactive for the specified topic. There is no need to send further pushes to the same device token”'],
      ['fcm-throttling', 'Project quota — “The default quota of 600k messages per minute covers over 99% of FCM developers while protecting the stability of the system and minimizing the impact of spiky projects.”'],
      ['fcm-delivery', 'Receipt is partly visible — “Received (available only on Android devices) — The data message or notification message has been received by the app.”']
    ],
    cards: [
      ['What does a central notification decision service decide that individual product teams cannot?', 'Whether, when and on which channel each candidate reaches a user, given everything else that user is getting. It holds per-user history, budget and settings, scores act against disable, drops, delays or aggregates, then hands the survivors to channel senders.'],
      ['What can a server know about delivery of a push notification?', 'Only that APNs or FCM accepted the request. APNs is best effort: it may store, throttle, reorder or drop a push; FCM also throttles and stores, and can discard messages. For an offline iPhone APNs stores only one notification per app. Receipt needs a signal from the app, and opens are the dependable metric.'],
      ['Why does a notification system need a long-lived holdout?', 'The harms (disables, unsubscribes, fatigue) show up weeks after the sends that caused them, so short tests reward sending more. A small group kept on a baseline policy for months measures the cumulative effect.']
    ],
    quiz: [
      ['A breaking-news push must reach 45 million Android devices, one FCM message per device token, on a project with FCM\'s default HTTP v1 quota of 600,000 messages a minute per project and no increase. What is the shortest time the send can take?', ['About 75 minutes', 'About 75 seconds', 'About 12.5 hours', 'Under a minute'], 'The default quota is 600,000 messages a minute per project: 45,000,000 ÷ 600,000 = 75 minutes. 75 s reads the quota as per second; 12.5 hours drops a zero (60,000 a minute); under a minute mistakes the per-device rate cap for the only limit. Over quota FCM returns 429 until the next minute, so a broadcast is paced and ordered, or more quota is requested before a launch.', ['fcm-throttling']],
      ['Login codes and a 100-million-recipient marketing campaign share one FIFO send queue. During the campaign the queue holds 40 minutes of work, and codes expire after 10. The senders already run at the push provider\'s per-project quota. What fixes the codes?', ['A separate high-priority queue for codes, which the senders drain first', 'Set apns-priority to 10 on the codes so that APNs sends them at once', 'Send each code by SMS and by email as well as by push, in parallel', 'Autoscale the senders on queue depth until the backlog has cleared'], 'The code waits in your own queue before any provider sees it, so a header that governs what APNs does cannot help. LinkedIn\'s ATC puts member messages on high-priority Kafka topics and spreads the hundred-million-request Daily Rundown over hours. Extra channels fed from the same queue wait just as long, and more senders draining a shared backlog still serve it in order while the provider\'s quota caps their rate.', ['linkedin-atc', 'apns-sending', 'fcm-throttling']],
      ['A push model sends whenever p(click) exceeds 0.02. Sessions rise 3% in week one; by week six twice as many users have disabled push and sessions are below the old baseline. Which change addresses the cause?', ['Add p(disable) and long-term effect to the score; judge on a holdout', 'Lower the threshold to 0.01, since more sends brought more sessions', 'Retrain the click model daily, so it follows the newest behaviour', 'Send at each user\'s preferred hour, so the same pushes get more taps'], 'A model of the immediate response will always choose to send, because the cost arrives later. LinkedIn\'s ATC predicts both the chance a member acts and the chance they disable, and can drop a notification or keep it in-app. Disables accumulate over weeks, so only a long-lived holdout shows the net effect; Duolingo added a random-policy holdout five months after launch to keep checking its notification bandit. Better timing raises taps but keeps the send-everything policy.', ['twitter-notif-ltv', 'linkedin-atc', 'duolingo-notif-bandit']],
      ['APNs returns HTTP 200 for 10 million pushes, and the dashboard reports "10M delivered". What has APNs actually confirmed?', ['It accepted each request; storing, throttling or loss can still follow', 'It accepted each request and will retry until each device acknowledges it', 'Each device received it; whether it was then shown depends on the user\'s settings', 'It queued each push; a delivery receipt follows later on the same HTTP/2 stream'], 'A 200 answers the POST. Apple describes APNs as best effort: notifications may be reordered, stored, throttled and in some cases not delivered, and for an offline device APNs stores one per app until the expiry, so redelivery ends at the expiry or when a newer push replaces it, not at an acknowledgement. APNs answers each POST with one response, and here that response is the 200 itself. Receipt on the device needs a signal from the app itself, which FCM reports as "Received" only for Android. Report "accepted" and measure opens.', ['apns-sending', 'apns-responses', 'fcm-delivery']],
      ['A phone is offline overnight. The app sends it six "new like" pushes via APNs, each with a one-day apns-expiration and no collapse ID. What does the user most likely get when the phone reconnects in the morning?', ['One push, usually the latest, as APNs stores one per app', 'All six, in the order sent, once the phone reconnects', 'None, since APNs drops pushes to an offline phone at once', 'One push that the phone builds by merging all six'], 'APNs stores only one notification per bundle ID for a device it cannot reach, in most cases the latest. Immediate dropping is what an expiration of 0 does, not a one-day expiry, and the phone does not merge pushes. So aggregate on the server ("6 people liked your photo") and use a collapse ID when repeats should replace each other.', ['apns-sending']]
    ],
    explain: ['Walk through your design for an ML-ranked, multi-channel notification system.', ['One decision service partitioned by user: history, settings, devices, budget', 'Score value against harm (p(act) and p(disable)) with drop, in-app or push outcomes', 'Volume caps, aggregation into digests and send-time selection', 'Channel senders on priority queues, within provider rules: priority, expiry, collapse, quotas, dead tokens', 'Idempotent processing, "accepted" rather than "delivered", and long-lived holdouts with disable guardrails']],
    duck: ['Why not send every notification a user might be interested in?', 'If APNs said 200, why can\'t we count the notification as delivered?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['Which notification types are time-critical, and how fast must they arrive?', true, 'Decides the priority classes and separate queues.'],
        ['Which long-term signals count as harm: disables, unsubscribes, complaints?', true, 'These become guardrails and terms in the send decision.'],
        ['How many users and candidates a day, and how large is the biggest broadcast?', true, 'Sizes the decision service and tells you whether provider quotas bind.'],
        ['Which channels can each user receive, and what limits do providers impose?', true, 'Channel choice and pacing depend on both.'],
        ['Should the send queues be built on Kafka, Pulsar or RabbitMQ instead?', false, 'A tooling choice you make from the requirements.'],
        ['Should the ranking model be a deep network or gradient-boosted trees?', false, 'A modelling detail for later, not a requirement.'],
        ['Which programming language should the channel sender services use?', false, 'Does not change the architecture.'],
        ['Can the email templates be shared with the marketing team\'s tooling?', false, 'A content question, not a system design one.']
      ] },
      { type: 'estimate', brief: 'Given: 200M users · producers create 12 candidates per user per day · the decision service lets through 3 sends per user per day on average · 40% of sends go to push · a 30M-device broadcast on FCM\'s 600,000-a-minute quota · send history kept 90 days at 100 bytes per send.', fixed: [
        { q: 'Average candidates per second reaching the decision service?', a: 27800, unit: 'candidates/s', tol: 0.05, how: '200M × 12 = 2.4 billion a day ÷ 86,400 s ≈ 27,800 a second, before any peak factor.' },
        { q: 'Push notifications sent per day, in millions?', a: 240, unit: 'M pushes/day', tol: 0.05, how: '200M × 3 × 0.4 = 240M. The decision service drops three quarters of the 2.4 billion candidates.' },
        { q: 'Minimum minutes for the 30M-device broadcast?', a: 50, unit: 'minutes', tol: 0.05, how: '30,000,000 ÷ 600,000 per minute = 50 minutes, so decide who gets it first.' },
        { q: 'Storage for 90 days of send history, in TB?', a: 5.4, unit: 'TB', tol: 0.1, how: '200M × 3 × 90 × 100 bytes = 5.4 TB, small enough to shard by user ID beside the decision service.' }
      ] },
      { type: 'sort', brief: 'Which service owns this step?', buckets: ['Decision service (whether, when, which channel)', 'Channel sender (getting it to the provider)'], items: [
        ['Predict the chance of a tap and of a disable', 0],
        ['Drop a reminder the user has already acted on', 0],
        ['Hold low-value items for a weekly digest', 0],
        ['Choose push rather than email for this user', 0],
        ['Pick the hour this user usually opens the app', 0],
        ['Keep HTTP/2 connections to APNs open and reuse them', 1],
        ['Detect a 410 Unregistered response from APNs and report the dead token', 1],
        ['Retry a 503 from APNs with backoff', 1],
        ['Pace a broadcast under FCM\'s per-project quota', 1],
        ['Map the request\'s expiry to apns-expiration or an FCM TTL', 1]
      ] },
      { type: 'diagram', brief: 'Draw the path from 27,800 candidates a second to the push providers, with about 7,000 sends a second getting through and 200 login codes a second that must never wait behind a campaign.',
        labels: { client: 'Product services', app: 'Decision service', features: 'User state store', ranker: 'Send model', queue: 'Send queue', cache: 'Priority queue (codes)', worker: 'Channel senders', psp: 'Providers (APNs, FCM, email)' },
        required: ['client', 'lb', 'app', 'features', 'ranker', 'queue', 'cache', 'worker', 'psp'],
        edges: [['client', 'lb'], ['lb', 'app'], ['app', 'features'], ['app', 'ranker'], ['app', 'queue'], ['app', 'cache'], ['queue', 'worker'], ['cache', 'worker'], ['worker', 'psp']],
        layout: { client: [10, 180], lb: [150, 180], app: [290, 180], features: [440, 20], ranker: [440, 110], queue: [440, 236], cache: [440, 330], worker: [600, 283], psp: [600, 170] },
        why: { lb: 'Spreads the producers\' candidates over the decision service fleet.', app: 'The one place that sees all of a user\'s candidates: it checks budget and settings, asks the model, then drops the candidate, holds it for a digest or queues a send.', features: 'Each user\'s recent sends, budget, settings and device tokens, partitioned by user ID so that a decision reads them in a few milliseconds.', ranker: 'Scores the chance the user taps against the chance they turn notifications off. It is what lets the service drop three candidates in four.', queue: 'Approved sends wait here, so producers get their answer at once and the senders work at the providers\' pace.', cache: 'Login codes and other urgent messages get a queue of their own that the senders always drain first, so a campaign never stands in front of them.', worker: 'Keep connections to APNs and FCM open, pace sends under each provider\'s quota, retry 503s with backoff and report dead tokens.', psp: 'APNs, FCM and the email provider accept a limited rate from one project (FCM\'s default is 600,000 a minute) and refuse the rest.' },
        decoys: { db: 'User state is read on every one of 27,800 decisions a second, so it lives in a store partitioned by user beside the decision service, not in a shared database.', ws: 'Phones are reached through APNs and FCM, which already hold the connection to each device.', cdn: 'Every notification is small and meant for one person, so there is nothing shared to serve from the edge.' },
        sim: {
          load: '27,800 candidates a second from producers, the average from the estimate. The decision service drops or holds about 20,800 of them and sends about 7,000, and 200 login codes a second arrive on top. The providers accept about 10,000 sends a second between them.',
          scale: 20,
          goals: { errors: 1, p99: 200 },
          flows: [
            { label: 'Candidates dropped or held', rps: 20800, needs: ['features', 'ranker'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'features'], ['app', 'db', { instead: 'features' }], ['app', 'ranker'], ['app', 'queue', { instead: 'ranker' }], ['queue', 'worker'], ['worker', 'psp']] },
            { label: 'Approved sends', rps: 6950, needs: ['features', 'ranker', 'psp'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'features'], ['app', 'db', { instead: 'features' }], ['app', 'ranker'], ['app', 'queue'], ['app', 'psp', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'psp']] },
            { label: 'Login codes', rps: 200, needs: ['cache', 'psp'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['lb', 'app'], ['app', 'cache'], ['app', 'queue', { instead: 'cache' }], ['app', 'psp', { instead: ['cache', 'queue'] }], ['cache', 'worker'], ['queue', 'worker'], ['worker', 'psp']] }
          ],
          parts: {
            app: { cfg: { instances: 6, capacity: 8, serviceMs: 4, serviceCv: 0.5, queueLimit: 64 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of it spreads the producers over the fleet, so they can only reach one server.', fullWhy: 'A decision holds its slot until everything it called has answered. Is anything slow being waited on?' },
            features: { cfg: { capacity: 64, serviceMs: 2, serviceCv: 0.4, queueLimit: 256 } },
            ranker: { cfg: { instances: 4, capacity: 8, serviceMs: 10, serviceCv: 0.3, queueLimit: 64 } },
            db: { cfg: { capacity: 8, serviceMs: 15, serviceCv: 0.7, queueLimit: 64, lockMs: 0 }, fullWhy: 'A shared database answers in tens of milliseconds and cannot take a lookup for every one of 27,800 decisions a second.' },
            queue: { cfg: { queueLimit: 20000 } },
            cache: { kind: 'queue', cfg: { queueLimit: 5000 } },
            worker: { cfg: { instances: 4, capacity: 20, serviceMs: 2, serviceCv: 0.5 }, fullWhy: 'Each send holds a sender for the provider\'s round trip. The senders are sized for the sends that survive the decision.' },
            psp: { kind: 'apigateway', cfg: { capacity: 2000, serviceMs: 120, serviceCv: 0.3, queueLimit: 2000, rateLimitRps: 500, burst: 500, authFailRate: 0 }, fullWhy: 'The providers take about 10,000 sends a second from this project and refuse the rest. Only the sends that survive the decision fit.' }
          },
          needWhy: { features: 'Every decision needs the user\'s recent sends, budget, settings and devices, read in milliseconds.', ranker: 'Without a score for tap against disable, the service has nothing to decide with and sends everything.', psp: 'Phones and inboxes are only reached through the providers.', cache: 'A login code in the shared send queue waits behind every campaign send ahead of it, which can be many minutes when a broadcast is paced under the provider\'s quota. Codes need a queue of their own that the senders drain first.' },
          bad: { 'client>psp': 'A product service that calls APNs itself skips the decision service: no budget, no de-duplication, no pacing.', 'client>queue': 'Producers hand candidates to the decision service. Only the sends it approves belong in the send queue.', 'client>cache': 'Even a login code goes through the decision service, which checks the device token and settings and drops duplicates before it takes the priority queue.', 'client>features': 'Producers never read user state directly. The decision service owns it.', 'queue>psp': 'A queue holds sends. Something has to take them off and call the providers: draw the channel senders between the two.', 'cache>psp': 'A queue holds sends. Something has to take them off and call the providers: draw the channel senders between the two.', 'lb>psp': 'A load balancer forwards requests to the decision service. It does not send notifications.' },
          traps: [
            { name: 'the decision service calls the providers inside the producer\'s request', drop: ['queue', 'cache', 'worker'], wire: [['app', 'psp']] },
            { name: 'login codes share the send queue with campaigns', drop: ['cache'] },
            { name: 'no send model: every candidate is sent', drop: ['ranker'] },
            { name: 'user state read from a shared database', drop: ['features'], add: ['db'], wire: [['app', 'db']] },
            { name: 'send queue drawn but nothing reads from it', drop: ['worker'] }
          ]
        } }
    ] }
  });

  T({
    id: '7.10', mod: '7', title: 'Autonomous driving data pipeline', tag: 'Fleet logs to a validated model',
    analogy: 'A wildlife film crew. The cameras roll all day, but only the minutes with the rare animal are sent back to the studio; editors tag them, the best footage trains the next crew, and nothing goes on air until it has been checked against every earlier cut. The crew\'s mistakes on location become next season\'s rehearsals.',
    points: [
      'Requirements and scale: an NVIDIA author estimated (2017) that a data-collection car records over 1 TB an hour, so 100 cars driving 8 hours on 260 days make about 200 PB a year; in 2020 an NVIDIA engineer put a car at upwards of 2 PB a year and wrote that, in their experience, only 30–50% of collected data is useful. Uploading everything is the first thing to rule out.',
      'On the vehicle: keep a rolling buffer and upload the segments a trigger marks (a disengagement, an operator flag, a rare object, two models disagreeing), plus a small random sample for unbiased statistics. Aurora turns copilot flags and disengagements into tests; nuScenes hand-picked 1,000 scenes of 20 s with dense traffic, rare classes and risky situations.',
      'Ingest and index: segments land in object storage with metadata, recent ones in a hot tier and the long tail in archival classes, which cost less but cannot be read in real time. Mining is a search problem: Waymo\'s Content Search (2020) embedded every logged object, turning 20 million miles into a searchable catalogue of billions of objects.',
      'Labelling: human 3D labels are the costly step, so an offboard auto-labeller proposes them and people review a share. Offboard models see the whole sequence and have ample compute; Waymo (2021) found its auto labels on par with human labels in a study. Teams differ in density: nuScenes annotates at 2 Hz, the Waymo Open Dataset at 10 Hz.',
      'Datasets and training: freeze each training set as a versioned snapshot with lineage to segments, label versions and code, kept as long as the model may need reproducing; Delta Lake time travel, for example, reaches back only 30 days by default. Training itself is the GPU-cluster problem of topics 5.5 and 5.13.',
      'Evaluation before any vehicle: perception tests on labelled logs, comparison of the planned path with what the expert driver did, and regression suites in replay and simulation with reactive agents, then a staged rollout with safety operators. Disengagements close the loop: in 2020 Aurora used one as the basis for 50 new nudging simulations.'
    ],
    pitfall: 'Uploading and labelling uniformly. Most driving hours are uneventful, so at a terabyte an hour per car the storage and labelling budget goes on data that teaches nothing, while the rare events that matter stay buried. Select on the vehicle, and mine with search before paying for labels.',
    say: 'Each car records about a terabyte an hour, so it keeps a rolling buffer and uploads triggered segments (disengagements, operator flags, rare objects) plus a small random sample, a few per cent of the total. In the cloud I index every object for scenario search, auto-label offboard with human review, train on frozen dataset versions, and gate every model on replay and simulation regression suites before a staged rollout.',
    refs: [
      ['nvidia-av-scale-2017', 'A terabyte an hour — “a single car will produce 1TB+ of data every hour, and 100 vehicles operating for 8h/day * 260 working days / year will generate 204.8PB of data.”'],
      ['nvidia-av-dgx-2020', 'Petabytes per car, 2020 — “Each data-collection car generates upwards of two petabytes of data with billions of images per year.”'],
      ['nvidia-av-dgx-2020', 'One engineer\'s experience: most of it is not useful — “In my experience, useful data is a much smaller subset of the total collected data. On average, I find only 30–50% of data is useful.”'],
      ['nuscenes', 'Annotation density differs — “Among these datasets, only the Waymo Open dataset [76] provides significantly more annotations, mostly due to the higher annotation frequency (10Hz vs. 2Hz)”'],
      ['waymo-content-search', 'Heuristic filters are too broad — “While this method yielded relevant examples, the results were often too broad, since many objects share those attributes.”'],
      ['waymo-content-search', 'Every object becomes an embedding — “This core image search model works by converting every object in Waymo\'s driving logs, whether a park bench, a trash can near the side of the road, or a moving object, into embeddings, a machine learning technique that makes it possible to rank objects by how similar they are to each other.”'],
      ['waymo-offboard-autolabel', 'Onboard models see little context — “However, most 3D perception research has been focusing on real-time, onboard use cases and only considers sensor input from the current frame or a few history frames.”'],
      ['aws-s3-storage-classes', 'Archive tiers are offline — “S3 Glacier Deep Archive (DEEP_ARCHIVE) – Use for archiving data that rarely needs to be accessed. Data in this storage class is archived, and not available for real-time access.”'],
      ['delta-time-travel', 'History expires — “VACUUM does not delete Delta log files; log files are automatically cleaned up after checkpoints are written. By default you can time travel to a Delta table up to 30 days old”'],
      ['delta-time-travel', 'Cleanup at checkpoints — “Each time a checkpoint is written, Delta automatically cleans up log entries older than the retention interval.”'],
      ['waymo-simulation-2020', 'Replayed scenes must react — “That includes modeling agent behavior and using reactive agents--such as other cars, cyclists, pedestrians--who respond to the new position of our vehicle.”'],
      ['aurora-online-to-offline', 'One disengagement, many tests (post published 12 May 2020) — “We used it as inspiration for 50 new nudging simulations”']
    ],
    cards: [
      ['Why does a self-driving fleet not upload all its sensor data?', 'At over a terabyte an hour per car a fleet produces hundreds of petabytes a year; one NVIDIA engineer finds only 30–50% of collected data useful, the rest corrupted or redundant. Vehicles keep a rolling buffer and upload what a trigger marks, plus a small random sample.'],
      ['How can an auto-labeller beat the onboard model?', 'It runs offline over the whole log sequence, later frames included, with a much larger model and no latency budget. People review its labels, which then train the onboard model that must decide from the present and the past in milliseconds.'],
      ['Why is replaying a logged drive not enough to test a new planner?', 'Logged agents follow their recorded paths. Once the new software drives differently they no longer react plausibly, giving false collisions or false passes; simulation with reactive agents keeps the scene realistic.']
    ],
    quiz: [
      ['A fleet of 200 cars drives 8 hours a day and records about 1 TB an hour per car. Upload triggers select 2% of driving time. How much data is uploaded per day?', ['32 TB a day', '1,600 TB a day', '4 TB a day', '320 TB a day'], '200 × 8 × 1 TB = 1,600 TB recorded, and 2% of it is 32 TB. 1,600 TB forgets the selection; 4 TB forgets the 8 hours (200 × 1 TB × 2%); 320 TB uses 20% instead of 2%.', 'calc'],
      ['In log replay a new planner brakes 1 s earlier than the car did that day. The logged car behind still follows its recorded path, drives into the ego car, and the test fails. What is the right reading?', ['Replayed agents do not react; rerun with reactive agents first', 'The planner has regressed; block the release and roll the change back', 'The replay clock drifted; resynchronise the sensor timestamps', 'The trailing car was mislabelled; send it back for relabelling'], 'Once the software behaves differently from the logged drive, logged agents no longer respond to it, so the collision says nothing about the planner. Waymo keeps simulation realistic by updating the scene with reactive agents that respond to the vehicle\'s new position. Timestamps and labels did not change between the passing and the failing run; the ego car\'s behaviour did.', ['waymo-simulation-2020']],
      ['Waymo\'s offboard auto-labeller produces 3D boxes on par with human labels, yet onboard detectors tested on the same data fall well short of it. Which difference explains most of the gap?', ['Offboard sees whole sequences, future frames too, with no latency cap', 'Offboard is trained on many more human labels than the onboard model', 'Offboard runs at a lower frame rate, so each frame has cleaner data', 'Offboard leaves out the rare classes that make onboard detection hard'], 'Onboard perception must decide in real time from the current frame and a few past ones. Offboard, the whole log is available: each object can be seen from many frames, before and after, by a larger model with ample compute. That is why auto labels can be used to train the onboard model, with people reviewing them.', ['waymo-offboard-autolabel']],
      ['You need 5,000 examples of people riding e-scooters. A log query for objects of pedestrian height moving at 0–20 mph returns 2 million hits, mostly cyclists and joggers. Which approach did Waymo adopt for this kind of mining?', ['Embed every logged object and search by similarity to a few examples', 'Narrow the speed range to 10–15 mph and add a tighter pedestrian height window', 'Label a uniform 1% sample of all logged frames and keep the scooter hits', 'Upload full raw logs from scooter-heavy cities and label every frame in them'], 'Waymo found that attribute filters like height and speed were too broad because many objects share them, and built Content Search, which turns every logged object into an embedding and ranks objects by similarity to a query. A narrower filter still matches cyclists; uniform sampling and labelling everything spend the labelling budget on frames with no scooter in them.', ['waymo-content-search']],
      ['A regulator asks you to retrain model v12 exactly as it was trained seven months ago. Its training set was read from a Delta table that is rewritten weekly as labels are corrected; nobody changed retention settings or ran VACUUM. What does time travel to that date give you?', ['Nothing dependable: checkpoints clean up log entries past the 30-day retention', 'The exact snapshot, because its data files stay in place until VACUUM runs', 'The exact snapshot, because Delta keeps each version until the table is dropped', 'Today\'s corrected rows, silently returned for the old date with no warning'], 'By default Delta keeps 30 days of table history (delta.logRetentionDuration), and each checkpoint cleans up log entries older than that. Data files do survive until VACUUM, but time travel needs the log entries that define the old version, so once cleanup has passed that date the version cannot be reconstructed, and nothing guarantees it has not. Reproducibility comes from freezing each training set (a snapshot or manifest) and recording it in the model\'s lineage.', ['delta-time-travel']]
    ],
    explain: ['Walk through your design for an autonomous driving data pipeline, from the vehicle to the next deployed model.', ['On-vehicle triggers and a rolling buffer; upload a small, selected share', 'Ingest to tiered storage, with an index and embedding search for scenario mining', 'Offboard auto-labelling with human review and label QA', 'Frozen, versioned datasets with lineage; distributed training', 'Replay and simulation regression suites, staged rollout, and disengagements fed back as tests and data']],
    duck: ['Why not record everything and sort it out later?', 'If the model does well in simulation, why drive real cars at all?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['What share of each day\'s driving can we upload, and over which links?', true, 'Sets the selection rate, and so storage and labelling cost.'],
        ['Which events must trigger an upload: disengagements, flags, rare objects?', true, 'Decides what the vehicle keeps and what it overwrites.'],
        ['What must a new model pass before it reaches any vehicle on the road?', true, 'Defines the replay and simulation gates and the rollout stages.'],
        ['How long must logs and datasets be kept to reproduce a past model?', true, 'Drives storage tiers and dataset versioning.'],
        ['Which deep learning framework do the perception teams prefer to use?', false, 'A tooling preference, not a requirement.'],
        ['Should the labels be stored as JSON files or as Protocol Buffers?', false, 'A serialisation detail for later.'],
        ['Which cloud provider has the cheapest GPUs to rent this quarter?', false, 'Prices change; the architecture should not depend on them.'],
        ['How many people work on the labelling vendor\'s annotation team?', false, 'The vendor\'s staffing is not your design constraint.']
      ] },
      { type: 'estimate', brief: 'Given: 100 cars · 8 hours a day · 250 days a year · 1 TB recorded per car-hour · triggers upload 3% · 2M frames to label: human labels $0.50 a frame, auto-labels $0.05 a frame plus human review of 20% of frames at $0.50 · storage $20 per TB-month hot, $1 per TB-month archive.', fixed: [
        { q: 'TB recorded by the fleet per day?', a: 800, unit: 'TB/day', tol: 0.05, how: '100 cars × 8 h × 1 TB = 800 TB a day, almost all of it never uploaded.' },
        { q: 'PB uploaded per year?', a: 6, unit: 'PB/year', tol: 0.05, how: '800 TB × 3% = 24 TB a day × 250 days = 6,000 TB = 6 PB.' },
        { q: 'Labelling cost for the 2M frames with auto-labels plus review, in $?', a: 300000, unit: '$', tol: 0.05, how: '2M × $0.05 = $100,000, plus 400,000 reviewed frames × $0.50 = $200,000: $300,000, against $1M for all-human labels.' },
        { q: 'Monthly saving from keeping one year\'s 6 PB in archive instead of hot storage, in $?', a: 114000, unit: '$/month', tol: 0.05, how: '6,000 TB × ($20 − $1) = $114,000 a month, paid for with slow, fee-bearing retrieval.' }
      ] },
      { type: 'order', brief: 'Order the path from a car on the road to a model back on the road.', items: [
        'A trigger marks a segment in the vehicle\'s rolling buffer',
        'The segment uploads at the depot and is checksummed into the data lake',
        'Every object in it is indexed and embedded for scenario search',
        'An offboard auto-labeller proposes labels and people review a share',
        'A versioned dataset snapshot is frozen and the model trains on it',
        'The model passes replay and simulation regression suites',
        'It is rolled out in stages to vehicles with safety operators'
      ] },
      { type: 'diagram', brief: 'Draw the path from the depot to a training run: cars upload 13 parts of 256 MB a second, a segment finishes every couple of seconds, and the training cluster reads 20 dataset shards a second.',
        labels: { client: 'Vehicles and ML engineers', app: 'Ingest service', blob: 'Object storage (data lake)', db: 'Dataset catalogue', queue: 'Processing queue', worker: 'Index + auto-label workers (GPU)', index: 'Scenario search index', ranker: 'Training cluster (GPU)' },
        required: ['client', 'app', 'ranker', 'queue', 'db', 'worker', 'index', 'blob'],
        edges: [['client', 'app'], ['client', 'ranker'], ['app', 'blob'], ['app', 'db'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'blob'], ['worker', 'index'], ['worker', 'db'], ['ranker', 'db'], ['ranker', 'blob']],
        layout: { client: [10, 190], app: [170, 100], ranker: [170, 300], queue: [330, 40], db: [330, 190], worker: [490, 40], index: [632, 40], blob: [490, 300] },
        why: { app: 'Checks which car is uploading, checksums each part, writes it to storage, and when a segment is complete registers it and queues it. Nothing heavy happens while the car waits.', blob: 'Every uploaded segment and every frozen dataset\'s files live here, in tiers by age.', db: 'Segments, label versions and frozen dataset versions with their lineage, so that any past model\'s training set can be found again.', queue: 'Finished segments wait here for the GPU workers, so an upload never waits for indexing or labelling.', worker: 'Read each finished segment, embed every object for scenario search, and run the offboard auto-labeller whose output people review.', index: 'Embeddings of every logged object, so that rare scenarios are found by similarity instead of by scanning petabytes.', ranker: 'Trains on a frozen dataset version, streaming its shards straight from object storage.' },
        decoys: { cdn: 'Nobody downloads these logs around the world. The readers are your own workers and training cluster, next to the storage.', ws: 'Cars upload over ordinary HTTPS at the depot. Nothing is pushed back to them while they drive.', search: 'Scenarios are mined by the similarity of object embeddings, which the scenario index already serves. Keyword and attribute filters were the approach that proved too broad.' },
        sim: {
          load: '24 TB uploaded a day (the estimate) arrives in the two hours the cars spend at the depot: 13 parts of 256 MB a second, and a 20-second segment completing about every 1.7 seconds. Each segment then takes a GPU worker about 40 seconds to index and auto-label. The training cluster reads 20 shards of 512 MB a second.',
          timeoutMs: 20000, warmupS: 60, windowS: 120,
          goals: { errors: 1, p99: 8000 },
          flows: [
            { label: 'Upload parts', rps: 13, needs: ['blob'],
              hops: [['client', 'app', { instead: 'blob' }], ['client', 'blob'], ['app', 'blob']] },
            { label: 'Finished segments', rps: 0.6, needs: ['db', 'worker', 'index', 'blob'],
              hops: [['client', 'app'], ['app', 'db'], ['app', 'queue'], ['app', 'worker', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'blob'], ['worker', 'index'], ['worker', 'db']] },
            { label: 'Training reads', rps: 20, needs: ['ranker', 'db', 'blob'],
              hops: [['client', 'ranker'], ['ranker', 'db'], ['ranker', 'blob'], ['ranker', 'app', { instead: 'blob' }], ['app', 'blob']] }
          ],
          parts: {
            app: { cfg: { instances: 3, capacity: 16, serviceMs: 300, serviceCv: 0.4, queueLimit: 64 }, fullWhy: 'Each request holds an ingest slot until everything it called has answered. The fleet is sized for the depot\'s uploads, a few seconds each, and nothing heavier.' },
            blob: { cfg: { capacity: 256, serviceMs: 2000, serviceCv: 0.4, queueLimit: 1024, prefixRps: 0 } },
            db: { cfg: { capacity: 16, serviceMs: 10, serviceCv: 0.6, queueLimit: 128, lockMs: 0 } },
            queue: { cfg: { queueLimit: 5000 } },
            worker: { cfg: { instances: 8, capacity: 8, serviceMs: 40000, serviceCv: 0.3 }, fullWhy: 'Indexing and auto-labelling a segment takes a GPU worker about 40 seconds.' },
            index: { cfg: { capacity: 16, serviceMs: 50, serviceCv: 0.5, queueLimit: 128 } },
            ranker: { cfg: { instances: 10, capacity: 8, serviceMs: 100, serviceCv: 0.3, queueLimit: 64 } }
          },
          needWhy: { blob: 'The segments themselves have to land in object storage; everything downstream reads them from there.', db: 'Training has to read a frozen, versioned list of segments and labels, or no past model can be reproduced.', worker: 'Something has to index each segment and propose its labels.', index: 'Without an index of every logged object, finding a rare scenario means scanning petabytes.', ranker: 'Training runs on a GPU cluster.' },
          bad: { 'client>worker': 'Cars do not call the labelling fleet. Their segments are queued for it once they are stored.', 'client>queue': 'The ingest service queues a segment only after it has checked and registered it.', 'client>db': 'Cars never write to the catalogue directly; the ingest service registers what actually arrived.', 'client>index': 'Nobody queries the scenario index as part of an upload or a training run.', 'app>index': 'Embedding every object is GPU work for the workers, behind the queue, not part of an upload.', 'app>ranker': 'The ingest service accepts uploads. Training is started separately and reads a frozen dataset version.', 'queue>blob': 'A queue holds work. Something has to read each segment and process it: draw the workers between the two.', 'queue>index': 'A queue holds work. Something has to embed the objects: draw the workers between the two.', 'worker>ranker': 'Training does not take freshly labelled segments one at a time. It reads a frozen dataset version once people have reviewed the labels.' },
          traps: [
            { name: 'auto-labelling inside the upload request', drop: ['queue'], wire: [['app', 'worker']] },
            { name: 'training reads through the ingest service', cut: [['ranker', 'blob']], wire: [['ranker', 'app']] },
            { name: 'processing queue drawn but nothing reads from it', drop: ['worker'] },
            { name: 'no dataset catalogue: training reads whatever is in storage today', drop: ['db'] }
          ]
        } }
    ] }
  });
})(SD.T);
