// Module 2 — Data Layer.
(function (T) {

  T({
    id: '2.1', mod: '2', title: 'The single-DB bottleneck', tag: 'When the database becomes the limit',
    analogy: 'A restaurant can hire more waiters in an afternoon. It cannot clone the one walk-in fridge that every dish depends on.',
    points: [
      'Stateless servers scale by adding copies. The database holds the one shared truth, so it cannot simply be copied.',
      'What actually runs out: connections, CPU, disk I/O, memory for hot data, and lock contention.',
      'Escalation ladder, cheapest first: indexes and query fixes → connection pooling → bigger machine → cache → read replicas → sharding.',
      'Each rung buys time at a higher complexity cost. Climb only as far as the numbers require.'
    ],
    pitfall: 'Jumping straight to sharding when a missing index or a cache would have removed 90% of the load.',
    say: 'One Postgres primary is fine at this scale. If reads grow I\'ll add a cache and replicas first; sharding only if writes outgrow a single primary.',
    refs: [
      ['pg-connect-estab', 'Each PostgreSQL connection is a server process — “PostgreSQL implements a "process per user" client/server model. In this model, every client process connects to exactly one backend process.”'],
      ['pg-runtime-connection', 'max_connections — “The default is typically 100 connections, but might be less if your kernel settings will not support it (as determined during initdb).”'],
      ['pgbouncer-features', 'Connection pooling — “A server connection is assigned to a client only during a transaction. When PgBouncer notices that the transaction is over, the server will be put back into the pool.”'],
      ['azure-sharding', 'Vertical scaling buys time — “To postpone these limitations temporarily, you can scale vertically by adding disk capacity, processing power, memory, and network connections.”'],
      ['azure-sharding', 'Replicas and caches before sharding — “Read replicas and caching layers can offload read traffic without the cross-shard query complexity that sharding introduces.”'],
      ['hi-core-concepts', 'Interview relevance — “The biggest mistake with sharding is doing it too early. A well-tuned single database with read replicas can handle way more than most candidates think.”']
    ],
    cards: [
      ['Why does the database become the bottleneck before the application tier?', 'Application servers are stateless and scale horizontally. The database holds shared state that must stay consistent, so it cannot be cloned freely.'],
      ['List the database scaling ladder from cheapest to most expensive.', 'Indexes/query tuning → connection pooling → vertical scaling → caching → read replicas → sharding.'],
      ['Name three resources a single database runs out of.', 'Any three: connections, CPU, disk I/O, memory (buffer cache), lock contention.']
    ],
    quiz: [
      ['A query is slow because it scans a whole table. First fix?', ['Add an appropriate index', 'Shard the table', 'Add read replicas', 'Put a cache in front of it'], 'Cheapest rung first. An index can turn a scan into a lookup.', ['pg-indexes-types']],
      ['200 app servers each open 50 connections to one PostgreSQL primary. Most likely problem?', ['Connection exhaustion — put a pooler in front', 'Too many indexes', 'Replication lag', 'Lock contention on the write-ahead log during commits'], '10,000 connections is far beyond what one server handles well; each is a server process. A pooler multiplexes them onto a few.', ['pg-connect-estab', 'pg-runtime-connection', 'pgbouncer-features']],
      ['Why not shard from day one?', ['It adds permanent complexity that most systems never need', 'Shards cannot be replicated', 'It makes single-key lookups slower than on an unsharded database', 'It cannot be introduced later'], 'Cross-shard queries, rebalancing and operations all get harder. Earn it with numbers.', ['azure-sharding', 'hi-core-concepts']],
      ['A primary is at 85% CPU. 70% of that is one dashboard query scanning 30 days of orders; writes are light. Cheapest effective fix?', ['Fix that query, or move it to a read replica', 'Shard the orders table by customer ID', 'Put a cache in front of every query', 'Move to the largest instance available'], 'Find the dominant consumer first: index or pre-aggregate the query, or run reporting on a replica. Sharding addresses write volume or data size, neither of which is the constraint here.', ['azure-sharding', 'aws-rds-read-replicas']]
    ],
    explain: ['Explain why the database tends to be the bottleneck and the order in which you would address it.', ['Stateless tiers scale out; shared state does not', 'What runs out (connections, I/O, locks…)', 'The ladder: index → pool → vertical → cache → replicas → shard', 'Climb only as far as the numbers demand']],
    duck: ['Why can\'t you just run ten copies of the database like you do with web servers?', 'What would you try before splitting the data up?']
  });

  T({
    id: '2.2', mod: '2', title: 'DB internals', tag: 'B-tree vs LSM, OLTP vs OLAP',
    analogy: 'A B-tree is a filing cabinet kept perfectly sorted: finding is quick, but each new paper means opening the right drawer. An LSM tree is an in-tray: drop papers on top instantly, and sort the piles together later.',
    points: [
      'B-tree: sorted pages updated in place. Fast, predictable point and range reads; writes cost random I/O. The default index structure in PostgreSQL and MySQL/InnoDB.',
      'LSM tree: writes go to a log and an in-memory table, are flushed to immutable sorted files, and merged by background compaction. Very high write throughput. RocksDB, Cassandra.',
      'LSM reads may check several files; Bloom filters let them skip files that cannot contain the key.',
      'OLTP: many small transactions touching a few rows — row-oriented storage.',
      'OLAP: few large scans aggregating a few columns over many rows — column-oriented storage.'
    ],
    pitfall: 'Running heavy analytical scans on the transactional database. Different workload, different engine — and the scans starve the transactions.',
    say: 'This is ingest-heavy, so an LSM-based store suits the write path; analytics goes to a columnar warehouse fed asynchronously.',
    refs: [
      ['pg-indexes-types', 'B-tree is the default index — “By default, the CREATE INDEX command creates B-tree indexes, which fit the most common situations.”'],
      ['mysql-innodb-physical', 'InnoDB — “With the exception of spatial indexes, InnoDB indexes are B-tree data structures.”'],
      ['bigtable-paper', 'Memtable and SSTables — “the recently committed ones are stored in memory in a sorted buffer called a memtable; the older updates are stored in a sequence of SSTables.”'],
      ['rocksdb-overview', 'Flush — “When a memtable is full, it becomes an immutable memtable and a background thread starts flushing its contents to storage.”'],
      ['rocksdb-overview', 'Compaction — “In compaction, some files are periodically read in and merged to form larger files, often going into the next LSM level (such as L1, up to Lmax).”'],
      ['rocksdb-tuning', 'Bloom filters — “Point lookups must consult all files in level 0 and at most one file from each other levels. However, bloom filters help by greatly reducing read amplification.”'],
      ['rocksdb-tuning', 'The three costs — “amplification factors: write amplification, read amplification and space amplification.”'],
      ['rocksdb-write-stalls', 'Write stalls — “RocksDB has extensive system to slow down writes when flush or compaction can\'t keep up with the incoming write rate.”'],
      ['cstore', 'Column stores for analytics — “With a column store architecture, a DBMS need only read the values of columns required for processing a given query, and can avoid bringing into memory irrelevant attributes.”'],
      ['redshift-columnar', 'Row stores for OLTP — “typically one record or a small number of records at a time. As a result, row-wise storage is optimal for OLTP databases.”']
    ],
    cards: [
      ['Describe the write path of an LSM tree.', 'Append to a write-ahead log and insert into an in-memory memtable; when full, flush it as an immutable sorted file (SSTable); background compaction merges files.'],
      ['B-tree vs LSM tree — which is better for what?', 'B-tree: read-heavy workloads needing predictable point/range reads. LSM: write-heavy workloads, because writes are sequential appends.'],
      ['OLTP vs OLAP — workload and storage layout?', 'OLTP: many short transactions on a few rows, row-oriented. OLAP: large scans and aggregations over a few columns, column-oriented.']
    ],
    quiz: [
      ['Which structure favours 200k writes/s with rare reads?', ['LSM tree', 'B-tree', 'A heavily indexed heap table', 'Bitmap index'], 'Sequential appends and deferred sorting give the highest write throughput.', ['cassandra-storage-engine', 'oneil-lsm']],
      ['Point lookups for keys that do not exist are slow on an LSM store. Why, and what fixes it?', ['A miss may check every file; Bloom filters let most be skipped', 'Missing keys are kept in a separate table that is slower to search', 'The memtable is too small', 'Compaction is deleting keys too eagerly'], 'A Bloom filter answers "definitely not here" cheaply, without a disk read.', ['rocksdb-tuning', 'cassandra-bloom']],
      ['"Total revenue per region for the last year" over 2 billion rows is best served by…', ['A column-oriented OLAP store', 'A row-oriented OLTP database', 'A key-value cache', 'A document store'], 'It scans a few columns of many rows — exactly what columnar storage is built for.', ['cstore', 'clickhouse-columnar']],
      ['An LSM-based store shows periodic write-latency spikes and disk usage well above the logical data size. What is the mechanism?', ['Compaction — background merges compete for I/O and space', 'B-tree page splits during bulk loads', 'Bloom filters that have grown too large to be held in memory', 'Random in-place writes to the memtable'], 'Merges can stall foreground writes, and stale versions occupy space until they are merged away. LSM trees trade cheap writes for background work: write, read and space amplification are tuned against each other.', ['rocksdb-write-stalls', 'rocksdb-tuning']]
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
    refs: [
      ['azure-cache-aside', 'Cache-aside — “When an application updates information, it writes the change to the data store and then invalidates the corresponding item in the cache.”'],
      ['azure-cache-aside', '…and its consistency gap — “The Cache-Aside pattern doesn\'t guarantee consistency between the data store and the cache.”'],
      ['aws-elasticache-strategies', 'Write-through — “The write-through strategy adds data or updates data in the cache whenever data is written to the database.”'],
      ['apache-ignite-write-behind', 'Write-behind can lose updates — “Enabling write-behind caching increases performance by performing asynchronous updates, but this can lead to a potential drop in consistency as some updates could be lost due to node failures or crashes.”'],
      ['fb-memcache', 'Delete, do not update — “We choose to delete cached data instead of updating it because deletes are idempotent.”'],
      ['fb-memcache', 'Leases — “We introduce a new mechanism we call leases to address two problems: stale sets and thundering herds.”'],
      ['xfetch', 'Stampede — “When a frequently-accessed cache item expires, multiple requests to that item can trigger a cache miss and start regenerating that same item at the same time.”'],
      ['aws-bl-caching', 'Request coalescing — “To remedy this issue we use request coalescing, where the servers or external cache ensure that only one pending request is out for uncached resources.”'],
      ['aws-bl-caching', 'A cache hides the real load — “Dependencies reduce their fleet sizes accordingly, and the database is scaled down.”'],
      ['redis-eviction', 'Eviction — “The Redis LRU algorithm uses an approximation of the least recently used keys rather than calculating them exactly.”'],
      ['hi-core-concepts', 'Interview relevance — “But caching introduces real complexity. The hardest part is invalidation.”']
    ],
    cards: [
      ['Describe cache-aside.', 'The application checks the cache first. On a miss it reads the database, writes the result into the cache, and returns it. Writes go to the database and invalidate the cached key.'],
      ['Write-through vs write-behind?', 'Write-through: write cache and database synchronously — a fresh cache but slower writes. Write-behind: write the cache and persist asynchronously — fast, but risks losing data if the cache fails.'],
      ['What is a cache stampede and one fix?', 'Many requests miss the same hot key at once and all hit the database to recompute it. Fixes: a per-key lock or lease, request coalescing, or refreshing before expiry. (Jittered TTLs solve a related problem: many different keys expiring at the same moment.)']
    ],
    quiz: [
      ['Hit ratio falls from 95% to 90%. Database load…', ['Doubles', 'Rises by 5%', 'Halves', 'Is unchanged'], 'Misses go from 5% to 10% of traffic — twice as many.', 'calc'],
      ['Which pattern risks losing acknowledged writes?', ['Write-behind', 'Cache-aside', 'Write-through', 'Read-through'], 'The write lives only in the cache until it is flushed.', ['apache-ignite-write-behind']],
      ['A cache fleet restarts empty during peak traffic. What is the risk?', ['Every request misses and hits a database sized for the cached load', 'Cached data is permanently lost and has to be rebuilt by hand from backups', 'Writes start failing until the cache has refilled', 'None — the cache refills within a few seconds'], 'The cache was hiding the real load. Warm it up or ramp traffic gradually.', ['aws-bl-caching', 'sre-cascading-failures']],
      ['After writing to the database, a service SETs the new value into the cache. Two concurrent writers can leave the cache stale indefinitely. What is the safer pattern?', ['Delete the key after the write and let the next read repopulate it', 'Set the cache first, then write the database', 'Set the cache twice, a few milliseconds apart, so the second write always wins', 'Use a longer TTL so that entries change less'], 'Deletes are idempotent and do not depend on ordering; concurrent SETs can land in the wrong order.', ['fb-memcache', 'azure-cache-aside']],
      ['A key holding a query that takes 2 s to compute is read 5,000 times/s, and it expires. What happens, and what prevents it?', ['Thousands recompute it at once; let one recompute while others wait', 'One request recomputes it and the others are answered from the cache\'s disk', 'The cache extends the TTL automatically under load', 'Nothing — expiry of a single key is harmless'], 'A stampede. Fixes: a per-key lock or lease, request coalescing, or refreshing before expiry.', ['xfetch', 'aws-bl-caching']]
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
      'Synchronous replication means an acknowledged write is already on a replica (no loss on failover), but every write waits for that replica — slower, and a replica outage can block writes. Replica reads are only guaranteed fresh if the commit also waits for the replica to apply the change (e.g. PostgreSQL remote_apply).',
      'Replicas scale reads only. They also provide failover: promote one if the primary dies (losing any un-replicated writes if async).',
      'Change Data Capture (CDC) streams the same change log to other systems: search indexes, caches, warehouses.'
    ],
    pitfall: 'Promising "we\'ll add replicas" for a write-heavy workload. Every replica still has to apply every write.',
    say: 'Reads go to async replicas; right after a user writes, their reads go to the primary for a few seconds so they always see their own change.',
    refs: [
      ['pg-warm-standby', 'Asynchronous by default, so commits can be lost on failover — “PostgreSQL streaming replication is asynchronous by default. If the primary server crashes then some transactions that were committed may not have been replicated to the standby server, causing data loss.”'],
      ['pg-warm-standby', 'Replication lag — “there is a small delay between committing a transaction in the primary and the changes becoming visible in the standby.”'],
      ['pg-synchronous-commit', 'remote_apply — “commits will wait until replies from the current synchronous standby(s) indicate they have received the commit record of the transaction and applied it, so that it has become visible to queries on the standby(s)”'],
      ['pg-warm-standby', 'Synchronous standbys can block commits — “Such transaction commits may never be completed if any one of the synchronous standbys should crash.”'],
      ['mysql-gtid-functions', 'Waiting for a replica to reach a position — “Wait until the server has applied all of the transactions whose global transaction identifiers are contained in gtid_set”'],
      ['github-oct21', 'A real failover (GitHub, October 2018) — “Connectivity between these locations was restored in 43 seconds, but this brief outage triggered a chain of events that led to 24 hours and 11 minutes of service degradation.”'],
      ['github-oct21', '…that forked history — “Because the database clusters in both data centers now contained writes that were not present in the other data center, we were unable to fail the primary back over”'],
      ['debezium-features', 'Change data capture — “Unlike other approaches, such as polling or dual writes, log-based CDC as implemented by Debezium: Ensures that all data changes are captured.”']
    ],
    cards: [
      ['What is replication lag and what user-visible bug does it cause?', 'The delay before a write on the primary appears on a replica. A user writes, then reads from a lagging replica and does not see their own change.'],
      ['Give two ways to provide read-your-writes consistency with async replicas.', 'Any two: read from the primary for a short window after a write; pin the user\'s session to the primary; have the client pass the write position and wait for the replica to reach it.'],
      ['Sync vs async replication — the trade-off?', 'Sync: no loss of acknowledged writes on failover, but slower writes and dependence on replica availability (replica reads can still trail unless commits wait for apply). Async: fast writes, but lag and possible loss of recent writes on failover.']
    ],
    quiz: [
      ['A user updates their profile, refreshes, and sees the old value. Most likely cause?', ['The read hit a replica that had not received the write yet', 'The write was rolled back', 'The primary is overloaded', 'The connection pool was exhausted, so the write was silently dropped'], 'Classic replication lag.', ['pg-warm-standby', 'pg-hot-standby']],
      ['Writes are 80% of the load on a saturated primary. Will three more read replicas fix it?', ['No — every replica must apply every write as well', 'Yes — the write load spreads evenly over four machines', 'Yes, provided replication is synchronous', 'No — replicas are only useful as backups'], 'Replicas scale reads only. To relieve a write-bound primary you have to reduce or partition the writes.', ['azure-sharding']],
      ['With asynchronous replication, the primary crashes and a replica is promoted. What may be lost?', ['Recent acknowledged writes that had not been replicated', 'All data since the last backup', 'Nothing — an asynchronous replica is always fully up to date', 'Only uncommitted transactions'], 'The replica is promoted without the tail of the log. Clients were told those writes succeeded.', ['pg-warm-standby']],
      ['You need read-your-writes without sending all of a user\'s reads to the primary. Which mechanism is precise?', ['Record the log position of their write; use replicas that have passed it', 'Wait 100 ms after every write before reading', 'Read from two replicas and take the newer value', 'Turn on synchronous commit to the primary\'s own disk, so replicas see it at once'], 'Time-based workarounds guess at the lag; tracking the position measures it.', ['mysql-gtid-functions', 'pg-synchronous-commit']],
      ['During a 43-second network partition, automation promotes a replica in another region. When the link returns, each side holds writes the other never received. What does this show?', ['Async failover can fork history; stranded writes need manual repair', 'The failover was too slow to be useful', 'Replicas should never be placed in another region from their primary', 'Synchronous replication had been misconfigured'], 'This is GitHub\'s October 2018 incident: 43 seconds of partition led to more than 24 hours of degraded service. No data was ultimately lost, but the stranded writes had to be reconciled by hand.', ['github-oct21']]
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
    refs: [
      ['azure-sharding', 'Range — “The range strategy is easy to implement and works well with range queries.”'],
      ['azure-sharding', 'Hash — “The hash strategy provides a better chance of even data and load distribution.”'],
      ['azure-sharding', 'Directory — “In the lookup strategy, also called the directory-based strategy, the sharding logic implements a map that routes a data request to the shard that contains that data by using the shard key.”'],
      ['azure-sharding', 'hash mod N — “With a standard hash function, such as hash(key) mod N, adding or removing a shard reassigns most keys and triggers large-scale data migration.”'],
      ['chord', 'Consistent hashing moves the minimum (an O(1/N) fraction) — “fraction of the keys are moved to a different location— this is clearly the minimum necessary to maintain a balanced load.”'],
      ['dynamo-sosp07', 'Virtual nodes — “instead of mapping a node to a single point in the circle, each node gets assigned to multiple points in the ring.”'],
      ['spanner-schema', 'Monotonic keys hot-spot — “Because Spanner uses key ranges to distribute data across servers, a monotonic key directs all insert traffic to a single server, creating a bottleneck.”'],
      ['dynamodb-partition-key', 'Hot keys — “A partition key design that doesn\'t distribute I/O requests effectively can create "hot" partitions that result in throttling and use your provisioned I/O capacity inefficiently.”'],
      ['notion-sharding', 'A real shard-key choice — “we used the workspace ID as the partition key. Since users typically query data within a single workspace at a time, we avoid most cross-shard joins.”'],
      ['figma-sharding', 'What gets harder — “we chose not to support atomic cross-shard transactions because we could work around cross-shard transaction failures.”']
    ],
    cards: [
      ['Compare range, hash and directory partitioning.', 'Range: good range scans, risk of hot spots. Hash: even distribution, range queries hit all shards. Directory: flexible key→shard mapping, extra lookup hop.'],
      ['Why use consistent hashing instead of hash(key) mod N?', 'With mod N, changing N remaps almost every key. Consistent hashing moves only about 1/N of the keys when a node is added or removed.'],
      ['What is a hot key and why does sharding not fix it?', 'A single key with disproportionate traffic (e.g. a celebrity). All its load lands on one shard whatever the partitioning scheme. Mitigate with caching, splitting the key, or dedicated capacity.']
    ],
    quiz: [
      ['You shard by hash(key) mod 4 and add a fifth shard. Roughly what fraction of keys move?', ['~80%', '~20%', '~25%', 'None — only new keys use the new shard'], 'A key stays only if hash mod 4 equals hash mod 5 — true for 4 of every 20 hash values. Consistent hashing would move about a fifth.', 'calc'],
      ['Time-series data is range-partitioned by timestamp. What goes wrong?', ['All new writes land on the latest partition', 'Reads become uneven across the older partitions', 'Old partitions fill up', 'Range scans touch every partition'], 'A monotonically increasing key creates a write hot spot.', ['bigtable-schema', 'spanner-schema']],
      ['Which query is hardest after sharding by user ID?', ['"Top 10 most active users across the whole system"', '"All orders for user 42"', '"Profile of user 42"', '"Latest post by user 42"'], 'It spans every shard; the others live on one.', ['azure-sharding']],
      ['A multi-tenant SaaS shards by tenant_id, and one tenant produces 30% of all traffic. Does hashing the key fix it?', ['No — one key is one shard; isolate that tenant or sub-split it', 'Yes — hashing balances any workload evenly', 'Yes, once there are enough virtual nodes', 'No — switch to range sharding on tenant name, which balances big tenants'], 'Hashing spreads keys, not the load within a key. A hot key overloads its shard whatever the scheme.', ['dynamodb-partition-key', 'discord-trillions']]
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
    analogy: 'Two people editing one document with their internet cut. Either both stop editing until it reconnects, or both carry on and you merge the differences later — or you limit what each may do while cut off.',
    points: [
      'When a network partition happens, a distributed system must choose: stay consistent (refuse some requests) or stay available (answer with possibly stale data).',
      'Partitions are not optional in a real network, so the question is what each operation does while one lasts: refuse, or answer with possibly stale data. It is not all-or-nothing — the choice can differ per operation, and real systems often land in between.',
      '"Consistency" here means every read sees the latest write (linearizability) — not the C in ACID.',
      'PACELC extends it: if Partitioned, choose A or C; Else, choose Latency or Consistency. Even a healthy system trades speed for consistency.',
      'Quorums make it tunable: with N replicas, W write acks and R read acks, R + W > N means every read set overlaps every acknowledged write set, so a read normally sees the latest acknowledged write. It is not full linearizability: sloppy quorums, concurrent writes and partially failed writes can still give stale or conflicting results.'
    ],
    pitfall: 'Saying "pick two of three" as though you could opt out of partitions, or labelling a whole database "CP" regardless of how it is configured.',
    say: 'With N=3, W=2, R=2, every read overlaps the latest acknowledged write. If I drop to R=1 for speed, I\'m accepting possibly stale reads.',
    refs: [
      ['gilbert-lynch', 'The theorem — “consistency, availability, and partition tolerance. It is impossible to achieve all three.”'],
      ['gilbert-lynch', 'Consistency here means linearizability — “any read operation that begins after a write operation completes must return that value, or the result of a later write operation.”'],
      ['gilbert-lynch', 'Availability — “every request received by a non-failing node in the system must result in a response.”'],
      ['brewer-cap-twelve-years-later', 'Not "pick two" — “The "2 of 3" formulation was always misleading because it tended to oversimplify the tensions among properties.”'],
      ['abadi-pacelc', 'PACELC — “else (E), when the system is running normally in the absence of partitions, how does the system trade off latency (L) and consistency (C)?”'],
      ['dynamo-sosp07', 'Quorums — “Setting R and W such that R + W > N yields a quorum-like system.”'],
      ['dynamo-sosp07', 'Sloppy quorums — “it does not enforce strict quorum membership and instead it uses a "sloppy quorum"; all read and write operations are performed on the first N healthy nodes from the preference list”'],
      ['kleppmann-cap', 'Labelling databases CP or AP — “They are neither "CP" nor "AP", they are just "P", whatever that means.”'],
      ['kleppmann-cap', 'Quorums are not linearizability — “You sometimes see people claiming that quorum reads and writes guarantee linearizability, but I think it would be unwise to rely on it”']
    ],
    cards: [
      ['State the CAP theorem precisely.', 'During a network partition, a distributed system must choose between consistency (every read sees the latest write) and availability (every request to a non-failing node gets a response). It cannot guarantee both.'],
      ['What does PACELC add to CAP?', 'Even without a partition there is a trade-off: if Partition → Availability vs Consistency; Else → Latency vs Consistency.'],
      ['What quorum condition makes read and write sets overlap, and what does it not guarantee?', 'R + W > N: with strict quorums, the replicas read overlap the replicas that acknowledged the latest write. It does not by itself give linearizability — concurrent writes, sloppy quorums and partially failed writes can still surface stale or conflicting values.']
    ],
    quiz: [
      ['N=3 replicas, W=2. Smallest R such that every read overlaps the last acknowledged write?', ['2', '1', '3', '0'], 'R + W > N → R > 1 → R = 2.', ['dynamo-sosp07']],
      ['The "C" in CAP refers to…', ['Linearizability — reads reflect the latest completed write', 'ACID consistency, such as foreign-key and uniqueness constraints', 'Convergence of replicas over time', 'Causal ordering of events'], 'A frequent mix-up. ACID consistency is about application invariants within a transaction.', ['gilbert-lynch', 'kleppmann-cap']],
      ['The network is healthy. A database offers "read from one replica" (fast) or "read from a quorum" (slower, fresher). Which framework names this trade-off?', ['PACELC — else, with no partition, latency versus consistency', 'CAP — it covers behaviour without a partition as well as during one', 'ACID isolation levels, which trade latency for consistency per query', 'BASE — basically available, soft state, eventually consistent'], 'CAP only describes behaviour during a partition. PACELC adds the everyday latency cost of consistency.', ['abadi-pacelc']],
      ['N=3, W=2, R=2 with a sloppy quorum. During a failure, a write is accepted by nodes outside the key\'s usual replicas. What follows?', ['Overlap is no longer guaranteed — a read can miss that write', 'Nothing — the quorum arithmetic still holds', 'The write is rejected until the key\'s usual replicas have returned', 'Reads become linearizable during the failure'], 'Sloppy quorums buy write availability by giving up the overlap guarantee.', ['dynamo-sosp07']],
      ['Is "database X is CP, database Y is AP" a sound way to classify them?', ['No — it depends on configuration and on the operation', 'Yes — each database falls into exactly one class', 'Yes, provided the defaults are never changed', 'No — every database is CA until it is partitioned'], 'Consistency levels and write concerns change the answer per operation, and many systems meet neither of the theorem\'s strict definitions.', ['kleppmann-cap', 'cassandra-dynamo']]
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
    refs: [
      ['s3-data-durability', 'Object storage — “Designed to provide 99.999999999% durability and 99.99% availability of objects over a given year.”'],
      ['pg-wiki-binary-files', 'Why not blobs in the database — “Backups can take significantly longer”'],
      ['lucene-index-format', 'Search indexes — “Lucene\'s terms index falls into the family of indexes known as an inverted index. This is because it can list, for a term, the documents that contain it.”'],
      ['pgvector', 'Vector search is approximate — “You can add an index to use approximate nearest neighbor search, which trades some recall for speed.”'],
      ['hnsw', 'HNSW — “We present a new approach for the approximate K-nearest neighbor search based on navigable small world graphs with controllable hierarchy (Hierarchical NSW, HNSW).”'],
      ['influx-downsample', 'Time-series retention and downsampling — “A natural solution is to downsample the data; keep the high precision raw data for only a limited time, and store the lower precision, summarized data longer.”'],
      ['debezium-features', 'Keeping derived stores in sync — “Unlike other approaches, such as polling or dual writes, log-based CDC as implemented by Debezium: Ensures that all data changes are captured.”'],
      ['neo4j-graph-concepts', 'Graph model — “Relationships describe a connection between a source node and a target node.”']
    ],
    cards: [
      ['Where do large files (images, video) belong, and what goes in the database?', 'In object storage. The database stores only metadata and the object\'s key/URL.'],
      ['What workload defines a time-series database?', 'Append-heavy writes of timestamped data points, queried by time range with aggregation, often with retention and downsampling of old data.'],
      ['What is the hidden cost of adding another specialised store?', 'Operational burden and consistency: another system to run, monitor and keep in sync with the source of truth.']
    ],
    quiz: [
      ['A RAG system must return the 10 nearest of 200M embeddings in under 50 ms. What does the index trade away?', ['Exactness — it returns most, not provably all, true neighbours', 'Durability — vector indexes are held in memory only and lost on restart', 'Nothing — vector indexes return exact results', 'Metadata — vectors cannot be filtered by attributes'], 'Exact search compares against every vector. Approximate nearest-neighbour indexes such as HNSW trade recall for speed, tunably.', ['hnsw', 'pgvector']],
      ['Users search products by words in the description, ranked by relevance. Why is a B-tree index on the text column the wrong tool?', ['It orders whole values; search needs an inverted index from terms to documents', 'B-tree indexes cannot be built on text columns at all, only on numeric and date ones', 'B-trees are too slow for reads on any large table', 'A B-tree would need rebuilding after every insert'], 'A search index lists, for each term, the documents that contain it — which is what makes term lookup and ranking fast.', ['lucene-index-format', 'elastic-bottom-up']],
      ['Where should a 2 GB uploaded video live?', ['Object storage, with its key in the database', 'A BLOB column in the relational database, for consistency', 'The cache, with a long TTL', 'A message queue'], 'Object storage is built for large, immutable blobs; the database keeps only the reference.', ['s3-data-durability', 'pg-wiki-binary-files']],
      ['Product search is served from a search index fed from PostgreSQL. The service writes to both in the request handler. What is the flaw, and the usual fix?', ['A crash between the writes leaves them inconsistent; stream changes instead', 'Search indexes cannot accept writes from applications', 'The two writes should be issued in parallel rather than in sequence, to save time', 'Nothing, as long as both writes are retried on failure'], 'Dual writes are not atomic. Keep one source of truth; change data capture reads its log, so the index follows it.', ['debezium-features', 'debezium-use-cases']],
      ['Metrics: 1M series, one point every 10 s, kept for 2 years. Which features of a time-series store matter most?', ['Retention and downsampling of old data', 'Multi-row ACID transactions', 'Multi-hop relationship traversals', 'Full-text relevance ranking'], 'Old data is rarely read at full resolution, so raw points are kept briefly, then rolled up and expired.', ['influx-downsample', 'timescale-retention']]
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
      'UUID v4: 128 bits, 122 of them random, no coordination at all. Not sortable, and random inserts are unkind to B-tree indexes.',
      'Snowflake-style: 64 bits = timestamp + machine ID + per-machine sequence. Roughly time-sortable, fits a bigint, generated locally — but needs unique machine IDs and sane clocks.',
      'ULID / UUID v7: 128 bits with a millisecond timestamp prefix, so they sort by creation time (to the millisecond) without coordination. Time-ordered keys keep B-tree inserts local, but can hot-spot a range-partitioned store.',
      'Decide by asking: must it be sortable by time? fit in 64 bits? be unguessable? be generated without a network call?'
    ],
    pitfall: 'Exposing sequential IDs publicly. Competitors can count your orders, and attackers can enumerate resources. Random IDs make guessing harder, but they are not access control — check authorisation on every request.',
    say: 'I\'ll use Snowflake-style 64-bit IDs: time-ordered for pagination, generated on each app server with no central bottleneck.',
    refs: [
      ['rfc9562', 'UUID v4 — “randomly generate the exact required number of bits for random_a, random_b, and random_c (122 bits total)”'],
      ['rfc9562', 'Random UUIDs and index locality — “UUID versions that are not time ordered, such as UUIDv4 (described in Section 5.4), have poor database-index locality.”'],
      ['rfc9562', 'UUID v7 — “Time-ordered monotonic UUIDs benefit from greater database-index locality because the new values are near each other in the index.”'],
      ['ulid-spec', 'ULID — “Within the same millisecond, sort order is not guaranteed”'],
      ['snowflake-readme', 'Snowflake layout — “time - 41 bits (millisecond precision w/ a custom epoch gives us 69 years)”'],
      ['snowflake-readme', 'Clock moving backwards — “snowflake will refuse to generate ids until a time that is after the last time we generated an id.”'],
      ['snowflake-announce', 'Snowflake — “To generate the roughly-sorted 64 bit ids in an uncoordinated manner, we settled on a composition of: timestamp, worker number and sequence number.”'],
      ['flickr-ticket-servers', 'Database ticket servers — “We divide responsibility between the two boxes by dividing the ID space down the middle, evens and odds”'],
      ['vitess-sequences', 'Sequential IDs leak — “Using auto_increment can leak confidential information about a service.”'],
      ['rfc9562', 'IDs are not access control — “Implementations SHOULD NOT assume that UUIDs are hard to guess. For example, they MUST NOT be used as security capabilities (identifiers whose mere possession grants access).”'],
      ['figma-sharding', 'Time-ordered keys can hot-spot a sharded store — “many of the sharding keys that we had picked used auto-incrementing or Snowflake timestamp-prefixed IDs. This would have resulted in significant hotspots where a single shard contained the majority of our data.”']
    ],
    cards: [
      ['What are the three parts of a Snowflake-style ID?', 'A timestamp, a machine/worker ID, and a per-machine sequence number — packed into 64 bits.'],
      ['Two downsides of UUID v4 as a primary key?', 'It is not time-sortable, and its randomness scatters inserts across a B-tree index (poor locality). It is also twice the size of a 64-bit ID.'],
      ['Why avoid a single auto-increment sequence at large scale?', 'It is a write bottleneck and single point of failure, does not work across shards without coordination, and exposes volume.']
    ],
    quiz: [
      ['You need IDs that sort by creation time, fit in 64 bits and are generated without a central service. Choose…', ['Snowflake-style IDs', 'UUID v4', 'A single database auto-increment', 'UUID v7'], 'Timestamp + machine ID + sequence gives all three: roughly time-sorted, 64 bits, no coordination per ID. UUID v7 is time-ordered but 128 bits.', ['snowflake-readme', 'snowflake-announce']],
      ['What can break Snowflake-style generation?', ['A machine\'s clock moving backwards', 'Two machines sharing a datacenter', 'A burst of readers', 'A network partition between generators'], 'IDs embed the timestamp, so a clock stepping backwards could cause duplicates. Twitter\'s Snowflake refuses to issue IDs until the clock catches up.', ['snowflake-readme', 'snowflake-idworker']],
      ['Why might sequential public IDs be a problem?', ['They reveal volume and let others enumerate resources', 'They are too long for URLs', 'They cannot be indexed as efficiently as random identifiers', 'They collide across regions'], 'Order #1042 tells everyone you have had about a thousand orders. Random IDs make guessing harder, but they are not access control: authorise every request.', ['vitess-sequences', 'owasp-idor', 'rfc9562']],
      ['A 64-bit Snowflake ID has a 41-bit millisecond timestamp, a 10-bit machine ID and a 12-bit sequence. What are the hard limits?', ['4,096 IDs per millisecond per machine, 1,024 machines, about 69 years', '1,024 IDs per millisecond per machine, 4,096 machines, about 139 years', '4,096 IDs per second per machine, 1,024 machines, about 69 years', 'No limit while clocks stay in sync'], '2¹² = 4,096, 2¹⁰ = 1,024, and 2⁴¹ ms ≈ 69.7 years from the chosen epoch.', ['snowflake-readme']],
      ['A table uses UUID v4 primary keys and inserts slow down as the index outgrows memory. Which change keeps IDs decentralised but restores insert locality?', ['Time-ordered IDs such as UUID v7 or ULID, so new keys land together', 'Storing the UUID v4 as text instead of binary, so that the index compares faster', 'Adding a second index on the same UUID column', 'Doubling the database page size'], 'Random keys scatter inserts across the whole B-tree; time-ordered keys land near each other. The same property can hot-spot a range-partitioned store, where hashing the key is the usual answer.', ['rfc9562', 'figma-sharding']]
    ],
    explain: ['Explain the main ways to generate unique IDs in a distributed system and how you would choose.', ['Auto-increment and its limits', 'UUID v4: no coordination, not sortable', 'Snowflake: timestamp + machine + sequence, 64-bit, sortable', 'Selection criteria: sortability, size, coordination, guessability']],
    duck: ['Why can\'t every server just count 1, 2, 3…?', 'What is inside a Snowflake ID and why those parts?'],
    lab: {
      type: 'sort', brief: 'Which ID scheme?', buckets: ['UUID v4', 'Snowflake', 'DB auto-increment'],
      items: [['No coordination at all, but random order hurts index locality', 0], ['64 bits: timestamp + machine ID + sequence', 1], ['Roughly time-sortable and fits in a bigint', 1], ['Simple, but one database is a bottleneck', 2], ['Exposes how many orders you have', 2], ['Sensitive to the clock going backwards', 1], ['128 bits; collisions are negligibly unlikely', 0]]
    }
  });

})(SD.T);
