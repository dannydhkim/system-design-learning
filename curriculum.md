# System Design Curriculum

## Progress Key
- [ ] Not started
- [~] In progress
- [x] Completed

---

## Module 0: Interview Framework

The structure every system design answer should follow. Practice this on every case study and ML design.

### 0A: Requirements Gathering
- [ ] 0A.1 Functional requirements — what the system DOES (user stories, core features)
- [ ] 0A.2 Non-functional requirements — HOW it does it (latency, throughput, availability, consistency, durability)
- [ ] 0A.3 Capacity estimation — back-of-envelope: QPS, storage, bandwidth, number of users
- [ ] 0A.4 Constraints and assumptions — what's given, what you're deciding, what's out of scope
- [ ] 0A.5 Clarifying questions — the questions you ask before drawing anything

### 0B: API Design
- [ ] 0B.1 REST API design — resources, verbs, status codes, pagination, versioning
- [ ] 0B.2 RPC / gRPC — when to use, protobuf schemas, streaming
- [ ] 0B.3 GraphQL — when it fits, N+1 problem, federation
- [ ] 0B.4 WebSocket / SSE — real-time contracts, reconnection, backpressure
- [ ] 0B.5 API gateway patterns — auth, rate limiting, request transformation
- [ ] 0B.6 Idempotency — idempotency keys, exactly-once semantics at the API layer

### 0C: High-Level Design
- [ ] 0C.1 Drawing the box diagram — clients, services, data stores, async paths
- [ ] 0C.2 Data model — schema design, access patterns driving storage choice
- [ ] 0C.3 Read vs write path — separating and optimizing each
- [ ] 0C.4 Sync vs async — what needs a response now vs what can be queued

### 0D: Deep Dive & Probing
- [ ] 0D.1 Bottleneck identification — find the weakest link, prove it with numbers
- [ ] 0D.2 Failure modes — what breaks, what's the blast radius, how do you recover
- [ ] 0D.3 Scaling the bottleneck — horizontal, vertical, caching, sharding, async
- [ ] 0D.4 Consistency vs availability tradeoffs — for THIS system, which matters more
- [ ] 0D.5 Monitoring and observability — what metrics, what alerts, what dashboards
- [ ] 0D.6 Cost optimization — where the money goes, spot vs on-demand, tiered storage

---

## Module 1: Foundations (General)

- [x] 1.1 Queues are everywhere — what happens when arrival > throughput
- [x] 1.2 Slots + service time — how real servers model capacity
- [x] 1.3 Utilization vs headroom — why 70% is the target, not 100%
- [x] 1.4 Little's Law — L = λ × W
- [x] 1.5 Load balancers — routing strategies and the slow server problem
- [x] 1.6 Retry storms — how retries amplify failure
- [ ] 1.7 Timeouts — how to choose them, cascading timeouts
- [ ] 1.8 Circuit breakers — fail fast to protect recovery
- [ ] 1.9 Rate limiting — token bucket, sliding window, distributed
- [ ] 1.10 Backpressure — queues, load shedding, admission control

## Module 2: Data Layer

- [ ] 2.1 Single DB bottleneck — why it's always the database
- [ ] 2.2 DB internals — B-tree vs LSM tree, OLTP vs OLAP, when each matters
- [ ] 2.3 Caching — cache-aside, write-through, write-behind, invalidation, eviction, cold start
- [ ] 2.4 Read replicas — scaling reads, consistency tradeoffs, CDC
- [ ] 2.5 Sharding — partition strategies, consistent hashing, hot keys, rebalancing
- [ ] 2.6 CAP theorem — consistency vs availability in practice
- [ ] 2.7 Specialized stores — when to use vector, graph, time-series, object, document
- [ ] 2.8 Unique ID generation — UUID, Snowflake, ULID, DB sequences at scale

## Module 3: Async & Event-Driven

