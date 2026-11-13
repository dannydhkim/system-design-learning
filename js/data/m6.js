// Module 6 — Case Studies: "design a system like X", taught from what X's own engineers have published.
// A topic with a `boss` field is the study page for that boss fight in bosses.js.
(function (T) {

  T({
    id: '6.1', mod: '6', title: 'Discord: real-time chat at scale', tag: 'One ordering point per server, fanned out',
    analogy: 'A stadium announcer. One person holds the microphone, so announcements come out in order, but nobody can speak to 100,000 people one by one: the announcer talks to section stewards, who each pass it on to their own section, and only to the people who are actually listening.',
    points: [
      'Requirements: every event in a server (a message sent, someone joining voice) reaches everyone online in it within moments and in order, and chat history is kept forever. Discord\'s own scale: nearly 5 million concurrent users in July 2017, and in 2023 one server (Midjourney) with over 10 million members and over 1 million online.',
      'API and data model: each client keeps one WebSocket to the gateway. In Discord\'s documented gateway for bots and apps, events carry a sequence number; after a drop the app resumes with the last one it saw and the gateway replays what it missed. Messages are stored under ((channel_id, time bucket), message_id) with time-sortable Snowflake IDs (topic 0C.2).',
      'High-level design (Discord, 2017–2023): one session process per connected client and one guild process per server, located through a consistent-hash ring. The guild process is the single point that orders a server\'s events and fans them out to the sessions, which forward them over the WebSocket.',
      'Hard part 1, fan-out: work grows with the square of the online count, because both activity and recipients scale with it. Discord sent full events only to "active" sessions (about 90% of user-guild connections in large servers were passive) and split fan-out across relays of up to 15,000 sessions each.',
      'Hard part 2, storage: one busy channel bucket becomes a hot partition, and with quorum reads it slows every query on the nodes holding it. Discord put Rust data services in front of the database that merge identical reads and route by channel ID, then moved from 177 Cassandra nodes to 72 ScyllaDB nodes in 2022.',
      'Failure modes: shared services can be stampeded (in 2017, nearly 5 million session processes against 10 guild-registry processes, with timed-out calls retried until the queues never drained), so callers cap their outstanding requests and fail fast. Bulk deletes leave tombstones that later reads must scan; Discord cut tombstone lifetime from 10 days to 2 because repair ran nightly, and skipped time buckets already known to be empty.'
    ],
    pitfall: 'Designing a big server like a small chat room: one process sends every event to every member. The work grows with the square of the online count and the process falls behind its queue; in 2017 Discord had to switch features off by hand for a server with 30,000 concurrent users before it reworked fan-out.',
    say: 'Each client holds one WebSocket, and on Discord\'s documented gateway an app resumes by sequence number. Each server has one guild process that orders events and fans out through relays of about 15,000 sessions, to active sessions only. Messages live in a wide-column store keyed by channel and time bucket, behind a service that merges identical reads.',
    refs: [
      ['discord-maxjourney', 'One process per server — “We use a single Elixir process per guild as a central routing point for everything happening on that server”'],
      ['discord-maxjourney', 'Fan-out is quadratic — “That means that the amount of work needed to handle a discord server grows quadratically with the size of the server”'],
      ['discord-maxjourney', 'Passive sessions — “around 90% of user-guild connections in large servers were passive, resulting in the fanout work being 90% less expensive!”'],
      ['discord-maxjourney', 'Relays — “We handle up to 15,000 connected sessions per relay.”'],
      ['discord-elixir-5m', 'Order matters — “However, each publish could be scheduled at a different time, and Discord clients depend on linearizability of events.”'],
      ['discord-elixir-5m', 'Bounded concurrency — “In most other languages, we could use an atomic counter to track outstanding requests and bail early if the number was too high, effectively implementing a semaphore.”'],
      ['discord-gateway-docs', 'Resume — “When your app is disconnected, Discord has a process for reconnecting and resuming, which allows your app to replay any lost events starting from the last sequence number it received.”'],
      ['discord-trillions', 'Request coalescing — “If multiple users are requesting the same row at the same time, we’ll only query the database once.”'],
      ['discord-trillions', 'The 2022 migration — “we’re going from running 177 Cassandra nodes to just 72 ScyllaDB nodes.”'],
      ['discord-billions-messages', 'Tombstone lifetime — “We lowered the lifespan of tombstones from 10 days down to 2 days because we run Cassandra repairs (an anti-entropy process) every night on our message cluster.”'],
      ['discord-billions-messages', 'Empty buckets — “We changed our query code to track empty buckets and avoid them in the future for a channel.”'],
      ['cassandra-compaction', 'Why tombstones must outlive repair — “If a node remains down or disconnected for longer than gc_grace_seconds, its deleted data will be repaired back to the other nodes and reappear in the cluster.”']
    ],
    cards: [
      ['Why does Discord keep one process per server (guild) rather than splitting a server across processes?', 'Clients rely on a server\'s events arriving in order, and some features need a full view of the server (member lists, who is in voice). One process gives one ordering point; the expensive part, fan-out, is pushed to relays.'],
      ['What is request coalescing, and why did it help Discord\'s message store?', 'When many requests for the same row arrive together, one worker queries the database and returns the row to all of them. Routing by channel ID with consistent hashing sends every request for a channel to the same instance, so a burst after an @everyone ping becomes one database read.'],
      ['How does an app on Discord\'s gateway avoid losing events when its connection drops?', 'It keeps the last sequence number it received, reconnects to the resume URL and sends Resume. The gateway replays the missed events in order and then sends Resumed. If it cannot resume, it identifies again and rebuilds its state.']
    ],
    quiz: [
      ['A large server has 20,000 members online. As Discord found for large servers, assume 90% of these connections are passive: they are not sent message events until the user opens the server. During a match, 20,000 messages are posted in total. How many deliveries to sessions are needed, counting the sender\'s own copy?', ['40 million', '400 million', '4 million', '20,000'], 'Only the 2,000 active sessions (10% of 20,000) receive messages, so each of the 20,000 messages makes 2,000 deliveries: 40 million. Sending to all 20,000 sessions gives 400 million, the quadratic cost that passive sessions cut. 4 million squares the active count, as if only the 2,000 active members posted one message each; 20,000 counts messages, not deliveries.', 'calc'],
      ['In 2017, once Discord made ring lookups fast, nearly 5 million session processes hit 10 guild-registry processes at once. Calls timed out, stayed queued, and were retried after a backoff until the VMs ran out of memory. Which fix did Discord ship?', ['Cap each node\'s outstanding calls with a semaphore and fail fast past it', 'Raise the call timeout so fewer requests are abandoned and retried later on', 'Retry failed calls straight away, without backoff, so the queue drains', 'Make the registry lookup faster again, so each queued call clears sooner'], 'The queue grew because callers kept adding work the registry could not finish. An atomic counter in ETS used as a semaphore lets a session give up at once when too many calls are outstanding, so the excess never reaches the registry. A longer timeout keeps sessions blocked while their own mailboxes grow, and Discord noted that a faster path would not fix it.', ['discord-elixir-5m']],
      ['A large server\'s single guild process cannot keep up with its sends. An engineer proposes spawning a fresh process for each publish so that the sends run in parallel. Why did Discord reject this in 2017?', ['Publishes run independently and can overtake each other, breaking event order', 'Spawning an Erlang process costs far more than the sends it would take over', 'Each spawned process would need its own WebSocket to each member\'s client', 'The spawned processes could not read the guild\'s list of connected sessions'], 'Discord clients depend on events arriving in order, and separately scheduled processes can deliver a later publish before an earlier one. Spawning is cheap in Erlang, so cost was not the objection. Discord built Manifold instead, which groups recipients by node and hashes them to fixed workers, spreading the work while keeping order.', ['discord-elixir-5m']],
      ['A big server pings @everyone and thousands of clients load the same recent messages in one channel within seconds. Messages are read from Cassandra at quorum. Which change, described by Discord in 2023, protected the database?', ['A data service that merges identical reads, with requests routed by channel', 'Smaller time buckets, so that each channel partition holds fewer messages', 'Partitioning by message ID, so that one channel spreads across the nodes', 'More nodes in the cluster, so that the hot partition is shared by more replicas'], 'The problem is concurrency on one partition, not its size, and a partition lives on its replicas however many nodes the cluster has. Discord\'s Rust data services run one query for many identical requests, and consistent-hash routing by channel ID sends every request for a channel to the same instance so the merging works. Partitioning by message ID would scatter "latest 50 in a channel" across the cluster.', ['discord-trillions']],
      ['A channel\'s owners delete millions of messages through the API, leaving one. Loading the channel now takes 20 seconds and Cassandra suffers long GC pauses. Repair runs every night. Which pair of changes did Discord describe in 2017?', ['Cut tombstone lifetime from 10 days to 2, and skip buckets known to be empty', 'Set tombstone lifetime to zero, and run a major compaction after each purge', 'Write null into columns instead of deleting, and read at consistency ONE', 'Move old messages to an archive table, and give the JVM a larger heap'], 'A read steps over every tombstone in its range until compaction removes them, and Cassandra keeps them 10 days by default. A tombstone exists so that repair can carry the delete to a replica that was away; the Cassandra docs warn that a node down for longer than gc_grace_seconds can bring deleted data back. So the lifetime must outlast the gap between successful repairs: with nightly repair, 2 days leaves about a day of margin, which one failed repair would use up. A zero lifetime invites exactly that resurrection; a null write is itself a tombstone, and reading at ONE still scans them; moving rows out deletes them, adding more.', ['discord-billions-messages', 'cassandra-compaction']]
    ],
    explain: ['Walk through how you would design a Discord-like chat service, from requirements to failure modes.', ['Requirements and scale: in-order real-time delivery, history kept, millions online, single servers with a million online', 'Gateway WebSocket per client with resume by sequence number; messages keyed by channel and time bucket', 'One ordering point per server (guild process) fanning out to session processes', 'Fan-out cost grows with the square of the online count: active-only delivery and relays', 'Storage hot partitions and reconnect storms: request coalescing, bounded concurrency, tombstone handling']],
    duck: ['Why can\'t the server just send each message straight to everyone in the server?', 'If you keep every message forever, how do you find the latest 50 quickly?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['How many members can one server have, and how many are online at once?', true, 'Fan-out cost grows with the square of the online count, so this sizes the hardest part.'],
        ['Must everyone see a server\'s events in the same order, and how quickly?', true, 'Ordering forces a single sequencing point per server; latency sets how much batching is allowed.'],
        ['Is history kept forever, and which reads matter: latest page, jump back, search?', true, 'Decides the partition key, time buckets and whether a search index is needed.'],
        ['What must survive a dropped connection: missed events, unread counts?', true, 'Drives resume by sequence number and a per-user, per-channel read state.'],
        ['Should the desktop client be built with Electron or native code?', false, 'A client technology choice; it does not change the backend design.'],
        ['Which cloud provider should host the message database?', false, 'An operational choice that follows from the requirements, not one of them.'],
        ['Should messages support Markdown and custom emoji?', false, 'A rendering feature; it barely changes storage or fan-out.'],
        ['Should we write the backend in Elixir, as Discord did?', false, 'A language choice; the interviewer wants the structure, not the stack.']
      ] },
      { type: 'estimate', brief: 'Given: one server with 50,000 members online · during an event, 10% of online members each send one message a minute · 90% of sessions are passive · one relay handles 15,000 sessions.', fixed: [
        { q: 'Messages per second sent in the server?', a: 83.3, unit: 'messages/s', tol: 0.1, how: '10% of 50,000 = 5,000 messages a minute ÷ 60 ≈ 83 per second.' },
        { q: 'Deliveries per second if every message goes to every online session?', a: 4170000, unit: 'deliveries/s', tol: 0.1, how: '83.3 × 50,000 ≈ 4.2 million a second. This is the quadratic cost.' },
        { q: 'Deliveries per second if only active sessions receive messages?', a: 417000, unit: 'deliveries/s', tol: 0.1, how: '10% of 50,000 = 5,000 active sessions. 83.3 × 5,000 ≈ 417,000 a second: a tenfold cut.' },
        { q: 'Relays needed to hold all 50,000 sessions?', a: 4, unit: 'relays', tol: 0, how: '50,000 ÷ 15,000 = 3.3, so 4 relays. Relays hold sessions, passive or not.' }
      ] },
      { type: 'sort', brief: 'Which part of the system does this fix belong to?', buckets: ['Guild process and fan-out', 'Message storage path', 'Client connections (gateway)'], items: [
        ['Send full events only to sessions that have the server open', 0], ['Split a huge server\'s sessions across several relays', 0], ['Group sends by destination node before crossing the network', 0], ['Hand expensive member-list work to a worker reading shared memory', 0],
        ['Merge identical reads for one row into a single query', 1], ['Route every request for a channel to the same service instance', 1], ['Skip time buckets already known to be empty', 1],
        ['Replay missed events from the last sequence number', 2], ['Wait a random fraction of the heartbeat interval before the first beat', 2], ['Keep one compression context for the life of the socket', 2]
      ] },
      { type: 'diagram', brief: 'Draw one large server during an event: 83 messages a second, each delivered to 5,000 active sessions; 2,500 channel loads a second after an @everyone ping; and 50,000 online clients kept up to date.',
        labels: { app: 'Message API', cache: 'Data service (merges reads)', db: 'Message store', queue: 'Guild process', worker: 'Fan-out relays', ws: 'Gateway (WebSocket)' },
        required: ['client', 'lb', 'app', 'cache', 'db', 'queue', 'worker', 'ws'],
        edges: [['client', 'lb'], ['lb', 'app'], ['app', 'cache'], ['cache', 'db'], ['app', 'db'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'ws'], ['client', 'ws']],
        layout: { client: [10, 180], lb: [160, 100], app: [320, 100], cache: [480, 16], db: [630, 100], queue: [320, 250], worker: [480, 250], ws: [160, 360] },
        why: { lb: 'Spreads message sends and channel loads over the stateless Message API servers.', app: 'Checks and stores each message, hands it to the guild process, and serves channel history.', cache: 'Merges identical reads of one channel into a single query and routes by channel ID, so an @everyone burst reaches the store once rather than thousands of times.', db: 'A wide-column store keyed by channel and time bucket, then message ID. The busy channel\'s bucket lives on a few replicas, however big the cluster is.', queue: 'One ordering point per server: every event in the guild passes through it, so all members see events in the same order.', worker: 'Each relay holds up to 15,000 sessions and does the sending, so fan-out is split up and never done while the sender waits.', ws: 'One open socket per client. Events are pushed as they happen and replayed by sequence number after a drop, so nobody has to poll.' },
        decoys: { replica: 'A read replica copies the whole store, but the busy channel is one partition that lives on its own few replicas. Merging the identical reads is what takes the load off.', idgen: 'Snowflake IDs are made inside each service from the time, a worker number and a sequence, so no call to an ID service is needed per message.', search: 'Search was not in this brief. History is read by channel and time bucket, not by text.' },
        sim: {
          load: 'One server during an event, as in your estimate: 83 messages a second, and fanning each one out to the 5,000 active sessions keeps a relay busy for about a second. After an @everyone ping, the 5,000 members with the server open load the channel: 2,500 reads a second, all for one channel and time bucket. And 50,000 online clients must each hear of new messages within 2 seconds: 25,000 check-ins a second, which are heartbeats and pushes on an open socket, or polls without one.',
          scale: 10,
          goals: { errors: 1, p99: 150 },
          flows: [
            { label: 'Messages sent', rps: 83, needs: ['db', 'worker', 'ws'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['client', 'ws', { instead: ['lb', 'app'] }], ['ws', 'app'], ['lb', 'app'], ['app', 'db'], ['app', 'cache', { instead: 'db' }], ['cache', 'db'], ['app', 'queue'], ['app', 'worker', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'ws'], ['app', 'ws', { instead: ['queue', 'worker'] }]] },
            { label: 'Channel loads', rps: 2500, aside: ['cache', 'db'], needs: ['db'],
              hops: [['client', 'lb'], ['client', 'app', { instead: 'lb' }], ['client', 'ws', { instead: ['lb', 'app'] }], ['ws', 'app'], ['lb', 'app'], ['app', 'cache'], ['cache', 'db'], ['app', 'db']] },
            { label: 'Live updates', rps: 25000, aside: ['cache', 'db'],
              hops: [['client', 'ws'], ['client', 'lb', { instead: 'ws' }], ['client', 'app', { instead: ['ws', 'lb'] }], ['lb', 'app'], ['app', 'cache'], ['cache', 'db'], ['app', 'db']] }
          ],
          parts: {
            app: { cfg: { instances: 3, capacity: 2, serviceMs: 3, serviceCv: 0.5, queueLimit: 24 }, solo: { instances: 1 }, soloWhy: 'Nothing spreads the traffic, so clients can only reach one server however many you run.', fullWhy: 'A request holds its slot until everything it called has answered. Is a sender waiting while its message reaches thousands of sessions, or are clients asking again and again whether anything is new?' },
            cache: { cfg: { capacity: 64, serviceMs: 1, serviceCv: 0.4, hitRate: 0.95, queueLimit: 512 } },
            db: { cfg: { capacity: 3, serviceMs: 20, serviceCv: 0.6, queueLimit: 24, lockMs: 0 }, fullWhy: 'Every read in this burst is for one channel and time bucket, so it lands on one partition and its few replicas, however many nodes the cluster has. Identical reads have to be merged before they get here.' },
            queue: { cfg: { queueLimit: 20000 } },
            worker: { cfg: { instances: 4, capacity: 4, serviceMs: 1000, serviceCv: 0.3, queueLimit: 16 }, fullWhy: 'Each message keeps a relay busy while it is written to thousands of sessions.' },
            ws: { cfg: { instances: 8, capacity: 16, serviceMs: 1, serviceCv: 0.5, queueLimit: 256 } }
          },
          needWhy: { db: 'Messages are kept forever, and the message store is the only durable copy.', worker: 'One process cannot write every message to 5,000 sessions and keep up. Relays split the sessions between them and do the sending, away from the sender\'s request.', ws: 'A member only sees a message when it is pushed down their open socket.' },
          bad: { 'client>db': 'Clients never talk to the message store directly.', 'client>cache': 'Clients never call the data service directly: the Message API checks who they are first.', 'client>queue': 'Clients do not publish into the guild process. The Message API does, after it has checked and stored the message.', 'client>worker': 'Clients do not call the relays. The relays push to the clients\' sessions.', 'lb>db': 'A load balancer forwards requests to servers. It does not query a database.', 'lb>cache': 'A load balancer forwards requests to servers. It does not read from the data service.', 'queue>ws': 'The guild process puts events in order, but it cannot write to thousands of sessions alone: draw the relays that split the sessions between them.', 'queue>db': 'The Message API stores the message before publishing it. The guild process only orders events and hands them on.', 'ws>db': 'The gateway holds sockets and pushes events. Reading history is the Message API\'s job, through the data service.' },
          traps: [
            { name: 'no guild process: the Message API calls the relays and waits for the fan-out', drop: ['queue'], wire: [['app', 'worker']] },
            { name: 'the Message API sends every message to every session itself', drop: ['queue', 'worker'], wire: [['app', 'ws']] },
            { name: 'no data service: every read of the busy channel goes to the store', drop: ['cache'] },
            { name: 'clients poll for new messages instead of holding a gateway socket', drop: ['ws'] },
            { name: 'guild process drawn but no relays read from it', drop: ['worker'] }
          ]
        } }
    ] }
  });

  T({
    id: '6.2', mod: '6', title: 'Uber: ride dispatch and geospatial', tag: 'Live locations, hexagon cells, batched matching',
    analogy: 'A taxi rank controller with a wall map divided into hexagonal tiles. Every few seconds each cab radios in its tile; when a fare calls, the controller looks at that tile and the ring around it, waits a moment to see who else is calling nearby, and then pairs cabs to fares so that, overall, people wait least. The booking ledger, unlike the map, is written in ink.',
    points: [
      'Requirements: a rider requests a ride, a nearby driver is offered it within seconds, both apps show live positions, and a trip is never in two states at once. Uber\'s own figures: more than a million concurrent users and billions of trips a year across over ten thousand cities (2021), and a GPS ping roughly every 4 seconds from each trip (2026).',
      'API and data: drivers stream locations (write-heavy, and for dispatch only the latest one matters), riders create trips, and the server pushes offers and status changes. Polling does not scale: at one point 80% of requests to Uber\'s API gateway were polling calls, which led to its push platform (built from 2015, described in 2020).',
      'High-level design: bucket driver positions by H3 cell. H3 has 16 resolutions, each cell about a seventh of its parent\'s area; at resolution 9 a cell averages about 0.1 km². "Drivers near me" becomes a lookup of the rider\'s cell and k rings of neighbours. In the fulfillment stack Uber built in 2014 (replaced by 2021), dispatch state was sharded by key on a consistent-hash ring (Ringpop, now archived), which forwards a request to the node that owns its key.',
      'Hard part 1, matching and pricing: the closest driver is not always the quickest, and matching each request at once left some riders waiting long. Uber waits a few seconds and matches a batch to cut the average wait. ETAs come from a routing engine plus an ML model of its error, served in milliseconds; surge comes from supply and demand per hexagon.',
      'Hard part 2, trip consistency: accepting an offer changes both the trip and the driver\'s supply record. Uber\'s earlier design favoured availability (Cassandra with last-write-wins, sagas, reconciliation); by July 2021, after a rewrite of about two years, it had moved this state to Google Cloud Spanner for multi-row, multi-table transactions.',
      'Failure modes: a location is soft state, replaced within seconds, so a lost update costs little; trip state carries money and must not fork. In the older stack, ring membership changed during deploys, and Ringpop refuses a forwarded request when membership checksums differ, so callers retry. In Uber\'s original SSE push protocol (chosen in 2015; a gRPC successor was started in late 2019), the server sent a heartbeat every 4 s and clients reconnected after 7 s of silence.'
    ],
    pitfall: 'Writing every GPS ping to the trip database, or finding nearby drivers with a distance query over all of them. A ping matters only until the next one arrives a few seconds later: keep the latest position per driver indexed by cell, and save transactions for the trip and the driver assignment.',
    say: 'If each online driver reports every 4 seconds (Uber cites about 4 s per trip), a million online is 250,000 writes a second of soft state, kept latest-only and indexed by H3 cell. Dispatch looks at the rider\'s cell and a ring or two around it, matches in batches every few seconds on ETA rather than distance, and commits the driver–trip assignment in one transaction.',
    refs: [
      ['uber-traffic-forecasting', 'Location volume — “Uber receives GPS pings roughly every 4 seconds from each trip, amounting to tens of billions of location updates per day.”'],
      ['uber-push-platform', 'Why push — “At some point, 80% of requests made to the backend API gateway were polling calls.”'],
      ['uber-push-platform', 'The original protocol, 2015 — “For an application protocol in 2015, our options were to utilize HTTP/1.1 with long polling, Web Sockets or finally Server-Sent events (SSE).”'],
      ['uber-push-platform', 'Heartbeat in that protocol — “To know if the connection is alive, the server sends a single byte sized heartbeat message every 4 seconds. If a client sees no heartbeat or a message up to 7 seconds, it assumes the connection is broken and reconnects.”'],
      ['uber-push-platform', 'Successor started in late 2019 — “In late 2019 we started developing the next generation of the RAMEN protocol to address the above shortcomings.”'],
      ['uber-h3-blog', 'Surge by hexagon — “For example, we calculate surge pricing by measuring supply and demand in hexagons in each city that we serve.”'],
      ['uber-h3-blog', 'Equidistant neighbours simplify smoothing — “This property greatly simplifies performing analysis and smoothing over gradients.”'],
      ['uber-h3-blog', 'Less quantisation error — “Hexagons were an important choice because people in a city are often in motion, and hexagons minimize the quantization error introduced when users move through a city.”'],
      ['uber-h3-blog', 'Approximate nesting — “Hexagons cannot be perfectly subdivided into seven hexagons, so the finer cells are only approximately contained within a parent cell.”'],
      ['h3-aggregation', 'Why hexagons — “Triangles have three different distances, and squares have two different distances. For hexagons, all neighbors are equidistant.”'],
      ['h3-restable', 'Every resolution has pentagons — “There are always exactly 12 pentagons at every resolution.”'],
      ['uber-marketplace-matching', 'Batched matching — “We then pair riders and drivers with the aim of reducing the average wait time for everyone.”'],
      ['uber-deepeta', 'ETA as routing plus a learned correction — “We then use machine learning to predict the residual between the routing engine ETA and real-world observed outcomes.”'],
      ['uber-fulfillment-rearchitecture', 'Two entities per acceptance — “If a driver accepts a trip offer, we have to modify the trip entity and the supply entity, and add waypoints of the trip in the supply entity’s plan.”'],
      ['uber-fulfillment-rearchitecture', 'Replacing the 2014 design (post of July 2021) — “Two years ago, we made a bold bet and embarked on a journey to rewrite the Fulfillment Platform from the ground up, as the architecture built in 2014 would not scale for the next decade of Uber’s growth.”'],
      ['uber-fulfillment-rearchitecture', 'Ringpop in the old stack — “Ringpop (archived project) is a library that brings cooperation and coordination to distributed applications.”'],
      ['uber-fulfillment-rearchitecture', 'Split-brain overwrites — “In the case of split-brain situations (happening during deploys, region failovers) inconsistencies could occur due to concurrent writes, which could end up overwriting each other, since Cassandra exhibited a last-write-wins semantic.”'],
      ['uber-fulfillment-rearchitecture', 'Spanner transactions — “Spanner supports transactions that span multiple rows, tables, and indexes”'],
      ['ringpop-architecture', 'Membership changes — “The request will be refused if checksums differ. Mismatches are expected when nodes are entering or exiting the cluster due to deploys, added/removed capacity, or failures.”']
    ],
    cards: [
      ['Why use hexagons for a geospatial index of moving vehicles?', 'All six neighbours of a hexagon are the same distance from its centre, so smoothing and "k rings around me" behave the same in every direction, and Uber found hexagons minimise quantisation error as people move. The costs: children only approximately nest in parents, and each resolution has 12 pentagons.'],
      ['What is batched matching?', 'Instead of giving each request to the nearest free driver at once, the dispatcher waits a few seconds, collects nearby requests and drivers, and pairs them together to reduce the average wait for everyone.'],
      ['Why does the driver–trip assignment need a transaction?', 'Accepting an offer updates two records: the trip and the driver\'s supply state. Without atomicity, a concurrent write (the driver going offline, a second offer) can leave a driver on two trips or a trip without a driver, which then needs reconciliation.']
    ],
    quiz: [
      ['Dispatch looks for drivers in the rider\'s H3 cell and every cell within 2 rings of it (gridDisk with k = 2). How many cells is that, and roughly what area at resolution 9, where a cell averages about 0.105 km²?', ['19 cells, about 2 km²', '25 cells, about 2.6 km²', '13 cells, about 1.4 km²', '7 cells, about 0.7 km²'], 'Ring k of a hexagonal grid has 6k cells, so 1 + 6 + 12 = 19 cells, and 19 × 0.105 ≈ 2.0 km². 25 is the 5 × 5 block a square grid would give; 13 forgets the first ring; 7 is k = 1.', 'calc'],
      ['A driver accepts trip A just as the matcher links trip B to the same driver. During a deploy, two workers both believe they own this driver, and each updates the trip row and the driver\'s supply row separately, in a store where the last write wins. What can result, and what had Uber moved this state to by 2021?', ['Both trips can end up tied to the driver; transactions across rows in Spanner', 'One trip is lost, but the two rows still agree; idempotent writes in Cassandra', 'The later trip alone survives, so the state stays valid; a Redis lock per driver', 'Replicas of each row diverge for good; quorum reads and writes in Cassandra'], 'Accepting a trip changes two entities. Uber names deploys as one cause of such split-brain writes. Without a transaction across the rows, the two workers\' writes interleave and last-write-wins keeps whichever write landed last in each row, so the trip rows and the supply row can contradict each other and need reconciliation; nothing keeps them in agreement. Replicas of one row do converge under last-write-wins; the invariant spans two rows. Uber\'s re-architecture (reported July 2021, after about two years) moved this state to Google Cloud Spanner for multi-row, multi-table transactions.', ['uber-fulfillment-rearchitecture']],
      ['Uber computes surge pricing from supply and demand measured per H3 hexagon. Which property of hexagons, compared with squares and triangles, does Uber\'s H3 write-up say greatly simplifies analysis and smoothing over gradients?', ['Every neighbour of a cell is the same distance from its centre', 'Each cell divides exactly into seven children at the next level', 'The sphere is tiled entirely by hexagons, without any pentagons', 'Cells at one resolution all have exactly the same area on Earth'], 'Squares have neighbours at two distances (edge and corner) and triangles at three; a hexagon\'s neighbours are all equidistant, which simplifies smoothing over gradients (Uber also says hexagons minimise quantisation error as people move). The others are false: children are only approximately contained in a parent, every resolution has pentagons, and the H3 tables list a minimum and a maximum hexagon area for each resolution.', ['h3-aggregation', 'uber-h3-blog', 'h3-restable']],
      ['Uber used to give each request to the closest available driver straight away. It now waits a few seconds and matches a batch of nearby riders and drivers together. What does the wait buy?', ['A lower average wait across all riders, not just the next one', 'Fewer matching runs per minute, which saves dispatch CPU', 'Fair service, with requests matched strictly in arrival order', 'Time for GPS pings to be averaged, removing location error'], 'Greedy nearest-driver matching is fine for each rider in isolation but can leave others with long waits, and across a city those add up. Pairing a batch together lowers the total. The window is seconds long, so it is not about compute or GPS smoothing, and batching deliberately departs from first-come, first-served: matching strictly in arrival order is the greedy approach it replaces.', ['uber-marketplace-matching']],
      ['During a deploy, nodes join and leave a ring run by Ringpop, the library in Uber\'s pre-2021 fulfillment stack. A forwarded request reaches a node whose membership checksum differs from the sender\'s. What does Ringpop\'s documentation say happens, and what should the caller do?', ['The node refuses it; the caller retries once membership converges', 'The node handles it locally, trusting the sender\'s view of the ring', 'The node queues it until the ring is stable, then replays it', 'The node forwards it on around the ring until another accepts'], 'A checksum mismatch means the two nodes disagree about membership, and so possibly about who owns the key. Ringpop refuses the request rather than risk two owners for one key; its proxy has retries built in because the cluster converges on one checksum after deploys and failures.', ['ringpop-architecture']]
    ],
    explain: ['Walk through how you would design a ride-hailing dispatch system like Uber\'s, from requirements to failure modes.', ['Requirements and scale: locations every few seconds, matching within seconds, trip state that never forks', 'Location ingest as latest-value soft state, with updates pushed to apps rather than polled', 'Geospatial index by H3 cell with k-ring lookups; dispatch sharded by key on a consistent-hash ring', 'Matching in batches on ETA rather than straight-line distance; surge from supply and demand per cell', 'Transactions for the trip–driver assignment; retries on membership changes and reconnects on lost heartbeats']],
    duck: ['Why not just work out the distance from the rider to every driver?', 'If two riders ask at the same moment, who gets the closer driver?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['How many drivers are online at peak, and how often does each report?', true, 'Sets the location write rate, which dominates the ingest path.'],
        ['How quickly must a request be matched, and what wait is acceptable?', true, 'Bounds the batching window and the latency budget for ETAs.'],
        ['What must never happen to a trip: two drivers, lost fare, double charge?', true, 'Identifies the state that needs transactions rather than best effort.'],
        ['Is pricing dynamic by area, and how fresh must the price be?', true, 'Decides whether supply and demand are aggregated per cell in near real time.'],
        ['Which map tile provider should the rider app display?', false, 'A client choice with no effect on dispatch or storage.'],
        ['Can drivers upload a profile photo and a short bio?', false, 'A profile feature; it does not shape the core system.'],
        ['Will the backend services be written in Go or Java?', false, 'A language choice; it does not change the architecture.'],
        ['Should we reuse Uber\'s open-source Ringpop library?', false, 'A tooling choice that comes after the design, not a requirement.']
      ] },
      { type: 'estimate', brief: 'Given: 1M drivers online at peak · each reports location every 4 s · 100 bytes per update · an H3 resolution 9 cell averages 0.105 km² · dispatch searches the rider\'s cell plus 2 rings.', fixed: [
        { q: 'Location writes per second at peak?', a: 250000, unit: 'writes/s', tol: 0.05, how: '1,000,000 ÷ 4 s = 250,000 a second.' },
        { q: 'Inbound location data at peak, in MB/s?', a: 25, unit: 'MB/s', tol: 0.1, how: '250,000 × 100 B = 25,000,000 B/s = 25 MB/s. Small in bytes: the challenge is the write rate and keeping only the latest value.' },
        { q: 'Cells searched for one request?', a: 19, unit: 'cells', tol: 0, how: 'Ring k holds 6k cells: 1 + 6 + 12 = 19.' },
        { q: 'Area searched, in km²?', a: 2, unit: 'km²', tol: 0.1, how: '19 × 0.105 ≈ 2.0 km². Widen to k = 3 (37 cells, about 3.9 km²) when too few drivers are found.' }
      ] },
      { type: 'sort', brief: 'If this were lost, could it be rebuilt in seconds, or must it be durable and transactional?', buckets: ['Soft state: rebuilt within seconds', 'Durable, transactional state'], items: [
        ['A driver\'s latest GPS position', 0], ['The count of open requests in a hexagon this minute', 0], ['Which ring node currently owns a dispatch key', 0], ['An ETA shown while the rider is still browsing', 0], ['A push connection\'s heartbeat timer', 0],
        ['Which driver is assigned to a trip', 1], ['A trip moving from en route to completed', 1], ['The fare charged when the trip ends', 1], ['A driver accepting an offer', 1], ['The record that a trip was cancelled, and by whom', 1]
      ] },
      { type: 'diagram', brief: 'Draw dispatch at peak: 250,000 location pings a second from a million drivers, 1,000 ride requests a second matched in batches, and live trip updates for 400,000 riders.',
        labels: { client: 'Rider and driver apps', app: 'Trip and location service', index: 'Geo index (H3 cells)', db: 'Trip store (transactional)', queue: 'Pending ride requests', worker: 'Batch matcher', ws: 'Push gateway' },
        required: ['client', 'gateway', 'app', 'index', 'db', 'queue', 'worker', 'ws'],
        edges: [['client', 'gateway'], ['gateway', 'app'], ['app', 'index'], ['app', 'db'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'index'], ['worker', 'db'], ['worker', 'ws'], ['client', 'ws']],
        layout: { client: [10, 180], gateway: [160, 100], app: [320, 100], index: [480, 16], db: [630, 100], queue: [320, 250], worker: [480, 250], ws: [160, 360] },
        why: { gateway: 'Authenticates the apps and spreads pings and ride requests over the service fleet.', app: 'Replaces each driver\'s latest position in the geo index, creates trips, and queues each request for matching.', index: 'Holds only the latest position of each driver, bucketed by H3 cell, in memory. "Drivers near me" is the rider\'s cell plus two rings: 19 cells.', db: 'The trip and the driver\'s assignment change together in one transaction, so a driver is never on two trips. Pings never come here.', queue: 'Requests wait here for a few seconds, so that the matcher can pair a batch of riders and drivers together.', worker: 'Every few seconds it takes the waiting requests, looks up nearby drivers by cell, pairs them to cut the average wait, and commits each match.', ws: 'Keeps a connection open to each phone and pushes offers and trip changes as they happen, with a heartbeat every few seconds, so apps do not poll.' },
        decoys: { cache: 'The latest positions already live in memory in the geo index. Trip state must not be served stale, so a cache in front of the trip store buys nothing here.', search: 'A search index is built for text and refreshes in batches. Nearby drivers are found by looking up the rider\'s H3 cell and the rings around it.', replica: 'A matcher deciding who is free needs the latest trip state, which a lagging replica cannot promise, and the trip store\'s own load here is small.' },
        sim: {
          load: '250,000 location pings a second, as in your estimate: a million drivers, one ping every 4 seconds. 1,000 ride requests a second, an assumed peak for billions of trips a year. And 400,000 riders on a trip or waiting for one, each told of changes every 4 seconds: 100,000 a second, which are heartbeats and pushes on an open connection, or polls without one.',
          scale: 250,
          goals: { errors: 1, p99: 200 },
          flows: [
            { label: 'Location pings', rps: 250000, needs: ['index'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['app', 'index'], ['app', 'db', { instead: 'index' }]] },
            { label: 'Ride requests', rps: 1000, needs: ['db', 'index', 'worker', 'ws'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['app', 'db'], ['app', 'queue'], ['app', 'worker', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'index'], ['worker', 'db'], ['worker', 'ws']] },
            { label: 'Trip updates', rps: 100000,
              hops: [['client', 'ws'], ['client', 'gateway', { instead: 'ws' }], ['client', 'app', { instead: ['ws', 'gateway'] }], ['gateway', 'app'], ['app', 'db']] }
          ],
          parts: {
            gateway: { cfg: { capacity: 512, serviceMs: 1, queueLimit: 1024, rateLimitRps: 4000, burst: 4000, authFailRate: 0 } },
            app: { cfg: { instances: 8, capacity: 4, serviceMs: 4, serviceCv: 0.5, queueLimit: 64 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of it spreads the phones over the fleet, so they can only reach one server.', fullWhy: 'Each request holds a slot until what it called has answered. Is a slow store being asked something every few seconds by every phone?' },
            index: { cfg: { capacity: 64, serviceMs: 1, serviceCv: 0.4, queueLimit: 512 } },
            db: { cfg: { capacity: 2, serviceMs: 20, serviceCv: 0.6, queueLimit: 32, lockMs: 0 }, fullWhy: 'It pays for durability and a transaction on every write, and is sized for trips with room to spare. Positions that are replaced 4 seconds later, scans for nearby drivers and polls from every phone belong elsewhere.' },
            queue: { cfg: { queueLimit: 20000 } },
            worker: { cfg: { instances: 2, capacity: 4, serviceMs: 50, serviceCv: 0.5, queueLimit: 16 } },
            ws: { cfg: { instances: 4, capacity: 32, serviceMs: 1, serviceCv: 0.5, queueLimit: 256 } }
          },
          needWhy: { index: 'Matching needs the latest position of every nearby driver, found by H3 cell. Without the index, that means a distance query over every driver for every request.', db: 'Trips and driver assignments carry money and must not fork, so they need a transactional store.', worker: 'Something has to gather the waiting requests every few seconds and pair them with drivers.', ws: 'The driver has to be offered the trip, and the rider told, as soon as a match is made.' },
          bad: { 'client>db': 'Phones never write to the trip store directly.', 'client>index': 'Phones never write to the geo index directly: the service checks each ping first.', 'client>queue': 'Phones do not queue ride requests themselves. The service creates the trip first.', 'gateway>db': 'The gateway checks who is calling and forwards the request. It does not write trips.', 'gateway>index': 'The gateway checks who is calling and forwards the request. It does not update the geo index.', 'queue>index': 'A queue only holds the waiting requests. Something has to read them and do the matching: draw the matcher between the two.', 'queue>db': 'A queue only holds the waiting requests. Something has to read them and commit each match: draw the matcher between the two.', 'index>db': 'The geo index holds soft state that is replaced every few seconds. Copying each ping into the trip store is the load it exists to avoid.', 'ws>db': 'The push gateway delivers messages to phones. It does not read the trip store.' },
          traps: [
            { name: 'every ping is written to the trip store', cut: [['app', 'index']] },
            { name: 'no geo index: pings go to the trip store and matching scans it', drop: ['index'] },
            { name: 'riders poll the trip store instead of holding a push connection', drop: ['ws'] },
            { name: 'no gateway in front of the fleet', drop: ['gateway'], wire: [['client', 'app']] },
            { name: 'the matcher looks for nearby drivers in the trip store', cut: [['worker', 'index']] },
            { name: 'requests queued but no matcher reads them', drop: ['worker'] }
          ]
        } }
    ] }
  });

  T({
    id: '6.3', mod: '6', title: 'Netflix: streaming and CDN', tag: 'Cloud decides, appliances in ISPs deliver',
    analogy: 'A newspaper with print sites in every town. The head office decides what goes in each edition and who gets which, but the paper itself is printed overnight at the local site, so the morning delivery never crosses the country. Each household\'s copy is cut to the size of its letterbox.',
    points: [
      'Requirements: pressing play starts video within seconds and it does not stall, on every kind of device and connection. Egress is the cost and it peaks in the evening. Netflix reported over 200 million paying members in early 2021, and more than 14,000 Open Connect appliances (OCAs) in 142 countries, with over 1,000 ISPs hosting them inside their own networks.',
      'API and data: a control plane in AWS, replicated across three regions as of 2016, does everything except stream video: browsing, recommendations, and deciding where a client fetches from. Each title is encoded at many rates (in 2014 typically 235 kb/s SD to 5 Mb/s HD) and served as fixed-length chunks (4 seconds in Netflix\'s 2013 tests).',
      'High-level design: OCAs sit inside ISP networks or at internet exchanges, and each deployment stores nearly the whole catalogue in every format. Appliances share ISP routing information (BGP) with the control system in AWS, which uses it to direct each client to appliances. Video is served over HTTP by NGINX; until 2015 the files were not encrypted per session, and Netflix engineers expected most streaming sessions to use TLS by the end of 2016.',
      'Hard part 1, placement and encoding: Netflix knows its catalogue, so it pre-positions content overnight, off-peak, as titles are released or become popular, instead of filling caches on first request at peak. Encoding is tuned to the content (a news anchor needs far less bandwidth than a car chase); 4 GB streamed 11 hours of video in 2015 and 25 hours in 2020.',
      'Hard part 2, adaptive bitrate: throughput within one session can swing from 17 Mb/s to 500 kb/s. In 2013 Netflix and Stanford chose the rate from the playback buffer in steady state, using a throughput estimate only at startup, and cut rebuffers by 10–20% against Netflix\'s then-default algorithm.',
      'Failure modes: an appliance due for maintenance is drained 2–3 hours ahead, so current sessions finish and new plays go elsewhere. If one AWS region fails, client requests are redirected to a healthy region; in 2016 Netflix rehearsed this monthly (Chaos Kong) and judged it by stream starts per second.'
    ],
    pitfall: 'Treating delivery as a generic pull-through CDN with the cloud in the byte path. A cache that fills on first request fills at peak and over long links; Netflix knows what it will serve, so it puts nearly the whole catalogue next to the viewer overnight and keeps the cloud for decisions, not bytes.',
    say: 'The cloud control plane handles browsing, playback decisions and which appliances to use; the bytes come from appliances inside or beside the ISP, filled overnight. Each title is encoded at many rates in short fixed-length chunks (4 s in Netflix\'s 2013 tests), and the player adapts the rate, from its buffer in the buffer-based design Netflix tested, so the hard numbers are evening egress and the fill window, not request rate.',
    refs: [
      ['netflix-chaos-engineering', 'The control plane — “All of the services in the Control Plane run inside of virtual machines in the Amazon Web Services (AWS) cloud, replicated across three geographic regions to reduce latency and improve availability.”'],
      ['netflix-oc-briefing', 'Nearly everything, everywhere — “Each OCA deployment stores nearly all of the Netflix catalogue, including each title in the various formats and video qualities.”'],
      ['netflix-oc-briefing', 'Off-peak fill — “Netflix is able to better optimize the upload content to OCAs during off-peak hours, which avoids burdening the ISP or other parts of the internet during periods of the day where there is the highest usage.”'],
      ['netflix-oc-briefing', 'Versus pull-through caching — “Many content providers store a copy of a file only after it has been requested by a user, which may occur during peak hours.”'],
      ['netflix-oc-appliances', 'Steering from routing data — “BIRD is used to enable the collection and sharing of network topology from ISP networks to the Netflix control system in AWS that directs clients to sources of content.”'],
      ['netflix-oc-appliances', 'Served over HTTP by NGINX — “NGINX was chosen for its proven scalability and performance. The audio and video components that comprise each Netflix streaming title are served directly to the customer client software via HTTP.”'],
      ['netflix-oc-appliances', 'Storage appliance on the current page (2026) — “Operational throughput ~200Gbps”'],
      ['netflix-freebsd-tls-2016', 'No per-session encryption before 2015 — “Until 2015, these audio and video objects were not encrypted on a per-session basis.”'],
      ['netflix-freebsd-tls-2016', 'TLS rollout, as Netflix engineers wrote in 2016 — “By the end of 2016 we expect the majority of streaming sessions to be using TLS encryption.”'],
      ['netflix-oc-briefing', 'Encoding depends on content — “For example, a video of a news anchor can be encoded using significantly less bandwidth than a car chase.”'],
      ['netflix-bba', 'Buffer-based rate choice — “Our own investigation reveals that capacity estimation is unnecessary in steady state; however using simple capacity estimation (based on immediate past throughput) is important during the startup phase, when the buffer itself is growing from empty.”'],
      ['netflix-oc-maintenance', 'Draining an appliance — “Plan to drain appliances of traffic 2 to 3 hours in advance of disconnecting or powering down appliances, so that clients currently being served by the appliance will finish by the start of the maintenance period and new client playback requests are properly directed to an alternate source.”'],
      ['netflix-chaos-engineering', 'Regional failover — “If there is an outage that is confined to one of the geographical regions, we have the ability to fail over to another region: to redirect incoming client requests from the unhealthy region to one of the healthy regions.”'],
      ['netflix-chaos-engineering', 'Rehearsed regularly — “we run Chaos Kong exercises at a cadence of once a month.”']
    ],
    cards: [
      ['What runs in Netflix\'s control plane and what runs on Open Connect?', 'Control plane (AWS; three regions in 2016): everything except streaming the video: browsing, recommendations, profiles, and choosing which appliances a client uses. Open Connect: appliances in ISPs and at internet exchanges that serve the audio and video files over HTTP.'],
      ['Why can Netflix pre-position content when most CDNs cache on demand?', 'Its catalogue is limited and known, and popularity can be predicted, so each deployment can hold nearly the whole catalogue and be refreshed overnight while the network is quiet, instead of filling on first request during the peak.'],
      ['What does a buffer-based adaptive bitrate algorithm do?', 'In steady state it picks the bitrate from how many seconds of video are buffered: a low buffer means a low rate, a full buffer a high rate. At startup the buffer says little, so it uses a simple throughput estimate to ramp up.']
    ],
    quiz: [
      ['An ISP\'s subscribers peak at 100,000 concurrent Netflix streams averaging 6 Mb/s. Open Connect\'s appliances page (as fetched in 2026) lists about 200 Gb/s of throughput for its current storage appliance. How many appliances does peak throughput alone require?', ['3', '24', '1', '3,000'], '100,000 × 6 Mb/s = 600,000 Mb/s = 600 Gb/s, and 600 ÷ 200 = 3. 24 multiplies by 8 as if the stream rate were in bytes; 1 divides by 8 the other way; 3,000 reads 600,000 Mb/s as gigabits. A real deployment adds headroom and redundancy on top, and the appliance figure changes as the hardware does.', ['netflix-oc-appliances']],
      ['Most CDNs copy a file to an edge cache when a user first asks for it. Netflix instead loads its appliances on a nightly schedule. What makes that possible and worth doing?', ['A known catalogue, so files go out in advance on off-peak capacity', 'A stable catalogue, so each appliance needs just one bitrate per title', 'Predictable demand, so clients no longer need the control plane to pick', 'Files too large to cache on demand, so they are pushed in bulk instead'], 'Netflix knows what it will serve and roughly what will be popular, so it can pre-position nearly the whole catalogue in each deployment and refresh it overnight, when ISP links built for the peak are idle. A pull-through cache fills on first request, which may come at peak and over long-haul links; file size does not stop that, as many providers cache on request. Each deployment holds every format and quality, and the control plane still chooses appliances.', ['netflix-oc-briefing']],
      ['An ISP needs to power down an embedded Netflix appliance for maintenance. What does Netflix ask it to do, and why?', ['Drain it 2–3 hours ahead, so sessions end and new plays go elsewhere', 'Power it off whenever convenient, as players switch servers in a second', 'Copy its content to a neighbouring appliance first, so no title is lost', 'Stop new sessions, then power it off ten minutes later, so few are cut'], 'Draining stops new playback starts on the appliance while current sessions run out, so nobody has to switch source mid-stream, which Netflix says can disrupt viewing. It also asks partners to schedule such work in the fill window, when traffic is low. Cutting the power while it still serves forces exactly the mid-stream switches draining avoids, and ten minutes is far shorter than a film, so sessions already playing would still be cut off.', ['netflix-oc-maintenance']],
      ['A Netflix player picks its bitrate from measured throughput, which in real sessions can swing between 17 Mb/s and 500 kb/s. Netflix and Stanford tested another signal in 2013. What was it, and when is a throughput estimate still needed?', ['Buffer occupancy; an estimate is still needed during startup', 'Buffer occupancy; an estimate is still needed in steady state', 'Round-trip time; a throughput estimate is still needed during startup', 'Round-trip time; an estimate is still needed in steady state'], 'In steady state the seconds of video in the buffer are enough to choose the rate, and acting on them avoids being misled by noisy throughput samples; this cut rebuffers by 10–20% against the then-default algorithm. At startup the buffer is empty and says little, so a simple estimate from recent throughput ramps the rate up.', ['netflix-bba']],
      ['In 2016 Netflix ran its control plane in three AWS regions. An outage hits one of them. How did Netflix handle it, and how did it know the plan worked?', ['Redirect clients to a healthy region; rehearse it monthly with Chaos Kong', 'Run the control plane on Open Connect appliances; test it each quarter', 'Restore the region from backups; rehearse the restore about once a year', 'Move video delivery to a third-party CDN; test it on a staging copy'], 'The control plane is replicated across three regions, so clients can be redirected away from an unhealthy one. Netflix cannot take a real region offline, so Chaos Kong simulates it by redirecting traffic, monthly as of 2016, and the result is judged by stream starts per second. Appliances serve video files; they do not run the control plane.', ['netflix-chaos-engineering']]
    ],
    explain: ['Walk through how you would design a video streaming service like Netflix, from requirements to failure modes.', ['Requirements: fast start, no stalls, evening-peak egress dominates cost', 'Control plane in the cloud vs data plane on appliances inside or beside ISPs', 'Steering clients to appliances from ISP routing data; each deployment holds nearly the whole catalogue', 'Proactive off-peak fill and content-aware encoding ladders', 'Adaptive bitrate from the buffer; draining appliances and regional failover rehearsed regularly']],
    duck: ['Why not stream every video straight from the cloud?', 'How does my TV know which server to download the film from?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['How many concurrent streams at the evening peak, and at what bitrates?', true, 'Peak egress sizes the delivery tier, the dominant cost.'],
        ['How large is the catalogue, and how fast does popularity change?', true, 'Decides whether content can be pre-positioned and how big each site must be.'],
        ['Which devices and connection speeds must playback support?', true, 'Sets the encoding ladder and the adaptive bitrate range.'],
        ['How fast must playback start, and how many stalls are tolerable?', true, 'The quality-of-experience targets that drive buffering and steering.'],
        ['Should thumbnails be stored as JPEG or as WebP files?', false, 'An image format detail; it does not shape the architecture.'],
        ['Which language should the encoding service be written in?', false, 'An implementation choice, not a requirement.'],
        ['Do members want a dark mode in the TV application?', false, 'A UI preference with no effect on delivery.'],
        ['Should the home row show ten titles or twelve?', false, 'A product layout detail for the recommendations team.']
      ] },
      { type: 'estimate', brief: 'Given: one ISP peaks at 250,000 concurrent streams at 4 Mb/s average · a storage appliance serves about 200 Gb/s · 4 GB streams 25 hours of video (Netflix, 2020) · 10 TB of new and newly popular files must load in a 6-hour nightly fill window.', fixed: [
        { q: 'Peak egress for this ISP, in Gb/s?', a: 1000, unit: 'Gb/s', tol: 0.05, how: '250,000 × 4 Mb/s = 1,000,000 Mb/s = 1,000 Gb/s, or 1 Tb/s.' },
        { q: 'Appliances needed for peak throughput alone?', a: 5, unit: 'appliances', tol: 0, how: '1,000 ÷ 200 = 5, before adding headroom and spares.' },
        { q: 'Average bitrate implied by 4 GB for 25 hours, in kb/s?', a: 356, unit: 'kb/s', tol: 0.1, how: '4 GB = 32,000 Mb. 25 h = 90,000 s. 32,000 ÷ 90,000 ≈ 0.36 Mb/s ≈ 356 kb/s.' },
        { q: 'Fill rate needed to load 10 TB in 6 hours, in Gb/s?', a: 3.7, unit: 'Gb/s', tol: 0.1, how: '10 TB = 80,000 Gb. 6 h = 21,600 s. 80,000 ÷ 21,600 ≈ 3.7 Gb/s, a small fraction of the evening egress, and on idle links.' }
      ] },
      { type: 'order', brief: 'Order the steps from fill to steady playback.', items: [
        'Overnight, new and popular titles are loaded onto the appliances',
        'The player asks the control plane in AWS to start a title',
        'The control plane picks appliances for this client using ISP routing data',
        'The player is told which appliances to fetch from',
        'It fetches the first chunks at a modest rate, using a throughput estimate',
        'With a buffer built up, it picks each later chunk\'s rate from the buffer level'
      ] },
      { type: 'diagram', brief: 'Draw both planes for one ISP at its evening peak: 250,000 streams each fetching a 4-second chunk every 4 seconds (62,500 chunk requests a second), plus the control-plane calls that browse and start playback.',
        labels: { gateway: 'API gateway (AWS)', app: 'Control plane (AWS)', index: 'Steering', db: 'Catalogue and members', cdn: 'Open Connect appliances', blob: 'Origin storage (AWS)' },
        required: ['client', 'gateway', 'app', 'index', 'db', 'cdn', 'blob'],
        edges: [['client', 'gateway'], ['gateway', 'app'], ['app', 'db'], ['app', 'index'], ['client', 'cdn'], ['cdn', 'blob']],
        layout: { client: [10, 190], gateway: [165, 90], app: [320, 90], index: [480, 20], db: [480, 150], cdn: [320, 320], blob: [480, 320] },
        why: {
          gateway: 'Every control-plane call (browsing, starting a title) enters AWS here and is spread over the service fleet. Video never comes this way.',
          app: 'Browsing, profiles and starting playback: it decides what to play and where from, and never carries the video itself.',
          index: 'Chooses the appliances for each play start from the ISP routing data the appliances share, so the player fetches from inside its own network.',
          db: 'The catalogue, member and viewing data that browsing and play starts read.',
          cdn: 'Appliances inside the ISP hold nearly the whole catalogue in every format and serve the chunks over HTTP, so almost every byte comes from here.',
          blob: 'Where every encoded file starts. The appliances are filled from it overnight, off-peak, so at the evening peak it sees only the rare file an appliance lacks.'
        },
        decoys: {
          ws: 'The player asks for each chunk over HTTP when its buffer needs one. Nothing is pushed to it.',
          queue: 'Nothing on the playback path is deferred. Filling the appliances runs on a nightly schedule, not per request.'
        },
        sim: {
          load: '62,500 chunk requests a second (250,000 streams, each fetching a 4-second chunk every 4 seconds), 5,000 browsing calls a second and 200 play starts a second. The two control-plane rates are assumptions for this exercise.',
          scale: 50,
          goals: { errors: 1, p99: 300 },
          flows: [
            { label: 'Video chunks', rps: 62500, needs: ['blob'],
              hops: [['client', 'cdn'], ['cdn', 'blob'], ['client', 'blob', { instead: 'cdn' }], ['client', 'gateway', { instead: ['cdn', 'blob'] }], ['client', 'app', { instead: ['cdn', 'blob', 'gateway'] }], ['gateway', 'app'], ['app', 'cdn'], ['app', 'blob', { instead: 'cdn' }]] },
            { label: 'Browsing calls', rps: 5000, needs: ['db'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['app', 'db']] },
            { label: 'Play starts', rps: 200, needs: ['index', 'db'],
              hops: [['client', 'gateway'], ['client', 'app', { instead: 'gateway' }], ['gateway', 'app'], ['app', 'db'], ['app', 'index']] }
          ],
          parts: {
            gateway: { cfg: { capacity: 512, serviceMs: 1, queueLimit: 1024, rateLimitRps: 4000, burst: 4000, authFailRate: 0 } },
            app: { cfg: { instances: 12, capacity: 2, serviceMs: 20, serviceCv: 0.5, queueLimit: 48 }, solo: { instances: 1 }, soloWhy: 'Nothing in front of it spreads the calls over the fleet, so every player reaches the same server.', fullWhy: 'It is sized for control-plane calls, a few thousand a second. Video chunks arrive at tens of thousands a second and are megabytes each: they belong on the appliances.' },
            index: { cfg: { capacity: 16, serviceMs: 5, serviceCv: 0.4, queueLimit: 64 } },
            db: { cfg: { capacity: 16, serviceMs: 15, serviceCv: 0.6, queueLimit: 64, lockMs: 0 } },
            cdn: { cfg: { capacity: 512, serviceMs: 3, serviceCv: 0.3, hitRate: 0.99, queueLimit: 2048 } },
            blob: { cfg: { capacity: 16, serviceMs: 40, serviceCv: 0.5, queueLimit: 128, prefixRps: 0 }, fullWhy: 'Origin storage holds the master copy of every file, far from the viewer. At the peak it is meant to see only the rare file an appliance lacks, not every chunk of every stream.' }
          },
          needWhy: { blob: 'Every encoded file starts in origin storage, and the appliances have to be filled from it.', db: 'Browsing and play starts read the catalogue and member data.', index: 'Without steering the player is not told which appliances to fetch from, or is sent across the internet instead of to one inside its own ISP.' },
          bad: {
            'client>db': 'The player never queries the catalogue directly: the control plane answers it.',
            'client>index': 'The player asks the control plane to start a title, and the control plane consults steering.',
            'cdn>app': 'Appliances are filled from origin storage overnight. They do not fetch video through the control plane.',
            'cdn>db': 'An appliance serves files. It does not query the catalogue.',
            'gateway>cdn': 'The gateway takes API calls in AWS. Video does not pass through the cloud on its way to the viewer.',
            'gateway>blob': 'The gateway takes API calls in AWS. Video does not pass through the cloud on its way to the viewer.',
            'gateway>db': 'The gateway forwards calls to the services. It does not query a database.'
          },
          traps: [
            { name: 'video streamed through the control plane from origin storage', drop: ['cdn'], wire: [['app', 'blob']] },
            { name: 'video fetched straight from origin storage', drop: ['cdn'], wire: [['client', 'blob']] },
            { name: 'appliances drawn, but the player reaches them through the control plane', cut: [['client', 'cdn']], wire: [['app', 'cdn']] },
            { name: 'no steering: nothing picks the appliances for a play start', drop: ['index'] },
            { name: 'no gateway in front of the control-plane fleet', drop: ['gateway'], wire: [['client', 'app']] }
          ]
        } }
    ] }
  });

  T({
    id: '6.4', mod: '6', title: 'Spotify: catalogue and recommendation', tag: 'Files from CDNs, events into personalisation',
    analogy: 'A record library with a radio station attached. The records never change and can be copied to every branch; the index cards and members\' lists are small and change all day; and every loan slip goes to a back office that, once a week, picks each member a mix from what similar members borrowed.',
    points: [
      'Requirements: browse and search a catalogue, start a track instantly, keep users\' playlists, and personalise Home and weekly playlists. Spotify\'s own numbers: more than 50 million tracks for more than 230 million monthly users (February 2020), and more than 8 million events a second at peak flowing into its data platform (Q1 2019).',
      'API and data: a track is an immutable file. Spotify stores each encoded track as a file on HTTP servers around the world, and the app fetches it in chunks (typically 512 kB) with range requests from a nearby server, through CDN partners (2018–2020). Spotify has not published its playlist and catalogue stores in the sources used here, so treat them as generic small, read-heavy, cached and sharded services.',
      'High-level design: three paths. Playback reads files from CDNs. Product APIs serve the catalogue, playlists and personalised shelves. Every listen, search and like becomes an event; Spotify\'s 2019 pipeline gave each event type its own Pub/Sub topic, ETL job and storage, delivered in hourly partitions, with SLOs from a few hours to 72 hours by priority.',
      'Hard part 1, recommendations, in the shape of topic 5.7: Spotify\'s Home (2021) runs candidate generation and then ranking, and its models moved from batch predictions to real-time serving with weekly retraining. Discover Weekly is the slow end: updated every Monday from past listening history, so a weekly batch build is enough for it. Spotify explains its personalisation in general with a collaborative example: two listeners who share four top artists might each be offered the other\'s fifth.',
      'Hard part 2, search: term matching in Elasticsearch misses queries worded differently from titles. In 2022 Spotify added dense retrieval for podcast episodes (query and episode embeddings, nearest-neighbour search in Vespa) as an extra source beside Elasticsearch, with a final reranker over all sources.',
      'Failure modes: a noisy event type must not hold up the events that pay royalties, so Spotify isolated types and chose "liveness over lateness". In ML, training and serving code drift apart: Spotify found a Home feature transformed differently at serving time for four months, and moved to logging the features it served and validating training against serving data.'
    ],
    pitfall: 'Putting recommendation in the playback path, or one model over 50 million tracks per request. Playback is file delivery from CDNs and should not depend on personalisation; recommendation is a funnel of candidates and a ranker, and a weekly playlist can be built in batch.',
    say: 'Audio is immutable files fetched in range requests (typically 512 kB in 2018) from CDNs; the catalogue and playlists are small read-heavy services; every listen becomes an event in a per-type pipeline (over 8 million events a second of all types at Spotify\'s 2019 peak), and those events feed weekly playlists like Discover Weekly, built in batch, and real-time Home models that generate candidates and then rank them.',
    refs: [
      ['spotify-cdn-alignment', 'Scale, 2020 — “Our streaming platform serves up more than 50 million tracks (plus an array of images and other assets) to more than 230 million monthly active users around the world”'],
      ['spotify-bbr', 'How audio is fetched — “When a user plays a song, the Spotify app will fetch the file in chunks from a nearby server with HTTP GET range requests. A typical chunk size is 512kB.”'],
      ['spotify-event-delivery', 'Event volume — “At the end of Q1 2019, we were producing globally more than 8M e/s at peak.”'],
      ['spotify-event-delivery', 'Daily volume — “in Q1 2019 we had 500 billion events a day without any issues.”'],
      ['spotify-event-delivery', 'Isolation per event type — “In the end, every Event Type has its own Pub/Sub topic, Extract, Transform, Load (ETL) process, and final storage location.”'],
      ['spotify-event-delivery', 'Liveness over lateness — “In other words, a noisy, broken, or blocked Event Type will not halt the rest of the system.”'],
      ['spotify-home-ml', 'Two stages on Home — “Stage 1: Candidate generation: The best albums, playlists, artists, and podcasts are selected for each listener.”'],
      ['spotify-home-ml', 'Training-serving skew — “A while ago, we discovered that we had been transforming one of the model’s features slightly differently at training time than at serving time, leading to potentially degraded recommendations — and there was no way to detect this, so it continued to happen for four months.”'],
      ['spotify-discovery-newsroom', 'Discover Weekly is weekly — “Each Monday, Discover Weekly, a playlist that serves listeners with tracks they might like based on their past listening histories, is updated.”'],
      ['spotify-discovery-newsroom', 'Collaborative filtering, in Spotify\'s words — “Imagine you and another person have similar music tastes. You have four of the same top artists, but your fifth artists are different.”'],
      ['spotify-nls', 'Why dense retrieval is one source of several — “Although Dense Retrieval / Natural Language Search has very interesting properties, it often fails to perform as well as traditional IR methods on exact term matching (and is also more expensive to run on all queries).”']
    ],
    cards: [
      ['Why did Spotify give every event type its own topic, ETL job and storage?', 'Event types differ in importance, volume and size. Isolation lets a noisy or broken type fall behind without delaying business-critical ones such as the end-of-play event used for royalties, and lets each type carry its own SLO.'],
      ['How fresh do Discover Weekly and the Home shelves need to be at Spotify?', 'Discover Weekly is updated every Monday from listening history, so a weekly batch build is enough. Home shelves are served by models in real time, with candidate generation then ranking, retrained weekly from features logged at serving time.'],
      ['Why is dense retrieval an additional source in Spotify search rather than a replacement?', 'It finds paraphrases that term matching misses, but it is weaker on exact terms and costs more per query, so Spotify blends its candidates with Elasticsearch\'s and lets a final reranker order them.']
    ],
    quiz: [
      ['Spotify reported about 500 billion events a day in Q1 2019, with a peak above 8 million a second. What is the average rate, and how does the peak compare?', ['About 5.8 million a second; the peak is about 1.4× that', 'About 580 thousand a second; the peak is about 14× that', 'About 64 thousand a second; the peak is about 125× that', 'About 5.8 thousand a second; the peak is about 1,400× that'], '500,000,000,000 ÷ 86,400 s ≈ 5.8 million a second, and 8 ÷ 5.8 ≈ 1.4. 580,000 comes from dividing by 864,000 (a stray zero); 64,000 treats the daily figure as the total for the 90 days of Q1 (÷ 7,776,000 s); 5,800 reads 500 billion as 500 million.', ['spotify-event-delivery']],
      ['A newly added low-priority event type suddenly sends ten times its usual volume, while the end-of-play events that pay royalties must keep arriving on time. How did Spotify\'s 2019 event delivery keep those flowing?', ['Each event type had its own topic, ETL job and storage location', 'Events went through one ordered stream, with royalty events placed first', 'Hourly partitions stayed open until each event type had been delivered', 'One shared consumer pool autoscaled on the total backlog of events'], 'Isolating types right after the Event Service means a noisy type backs up only its own topic and ETL, and each type has its own SLO. Spotify calls this liveness over lateness: a broken type does not halt the rest. Partitions that wait for every type do the opposite, and a shared pool scaled on total backlog still lets one type crowd out the others.', ['spotify-event-delivery']],
      ['Spotify moved a Home model from batch predictions to real-time serving, behind a new service that scores each request as it arrives. What silent failure should you guard against first, and how did Spotify guard against it?', ['Serving transforms a feature unlike training; log served features', 'The candidate stage goes stale; retrain the candidate models hourly', 'Request latency creeps up; cache each user\'s predictions for a day', 'Ranking overfits new users; hold out a random control group of users'], 'Real-time serving computes the model\'s features in a second place, and a small difference from the training code silently degrades recommendations: Spotify found one that had run for four months. It moved to one transformation path by logging the features actually served and training on them, and validates training against serving distributions daily. Latency is visible on any dashboard, and a day-long cache gives back the freshness the move was for; the other options are real concerns but none is silent in this way.', ['spotify-home-ml']],
      ['Spotify\'s Elasticsearch found nothing for "electric cars climate impact" because no episode title held every word. In 2022 Spotify added dense retrieval, with queries and episodes in one embedding space. Why keep Elasticsearch too?', ['Dense retrieval is weaker on exact terms and costlier to run per query', 'Nearest-neighbour search over millions of vectors is too slow to serve', 'The embedding model reads English, so other languages need term search', 'Vector search returns no matches for a query of just one or two words'], 'Semantic matching finds paraphrases, but term matching still does better on exact terms, and encoding every query with a Transformer costs more. Spotify made dense retrieval an additional source and gave the final reranker the query–episode cosine similarity as a feature. Nearest-neighbour search in Vespa covers tens of millions of episodes, the base model was multilingual, and a nearest-neighbour search always returns the closest vectors, however short the query.', ['spotify-nls']],
      ['Spotify serves each track as a file fetched in 512 kB chunks with HTTP range requests. In a 2018 A/B test it switched its audio servers\' TCP congestion control from CUBIC to BBR. What did it see, and what had to change on clients?', ['Stutter fell 6–10%, and no client change was needed', 'Click-to-sound latency fell, and each client app was updated', 'Stutter fell, but clients had to request 64 kB chunks', 'Bandwidth rose, but both ends needed IPv6 to use BBR'], 'Congestion control runs on the sender, so BBR needed only a server setting. Stutter dropped 6–10% and bandwidth rose 10–15% for the slowest cohorts, because BBR models the path\'s capacity instead of backing off at every random loss. Latency did not differ between the groups.', ['spotify-bbr']]
    ],
    explain: ['Walk through how you would design a music streaming service like Spotify, covering playback, data and recommendation.', ['Requirements and scale: catalogue, instant playback, playlists, personalisation; tens of millions of tracks, millions of events a second', 'Audio as immutable files from CDNs via range requests; catalogue and playlists as small read-heavy services', 'Event delivery isolated per event type into hourly partitions for analytics and training', 'Recommendation: weekly batch playlists plus real-time candidate generation and ranking', 'Search that blends term and dense retrieval through a reranker; isolation and skew checks as failure handling']],
    duck: ['Why not ask the recommender which song to play next every time one ends?', 'If a playlist has 10,000 songs, does the app download all of them when I open it?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['How many tracks are there, and how many listeners at peak?', true, 'Sizes storage, CDN egress and the candidate space for recommendation.'],
        ['How fast must playback start, and on what kinds of network?', true, 'Drives chunk size, CDN placement and prefetching.'],
        ['Which events pay royalties, and how late may they arrive?', true, 'Sets the delivery guarantees and SLOs of the event pipeline.'],
        ['Which surfaces need fresh picks, and which can be weekly?', true, 'Splits recommendation into batch and real-time paths.'],
        ['Should album art have square or rounded corners on Home?', false, 'A visual detail with no effect on the design.'],
        ['Which language are the mobile apps written in today?', false, 'Client implementation; it does not change the backend.'],
        ['Should the event bus be Kafka or Google Pub/Sub?', false, 'A tool choice that follows from requirements, not one of them.'],
        ['Can listeners pick a colour theme for the app?', false, 'A UI preference with no architectural weight.']
      ] },
      { type: 'estimate', brief: 'Given: 50M tracks · an average track lasts 3.5 minutes · 3 encodings per track averaging 160 kb/s · chunks of 512 kB · 500 billion events a day averaging 700 bytes.', fixed: [
        { q: 'Size of one 3.5-minute encoding at 160 kb/s, in MB?', a: 4.2, unit: 'MB', tol: 0.1, how: '160 kb/s × 210 s = 33,600 kb = 4,200 kB = 4.2 MB.' },
        { q: 'Audio storage for the whole catalogue (3 encodings each), in TB?', a: 630, unit: 'TB', tol: 0.1, how: '50,000,000 × 3 × 4.2 MB = 630,000,000 MB = 630 TB. Large but static: it is copied to CDNs, not queried.' },
        { q: 'Range requests to fetch one 4.2 MB encoding in 512 kB chunks?', a: 9, unit: 'requests', tol: 0, how: '4,200 ÷ 512 ≈ 8.2, so 9 requests, the last one partial.' },
        { q: 'Raw event data per day, in TB?', a: 350, unit: 'TB', tol: 0.1, how: '500 × 10⁹ × 700 B = 3.5 × 10¹⁴ B = 350 TB, which matches the volume Spotify reported for 2019.' }
      ] },
      { type: 'sort', brief: 'Is this done in batch (hours to a week ahead) or per request?', buckets: ['Batch', 'Per request'], items: [
        ['Rebuild Discover Weekly for every listener', 0], ['Retrain the Home candidate-generation models', 0], ['Load an hour of play events into the warehouse', 0], ['Total up royalties from end-of-play events', 0], ['Precompute episode embeddings for the search index', 0],
        ['Rank shelves when the listener opens Home', 1], ['Encode the typed search query into a vector', 1], ['Fetch the next 512 kB chunk of a playing track', 1], ['Rerank candidates from every search source', 1], ['Return a playlist\'s track list when it is opened', 1]
      ] },
      { type: 'diagram', brief: 'Draw the three paths at peak: about 1.3 million audio range requests a second, 1.2 million catalogue, playlist and Home reads a second, and 8 million events a second on their way to the data platform.',
        labels: { cdn: 'Audio CDN', blob: 'Audio files (origin)', app: 'API services', cache: 'Metadata cache', db: 'Metadata store', queue: 'Event stream', worker: 'ETL jobs', warehouse: 'Data platform' },
        required: ['client', 'cdn', 'blob', 'app', 'cache', 'db', 'queue', 'worker', 'warehouse'],
        edges: [['client', 'cdn'], ['cdn', 'blob'], ['client', 'app'], ['app', 'cache'], ['app', 'db'], ['app', 'queue'], ['queue', 'worker'], ['worker', 'warehouse']],
        layout: { client: [10, 190], cdn: [165, 40], blob: [330, 40], app: [165, 240], cache: [330, 160], db: [480, 160], queue: [330, 320], worker: [480, 320], warehouse: [630, 320] },
        why: {
          cdn: 'A track never changes once encoded, so CDN servers near the listener hold the popular ones and answer the app\'s 512 kB range requests.',
          blob: 'The origin copy of every encoded track. It sees only the requests the CDN cannot answer, mostly tracks that few people play.',
          app: 'The product APIs (catalogue, playlists, Home) and the endpoint the app reports events to. Audio never passes through it.',
          cache: 'Most reads are for the same popular albums, artists and playlists, so they are answered from memory before they reach the store.',
          db: 'The catalogue and playlists, and the picks that batch jobs precompute for each listener, so building Home is a lookup rather than a computation.',
          queue: 'Events are accepted at once and delivered later. Spotify gave each event type its own topic, so a noisy type cannot hold up the rest.',
          worker: 'Read the stream and write the events into hourly partitions, one ETL job per event type.',
          warehouse: 'Keeps the events for royalties, analytics and training. Weekly playlists such as Discover Weekly are built from here in batch.'
        },
        decoys: {
          ws: 'The app asks for what it needs when it needs it. Nothing on these paths is pushed to it.',
          ledger: 'Royalties are totalled in batch from the end-of-play events in the data platform. No money moves while a track plays.'
        },
        sim: {
          load: '1.3 million audio range requests a second (assuming 30 million people listening at once, each fetching nine 512 kB chunks per 3.5-minute track), 1.2 million metadata reads a second (an assumption) and 8 million events a second, the peak Spotify reported for 2019.',
          scale: 4000,
          goals: { errors: 1, p99: 100 },
          flows: [
            { label: 'Audio range requests', rps: 1300000, needs: ['blob'],
              hops: [['client', 'cdn'], ['cdn', 'blob'], ['client', 'blob', { instead: 'cdn' }], ['client', 'app', { instead: ['cdn', 'blob'] }], ['app', 'cdn'], ['app', 'blob', { instead: 'cdn' }]] },
            { label: 'Catalogue, playlist and Home reads', rps: 1200000, aside: ['cache', 'db'], needs: ['db'],
              hops: [['client', 'app'], ['app', 'cache'], ['app', 'db'], ['cache', 'db'], ['app', 'warehouse', { instead: 'db' }]] },
            { label: 'Play and other events', rps: 8000000, needs: ['warehouse'],
              hops: [['client', 'app'], ['app', 'queue'], ['app', 'warehouse', { instead: 'queue' }], ['queue', 'worker'], ['worker', 'warehouse']] }
          ],
          parts: {
            cdn: { cfg: { capacity: 512, serviceMs: 3, serviceCv: 0.3, hitRate: 0.95, queueLimit: 2048 } },
            blob: { cfg: { capacity: 8, serviceMs: 40, serviceCv: 0.5, queueLimit: 128, prefixRps: 0 }, fullWhy: 'File storage holds every track once, far from most listeners. It is meant to see only the CDN\'s misses, not every chunk of every play.' },
            app: { cfg: { instances: 6, capacity: 8, serviceMs: 3, serviceCv: 0.5, queueLimit: 128 }, fullWhy: 'A request holds its slot until everything it called has answered. Is anything slow being done while the listener waits?' },
            cache: { cfg: { capacity: 128, serviceMs: 1, hitRate: 0.9, queueLimit: 512 } },
            db: { cfg: { capacity: 4, serviceMs: 20, serviceCv: 0.6, queueLimit: 64, lockMs: 0 }, fullWhy: 'It is sized for the reads the cache misses. Most reads repeat the same popular albums and playlists and should be answered before they get here.' },
            queue: { cfg: { queueLimit: 40000 } },
            worker: { cfg: { instances: 32, capacity: 16, serviceMs: 5, serviceCv: 0.5 } },
            warehouse: { cfg: { capacity: 512, serviceMs: 100, serviceCv: 0.6, queueLimit: 1024, lockMs: 0 }, fullWhy: 'The data platform is built for bulk loads and large scans, so even a small request takes a long time. Nothing a listener waits for should be read from or written to it.' }
          },
          needWhy: { blob: 'Every encoded track starts in file storage, and the CDN is filled from it.', db: 'The catalogue, playlists and precomputed picks are stored here for good.', warehouse: 'An event that never reaches the data platform pays no royalties and trains no model.' },
          bad: {
            'client>db': 'The app never queries the store directly: the API services check who is asking.',
            'client>cache': 'The app never reads the cache directly.',
            'client>queue': 'The app posts events to the API services, which check them before they go on the stream.',
            'client>warehouse': 'The app never writes to the data platform directly.',
            'queue>warehouse': 'A stream holds events. Something has to read them and write the partitions: draw the ETL jobs between the two.',
            'cdn>app': 'The CDN fills from file storage. Audio does not come from the API services.',
            'cdn>db': 'Audio files are not kept in the metadata store.'
          },
          ok: [['worker', 'db']],
          traps: [
            { name: 'no CDN: every chunk comes straight from file storage', drop: ['cdn'], wire: [['client', 'blob']] },
            { name: 'audio relayed through the API services', drop: ['cdn'], wire: [['app', 'blob']] },
            { name: 'play events written to the data platform inside the request', drop: ['queue', 'worker'], wire: [['app', 'warehouse']] },
            { name: 'event stream drawn but nothing reads from it', drop: ['worker'] },
            { name: 'no metadata cache', drop: ['cache'] },
            { name: 'Home and playlists read from the data platform instead of a precomputed store', cut: [['app', 'db']], wire: [['app', 'warehouse']] }
          ]
        } }
    ] }
  });

  T({
    id: '6.5', boss: 'chirp', mod: '6', title: 'Twitter/X: the home timeline', tag: 'Fan out on write, merge the giants on read',
    analogy: 'A newsagent who slips each paper into every subscriber\'s pigeonhole as it arrives, so collecting yours takes a second. For the one paper half the town takes, it is quicker to leave a stack on the counter and hand a copy to each person as they collect.',
    points: [
      'Requirements and scale: post, follow, and read a home timeline that merges, in time order, everyone you follow. In Twitter\'s QCon San Francisco 2012 talk "Timelines at Scale" (summarised by High Scalability in 2013) that meant 150M active users, 400M tweets a day, and 300K requests a second reading timelines against about 6,000 writing: a system you optimise for reads.',
      'API and data model: POST a post; GET the timeline with a cursor. Posts get 64-bit Snowflake IDs (41-bit millisecond timestamp, 10-bit machine ID, 12-bit sequence), which sort roughly by time without loading the post. A cached timeline entry held only the tweet ID, the author\'s user ID and 4 bytes of flags, and a timeline was capped at 800 entries.',
      'High-level design: the write API stores the tweet, puts it on a queue and lets the client go. Fan-out workers read the follower list from the social graph service and insert the tweet ID into each active follower\'s list in a Redis cluster, kept as 3 copies. A read finds one copy of your list and then hydrates the IDs into tweets and users from their own caches.',
      'Hard part 1, the largest accounts: fan-out costs one insert per follower, so a tweet from an account with 31M followers could take up to 5 minutes to reach everyone, and replies to it were often seen before the tweet itself. The direction Twitter gave in the 2012 talk was to stop fanning out those accounts and merge their tweets in at read time, which it said would save tens of percent of its compute.',
      'Hard part 2, search and ranking: search is the inverse design. Each tweet is written to one Earlybird (in-memory Lucene) shard and every query reads across all shards, in about 100 ms. X\'s For You timeline, open-sourced in 2023, takes about half its posts from that search index (in-network) and the rest from other candidate sources, among them tweet-mixer\'s out-of-network posts; it hydrates about 6,000 features, scores them with a neural heavy ranker, then filters for author diversity, in-network balance and visibility.',
      'Failure modes: the timeline cache is derived data, so a lost list is rebuilt from the social graph and stored tweets; only users active in the last 30 days are kept in memory; and X\'s Home Mixer keeps a reverse-chronological pipeline as a backup in case the ranked pipeline fails.'
    ],
    pitfall: 'Sizing fan-out on the average account. The cost is set by the tail: one post from an account with tens of millions of followers is tens of millions of cache writes, delivered over minutes and out of order with the replies to it.',
    say: 'Twitter\'s figures were 300K timeline reads a second against 6K writes, about 50 to 1, so I would precompute each active user\'s timeline as a capped list of post IDs in Redis, fan out asynchronously from a queue, and, as Twitter planned to, merge in posts from the few accounts with millions of followers at read time.',
    refs: [
      ['qconsf2012-timelines', 'The talk, given at QCon San Francisco 2012 — “With hundreds of millions of users, Twitter operates one of the world\'s largest timeline delivery systems.”'],
      ['highscalability-twitter-timelines', 'Read-heavy, 2012 (High Scalability\'s summary of the talk) — “300K QPS are spent reading timelines and only 6000 requests per second are spent on writes”'],
      ['highscalability-twitter-timelines', 'What a cached entry holds — “What is being stored is the tweet ID of the generated tweet, the user ID of the originator of the tweet, and 4 bytes of bits used to mark if it’s a retweet or a reply or something else.”'],
      ['highscalability-twitter-timelines', 'A capped list — “Your home timeline sits in a Redis cluster and is 800 entries long.”'],
      ['highscalability-twitter-timelines', 'Replies overtake the original — “Replies are being seen all the time before the original tweets for celebrities.”'],
      ['highscalability-twitter-timelines', 'Search reads everywhere — “When a read comes in it must do an 0(n) read across the cluster. Most people don’t use search so they can be efficient on how to store tweets for search.”'],
      ['snowflake-readme', 'IDs sort without loading the object — “The ids should be sortable without loading the full objects that the represent.”'],
      ['x-algorithm-readme', 'Half the For You posts come from search — “Find and rank In-Network posts. ~50% of posts come from this candidate source.”'],
      ['x-algorithm-readme', 'Another candidate source, tweet-mixer — “Coordination layer for fetching Out-of-Network tweet candidates from underlying compute services.”'],
      ['x-home-mixer-readme', 'Feature hydration — “Fetch the ~6000 features needed for ranking”'],
      ['x-home-mixer-readme', 'A fallback when ranking fails — “ForYouConversationServiceCandidatePipelineConfig (backup reverse chron pipeline in case Scored Tweets fails)”'],
      ['x-heavy-ranker-readme', 'The score is a weighted sum — “The outputs of the model are combined into a final model score by doing a weighted sum across the predicted engagement probabilities.”']
    ],
    cards: [
      ['Why did Twitter keep only IDs in each cached timeline, and what does a read then do?', 'An entry was the tweet ID, the author\'s ID and 4 bytes of flags, so 800 entries for every active user fit in RAM. A read finds one copy of the list, then hydrates the IDs into tweets and users with multigets against their own caches.'],
      ['How do search and the home timeline differ in where they do the work?', 'The home timeline does one insert per follower on write so that a read is one lookup. Search writes each tweet to one Earlybird shard and reads across every shard on each query, in about 100 ms. Few people search, so paying at read time is the cheaper side.'],
      ['What did the ranked For You timeline add to the chronological design?', 'Several candidate sources (about half in-network from the Earlybird search index, the rest from others such as tweet-mixer, which fetches out-of-network posts), about 6,000 features per candidate, a neural heavy ranker whose score is a weighted sum of predicted engagements, and filters for author diversity, in-network balance and visibility. A reverse-chronological pipeline stays as the backup.']
    ],
    quiz: [
      ['Twitter capped each cached home timeline at 800 entries. Take an entry as an 8-byte tweet ID, an 8-byte author ID and 4 bytes of flags, and 150M active users. How much RAM does one copy of all timelines need, before overhead?', ['About 2.4 TB', 'About 7.2 TB', 'About 0.96 TB', 'About 240 GB'], '150M × 800 × 20 bytes = 2.4 TB for one copy, 7.2 TB for three. Twitter\'s whole Redis cluster had "a couple of terabytes of RAM", so in practice fewer users were cached or most lists were short of the cap (Twitter cached only users active within 30 days, a window it adjusted to cache capacity). 7.2 TB is the figure for the three copies it kept, not one; 0.96 TB counts only the 8-byte tweet ID; 240 GB drops a factor of ten.', 'calc'],
      ['A singer with 30M followers posts; her fan-out takes minutes. A follower near the front of it replies within seconds, and the replier\'s 2,000 followers mostly follow the singer too. What do some of those shared followers see?', ['The reply in their timeline before the post that it answers', 'Both together, because their timelines are sorted by tweet ID', 'Only the post, because replies to other accounts are stripped', 'Neither, until her fan-out has finished for all of her followers'], 'The reply\'s fan-out (2,000 inserts) finishes long before hers (30M), so it lands first in the timelines her fan-out reaches late. Sorting by ID cannot help: the original is not in the list yet. Twitter described exactly this race for its biggest accounts.', ['highscalability-twitter-timelines']],
      ['Twitter precomputed home timelines on write, yet its search index wrote each tweet to one Earlybird shard and made every query read all shards (about 100 ms). Why not precompute search results the same way?', ['Queries are open-ended and few users search, so there is no fixed list to fill', 'Search must show tweets from the last second, and fan-out cannot deliver that fast', 'Earlybird keeps its index on disk, so extra writes would cost too much', 'Reading every shard costs less than one cache lookup once there are many shards'], 'A timeline has a known owner to precompute for; a search does not, and most people never search, so Twitter stored tweets for search cheaply and paid at read time. The index was held in RAM, and fan-out also delivered within seconds, so neither of those explains it.', ['highscalability-twitter-timelines']],
      ['X\'s heavy ranker (weights published in April 2023) scores a post as a weighted sum: like 0.5, reply 13.5, negative feedback −74. A post has P(like) = 0.2, P(reply) = 0.02 and P(negative feedback) = 0.01, other terms zero. What is its score?', ['−0.37', '+1.11', '+0.37', '+0.10'], '0.5 × 0.2 + 13.5 × 0.02 − 74 × 0.01 = 0.10 + 0.27 − 0.74 = −0.37. A one-in-a-hundred chance of "show less" outweighs a one-in-five chance of a like. +1.11 adds the negative term instead of subtracting it; +0.37 reverses the sign of the result; +0.10 counts only the like.', ['x-heavy-ranker-readme']],
      ['The timeline service merges a reader\'s cached timeline with the latest posts of three huge accounts they follow, fetched separately as lists of post IDs. As in Twitter\'s 2012 design, a cached entry holds only the post ID, the author\'s ID and 4 bytes of flags. What lets it order the merged list by time without loading any post?', ['Snowflake IDs begin with a timestamp, so ID order is roughly time order', 'IDs come from per-shard auto-increment counters, so they rise with time', 'Redis records when each entry was pushed, so lists merge on that time', 'Each list is in order already, so the merge interleaves them by position'], 'Snowflake puts a millisecond timestamp in the top bits so that IDs can be sorted without loading the objects, roughly in creation order. Counters on different shards run independently, so their values cannot be compared; a Redis list holds only the values pushed into it; and a position in one list says nothing about time relative to another list.', ['snowflake-readme', 'highscalability-twitter-timelines']]
    ],
    explain: ['Explain how you would design the home timeline for a Twitter-sized system, end to end.', ['Requirements and the read:write ratio (Twitter, 2012: 300K timeline reads against 6K writes a second)', 'Data model: Snowflake IDs; a capped list of IDs per active user in Redis', 'Write path through a queue and fan-out workers; read path is one lookup, then hydration', 'Huge accounts are merged at read time; fan-out delays cause ordering races', 'Search (Earlybird, scatter-gather) and the ranked For You pipeline with its fallback']],
    duck: ['If everyone\'s timeline is precomputed, why is search not precomputed too?', 'Why store only IDs in the timeline instead of the whole post?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['How far back must the timeline scroll before older posts may load slowly?', true, 'Sets the length of each cached list; Twitter kept 800 entries.'],
        ['What share of accounts open the app at least once a month?', true, 'Only active users\' timelines need to sit in memory.'],
        ['Must the timeline include posts from accounts the user does not follow?', true, 'Out-of-network posts need retrieval and ranking, not just fan-out.'],
        ['If one has to give, may posting or reading the timeline degrade first?', true, 'Decides which path gets the redundancy and the spare capacity.'],
        ['Should the timeline cache be Redis or Memcached for this team?', false, 'A tool choice you make later, from the requirements.'],
        ['Which language should the fan-out service be written in?', false, 'Does not change the architecture.'],
        ['Can the post store be sharded by user ID from the very first day?', false, 'A design decision of yours, not a question about the product.'],
        ['Should posts be serialised internally as JSON or as Thrift?', false, 'An implementation detail with no effect on the design.']
      ] },
      { type: 'estimate', brief: 'Given: 200M daily users · 100M posts a day · 200 followers on average · 800 cached entries per user at 20 bytes each · fan-out of one post runs at 100,000 inserts a second.', fixed: [
        { q: 'RAM for one copy of every daily user\'s cached timeline, in TB?', a: 3.2, unit: 'TB', tol: 0.1, how: '200M × 800 × 20 bytes = 3.2 TB. Keep three copies, as Twitter did, and it is 9.6 TB.' },
        { q: 'Accounts with over 1M followers post 1,000 times a day, with 2M followers on average. What percentage of all fan-out inserts do they cause?', a: 10, unit: '%', tol: 0.1, how: 'All posts: 100M × 200 = 20 billion inserts a day. Big accounts: 1,000 × 2M = 2 billion, which is 10%, from 0.001% of the posts.' },
        { q: 'One of those posts goes to 2M followers at 100,000 inserts a second. Seconds until the last follower has it?', a: 20, unit: 'seconds', tol: 0.1, how: '2,000,000 ÷ 100,000 = 20 s, while a reply from a small account lands in about a second. That gap is how replies appear before the post they answer.' },
        { q: 'Instead, every open reads the recent posts of the 4 big accounts a user follows. With 5 opens per user a day, extra lookups a second?', a: 46300, unit: 'lookups/s', tol: 0.15, how: '200M × 5 × 4 = 4 billion a day ÷ 86,400 ≈ 46,000 a second, to remove about 23,000 inserts a second. The lookups hit a few short, hot lists that a cache serves well; the inserts were writes into 2M separate lists per post.' }
      ] },
      { type: 'order', brief: 'Put the path of a post, from publishing to a follower\'s screen, in order.', items: [
        'The API stores the post, queues it for fan-out and replies to the client',
        'A fan-out worker fetches the author\'s follower list from the social graph',
        'The worker skips followers who have not been active in the last 30 days',
        'The worker inserts the post ID into each remaining follower\'s cached list',
        'A follower opens the app and the timeline service reads one copy of the list',
        'The timeline service hydrates the IDs into posts and authors'
      ] }
    ] }
  });

  T({
    id: '6.6', boss: 'ledgerpay', mod: '6', title: 'Stripe: payments and the ledger', tag: 'Refuse when unsure, record every movement',
    analogy: 'A bank clerk whose line to head office drops in the middle of a transfer. She does not fill in a new slip and send it again; she marks the original slip "outcome unknown", phones back later to find out, and books every pound in two columns that must balance by the evening.',
    points: [
      'Requirements and scale: charge a customer exactly once, report every outcome, and account for every unit of money. Volume is high but not the hard part: Stripe wrote in 2024 that it processed 300 million transactions ($18.6B) over the previous Black Friday to Cyber Monday with API availability above 99.999%, and that its Ledger sees five billion events a day.',
      'API and data model: a PaymentIntent is a state machine: requires_payment_method → requires_confirmation → requires_action (for example 3D Secure) → processing → succeeded, with requires_capture when authorisation and capture are separate. A declined attempt returns it to requires_payment_method, it can be canceled before processing, and bank debits can sit in processing for days.',
      'Every POST carries an Idempotency-Key. In API v1 Stripe saves the status code and body of the first request once execution begins, including 500 errors, replays them for a retry with the same key, rejects the key if the parameters differ, and keeps keys for at least 24 hours.',
      'Hard part 1, the unknown outcome: a network error or a 500 means the charge may or may not have happened. Retry with the same key and parameters within 24 hours; after a 500, or when the window ends, do not send a new key: retrieve the object, read the webhook events and reconcile. Refusing to proceed costs a delay; proceeding blind can cost a second charge.',
      'Hard part 2, proving the money is right: Ledger is an immutable log of events built on double-entry bookkeeping. A flow moves balances through clearing accounts that should return to zero, so one missing, late or wrong event leaves a nonzero balance that a query finds. Stripe reported 99.99% of dollar volume fully ingested and verified within four days.',
      'Webhooks report what finishes later: an event can arrive more than once, retries continue for up to three days, and order is not guaranteed. Verify the HMAC signature and its signed timestamp (5-minute default tolerance), return 2xx before slow work, and dedupe by event ID (and, for the rare duplicate sent as a separate Event, by data.object ID plus event type).'
    ],
    pitfall: 'Treating a timeout or a 500 as a failure and retrying under a fresh idempotency key. The first attempt may have succeeded, and the new key turns the retry into a second, independent charge.',
    say: 'Every create carries an idempotency key; a timeout or 500 is "unknown" and is resolved from the object and its webhooks, never retried under a new key; and every movement is an immutable double-entry ledger event, so a clearing account that does not return to zero points at a missing or wrong event.',
    refs: [
      ['stripe-ledger', 'Scale and availability (2024) — “Last Black Friday to Cyber Monday, Stripe processed 300 million transactions with a total payment volume of $18.6B—and the Stripe API maintained greater than 99.999% availability.”'],
      ['stripe-ledger', 'Double-entry — “Ledger is based on double-entry bookkeeping, a standard method for guaranteeing that all money in a system is fully accounted for by balancing credits and debits.”'],
      ['stripe-ledger', 'Order does not matter — “Even if they arrive out of order, or are created by different sources, Ledger maintains accurate fund flows through the identifier for business and id.”'],
      ['stripe-ledger', 'A wrong ID leaves two balances — “Consider next how a wrong value (business: B vs. business: A) results in two clearing accounts with nonzero balance.”'],
      ['stripe-paymentintents-lifecycle', 'A declined attempt goes back — “If the payment attempt fails (for example, due to a decline), the PaymentIntent’s status returns to requires_payment_method so that the payment can be retried.”'],
      ['stripe-idempotent-requests', 'The replay includes errors — “Retries with the same key return the saved response, including 500 errors.”'],
      ['stripe-error-handling', 'A 500 is indeterminate — “Treat the outcome of a request that returns 500 as indeterminate: the operation might have produced side effects even though you received an error.”'],
      ['stripe-error-handling', 'Concurrent retries — “If a 409 indicates that another request with the same key is still executing, wait and retry with that key and the same parameters.”'],
      ['stripe-webhooks', 'No ordering, dedupe by ID — “Don’t use created to determine event order or whether you’ve already processed an event. Track event IDs to identify duplicate deliveries instead.”'],
      ['stripe-webhooks', 'Duplicates as separate events — “In some cases, two separate Event objects are generated and sent. To identify these duplicates, use the ID of the object in data.object along with the event.type.”'],
      ['stripe-webhooks', 'Old timestamps — “If the signature is valid but the timestamp is too old, you can have your application reject the payload.”'],
      ['stripe-webhooks', 'Each retry is signed afresh — “If Stripe retries an event (for example, your endpoint previously replied with a non-2xx status code), then we generate a new signature and timestamp for the new delivery attempt.”'],
      ['stripe-webhooks', 'Retries for days — “Stripe attempts to deliver events to your destination for up to three days with an exponential back off in live mode.”']
    ],
    cards: [
      ['What are the states of a Stripe PaymentIntent?', 'requires_payment_method → requires_confirmation → requires_action (for example 3D Secure) → processing → succeeded, with requires_capture when capture is separate. A decline sends it back to requires_payment_method, and it can be canceled before processing or succeeded.'],
      ['How long may a client retry a Stripe v1 POST with the same idempotency key, and what then?', 'Stripe keeps keys for at least 24 hours and may prune them after that; a reused key after pruning can execute a new request. Retry with the same key and parameters within 24 hours, then stop, retrieve the object, check the Dashboard and the webhook events, and reconcile.'],
      ['How does a double-entry ledger with clearing accounts find a bug?', 'Every event moves money between accounts, so credits and debits balance. Intermediate (clearing) accounts should return to zero when a flow completes; a missing, late or misattributed event leaves a nonzero clearing balance that one query finds.']
    ],
    quiz: [
      ['Checkout calls create-payment (API v1) with an idempotency key and gets a 500. The product manager wants an immediate retry with a fresh key so that the customer is not kept waiting. What should the integration do?', ['Treat it as unknown: check the payment or its webhooks before any new key', 'Retry with a fresh key now, since a 500 means that nothing was processed', 'Retry with the same key until it succeeds, which will yield a new outcome', 'Refund the amount at once to be safe, and then retry with a fresh key'], 'Stripe treats a 500 as indeterminate: the charge may have happened. A fresh key would be a second charge, and in API v1 the same key replays the stored 500, so retrying it changes nothing. Show "processing" and resolve the outcome first.', ['stripe-error-handling', 'stripe-idempotent-requests']],
      ['Two copies of one create-payment request, same idempotency key and parameters, reach Stripe a few milliseconds apart. One gets 409 Conflict. What should the client that got the 409 do?', ['Wait, then retry with the same key and the same parameters', 'Retry at once with a new key, since the first one is now locked', 'Mark the payment as failed and ask the customer for another card', 'Treat the 409 as proof of success and show the order as paid'], 'The 409 means the first copy is still executing. Retrying later with the same key returns its result; a new key can start a second operation. The 409 says nothing about how the first copy will end, so it is not a success, and not a failure that calls for another card.', ['stripe-error-handling']],
      ['A webhook handler sometimes gets invoice.paid before customer.subscription.created, and now and then the same event twice. A developer proposes sorting events by their created timestamp and skipping any timestamp already seen. What is wrong?', ['created is in seconds and order is not guaranteed; dedupe on the event ID', 'The sort is fine, but the dedupe should use a hash of the event payload', 'The dedupe is fine, but events should be processed in order of arrival', 'Buffer events for a few seconds, then sort by created and dedupe as proposed'], 'Distinct events can share a created second, so skipping by timestamp drops real events, and Stripe does not deliver in order; with retries lasting up to three days, no short buffer restores the order, and arrival order is the very thing that is wrong. Log processed event IDs, and fetch any object you need from the API instead of waiting for its event. Stripe notes that a few duplicates arrive as separate Event objects; catch those by data.object ID plus event type.', ['stripe-webhooks']],
      ['Your webhook endpoint receives an event whose Stripe-Signature holds a valid v1 HMAC, but the signed timestamp is two hours old. What should you do?', ['Reject it as a likely replay: the timestamp is far outside tolerance', 'Accept it as a Stripe retry, which keeps the signature of the first try', 'Accept it, after setting the tolerance to 0 to check timestamps strictly', 'Reject it, and rotate the signing secret because the HMAC was forged'], 'The timestamp is inside the signed payload, so it cannot be altered, and Stripe generates a new signature and timestamp for each retry: an old timestamp on a valid signature is a captured payload being replayed, not a retry. The HMAC is genuine, so nothing was forged, and a tolerance of 0 disables the recency check altogether.', ['stripe-webhooks']],
      ['charge.creation moves each charge into a charge_undisbursed account keyed by business; charge.release moves it out. After a day of $40 charges, business A\'s account shows +$120 and business B\'s, which had no charges, shows −$120. What happened?', ['Three of A\'s charge.release events were published with business B', 'Three of A\'s charge.creation events were published with business B', 'Three of A\'s releases arrived before their charge.creation events', 'Three of A\'s charge.release events were dropped by the publisher'], '$120 ÷ $40 = 3 charges whose releases debited B instead of A: A keeps +$120 and B goes to −$120. That is the wrong-business case Stripe describes, which leaves two clearing accounts nonzero; the signs follow from the moves defined in the stem. Creations sent to B would give the opposite signs (A −$120, B +$120); missing releases would leave B at zero; and order does not matter, because Ledger matches a creation to its release by business and ID.', ['stripe-ledger']]
    ],
    explain: ['Explain how you would design a payment API like Stripe\'s so that money is never lost or charged twice.', ['Requirements: exactly-once effect, every outcome reported, every unit accounted for; volume is secondary', 'PaymentIntent state machine and idempotency keys (stored result, 24-hour window, parameter check)', 'Unknown outcomes (timeouts, 500s): same key, then reconcile; never a fresh key', 'Immutable double-entry ledger; clearing accounts expose missing or wrong events', 'Webhooks: at least once, unordered, signed with a timestamp; dedupe by event ID']],
    duck: ['If the request failed with a 500, why can\'t I just send it again?', 'Why keep two entries for every payment instead of one row with a status?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['Are only cards in scope, or bank debits that settle over days too?', true, 'Slow methods add a processing state that can last days.'],
        ['Do merchants need to authorise now and capture the money later?', true, 'Adds a requires_capture state and a second call.'],
        ['How do merchants learn of outcomes that finish after the call returns?', true, 'Needs webhooks: signed, retried, deduplicated.'],
        ['For how long must a merchant be able to retry a request safely?', true, 'Sets how long idempotency keys and their results are kept.'],
        ['Should the payment service be written in Ruby or in Go?', false, 'A language choice that changes nothing here.'],
        ['Can payment status be cached in a CDN so that reads are faster?', false, 'A solution, and one that serves stale money state.'],
        ['Should the ledger tables be sharded by currency from day one?', false, 'An implementation decision, not a product question.'],
        ['Will the merchant dashboard be built as a single-page app?', false, 'Front-end detail, outside this design.']
      ] },
      { type: 'estimate', brief: 'Given: Stripe\'s figures published in 2024: 300M transactions over the four days from Black Friday to Cyber Monday, and 5 billion Ledger events a day. For your own design: 10M payments a day, each idempotency key kept 24 hours with a 1 KB stored response.', fixed: [
        { q: 'Average transactions a second over those four days?', a: 868, unit: 'tx/s', tol: 0.1, how: '300M ÷ (4 × 86,400 s) ≈ 868 a second, before any peak within a day.' },
        { q: 'Average Ledger events a second?', a: 57870, unit: 'events/s', tol: 0.1, how: '5,000,000,000 ÷ 86,400 ≈ 57,900 a second. Ledger records each operation of every fund flow, not only payments, so it runs far above the payment rate.' },
        { q: 'Idempotency storage for your 10M payments a day, in GB?', a: 10, unit: 'GB', tol: 0.1, how: '10M keys alive at once × 1 KB = 10 GB. Exactly-once retries cost gigabytes, not a new tier of infrastructure.' },
        { q: 'A merchant\'s webhook endpoint is down for 6 hours while 50 events a second are generated for it. How many deliveries wait to be retried?', a: 1080000, unit: 'events', tol: 0.05, how: '50 × 6 × 3,600 = 1.08M. Stripe keeps retrying for up to three days, so they arrive late and out of order: the handler must dedupe by event ID and not assume order.' }
      ] },
      { type: 'order', brief: 'Put the life of a bank-debit payment in order.', items: [
        'The merchant creates a PaymentIntent with an Idempotency-Key: requires_payment_method',
        'The customer\'s bank account details are attached: requires_confirmation',
        'The merchant confirms and the debit is submitted: processing, possibly for days',
        'The debit settles and the funds are in the account: succeeded',
        'Stripe sends payment_intent.succeeded; the endpoint verifies it and returns 2xx',
        'The merchant records the event ID and then fulfils the order'
      ] }
    ] }
  });

  T({
    id: '6.7', mod: '6', title: 'WhatsApp: store-and-forward messaging', tag: 'Hold it until a device says it has it',
    analogy: 'A post office box for every phone. A letter waits in the box only until its owner collects it and signs for it, and then the post office shreds its copy. The post office never holds a key that opens the envelopes.',
    points: [
      'Requirements and scale: one-to-one and group messages to phones that are often offline, receipts for sent, delivered and read, end-to-end encryption, and several devices per account. WhatsApp\'s 2014 Erlang Factory talk gave 465M monthly users, 19B messages in and 40B out a day, 147M concurrent connections and a peak of 342K messages in a second.',
      'Connections: each device keeps one long-lived connection to a chat server, inside a Noise Pipes encrypted channel. WhatsApp ran Erlang on FreeBSD; it blogged in January 2012 that it could push one server past 2 million TCP connections, and in 2014 it ran about 150 chat servers at about 1M phones each.',
      'Store and forward: the server holds a message only until a recipient device has it. WhatsApp\'s privacy policy says delivered messages are deleted from its servers and undelivered ones are kept encrypted for up to 30 days, then deleted. Receipts track the hops: one grey tick sent, two grey delivered to the phone or any linked device, two blue read.',
      'Hard part 1, encrypting for someone who is offline: at registration a device uploads its identity key, a signed prekey and a batch of one-time prekeys. A sender fetches one of each, the server deletes the one-time prekey it handed out, and the sender can build a Signal session and send at once. The Double Ratchet then derives a new key for every message.',
      'Hard part 2, devices and groups: one-to-one messages use client-fanout, one copy encrypted for each device on the recipient\'s and the sender\'s device lists (in 2021, up to four companion devices besides the phone). Groups use Sender Keys: once a sender key has been sent pairwise to each member\'s devices, every message is one ciphertext that the server fans out.',
      'Failure and load: in 2014 writes to offline storage were a bottleneck, and since most messages were picked up quickly WhatsApp added a write-back cache whose sync delay absorbs overloads. If a recipient\'s one-time prekeys run out, sessions still start without one, with weaker initial forward secrecy, so fetching prekey bundles should be rate-limited.'
    ],
    pitfall: 'Designing the server as the message archive, keeping every message and syncing it to each device. That breaks end-to-end encryption and multiplies storage; WhatsApp holds a message only until delivery, and a linked device reads history from its own local database.',
    say: 'Each device holds one persistent connection to a chat server, about a million per server; a message for an offline device waits encrypted in its queue until the device acknowledges it and is then deleted, and senders encrypt one copy per device with Signal sessions built from prekeys, so the server never sees content.',
    refs: [
      ['reed-efsf2014', 'Traffic in 2014 — “19B messages in & 40B out per day”'],
      ['reed-efsf2014', 'Servers in 2014 — “~150 chat servers (~1M phones each)”'],
      ['reed-efsf2014', 'Offline storage — “Add write-back cache with variable sync delay”'],
      ['whatsapp-1m-2011', 'Two million per server, January 2012 — “we are now able to easily push our systems to over 2 million tcp connections!!”'],
      ['whatsapp-privacy-policy', 'Thirty days, then gone — “If a message is still undelivered after 30 days, we delete it.”'],
      ['whatsapp-read-receipts', 'Two grey ticks — “The message was successfully delivered to the recipient\'s phone or any of their linked devices.”'],
      ['whatsapp-encryption-overview', 'Sending to an offline device — “After building a long-running encryption session, the initiator can immediately start sending messages to the recipient, even if the recipient is offline.”'],
      ['meta-whatsapp-multidevice', 'Client-fanout, 2021 — “WhatsApp multi-device uses a client-fanout approach, where the WhatsApp client sending the message encrypts and transmits it N number of times to N number of different devices — those in the sender and receiver’s device lists.”'],
      ['whatsapp-encryption-overview', 'On a first group message, the Sender Key — “is generated and distributed to each member device of the group, using a pairwise encrypted session.”'],
      ['whatsapp-encryption-overview', 'Groups fan out on the server — “The sender transmits the single ciphertext message to the server, which does server-side fan-out to all group participants.”'],
      ['signal-x3dh', 'Drained prekeys — “This reduction in initial forward secrecy could also happen if one party maliciously drains another party\'s one-time prekeys, so the server should attempt to prevent this, e.g. with rate limits on fetching prekey bundles.”']
    ],
    cards: [
      ['What does the WhatsApp server keep, and for how long?', 'A message waits on the server, encrypted, only until a recipient device has it, and is then deleted. Undelivered messages are kept for up to 30 days and then deleted. History lives on the devices.'],
      ['How can Alice send an encrypted first message to Bob while his phone is off?', 'Bob\'s device uploaded an identity key, a signed prekey and a batch of one-time prekeys at registration. Alice fetches one of each (the server deletes the one-time prekey it hands out), computes the shared secret and sends; the session setup data travels in the message header until Bob replies.'],
      ['Client-fanout or Sender Keys: when does WhatsApp use each?', 'One-to-one: client-fanout, one copy encrypted per device for the recipient\'s devices and the sender\'s other devices. Groups: the sender distributes a Sender Key pairwise to each member device (on its first message, and again after any member leaves), then uploads one ciphertext per message and the server fans it out.']
    ],
    quiz: [
      ['WhatsApp reported 147M concurrent connections in 2014. One server had held over 2M connections in 2012, but chat servers ran at about 1M phones each. How many chat servers does that imply?', ['About 150', 'About 75', 'About 465', 'About 1,470'], '147M ÷ 1M ≈ 147, close to the "~150 chat servers" in WhatsApp\'s 2014 talk. 75 assumes every server runs at the 2M it was pushed to, with no room for a failed neighbour\'s users; 465 divides the monthly users instead of the concurrent ones; 1,470 divides by 100,000.', 'calc'],
      ['Bob\'s phone is switched off for six weeks and he has no linked devices. Alice sent him a message on the first day. What does WhatsApp do with it?', ['It is deleted after 30 days undelivered, and Alice never sees a second tick', 'It waits on the server until Bob\'s phone acknowledges it, however long that takes', 'It is moved to cold storage after 30 days and delivered whenever Bob returns', 'It is kept in a server-side archive that Bob can read later from the web app'], 'The server is a holding queue, not an archive: a message is kept encrypted for up to 30 days while delivery is attempted, then deleted. Two grey ticks need delivery to a device, which never happened.', ['whatsapp-privacy-policy', 'whatsapp-read-receipts']],
      ['While Bob\'s phone is off, a script fetches his prekey bundle thousands of times and uses up every one-time prekey he uploaded. What happens when a real contact then starts a new session with him?', ['It starts without a one-time prekey, with weaker initial forward secrecy', 'Nobody can start a session until Bob\'s phone uploads a fresh batch of prekeys', 'The server makes new one-time prekeys for Bob from his stored private keys', 'The first message is sent unencrypted until Bob\'s phone comes online'], 'X3DH works without a one-time prekey: the bundle simply omits it and the last Diffie-Hellman step is skipped, so forward secrecy for that first key rests on the signed prekey. The server never holds private keys, which is why the specification asks it to rate-limit bundle fetches.', ['signal-x3dh', 'whatsapp-encryption-overview']],
      ['Ana has a phone and a linked laptop. From her phone she sends a one-to-one message to Ben, who has a phone and two linked devices. How many separately encrypted copies does her phone send?', ['Four: Ben\'s three devices and her laptop', 'One, copied by the server to each device', 'Three: one for each of Ben\'s devices', 'Five: every device on both accounts'], 'One-to-one messages use client-fanout across both device lists, minus the sending device: 3 + 1 = 4. One copy fanned out by the server is how groups work, after a Sender Key has been shared; three forgets her own laptop; five counts the phone that is sending.', ['meta-whatsapp-multidevice']],
      ['In 2014 WhatsApp found that writes to its offline mailboxes were an I/O bottleneck, and that most queued messages were picked up very soon after they arrived. Which change cuts the number of messages that are written to disk?', ['A write-back cache, so most messages are collected before reaching disk', 'A write-through cache, so pickups are served from memory, not disk', 'A cache of recently read mailboxes, so a pickup skips the disk read', 'Striping mailboxes over more disks, so each disk takes fewer writes'], 'If most messages leave the mailbox within moments, a cache in front of the disk with a delayed sync means many are written once to memory and never to disk, and the sync delay stretches under overload. A write-through cache still writes every message to disk and only speeds up reads, as does a cache of read mailboxes; striping spreads the same writes over more disks without removing any.', ['reed-efsf2014']]
    ],
    explain: ['Explain how you would design a WhatsApp-like messenger, from connection to read receipt.', ['Persistent connections: about 1M per server, Erlang on FreeBSD, Noise-encrypted transport', 'Store and forward: queue until a device acknowledges, then delete; 30-day limit; receipts', 'Signal sessions from prekeys, so senders can encrypt for offline devices', 'Client-fanout per device for one-to-one; Sender Keys with server fan-out for groups', 'Load and failure: write-back offline storage, prekey exhaustion and rate limits']],
    duck: ['If the server deletes messages after delivery, where does my chat history live?', 'How can my friend send me an encrypted message when my phone is switched off?'],
    lab: { type: 'seq', parts: [
      { type: 'pick', brief: 'Pick the four questions most worth asking.', want: 4, options: [
        ['Must messages reach phones that are offline, and for how long do we hold them?', true, 'Defines the offline queue and its retention.'],
        ['Must the server be unable to read the content of messages?', true, 'End-to-end encryption shapes keys, fan-out and storage.'],
        ['Can one account be used on several devices at the same time?', true, 'Each device needs its own encrypted copy and session.'],
        ['What are the peak concurrent connections and messages a second?', true, 'Sizes the chat server fleet and the offline storage.'],
        ['Should the chat servers be written in Erlang or in Java?', false, 'A tool choice; it follows from the requirements.'],
        ['Should every message be kept in Cassandra so it can be searched?', false, 'A solution, and one that conflicts with deleting on delivery.'],
        ['Should sending be a REST call or a GraphQL mutation?', false, 'An interface detail that does not change the design.'],
        ['Will the chat servers run on Kubernetes or on bare metal?', false, 'An operations choice, not a product requirement.']
      ] },
      { type: 'estimate', brief: 'Given (WhatsApp, 2014): 19B messages in and 40B out a day · a peak of 342K messages in a second · 147M concurrent connections.', fixed: [
        { q: 'Average messages in a second?', a: 220000, unit: 'msgs/s', tol: 0.1, how: '19,000,000,000 ÷ 86,400 ≈ 220,000 a second.' },
        { q: 'Peak messages in, as a multiple of the average?', a: 1.56, unit: '×', tol: 0.1, how: '342,000 ÷ 220,000 ≈ 1.6. Size the fleet for the peak, plus room to absorb a failed server\'s users.' },
        { q: 'Messages out for every message in?', a: 2.1, unit: '×', tol: 0.1, how: '40B ÷ 19B ≈ 2.1. The talk gives no breakdown; a likely contributor is the server fanning each group message out to every member.' },
        { q: 'If 2% of the 19B daily messages wait for an offline device and average 2 KB, how much is written to offline storage a day, in GB?', a: 760, unit: 'GB', tol: 0.1, how: '19B × 0.02 × 2 KB = 760 GB a day, most of it collected soon after, which is why a write-back cache in front of the disk pays off.' }
      ] },
      { type: 'order', brief: 'Put the life of a one-to-one message to a recipient who is offline in order.', items: [
        'Alice\'s app fetches Bob\'s prekey bundle and builds a session (first message only)',
        'The app encrypts one copy per device and sends them over its persistent connection',
        'The server queues the copies for Bob\'s offline devices; Alice sees one grey tick',
        'Bob\'s phone reconnects and the server pushes the queued message to it',
        'Bob\'s phone decrypts and acknowledges it; the server deletes its copy',
        'The delivery receipt reaches Alice as two grey ticks',
        'Bob opens the chat and a read receipt turns the ticks blue'
      ] },
      { type: 'diagram', brief: 'Draw the message paths at the 2014 peak of 342,000 messages a second: straight to phones that are connected, held for phones that are offline until they collect them, and the prekey fetches that let a sender encrypt for a phone that is switched off.',
        labels: { lb: 'Load balancer', ws: 'Chat servers', app: 'Key service', replica: 'Prekey store', cache: 'Write-back cache', db: 'Offline mailboxes (disk)' },
        required: ['client', 'lb', 'ws', 'cache', 'db', 'app', 'replica'],
        edges: [['client', 'lb'], ['lb', 'ws'], ['ws', 'cache'], ['cache', 'db'], ['ws', 'app'], ['app', 'replica']],
        layout: { client: [10, 190], lb: [165, 190], ws: [320, 190], app: [480, 90], replica: [630, 90], cache: [480, 290], db: [630, 290] },
        why: {
          lb: 'Spreads new connections over the chat servers. Once connected, a phone stays on its server.',
          ws: 'Each phone keeps one long-lived encrypted connection here, about a million per server, so a message for a connected phone is pushed to it at once.',
          app: 'Hands out prekey bundles and deletes each one-time prekey it gives away, so a sender can encrypt a first message for a phone that is switched off.',
          replica: 'Holds each device\'s identity key, signed prekey and remaining one-time prekeys. Public keys only.',
          cache: 'Holds a queued message in memory before it is written to disk. Most are collected within moments, so they are acknowledged and deleted before they ever reach the disk.',
          db: 'Keeps each queued message, encrypted, until a device acknowledges it, and deletes undelivered ones after 30 days. A holding queue, not an archive.'
        },
        decoys: {
          queue: 'A log such as Kafka keeps messages after they are read. A mailbox deletes each message as soon as a device acknowledges it.',
          search: 'The server cannot read the messages, so it has nothing to index. History and search live on the device.'
        },
        sim: {
          load: '342,000 messages a second, the 2014 peak: 335,000 to phones that are connected and about 7,000 (2%, the estimate\'s assumption) held for phones that are offline, plus 17,000 prekey bundle fetches a second for first messages to a new contact or device (an assumption).',
          scale: 100,
          goals: { errors: 1, p99: 200 },
          flows: [
            { label: 'Messages to connected phones', rps: 335000, needs: ['ws'],
              hops: [['client', 'lb'], ['client', 'ws', { instead: 'lb' }], ['lb', 'ws']] },
            { label: 'Messages for offline phones', rps: 7000, aside: ['cache', 'db'], needs: ['db'],
              hops: [['client', 'lb'], ['client', 'ws', { instead: 'lb' }], ['lb', 'ws'], ['ws', 'cache'], ['cache', 'db'], ['ws', 'db']] },
            { label: 'Prekey bundle fetches', rps: 17000, needs: ['replica'],
              hops: [['client', 'lb'], ['client', 'ws', { instead: 'lb' }], ['lb', 'ws', { instead: 'app' }], ['lb', 'app'], ['ws', 'app'], ['app', 'replica']] }
          ],
          parts: {
            lb: { cfg: { capacity: 512, serviceMs: 0.5, queueLimit: 1024 } },
            ws: { cfg: { instances: 16, capacity: 4, serviceMs: 2, serviceCv: 0.5, queueLimit: 64 }, solo: { instances: 1 }, soloWhy: 'Nothing spreads the phones over the fleet, so every connection lands on the same chat server.' },
            cache: { cfg: { capacity: 64, serviceMs: 1, hitRate: 0.8, queueLimit: 256 } },
            db: { cfg: { capacity: 2, serviceMs: 50, serviceCv: 0.6, queueLimit: 64, lockMs: 0 }, fullWhy: 'Writing to disk was the bottleneck WhatsApp reported in 2014. Most queued messages are collected within moments, so most should never need to be written at all.' },
            app: { cfg: { instances: 2, capacity: 8, serviceMs: 3, serviceCv: 0.5, queueLimit: 64 } },
            replica: { cfg: { capacity: 16, serviceMs: 5, serviceCv: 0.5, queueLimit: 64, lockMs: 0 } }
          },
          needWhy: { ws: 'A phone can only be reached through the connection it keeps open to a chat server.', db: 'A phone can stay offline for days, so its messages have to survive a server restart until it returns, for up to 30 days.', replica: 'Without a prekey bundle a sender cannot start an encrypted session with a phone that is switched off.' },
          bad: {
            'client>db': 'Phones never touch the mailboxes directly: the chat server pushes queued messages down the connection.',
            'client>cache': 'Phones never touch the cache directly.',
            'client>replica': 'Phones ask the key service, which hands out each one-time prekey once and then deletes it.',
            'lb>db': 'A load balancer spreads connections. It does not store messages.',
            'lb>cache': 'A load balancer spreads connections. It does not store messages.',
            'ws>replica': 'The key service hands out prekeys and deletes each one-time prekey as it goes. The chat servers do not read the store themselves.',
            'app>db': 'The key service holds public keys, not messages.'
          },
          traps: [
            { name: 'no write-back cache: every queued message is written to disk at once', drop: ['cache'], wire: [['ws', 'db']] },
            { name: 'no offline mailbox: messages for offline phones have nowhere to wait', drop: ['cache', 'db'] },
            { name: 'write-back cache that is never flushed to disk', cut: [['cache', 'db']] },
            { name: 'no load balancer in front of the chat servers', drop: ['lb'], wire: [['client', 'ws']] },
            { name: 'no key service: nobody hands out prekeys', drop: ['app', 'replica'] }
          ]
        } }
    ] }
  });
})(SD.T);
