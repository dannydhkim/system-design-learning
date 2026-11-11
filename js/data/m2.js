// Module 2 — Data Layer.
(function (T) {

  T({
    id: '2.1', mod: '2', title: 'The single-DB bottleneck', tag: 'Why it is always the database',
    analogy: 'A restaurant can hire more waiters in an afternoon. It cannot clone the one walk-in fridge that every dish depends on.',
    points: [
      'Stateless servers scale by adding copies. The database holds the one shared truth, so it cannot simply be copied.',
      'What actually runs out: connections, CPU, disk I/O, memory for hot data, and lock contention.',
      'Escalation ladder, cheapest first: indexes and query fixes → connection pooling → bigger machine → cache → read replicas → sharding.',
      'Each rung buys time at a higher complexity cost. Climb only as far as the numbers require.'
    ],
    pitfall: 'Jumping straight to sharding when a missing index or a cache would have removed 90% of the load.',
    say: 'One Postgres primary is fine at this scale. If reads grow I\'ll add a cache and replicas first; sharding only if writes outgrow a single primary.',
    cards: [
      ['Why does the database become the bottleneck before the application tier?', 'Application servers are stateless and scale horizontally. The database holds shared state that must stay consistent, so it cannot be cloned freely.'],
      ['List the database scaling ladder from cheapest to most expensive.', 'Indexes/query tuning → connection pooling → vertical scaling → caching → read replicas → sharding.'],
      ['Name three resources a single database runs out of.', 'Any three: connections, CPU, disk I/O, memory (buffer cache), lock contention.']
    ],
    quiz: [
      ['A query is slow because it scans a whole table. First fix?', ['Add an appropriate index', 'Shard the database', 'Add read replicas', 'Rewrite the app in another language'], 'Cheapest rung first. An index can turn a scan into a lookup.'],
      ['200 app servers each open 50 connections to one database. Most likely problem?', ['Connection exhaustion — add pooling', 'Too little data', 'Too many indexes', 'Disk is too fast'], '10,000 connections overwhelms most databases; a pooler multiplexes them.'],
      ['Why not shard from day one?', ['It adds permanent complexity that most systems never need', 'Sharding is slow', 'Shards cannot be replicated', 'It is impossible to do later'], 'Cross-shard queries, rebalancing and operations all get harder. Earn it with numbers.']
    ],
    explain: ['Explain why the database tends to be the bottleneck and the order in which you would address it.', ['Stateless tiers scale out; shared state does not', 'What runs out (connections, I/O, locks…)', 'The ladder: index → pool → vertical → cache → replicas → shard', 'Climb only as far as the numbers demand']],
    duck: ['Why can\'t you just run ten copies of the database like you do with web servers?', 'What would you try before splitting the data up?']
  });

  T({
    id: '2.2', mod: '2', title: 'DB internals', tag: 'B-tree vs LSM, OLTP vs OLAP',
    analogy: 'A B-tree is a filing cabinet kept perfectly sorted: finding is quick, but each new paper means opening the right drawer. An LSM tree is an in-tray: drop papers on top instantly, and sort the piles together later.',
    points: [
      'B-tree: sorted pages updated in place. Fast, predictable point and range reads; writes cost random I/O. PostgreSQL and MySQL/InnoDB.',
      'LSM tree: writes go to a log and an in-memory table, are flushed to immutable sorted files, and merged by background compaction. Very high write throughput. RocksDB, Cassandra.',
      'LSM reads may check several files; Bloom filters let them skip files that cannot contain the key.',
      'OLTP: many small transactions touching a few rows — row-oriented storage.',
      'OLAP: few large scans aggregating a few columns over many rows — column-oriented storage.'
    ],
    pitfall: 'Running heavy analytical scans on the transactional database. Different workload, different engine — and the scans starve the transactions.',
    say: 'This is ingest-heavy, so an LSM-based store suits the write path; analytics goes to a columnar warehouse fed asynchronously.',
    cards: [
      ['Describe the write path of an LSM tree.', 'Append to a write-ahead log and insert into an in-memory memtable; when full, flush it as an immutable sorted file (SSTable); background compaction merges files.'],
      ['B-tree vs LSM tree — which is better for what?', 'B-tree: read-heavy workloads needing predictable point/range reads. LSM: write-heavy workloads, because writes are sequential appends.'],
      ['OLTP vs OLAP — workload and storage layout?', 'OLTP: many short transactions on a few rows, row-oriented. OLAP: large scans and aggregations over a few columns, column-oriented.']
    ],
    quiz: [
      ['Which structure favours a workload of 200k writes/sec and rare reads?', ['LSM tree', 'B-tree', 'Hash index only', 'Bitmap index'], 'Sequential appends and deferred sorting give the highest write throughput.'],
      ['What is a Bloom filter used for in an LSM tree?', ['Skipping files that definitely do not contain the key', 'Compressing data', 'Sorting the memtable', 'Replicating writes'], 'It answers "definitely not here" cheaply, saving disk reads.'],
      ['"Total revenue per region for the last year" over 2 billion rows is best served by…', ['A column-oriented OLAP store', 'A row-oriented OLTP database', 'A key-value cache', 'A message queue'], 'It scans a few columns of many rows — exactly what columnar storage is built for.']
    ],
    explain: ['Explain the difference between B-tree and LSM-tree storage and when you would want each.', ['B-tree: in-place sorted pages, good reads', 'LSM: append, flush, compact — good writes', 'The read cost of LSM and Bloom filters (or compaction cost)', 'Ties the choice to workload (or OLTP vs OLAP)']],
    duck: ['Why are writes faster in an LSM tree?', 'If LSM is faster to write, what do you give up?'],
    lab: {
      type: 'sort', brief: 'Which storage structure?', buckets: ['B-tree', 'LSM tree'],
      items: [['Updates pages in place', 0], ['Memtable flushed to immutable sorted files', 1], ['Background compaction merges files', 1], ['Bloom filters skip files on reads', 1], ['Default index in PostgreSQL and MySQL/InnoDB', 0], ['Best fit for very write-heavy ingest', 1], ['Predictable point and range read latency', 0], ['Used by Cassandra and RocksDB', 1]]
    }
  });

  T({
    id: '2.3', mod: '2', title: 'Caching', tag: 'Patterns, invalidation, eviction, cold start',
    analogy: 'Keeping the books you use daily on your desk instead of walking to the library each time. The desk is small, and the library copy may have been revised since.',
    points: [
      'Cache-aside: read the cache; on a miss read the database and populate the cache. The default pattern.',
      'Write-through: write cache and database together — fresh cache, slower writes. Write-behind: write the cache, flush to the database later — fast, but data can be lost.',
      'Invalidation: TTLs bound staleness; deleting the key on write keeps it fresher. Deleting is safer than updating.',
      'Eviction when full: LRU (least recently used) or LFU (least frequently used).',
      'Stampede: a hot key expires and many requests all recompute it at once. Cold start: an empty cache sends full traffic to the database.',
      'DB load = QPS × (1 − hit ratio). At 95% hits, a drop to 90% doubles database load.'
    ],
    pitfall: 'Sizing the database for the cached load. When the cache restarts, the database meets the real traffic for the first time.',
    say: 'Cache-aside with a TTL and delete-on-write. At a 95% hit ratio the database sees one twentieth of reads — and I\'d plan warm-up for cold starts.',
    cards: [
      ['Describe cache-aside.', 'The application checks the cache first. On a miss it reads the database, writes the result into the cache, and returns it. Writes go to the database and invalidate the cached key.'],
      ['Write-through vs write-behind?', 'Write-through: write cache and database synchronously — consistent but slower writes. Write-behind: write the cache and persist asynchronously — fast, but risks losing data if the cache fails.'],
      ['What is a cache stampede and one fix?', 'Many requests miss the same hot key at once and all hit the database to recompute it. Fixes: per-key locking / request coalescing, staggered TTLs, or refreshing before expiry.']
    ],
    quiz: [
      ['Hit ratio falls from 95% to 90%. Database load…', ['Doubles', 'Rises by 5%', 'Halves', 'Is unchanged'], 'Misses go from 5% to 10% of traffic — twice as many.'],
      ['Which pattern risks losing acknowledged writes?', ['Write-behind', 'Cache-aside', 'Write-through', 'Read-through'], 'The write lives only in the cache until it is flushed.'],
      ['A cache node restarts empty during peak traffic. What is the risk?', ['Every request misses and the database is overwhelmed', 'Data is permanently lost', 'Writes fail', 'Nothing — it refills instantly'], 'The cold-start problem. Warm it up or ramp traffic gradually.']
    ],
    explain: ['Explain how you would add a cache to a read-heavy service and what can go wrong.', ['Cache-aside (or another pattern) described correctly', 'Invalidation: TTL and/or delete on write', 'Hit ratio determines database load', 'A failure mode: stampede, cold start or staleness']],
    duck: ['How does the cache know when its copy is out of date?', 'What happens to the database when the cache is suddenly empty?'],
    lab: { type: 'sim', sim: 'cache' }
  });

  T({
    id: '2.4', mod: '2', title: 'Read replicas', tag: 'Scaling reads, and replication lag',
    analogy: 'Photocopies of a master document handed to several clerks. Many people can read at once, but a copy made five minutes ago misses the latest edit.',
    points: [
      'All writes go to the primary; changes stream to replicas, which serve reads.',
      'Asynchronous replication is fast but replicas lag — a user may not see their own write.',
      'Read-your-writes fixes: read from the primary for a short time after a write, pin the session, or wait until the replica has caught up to that write.',
      'Synchronous replication removes lag, but every write waits for a replica — slower, and a replica outage can block writes.',
      'Replicas scale reads only. They also provide failover: promote one if the primary dies (losing any un-replicated writes if async).',
      'Change Data Capture (CDC) streams the same change log to other systems: search indexes, caches, warehouses.'
    ],
    pitfall: 'Promising "we\'ll add replicas" for a write-heavy workload. Every replica still has to apply every write.',
    say: 'Reads go to async replicas; right after a user writes, their reads go to the primary for a few seconds so they always see their own change.',
    cards: [
      ['What is replication lag and what user-visible bug does it cause?', 'The delay before a write on the primary appears on a replica. A user writes, then reads from a lagging replica and does not see their own change.'],
      ['Give two ways to provide read-your-writes consistency with async replicas.', 'Any two: read from the primary for a short window after a write; pin the user\'s session to the primary; have the client pass the write position and wait for the replica to reach it.'],
      ['Sync vs async replication — the trade-off?', 'Sync: no data loss on failover and no lag, but slower writes and dependence on replica availability. Async: fast writes, but lag and possible loss of recent writes on failover.']
    ],
    quiz: [
      ['A user updates their profile, refreshes, and sees the old value. Most likely cause?', ['The read hit a replica that had not received the write yet', 'The write failed', 'The cache is too large', 'The primary is down'], 'Classic replication lag.'],
      ['Read replicas help with…', ['Read throughput', 'Write throughput', 'Reducing data size', 'Cross-shard joins'], 'Writes still all go through the primary.'],
      ['With asynchronous replication, the primary crashes. What may be lost?', ['Recent writes not yet replicated', 'All data', 'Nothing', 'Only reads'], 'The replica is promoted without the tail of the log.']
    ],
    explain: ['Explain how read replicas work, what replication lag causes, and how you deal with it.', ['Writes to the primary, reads from replicas', 'Async replication → lag → stale reads', 'A read-your-writes technique', 'Replicas do not scale writes / failover trade-offs']],
    duck: ['I just saved my changes — why does the page still show the old data?', 'Why don\'t replicas help when there are too many writes?']
  });

  T({
    id: '2.5', mod: '2', title: 'Sharding', tag: 'Partitioning, consistent hashing, hot keys',
    analogy: 'Splitting one enormous phone book into volumes. A–F, G–M… is easy to look up in, but the "S" volume ends up twice the size of the others.',
    points: [
      'Sharding splits data across machines by a shard key, so each machine holds and writes only a part.',
      'Range partitioning: efficient range scans, but prone to hot spots (e.g. everything recent lands on the last shard).',
      'Hash partitioning: even spread, but range queries must ask every shard.',
      'Directory partitioning: a lookup table maps keys to shards — flexible, at the cost of an extra hop and another thing to keep available.',
      'Consistent hashing: adding or removing a node moves only about 1/N of the keys, not nearly all of them as with hash-mod-N. Virtual nodes even out the spread.',
      'Hot keys (the celebrity problem) overload one shard regardless of scheme. Cross-shard queries and transactions become hard — pick a key that keeps related data together.'
    ],
    pitfall: 'Choosing a shard key before listing the queries. A key that scatters your most common query across every shard is worse than no sharding.',
    say: 'I\'d shard by user ID with consistent hashing, since nearly every query is scoped to one user; the celebrity accounts need special handling as hot keys.',
    cards: [
      ['Compare range, hash and directory partitioning.', 'Range: good range scans, risk of hot spots. Hash: even distribution, range queries hit all shards. Directory: flexible key→shard mapping, extra lookup hop.'],
      ['Why use consistent hashing instead of hash(key) mod N?', 'With mod N, changing N remaps almost every key. Consistent hashing moves only about 1/N of the keys when a node is added or removed.'],
      ['What is a hot key and why does sharding not fix it?', 'A single key with disproportionate traffic (e.g. a celebrity). All its load lands on one shard whatever the partitioning scheme. Mitigate with caching, splitting the key, or dedicated capacity.']
    ],
    quiz: [
      ['You shard by hash(key) mod 4 and add a fifth node. What happens?', ['Most keys move to a different shard', 'About a fifth of keys move', 'No keys move', 'Only new keys are affected'], 'Changing the modulus remaps nearly everything — the motivation for consistent hashing.'],
      ['Time-series data sharded by timestamp range suffers from…', ['All new writes landing on the latest shard', 'Uneven read latency only', 'Too many shards', 'Nothing'], 'A monotonically increasing key creates a write hot spot.'],
      ['Which query is hardest after sharding by user ID?', ['"Top 10 most active users across the whole system"', '"All orders for user 42"', '"Profile of user 42"', '"Latest post by user 42"'], 'It spans every shard; the others live on one.']
    ],
    explain: ['Explain how sharding works, how you would choose a shard key, and what gets harder.', ['Split data by a shard key across machines', 'Range vs hash (vs directory) trade-offs', 'Consistent hashing limits data movement', 'Costs: hot keys, cross-shard queries/transactions']],
    duck: ['How do you decide which machine a piece of data lives on?', 'What breaks when one user is a thousand times more popular than the rest?'],
    lab: {
      type: 'sort', brief: 'Which partitioning strategy?', buckets: ['Range', 'Hash', 'Directory'],
      items: [['Efficient scans over a time range', 0], ['Even spread, but range queries hit every shard', 1], ['A lookup service maps each tenant to a shard', 2], ['Sequential keys pile onto the last shard', 0], ['Move one big customer to its own shard without rehashing', 2], ['Pairs with consistent hashing to limit data movement', 1]]
    }
  });

  T({
    id: '2.6', mod: '2', title: 'CAP theorem', tag: 'Consistency vs availability in practice',
    analogy: 'Two people editing one document with their internet cut. Either both stop editing until it reconnects, or both carry on and you merge the differences later. There is no third option.',
    points: [
      'When a network partition happens, a distributed system must choose: stay consistent (refuse some requests) or stay available (answer with possibly stale data).',
      'Partitions are not optional in a real network, so the practical choice is CP or AP during the partition.',
      '"Consistency" here means every read sees the latest write (linearizability) — not the C in ACID.',
      'PACELC extends it: if Partitioned, choose A or C; Else, choose Latency or Consistency. Even a healthy system trades speed for consistency.',
      'Quorums make it tunable: with N replicas, W write acks and R read acks, R + W > N guarantees a read overlaps the latest write.'
    ],
    pitfall: 'Saying "pick two of three" as though you could opt out of partitions, or labelling a whole database "CP" regardless of how it is configured.',
    say: 'With N=3, W=2, R=2, reads overlap the latest write. If I drop to R=1 for speed, I\'m accepting possibly stale reads.',
    cards: [
      ['State the CAP theorem precisely.', 'During a network partition, a distributed system must choose between consistency (every read sees the latest write) and availability (every request gets a non-error response). It cannot guarantee both.'],
      ['What does PACELC add to CAP?', 'Even without a partition there is a trade-off: if Partition → Availability vs Consistency; Else → Latency vs Consistency.'],
      ['What is the quorum condition for strongly consistent reads?', 'R + W > N: the set of replicas read always overlaps the set that acknowledged the latest write.']
    ],
    quiz: [
      ['N=3 replicas, W=2. Smallest R that guarantees reading the latest write?', ['2', '1', '3', '0'], 'R + W > N → R > 1 → R = 2.'],
      ['The "C" in CAP refers to…', ['Linearizability — reads reflect the latest write', 'ACID constraints such as foreign keys', 'Compression', 'Cache coherence'], 'A frequent mix-up. ACID consistency is about invariants within a transaction.'],
      ['What does PACELC point out that CAP does not?', ['A latency vs consistency trade-off exists even with no partition', 'Partitions never happen', 'Availability is always best', 'Consistency is free'], 'Waiting for more replicas to agree costs latency in normal operation.']
    ],
    explain: ['Explain the CAP theorem, a common misunderstanding of it, and how quorums let you tune the trade-off.', ['During a partition: choose C or A', 'Partitions are unavoidable — so not really "pick two"', 'C means linearizability, not ACID (or mentions PACELC)', 'Quorum: R + W > N']],
    duck: ['Why can\'t the two halves just carry on and both be right?', 'What do R, W and N mean, and why does R + W > N matter?'],
    lab: { type: 'estimate', kinds: ['quorum'], n: 4 }
  });

  T({
    id: '2.7', mod: '2', title: 'Specialised stores', tag: 'The right shape of database',
    analogy: 'A kitchen has a fridge, a freezer, a spice rack and a wine cellar. All "store food", but you would not keep ice cream on the spice rack.',
    points: [
      'Relational: joins, transactions, flexible queries. The default until something forces otherwise.',
      'Key-value / document: lookups by known key at very high rate; simple access patterns.',
      'Object storage: large immutable blobs — images, video, backups. Cheap and durable; the database keeps only the reference.',
      'Time-series: append-heavy timestamped points, queried by time range and aggregated; old data is downsampled.',
      'Search index: full-text and faceted queries via an inverted index. Vector store: nearest-neighbour search over embeddings.',
      'Graph: queries that walk relationships many hops deep. Every extra store is another system to keep in sync and operate.'
    ],
    pitfall: 'Storing images or video in the relational database, or adding a fifth specialised store to avoid one slightly awkward query.',
    say: 'Order data lives in Postgres; product images in object storage behind a CDN; I\'d only add a search index once full-text search is in scope.',
    cards: [
      ['Where do large files (images, video) belong, and what goes in the database?', 'In object storage. The database stores only metadata and the object\'s key/URL.'],
      ['What workload defines a time-series database?', 'Append-heavy writes of timestamped data points, queried by time range with aggregation, often with retention and downsampling of old data.'],
      ['What is the hidden cost of adding another specialised store?', 'Operational burden and consistency: another system to run, monitor and keep in sync with the source of truth.']
    ],
    quiz: [
      ['"Find the 10 items most similar to this embedding." Which store?', ['Vector store', 'Relational', 'Time-series', 'Object store'], 'Approximate nearest-neighbour search over embeddings.'],
      ['"Friends of friends within three hops." Which store fits best?', ['Graph database', 'Key-value store', 'Object store', 'Time-series database'], 'Multi-hop relationship traversal is what graph stores optimise.'],
      ['Where should a 2 GB uploaded video live?', ['Object storage, with its key in the database', 'A BLOB column in the relational database', 'The cache', 'A message queue'], 'Blobs in a database bloat it, slow backups and waste expensive storage.']
    ],
    explain: ['Explain how you decide which kind of data store to use, with three examples.', ['Relational as the default, and why', 'At least three specialised stores matched to workloads', 'Blobs go to object storage', 'Each extra store has an operational/sync cost']],
    duck: ['Why not put everything in one database?', 'Why not use a different perfect database for every single feature?'],
    lab: {
      type: 'sort', brief: 'Match the workload to the store.', buckets: ['Relational', 'Key-value', 'Object store', 'Time-series', 'Vector', 'Graph'],
      items: [['Orders with multi-row transactions and joins', 0], ['Session lookup by session ID at 100k QPS', 1], ['4 GB video files', 2], ['CPU metrics per host every 10 seconds', 3], ['The 10 most similar embeddings', 4], ['Friends-of-friends within 3 hops', 5], ['Product images and backups', 2], ['Shopping cart fetched by user ID', 1]]
    }
  });

  T({
    id: '2.8', mod: '2', title: 'Unique ID generation', tag: 'UUID, Snowflake, ULID, sequences',
    analogy: 'Numbering tickets at an event with many entrances. One shared counter causes a queue; giving each gate its own prefix lets every gate number tickets on its own without clashes.',
    points: [
      'Database auto-increment: simple and ordered, but one database is a bottleneck and single point of failure, and IDs leak your volume.',
      'UUID v4: 128 random bits, no coordination at all. Not sortable, and random inserts are unkind to B-tree indexes.',
      'Snowflake-style: 64 bits = timestamp + machine ID + per-machine sequence. Roughly time-sortable, fits a bigint, generated locally — but needs unique machine IDs and sane clocks.',
      'ULID / UUID v7: 128 bits with a timestamp prefix, so they sort by creation time without coordination.',
      'Decide by asking: must it be sortable by time? fit in 64 bits? be unguessable? be generated without a network call?'
    ],
    pitfall: 'Exposing sequential IDs publicly. Competitors can count your orders, and attackers can enumerate resources.',
    say: 'I\'ll use Snowflake-style 64-bit IDs: time-ordered for pagination, generated on each app server with no central bottleneck.',
    cards: [
      ['What are the three parts of a Snowflake-style ID?', 'A timestamp, a machine/worker ID, and a per-machine sequence number — packed into 64 bits.'],
      ['Two downsides of UUID v4 as a primary key?', 'It is not time-sortable, and its randomness scatters inserts across a B-tree index (poor locality). It is also twice the size of a 64-bit ID.'],
      ['Why avoid a single auto-increment sequence at large scale?', 'It is a write bottleneck and single point of failure, does not work across shards without coordination, and exposes volume.']
    ],
    quiz: [
      ['You need IDs that sort by creation time, fit in 64 bits and are generated without a central service. Choose…', ['Snowflake-style IDs', 'UUID v4', 'A single DB auto-increment', 'Random 32-bit integers'], 'Timestamp prefix + machine ID + sequence gives all three.'],
      ['What can break Snowflake-style generation?', ['A machine\'s clock moving backwards', 'Too many readers', 'Large payloads', 'Network partitions between clients'], 'IDs embed the timestamp; a clock step back can produce duplicates or disorder.'],
      ['Why might sequential public IDs be a problem?', ['They reveal volume and let others enumerate resources', 'They are too long', 'They cannot be indexed', 'They are random'], 'Order #1042 tells everyone you have had about a thousand orders.']
    ],
    explain: ['Explain the main ways to generate unique IDs in a distributed system and how you would choose.', ['Auto-increment and its limits', 'UUID v4: no coordination, not sortable', 'Snowflake: timestamp + machine + sequence, 64-bit, sortable', 'Selection criteria: sortability, size, coordination, guessability']],
    duck: ['Why can\'t every server just count 1, 2, 3…?', 'What is inside a Snowflake ID and why those parts?'],
    lab: {
      type: 'sort', brief: 'Which ID scheme?', buckets: ['UUID v4', 'Snowflake', 'DB auto-increment'],
      items: [['No coordination at all, but random order hurts index locality', 0], ['64 bits: timestamp + machine ID + sequence', 1], ['Roughly time-sortable and fits in a bigint', 1], ['Simple, but one database is a bottleneck', 2], ['Exposes how many orders you have', 2], ['Sensitive to the clock going backwards', 1], ['128 bits; collisions are negligibly unlikely', 0]]
    }
  });

})(SD.T);
