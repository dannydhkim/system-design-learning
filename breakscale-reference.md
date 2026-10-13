# Breakscale Reference

Cached context so we don't re-read source each session.

## Running

```bash
cd ~/Desktop/Development/breakscale && bun dev
# → http://localhost:5173
```

Requires bun (installed globally via npm). Uses bun.lock for exact dependency versions.

## 33 Component Types (NodeKind)

| Component | Category | Real-world analog |
|-----------|----------|-------------------|
| client | Traffic | End users / traffic source |
| lb | Routing | Load balancer (nginx, ALB, Envoy) |
| service | Compute | Application server |
| cache | Data | Redis, Memcached |
| db | Data | PostgreSQL, MySQL |
| queue | Messaging | SQS, RabbitMQ |
| worker | Compute | Background job processor |
| autoscaler | Control | K8s HPA, AWS ASG |
| region | Control | AWS region, GCP region |
| cdn | Routing | CloudFront, Akamai |
| ratelimiter | Resilience | API rate limiter |
| breaker | Resilience | Circuit breaker (Hystrix) |
| replica | Data | Read replica |
| shard | Data | Database shard/partition |
| objectstore | Data | S3, GCS |
| searchindex | Data | Elasticsearch, Solr |
| timeseriesdb | Data | InfluxDB, TimescaleDB |
| graphdb | Data | Neo4j, Neptune |
| coldstorage | Data | Glacier, Archive |
| vectordb | Data | Pinecone, Weaviate, pgvector |
| streambroker | Messaging | Kafka, Kinesis |
| pubsub | Messaging | Google Pub/Sub, SNS |
| websocket | Routing | Real-time connections |
| apigateway | Routing | Kong, API Gateway |
| sidecar | Routing | Envoy sidecar, service mesh |
| lambda | Compute | AWS Lambda, Cloud Functions |
| cron | Compute | Scheduled jobs |
| bulkhead | Resilience | Bulkhead pattern (isolation) |
| retryqueue | Messaging | Dead letter / retry queue |
| transcoder | Compute | Media/data transform pipeline |
| edgecompute | Compute | CloudFlare Workers, Lambda@Edge |
| writebehind | Data | Write-behind cache pattern |
| loadshedder | Resilience | Graceful degradation |

## Server Node Config

| Field | UI Label | Meaning |
|-------|----------|---------|
| instances | Instances | Number of pods/containers |
| capacity | Slots per instance | Parallel request slots (threads/connections) |
| serviceMs | Service time | Mean ms to handle one request |
| serviceCv | How uneven the work is | Coefficient of variation (0=deterministic, 1=exponential) |
| queueLimit | Most that can wait in line | Max queue depth before shedding |
| errorRate | Error rate | Probability a request fails |
| timeoutMs | Timeout | Ms before caller gives up (0=none) |
| retries | Retries | Retry count on failure/timeout |

**Throughput formula:** `instances × slots × (1000 / serviceMs)`

## Load Balancer Behavior

No UI toggle for routing strategy. Hardcoded logic:
- **Equal edge weights (default):** least-loaded routing (picks server with lowest utilization)
- **Different edge weights:** weighted-random proportional to weight

## 23 Presets

1. Single server — Watch the database become the bottleneck
2. Load balanced — More servers, same database behind them
3. Cache aside — What happens when the hit rate falls
4. Async workers — A backlog that grows faster than it drains
5. Retry storm — Retries making an overload worse
6. CDN and origin — How much traffic never reaches you
7. Rate limited API — Turning excess away before it queues
8. Circuit breaker — Giving a failing dependency room to recover
9. Read replicas — Reads that scale, and reads that go stale
10. Sharded database — One hot key undoing all the partitions
11. Autoscaling service — Capacity arriving after it was needed
12. Multi-region failover — What a failover actually costs you
13. Full stack — Every piece at once, under real load
14. Specialised stores — The right store for each job, side by side
15. Event-driven backend — Lag, fan-out, cold starts and a cron burst
16. Resilient delivery — Choosing what fails, and where failures go
17. Discord: real-time chat — Millions of sockets, and fan-out per message
18. Uber: ride dispatch — Matching riders to drivers, city by city
19. Netflix: streaming at scale — Almost everything served from the edge
20. Spotify: music and discovery — A steady catalogue beside a heavy recommender
21. Twitter/X: timeline fan-out — One tweet becoming a hundred thousand writes
22. Stripe: correctness over availability — Refusing work rather than charging twice
23. WhatsApp: store and forward — Messages that wait instead of failing

## 4 Challenges

1. **Hold the line** — Single server at 150 rps, get p99 < 200ms
2. **More machines, not bigger ones** — Load balanced at 600 rps, get error rate < 1%
3. **Stop the storm** — Retry storm at 150 rps, get error rate <1% and p99 <250ms
4. **Keep it warm** — Cache aside at 1200 rps, get p99 <200ms and errors <1%
