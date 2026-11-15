// "More detail" for the key ideas of each topic: one entry per key idea, [text, source keys or 'calc'].
// Shown under each key idea on the Learn station (js/app.js). Checked by tools/check-content.mjs.
window.SD = window.SD || {}; SD.deep = SD.deep || {};
SD.deep["3.1"] = [
 [
  "A queue cannot see inside a worker. From its side, a worker that crashed and a worker that is still busy look the same: both are silent. So receiving a message is treated as borrowing it, not taking it, much like a library loan with a due date. SQS starts the clock the moment the message is delivered; the copy stays in the queue, hidden. Deleting it is the worker saying \"done\"; silence past the due date is read as failure and the message is offered again. AWS's own engineers compare this to a lease.\n\nRabbitMQ uses a different signal for \"the worker died\". With manual acknowledgements it watches the channel and connection: if either closes with deliveries unacknowledged, those go back on the queue, and the next delivery carries a redeliver flag set to true. Automatic mode drops the safety net: the broker counts a message as delivered the moment it is sent, which RabbitMQ calls fire-and-forget.\n\nWhere it bites: the 12-hour maximum is counted from the first receive, and extending the timeout does not reset it. AWS suggests breaking longer work into smaller steps.",
  [
   "aws-sqs-visibility-timeout",
   "rabbitmq-consumer-acks",
   "aws-bl-queue-backlogs"
  ]
 ],
 [
  "Follow one message. At t = 0 s a worker receives it and the 30 s clock starts. At t = 5 s it commits the charge to the database. At t = 6 s the process is killed, before it calls DeleteMessage. At t = 30 s the message becomes visible, a second worker receives it and charges the card again. The queue did nothing wrong: it never heard \"done\", and it cannot tell \"finished but did not say so\" from \"never finished\".\n\nThe only way to avoid that is to delete first and work afterwards, and then the same crash loses the job instead (at most once). Queues choose the duplicate because a duplicate can be detected and a lost message cannot.\n\nCrashes are not the only cause. AWS says a standard queue may deliver a message more than once because of retries or network delays, and that the visibility timeout gives no absolute guarantee against a second delivery while the first is still hidden. So the handler has to be safe to run twice: for example, insert the order ID into a processed table in the same database transaction as the charge, and skip the work if the ID is already there.",
  [
   "aws-sqs-queue-types",
   "aws-sqs-visibility-timeout"
  ]
 ],
 [
  "Take jobs that normally run 20 s with a 30 s timeout. A database slowdown stretches them to 45 s. At 30 s each message reappears while its first worker is still going, so a second worker starts it; that one also runs past 30 s, so a third may start. Every message now costs two or three times the work at the moment the system has least capacity. AWS's phrase for this is that an already overloaded service fork-bombs itself.\n\nA heartbeat separates two questions that a single timeout mixes up: how long may a job run, and how quickly should a dead worker be noticed. Keep the timeout short, say 30 s, and have the worker call ChangeMessageVisibility every 10 s while it works. A healthy 10-minute job stays hidden throughout; a crashed worker stops heartbeating, so its message is back within about 30 s rather than after a 10-minute timeout. AWS describes one more option: stop working on a message once its timeout has expired.\n\nAWS's sizing advice is to match the timeout to the maximum time the application typically needs, and to start around 2 minutes with a heartbeat if you do not know.",
  [
   "aws-bl-queue-backlogs",
   "aws-sqs-visibility-timeout"
  ]
 ],
 [
  "Without a cap, a message that always fails just keeps going round. With a 30 s visibility timeout and SQS's default 4-day retention, that is 4 × 24 × 3,600 ÷ 30 = 11,520 attempts before SQS expires it, each one taking a worker away from good messages. A hundred such messages can occupy a small fleet.\n\nSQS counts receives. maxReceiveCount is how many times a message may be received from the source queue before it is moved to the dead-letter queue. AWS warns against setting it very low: at 1, a single failed receive, perhaps a worker restarting mid-deploy, sends a healthy message to the DLQ. RabbitMQ quorum queues expose the count in an x-delivery-count header; past the limit the message is dropped unless a dead-letter exchange is configured, so without one the default limit of 20 turns a poison message into silent data loss.\n\nTwo practical details. On an SQS standard queue a message's expiry is still measured from its original enqueue time after it moves, so give the DLQ a longer retention than the source queue. And AWS's engineers note that a DLQ alarm, though worth having, fires late: the message has already used all its retries.",
  [
   "aws-sqs-dlq",
   "rabbitmq-quorum-queues",
   "aws-sqs-message-quotas",
   "aws-bl-queue-backlogs"
  ]
 ],
 [
  "A message group works like one checkout lane. While one message from a group is in flight, SQS holds back the rest of that group until the message is deleted or its visibility timeout expires. So a group can never go faster than one message at a time, whatever the number of consumers: at 50 ms a message, one group manages 20 messages/s, and 200 active groups manage 4,000/s. Put everything in one group and the whole queue is a single lane.\n\nThe API limit is a separate ceiling: 300 calls per second per action, and a batch call carries up to 10 messages, which is where 3,000 messages/s comes from. High throughput mode spreads the queue over partitions. SQS hashes the message group ID to pick the partition, and each partition supports up to 3,000 messages/s with batching, so one group always lands on one partition. That is why AWS asks for group IDs with many distinct values.\n\nDeduplication is about sending, not processing. A producer that times out and resends with the same deduplication ID inside 5 minutes gets one copy delivered, and SQS remembers the ID even after the first copy was received and deleted.",
  [
   "aws-sqs-visibility-timeout",
   "aws-sqs-queue-types",
   "aws-sqs-high-throughput-fifo",
   "aws-sqs-fifo-key-terms"
  ]
 ],
 [
  "CPU is the wrong signal because a queue worker's distress often does not show in CPU: workers waiting on a slow database sit nearly idle while the queue grows. Raw queue length is also wrong; AWS's objection is that it ignores how many instances are already working, so it adds more than needed while the queue drains.\n\nBacklog per instance fixes both. AWS's example: 10 instances and 1,500 visible messages is 150 per instance. With 0.1 s per message and 10 s of acceptable latency the target is 10 ÷ 0.1 = 100, so the group grows by five, to 15 instances, and 1,500 ÷ 15 = 100. The logic is that a message at the back of a 100-deep line waits 100 × 0.1 s = 10 s.\n\nWhy backlogs deserve this care: AWS's builders point out that after an hour-long outage a system needs double its capacity for another hour to catch up, since new messages keep arriving. One catch with the age-of-oldest-message alarm: on a standard queue with a redrive policy whose maxReceiveCount is above 3, a message received three times without being deleted moves to the back, and the metric then reports the next message's age.",
  [
   "aws-asg-sqs-scaling",
   "aws-bl-queue-backlogs",
   "aws-sqs-dlq"
  ]
 ]
];
SD.deep["3.2"] = [
 [
  "Think of each partition as a numbered ledger that is only ever added to. The producer picks the partition from the key (Kafka's docs give hash(key) % number_of_partitions), so every event for account 42 lands in the same ledger, one after another. Two events in different partitions have no defined order between them: a consumer may see account 7's later event before account 42's earlier one. So choose the key by asking which events must stay in sequence.\n\nBecause reading does not remove anything, the broker does not track each message the way a work queue does. A consumer's position is one number per partition: the offset of the next record it will be given, one larger than the highest it has seen. The committed position is the copy stored safely, and it is where a restarted consumer picks up. Rewinding is just moving that number back.\n\nWhere it bites: retention is a per-topic setting, and old events are discarded once it passes. Replay reaches back only that far, so a week of retention means a bug found after ten days cannot be fixed by rereading the topic.",
  [
   "kafka-intro",
   "kafka-operations",
   "kafka-consumer-javadoc"
  ]
 ],
 [
  "Order inside a partition only means something if one reader works through it, and the group's progress on a partition is a single offset. That is why a group gives each partition to exactly one member. With 12 partitions and consumers that each handle 2,000 messages/s, the group tops out at 24,000/s however many members join; Confluent's guidance is no more consumers than partitions, since extras sit idle and make rebalances more frequent and slower.\n\nKafka detects a dead member in two ways. A crashed process stops sending heartbeats and is declared dead after session.timeout.ms. A process that is alive but stuck is caught by max.poll.interval.ms: if it does not call poll in time, the client leaves the group and its partitions are reassigned. The usual trap is a slow batch: processing overruns the interval, the commit fails, and another member reprocesses the same records. Fetch fewer records per poll (max.poll.records) or raise the interval.\n\nOn adding partitions, take a key whose hash is 14. With 12 partitions it maps to 14 % 12 = 2; with 16, to 14. Kafka does not move existing data, so the key's old events stay in partition 2 while new ones go to 14, read by different consumers with no order between them.",
  [
   "kafka-consumer-javadoc",
   "confluent-kafka-consumer",
   "kafka-operations"
  ]
 ],
 [
  "The first sentence is about where a crash can fall. Process then commit: a crash in between means the next consumer starts from the old offset and repeats work. Commit then process: the same crash means the next consumer starts past records nobody handled.\n\nThe idempotent producer fixes one duplicate source: the retry. A producer sends a batch, the acknowledgement is lost, and it sends again. The broker gives each producer an ID and the producer numbers what it sends, so the broker recognises the resend and discards it. Confluent compares this to TCP, with one difference: the sequence number is written to the replicated log, so a broker that takes over as leader still knows a resend is a duplicate.\n\nTransactions fix the other source. Output records and the consumer's offsets are written as one unit, and a marker record written at the end says committed or aborted. Aborted records are not removed from the log; a read_committed consumer skips them. After an abort the processor must reset its position and process the input again.\n\nWhere it bites: Kafka's design docs give read_uncommitted as the default isolation level, so a downstream consumer that has not set read_committed sees aborted output.",
  [
   "kafka-design",
   "confluent-exactly-once"
  ]
 ],
 [
  "A Kafka transaction can only make atomic the things Kafka stores: records and offsets. An HTTP call is not one of them. If the processor calls a fraud API and crashes before the transaction commits, the transaction aborts, the offsets roll back, the input is read again and the API is called a second time.\n\nFor an external database, Kafka's own advice is to stop storing the offset in Kafka and keep it in the same place as the output. Its design docs note that the classic alternative, a two-phase commit between the two, is unavailable with many output systems. In a relational database that means one transaction writing the result rows and an offsets row; on restart the consumer reads that row and continues from it. If the store has no transactions, write by a deterministic key so that a repeat overwrites.\n\nOn the cost figures: Confluent describes the overhead as per transaction (about one extra write per partition plus a few records in a transaction log), not per message. So it depends on how often you commit. The 15–30% Streams figure is for a 100 ms commit interval, 15% at 1 KB messages and 30% at 100 bytes; with a 30 s interval they measured no overhead for 1 KB messages, at the price of latency.",
  [
   "kafka-design",
   "kafka-consumer-javadoc",
   "confluent-exactly-once"
  ]
 ],
 [
  "A bank account is the familiar case: the balance is not the record, the list of deposits and withdrawals is, and the balance is what they add up to. Event sourcing applies that to all application state, on the condition that every change goes through an event. Fowler's everyday example is a version control system.\n\nThree abilities follow. Rebuild: discard the state and rerun the events on an empty application, which is how a bug in derived state is fixed. Temporal query: rerun the events up to a chosen time to see the state as it then was. Snapshot: Fowler describes a system that starts each morning from an overnight snapshot and, after a crash, replays only that day's events.\n\nReplay is where it bites, in two directions. Outbound: handlers that notify external systems would notify them again, and those systems cannot tell a replay from the real thing, so calls go through a gateway that is disabled during replay. Inbound: if handling an event asked an outside system a question, the replay needs the old answer. Fowler's example is an exchange rate fetched on 5 December and replayed on 20 December; the gateway has to remember the responses it received.",
  [
   "fowler-event-sourcing"
  ]
 ],
 [
  "Window types first. Flink's example of a sliding window is 10 minutes long, sliding by 5: every event belongs to 10 ÷ 5 = 2 windows, and every 5 minutes you get a result covering the last 10. A session window has no fixed length; it closes when no element arrives for the configured gap.\n\nA watermark is the job's estimate of how far event time has got. A common generator assumes events are out of order only up to a bound, so the watermark trails the newest timestamp seen by that bound. With a 5 s bound, the window 12:00:00–12:01:00 fires when an event stamped 12:01:05 arrives. A partition that receives nothing produces no new watermark, and because the job takes the minimum across parallel inputs, it holds everything back; Flink's withIdleness marks such an input idle after a timeout.\n\nThen the trade-off. A longer bound delays every result. Allowed lateness instead fires on time and keeps the window's state until the watermark passes the window end plus the lateness; a straggler inside that period is added and the window fires again, so the sink must accept a corrected result. Anything later is dropped, or sent to a side output if you configure one.",
  [
   "flink-windows",
   "flink-watermarks",
   "flink-time-concepts"
  ]
 ]
];
SD.deep["3.3"] = [
 [
  "The word to hold on to is subscription, not subscriber. A subscription is a named mailbox attached to the topic; subscribers are the processes that empty it. Google's own illustration: a topic receives messages A and B and has two subscriptions. Each subscription gets both A and B. Subscription 1 has two subscriber applications attached, and one of them receives B while the other receives A; neither sees both.\n\nSo the same action, \"connect another consumer\", does opposite things depending on where you connect it. Attach to an existing subscription and you have added a worker that shares the load. Create a new subscription and you have added a new audience that gets everything.\n\nTwo consequences. Wire billing, indexing and email to one subscription and each service silently sees about a third of the events. And a subscription has no past: only messages published after it was created are available to it. If the email service is added next month and needs last month's orders, the topic must have had retention switched on, and the new subscription must seek back to replay them. That has to be decided before the consumer exists.",
  [
   "gcp-pubsub-overview",
   "gcp-pubsub-subscriptions"
  ]
 ],
 [
  "SNS on its own is a delivery service, not a store: it tries each subscriber's endpoint, and when its retry policy runs out it discards the message. What differs by endpoint is how long it tries. For an HTTP/S endpoint the total retry time cannot exceed 3,600 seconds, a hard limit. For AWS-managed endpoints such as an SQS queue the policy is 100,015 attempts over 23 days.\n\nSo putting a queue between SNS and each consumer changes who waits. Suppose a partner's service is down for 10 hours. Pushed straight over HTTPS, everything published in roughly the first nine hours is gone before the service returns. With a queue, SNS hands each message over at once and the queue holds it; SQS keeps a message for 4 days by default and up to 14.\n\nThe isolation follows from the same structure. Each consumer's backlog lives in its own queue, so a search indexer that is an hour behind has an hour of messages in its queue and nothing else changes for billing. Each queue then needs its own backlog alarm and dead-letter queue, because nothing upstream will notice one consumer falling behind.",
  [
   "aws-sns-retries",
   "aws-sns-sqs-fanout",
   "aws-sqs-message-quotas"
  ]
 ],
 [
  "Pub/Sub keeps a message outstanding until the subscriber acknowledges it, and keeps trying to deliver it. Duplicates come from the gaps in that exchange. The obvious one is an acknowledgement deadline that passes while the handler is still working. The less obvious one is that the acknowledgement itself is best effort: Google says a message can be redelivered even after the acknowledgement request returned successfully, for instance after a server-side restart. So \"I acked it\" is not proof it will not come back, and the handler should record the event ID it has processed and skip repeats.\n\nRedis Pub/Sub sits at the other end. It has no mailbox and no acknowledgement: the server sends a message to whoever is connected at that moment, and once sent there is no chance of it being sent again. It is live radio; tune in late or lose signal and that part of the broadcast is gone.\n\nThat is acceptable when the next message makes the last one irrelevant, or when something else covers a miss, such as a cache TTL behind an invalidation signal. When a miss matters, Redis's own docs point to Redis Streams, where messages are persisted.",
  [
   "gcp-pubsub-subscriptions",
   "gcp-pubsub-push",
   "redis-pubsub"
  ]
 ],
 [
  "To keep one sequence, the system may only have one message in progress at a time; anything processed in parallel could finish out of order. A single global order is therefore a single lane. Ordering per key gives one lane per key, and lanes run side by side.\n\nThe limits show how narrow a lane is. Publishing is capped at 1 MBps per key, so with 2 KB events one key carries about 1,000 KB ÷ 2 KB = 500 events/s. On the receiving side Google's client does not run the callback for a key's next message until the previous one has completed, so a key's throughput is your handler's speed; Google calls a key whose backlog grows this way a hot key. Messages for a key must also be published in the same region.\n\nRedelivery is the surprising part. If a subscriber gets messages 1, 2 and 3 for a key and message 2 is redelivered, message 3 comes again too, even though it was acknowledged, because delivering 2 alone would put it after 3. Ordered handlers need idempotency as much as unordered ones.\n\nGoogle also states the price: ordered delivery lowers publish availability and adds latency, because failover has to be coordinated to keep the sequence.",
  [
   "gcp-pubsub-ordering"
  ]
 ],
 [
  "A filter belongs to the subscription. When a message arrives that does not match, Pub/Sub acknowledges it on the subscription's behalf and never sends it, so the subscriber does no work for it and its backlog metrics count only matching messages.\n\nAttributes are the key-value labels a publisher attaches beside the message body. The filter can read those and nothing else, which moves a design decision to the publisher: if the EU warehouse wants only EU orders, the publisher has to copy the region into an attribute, even though it is already in the JSON body. A filter you would like to write but cannot usually means a missing attribute.\n\nThree limits worth knowing before an interviewer asks. The filter is immutable: to change it you create a new subscription. An expression can be at most 256 bytes. And matching is simple; hasPrefix is the only function and regular expressions are not supported.\n\nOn cost, Google's wording is that you do not pay outbound message fees for the messages it acknowledges for you, but message delivery fees and seek-related storage fees still apply, so filtering is cheaper than discarding in the subscriber, not free.",
  [
   "gcp-pubsub-filtering"
  ]
 ],
 [
  "With push, Pub/Sub is the client and your service is a webhook. It sends each message as an HTTPS POST, and your HTTP status is the acknowledgement: 102, 200, 201, 202 or 204 acknowledges, and any other status is a negative acknowledgement that makes Pub/Sub send the message again. There is no polling loop to run, which is why it suits handlers that start on a request.\n\nFlow control is Pub/Sub's, not yours. It uses a slow-start scheme: the number of concurrent requests, the push window, starts as a small single-digit number, grows exponentially while you acknowledge, and shrinks on failures. Failures also trigger a backoff that applies to every message in the subscription. A pull subscriber decides for itself how much to take and when.\n\nOrdering tightens push further. Each message is its own request, so to keep a key in order Pub/Sub allows one outstanding message per key. If a round trip takes 50 ms, one key gets at most 1 ÷ 0.05 = 20 messages/s whatever the endpoint's capacity. Pull allows one outstanding batch per key. Google's own caution is that push may be a poor choice where many messages share an ordering key or latency matters a great deal.",
  [
   "gcp-pubsub-push",
   "gcp-pubsub-ordering"
  ]
 ]
];
SD.deep["3.4"] = [
 [
  "Follow one tweet through Twitter's 2013 write path as the talk described it. The tweet is accepted, then a fan-out daemon asks the social graph service (Flock) for the author's follower list, finds where each follower's home timeline lives in the Redis cluster, and inserts an entry into each list, sending the inserts in pipelined groups of 4,000 destinations. All of that happens after the author has been answered, so the work is hidden from the person posting.\n\nThe entry is small because the timeline is a list of references, not content; the talk notes that tweet text is almost irrelevant to most of this infrastructure. Reading is then cheap: finding the right Redis machine is O(1), and the read path took tens of milliseconds.\n\nRAM is what limits the design. That is why a timeline stops at 800 entries (page back far enough and you hit the end), and why only active users, meaning those who had logged in within 30 days, were kept in the cache at all: if you are not active, the tweet is not inserted for you. The interview follow-up is what happens when an inactive user returns. The talk calls it reconstruction: look up who they follow, read each of those users' tweets from disk, and load the result back into Redis. In other words, a pull-style read as the fallback.",
  [
   "highscalability-twitter-timelines"
  ]
 ],
 [
  "Under pull the feed does not exist until someone asks for it. Facebook's Multifeed has two parts. Leaves are the storage layer: they hold an index of the most recent feed actions in memory, and usually 20 leaf servers together make one full replica covering all users. Aggregators answer requests: each one fans a request out to the leaves, gathers the data, ranks and filters it, and returns the result. Leaves need memory; aggregators need CPU.\n\nPut numbers on a read. If you follow 300 accounts and the system considers the latest 20 items from each, one page load gathers 300 × 20 = 6,000 candidates to choose perhaps 20 to show. That is the work push would have done at posting time, now done while the reader waits, and done again on the next refresh.\n\nSo the cost of a request depends on who is asking. Facebook reported that a heavy request from a user with a lot of friends could cause a sudden spike in an aggregator's CPU. One reason this suits a ranked feed is that gathering candidates and ranking them is needed at read time in any case, so the gathering step is the natural place to do the ranking.",
  [
   "fb-multifeed"
  ]
 ],
 [
  "Why are the two averages equal? Every follow relationship is one edge, and each edge is counted once as \"a follower of someone\" and once as \"a followee of someone\". Total followers and total followees are both the number of edges E, so with U users the average of each is E ÷ U.\n\nWith equal averages they cancel. Take 2,000 posts/s, 50,000 reads/s and 300 on each side: push is 2,000 × 300 = 600,000 inserts/s, pull is 50,000 × 300 = 15,000,000 fetches/s, and the ratio is 25, exactly the read:write ratio. Twitter's figures in the talk were 300K requests per second reading and 6,000 writing, 50 to 1, hence push.\n\nThe cancellation fails when the people who post are not typical. Say 0.03 of 300 posts/s come from accounts with 20 million followers and the rest average 400. The big accounts cost 0.03 × 20,000,000 = 600,000 inserts/s and everyone else 299.97 × 400 ≈ 120,000, so one post in ten thousand produces 83% of the write work.\n\nThe units also differ, which is the usual follow-up: push work happens in the background after the post, while pull work sits inside the reader's response time.",
  [
   "highscalability-twitter-timelines"
  ]
 ],
 [
  "Start with the arithmetic. 31 million inserts spread over up to 5 minutes is about 31,000,000 ÷ 300 ≈ 100,000 inserts/s for a single tweet, and the talk says the queues backed up all the time for these accounts.\n\nThe ordering bug follows from fan-out not being instantaneous. The follower list is worked through in sequence, so some followers receive the tweet minutes before others; the talk notes that someone who followed Lady Gaga recently could see a tweet up to 5 minutes before someone who followed long ago. A follower early in that list replies. The reply's own fan-out is small and finishes quickly, while the original is still on its way to later followers. Anyone who follows both people and sits late in the celebrity's list gets the reply first.\n\nThe hybrid removes the slow fan-out for those few accounts. Their tweets are stored once, in their own user timeline, and merged in when a follower reads. The read cost stays small because few followed accounts are that large: a user who follows 500 accounts, 4 of them above the threshold, reads 1 precomputed timeline plus 4 user timelines, 5 lookups instead of 500.",
  [
   "highscalability-twitter-timelines"
  ]
 ],
 [
  "Two separate costs are in LinkedIn's reasoning. The first is plain storage: under fan-out on write, the same content record is persisted once per feed it appears in, and LinkedIn measured the data at 62 times the pull design.\n\nThe second matters more to anyone who ships ranking models. A pushed feed that is ranked has to be stored in ranked order, which freezes one model's scores into every member's stored feed. Rolling out a new model then means what LinkedIn calls grandfathering: re-ordering each stored feed, evicting records that now score low and bringing in ones that now score high. That is heavy on IO and slow, so each A/B test starts late, and a bad model takes just as long to undo. With fan-out on read, scores are computed with each query, so switching a member to model B is a routing decision.\n\nPull has its own problem: ranking needs a large number of candidate records as input, and fetching them from remote stores adds latency. LinkedIn's answer was to run the computation on the nodes that store the data. In an interview, when you say \"ranked feed\", expect to be asked where the ranking runs and what a model change costs.",
  [
   "linkedin-followfeed"
  ]
 ],
 [
  "Search shows why pull is sometimes the only option. A tweet's readers in a home timeline are known when it is written: the followers. Its readers in search are whoever later types a matching query, and nobody can precompute a result list for every possible query. So Twitter does the reverse of the timeline. On write, an ingester tokenises the tweet and puts it on a single Early Bird machine, an O(1) step. On read, a service called Blender asks every shard whether it has matches, then sorts, merges and reranks what comes back. That scatter-gather is O(n) in shards and takes on the order of 100 ms, against tens of milliseconds for a home timeline read. The talk's justification is that most people do not use search, so cheap storage is worth the slower read.\n\nThe general rule is to find who pays. Push work grows with the audience of whoever writes; pull work grows with the number of sources whoever reads draws on. Facebook's pull-based feed saw exactly that: the expensive requests came from users with many friends. The same question applies to a materialised view against a query-time join, or a precomputed recommendation list against scoring on request.",
  [
   "highscalability-twitter-timelines",
   "fb-multifeed"
  ]
 ]
];
SD.deep["3.5"] = [
 [
  "The reason to split is that one model asked to do both jobs gets pulled two ways. Fowler's argument is that in complicated domains a single conceptual model for commands and queries ends up more complex and does neither well. Take a hotel. Accepting \"book room 12\" means checking the room is free for those nights, applying rate rules and saving the result safely: that wants objects with behaviour and a transaction. Showing a month's availability grid wants one precomputed row per room and no rules at all.\n\nTwo terms in the key idea. A command is named for the business task, not the field change: Azure's example is \"Book hotel room\" instead of \"Set ReservationStatus to Reserved\", because the first tells the write model which rules apply. A DTO (data transfer object) is a plain carrier of values with no behaviour; a query returns one and never alters data.\n\nWhere it bites: the split is a decision for one part of a system. Fowler says CQRS should be used only on specific portions (a bounded context in domain-driven design), not the system as a whole, and that usually the two sides overlap enough that sharing a model is easier.",
  [
   "fowler-cqrs",
   "azure-cqrs"
  ]
 ],
 [
  "Think of the split as having two levels, and of most of the cost arriving at the second.\n\nLevel one: separate code, one database. Command handlers and query handlers are different classes with different models, but both read and write the same tables. Fowler notes that here the database itself is the communication between the two models. Nothing has to be synchronised and nothing lags. Azure calls this the foundational level of CQRS.\n\nLevel two: separate stores. Now the query side has its own database, which Fowler describes as effectively a real-time reporting database, and something has to carry every change across. In return each side takes the shape and technology that suits it. An order-history page that needs a three-table join over orders, order lines and products in the write store becomes a single read of one document per customer; Azure's phrase is a materialised view that avoids complex joins. Each store is also sized for its own load, which pays off when reads far outnumber writes.\n\nThe interview point is to say which level you mean. \"CQRS\" at level one is a code-organisation choice; at level two it is a distributed system with eventual consistency.",
  [
   "fowler-cqrs",
   "azure-cqrs"
  ]
 ],
 [
  "A dual write is two writes to two systems with nothing tying them together. Commit the order, then publish OrderPlaced: if the process dies between the two, the order exists and no read model ever hears of it, and nothing raises an error. Swap the order and you can announce an order whose transaction then rolls back. One transaction across both is not available; the Debezium write-up notes that Kafka cannot be enlisted in distributed (XA) transactions.\n\nThe outbox turns two writes into one. In the same database transaction as the order, the service inserts a row describing the event into an outbox table. Either both rows commit or neither does. A separate relay then moves outbox rows to the broker. Debezium does this with change data capture, reading new rows from the database's log, which it describes as low overhead and near real time compared with polling the table.\n\nThe relay can deliver a row twice, for example when it restarts and rereads. So each outbox row has a unique ID, and the projection remembers how far it has got: if its last applied sequence number is 41 and event 41 arrives again, it skips it. Azure's example of what goes wrong otherwise is a seat counter decremented twice for one reservation.",
  [
   "debezium-outbox-blog",
   "azure-cqrs",
   "azure-event-sourcing"
  ]
 ],
 [
  "The first fix is routing: the page shown straight after a save reads that one item from the write store, which is always current, and everything else stays on the read model.\n\nThe second fix is a token. Berkeley DB does this for replicas: the application asks for a commit token when a transaction commits on the master, carries it along (the docs suggest a browser cookie or the server-side session), and a replica can be asked whether that transaction has been applied yet, blocking for a bounded time if not. In CQRS terms the command returns \"your change is event 1042\". The next read includes 1042; the read side compares it with the projection's last applied number, waits briefly if it is behind, and on timeout falls back to the write store or tells the user the change is still processing.\n\nA search index adds a second delay behind the projection. Elasticsearch makes changes visible to search only at a refresh, which by default happens every second, so a document can be written but not yet findable. refresh=wait_for makes the write call return only after such a refresh. A projector that records 1042 as applied before that would tell the user their change is in while search still shows the old title.",
  [
   "bdb-read-your-writes",
   "es-refresh-parameter"
  ]
 ],
 [
  "Three things get confused here, and they answer different questions.\n\nA read replica answers \"how do I serve more of the same queries?\" It has the write store's schema, so a query that was awkward on the primary is just as awkward on the replica.\n\nA read model answers \"how do I serve a different kind of query?\" It is a materialised view: a copy reshaped for one use, which Azure describes as a specialised cache that consumers never update directly. Because it can be rebuilt entirely from the source, changing its design means dropping it and replaying, not migrating it.\n\nEvent sourcing answers \"how is the write side stored?\": as a sequence of events instead of current rows. The reason it nearly always comes with CQRS is in how an event store is read. Azure's description is that the only thing you can extract is a stream of events by identifier, typically one entity's, and you get that entity's current state by replaying them. \"All orders over 100 pounds last week\" has no such stream, so it needs a projection. The dependency runs one way: event sourcing needs read models, while CQRS works fine over ordinary tables.",
  [
   "azure-materialized-view",
   "azure-event-sourcing",
   "azure-cqrs"
  ]
 ],
 [
  "Count what level-two CQRS adds to a system that had one database: an outbox table, a relay, one projector per read model, a monitor for how far each is behind, a way for users to read their own writes, and tooling to rebuild a read model. Each is a place for things to go wrong, and all of it exists to serve a difference between reads and writes. If the screens are forms over rows, there is no such difference to serve.\n\nFowler is blunt about the record. He writes that the majority of CQRS cases he had run into were not so good, and that he had seen it drag on productivity and add risk even with a capable team. Azure's guidance lists it as possibly unsuitable when the domain or business rules are simple, or a CRUD-style interface is enough.\n\nThe lighter tool he names is a reporting database. The main system keeps answering most queries from its single model, and only the demanding ones are sent to a separate database built for them.\n\nIn an interview the strong answer is conditional: one model by default, a reporting database when a few queries hurt, and CQRS for the one part of the system where read and write shapes or loads really diverge.",
  [
   "fowler-cqrs",
   "azure-cqrs"
  ]
 ]
];
SD.deep["3.6"] = [
 [
  "Two-phase commit works like a wedding: the coordinator asks every participant \"do you?\", and only after all say yes does it pronounce the commit. The trouble is the gap between the two phases. A participant that has said yes (prepared) has promised it can commit, so it may neither commit nor abort on its own; it waits for the verdict. PostgreSQL's PREPARE TRANSACTION documentation spells out what waiting costs: the prepared transaction continues to hold whatever locks it held, and leaving one prepared for long interferes with VACUUM. So if the coordinator dies after collecting the votes, rows in every participating database stay locked until it returns. Pat Helland's summary is that 2PC can easily block when nodes are unavailable.\n\nConcretely: an order service and a stock service both prepare, the coordinator crashes for ten minutes, and for ten minutes nobody can touch those stock rows, including unrelated orders for the same item. Availability of the whole becomes the product of the parts.\n\nThe second obstacle is support. The outbox pattern page on microservices.io notes that the database or the message broker might not support 2PC at all, and that coupling a service to both is often undesirable anyway. Hence sagas: accept no global atomic commit, and design the undo instead.",
  [
   "pg-prepare-transaction",
   "helland-life-beyond-dt",
   "microservices-io-transactional-outbox"
  ]
 ],
 [
  "The original paper was about one database, not microservices: a long-lived transaction (one that might pause for customer input) holds its locks for its whole life and blocks everyone else. The idea was to cut it into short transactions that each commit and release their locks, and to pair each with a compensating transaction. The paper says the compensation undoes the step from a semantic point of view but does not necessarily return the database to the state that existed when the step began.\n\nIts airline example shows why. T reserves a seat: seats taken goes from 40 to 41. Before the saga fails, two other customers book, taking it to 43. A byte-level undo would write back 40 and erase two real bookings. The paper says exactly this: the compensation cannot simply store the number of seats that existed when the step ran, because other transactions could have run in between. The correct compensation subtracts one, giving 42.\n\nThe run order matters too. If step 4 of 6 fails, steps 1 to 3 have really committed, so compensations run newest first: C3, C2, C1. Where it bites: a compensation is new business behaviour somebody must design. Azure's guidance notes that cancelling a flight reservation might not entitle the customer to a complete refund.",
  [
   "sagas-1987",
   "azure-compensating-transaction"
  ]
 ],
 [
  "Azure's saga guidance sorts steps into three kinds. Compensable steps can be undone by another transaction with the opposite effect. The pivot is the point of no return: once it succeeds, compensable transactions are no longer relevant and all subsequent actions must be completed. Retryable steps follow the pivot; they are idempotent, so they can be repeated until the saga reaches its final state.\n\nSo a saga has two halves with opposite failure handling. Before the pivot, failure means go backwards (compensate). After it, failure means keep going forwards (retry). There is no going back after the pivot, which is why nothing after it may be able to fail for a business reason; it may only fail temporarily.\n\nWorked example, checkout: create order PENDING (compensable: reject it), reserve stock (compensable: release it), charge card (pivot), schedule shipping and send confirmation (retryable). A declined card is still before the point of no return, so stock is released. But suppose you put \"verify delivery address\" after the charge. If it fails, the money is already taken and your only move is a refund, which is a visible, costly compensation. Moving the address check before the charge removes the problem. In an interview, name your pivot and explain why every check that can say \"no\" sits before it.",
  [
   "azure-saga"
  ]
 ],
 [
  "The difference is where the workflow lives. In choreography it lives nowhere in particular: Order emits OrderCreated, Inventory hears it and emits StockReserved, Payment hears that, and so on. Like dancers who each know their cue, there is no conductor. To answer \"what happens after payment fails?\" you must read every service's subscriptions. Azure's comparison lists the costs: the workflow gets confusing as steps are added, it is difficult to track which commands each participant responds to, there is a risk of cyclic dependency because participants consume each other's messages, and integration tests need every service running. The upside it lists is that no extra coordinating service is needed and there is no single point of failure.\n\nIn orchestration the workflow is one piece of code. Azure describes the orchestrator as telling participants which operation to perform, storing and interpreting the state of each task, and handling failure recovery with compensations. Services stay simpler because they only execute commands. The price: the orchestrator is a point of failure managing the complete workflow. If it forgets that saga 812 had reserved stock but not yet charged, nobody else knows to release it. So its state must be durable, written before each command is sent, which is the job workflow engines exist to do.",
  [
   "azure-saga"
  ]
 ],
 [
  "A database transaction hides its half-finished work; a saga cannot, because each step has really committed. Between step 1 and step 5 the rest of the system can read and change the same data. Azure names the resulting anomalies: lost updates (one saga modifies data without considering another's change and overwrites it), dirty reads (reading data another saga has modified but not completed), and fuzzy reads (different steps of one saga see different values).\n\nExample: saga A reserves the last concert seat and then waits on payment. Saga B reads \"sold out\" and tells its customer so. A's card is declined and the seat is released. B acted on a state that, from the business view, never became final: a dirty read.\n\nThe countermeasures rebuild isolation at the application level. A semantic lock is a flag in the data that says \"in progress\", like the PENDING order: other requests see it and must wait, refuse, or treat the record with care. Commutative updates are ones that give the same result in any order (add 5 and subtract 3, never \"set to\"). Rereading means checking a value is unchanged just before updating, and restarting the step if not. Azure also lists reordering the saga so risky updates happen in retryable steps after the pivot, where they can never be rolled back under a reader.",
  [
   "azure-saga"
  ]
 ],
 [
  "Three separate failure windows hide in every step.\n\nFirst, the step may run twice. An orchestrator that crashes after sending \"reserve stock\" but before recording the reply will send it again on restart. AWS's guidance is that saga participants need to be idempotent to allow repeated execution after crashes and orchestrator failures. In practice the command carries the saga ID and step, and the participant records it with the change.\n\nSecond, the step's database commit and its \"done\" message are two writes. Commit then crash, and the saga stalls forever with stock reserved. The transactional outbox writes the message into a table in the same local transaction; a relay publishes it later. The pattern page warns the relay might publish a message more than once, for example by crashing after publishing but before recording that it did, so consumers must deduplicate, usually on message ID.\n\nThird, the undo can fail. Azure's compensating-transaction guidance: compensations are eventually consistent operations and can fail, so the system should record progress to resume from the point of failure, each step should be an idempotent command, and sometimes manual intervention is the only way to recover, in which case raise an alert with details. So a real saga design includes a \"stuck sagas\" queue that a person watches.",
  [
   "aws-saga-orchestration",
   "microservices-io-transactional-outbox",
   "azure-compensating-transaction"
  ]
 ]
];
SD.deep["3.7"] = [
 [
  "The programmer writes two small functions and the framework does everything in between. Take counting page views per URL over a day of logs. Map reads one log line and emits (url, 1). The framework then guarantees that every pair with the same URL reaches the same reduce task, by computing hash(url) mod R; the paper says the key space is split into R pieces by a partitioning function, and that the hashing default tends to give fairly well-balanced partitions. Reduce receives (\"/home\", [1, 1, 1, ...]) and emits (\"/home\", 31402).\n\nWhy this shape scales: map calls share nothing, so the input can be cut into M pieces and mapped on M machines at once (the paper sizes pieces at roughly 16 to 64 MB). Reduce calls for different keys also share nothing, so R of them run in parallel. The only coordination is the grouping in the middle. Output arrives as R files, one per reduce task.\n\nThe paper's scale figure shows what the single master tracks: computations with M = 200,000 and R = 5,000 on 2,000 worker machines. Notice tasks far outnumber machines; small tasks let work be rebalanced and make recovery after a failure quick. Interviewers often ask who chooses R: the user does, since it fixes the number of output files.",
  [
   "mapreduce-osdi04"
  ]
 ],
 [
  "Re-running is only safe if running twice gives the same answer as running once, and two design choices make that so. The input files never change, and map and reduce are deterministic, so a task is a pure function: same input split in, same output out. The paper's claim is that with deterministic operators the distributed run produces the same output as a non-faulting sequential execution of the whole program.\n\nWhy redo map tasks that had already finished? Their output is the intermediate data, written to the mapper's own local disk and waiting to be fetched by reducers. If that machine dies, the files die with it, so the paper re-executes completed map tasks. Completed reduce tasks are not redone, because their output already sits in the shared distributed file system.\n\nThe remaining danger is two copies of the same reduce task both finishing (after a false failure detection, or a deliberate backup copy of a slow task). Each writes to its own temporary file and then renames it to the final name. Rename is atomic, so the final file holds exactly one execution's data, never a mixture.\n\nWhere it bites: a map function that calls random() or reads the current time, or writes to an external database, breaks the guarantee. A retried task then produces different or duplicated effects.",
  [
   "mapreduce-osdi04"
  ]
 ],
 [
  "The shuffle is the regrouping in the middle: every record leaves the machine that mapped it and travels to the machine that owns its key. Spark's guide lists why that is expensive: disk I/O, data serialisation and network I/O. Map and filter touch each record where it sits; a shuffle moves the whole dataset.\n\nSkew follows from hash(key) mod R sending all records of one key to one task. Suppose 1 billion click events over 200 partitions, so about 5 million each, but one bot account produced 300 million. Its partition is 60 times the others; 199 tasks finish in two minutes and one runs for two hours, or runs out of memory. Adding machines does not help, because one key cannot be split by hashing.\n\nThe first remedy shrinks what crosses the network. MapReduce's combiner does partial merging on the map machine: instead of sending 300 million (bot, 1) pairs, each map task sends one (bot, count). In Spark that is reduceByKey rather than groupByKey, which the guide says gives much better performance for sums. This works only for aggregations that can be merged piecewise.\n\nThe second handles joins: Spark's adaptive execution measures partition sizes at run time and splits a sort-merge join partition that is both over 5 times the median and over 256 MB into evenly sized tasks.",
  [
   "spark-rdd-guide",
   "mapreduce-osdi04",
   "spark-sql-performance"
  ]
 ],
 [
  "In classic MapReduce the only way to pass data from one job to the next is to write it to the distributed file system and read it back, paying for replication, disk and serialisation each time. The RDD paper names two workloads this hurts most: iterative algorithms (each pass of a training loop is another job over the same data) and interactive queries on one dataset. Keeping the data in memory, it says, can improve performance by an order of magnitude; its headline measurement is up to 20 times faster than Hadoop for iterative applications.\n\nMemory is volatile, so how do you survive a lost machine without copying everything to a second one? Spark stores the recipe instead of a spare dish. Each dataset (RDD) remembers which transformations built it from which parents: \"read file X, filter lines starting with ERROR, take field 3\". That record is its lineage. If one partition is lost, Spark re-runs just that recipe on just the parent partitions involved, in parallel on other nodes, with no rollback of the whole program.\n\nWhere it bites: a recipe with 500 steps is slow to replay, and steps that involve a shuffle depend on many parent partitions. The paper notes that checkpointing some RDDs to storage is useful when a lineage chain grows long.",
  [
   "spark-rdd-nsdi12"
  ]
 ],
 [
  "Lambda exists because batch is complete but hours late, and streaming is fresh but (when it was proposed) considered approximate. So it runs both: Kreps describes an immutable sequence of records fed into a batch system and a stream processing system in parallel, with results stitched together at query time. A dashboard reads \"everything up to last midnight\" from the batch table and \"since midnight\" from the streaming one.\n\nThe cost is in his next sentence: you implement your transformation logic twice. \"Revenue per country\" exists as, say, a Spark job and a streaming job, in different frameworks with different semantics. Every change is made twice, and every discrepancy between the two is a bug hunt.\n\nKappa asks why batch was needed at all, and the honest answer is reprocessing: recomputing history after a code change. Kreps's recipe does that with the stream job alone. Keep the input log long enough (to reprocess 30 days, set Kafka retention to 30 days). Start a second instance of the job from the beginning of the retained data, writing to a new output table. When it has caught up, switch the application to read the new table, then stop the old job and delete the old table.\n\nThe limit to mention: you can only replay what the log still retains.",
  [
   "kreps-questioning-lambda"
  ]
 ],
 [
  "The goal is a job you can run for any date, any number of times, and get the same table. Appending fails that test: run 3 March twice and its rows are there twice. Overwriting the whole table fails differently: a 90-day backfill should not need to rebuild two years. The unit that works is the partition. A table partitioned by date is one directory per day, and a run for 3 March deletes and rewrites only that directory.\n\nSpark's setting decides what \"overwrite\" deletes. Its configuration reference says that in static mode (the default, kept for compatibility with Spark before 2.3) it deletes all partitions matching the partition specification in the INSERT statement before overwriting, while in dynamic mode it deletes nothing ahead and overwrites only the partitions that receive data at run time.\n\nRead \"matching the specification\" carefully. PARTITION(date='2024-03-03') matches one partition. PARTITION(date), with no value, matches every partition. So an overwrite carrying 14 days of data, in static mode with no fixed value, first empties all two years and then writes back 14 days. Dynamic mode would have replaced just those 14. The same reference notes the config does not affect Hive serde tables, which are always overwritten dynamically. It can also be set per write with option(\"partitionOverwriteMode\", \"dynamic\").",
  [
   "spark-configuration"
  ]
 ]
];
