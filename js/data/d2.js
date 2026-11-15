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
SD.deep["2.6"] = [
 [
  "The proof is short enough to carry in your head. Gilbert and Lynch split the nodes into two groups, G1 and G2, and assume every message between them is lost. A client writes a new value to a node in G1. Later, another client reads from a node in G2. That node has had no way to hear about the write. It has exactly two options: answer with what it has, which is the old value, so the system is no longer consistent; or refuse to answer until it can reach G1, so the system is no longer available. No cleverness helps, because the missing information is on the far side of a link that is down.\n\nThe definition of availability is stricter than everyday usage, and that matters to the argument: every request received by a non-failing node must result in a response. It is not enough that some other node could have answered.\n\nKleppmann's picture is two datacenters with the link between them cut. Brewer's wording of the same choice: let at least one side keep updating and the two become inconsistent, or make one side act as if it is unavailable.",
  [
   "gilbert-lynch",
   "kleppmann-cap",
   "brewer-cap-twelve-years-later"
  ]
 ],
 [
  "'Pick two of three' suggests you could choose consistency plus availability and decline partitions. But a partition is something the network does to you: cables fail, switches misbehave, a datacenter link drops. Kleppmann says partition tolerance just means you are communicating over a network that may delay or drop messages, which describes every network. So the real design question is what to do while one lasts.\n\nBrewer, who proposed CAP, later called the '2 of 3' wording misleading. Partitions are rare, so there is little reason to give up anything when the system is healthy, and the choice can be made at fine granularity: per subsystem, per operation, even per user. His example is a cash machine cut off from the bank. Deposits and balance checks can always run; only withdrawal can break the rule that a balance stays at or above zero, so only withdrawal needs special treatment. Real machines do not refuse it; they cap the net withdrawal at some limit such as $200 while disconnected, and the bank compensates for any overdraft afterwards.\n\nThat is the 'in between'. In an interview, name the operation: adding to a cart stays available during a partition, while charging the card waits for consistency.",
  [
   "brewer-cap-twelve-years-later",
   "kleppmann-cap"
  ]
 ],
 [
  "Linearizability means the system behaves as if there were only one copy of the data and every operation took effect at a single instant. Gilbert and Lynch's working rule: any read that begins after a write has completed must return that value or a later one. Reads never go back in time.\n\nKleppmann's example makes it concrete. Alice and Bob are in the same room checking a sports score on their phones. Alice reloads and announces the final result. Bob reloads after hearing her, and his phone still shows the game in progress. His request started after hers finished yet returned older data: a linearizability violation. Any setup that reads from an asynchronously updated replica can do this.\n\nThe C in ACID is a different idea: a transaction moves the database from one valid state to another, with constraints such as unique keys preserved. A single-node database can be ACID-consistent with no replication at all. Gilbert and Lynch flag the difference themselves, noting that database consistency refers to transactions while theirs is a property of single request and response operations. Mixing them up is a classic interview error, since a 'consistent' transactional database with lagging read replicas is not CAP-consistent.",
  [
   "gilbert-lynch",
   "kleppmann-cap"
  ]
 ],
 [
  "CAP says nothing about the great majority of the time when the network is fine, yet systems give up consistency then too. Abadi's explanation is that as soon as a system replicates data, it faces a trade between consistency and latency. If replication is synchronous, the primary waits until the update has reached the replicas, and the wait is set by the slowest of them, which over a wide-area link is slow. If it is asynchronous, the write returns at once, but a read from a replica may be stale. You pay in milliseconds or in freshness on every single request, not only during failures.\n\nPACELC writes both choices in one line: if Partition, Availability or Consistency; Else, Latency or Consistency. Abadi classifies the default configurations of Dynamo, Cassandra and Riak as PA/EL: they choose availability in a partition and low latency otherwise. Fully ACID systems such as VoltDB are PC/EC and pay both costs.\n\nWhere it shows up: 'should this read go to one nearby replica or wait for a quorum?' is an ELC question, and you face it daily. It is why systems built for fast responses so often replicate asynchronously.",
  [
   "abadi-pacelc"
  ]
 ],
 [
  "The overlap is a counting argument. With N = 3 replicas A, B and C, a write that needs W = 2 acknowledgements is confirmed by, say, A and B. A read that needs R = 2 answers must ask two of the three. Any two of three include A or B, because only one replica lies outside the write set. So the reader sees at least one copy of the new value and picks the newest version. In general, R + W > N means the two sets are together too big to avoid sharing a member. Drop to R = 1 and the read may land on C alone and return the old value. The Dynamo paper reports (3,2,2) as its common setting, and notes the price: an operation is as slow as the slowest of the R or W replicas it waits for.\n\nWhy not linearizable? Dynamo uses a sloppy quorum: if A is unreachable, the write goes to another healthy node D instead. The write succeeded on W nodes, but a later read of A, B and C may not include D, so the overlap is gone. Kleppmann names sloppy quorums and read repair as sources of such edge cases, and calls relying on quorums for linearizability unwise.",
  [
   "dynamo-sosp07",
   "kleppmann-cap"
  ]
 ]
];
SD.deep["2.7"] = [
 [
  "'Default' has a specific reason behind it: a relational database is the one store that does not make you decide your queries in advance. You describe the data as tables, and SQL lets you ask questions later that nobody planned for, joining orders to users to products on the fly. Transactions let several rows change together or not at all, and constraints such as foreign keys make the database itself refuse broken data. Hello Interview's guide describes Postgres as the fit for structured data with clear relationships that needs strong consistency, and recommends starting from a normalised relational model, denormalising only specific hot paths once a read problem is shown.\n\nContrast that with the stores below, each of which is fast because it gives something up. The same guide's example: model posts in DynamoDB keyed by user ID and 'all posts for user X' is one fast lookup, but 'all posts mentioning hashtag Y' means scanning the whole table, because the layout was built for one access pattern.\n\nSo 'something forces otherwise' should be a named pressure: write volume beyond one primary, blobs, full-text ranking, similarity search. Without one, extra stores only add work.",
  [
   "hi-core-concepts"
  ]
 ],
 [
  "A key-value store offers roughly two operations: put a value under a key, and get the value for a key. No joins, no 'where' on other fields, usually no transaction spanning several keys. That narrowness is what makes it fast and easy to spread over machines: the key alone says which machine holds the data, so every request goes straight to one node, and adding nodes adds capacity.\n\nThe Dynamo paper is the classic statement of why this is worth having. Amazon observed that many of its services, including shopping carts, session management, best-seller lists and the product catalogue, only ever stored and fetched data by primary key, and that running them on a relational database meant paying for query machinery they never used while limiting scale and availability. Dynamo's requirements say it outright: simple reads and writes of an item identified by a key, and no operation spans multiple items.\n\nA document store is the same idea with a structured value, such as JSON, that the store can look inside. The interview test is whether you can list the access patterns up front. If every one is 'fetch by ID', this fits; if you keep wanting ad hoc filters, it does not.",
  [
   "dynamo-sosp07"
  ]
 ],
 [
  "Object storage is a giant key-to-file map reached over HTTP: put a whole object under a name, get it back by name. You cannot update the middle of an object or query its contents, and in exchange the store handles replication and scale. Amazon S3 says its standard class stores objects redundantly on multiple devices across at least three Availability Zones, checks integrity with checksums, repairs lost redundancy, and is designed for 99.999999999% durability over a year. Working that out: an annual loss chance of 1 in 100 billion per object means that with 10 million objects you would expect to lose one about every 10,000 years.\n\nWhy not a BLOB column? The PostgreSQL wiki lists the costs: a performance hit, higher memory requirements, and backups that take significantly longer. A 2 GB video in a row makes every backup and every replica carry 2 GB that never changes. The wiki also names the price of keeping files outside: the file and its database row can get out of sync.\n\nThe standard design: metadata and the object key in the database, bytes in object storage, served through a CDN. Clients often upload directly to the object store.",
  [
   "s3-data-durability",
   "pg-wiki-binary-files"
  ]
 ],
 [
  "The workload has three unusual properties. Writes are almost all appends at 'now', rarely updates. Reads ask for a time window and usually an aggregate, such as average CPU per minute over the last day. And the value of a point decays: last hour's ten-second detail matters, last year's does not. Scale makes this pressing: a million series reporting every 10 seconds is 100,000 points a second, or 8.64 billion a day.\n\nDownsampling is the response. InfluxDB's guide walks through a concrete setup: keep raw ten-second data for two hours, continuously aggregate it into 30-minute summaries, and keep those for 52 weeks. One 30-minute summary replaces 180 raw points, so long-range storage shrinks by that factor and a year-long query reads far fewer rows.\n\nExpiry is cheap for a structural reason. These stores partition data by time, so removing old data means dropping whole partitions rather than deleting rows one by one. TimescaleDB's documentation says it drops data by the chunk, and only chunks whose data all falls outside the retention window.\n\nInterview follow-up: what resolution do you keep, for how long, and which aggregates (keep max as well as mean, or spikes disappear).",
  [
   "influx-downsample",
   "timescale-retention"
  ]
 ],
 [
  "A normal index answers 'which rows have this value?'. Text search asks 'which documents contain this word?', the reverse of how documents are stored, hence inverted index: Lucene's documentation says it lists, for a term, the documents that contain it. Elastic's walkthrough gives the mechanics: terms sit in a sorted dictionary, each pointing at the list of documents containing it, and a multi-word query looks up each term and intersects the lists for AND or unions them for OR. The index files are immutable, which is one reason a search index is fed asynchronously and lags the database slightly.\n\nVector search asks a different question: which stored vectors are closest to this one? Being exact means comparing against every vector; pgvector does exactly that by default, with perfect recall. An approximate index trades some recall for speed. HNSW builds a multilayer graph; search starts in the sparse upper layer, hops greedily towards the query, and descends, which the HNSW paper says gives logarithmic scaling. Recall is tunable: in pgvector, raising ef_search (default 40) improves recall at the cost of speed.\n\nWhere it bites: results change after adding the index, so measure recall and do not assume it.",
  [
   "lucene-index-format",
   "elastic-bottom-up",
   "pgvector",
   "hnsw"
  ]
 ],
 [
  "A graph database stores relationships as first-class records. Neo4j's model: nodes are entities, and each relationship connects a source node to a target node with a direction and a type. Queries are traversals: start at a node and follow relationships according to rules, usually visiting only a small part of the graph. Neo4j's own example question is 'what music do my friends like that I don't yet own?'\n\nIn a relational database each hop is another join of the friendships table against itself, and the work multiplies: with 200 friends each, three hops is up to 200 × 200 × 200 = 8 million paths to consider. A graph store is organised around following those links, so it suits queries whose depth is large or unknown. For one or two hops, a join in Postgres is normally fine.\n\nThe closing warning applies to every store in this topic. The second system needs deploying, monitoring, backing up, and above all feeding. Writing to both from the application leaves them inconsistent when one write fails; the usual answer is one source of truth with changes streamed from its log, which Debezium's documentation contrasts with dual writes because it captures all changes. Even then the copy lags.",
  [
   "neo4j-graph-concepts",
   "debezium-features"
  ]
 ]
];
SD.deep["2.8"] = [
 [
  "Auto-increment works because one database hands out every number in turn, and that single turnstile is also the problem: every insert anywhere must go through it, and if it is down nothing can be created. Once data is split over many database servers, each one counting 1, 2, 3 on its own would produce clashing IDs.\n\nFlickr's \"ticket servers\" show the classic patch. A dedicated MySQL box does nothing but issue numbers (a REPLACE INTO on a one-row table, then read LAST_INSERT_ID). To avoid a single point of failure they run two and split the ID space into evens and odds: one server steps by 2 starting at 1, the other by 2 starting at 2, and callers round-robin between them. The cost is visible in their own write-up: the two sides drift out of step, so IDs are unique but no longer strictly in creation order. Vitess softens the bottleneck differently, letting each server reserve a block of, say, 1000 values at a time.\n\n\"Leak your volume\" means this: sign up today and get user 5,000, sign up a week later and get 5,700, and you have measured their weekly growth. Vitess's documentation lists exactly this as a reason not to use auto-increment, alongside trying neighbouring IDs.",
  [
   "flickr-ticket-servers",
   "vitess-sequences"
  ]
 ],
 [
  "Where do the other 6 bits go? A UUID is 128 bits, but 4 are fixed to say \"version 4\" and 2 to mark the variant, so RFC 9562 counts 122 random ones. No coordination is needed because the space is so large that two independent generators picking at random will not meet. My arithmetic, by the birthday bound: the chance of any collision among n IDs is about n squared divided by 2 times 2^122. For a billion IDs that is 10^18 / 10^37, roughly one in 10^19.\n\nThe index cost comes from how a B-tree stores keys: sorted, in pages. Sequential keys always land on the rightmost page, which stays in memory. Random keys land on a random page each time. The RFC's wording is that new values created in succession are not close to each other in the index, so inserts happen at random locations, and the effect on B-trees \"can be dramatic\". Picture filing each new invoice at a random spot in a warehouse of cabinets instead of at the end of the last drawer: once the index is bigger than RAM, most inserts must first fetch a cold page from disk.\n\n\"Not sortable\" matters too: ORDER BY id says nothing about creation order, so you need a separate created_at column and index.",
  [
   "rfc9562"
  ]
 ],
 [
  "Each field buys one guarantee. Twitter's Snowflake README gives the layout: 41 bits of milliseconds since a custom epoch, a 10-bit configured machine ID, and a 12-bit sequence. Two machines can never collide because their machine bits differ. One machine never collides with itself because, within a millisecond, the sequence counts up, and the next millisecond changes the time bits. The limits fall out as powers of two: 2^12 = 4,096 IDs per millisecond per machine, 2^10 = 1,024 machines, and 2^41 ms is about 69 years.\n\n\"Roughly\" sortable because the timestamp is the high bits, so IDs order by millisecond first; within the same millisecond, IDs from different machines order by machine number, not by which was really first. Good enough for \"newest first\" feeds and cursor pagination.\n\nThe two conditions are the price of having no coordinator per ID. Machine IDs must be handed out uniquely once, at start-up: two workers sharing an ID can mint the same value. And the clock must not go backwards, or a machine could reissue a timestamp it has already used. The README's answer: if the clock repeats some milliseconds, Snowflake refuses to generate IDs until time passes the last ID it issued. That is a deliberate trade of brief unavailability for no duplicates.",
  [
   "snowflake-readme"
  ]
 ],
 [
  "These keep the UUID size but swap the front of it for a clock. A ULID is a 48-bit millisecond timestamp followed by 80 random bits, written as 26 characters; UUID v7 puts a 48-bit Unix millisecond timestamp in the most significant bits and fills the remaining 74 with random bits. No machine ID is needed: uniqueness inside a millisecond comes from the randomness, which is why they need no coordination and also why order within one millisecond is not guaranteed (the ULID spec says so directly, and offers an optional monotonic mode that increments the random part).\n\nBecause the timestamp leads, new keys are all bigger than old ones and land together at the right edge of the B-tree. RFC 9562 says the difference between that locality and random inserts can be an order of magnitude or more.\n\nThe same property is a liability when data is split by key range: every new row falls into the newest range, so one shard takes all the writes. Figma hit this when sharding Postgres: many chosen keys were auto-incrementing or Snowflake timestamp-prefixed, which would have put most data on a single shard. Their fix was to route by a hash of the key, accepting that range scans across shard keys become less efficient.",
  [
   "ulid-spec",
   "rfc9562",
   "figma-sharding"
  ]
 ],
 [
  "Each question eliminates options, so ask them in the order that prunes fastest.\n\nFits in 64 bits? This knocks out UUID v4, v7 and ULID, which are 128. It matters when the ID is a bigint primary key repeated in every foreign key and index: 8 bytes against 16, times every reference.\n\nSortable by time? This knocks out UUID v4. If you paginate \"newest first\" by ID or want inserts clustered, you need a timestamp prefix: Snowflake-style, v7, ULID, or a plain sequence.\n\nNo network call? This knocks out a central sequence or ticket server, which is a round trip per ID (or per reserved block) and a dependency that can be down.\n\nUnguessable? This knocks out sequences, and weakens anything timestamp-led, since the leading bits are predictable. Even here, RFC 9562 warns not to assume UUIDs are hard to guess and says they must not be used as security capabilities, meaning identifiers whose mere possession grants access. So \"unguessable\" reduces enumeration; it never replaces an authorisation check.\n\nWorked example: a chat message ID that must sort by time, fit a bigint and be created on any app server leaves only Snowflake-style. A public share-link token with no ordering need points to random bits instead.",
  [
   "rfc9562"
  ]
 ]
];