- [ ] 3.1 Message queues — decoupling producers and consumers
- [ ] 3.2 Stream processing — Kafka, event sourcing, exactly-once, windowing
- [ ] 3.3 Pub/sub — fan-out patterns, ordering guarantees
- [ ] 3.4 Push vs pull dataflow — fan-out on write vs fan-out on read (Twitter example)
- [ ] 3.5 CQRS — separating read and write paths
- [ ] 3.6 Saga pattern — distributed transactions without 2PC
- [ ] 3.7 Batch processing — MapReduce, Spark, Lambda/Kappa architecture, backfill

## Module 4: Scaling Patterns

- [ ] 4.1 Horizontal vs vertical scaling
- [ ] 4.2 Autoscaling — reactive vs predictive, cold start
- [ ] 4.3 CDN and edge — what to cache where
- [ ] 4.4 Multi-region — failover, latency, data replication
- [ ] 4.5 Microservices — when to split, service mesh, sidecar

## Module 5: ML System Design (Primary Focus)

- [ ] 5.1 ML serving architecture — model server as a "slow server with GPU slots"
- [ ] 5.2 Feature stores — online (cache) vs offline (warehouse) serving
- [ ] 5.3 Batch vs real-time inference — throughput vs latency tradeoff
- [ ] 5.4 Model registry and versioning — blue/green, canary, shadow
- [ ] 5.5 Training pipelines — GPU scheduling, data parallelism, checkpointing
- [ ] 5.6 Embedding services — vector DB, ANN search, index refresh
- [ ] 5.7 Recommendation systems — candidate generation → ranking → re-ranking
- [ ] 5.8 RAG architecture — retrieval + generation, chunk strategies, latency
- [ ] 5.9 ML pipeline orchestration — DAGs, retries, idempotency
- [ ] 5.10 A/B testing and experimentation — traffic splitting, metric collection
- [ ] 5.11 Data pipelines — ingestion, validation, feature engineering at scale
- [ ] 5.12 Monitoring ML systems — data drift, model degradation, feedback loops
- [ ] 5.13 GPU cluster design — scheduling, preemption, spot instances
- [ ] 5.14 LLM serving — KV cache, batching, speculative decoding, routing

## Module 6: Real-World Case Studies (via Breakscale presets)

Each case study practiced with the full Module 0 framework: requirements → API → high-level → deep dive.

- [ ] 6.1 Discord — real-time chat at scale
- [ ] 6.2 Uber — ride dispatch and geospatial
- [ ] 6.3 Netflix — streaming and CDN
- [ ] 6.4 Spotify — catalogue + recommendation
- [ ] 6.5 Twitter/X — fan-out on write vs read
- [ ] 6.6 Stripe — correctness over availability
- [ ] 6.7 WhatsApp — store and forward messaging

## Module 7: ML Case Studies

Full interview simulation: requirements → API → architecture → deep dive → breakscale modeling.

- [ ] 7.1 Design a real-time recommendation service (Netflix/Spotify-style)
- [ ] 7.2 Design an ML inference platform (multi-model, multi-tenant)
- [ ] 7.3 Design a search ranking system (Google/Bing-style)
- [ ] 7.4 Design a fraud detection pipeline (Stripe-style, real-time + batch)
- [ ] 7.5 Design a RAG-based Q&A system (enterprise chatbot)
- [ ] 7.6 Design an image/video processing pipeline (content moderation)
- [ ] 7.7 Design a feature platform (Uber Michelangelo-style)
- [ ] 7.8 Design an LLM serving infrastructure (multi-model, auto-scaling)
- [ ] 7.9 Design a personalized notification system (ML-ranked, multi-channel)
- [ ] 7.10 Design an autonomous driving data pipeline (ingest → label → train → deploy)

## Breakscale Challenges Progress

- [ ] Challenge 1: Hold the line (p99 < 200ms)
- [ ] Challenge 2: More machines, not bigger ones (error < 1%)
- [ ] Challenge 3: Stop the storm (error <1%, p99 <250ms)
- [ ] Challenge 4: Keep it warm (p99 <200ms, errors <1%)
