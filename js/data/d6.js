// "More detail" for the key ideas of each topic: one entry per key idea, [text, source keys or 'calc'].
// Shown under each key idea on the Learn station (js/app.js). Checked by tools/check-content.mjs.
window.SD = window.SD || {}; SD.deep = SD.deep || {};
SD.deep["6.1"] = [
 [
  "Each requirement pins down one part of the design, which is why it pays to say them aloud before drawing anything. \"In order\" means some single place must decide what came first in a server. \"Within moments\" means the server pushes over a connection the client already holds open, because a client that has to ask will always be late. \"Kept forever\" means storage only ever grows, so whatever a read touches has to stay bounded even when a channel is years old.\n\nThe scale figure that matters is people online in one server, not total users. Discord's own illustration: if 1,000 people online each say one thing, that is 1 million notifications; with 100,000 people it is 10 billion. Midjourney had over 1 million online at any time. On the storage side, Discord reported more than 120 million messages a day in 2017, held on a 12-node Cassandra cluster with a replication factor of 3.\n\nAn interviewer who hears \"10 million users\" will ask how they are spread over servers; a million small group chats and one million-person server are different problems.",
  [
   "discord-maxjourney",
   "discord-billions-messages"
  ]
 ],
 [
  "Resume works because every event the gateway dispatches on a connection carries a counter, s. To resume, an app needs three things: the session_id and resume_gateway_url it was given in the Ready event, and the s of the last Dispatch event it received. It opens a new socket to the resume URL and sends Resume; Discord replays what was missed, in the same form as if the connection had stayed up. This only works because the server keeps the session after the socket dies: per the docs, a session whose TCP connection simply closes stays active and times out after a few minutes.\n\nThe storage key has two jobs. The partition key, here (channel_id, bucket), decides which nodes hold the data; the clustering key, message_id, sorts rows inside the partition, which Discord likens to an ordered dictionary. A timestamp could not be the clustering key because two messages can share one, whereas a Snowflake is unique and still sorts by time. The bucket (about 10 days) exists because a channel lives for years, and Discord wanted partitions under 100MB. Loading the latest messages is a range scan of the newest bucket, stepping back through older buckets until enough are found.",
  [
   "discord-gateway-docs",
   "discord-billions-messages"
  ]
 ],
 [
  "A process here is an Erlang process (a GenServer) with a mailbox that it works through one message at a time. That is where the ordering comes from. Everything that happens in a server is put into one mailbox, so there is exactly one sequence, and every session is sent events in that sequence. Discord gives a second reason for not splitting a guild across processes: some features need a view of the whole server, such as who is in a voice channel or the member list.\n\nThe ring answers \"which machine runs guild X?\". When a session connects it must look up the node for every guild its user is in. Discord's 2017 numbers show why that lookup had to be nearly free: a session VM held up to 500,000 sessions, the average user was in 5 guilds, and asking a ring process cost about 12μs. That is 500,000 × 5 × 12μs = 30 seconds of lookups just to recover from one crashed session server. Moving the ring into shared read-only memory cut a lookup to 0.3μs, and the total to 750ms.\n\nThe price of one ordering point is that it is single-threaded: the guild process is the bottleneck by construction.",
  [
   "discord-elixir-5m",
   "discord-maxjourney"
  ]
 ],
 [
  "The square comes from multiplying two things that both grow with the crowd: the number of events (more people, more talk) and the number of recipients per event. In 2017 Discord measured one send between Erlang processes at 30μs to 70μs, so publishing one event to a guild of 30,000 took 900ms to 2.1s (30,000 × 30μs and 30,000 × 70μs).\n\nPassive sessions attack the recipient count. A user in many servers is not looking at most of them, so the guild keeps those connections in a separate list and sends them nothing in full until the user clicks in; that also skips a permission check per message. Because work grows with the square, Discord notes the 10× saving bought only about a 3× larger server (√10 ≈ 3.2).\n\nRelays attack the single thread. A relay sits between the guild and the sessions, holds the session connections and does the fan-out with permission checks, so the guild talks to a few dozen relays instead of a million sessions: 1,000,000 ÷ 15,000 ≈ 67. The catch Discord hit: each relay first held a copy of the whole member list, and starting a new one stalled the guild for tens of seconds.",
  [
   "discord-maxjourney",
   "discord-elixir-5m"
  ]
 ],
 [
  "Why does one busy channel hurt strangers? In Cassandra a write is cheap (append to a commit log and an in-memory table), but a read has to consult the in-memory table and possibly several files on disk. A flood of reads on one (channel, bucket) partition makes the nodes holding it fall behind, and every other query those nodes serve waits too. Discord read and wrote at quorum, meaning a majority of a partition's replicas must answer, so any query whose replicas include a struggling node is slowed.\n\nRequest coalescing is the waiter who gets ten identical orders from one table and makes one trip to the kitchen. The first request for a row starts a worker task in the data service; later requests for the same row find that task and subscribe to it; the task queries the database once and hands the row to all of them. It only works if the identical requests meet in the same process, which is why the layer above routes by channel ID with consistent hashing.\n\nWorth saying in an interview: Discord wrote that this bought time but did not end hot partitions, which is why the ScyllaDB migration still went ahead.",
  [
   "discord-trillions"
  ]
 ],
 [
  "The 2017 stampede is a queue that can only grow. A session called the guild registry and gave up after a timeout, but its request stayed in the registry's queue, so the registry went on doing work nobody was waiting for; the session then retried after a backoff, adding another. Sessions blocked on these calls stopped reading their own mailboxes, which grew until the VM ran out of memory. The fix was a counter of outstanding calls, incremented atomically in ETS: past the limit, a session does not call at all. Discord chose this over a circuit breaker because it did not want a burst of timeouts to stop every attempt.\n\nTombstones: Cassandra does not erase on delete, it writes a marker, and a read must step over every marker in its range. A channel whose owners deleted millions of messages and kept one took 20 seconds to load. The marker has to live long enough to reach a replica that was down; otherwise that replica's old copy is treated as new data and spreads back (a \"zombie\"). The default grace period is 864,000 seconds, ten days. With repair every night, Discord judged two days enough.",
  [
   "discord-elixir-5m",
   "discord-billions-messages",
   "cassandra-compaction"
  ]
 ]
];
SD.deep["6.2"] = [
 [
  "The four requirements describe two very different kinds of data, and seeing that split early is most of the design. Positions are a firehose where each value is worthless seconds later. Uber says it receives a GPS ping roughly every 4 seconds from each trip, adding up to tens of billions of location updates a day; a 20-minute trip alone is 20 × 60 ÷ 4 = 300 pings. Nothing reads ping number 37 once ping 38 has arrived, except offline uses such as traffic: Uber maps the pings onto a road graph of around 100 million segments to measure how fast each one is moving.\n\nTrip state is the opposite: small, slow-changing and unforgiving. Uber describes its fulfillment platform as the source of truth that hundreds of microservices rely on for the accurate state of trips and driver sessions, handling billions of database transactions a day. \"Never in two states at once\" is the requirement that a driver cannot be both free and assigned, or a trip both cancelled and in progress.\n\nSo an interviewer expects two stores and two guarantees: a fast, lossy, latest-value path for locations and a transactional path for trips.",
  [
   "uber-traffic-forecasting",
   "uber-fulfillment-rearchitecture"
  ]
 ],
 [
  "Polling means each app asks \"anything new?\" on a timer: the driver app every few seconds for an offer, the rider app every few seconds for an assigned driver. Most answers are \"no\". Uber lists what went wrong as features multiplied: at its peak the app was polling dozens of APIs, a bug in polling frequency could degrade the backend, batteries drained, and at cold start every feature fetched its state at once so the screen could not render until the critical calls came back.\n\nPush inverts it: the phone holds one persistent connection and the server writes to it when something changes. Uber's platform promises at-least-once delivery, which needs a way to know what arrived. In the original protocol the server numbered messages; a client that reconnected sent the largest sequence number it had seen, which both told the server where to resume and let it discard everything older. Because a client on a good network might not reconnect for minutes, the app also acknowledged every 30 seconds.\n\nThe follow-up to expect: at-least-once means a message can arrive twice after a reconnect, so the app must treat a repeated offer or status as harmless.",
  [
   "uber-push-platform"
  ]
 ],
 [
  "An H3 cell ID is a bucket label, so \"who is near this rider?\" stops being geometry and becomes a hash lookup: convert the rider's position to a cell, list the neighbouring cells, fetch the drivers filed under those IDs. The rings work well because of the shape. A square has neighbours at two distances (edge and corner) and a triangle at three; all six neighbours of a hexagon are equidistant, and H3's docs note that expanding rings of hexagons approximate circles. Ring k holds 6k cells, so k = 2 covers 1 + 6 + 12 = 19.\n\nThe sizes can be checked from the H3 tables: resolution 8 averages 0.737 km² and resolution 9 0.105 km², and 0.737 ÷ 0.105 ≈ 7. A parent is found by truncating the child's identifier, though children are only approximately contained in it.\n\nRingpop solved a different problem: two servers changing one driver's state at once. It keeps a consistent-hash ring over a membership protocol, so each key has a single owning worker and requests for that key are forwarded there. Each worker was single-threaded (Node.js) with a serial queue, so read-modify-write cycles on a key happened one at a time.",
  [
   "h3-aggregation",
   "h3-restable",
   "uber-h3-blog",
   "uber-fulfillment-rearchitecture"
  ]
 ],
 [
  "A made-up example shows what the few seconds buy. Rider A requests; driver 1 is 2 minutes away and driver 2 is 9. Three seconds later rider B requests nearby; driver 1 is 3 minutes from B but driver 2 is 12. Matching each request at once gives A driver 1 (2 min) and leaves B with driver 2 (12 min): 14 minutes of waiting in total. Looking at both together, A takes driver 2 (9) and B driver 1 (3): 12 in total. A is worse off and everyone together is better off, which is exactly Uber's stated aim: the average wait for everyone, where the earlier approach \"sometimes led to long wait times for others\".\n\nThe numbers being compared must be drive times, not distances; Uber's own phrase is that closest doesn't always mean quickest. Its ETA has two layers. A routing engine sums predicted traversal times along the best path, and an ML model (DeepETA) predicts the residual, meaning the gap between that estimate and what trips actually took. Uber calls this its highest-QPS model and required an answer within a few milliseconds, since every candidate pairing needs one.\n\nSurge reuses the hexagons: supply and demand are measured per cell.",
  [
   "uber-marketplace-matching",
   "uber-deepeta",
   "uber-h3-blog"
  ]
 ],
 [
  "Without a transaction spanning both records, the application has to fake one. Uber's earlier stack used sagas: a coordinator first asked every participating entity to \"propose\" the change and, if all succeeded, committed; otherwise it ran a cancel operation as a compensating action. The weakness is the gap in the middle. Uber writes that between the operations forming a logical transaction the system was in an internally inconsistent state, and that when the second operation failed it had to reconcile afterwards.\n\nThe storage underneath made it worse. During deploys or region failovers two workers could both believe they owned a key (split-brain), and since Cassandra kept whichever write arrived last, their concurrent writes could overwrite each other. Think of two clerks each updating a different page of the same booking from memory.\n\nSpanner removes the gap: one transaction can cover several rows, tables and indexes, and it offers external consistency, which Uber describes as the strictest concurrency-control guarantee for transactions. The price is worth naming in an interview: Uber's service makes a sequence of network calls to Spanner in Google Cloud for every transaction, and its old design had deliberately chosen availability and latency over consistency.",
  [
   "uber-fulfillment-rearchitecture"
  ]
 ],
 [
  "A lost ping needs no recovery at all: the next one arrives about 4 seconds later and overwrites it. Retrying or persisting pings would add load to fix something that fixes itself.\n\nRing membership: Ringpop nodes learn who is in the cluster by gossip (a SWIM-style protocol of pings), so during a deploy two nodes can briefly hold different member lists and therefore disagree about who owns a key. Each node computes a checksum of its membership list; when a forwarded request arrives, sender's and receiver's checksums are compared and the request is refused if they differ. Refusing is the safe choice, because handling it might mean two owners acting on one driver. The documentation says the cluster eventually converges on one checksum, so the right reaction is a retry, and Ringpop's request proxy has retries built in.\n\nPush connections: a phone on a dead connection sees nothing, which looks the same as \"no news\". The 4-second heartbeat makes silence meaningful; 7 seconds allows one heartbeat to be late before the client gives up and reconnects, resuming from the last sequence number it saw.",
  [
   "ringpop-architecture",
   "uber-push-platform",
   "uber-traffic-forecasting"
  ]
 ]
];
SD.deep["6.3"] = [
 [
  "Why is egress, and not request rate, the number to design around? Count both for one viewer. A player asks for one chunk every few seconds, a trivial request rate, but each stream is megabits per second for hours. A million evening viewers at 5 Mb/s is 5,000,000 Mb/s = 5 Tb/s leaving your servers at once.\n\nAnd networks are paid for at the peak. Netflix's briefing paper notes that video-on-demand traffic follows a largely predictable daily pattern rising to a maximum in the evening, and that network capacity is built or acquired for peak capacity. So the bill follows the busiest hour, not the daily average, and the links sit partly idle the rest of the day (which becomes useful later, for filling caches).\n\nDistance adds a quality cost on top of the money. The same paper explains that remote content passes through more routers, each of which can be congested, and congestion causes packet loss, which the viewer sees as lower quality or stalls. \"Every kind of device\" is not a throwaway either: Netflix cites tens of thousands of combinations of device and network configuration, which is why one encoding of a title is never enough.",
  [
   "netflix-oc-briefing"
  ]
 ],
 [
  "One plane decides, the other carries. Netflix's own definition is that the control plane implements all the functionality in the UI other than streaming the video itself, while a separate CDN of storage servers streams video once you hit play. The split matters because the two halves scale on different things: the control plane on requests and personalisation logic, the data plane on bytes.\n\nThe data model for video is deliberately dumb. Each title is encoded at a number of different rates, each stored as a separate file, and the client fetches chunks containing a fixed duration of video, four seconds in the Netflix/Stanford paper. Because every rate is cut into the same durations, the player can switch rate at any chunk boundary: chunk 300 can come from the 5 Mb/s file and chunk 301 from a lower one.\n\nSome arithmetic you can do aloud: a two-hour film is 7,200 ÷ 4 = 1,800 chunks per rate. A 4-second chunk at 5 Mb/s is 20 Mb, about 2.5 MB; at 235 kb/s it is about 0.94 Mb, roughly 118 kB. The decision about which chunk and which rate is made by the client.",
  [
   "netflix-chaos-engineering",
   "netflix-bba"
  ]
 ],
 [
  "An OCA is, in Netflix engineers' own words, essentially a large static-content web server: it holds files and answers HTTP requests for them. In 2016 they described the then-latest generation as holding 10TB to 200TB, with 10,000 to 40,000 simultaneous long-lived TCP sessions and 10 to 40 Gb/s of continuous output per server; the current appliances page lists a storage appliance at about 200 Gb/s and up to 120 TB raw.\n\nThe clever part is choosing which appliance a viewer uses. BGP is the protocol by which networks tell each other which address ranges they can reach. Each appliance runs a routing daemon (BIRD) whose job is to collect network topology from the ISP and share it with Netflix's control system in AWS, so the control plane knows which appliances are close, in network terms, to a given client address, and directs the client there.\n\nPer-session TLS sounds like a footnote but it attacks the efficiency of such a server: a file that could be handed from disk to network must now be encrypted separately for each viewer. Netflix's 2016 paper is about doing that work inside the FreeBSD kernel's sendfile path, avoiding extra copies of the data.",
  [
   "netflix-freebsd-tls-2016",
   "netflix-oc-appliances"
  ]
 ],
 [
  "A normal CDN is a pull-through cache: the first viewer to ask for a file causes the edge to fetch it from the origin, and later viewers get the stored copy. That first fetch happens whenever the viewer asks, which Netflix points out may be during peak hours. Netflix can do the opposite because, as it puts it, it has a defined, limited catalogue: it knows every file it could be asked for. So it uploads to the appliances during off-peak hours, and since ISP capacity is built for the peak, that fill often costs the ISP nothing. Its claim is that a deployment can then offload up to 100% of Netflix traffic at a location.\n\nEncoding shrinks what has to be stored and sent. Two levers: several versions of each title matched to device and bandwidth, and compression tuned to how complex the pictures are. A news anchor is mostly a still background; a car chase changes every frame. The headline figures convert to average bitrates: 4 GB is 32,000 Mb, so 11 hours (39,600 s) is about 0.81 Mb/s and 25 hours (90,000 s) about 0.36 Mb/s, less than half the bits per hour watched.",
  [
   "netflix-oc-briefing"
  ]
 ],
 [
  "Think of the playback buffer as a bath. Video drains out at a constant rate, one second of video per second of real time. Water comes in at C/R seconds of video per second, where C is network capacity and R the video rate you chose. Pick R above C and the level falls; keep doing it and the bath empties, which is a rebuffer. Pick R below C and it rises.\n\nThe older approach estimates C from how fast recent chunks arrived and picks R from that. With throughput swinging wildly, the estimate is often wrong, and overestimating is what drains the buffer.\n\nThe buffer-based idea is that the level itself already tells you whether recent choices were sustainable. So map level to rate directly. In the paper's first algorithm the buffer holds 240 seconds: below a 90-second \"reservoir\" request the minimum rate, then raise the rate linearly until the maximum is reached at 216 seconds, 90% full. If capacity drops, the level falls and the map lowers the rate without any prediction.\n\nAt startup the bath is empty and says nothing yet about the network; that is the one phase where a simple estimate from recent throughput is still used.",
  [
   "netflix-bba"
  ]
 ],
 [
  "Draining exists because of how long a session lasts. A viewer may be two hours into a film, with a player that was told at the start which appliances to use. Switching an appliance off cuts those sessions mid-stream. Draining instead stops the control plane from sending new play starts to the appliance and lets the existing ones run out; a wait of a few hours covers the length of what people are watching.\n\nRegional failover is the control-plane version. Netflix's 2016 paper names three regions (Northern Virginia, Oregon and Ireland) and says it can redirect incoming client requests from an unhealthy region to a healthy one. The interesting part is how it knows this works. It defines one steady-state metric, SPS, stream starts per second, which varies slowly and predictably over a day, and states a hypothesis: failing over will have minimal impact on SPS. Chaos Kong then simulates the loss of a whole region in production to test it.\n\nWhy monthly, forever? The paper's argument is that the system changes continuously, so confidence in the result of a past experiment decays. The measure is also deliberately a user-level outcome, not CPU load or query time.",
  [
   "netflix-chaos-engineering"
  ]
 ]
];
SD.deep["6.4"] = [
 [
  "The two headline numbers describe two different systems, and noticing how unequal they are is the point. The catalogue is big in bytes but boring: 50 million files that never change. The event stream is the part that behaves like a firehose. Spotify's own detail on it: more than 500 distinct event types, over 350 TB of raw events a day, and 500 billion events a day in the same quarter. Dividing, 500 billion ÷ 86,400 seconds ≈ 5.8 million a second on average against a peak above 8 million, so the average is about 70% of the peak: there is little quiet time to catch up in.\n\n\"Start a track instantly\" also has a measurable form. Spotify tracks two playback metrics: playback latency, the time from click to sound, and stutter, the number of skips or pauses during playback, which mostly happens when the audio buffer runs dry on a slow connection.\n\nIn an interview this tells you where to spend time. The parts with real numbers behind them are byte delivery, measured in latency and stutter, and event ingestion, measured in events per second and how late the data may be.",
  [
   "spotify-event-delivery",
   "spotify-bbr"
  ]
 ],
 [
  "A range request is an ordinary HTTP GET that asks for only part of a file, bytes X to Y. That one feature is why no special streaming server is needed: the app asks for the first chunk, starts playing, and asks for the next before the buffer runs out.\n\nImmutability is what makes this cheap. A file that never changes can be copied to any number of servers and cached indefinitely with no question of which copy is current, so delivery can be handed to CDN companies; Spotify names Akamai, AWS and Fastly for audio.\n\nTo get a feel for 512 kB, assume a bitrate (Spotify does not give one in these sources): at 160 kb/s, which is 20 kB a second, one chunk is about 26 seconds of music, so a three-minute song is around seven requests.\n\nBecause the protocol is plain HTTP over TCP, improvements come from the transport. Spotify's 2018 experiment switched the server's congestion control algorithm to BBR, a change made only on the sending side, and stutter fell 6–10%, with the largest gains in Asia-Pacific and Latin America.",
  [
   "spotify-bbr",
   "spotify-cdn-alignment"
  ]
 ],
 [
  "The paths are separate so that each can slow down without stopping the others: music keeps playing if events are hours behind. Here is one event's journey. A listener finishes a track and the app emits an EndSong event. It reaches the Event Service, the single entry point, which parses it, recognises its type and publishes it to that type's own Pub/Sub topic; malformed or unrecognised events are rejected there. A per-type ETL job then writes it into that type's storage, in an hourly bucket: all the events that arrived between 13:00 and 14:00 UTC form one partition, which becomes immutable once delivered. Downstream jobs wait for a closed hour and read it, knowing it will not change under them.\n\nWhy per type? Types differ enormously. Some are emitted a few hundred times an hour and others more than a million times a second; some, like EndSong, are used to pay royalties and are subject to external SLAs. So Spotify grades them: high priority has an SLO of a few hours, normal 24 hours (data needed the next day), low 72 hours (needed the next working day).",
  [
   "spotify-event-delivery"
  ]
 ],
 [
  "Home is a grid of shelves (rows) holding cards (an album, a playlist). Spotify says not every shelf is machine-learned: some content comes from heuristics and rules, some from editors, some from models, and each model powers one shelf. One example is a Shortcuts model that predicts your next familiar listen.\n\nThe move from batch to real time is the instructive part. In the batch design a job predicts, offline, what each listener is likely to stream and stores the answers; serving is a lookup, but the answer is as old as the last run. Real-time serving means a service fetches features, transforms them and runs the model when you open the app. Retraining stayed periodic: a weekly pipeline that pushes the new model to production automatically if its evaluation score clears a threshold.\n\nDiscover Weekly shows when batch is the right answer: the product promise is \"updated each Monday\", so nothing is gained by computing it per request.\n\nThe four-artists example is collaborative filtering in one sentence: the system needs no knowledge of what the music sounds like, only that people whose histories overlap tend to like each other's remaining items.",
  [
   "spotify-home-ml",
   "spotify-discovery-newsroom"
  ]
 ],
 [
  "Term matching looks up documents containing the words you typed. Spotify's example query is \"electric cars climate impact\": its Elasticsearch cluster retrieved nothing for it, which does not mean nothing relevant existed. Fuzzy matching, normalisation and hand-written aliases patch some of this but cannot cover every way of phrasing a request.\n\nDense retrieval replaces word overlap with distance between vectors. Two encoders, sharing weights, are trained so that a query and a relevant episode land close together. The episode side is done offline: vectors are precomputed for a large set of episodes and indexed in Vespa, which supports approximate nearest-neighbour (ANN) search, the thing that keeps latency acceptable over tens of millions of episodes. At query time only the query is encoded, on a GPU, with a cache so that repeated queries are not re-encoded, and the top 30 semantic episodes are fetched.\n\nWhy keep Elasticsearch? Spotify's answer is that dense retrieval often does worse than traditional methods on exact term matching and costs more to run on every query. So it is one source among several, and a final reranking model sees the candidates from all of them, with the query–episode cosine similarity added as a feature.",
  [
   "spotify-nls"
  ]
 ],
 [
  "\"Liveness over lateness\" is a choice about what to do when something is stuck. Picture the hourly buckets as a grid, one row per event type. If the pipeline insisted on closing all of 13:00–14:00 before moving on, one type that is noisy, broken or blocked would hold up every row, including the events used to pay royalties. With a separate topic, ETL job and storage per type, a stuck type only leaves its own partitions open while the others are delivered. The cost is that consumers cannot assume all data for an hour is complete, only the types they depend on.\n\nTraining–serving skew is the ML cousin of this. When the podcast model moved from batch predictions to a real-time service, the features were fetched and transformed in a new place, separate from the training code. One feature was transformed slightly differently, and nothing could detect it: the model still returned plausible answers, just slightly worse ones, for four months. The durable fixes were to log the already-transformed features at serving time and train on those, so only one implementation exists, and to compare training and serving schemas and feature distributions daily, with alerts.",
  [
   "spotify-event-delivery",
   "spotify-home-ml"
  ]
 ]
];
SD.deep["6.5"] = [
 [
  "\"Optimise for reads\" has a precise meaning here: decide where the merge happens. A home timeline is a temporal merge of the timelines of everyone you follow. You can compute that merge when someone asks, or when someone posts. Twitter tried computing it on request; the talk describes that naive approach as a massive select statement over all of Twitter that \"was tried and died\".\n\nThe ratio says which side should pay. 300K reads a second against 6,000 writes is 50 to 1, so work moved from the read to the write is done far less often. It is not free, though. The talk's delivery statistics are 400 million tweets and 30 billion timeline deliveries a day, so the average tweet is copied to 30,000,000,000 ÷ 400,000,000 = 75 timelines. You trade 50 cheap reads for one write that costs 75 inserts.\n\nThe other requirement hiding in \"time order\" is freshness: Twitter's stated goal was for a tweet to reach a user in no more than 5 seconds. That target is what makes the big accounts a problem later.\n\nA good interview answer names the ratio first, then says what it buys: reads that are a lookup of a precomputed list, described in the talk as taking tens of milliseconds.",
  [
   "highscalability-twitter-timelines"
  ]
 ],
 [
  "A Snowflake ID is three fields packed into one integer, most significant first: 41 bits of milliseconds since a custom epoch (enough for 69 years), 10 bits of machine ID (up to 1,024 generators) and a 12-bit sequence, so one machine can issue 4,096 IDs in a millisecond before it must wait for the next. Because the timestamp is in the high bits, comparing two IDs as plain numbers compares their creation times. Generators never talk to each other, which the README lists as a requirement for availability. \"Roughly\" is literal: clocks differ between machines, and the README promises ordering only within about a second.\n\nThis is what lets a cursor be an ID. \"Give me the timeline since this ID\" needs no timestamp column, and sorting a list of IDs sorts by time without loading a single tweet.\n\nThe cached entry is tiny on purpose, since the talk calls RAM the limiting resource for timeline length. If both IDs are 64-bit, an entry is 8 + 8 + 4 = 20 bytes, and 800 entries is 16 kB per user; 150 million users would be about 2.4 TB per copy, the same order as the \"couple of terabytes of RAM\" the talk mentions. Storing the tweet text 75 times over would multiply that.",
  [
   "snowflake-readme",
   "highscalability-twitter-timelines"
  ]
 ],
 [
  "Follow one tweet. The write API accepts it, taking up to 145 ms according to the talk, puts it on a queue and releases the client. Everything after that is asynchronous, so the author never waits for the fan-out.\n\nA fan-out daemon then asks the social graph service who follows the author. The talk's example: with 20K followers, it looks up where each of those 20K timelines lives in the Redis cluster and inserts the tweet ID into each list, pipelining 4K destinations at a time. One tweet becomes as many as 20K inserts. Followers who have not been active recently have no list in memory and are skipped.\n\nThree copies exist because, at that scale, machines fail every day. They also make reads faster: the timeline service only has to find one machine holding your list, and takes whichever of the three answers first.\n\nWhat comes back is a list of IDs, not a page. \"Hydration\" is the second step: a parallel multi-get against the tweet service and the user service, each with its own cache (the user cache held the entire user base; the tweet cache about the last month and a half). Edits and deletions therefore live in one place, never in 20K copies.",
  [
   "highscalability-twitter-timelines"
  ]
 ],
 [
  "Fan-out is O(n) in followers, so the worst case is set by the biggest account. Using the talk's own figures: the whole system made about 300K deliveries a second, and one tweet to 31 million followers is 31 million inserts. Even if the entire pipeline did nothing else, that is 31,000,000 ÷ 300,000 ≈ 103 seconds. The talk's delivery figures were 3.5 seconds at the median for 1 million followers and up to 5 minutes at p99.\n\nThe ordering bug follows directly. The fan-out walks the follower list, so some followers receive the tweet minutes before others. One of the early ones replies. The reply's author has few followers, so its fan-out finishes at once, while the celebrity's is still running. A person who follows both now has the reply in their list and not the tweet it answers. Sorting by ID at read time does not help, because the original is not there to sort.\n\nThe fix is to treat these accounts as the exception: do not push their tweets at all. When you load your timeline, fetch the recent tweets of the few huge accounts you follow and merge them with your precomputed list. A little work per read replaces tens of millions of writes.",
  [
   "highscalability-twitter-timelines"
  ]
 ],
 [
  "Search and the home timeline are the same trade made in opposite directions. For the timeline, a write does O(n) work (one insert per follower) so that a read is O(1). For search, a tweet is tokenised and written to a single Earlybird machine, O(1), and a query has to ask every shard \"do you have anything matching?\", then merge, sort and rerank the answers. The talk's reason for the choice: most people don't use search, so it is cheaper to pay per query than per tweet. It stays at around 100 ms because the whole index is in RAM.\n\nFor You stacks a ranking funnel on top. Candidate sources each return posts; about half come from the search index, which finds posts by people you follow. Home Mixer then fetches roughly 6,000 features for the candidates and a neural model scores each one. The score is not one prediction. The heavy ranker outputs a probability for each of several actions (a like, a retweet, a reply, watching half a video, and negative ones such as a report), and the final score is a weighted sum, with the weights kept in a configuration file.\n\nFilters run last: author diversity, in-network balance, and removing blocked or muted authors.",
  [
   "highscalability-twitter-timelines",
   "x-algorithm-readme",
   "x-home-mixer-readme",
   "x-heavy-ranker-readme"
  ]
 ],
 [
  "\"Derived data\" means the cache holds nothing that cannot be recomputed from the systems of record. The talk calls the recovery \"reconstruction\": ask the social graph service who you follow, read each of those users' tweets from disk, and put the merged result back into Redis. It is expensive, a disk read per followed account, which is why timelines are kept as three copies: a failed machine then does not force reconstruction of every timeline it held.\n\nThe same mechanism handles the 30-day rule. A user who has not logged in for 30 days has no list in RAM and receives no fan-out; if they return, their timeline is reconstructed. The talk notes the 30 days can change with cache capacity, so it is a dial for trading memory against cold-start cost.\n\nThe Home Mixer fallback applies the same idea to ranking: the ranked pipeline depends on many services and a model, so its configuration lists a backup pipeline that returns posts in reverse chronological order if scoring fails. A plainer timeline beats an empty one.\n\nThe interview point: say out loud which stores are sources of truth and which can be dropped and rebuilt, and what the degraded experience is for each failure.",
  [
   "highscalability-twitter-timelines",
   "x-home-mixer-readme"
  ]
 ]
];
SD.deep["6.6"] = [
 [
  "The numbers look large until you divide them. Black Friday to Cyber Monday is four days, or 345,600 seconds, so 300 million transactions average 300,000,000 ÷ 345,600 ≈ 870 a second. That is a modest write rate for a database fleet; the peak is higher, but nothing like a social feed. The average payment is $18.6B ÷ 300M = $62, and that is the point: each of those 870 writes a second is someone's money, so none of them may be lost or doubled.\n\nThe availability figure shows how tight this is. 99.999% allows 0.001% downtime; over those four days that is 345,600 × 0.00001 ≈ 3.5 seconds.\n\nThe Ledger figure is on a different scale: five billion events a day is 5,000,000,000 ÷ 86,400 ≈ 58,000 a second. Stripe explains why bookkeeping outruns payments: Ledger records the operations of many internal producer systems, some of which emit billions of events a day and others a few hundred.\n\nSo in an interview, spend one sentence on throughput and the rest on correctness: exactly-once charging, reporting outcomes that arrive later, and proving the books balance.",
  [
   "stripe-ledger"
  ]
 ],
 [
  "Think of a PaymentIntent as the tracking record for one parcel: a single object that lives from \"we know the amount\" until the money has arrived, however many delivery attempts that takes. Stripe's advice is to create it as soon as you know the amount to charge, so that every attempted payment is recorded on it. A declined card does not create a new object; the same one steps back and waits for another payment method.\n\nWhy a state machine and not a boolean \"paid\"? Because a payment has waiting rooms. One is the customer (3D Secure authentication). One is the bank: asynchronous methods such as bank debits can take up to a few days, and the object sits in processing all that time. Most integrations never see requires_confirmation, because they send the payment details in the same call that confirms.\n\nWhere it bites: only succeeded means the funds are in your account and you can confidently fulfil the order. Shipping on processing is shipping on hope. Cancelling is also state-dependent: it releases any held funds and cannot be undone, and once a payment is processing it is only possible for a few bank-debit methods, within a window that may already have closed.",
  [
   "stripe-paymentintents-lifecycle"
  ]
 ],
 [
  "The key is a cloakroom ticket that the client writes for itself. The client invents a unique string (Stripe suggests a V4 UUID; keys can be up to 255 characters) and attaches it to the POST. The server files the outcome of the first request under that ticket, and anyone presenting the same ticket again is handed the same outcome instead of having the work redone.\n\nThree details answer the usual follow-ups. First, the result is saved only after the endpoint starts executing. A request that fails parameter validation, or that collides with a concurrent request using the same key, never started, so nothing is saved and it is safe to send again. Second, the server compares the retry's parameters with the original's and returns an error if they differ, which stops one ticket being reused by accident for a different charge. Third, GET and DELETE take no key because they are idempotent by definition.\n\nThe surprising part is that a saved 500 is replayed too. That is deliberate: a 500 does not say whether the charge happened, so the honest replay is the same uncertain answer. And the ticket expires: after a key is pruned, reusing it generates a new request, which is why the 24-hour figure matters.",
  [
   "stripe-idempotent-requests"
  ]
 ],
 [
  "The trap is that a timeout tells you about the connection, not about the charge. The request may never have arrived, or it may have run to completion and only the reply was lost. Stripe's guide says it directly: restoring connectivity does not tell you whether the original request succeeded.\n\nSo there are two different tools. For a network error, the same key is the tool: Stripe either runs the request for the first time or replays the stored result, so a retry cannot create a second object. For a 500, the same key cannot help, because API v1 caches the 500 and returns that cached response on every retry. The key now only protects you; it does not inform you. The information is elsewhere: retrieve the object, and read webhook events. During incident recovery Stripe tries to reconcile failed operations and sends webhook events for objects created along the way, while the cached response stays unchanged.\n\nThat leads to a design detail worth volunteering: put your own order ID in the object's metadata when you create it, so that an object you first learn about from a webhook can be matched to your local record. Stripe adds that reconciliation is not guaranteed for every operation, and that if you cannot establish what happened you should contact support before repeating it.",
  [
   "stripe-error-handling"
  ]
 ],
 [
  "Stripe's own analogy is plumbing: money is water flowing through pipes (processes) into reservoirs (balance sheets). When everything has settled, the reservoirs are full and the pipes are empty. Water still sitting in a pipe is a problem.\n\nA clearing account is one such pipe. Take a $40 charge for business A. The charge.creation event puts +$40 into a charge_undisbursed account identified by the business and the charge ID. Later charge.release moves $40 out, to the business's balance. The two events are independent and may arrive in either order; they meet because they carry the same identifiers, and the account returns to zero.\n\nNow publish three releases tagged business B by mistake. A's account stays at +$120 and a B account that never had a charge shows −$120. The total across both is still zero, which is why a grand total proves nothing. The check that works is per account: Stripe's example query is to find the clearing accounts with a nonzero balance.\n\nImmutability shapes the repair. Events are never edited or deleted, so a correction means reverting and reprocessing earlier operations, and Stripe built migration tooling with a two-phase review for that. \"Within four days\" reflects that clearing is judged at steady state, after late events have had time to arrive.",
  [
   "stripe-ledger"
  ]
 ],
 [
  "Each of the handler's rules follows from one fact: Stripe keeps sending an event until your endpoint answers 2xx, for up to three days with exponential backoff. Delivery is therefore at least once, never exactly once.\n\nStart with the reply. If your handler does slow work first and times out, Stripe sees a failure and sends the event again, so slow handlers manufacture their own duplicates. Hence: verify, put the event on a queue, return 2xx, and process at your own pace. Stripe gives the reason for the queue: a spike, such as the start of the month when all subscriptions renew, can overwhelm endpoint hosts.\n\nDeduplication must use the event ID because the created timestamp is recorded in seconds, so distinct events can share a value; it can neither order events nor identify repeats.\n\nThe signature covers the timestamp as well as the body, so an attacker who captures a valid delivery cannot change its date without invalidating the signature. That makes a recency check meaningful: reject anything older than the tolerance, 5 minutes by default in Stripe's libraries. Legitimate retries are not caught by this, because Stripe generates a new timestamp and signature for each delivery attempt. One trap: setting the tolerance to 0 disables the recency check entirely.",
  [
   "stripe-webhooks"
  ]
 ]
];
SD.deep["6.7"] = [
 [
  "Dividing the slide's numbers shows what kind of system this is. 19 billion messages in per day is 19,000,000,000 ÷ 86,400 ≈ 220,000 a second on average, against a measured peak of 342,000: the peak is only about 1.6 times the average, so load is steady around the clock. That is what a worldwide user base gives you, and it means you cannot plan to catch up overnight.\n\nOutput is about double input, 40 billion against 19 billion (and 712,000 a second out at peak against 342,000 in). The talk's own heading for output is \"Messages, Notifications, & Presence\": one message coming in produces more than one thing going out.\n\nThe third number sets the shape of the fleet. 147 million connections open at once out of 465 million monthly users is roughly a third of everyone, connected at the same moment. So the first resource you run out of is not CPU for messages but the number of open sockets a machine can hold, which is why the next key idea is about connections per server.\n\nThe requirements pull against each other: \"often offline\" forces the server to hold messages, while end-to-end encryption means it must hold them without being able to read them.",
  [
   "reed-efsf2014"
  ]
 ],
 [
  "A phone cannot be called from the internet, so it has to call the server and keep the line open. Once that connection exists, the server can push a message down it the instant one arrives. The cost is one open socket per online device, which makes \"how many sockets fit on one box\" the capacity question.\n\nThe 2012 blog post answers it with a screenshot: 2,277,845 open sockets on one machine with 24 CPUs and 103,062,118,400 bytes (about 96 GiB) of memory, with the CPU 41.9% idle and 27 GB free. The stack it lists is FreeBSD and Erlang.\n\nTwo years later the fleet did not run at that limit. Dividing the talk's figures, 147,000,000 connections ÷ 150 chat servers ≈ 980,000 each, which is about half of what one box had been shown to hold. A sensible reading (mine, not the slide's) is headroom: when a server dies its phones reconnect to the others, and the talk reports 230,000 logins a second at peak.\n\nThe connection is wrapped in Noise Pipes, which WhatsApp's white paper credits with fast, lightweight connection setup and resume, and with hiding the connecting user's identity from network observers. That matters on mobile networks where connections drop and resume constantly.",
  [
   "whatsapp-1m-2011",
   "reed-efsf2014",
   "whatsapp-encryption-overview"
  ]
 ],
 [
  "The model is a post office counter, not an archive. The server keeps a parcel only while the addressee has not collected it; once it is handed over, the post office has nothing. WhatsApp's policy states both halves: messages are deleted from its servers once delivered, and an undelivered one is kept in encrypted form for up to 30 days while delivery is retried, then deleted.\n\nTwo consequences follow. First, server storage grows with the backlog of uncollected messages, not with total history. In the 2014 talk this store is a separate box in the system diagram called offline storage, and the same talk notes that most messages are picked up very quickly, so the backlog is a small fraction of traffic.\n\nSecond, history has to live on the devices. When a new companion device is linked, it is the primary device, not the server, that encrypts a bundle of messages from recent chats and transfers it; afterwards the companion reads history from its own local database.\n\nThe ticks are the acknowledgements travelling back along the same path, one per hop. Worked example: Bob's phone is off for six weeks and he has no other device. Alice's message waits 30 days, is deleted, and her single tick never becomes two.",
  [
   "whatsapp-privacy-policy",
   "reed-efsf2014",
   "meta-whatsapp-multidevice"
  ]
 ],
 [
  "Normally two parties agree a key by exchanging messages while both are online. X3DH, the Signal key agreement, removes that need by having Bob do his half in advance. The specification explains the name: prekeys are essentially protocol messages that Bob publishes to the server before Alice begins. Think of Bob leaving a stack of open padlocks at the post office; anyone can take one, lock a box and post it, and only Bob has the keys.\n\nThe three kinds have different lifetimes. The identity key is uploaded once. The signed prekey is changed periodically. Each one-time prekey is used in a single protocol run, so the server removes it from storage after handing it out, and Bob uploads more when told the store is getting low.\n\nThe ratchet is two HMAC calls. WhatsApp's white paper gives them: Message Key = HMAC-SHA256(Chain Key, 0x01), then Chain Key = HMAC-SHA256(Chain Key, 0x02). A hash runs one way, so a stored message key cannot be used to derive the current or past chain key. On top of that, each message round trip performs a fresh Diffie-Hellman agreement that replaces the chain key.\n\nThe consequence to say aloud: the server stores and hands out only public keys, so it can route messages but has nothing with which to decrypt them.",
  [
   "signal-x3dh",
   "whatsapp-encryption-overview"
  ]
 ],
 [
  "Encryption sessions are between devices, not accounts, so \"send to Ben\" means \"send to every device Ben has\". The server keeps a mapping from each account to its device identities, and the sending client fetches that list. Worked example: Ana has a phone and a laptop; Ben has a phone and two linked devices. From her phone Ana encrypts four copies: three for Ben's devices and one for her own laptop, so the laptop shows what she sent. The work is done on the client because only the client holds the pairwise sessions.\n\nThat does not scale to groups. Take 100 members with two devices each, 200 devices. Pairwise, every message from one device would be 199 separate ciphertexts uploaded from a phone. With Sender Keys the 199 pairwise messages are paid once: the sender generates a random 32-byte chain key and a signature key pair and encrypts that Sender Key individually to each member. After that each message is encrypted once, signed, and sent as a single ciphertext that the server copies to all participants.\n\nThe price appears on membership change. Whenever a member leaves, all participants clear their Sender Key and start over, so everyone repeats the pairwise distribution. A group with frequent departures pays that cost often.",
  [
   "meta-whatsapp-multidevice",
   "whatsapp-encryption-overview"
  ]
 ],
 [
  "A write-back cache holds new data in memory and writes it to disk later, in batches. For a mailbox that changes the arithmetic, because of one observation on the slide: most messages are picked up very quickly. A message that is collected before its turn to be written never needs to touch the disk at all, so the write that was the bottleneck is simply skipped for most traffic.\n\n\"Variable sync delay\" is the control knob. Under a surge the system can wait longer before syncing; the slide's words are that it can absorb overloads via sync delay. The reasoning-level trade-off, which the slide does not spell out, is that whatever is in memory and not yet synced is exposed if the machine fails, so the delay is a bound on that exposure. A related fix in the same talk keeps large mailboxes from polluting the cache.\n\nThe prekey half is a different kind of failure: exhaustion of a finite resource. The X3DH specification says that when all one-time prekeys are gone the bundle simply contains none and the session still starts, but forward secrecy for the initial key then depends on the signed prekey's lifetime. Since anyone can request bundles, an attacker can drain them on purpose, which is why the specification recommends rate limits on fetching.",
  [
   "reed-efsf2014",
   "signal-x3dh"
  ]
 ]
];
