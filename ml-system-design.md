# ML System Design — Breakscale Mappings

How general system design components map to ML-specific infrastructure.

## Component Mapping

| ML Concept | Breakscale Component | Why |
|------------|---------------------|-----|
| Inference server (TorchServe, Triton, vLLM) | **service** | GPU slots = capacity, inference latency = service time |
| Model load balancer (routing across GPU replicas) | **lb** | Distributes inference requests across model replicas |
| Feature store — online (Feast, Tecton) | **cache** | Low-latency key-value lookups for real-time features |
| Feature store — offline (warehouse) | **db** | Batch feature computation, higher latency OK |
| Training job scheduler (K8s, Slurm) | **queue** + **worker** | Jobs queue, GPU workers pull and process |
| Batch inference pipeline | **queue** + **worker** | Large dataset → chunked → processed in parallel |
| Vector database (Pinecone, Weaviate) | **vectordb** | ANN search for embeddings, retrieval step in RAG |
| Embedding service | **service** (slow, GPU-bound) | High service time, limited slots (GPU memory) |
| Model registry / artifact store | **objectstore** | Model weights, versioned artifacts |
| Stream processing (feature pipeline) | **streambroker** | Real-time feature computation from event streams |
| A/B test traffic split | **lb** with weights | Route % of traffic to challenger model |
| Rate limiter on ML API | **ratelimiter** | Protect GPU-bound services from overload |
| Circuit breaker on model call | **breaker** | Fall back to simpler model when primary is degraded |
| Autoscaler for GPU pods | **autoscaler** | Scale inference replicas based on queue depth/latency |
| CDN for static model assets | **cdn** | Serve model configs, vocab files, static predictions |
| Edge inference | **edgecompute** | On-device or edge-node inference for latency |
| Retry queue for failed predictions | **retryqueue** | DLQ for failed inference requests |
| Load shedder for overloaded model | **loadshedder** | Graceful degradation — serve cached/default predictions |

## Key ML System Design Patterns

### 1. Online Inference (real-time)
```
client → api_gateway → lb → [model_server × N] → cache (feature store)
                                                 → vectordb (if RAG)
```
Critical: latency budget (typically 50-200ms), GPU slot management, batching

### 2. Batch Inference
```
cron → queue → [worker × N] → objectstore (results)
                ↓
              db (feature store offline)
```
Critical: throughput, checkpoint/restart, cost optimization

### 3. Training Pipeline
```
cron → queue → [gpu_worker × N] → objectstore (checkpoints)
                ↓
              db/objectstore (training data)
```
Critical: GPU utilization, data loading bottleneck, distributed training

### 4. RAG (Retrieval-Augmented Generation)
```
client → service (orchestrator) → vectordb (retrieval, ~20ms)
                                → service (LLM inference, ~500-2000ms)
```
Critical: retrieval latency, LLM batching, context window management

### 5. Recommendation System
```
client → cache (cached recs) → lb → service (candidate gen, fast)
                                   → service (ranking model, slower)
                                   → service (re-ranking, slowest)
```
Critical: cascade latency budget, cache hit rate, cold start

### 6. Feature Pipeline (real-time)
```
streambroker (events) → worker (feature compute) → cache (online store)
                                                  → db (offline store)
```
Critical: feature freshness, exactly-once processing, backfill
