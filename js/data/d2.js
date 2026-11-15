// "More detail" for the key ideas of each topic: one entry per key idea, [text, source keys or 'calc'].
// Shown under each key idea on the Learn station (js/app.js). Checked by tools/check-content.mjs.
window.SD = window.SD || {}; SD.deep = SD.deep || {};
SD.deep["2.1"] = [
 [
  "A stateless server keeps nothing between requests: everything it needs arrives in the request or is fetched from the database. So any copy can answer any request, and ten copies behind a load balancer behave exactly like one faster server.\n\nA database is the opposite. Suppose you naively ran two independent copies, each holding an account balance of $100. Two withdrawals of $80 arrive at the same moment, one at each copy. Each copy checks its own balance, sees $100, and approves. You have paid out $160 from a $100 account, and the two copies now disagree about history. To prevent that, the copies must coordinate on every write, and the coordination is the cost: either one copy is the single writer and the rest follow it (replicas, 2.4), or the data is split so that each piece has exactly one owner (sharding, 2.5).\n\nThe interview consequence: 'just add more database servers' is never a complete sentence. You have to say which copy accepts writes and how the others learn about them.",
  "calc"
 ],
 [
  "Connections are the easiest limit to see. PostgreSQL does not use a thread per connection; its postmaster spawns a whole new backend process every time a connection is requested, and those processes coordinate through shared memory and semaphores. That is why the default cap is only about 100, and why the documentation notes that raising max_connections makes the server allocate more of certain resources, including shared memory. A thousand mostly idle connections still cost a thousand processes.\n\nThe other four limits are the same story in different places. CPU runs out when queries do too much work per call, typically scanning rows they did not need. Disk I/O runs out when the data being touched is not in memory, so each read waits on storage. Memory runs out when the hot data no longer fits in the buffer cache, which turns into the I/O problem. Lock contention appears when many transactions want the same rows and queue behind each other, so the machine looks idle while requests wait.\n\nThe follow-up question is 'which one is it?' Each limit has a different fix, so you measure before you choose.",
  [
   "pg-connect-estab",
   "pg-runtime-connection"
  ]
 ],
 [
  "The order follows cost and reversibility. An index is one statement and can be dropped again: it turns a scan of every row into a lookup. A pooler such as PgBouncer sits between the application and the database; in transaction mode it lends a server connection to a client only while a transaction runs, then returns it to the pool. Worked example: 6,000 transactions a second, each holding a connection for 5 ms, keep 6,000 × 0.005 = 30 connections busy, so a pool of a few dozen serves a thousand clients. The catch is that this mode breaks session-level features, so the application has to cooperate.\n\nA bigger machine needs no code change, but Microsoft's sharding guide describes vertical scaling as only postponing the limits temporarily. Caches and replicas take read traffic away; the same guide says to reach for them when the bottleneck is read volume, because they avoid the cross-shard query complexity that sharding brings. Sharding is last because it is the only rung that changes how every query is routed, and it is hard to undo.",
  [
   "pgbouncer-features",
   "azure-sharding"
  ]
 ],
 [
  "'As far as the numbers require' means doing the capacity sum before proposing a rung. Hello Interview's guide gives usable anchors: a well-tuned database server handles tens of thousands of queries per second, a single Postgres instance holds a few terabytes comfortably, and at 10K writes per second with 100 GB of data you do not need sharding yet. It calls sharding too early the biggest mistake candidates make.\n\nThe complexity cost is concrete. Microsoft's guide lists what you take on once data is split: a query that spans shards becomes a parallel fan-out whose latency is set by the slowest shard, transactions across shards need coordination protocols that add latency and failure modes, and each shard must be backed up and restored separately. A cache adds invalidation; replicas add lag. None of these go away once adopted.\n\nSo the interview move is to state the load, name the lowest rung that covers it, and say what number would send you to the next one, for example: writes exceeding what one primary can sustain.",
  [
   "hi-core-concepts",
   "azure-sharding"
  ]
 ]
];
SD.deep["2.2"] = [
 [
  "Picture the index as a tree of fixed-size pages. PostgreSQL's documentation describes it as a multi-level structure in which internal pages point down to the next level and leaf pages hold entries pointing at table rows; typically over 99% of pages are leaves. A lookup walks from the root to one leaf, so its cost is the height of the tree. Illustrative arithmetic: if a page held 200 entries, three levels would reach 200 × 200 × 200 = 8 million keys and four levels 1.6 billion. That is why read latency is predictable, and because the leaves are in sorted order the same structure answers equality, ranges and ORDER BY.\n\nWrites pay for that order. A new key has to go into the one leaf where it belongs, so keys arriving in random order touch pages scattered all over the index (the random I/O). When the target leaf is full, a page split moves part of its entries to a new page and adds a pointer in the parent, which can split in turn.\n\nWhere it bites: every extra index on a table is another tree that each insert must update.",
  [
   "pg-btree",
   "pg-indexes-types"
  ]
 ],
 [
  "Follow one write through RocksDB. It is inserted into the memtable, a sorted structure in memory, and appended to a log file that is only ever written sequentially; the log exists so the memtable can be rebuilt after a crash. Nothing on disk is looked up or modified, which is why Cassandra's documentation describes its LSM write path as append-only and free of read lookups. When the memtable fills it becomes immutable, a background thread writes it out as a sorted file in level 0, and new writes carry on into a fresh memtable.\n\nBecause files are never edited, an update or delete is just a newer entry that hides the old one. Compaction is the clean-up: it reads files in, merges them into larger files in the next level, and drops the overwritten and deleted entries.\n\nThe cost has only been deferred. Every byte is rewritten several times as it moves down the levels, and RocksDB's overview says overall write throughput depends directly on how fast compaction can run. If writes outpace it, RocksDB deliberately slows or stops incoming writes: the write stall you see as latency spikes.",
  [
   "rocksdb-overview",
   "cassandra-storage-engine",
   "rocksdb-write-stalls"
  ]
 ],
 [
  "Why several files? The newest value of a key may be in the memtable or in any file not yet merged. RocksDB's tuning guide spells out the worst case for a point lookup: every file in level 0, because those files overlap in key range, plus at most one file in each deeper level, where files do not overlap. A key that does not exist is the most expensive case of all, because nothing stops the search early.\n\nA Bloom filter is a small in-memory summary kept per file that answers one question with two possible replies, as Cassandra's documentation puts it: the data definitely does not exist in this file, or it probably does. 'Probably' is the false-positive rate. RocksDB's default of 10 bits per key gives about 1% false positives, and the guide says that with filters a Get in most cases does only one file read. Lowering the rate costs memory: Cassandra notes that a 1% filter needs about three times the memory of a 10% one.\n\nThe follow-up to know: Bloom filters do not help range scans, which still have to look in every level.",
  [
   "rocksdb-tuning",
   "cassandra-bloom"
  ]
 ],
 [
  "Row-oriented means all the fields of one record sit next to each other in the same disk block. An OLTP request looks like 'fetch order 4711' or 'insert this order': it wants every column of one row, or of a handful of rows. With row storage that is one block to read or write, found through an index. The Redshift documentation makes exactly this argument: OLTP transactions mostly read and write all the values of entire records, one or a few records at a time, so row-wise storage is optimal for them.\n\nThink of a paper form per customer in a filing cabinet. Pulling one customer's whole form is a single trip. The same layout is terrible for 'what is the average age of all customers?', because you must pull every form to read one line on each.\n\nThat second case is the pitfall in this topic. An analytical scan on the transactional database reads every block of the table to use a few columns, competing for the same CPU, memory and disk as the short transactions, which is why reporting gets moved to a replica or a warehouse.",
  [
   "redshift-columnar"
  ]
 ],
 [
  "Column-oriented storage flips the layout: each disk block holds the values of one column for many rows. A query such as total revenue per region needs two or three columns out of perhaps a hundred, over every row. Redshift's documentation gives the arithmetic: on a 100-column table, a query using five columns reads about five percent of the data, whereas a row store would read the blocks containing the 95 unneeded columns as well. ClickHouse's documentation makes the same point: you can keep many columns just in case and not pay for the unused ones at query time.\n\nThere is a second gain. A block that holds only one type of data, say dates or country codes, can use a compression scheme chosen for that data type, which cuts disk space and I/O again.\n\nThe price is the mirror image of the row store's: reading or writing one whole record now touches a separate place for every column. So analytical stores are usually loaded in batches, fed asynchronously from the transactional database rather than taking its single-row writes.",
  [
   "redshift-columnar",
   "clickhouse-columnar"
  ]
 ]
];
SD.deep["2.3"] = [
 [
  "'Aside' means the cache sits beside the database and the application does the work; the cache never talks to the database itself. Facebook's memcache paper calls this a demand-filled look-aside cache: the web server asks the cache by key, and if the item is missing it reads the database and puts the result into the cache for next time. Nothing is cached until somebody asks for it.\n\nThat laziness is why it is the default. AWS's ElastiCache guide lists the advantages: only data that is actually requested takes up memory, and a failed cache node is not fatal, because an empty replacement simply produces misses that refill it. The costs are also stated plainly: a miss takes three trips (ask the cache, query the database, write the cache), so the first reader of every key is slower than with no cache at all, and nothing updates a cached entry when the database row changes.\n\nSo the natural follow-up is: how does the copy get refreshed? That is the invalidation question, and Microsoft's description of the pattern warns that cache-aside does not guarantee the cache and the store stay consistent.",
  [
   "fb-memcache",
   "aws-elasticache-strategies",
   "azure-cache-aside"
  ]
 ],
 [
  "Both patterns answer the question 'what if the cache were updated at write time instead of on a miss?' In write-through, every write goes to the cache and to the database before the user gets an answer. AWS's guide gives the trade: the cached data is always current, but every write involves two trips, which adds latency. Two less obvious costs are listed there too. A freshly added or replaced cache node has missing data until those rows are next written, so write-through is normally combined with lazy loading. And most data that is written is never read, so the cache fills with entries nobody wants unless they carry a TTL.\n\nWrite-behind acknowledges the write once it is in the cache and persists later. Apache Ignite's documentation describes the mechanism: updates accumulate in a queue and are flushed to the database asynchronously as a bulk operation, triggered by time or by queue size, and only the last update to an entry is written. That is where the speed comes from, and also the risk: updates still in the queue when a node crashes are gone, although the user was told they succeeded.",
  [
   "aws-elasticache-strategies",
   "apache-ignite-write-behind"
  ]
 ],
 [
  "A TTL is a deadline attached to each entry: after it passes, the entry counts as missing and the next read reloads it. So a 5-minute TTL (the default in Microsoft's cache-aside example) means a reader can see data up to five minutes old, and no worse. Deleting the key when the row is written shortens that window to almost nothing, with the TTL kept as a safety net.\n\nWhy delete rather than write the new value into the cache? Take two writers. A sets a name to 'Ann', then B sets it to 'Bea'; the database ends with 'Bea'. Their cache updates travel separately, and if B's arrives first and A's second, the cache ends with 'Ann' and stays wrong until the TTL. Facebook's memcache paper calls this a stale set, caused by concurrent updates getting reordered, and gives the reason for its choice: deletes are idempotent. Two deletes in either order leave the same result, an empty slot that the next reader fills from the database.\n\nIt is safer, not perfect: a reader who fetched the old row can still write it back just after the delete, which Facebook closes with leases.",
  [
   "fb-memcache",
   "azure-cache-aside"
  ]
 ],
 [
  "A cache has a fixed memory budget, so once it is full every new entry has to push an old one out. The eviction policy is the guess about which entry will be missed least. LRU guesses that what has not been touched for longest will not be touched soon. LFU guesses that what has been touched fewest times is least valuable. The difference shows with a burst: one scan over a million cold keys makes them all 'recent', and under LRU can push out a small set of keys that are read thousands of times a day; under LFU those keep their place.\n\nReal caches approximate both. Redis does not keep a perfectly ordered list; its documentation says it samples a small number of keys at random and evicts the one idle longest, and for LFU it keeps a small probabilistic counter per key that decays over time, so yesterday's hot key can eventually leave. Redis recommends allkeys-lru as a good default when a subset of keys is accessed far more than the rest.\n\nThe interview point: eviction is not expiry. An entry can vanish long before its TTL, so code must always treat a miss as normal.",
  [
   "redis-eviction"
  ]
 ],
 [
  "Stampede arithmetic: a key that takes 2 seconds to recompute and is read 5,000 times a second expires. Until the first recomputation finishes, every reader misses, so about 2 × 5,000 = 10,000 requests each start the same expensive query. The fix is to let one caller recompute and make the rest wait or take the old value. Facebook's leases do this inside memcached: on a miss the server hands out a token for that key at most once every 10 seconds, and other readers are told to retry shortly, by which time the value is usually back. On keys prone to this, the paper reports peak database queries falling from 17K/s to 1.3K/s.\n\nCold start is the same failure for every key at once. Google's SRE book offers a useful distinction: with a latency cache the service can carry its load when the cache is empty; with a capacity cache it cannot, and the cache has quietly become a hard dependency. Its remedies are to overprovision, or to add load slowly so the cache warms first. Facebook warms a new cluster by reading from a warm cluster's cache instead of the database.",
  [
   "fb-memcache",
   "sre-cascading-failures"
  ]
 ],
 [
  "Only misses reach the database, so its load is the miss rate times the traffic. Take 20,000 reads a second. At a 95% hit ratio, 5% miss: 20,000 × 0.05 = 1,000 queries a second. At 90%, 10% miss: 2,000. The hit ratio moved by five points, which sounds small, but the miss ratio went from 5% to 10%, and the miss ratio is the one the database feels. Its load doubled.\n\nThe effect gets sharper the better the cache is. At 99% hits the database sees 200 queries a second; slipping to 98% doubles that to 400, a one-point change. And if the cache is emptied, the database sees all 20,000: twenty times the 95% figure and a hundred times the 99% figure.\n\nTwo practical consequences. First, watch the miss ratio rather than the hit ratio, because '95% versus 90%' hides a factor of two that '5% versus 10%' shows. Second, anything that lowers the hit ratio, such as a shorter TTL, a deploy that changes key names, or a smaller cache evicting more, is a database capacity change, and should be sized as one before it ships.",
  "calc"
 ]
];
SD.deep["2.4"] = [
 [
  "The thing being streamed is the primary's own write-ahead log (WAL): the append-only record of every change that the database already writes for crash recovery. PostgreSQL's documentation describes a standby as a server in continuous recovery, continuously applying the WAL it receives from the primary over a TCP connection. A replica is therefore not running your INSERT statements again; it is replaying the same low-level changes in the same order, which is why it ends up an exact copy.\n\nOne writer is what keeps it simple. Because every change passes through a single log, there is one agreed order of events and replicas never have to resolve conflicts between themselves. The analogy is a lecturer writing on a board while students copy line by line: many people can read the notes, but only one hand holds the chalk.\n\nRouting is the application's job, or a proxy's. GitHub's incident report describes the usual arrangement: writes go to the primary of each cluster and reads are delegated to replicas in the vast majority of cases. The follow-up that comes next is always 'and what if the replica is behind?'",
  [
   "pg-warm-standby",
   "github-oct21"
  ]
 ],
 [
  "Asynchronous means the primary tells the client 'committed' as soon as the change is safe on its own disk, and ships the log afterwards. The replica then has to receive that log and replay it. The gap between the two is replication lag. PostgreSQL's documentation puts it at typically under one second if the standby can keep up with the load, and says to measure it by comparing log positions: the primary's current write position against the last position the standby has received or replayed. A growing gap between received and replayed means WAL is arriving faster than it can be applied.\n\nTimeline of the bug: at t = 0 a user saves a new display name and the primary commits. At t = 20 ms their browser reloads the profile and the read is routed to a replica. If that replica is 200 ms behind, it returns the old name. Nothing is broken or lost; the replica is simply showing the past.\n\nLag is not constant, which is where it bites. A bulk import, a long query on the replica or a slow network link can stretch milliseconds into seconds or minutes, and bugs that never appeared in testing appear under load.",
  [
   "pg-warm-standby"
  ]
 ],
 [
  "All three fixes answer one question: has this replica seen this user's last write? Reading from the primary for a few seconds after a write assumes the answer is yes once the window passes. It is simple, but it is a guess about lag; if lag exceeds the window the bug returns. Pinning the session to the primary is always correct but sends that user's reads back to the machine you were trying to relieve.\n\nWaiting for the replica replaces the guess with a measurement. Every commit has a position in the log. PostgreSQL exposes the primary's current position as pg_current_wal_lsn and the position a standby has replayed as pg_last_wal_replay_lsn. So the application remembers the position of the user's write, for example in their session, and a read may use any replica whose replayed position has reached it; otherwise it waits briefly or falls back to the primary.\n\nPostgreSQL can also do the waiting at commit time: with synchronous_commit set to remote_apply the commit does not return until the standby has replayed it and made it visible, which the documentation says allows load balancing with causal consistency, at the price of much larger commit delays.",
  [
   "pg-warm-standby",
   "pg-synchronous-commit"
  ]
 ],
 [
  "Synchronous replication changes when the client hears 'committed'. In PostgreSQL each commit waits until a standby confirms the commit record is written to its disk as well, so the data can only be lost if primary and standby both fail. Two costs follow. Every write now includes a network round trip and a remote disk flush, and the documentation notes that locks stay held while waiting, so contention rises too. And if the synchronous standby crashes, commits may never complete: the primary is healthy but writes hang. That is why you name several candidates, and why PostgreSQL lets the level be set per transaction, so that the important 10% of changes can wait while the rest do not.\n\nThe subtle part is 'on disk' versus 'visible'. The default level waits for the standby to flush the log, not to replay it. A query on the standby a millisecond later can still see old data, because the change is stored but not yet applied. Only remote_apply waits for replay, and the documentation warns this causes much larger commit delays.\n\nSo in an interview say which you need: no lost writes (synchronous flush), or fresh replica reads (apply).",
  [
   "pg-warm-standby",
   "pg-synchronous-commit"
  ]
 ],
 [
  "Replicas help reads because a read can be answered by any one copy. A write cannot be divided that way: to stay a copy, every replica must apply every change. Arithmetic: if the primary spends 80% of its capacity on writes, each replica spends roughly that much replaying them, leaving about 20% of each machine for reads. Three more replicas add read capacity and exactly zero write capacity.\n\nFailover is the second job, and asynchronous replication makes it lossy. PostgreSQL's documentation says the data lost is proportional to the replication delay at the moment of failover: whatever the primary had acknowledged but not yet shipped. GitHub's October 2018 incident shows the harder version. A 43-second network break led the failover tool to promote primaries in another data center, while the old primaries held a few seconds of writes that had never been replicated. Each side now had writes the other lacked, so they could not simply fail back; recovery involved restoring from backups, the service was degraded for 24 hours and 11 minutes, and one busy cluster alone had 954 stranded writes to reconcile.\n\nExpect the follow-up: who decides the primary is dead, and what happens to its un-replicated writes?",
  [
   "pg-warm-standby",
   "github-oct21"
  ]
 ],
 [
  "CDC is replication with a different audience. A replica reads the primary's log to become another copy of the database; a CDC tool such as Debezium reads the same log and turns each change into an event that other systems consume, typically through Kafka. The search index, the cache and the warehouse each apply the events in their own way.\n\nThe alternative it replaces is the dual write: the service writes the row to the database, then writes to the search index. If the process dies between the two, or the second call fails, the two stores disagree and nothing will ever notice. Polling a 'last updated' column is the other alternative, and it misses deletes and intermediate states. Debezium's documentation lists what reading the log gives instead: all changes are captured, including deletes, with a delay in the millisecond range for MySQL and PostgreSQL, and no change to the data model.\n\nIts use-case page gives the two classic applications: evicting exactly the affected cache entries without the writing service knowing a cache exists, and driving a search index from the change stream so it converges on the database. The catch is that consumers lag slightly, like any asynchronous replica.",
  [
   "debezium-features",
   "debezium-use-cases"
  ]
 ]
];
SD.deep["2.5"] = [
 [
  "A shard key is one column whose value decides, for every row, which machine owns it. The router applies a rule to that value, and each machine then stores, indexes and writes only its own slice. This is the first rung on the ladder that adds write capacity, because no machine has to apply all the writes any more.\n\nNotion's sharding of Postgres is a concrete case. They chose the workspace ID as the key, since users typically query within a single workspace at a time, which avoids most cross-shard joins; every table reachable from a block carries that key so related rows land together. They created 480 logical shards spread evenly over 32 physical databases, 15 per database.\n\nThe key choice is the design decision, and the interviewer will ask you to justify it. Microsoft's guide lists the properties to argue from: the key should be immutable (changing it means moving the row to another machine), have high cardinality (a boolean can only ever give two shards), spread data and load evenly, and match the dominant query so that most requests resolve against one shard.",
  [
   "notion-sharding",
   "azure-sharding"
  ]
 ],
 [
  "Range partitioning keeps the keys in sorted order and cuts the order into contiguous slices: each shard owns everything between two boundaries. Microsoft's guide uses orders keyed by month: October on shard A, November on B, December on C, stored in date order inside each. 'All orders in November' is then one request to one machine, already sorted, which no other scheme gives you.\n\nThe hot spot comes from the same property. Sorted placement means neighbouring keys share a shard, and in real workloads activity clusters on neighbouring keys. With a time-based or auto-increment key, every new row has a key larger than all existing ones, so every insert goes to the last range. Google's Spanner documentation states it directly: a monotonic key directs all insert traffic to a single server. You have many machines and the write throughput of one.\n\nSplitting the hot range does not help, because the newest half is hot again immediately. Microsoft's guide makes the same point: rebalancing may not fix uneven load when activity concentrates on adjacent keys. The usual answers are to lead the key with something well spread (a user or tenant ID before the timestamp), or to hash.",
  [
   "azure-sharding",
   "spanner-schema"
  ]
 ],
 [
  "Hashing runs the key through a function whose output looks random, and places the row by that output instead of by the key itself. The useful consequence is that neighbouring keys are torn apart: user 55 and user 56 land on unrelated shards, so sequential IDs, recent sign-ups or alphabetical clusters no longer pile up in one place. Microsoft's guide adds that requests can be routed by computing the hash, with no map to maintain.\n\nThe cost is the mirror image. A range query such as 'users 1,000 to 2,000' or 'orders from last week' needs keys that sit next to each other, and the hash has deliberately scattered them over every shard. The router has to send the query everywhere and merge the answers, known as scatter-gather, and the slowest shard sets the latency.\n\nFigma made exactly this trade when sharding Postgres. Many of their keys were auto-incrementing or timestamp-prefixed, which would have concentrated data on one shard, so they route on a hash of the shard key and accept that range scans on shard keys are less efficient, because that query pattern was uncommon in their code. That last clause is the part to copy: check your queries first.",
  [
   "azure-sharding",
   "figma-sharding"
  ]
 ],
 [
  "Range and hash both compute the shard from the key. A directory stores the answer instead: a table says 'tenant 812 lives on shard C', and the router looks it up. Because placement is data, not a formula, you can put anything anywhere: give a large customer a dedicated shard, keep a regulated tenant on particular servers, or move one tenant by copying its rows and updating one entry, without touching anyone else.\n\nThe price is that every request now depends on the directory. It adds a lookup, which is normally cached, and it must be at least as available as the database, because if the map cannot be read no data can be found. It also has to be kept correct during moves.\n\nMost real systems use a small directory on top of a hash. Microsoft's guide calls this virtual partitioning: keys map to many virtual shards, and a table maps those to fewer physical machines, so rebalancing means reassigning virtual shards rather than rehashing all the data. Notion's 480 logical shards on 32 databases is this pattern; splitting a database later moves whole logical shards.",
  [
   "azure-sharding",
   "notion-sharding"
  ]
 ],
 [
  "Start with why mod N fails. With hash mod 4, growing to 5 shards changes the formula for every key. A key stays put only if hash mod 4 equals hash mod 5, which holds for 4 of every 20 consecutive hash values, so about 80% of all rows move, although a fifth shard only needed 20% of them.\n\nConsistent hashing fixes the formula so it does not mention N. As the Dynamo paper describes it, the hash output is treated as a ring; each node gets a position on it, and a key belongs to the first node found walking clockwise from the key's own position. Add a node and it takes over only the arc just before it, from one neighbour; every other key stays where it was. The Chord paper notes that the fraction moved is the minimum needed to keep load balanced.\n\nOne random position per node gives uneven arcs, and a new node relieves only one neighbour. So Dynamo gives each physical node many positions, called virtual nodes. Arcs average out, a departing node's load spreads over all the others, and a bigger machine can simply be given more positions.",
  [
   "dynamo-sosp07",
   "chord"
  ]
 ],
 [
  "Every scheme maps a key to exactly one shard, so all traffic for one key value lands on one machine. Hashing spreads different keys apart; it cannot spread one key. If one tenant produces 30% of the traffic, the shard holding it gets that 30% plus its share of everyone else. AWS's DynamoDB guide warns that such 'hot' partitions get throttled while capacity elsewhere sits unused, and gives a telling example: device ID is a good key if devices are similarly busy and a bad one if a single device is far more popular than the rest. Discord saw the effect at scale: one busy channel made a hot partition, and latency rose for every query served by the nodes holding it.\n\nRemedies work on the key, not the scheme: cache the hot item, give it a dedicated shard, or split it into sub-keys.\n\nThe second cost is anything that spans shards. Microsoft's guide says cross-shard queries fan out to all shards, and cross-shard transactions need protocols such as two-phase commit that add latency and failure modes; Figma chose not to support atomic cross-shard transactions at all. Hence the advice: choose the key so the common operations stay within one shard.",
  [
   "dynamodb-partition-key",
   "discord-trillions",
   "azure-sharding",
   "figma-sharding"
  ]
 ]
];
