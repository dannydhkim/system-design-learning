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
