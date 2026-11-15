// "More detail" for the key ideas of each topic: one entry per key idea, [text, source keys or 'calc'].
// Shown under each key idea on the Learn station (js/app.js). Checked by tools/check-content.mjs.
window.SD = window.SD || {}; SD.deep = SD.deep || {};
SD.deep["0A.1"] = [
 [
  "A sentence of the form \"<actor> can <verb> <thing>\" is a small test case: somebody sends a request and something observable comes back. That is why Hello Interview defines functional requirements as your \"Users/Clients should be able to...\" statements. \"The feed is fast\" fails the test because it describes a quality, and \"we use Kafka\" fails because it describes a solution; neither is something a user can do.\n\nThe actor does not have to be a person. Hello Interview's example for a cache is: clients should be able to insert items, set expirations and read items. For Twitter it is: users can post tweets, follow other users, and see tweets from the users they follow.\n\nWhere it bites: the sentence form keeps the two lists apart. Qualities get their own phrasing, \"The system should be...\", and are handled separately. If a line on your board has no actor and no verb, it is in the wrong list, and you will find nothing to draw for it later.",
  [
   "hi-delivery"
  ]
 ],
 [
  "The limit comes from the clock. Meta says its design interview is 45 minutes with the last five kept for your questions. Hello Interview gives the high-level design about 10 to 15 minutes. Take 12 minutes: three flows get four minutes each, enough to trace a request through the boxes and say what is stored. Eight flows get 90 seconds each, which is a box and a sentence, and nothing is left for depth.\n\nHello Interview is blunt about it: these products have hundreds of features, your job is to pick the top three, and a long list hurts more than it helps because top companies grade your ability to focus. Meta's own guidance says the same thing from the other side: there is not enough time for every detail, so find the interesting and hard problems.\n\nParking a feature out loud matters as much as choosing. Silence about search looks like you forgot it. \"Search is out of scope unless you want it\" is a decision the interviewer can overrule in five seconds.",
  [
   "hi-delivery",
   "meta-careers-swe-prep"
  ]
 ],
 [
  "An actor is whoever sends requests to the system, and each one sends different requests about the same things. Hello Interview's prompt for finding them is two questions: who are the actors in the system, and are they overlapping? Its cache example shows an actor can be a program: the requirements there start with \"Clients\", not \"Users\".\n\nTake a ride-sharing app as an illustration. A rider requests a ride and watches the matched driver approach. A driver goes online, reports location every few seconds and accepts a request. Same trip, two flows: the driver side is a steady stream of small writes, the rider side is an occasional request followed by reads. List only the rider and you design half the system and miss the write-heavy half.\n\nOverlap matters too. On Twitter one account both posts and reads, so there is one kind of user with two flows. On a marketplace, buyers and sellers may be separate accounts with separate permissions. Naming the actors first makes the feature list fall out by asking, for each one, \"what can they do?\".",
  [
   "hi-delivery"
  ]
 ],
 [
  "The chain is requirement, then endpoint, then a path through the boxes. Hello Interview's Twitter example shows it: \"post tweets\" becomes POST /v1/tweets, \"follow other users\" becomes POST /v1/follows, and \"see tweets from users they follow\" becomes GET /v1/feed. It says the API usually maps directly to the functional requirements (but not always), and that you can then go through the endpoints one by one and build the design up to satisfy each.\n\nThat gives a two-way check. Forwards: take each requirement and point to its endpoint, then to the arrows a request follows from client to storage and back. A requirement with no endpoint, or an endpoint whose path dead-ends at a box that cannot answer it, is a gap. Backwards: take each box and ask which requirement's path passes through it. A box no path uses has no reason to be there yet.\n\nInterviewers often close by asking whether the design is complete. Walking the three requirements through the diagram is the answer, and it takes about a minute.",
  [
   "hi-delivery"
  ]
 ]
];
SD.deep["0A.2"] = [
 [
  "Each word measures a different thing. Latency is how long one request takes. Throughput is how many requests per second the system completes. Availability is the share of time, or of requests, that get an answer. Consistency is whether every reader sees the latest write. Durability is whether acknowledged data survives failures. Scalability is whether all of that still holds as load grows.\n\nHello Interview gives a similar checklist to scan when you do not know the domain: consistency versus availability (CAP), environment constraints, scalability, latency, durability, security, fault tolerance and compliance. Its examples show how to make each one specific. Environment: is this running on a phone with limited battery, or streaming video on 3G? Scalability: is traffic bursty at a time of day or on holidays, and does it need to scale reads or writes more? Durability: a social network might tolerate some data loss, a banking system cannot.\n\nThe list is a prompt, not the answer. You scan it to find the handful that are unusual for this system, and the guide's advice is to keep the top three to five.",
  [
   "hi-delivery"
  ]
 ],
 [
  "A number does two jobs: it makes the requirement testable, and it points at the part of the system that needs the work. Hello Interview's example: \"the system should be low latency\" is true of nearly every system, so it says nothing, while \"low latency search, < 500ms\" names the part that most needs it and gives a target.\n\nWhy a percentile and not an average? Dean and Barroso's example: a server typically answers in 10 ms but its 99th-percentile latency is one second. The average is about 20 ms (0.99 × 10 + 0.01 × 1,000), which looks fine. One request in 100 still waits a second. Now let one page collect answers from 100 such servers in parallel: the chance that all 100 are fast is 0.99^100 ≈ 0.37, so 63% of page loads take over a second. \"p99 under 200 ms\" bounds that slow tail; an average does not see it.\n\nA complete requirement also says under what load it holds, for example \"at 10k QPS\", because a latency target is easy to meet on an idle system.",
  [
   "hi-delivery",
   "tail-at-scale"
  ]
 ],
 [
  "The arithmetic is one multiplication. A year has 365 × 24 = 8,760 hours. 99.9% leaves 0.1% of that, 8.76 hours. Each extra nine divides by ten: 52.6 minutes, then 5.26 minutes. Google's SRE table gives the monthly view too: 99.9% is 43.2 minutes a month and 99.99% is 4.32 minutes.\n\nThe numbers tell you how recovery has to work. With a 43-minute monthly budget, a person can be paged, diagnose and fix one incident. With four minutes, no person can, so failover has to be automatic.\n\nDependencies eat the budget. The Google authors of \"The Calculus of Service Availability\" put it as: a service cannot be more available than the intersection of all its critical dependencies. Three services in series at 99.9% each give 0.999³ ≈ 99.7%, about 26 hours a year instead of 8.76. Their rule of thumb, the \"rule of the extra 9\", is that critical dependencies must offer one more nine than the service: 99.999% underneath a 99.99% target.\n\nThe SRE table adds one caution: for services that can be partly up, \"X% of all operations failed\" is a more useful measure than outage length.",
  [
   "google-sre-availability",
   "calculus-of-service-availability"
  ]
 ],
 [
  "They fail differently. An availability failure is temporary: the system does not answer now, and when it comes back nothing is missing. A durability failure is permanent: the data is gone and no amount of waiting returns it. A bank closed for an hour is annoying; a bank that forgot your deposit is finished.\n\nThey are also built with different tools. Durability comes from writing to permanent storage before saying \"done\" and from keeping several copies. PostgreSQL's documentation states the first part: all the updates of a transaction are logged in permanent storage before the transaction is reported complete. Amazon S3 shows the second: it stores objects redundantly on multiple devices across at least three Availability Zones, repairs lost redundancy and verifies data with checksums.\n\nS3 also shows the two targets side by side: it is designed for 99.999999999% durability and 99.99% availability of objects over a year. Taking those at face value, 99.99% allows about 53 minutes a year of failed requests, while eleven nines on 10 million objects means an expected loss of one object every 10,000 years (10^7 × 10^-11 per year). In an interview, say which one the system cannot give up.",
  [
   "s3-data-durability",
   "pg-tutorial-transactions"
  ]
 ],
 [
  "You cannot maximise all of them because they pull against each other: making every reader see the latest write means waiting for copies to agree, which costs latency and availability; keeping more copies for durability costs write speed and money. So a requirement only helps the design if it says which side wins.\n\nHello Interview's Twitter example has exactly three: highly available, prioritising availability over consistency; able to scale to 100M+ daily users; feeds rendered in under 200 ms. The first one already contains its trade: a feed may be slightly out of date so that it always loads. A payment system would write the opposite sentence.\n\nThose three lines then become the agenda for the second half of the interview. The same guide uses the deep-dive time to check the design against each non-functional requirement: the 100M-user line leads to horizontal scaling, caches and sharding; the low-latency feed line leads to the fan-out-on-read versus fan-out-on-write discussion. That is the practical meaning of \"every component is justified by one\": when asked \"why is this cache here?\", the answer is one of your three lines.",
  [
   "hi-delivery"
  ]
 ]
];
SD.deep["0A.3"] = [
 [
  "An estimate is a comparison: a load number on one side, what one machine can do on the other. Machine capacities differ by factors of ten or more, so only the order of magnitude of your load matters. Being wrong by 30% never flips the answer; being wrong by 100× does.\n\nHello Interview's advice is to tell the interviewer you will skip estimates up front and do the maths when a design choice needs it. Its example: for a top-K trending-topics system, estimate how many distinct topics there are, because that decides whether one min-heap on one machine is enough or the structure must be sharded. Its Core Concepts page frames the same thing as questions: should you shard the database? Can a single Redis instance handle the cache load?\n\nThe \"hard dimension\" is whichever comparison fails first. A chat app may be trivial in storage but hard in open connections; a video site is the reverse. That page also warns that modern hardware is stronger than most candidates assume, so with 2010-era numbers in your head you will reach for sharding and caching earlier than needed. Wrong capacity numbers produce over-built designs.",
  [
   "hi-delivery",
   "hi-core-concepts"
  ]
 ],
 [
  "A day is 24 × 3,600 = 86,400 seconds. Rounding to 100,000 makes the division a matter of deleting five zeros: 1 million a day becomes 10 a second, 100 million becomes 1,000, a billion becomes 10,000. The rounding overstates the day by about 16%, so the shortcut reads about 14% low (the exact figures are 11.6, 1,157 and 11,574). For choosing between \"one server\" and \"a fleet\", that error is invisible.\n\nBrian Brazil of Robust Perception gives the same anchor, 100,000 seconds in a day for rough numbers at the design stage, and works the exact version: 10 million requests a day is about 115 a second. He adds that it pays to be a little more precise when you are actually provisioning.\n\nThe usual chain is users × actions per user = events per day, then divide. ByteByteGo's worked example: 300 million monthly users, half of them daily, gives 150 million; at two tweets each that is 300 million tweets a day, about 3,500 a second. Say each assumption as you multiply so the interviewer can correct an input instead of puzzling over your output.",
  [
   "robust-perception-peak",
   "bbg-estimation"
  ]
 ],
 [
  "Load follows people. Robust Perception's explanation: users go to work, go home and sleep, and are spread over time zones, so traffic has peaks and troughs that can easily differ 3–4× between the day's minimum and maximum. The number you need is the peak-to-mean ratio: peak traffic per second divided by the average. For a globally distributed user base the article calls 1.6 to 1.7 typical, and ByteByteGo's worked example simply doubles the average. So \"about 2×\" is a round, slightly cautious figure for an ordinary daily cycle.\n\nWorked: 10 million requests a day is 115 a second on average; at 1.7 it is almost 200. Build for 115 and, in the article's words, you will have a bad time at the next peak.\n\nSpiky workloads are different because an event (a sale opening, a goal in a final) squeezes demand into minutes, and no daily curve predicts that. That is why the multiplier is stated as an assumption for the interviewer to adjust.\n\nThe ratio also runs backwards. Storage accumulates at the average rate, so multiplying a peak rate by a full day overstates it: the article's example comes out at 10 TB against a true 6 TB.",
  [
   "robust-perception-peak",
   "bbg-estimation"
  ]
 ],
 [
  "Both formulas are unit conversions, and the skill is spotting which term dominates. ByteByteGo's Twitter exercise: 150 million daily users × 2 tweets × 10% with media × 1 MB per media file = 30 TB a day. Kept for five years: 30 TB × 365 × 5 ≈ 55 PB. The same exercise sizes tweet text at 140 bytes and the ID at 64. All 300 million tweets a day at about 200 bytes come to roughly 60 GB, some 500 times less than the media. So the storage question for that system is really a media question, and the text could be ignored.\n\nBandwidth works the same way but uses a rate instead of a daily total: requests per second × bytes per response. 1,000 image downloads a second at 1 MB each is 1 GB a second, which is 8 gigabits a second of outbound traffic; the same 1,000 requests returning 1 KB of JSON is one megabyte a second.\n\nTwo habits from the same chapter prevent most slips: write down your assumptions, and label units, because a bare \"5\" could be KB or MB. If asked, multiply storage by the number of replicas kept.",
  [
   "bbg-estimation"
  ]
 ],
 [
  "A number alone decides nothing. Hello Interview describes the failure: candidates calculate storage, daily users and QPS, conclude \"ok, so it's a lot\", and the interviewer learns only that they can do arithmetic.\n\nThe fix is to finish every estimate with a comparison against what one machine can do, then the design consequence. The thresholds this topic uses come from Hello Interview's Core Concepts page: a well-tuned database server handles tens of thousands of queries a second, and a single Redis instance handles hundreds of thousands of operations a second. So 12k read QPS sits inside one database's range, and the only reason to add a replica is availability. 120k is past it, so reads must be spread over replicas or absorbed by a cache. The same page gives a storage-and-writes example: at 10K writes per second and 100 GB of data, you do not need sharding yet.\n\nThe sentence has a fixed shape: \"X is below (or above) what one Y handles, so I will (or will not) add Z.\" If you cannot finish the sentence, the estimate was not worth doing, which is the test for whether to estimate at all.",
  [
   "hi-delivery",
   "hi-core-concepts"
  ]
 ]
];
SD.deep["0A.4"] = [
 [
  "The prompt is short on purpose. interviewing.io's guide says initial prompts tend to be intentionally light on detail, and that a common mistake is to extrapolate details from the prompt and build on them. Its example: \"design a photo sharing service\". A candidate who pictures Instagram assumes small images and heavy compression. But the interviewer may have meant something like Imgur (basic image hosting) or Flickr (photographers showing high-resolution work), where those assumptions are wrong.\n\nThe three piles record where each fact came from. Given: the interviewer said it, so it is fixed. Assumed: you chose it, so you must be ready to defend or change it. Out of scope: you both agreed not to build it. ByteByteGo describes how facts land in the first two: when you ask a question, the interviewer either answers directly or asks you to make your own assumptions.\n\nThe piles pay off later. When the interviewer changes something mid-interview (\"now make it global\"), you can see at once which pile it moves a fact out of and which parts of the design rested on it. Without the piles, every fact looks equally solid and you cannot tell what to revisit.",
  [
   "io-sd-guide",
   "bbg-framework"
  ]
 ],
 [
  "An assumption that stays in your head cannot be corrected, and the interviewer grades your design against the problem in their head. If the two differ, a sound design reads as a wrong one. Said aloud, the same assumption is a proposal they can accept or fix in one sentence.\n\nWorked example: you assume 20,000 requests a second, read-heavy at 100 reads per write. Writes are then 20,000 ÷ 101 ≈ 200 a second, and you plan a cache. The interviewer says it is actually an ingestion service with four writes per read. Writes become 4/5 of 20,000 = 16,000 a second, eighty times more, and the design is now about the write path. Hearing that in minute three is cheap; in minute thirty it costs the interview.\n\nWriting them down matters for a second reason. ByteByteGo's advice when the interviewer tells you to make your own assumptions is to write them on the whiteboard, because you might need them later; its estimation chapter repeats it so the figures can be referenced later. Twenty minutes on, \"why only one region?\" is answered by pointing at the line that says so.",
  [
   "bbg-framework",
   "bbg-estimation"
  ]
 ],
 [
  "A requirement says what the product must do or how well. A constraint is a fact about the world that removes options from your design. \"The company already runs everything on PostgreSQL\" does nothing for users, but it settles a choice.\n\nThat is why ByteByteGo's sample questions include: what is the company's technology stack, and what existing services might you leverage to simplify the design? It also notes that a solution for a young startup differs from one for an established company with millions of users. Same product, different constraints, different right answer.\n\nConstraints usually make a design smaller. Hello Interview's staff-level article gives a dialogue: the interviewer asks for location search over a set of places; the candidate asks how many (10,000) and whether they change often (not really), then answers \"let's sync periodically and search in memory\". No geo-index, no cluster. The article's line is that \"where does this system not actually need to scale\" is an important wedge in mature design.\n\nRead:write ratio, regions, compliance, budget and team size work the same way: each is a question whose answer deletes boxes or forces them. Hello Interview's requirements checklist lists read versus write ratio under scalability.",
  [
   "bbg-framework",
   "hi-staff",
   "hi-delivery"
  ]
 ],
 [
  "Add up Hello Interview's suggested timings: requirements about 5 minutes, core entities about 2, API about 5, high-level design 10 to 15, deep dives about 10. That is 32 to 37 minutes. Meta says its design interview is 45 minutes and the interviewer typically keeps the last five for your questions, so you have 40. The slack is three to eight minutes for the whole interview. One phase that overruns by ten minutes takes the deep dive with it.\n\nByteByteGo's rough guide for 45 minutes has wider bands but the same shape: 3 to 10 minutes on understanding and scope, 10 to 15 on high-level design, 10 to 25 on the deep dive, 3 to 5 to wrap up. Amazon's senior loop uses 55-minute interviews, so check the length with your recruiter.\n\nWhy it matters: Hello Interview says the easiest way to sabotage an interview is to fail to deliver a working system, that this is the most common reason mid-level candidates fail, and that it often gets written up as \"time management\". The budget is how you notice early. If minute 12 arrives and no box is drawn, cut scope out loud and move on.",
  [
   "hi-delivery",
   "meta-careers-swe-prep",
   "bbg-framework",
   "amazon-sde3-prep"
  ]
 ]
];
SD.deep["0A.5"] = [
 [
  "A quick test for any question: imagine the two most likely answers and ask whether you would draw something different for each. If not, skip it.\n\ninterviewing.io's photo-sharing example shows a question that passes. If the service is like Instagram, small images and heavy compression are fine. If it is for photographers showing work in high resolution, they are not, and storage and bandwidth change with it. That guide's list of what to probe is: what type of users does it serve, what type of traffic can it expect, what limits will it have.\n\nHello Interview's staff-level article shows a two-question version. Asked for location search over a set of places, the candidate asks how many places (10,000) and whether they are updated often (no), and the design collapses to \"sync periodically and search in memory\". Had the answer been hundreds of millions, the same question would have justified a dedicated index.\n\nMeta's own sample questions for a messaging backend have the same character: how many people, how many messages sent, what latency from sender to receiver. Each answer moves a number that sizes a component. \"Which language does the team prefer?\" moves nothing.",
  [
   "io-sd-guide",
   "hi-staff",
   "meta-careers-swe-prep"
  ]
 ],
 [
  "The interview exists to observe your decisions, so a question that asks the interviewer to make one removes the thing being measured. Hello Interview's staff-level article describes a sharp candidate who answered every major decision with two to four options for the interviewer to choose from. The interviewer had to keep replying \"Well, which one would you choose?\", and writes that he cannot judge fit without seeing decisions. His model answer is one sentence with a reason: \"I'm going to go with Postgres here because I need transactions across tables and durability\", plus a note that it can be revisited.\n\ninterviewing.io names the same failure: candidates list databases with pros and cons and move on. Its fix is to add the last clause: based on these trade-offs, I'll use that one. It also says changing your mind when the interviewer challenges you is fine.\n\nConstraint questions are a different kind. \"What is the company's technology stack? What existing services can I leverage?\" (ByteByteGo's examples) ask for facts only the interviewer has. The line is: ask about the world you are designing in, decide what you build in it.",
  [
   "hi-staff",
   "io-sd-guide",
   "bbg-framework"
  ]
 ],
 [
  "An open question (\"what scale?\") makes the interviewer do the work and can stall if they shrug. A question with a default (\"I'll assume 10 million daily users unless you say otherwise\") is a yes/no question with three possible replies, and all three keep you moving. \"Yes\" confirms it. \"No, more like 100 million\" gives you a better number. \"Up to you\" means your default stands.\n\nByteByteGo describes that third case as normal: the interviewer either answers directly or asks you to make your own assumptions, and then you write them down. Its sample dialogue shows the interviewer doing it too: \"To keep things simple, let us assume the feed is sorted by reverse chronological order.\"\n\nThe default is also evidence. A plausible number shows you know roughly what such systems look like, and Hello Interview's staff-level advice is that interviewers want to see decisions, not outlines of options.\n\nIt works mid-interview as well. Amazon's guidance says you should ask questions to complete and validate your design, so at minute 30 you can still say: \"I'm caching feeds for 60 seconds; I'll assume a minute of staleness is acceptable.\"",
  [
   "bbg-framework",
   "hi-staff",
   "amazon-sde3-prep"
  ]
 ],
 [
  "Hello Interview allots about five minutes to requirements, functional and non-functional together; ByteByteGo's range for understanding the problem and setting scope is 3 to 10 minutes of a 45-minute session. ByteByteGo's sample news-feed dialogue gives a feel for how many questions fit: the candidate asks six (mobile or web, most important features, feed ordering, how many friends, traffic volume, media types) and gets one-line answers. Six questions in five minutes is under a minute each, including the answer and writing it down.\n\nThe reason for the cap is where the evaluation happens. Hello Interview gives the high-level design 10 to 15 minutes and deep dives about 10; every extra minute of questions comes out of those. Meta's guidance holds both sides in two sentences: be sure to ask clarifying questions, but make sure you drive towards a good solution.\n\nStopping is not the end of asking. Amazon tells candidates to ask questions to complete and validate the design, so later questions are expected. The practical rule: ask up front only what you need to start drawing, and ask the rest when a specific decision depends on it.",
  [
   "hi-delivery",
   "bbg-framework",
   "meta-careers-swe-prep",
   "amazon-sde3-prep"
  ]
 ]
];
SD.deep["0B.1"] = [
 [
  "The point of nouns-plus-verbs is that the verbs are a small, fixed vocabulary everyone already knows. Google's API design guide puts it this way: an API is built from individually named resources and the hierarchy between them, and a small number of standard methods (Get, List, Create, Update, Delete) supply the meaning of most operations. So a typical API has many resources and few methods on each. A client who has learned how to list, fetch and delete orders already knows how to do the same to invoices.\n\nCompare the alternative: /createOrder, /getOrder, /cancelOrder, /listOrdersForUser. Every endpoint is a one-off name someone has to look up, and nothing outside your service can tell which ones change data. HTTP infrastructure relies on the verb for that: the HTTP spec warns that if a URL like page?do=delete performs the action on a plain GET, crawlers and pre-fetchers that GET every link will trigger it.\n\nTwo follow-ups. Some actions are not create/read/update/delete (cancel an order, say); the same guide allows custom methods where the standard ones do not fit. And resources are not your tables: it calls an API identical to the database schema an anti-pattern, because it couples clients to your storage.",
  [
   "google-aip-121",
   "rfc9110"
  ]
 ],
 [
  "Idempotent has a precise meaning in the HTTP spec: the intended effect on the server of several identical requests is the same as for one. It exists for one reason, retries. If the connection drops before the response arrives, the client cannot tell whether the request was applied. For an idempotent method it can simply resend.\n\nWhy each verb lands where it does: PUT says 'make the resource look exactly like this', so applying it twice leaves the same state. DELETE twice leaves the resource gone both times; the second response may differ (a 404, say), but the spec's promise is about the effect, not the response. GET only reads. POST asks the resource to process the body however it likes, typically creating something whose ID the server chooses, so two POSTs give two orders. PATCH depends on the patch: 'set name to Ann' is repeatable, 'append this item' is not, so its RFC calls it neither safe nor idempotent, while noting it can be issued in an idempotent way.\n\nWhere it bites: the spec says a client should not automatically retry a non-idempotent method, and a proxy must not. So a POST that times out is the dangerous case.",
  [
   "rfc9110",
   "rfc5789"
  ]
 ],
 [
  "Status codes are read by code that never parses your body: client libraries, retry logic, proxies, dashboards. Learn them by what the caller should do next.\n\nSuccess: 201 says something new was created, and the response's Location header (or the request URL) identifies it. 204 says it worked and there is nothing to send back.\n\nYour request is wrong, so resending it unchanged will not help: 400 is a malformed request. 401 means the request lacks valid authentication credentials (who are you?). 403 means the server understood but refuses (I know who you are; no), so do not repeat it with the same credentials. 404 means not found; a server may answer 404 instead of 403 to hide that a resource exists. 409 is a conflict with the resource's current state, used when the caller might fix the conflict and resubmit, for example an edit based on a stale version.\n\nSlow down: 429 means too many requests in a given time, and may carry a Retry-After header saying how long to wait.\n\nThe usual interview follow-ups: 401 versus 403, and which codes are worth retrying (429 after a wait; other 4xx only after changing the request).",
  [
   "rfc9110",
   "rfc6585"
  ]
 ],
 [
  "OFFSET carries one piece of information: how many rows to throw away. The database has nothing else to go on, so it must fetch those rows, in order, and drop them. Ask for page 5,001 of 20 (OFFSET 100000 LIMIT 20) and it reads 100,020 rows to return 20. Slack describes exactly this cost.\n\nThe instability has the same root. Fetch rows 1–10; a new row arrives at the top; now ask for OFFSET 10. Everything has shifted down by one, so the old row 10 comes back as the first item of page two. A delete shifts the other way and a row is skipped.\n\nA cursor replaces 'skip N' with 'continue after this row': WHERE id < last_seen_id ORDER BY id DESC LIMIT 20. With an index on id the database goes straight to that spot, so page 5,001 costs the same as page 1, and inserts above the cursor cannot shift what comes after it. Slack fetches count + 1 rows and uses the extra row's ID as next_cursor; an empty cursor means the last page.\n\nThe costs: you cannot jump to an arbitrary page, and the cursor must be built on a unique, sequential column.",
  [
   "use-the-index-luke-no-offset",
   "slack-evolving-pagination"
  ]
 ],
 [
  "A version number is a promise about what will not change. Google's API guidelines spell it out. Within one major version you may add things (new methods, new fields), but you must not remove or rename existing ones, or add a new required field to an existing request, because old clients must keep working against newer servers. Anything that breaks that promise needs a new major version, which Google puts as the first part of the URL path: v1, v2, never v1.1. Old and new versions run side by side for a transition period, and the old one gets a well-communicated deprecation period before shutdown.\n\nWhy 'from day one': the guidelines assume consumers you do not control, updating whenever they choose. An app released today may call your URLs for years. If those URLs carry no version, there is no clean place to put the breaking change later; with /v1/ already in every client, /v2/ can simply appear next to it.\n\nMost evolution should therefore be additive and need no version bump. One trap from the same guide: adding pagination to an endpoint that used to return everything is a breaking change, because old clients will assume the first page is the complete list.",
  [
   "google-aip-185",
   "google-aip-180"
  ]
 ]
];
SD.deep["0B.2"] = [
 [
  "The three parts stack. You write a .proto file that declares the service, its methods and the message types. The protobuf compiler, with a gRPC plugin, turns that file into code: on the client a stub object with the same methods as the server, on the server an interface to implement. Calling stub.GetUser(request) looks like a local method call; the stub serialises the message, sends it, and hands back a typed reply. That is schema-first: the contract comes first and both sides are generated from it.\n\nProtocol Buffers is why messages are small. A field is identified on the wire by its number, not its name, and numbers 1 to 15 take a single byte to encode, where JSON would spell out \"user_id\" in every message.\n\nHTTP/2 lets many calls share one TCP connection (multiplexing) with binary framing. Efficient, and also where gRPC bites in production. HTTP/2 is designed around one long-lived connection, so a connection-level load balancer makes its only decision when the connection opens. After that every request from that client is pinned to one backend pod. The fix is to balance requests, not connections: an L7 proxy that understands HTTP/2, or a client that keeps a connection to each backend.",
  [
   "grpc-intro",
   "protobuf-proto3",
   "ms-grpc-compare",
   "k8s-grpc-lb"
  ]
 ],
 [
  "The four types are the 2 × 2 of 'one message or a stream', in each direction. In the .proto the only difference is the word stream in front of the request, the response, or both.\n\nUnary is an ordinary function call: one request, one response (say, look up a user). Server streaming: one request, then the client reads messages until there are no more (subscribe to price updates, or read a model's output token by token). Client streaming: the client writes a sequence of messages, then waits for a single response (upload a file in chunks and get back one receipt). Bidirectional: both sides have a stream, and the two operate independently, so the server may wait for everything before replying or answer message by message (a chat session).\n\nTwo details worth saying aloud. gRPC guarantees message order within a single call. And a stream is still one call from start to finish: the server sends its status code once, after its last message, which is how the client learns whether the whole stream succeeded.\n\nWhere it bites: a stream lives on one connection to one backend for its whole life, and browsers get only the first two types.",
  [
   "grpc-core-concepts",
   "grpc-web-readme"
  ]
 ],
 [
  "A deadline is a point in time by which the caller wants the answer; past it, the client gives up with DEADLINE_EXCEEDED. gRPC sets none by default, so a client with no deadline can wait effectively forever on a stuck server.\n\nPropagation is what makes this matter between services. In the gRPC documentation's own example, a client calls the user service at 13:00:00 and wants a reply within 2 seconds. The user service works for 0.5 seconds and then calls billing. With propagation, the billing call goes out with a timeout of 1.5 seconds: the original 2 minus the 0.5 already spent. gRPC sends the remaining time, not the wall-clock deadline, so the two machines' clocks need not agree. At 13:00:02 everyone stops: the client gives up, and the cancellation travels down to billing.\n\nTwo caveats. When the deadline passes the gRPC server cancels the call automatically, but your handler is still responsible for stopping whatever work it started, so long-running code must check for cancellation. And if a service makes its downstream call without passing the deadline on, the downstream service keeps working on a request nobody is waiting for.",
  [
   "grpc-deadlines"
  ]
 ],
 [
  "Why can't a browser just speak gRPC? gRPC leans on HTTP/2 features that page JavaScript cannot reach: Microsoft's comparison notes that browsers do not let a caller require HTTP/2 or give access to the underlying HTTP/2 frames. So gRPC-Web puts a translator in the path. The browser uses a generated gRPC-Web client, and a special proxy (Envoy by default) converts to real gRPC for the backend. The README lists what survives the translation: unary calls and server-side streaming, the latter only in its text wire mode. Client-side and bidirectional streaming are not supported.\n\nDebuggability is the second cost. A JSON request can be read and written by a person. A protobuf payload is binary, and decoding it properly requires the .proto file, so you need extra tooling (server reflection and gRPC command-line tools exist for this).\n\nFor a public API this adds up: every third-party developer must obtain your .proto, generate a client and learn that tooling before making a first call, where a REST API needs only an HTTP client. Hence the usual split: REST or JSON at the edge, gRPC between your own services. Some frameworks bridge the two by transcoding JSON into gRPC.",
  [
   "ms-grpc-compare",
   "grpc-web-readme"
  ]
 ],
 [
  "All three rules follow from one fact: on the wire a protobuf field is identified by its number. The name and the declared type live only in the .proto each side compiled.\n\nAdding a field is safe in both directions. An old binary receiving a message with new field 7 does not recognise 7 and simply ignores it; a new binary receiving an old message without field 7 sees the default value. This matters because during a rolling deploy old and new binaries talk to each other.\n\nReusing a number breaks this silently. Say field 4 was int64 user_id, it is deleted, and later someone adds int64 account_id = 4. An old binary still believes 4 means user_id and decodes account IDs as user IDs. The wire format has no way to detect that a field was encoded with one definition and decoded with another; the protobuf guide lists the outcomes as a parse error in the best case, otherwise data corruption or leaked personal data. Renumbering is the same mistake: it is equivalent to deleting a field and adding a new one.\n\nThe guard is one line, reserved 4; in the message. From then on the compiler rejects any field that tries to use that number.",
  [
   "protobuf-proto3",
   "protobuf-dos-donts"
  ]
 ]
];
SD.deep["0B.3"] = [
 [
  "A GraphQL server publishes a schema: the types that exist, their fields, and how they link (a User has orders, an Order has products). A query is a tree picked out of that schema, and the response is JSON in the same shape as the query. For example:\n\nquery { user(id: \"123\") { name orders { id products { title price } } } }\n\nreturns a user's name and orders, each order with its id and its products' titles and prices, and nothing else.\n\nOn the server there is no handler per URL. Every field on every type has a small function, called a resolver, that knows how to produce that one value. The engine walks the query tree and calls the resolver for each field it meets. Resolvers are arbitrary functions: they can read from SQL, a cache or another service.\n\nThe consequence of 'one endpoint' is the thing to notice. In REST the URL says what data is wanted. Here every request goes to the same URL, and the real question is in the body. Anything that used to key on the URL (HTTP caches, per-route rate limits, per-route latency dashboards) has to be rebuilt around the query instead.",
  [
   "graphql-performance",
   "graphql-faq",
   "graphql-federation"
  ]
 ],
 [
  "A REST endpoint returns a shape the server chose. It is wrong for most callers in one of two ways.\n\nOver-fetching: a list screen needs each user's name and avatar, but GET /users/42 returns the whole profile. If the profile has 40 fields, the phone downloads 38 it throws away, on every row.\n\nUnder-fetching: an order-history screen needs the user, their orders and each order's products. In REST that is GET /users/123, then GET /users/123/orders, then one product request per order. With 5 orders that is 1 + 1 + 5 = 7 round trips, and the later ones cannot start until the earlier ones return. In GraphQL it is one request, and the server gathers the pieces. (Illustrative numbers.)\n\nThe work has not vanished. The GraphQL FAQ says the logic of batching data moves from the client to the server, which sits next to the databases.\n\nWhy 'many front-ends' matters: with one client you just build the endpoint it needs. With web, iOS, Android and TV apps each wanting a different slice, REST forces an endpoint per screen or one bloated response for all. It also need not replace REST: a GraphQL server can sit in front of existing REST APIs.",
  [
   "graphql-faq"
  ]
 ],
 [
  "N+1 comes straight from the resolver design. Each field's resolver is a small function that knows only about its own object. The resolver for Post.author receives one post and fetches one author. It cannot see that 99 sibling posts are asking the same question.\n\nSo a query for 100 posts with their authors runs one query for the list (the '1') and then the author resolver fires 100 times, each doing SELECT … WHERE id = ? (the 'N'): 101 database round trips. An index does not help: each lookup is already fast, and the cost is the 100 separate trips.\n\nBatching changes what the resolver does. Instead of querying, it tells a loader 'I need author 17' and gets back a promise. The loader collects the requests that arrive over a short period, then dispatches them as a single request: one WHERE id IN (…) query for all the authors. Total: 2 queries instead of 101. The loader can also cache, so if 100 posts have only 12 distinct authors, 12 IDs are fetched. Facebook's DataLoader is the tool graphql.org names for this.\n\nThe interview point is the cause: not a slow query but the shape of execution. Any field nested under a list can trigger it.",
  [
   "graphql-performance"
  ]
 ],
 [
  "Caching first. An HTTP cache or CDN recognises a repeat request by its URL. A typical GraphQL request is a POST to /graphql with the query in the body, so every query shares one URL. Sending queries as GET puts the query in the URL, and GET responses are cacheable by default when the server sends caching headers. But a large query will not fit within the URL size limits that browsers and CDNs impose. Persisted queries solve that: the client sends a hash of the query, and the server looks the full text up in a server-side store.\n\nCost second. In REST the server decided how expensive each endpoint is. In GraphQL the client does. If every user has 100 friends, friends { friends { friends { friends } } } touches 100 × 100 × 100 × 100 = 100 million objects from four lines of text. The controls stack: paginate list fields; cap depth; cap the number of top-level fields and aliases (100 aliases of one field is shallow but still 100 fetches); and for finer control give fields weights, estimate each query's cost up front, and reject it or charge it against the client's rate-limit budget.\n\nIf only your own apps call the API, an allowlist of known queries is stronger still.",
  [
   "graphql-performance",
   "graphql-security"
  ]
 ],
 [
  "One GraphQL schema owned by one team becomes a bottleneck as a company grows: every product team must change the same codebase. Federation splits the ownership while keeping one graph for clients. graphql.org's analogy is a federal state: the states stay sovereign but cooperate under a central authority.\n\nThree pieces. Subgraphs are services, each defining the schema and resolvers for its own domain: Users, Orders, Products. Composition merges those schemas into one, detecting incompatibilities. The gateway is the single endpoint clients call; it routes each part of a query to the subgraph that owns it and assembles the result.\n\nTake user(id: \"123\") { name orders { id products { title price } } }. The gateway asks the Users subgraph for the name, the Orders subgraph for that user's orders, and the Products subgraph for titles and prices. The link between services is a key: Orders does not know what a product is, only that a Product is identified by its id, and Products fills in the rest.\n\nThe follow-up: one client query is now several internal network calls, so latency and partial failure need thought, and the gateway is on every request path. Netflix is among the companies in the GraphQL Foundation working group standardising federation.",
  [
   "graphql-federation"
  ]
 ]
];
SD.deep["0B.4"] = [
 [
  "A WebSocket begins as an ordinary HTTP request so that it can use the same ports and proxies as web traffic; the RFC says it is designed to work over ports 80 and 443 and to support HTTP proxies. The client sends GET /chat with two extra headers, Upgrade: websocket and Connection: Upgrade. If the server agrees it answers 101 Switching Protocols. Any other status means the handshake did not complete and you are still talking plain HTTP.\n\nAfter the 101 the same TCP connection stops carrying HTTP. Either side can now send whenever it likes. Messages travel as frames: text, binary, and control frames such as Close, Ping and Pong. A Ping must be answered with a Pong, which gives you a keepalive.\n\nHTTP/2 multiplexes many streams on one connection, so switching the whole connection to another protocol makes no sense; RFC 8441 instead opens a tunnel on a single HTTP/2 stream, alongside the connection's ordinary requests.\n\nWhere it bites: every proxy and load balancer on the path must understand the upgrade and tolerate a connection that stays open for hours, and that connection is tied to one specific server.",
  [
   "rfc6455",
   "rfc8441"
  ]
 ],
 [
  "SSE is not a new protocol. It is a normal HTTP response, with content type text/event-stream, that the server simply does not finish. It keeps writing small text records as things happen; each is a few lines like 'event: add' and 'data: 73857293', ended by a blank line. Being plain HTTP, it needs no upgrade step.\n\nThe browser's EventSource object adds the useful behaviour. If the connection drops, it waits its reconnection time (a few seconds by default; the server can change it with a 'retry:' line) and reconnects on its own. If the server labelled events with 'id:' lines, the browser remembers the last one and sends it back in a Last-Event-ID request header, so the server knows where to resume. A 204 No Content response tells it to stop reconnecting. The spec suggests a comment line every 15 seconds or so, to stop old proxies dropping an idle connection.\n\nThis is how LLM APIs stream. Anthropic's Messages API sends content_block_delta events, each carrying a text_delta with the next few characters, plus occasional pings.\n\nTwo limits. It is one-way, so anything the client says goes in a separate request. And without HTTP/2 a browser allows only 6 SSE connections per domain across all tabs.",
  [
   "whatwg-sse",
   "mdn-eventsource",
   "anthropic-streaming"
  ]
 ],
 [
  "An ordinary HTTP request can go to any server, because nothing about the user lives there between requests. A WebSocket breaks that. The load balancer chooses a server once, at connect time, and from then on the open socket exists only in that one server's memory. If Ann is connected to gateway 1 and Bo to gateway 2, gateway 1 has no way to write to Bo's socket.\n\nSlack's design shows the usual answer. Gateway Servers hold the users' WebSocket connections and their channel subscriptions. Separate Channel Servers each own a set of channels, assigned by consistent hashing on the channel ID. When a client connects, its gateway subscribes to the channel servers for that user's channels. A new message is routed to the channel server that owns its channel, which sends it to every gateway subscribed to that channel, and each gateway writes it to its own connected clients. That is publish/subscribe with gateways as subscribers.\n\nThe deploy consequence: restarting a gateway closes every connection it holds. So you drain, moving users off gradually. Slack mentions a draining mechanism that switches users from a failing region to the nearest good one.",
  [
   "slack-real-time-messaging"
  ]
 ],
 [
  "Two problems hide here: stampeding the server, and losing messages.\n\nStampede. If a deploy drops 500,000 connections and every client reconnects at once, the gateways receive 500,000 handshakes in the same second. The WebSocket RFC warns that clients which immediately and persistently reconnect amount to a denial-of-service attack on their own server, and says the first reconnect should be delayed by a random amount. That randomness is jitter. Spread the reconnects uniformly over 30 seconds and the peak is 500,000 / 30 ≈ 17,000 per second. Backoff lengthens the wait after each failure; without jitter, AWS notes, clients that back off to the same moment collide again.\n\nLoss. TCP delivers reliably only within one connection. Messages published while the client was offline were never on any connection. The fix is in the application: every message has an ID, the client reports the last ID it saw, and the server replays what came after, which means keeping a buffer of recent messages. The client drops IDs it has already processed.\n\nEventSource implements the client half for free: an 'id:' line on an event sets the value it later sends as Last-Event-ID. With a WebSocket you write this yourself. Either way, decide what happens when a client was away longer than the buffer holds.",
  [
   "rfc6455",
   "aws-bl-timeouts-retries",
   "whatwg-sse"
  ]
 ],
 [
  "Backpressure is what happens when the sender produces faster than the receiver can take. The bytes do not disappear; they queue in the sender's memory, one queue per connection.\n\nWork an example. A price ticker sends 100 updates per second of 200 bytes each: 20 KB/s. A phone on a poor network drains only 5 KB/s. The backlog for that one client grows by 15 KB every second, which is 15 × 3,600 = 54 MB after an hour. With 10,000 such clients the server is holding 540 GB of messages nobody will read in time, and it falls over for everyone.\n\nSo each connection gets a bounded buffer, and you choose what happens when it fills. Drop: discard messages, fine for a typing indicator. Coalesce: keep only the newest value per key, right for prices or presence. Disconnect: close the slow client and let it reconnect and resume from its last ID, the choice when every message matters, as in chat.\n\nThe receiving side has the same problem. MDN warns that the browser WebSocket API has no way to apply backpressure, so messages arriving faster than the page can process them fill the device's memory or pin the CPU.",
  [
   "mdn-websocket"
  ]
 ]
];
SD.deep["0B.5"] = [
 [
  "'Cross-cutting' means a job every request needs done no matter which service it is heading for. Follow one request through the gateway: it terminates TLS (decrypts the client's connection), checks the access token, checks the caller's rate limit, picks a backend from the URL path (layer-7 routing), forwards the request, and logs the result.\n\nRemove it to see why it earns its place. Azure's guidance lists what happens when clients call services directly: each public-facing service must handle authentication, SSL and client rate limiting itself; clients must track many endpoints; and every public endpoint enlarges the attack surface. Certificates are its concrete example: without a gateway you deploy a client-facing certificate on every application instance, then track its expiry and renew it everywhere. With 20 services, that is 20 copies of the token-validation code and 20 places for a security bug, instead of one.\n\nThere is a monitoring benefit too: the gateway gives a baseline of logs and metrics even for a service that is not properly instrumented.\n\nThe price, which you should name: an extra network hop on every request, and each offloaded job (TLS, auth, inspection) adds processing time to the request path.",
  [
   "azure-api-gateways",
   "azure-gateway-offloading"
  ]
 ],
 [
  "The gateway is a level of indirection: clients know one address and a set of public paths; the gateway maps those paths to whatever is behind them today. microservices.io names what that hides. The number of service instances and their host and port change constantly; the way the system is partitioned into services changes over time; and services may speak protocols that are not web-friendly.\n\nA worked case. Version 1 of your app calls GET /v1/orders/7/shipment, served by the orders service. A year later you split shipping into its own service. Without a gateway, every installed app holds the old service's address, and you cannot make users upgrade. With one, you change a routing rule: /v1/orders/*/shipment now goes to the shipping service, and no client notices. (The paths are illustrative.)\n\nThree more things fall out of the same indirection. Translation: the public side can be ordinary HTTP while the inside uses another protocol such as gRPC. Aggregation: the gateway can fan one client request out to several services and return a combined answer, saving round trips on slow mobile networks. And simpler services: they are no longer exposed directly to clients.",
  [
   "microservices-io-api-gateway",
   "azure-api-gateways"
  ]
 ],
 [
  "A quick test for what counts as business logic: does the rule need to know what an order, a user or a price is? 'This token has expired' and 'this key has made too many requests' apply to any API, so they belong in the gateway. 'Orders over $500 need approval' or 'a shipped order cannot be cancelled' only make sense inside one domain, so they belong in the service that owns it. Azure's guidance applies the same line even to small things: a redirect that depends on business state stays in the application.\n\nWhy it matters is organisational more than technical. Sam Newman describes what happens to a general-purpose API backend that many client teams depend on: so many changes target the same deployable artifact that it becomes a bottleneck, a separate team gets created to own it, and then every front-end team must queue behind that team's priorities. A gateway that computes discounts lands in the same place. The pricing team can no longer ship a pricing change on its own.\n\nThe risk is also larger. A bug in an orders service breaks orders. A bug in code running inside the gateway can break every route, because every request passes through it.",
  [
   "azure-gateway-offloading",
   "newman-bff"
  ]
 ],
 [
  "Every request passes through the gateway, so the system is never more available than the gateway. Azure's advice has three parts: run multiple instances so there is no single point of failure; size them for peak bursts, not average load, because an under-provisioned gateway slows every service behind it; and drain connections on restart.\n\nScaling out is easy while instances are stateless, since any instance can take any request. Rate limiting is where that breaks. Say the limit is 100 requests per second per API key and you run 12 instances. If each keeps its own counter, each allows 100, and a client spread across all of them gets up to 12 × 100 = 1,200. Give each instance a share instead (100 / 12 ≈ 8) and a client whose traffic happens to land unevenly is rejected while under its limit.\n\nSo the count moves to one shared place. Envoy's version: the proxy calls a global rate-limit service for every new request, and the reference implementation of that service uses a Redis backend. That is an extra call per request, so Envoy also allows a local token bucket in front, absorbing huge bursts before the precise global check. Expect the follow-up: if the shared store is down, do you let requests through or reject them?",
  [
   "azure-gateway-offloading",
   "envoy-global-rate-limiting"
  ]
 ],
 [
  "Clients differ in more than payload size. Sam Newman's account: a phone has less screen, so it shows less data; opening many connections drains battery and data plans; and the interactions themselves differ. So mobile wants different calls, fewer calls and less data than desktop web.\n\nA BFF answers this by treating each user interface as having two halves: the app on the device and a small server-side component built only for that app. The important detail is ownership. The BFF is maintained by the same team as the UI, so that team changes the API and the screen together.\n\nNewman's example is a wishlist screen. The Wishlist service holds item IDs, the Catalog service holds names and prices, and the Inventory service holds stock levels. The BFF exposes one call that makes at least three downstream calls, in parallel where it can, and returns one screen-shaped response. If Inventory is down, it can still answer and simply leave out the stock indicator.\n\nThe cost is duplication: several BFFs end up with similar aggregation code. A real example: microservices.io notes that the Netflix API gateway runs client-specific adapter code to give each client an API suited to it.",
  [
   "newman-bff",
   "microservices-io-api-gateway"
  ]
 ]
];
SD.deep["0B.6"] = [
 [
  "The retry is forced on the client by what a timeout does not tell it. Three different failures look identical from outside: the request never arrived, the server crashed halfway through, or the work finished and only the reply was lost. Stripe's engineering post puts it as the success of the operation being ambiguous from the client's perspective; a connection that dies midway through the exchange is its example, while a failure to even connect is the rare case where a retry is obviously safe.\n\nIdempotency removes the need to know which of the three happened. HTTP builds this into its verbs: RFC 9110 says PUT, DELETE and the safe methods (GET, HEAD and so on) are idempotent, and POST is not on that list. The definition is about the intended effect, so the server may still log every copy or return a different status the second time.\n\nWhere it bites: \"retry on timeout\" is only a safe default for the idempotent verbs. The same post also recommends spacing retries with exponential backoff (waits growing as 2^n) plus random jitter, so that many clients failing together do not hammer a recovering server in step.",
  [
   "stripe-blog-idempotency",
   "rfc9110"
  ]
 ],
 [
  "The client has to mint the key because only the client knows that two HTTP requests are the same intention. To the server, two POSTs for 20 dollars from one customer could be a retry or two real purchases; the key is the client saying \"these are one\". So it is created once per logical operation, before the first attempt, and reused unchanged on every retry. Stripe suggests a V4 UUID or another random string with enough entropy to avoid collisions, and accepts keys of up to 255 characters.\n\nOn the server the key indexes a stored outcome. For its v1 API Stripe saves the status code and body of the first request for a key and returns that saved response to retries, including 500 errors. So a retry is a lookup, not a second execution.\n\nTwo follow-ups interviewers ask. What if the same key arrives with a different amount? Stripe compares the parameters with the original request and returns an error, so a client bug is not silently hidden. And how long are keys kept? Not forever: Stripe's v1 keys can be pruned once they are at least 24 hours old, after which a reused key is treated as a new request.",
  [
   "stripe-idempotent-requests"
  ]
 ],
 [
  "Take the two-step version: SELECT the key, find nothing, do the work, INSERT the key. Two retries 5 ms apart on different servers both run the SELECT before either INSERT, both find nothing, and both do the work. The fix is to let the database be the referee: put a unique index on the key (Brandur's Postgres design uses one across user_id and idempotency_key) and insert first. Exactly one insert wins; the loser gets a constraint violation and knows a twin is already in flight.\n\nWhy the same transaction? AWS's Builders' Library states the requirement as recording the token and all the mutating operations being one ACID operation, so you can never end up with the token recorded and no resource, or the resource created and no token.\n\nThat only works while the side effect lives in your own database. A card charge at an outside processor cannot be rolled back by your transaction. Brandur's rule is that the local \"atomic phase\" must be committed before the foreign call starts: commit key plus a pending record, then call out, then record the result. If the process dies in between, the committed record shows where to resume, and passing the same key onward makes the repeated outbound call harmless too.",
  [
   "brandur-idempotency-keys",
   "aws-bl-idempotent-apis"
  ]
 ],
 [
  "Delivery and processing are two separate promises. A sender that cannot tell whether a message landed has only two choices: give up (at-most-once, messages can be lost) or resend until acknowledged (at-least-once, messages can repeat). Kafka's design document describes exactly this: a producer that got no response had little choice but to resend, and the message may then be written twice if the first attempt had in fact succeeded. The consumer side has the same hole: crash after processing but before saving your position, and the replacement process sees those messages again.\n\nSo nobody removes duplicates from the wire; they are made harmless at the receiver. The idempotent-consumer pattern on microservices.io does it with a PROCESSED_MESSAGE table whose primary key is (subscriberId, messageID). The handler inserts the message ID in the same transaction as its business update; for a repeat, the insert fails and the handler rolls back and ignores the message. Kafka's idempotent producer is the same trick inside the broker: each producer gets an ID and sends sequence numbers, and the broker drops repeats.\n\nIn an interview, say \"effectively once\", and name where the dedup record lives. Without that, \"exactly-once\" is a claim with no mechanism behind it.",
  [
   "kafka-design",
   "microservices-io-idempotent-consumer"
  ]
 ],
 [
  "The test is whether the operation reads the current state to compute the new one. \"Set status = shipped\" ignores what was there: run it once or five times and the row ends as shipped. \"balance = balance - 10\" depends on the previous value, so each repeat moves it again: 100 becomes 90, then 80. The microservices.io pattern page gives the same example, a consumer of an AccountDebited message that subtracts the amount from the current balance and ends with the wrong balance when the message repeats.\n\nThree ways to turn a relative change into an absolute one. Send the result instead of the delta (\"balance = 90\"). Guard it with a version (\"... WHERE version = 3\"), so a second run matches zero rows. Or key the write by identity: Kafka's design notes observe that when messages carry a primary key, receiving one twice just overwrites the record with another copy of itself.\n\nWhy prefer this over idempotency keys where you can: there is no key table to store, expire or race on. The limit is that some operations are deltas by nature, such as appending to a log, adding a ledger row or charging a card. Those need a key.",
  [
   "microservices-io-idempotent-consumer",
   "kafka-design"
  ]
 ]
];
SD.deep["0C.1"] = [
 [
  "Each of the four boxes has one job. The client originates requests. The load balancer spreads them over several copies of the service. The service runs the logic and remembers nothing between requests. The database remembers everything. That is enough to make any create-and-read feature work, which is the bar for a first diagram.\n\nThe reason to start there is that a simple design that works can be improved, while a sophisticated one that is unfinished cannot be assessed. Hello Interview says it is incredibly common for candidates to layer on complexity too early and never arrive at a complete solution. Its advice: build a relatively simple design that meets the core functional requirements, and when you spot a place for a cache or a queue, note it with a quick verbal callout and move on. The complexity belongs in the deep dives, where it answers a non-functional requirement.\n\nIts own Twitter walkthrough ends the high-level design with a system it calls woefully inefficient at fetching feeds, and treats that as fine: that is what the deep dive iterates on. The staff-level article says the same: start as basic as possible and acknowledge it may be deficient in places.",
  [
   "hi-delivery",
   "hi-staff"
  ]
 ],
 [
  "Tracing means taking one requirement and following a single request along the arrows, saying at each box what it does and what gets stored. Hello Interview's instruction is to be explicit about how data flows and what state changes with each request, starting from the API request and ending with the response, and it suggests building the diagram up one endpoint at a time.\n\nUsing its Twitter API: POST /v1/tweets goes client, load balancer, service, and the service inserts a Tweet row. Traceable. POST /v1/follows inserts a Follow row. Now GET /v1/feed: the service must find whom the user follows, then fetch those users' recent tweets. The path exists, and tracing it has also exposed that this read touches two tables and many rows per request, which is the weak spot to return to later.\n\nA trace fails in two recognisable ways: the request reaches a box that has no way to answer (nothing stores follows), or you cannot say which arrow comes next. Either one names the missing piece. ByteByteGo recommends the same exercise, going through a few concrete use cases, because it helps you discover edge cases you had not considered.",
  [
   "hi-delivery",
   "bbg-framework"
  ]
 ],
 [
  "Every component fixes one problem and brings a cost of its own, so each has a condition under which it is worth having.\n\nA cache pays when the same answers are requested repeatedly. Amazon's Builders' Library gives the test: data is a good candidate if the cache would have a good hit ratio across requests; if each request needs a unique result, the hit rate is negligible and the cache does no good. The cost is that cached data necessarily grows inconsistent with the source over time.\n\nA queue pays when load arrives in bursts or the work is slow. Microsoft's load-levelling pattern uses it as a buffer so the service handles messages at its own pace, and says when not to: when the caller requires a low-latency synchronous response, or when volume is predictably low and stable so the queue only adds complexity.\n\nA CDN pays for static assets such as images, video and JavaScript, served from edge locations close to users.\n\nSo the sentence that introduces a box should contain its trigger: \"reads are 100 to 1 and repeat, so a cache\". If you cannot name the trigger, leave the box out.",
  [
   "aws-bl-caching",
   "azure-queue-load-leveling",
   "hi-core-concepts"
  ]
 ],
 [
  "Stateless means a server process keeps nothing between requests that another process would need. The Twelve-Factor App states it as: processes are stateless and share-nothing, and any data that needs to persist must be stored in a stateful backing service, typically a database. Local memory may be used only as a brief, single-transaction cache.\n\nThe payoff is interchangeability. If any instance can serve any request, the load balancer can send each request anywhere, adding capacity is just starting more instances, and losing one loses no data. The counter-example: a login session held in server A's memory. The next request lands on server B and the user is logged out. Twelve-Factor gives both reasons this happens: with many processes running, a future request will likely be served by a different one, and a restart from a deploy or config change wipes local state anyway.\n\nThe tempting patch is sticky sessions, routing each visitor back to the same process. Twelve-Factor calls that a violation that should never be relied upon, and says session data belongs in a datastore with time-expiration such as Memcached or Redis. Expect the follow-up \"where does the session live?\".",
  [
   "12factor-processes"
  ]
 ],
 [
  "An arrow is a contract between two boxes, and the label states its terms: what is sent, by which protocol, and whether the sender waits.\n\nTake one arrow from a signup service to an email sender. Labelled \"HTTP, synchronous\", it means signup waits for the email call, so signup's response time includes it, and when the email system is down signup fails too. AWS's Well-Architected guidance calls that a hard dependency and gives the arithmetic: availability is the product of the parts, so a system designed for 99.99% with hard dependencies on two others at 99.99% can achieve 99.97%. Labelled \"queue, asynchronous\", the same arrow means signup returns at once. Microsoft's queue pattern states the property: tasks are not delayed if the service is unavailable when they post messages.\n\nThe async label creates its own questions, which is why it must be visible. The same pattern notes that queues are one-way: if the sender expects a reply, you need a separate mechanism to deliver it.\n\nTwo diagrams with identical boxes can therefore behave completely differently, and the interviewer's best questions sit on the arrows: who waits here, and what happens when the far end is down?",
  [
   "aws-wa-availability",
   "azure-queue-load-leveling"
  ]
 ]
];
SD.deep["0C.2"] = [
 [
  "The two families do their work at different moments. A relational database reshapes data when the query runs: it joins tables to assemble whatever answer you ask for. AWS's DynamoDB guide puts the trade as: in a relational system data can be queried flexibly, but queries are relatively expensive and do not scale well under high traffic; in a NoSQL database data can be queried efficiently in a limited number of ways, outside of which queries can be expensive and slow. A NoSQL store instead keeps data already in the shape the query will want.\n\nThat is why the order of design flips. For a relational database, the guide says, you can create a normalised model without thinking about access patterns and extend it when new questions arise. For DynamoDB you should not start the schema until you know the questions it must answer. Cassandra's documentation gives the mechanical reason: joins are not supported, so all the fields a query needs must sit together in one table.\n\nThink of a kitchen with a cook versus a vending machine. The cook can make anything from raw ingredients, slowly. The machine is instant, but only for what was loaded into its slots.",
  [
   "aws-dynamodb-nosql-design",
   "cassandra-data-modeling"
  ]
 ],
 [
  "In a partitioned store the key is the address of the data, so a query that names the key goes straight to it, and a query that does not has to search everywhere.\n\nCassandra's documentation describes two parts. The first component of the primary key is hashed to give the partition key, which decides which node holds the data. The remaining components are clustering keys, which sort rows within the partition. Discord's engineers call this a KKV store and suggest thinking of a partition as an ordered dictionary. In Python terms: store[channel_id] is a list kept sorted by message_id.\n\nDiscord's main query is \"load messages for a channel\". Since all queries operate on a channel, channel_id became the partition key. For the sort key they rejected created_at because two messages can have the same creation time, and used the message ID, which at Discord is a chronologically sortable Snowflake. With the key (channel_id, message_id) they could tell Cassandra exactly where to range scan.\n\nSo for each query, say the sentence \"this looks up by X and reads in order of Y\". X and Y are the key. If no such sentence fits, the store cannot serve that query cheaply.",
  [
   "cassandra-data-modeling",
   "discord-billions-messages"
  ]
 ],
 [
  "Two things make it the safe starting point.\n\nFirst, transactions. PostgreSQL's tutorial defines one as bundling multiple steps into a single all-or-nothing operation. Its example is a $100 payment from Alice to Bob that takes several UPDATE statements across account and branch balances. Without a transaction, a crash midway could debit Alice and never credit Bob. Inside one, either every update happens or none does, and other transactions never see the half-finished state. If your design has any \"these rows must change together\" rule, this is the feature that enforces it.\n\nSecond, you do not need to know every query in advance. AWS's own DynamoDB guide says that for a relational database you can create a normalised model without thinking about access patterns and extend it later when new questions arise.\n\nThe usual objection is scale, and it is often premature. Hello Interview's Core Concepts page says a well-tuned single database with read replicas handles far more than most candidates think, and that 10K writes per second with 100 GB of data does not need sharding. Its staff-level model answer is: Postgres, because I need transactions across tables and durability.",
  [
   "pg-tutorial-transactions",
   "aws-dynamodb-nosql-design",
   "hi-core-concepts",
   "hi-staff"
  ]
 ],
 [
  "These stores scale because the key decides the machine. Cassandra hashes the partition key and uses a variant of consistent hashing to spread partitions over the nodes, so a lookup by key goes to the node that owns it however large the cluster is, and capacity grows by adding nodes. The price is the other half of the sentence: a query that cannot name a partition key has no single place to go. Cassandra's guidance is to keep the number of partitions a query reads to a minimum, because each may sit on a different node.\n\nTwo things go wrong in practice, and Discord met one of them. Partitioned by channel alone, a busy channel's partition grew without limit; Cassandra logged warnings for partitions over 100 MB, and large partitions cannot be spread around the cluster. Their fix was a time bucket of about ten days in the key: ((channel_id, bucket), message_id). The cost: a rarely active channel has to query several buckets to collect enough messages.\n\nThe other is hot spots. AWS's DynamoDB guide says to design keys so traffic is distributed evenly across partitions. One celebrity key can overload a partition while the rest sit idle.",
  [
   "cassandra-data-modeling",
   "discord-billions-messages",
   "aws-dynamodb-nosql-design"
  ]
 ],
 [
  "Normalised means each fact is stored once and reads join the pieces together. Denormalised means the fact is copied into every place a read needs it, so the read is a single lookup. Cassandra's documentation is direct about the bargain: since each query is backed by a table, data is duplicated across multiple tables, and data duplication and a high write throughput are used to achieve a high read performance.\n\nIts magazine example: one query lists magazine names with their publication frequency, another lists magazines by publisher. That becomes two tables holding the same magazines, one keyed by id and one keyed by publisher.\n\nFor chat, \"latest messages in a channel\" and \"a user's recent messages\" would be two tables, and every message is written twice. The arithmetic favours it when reads dominate: at 100 reads per write, one extra write buys 100 reads that skip a scan or a join.\n\nThe cost is what \"deliberately\" refers to. An edit or delete must reach every copy, and Cassandra has no foreign keys or relational integrity to enforce that for you. If the second write fails, the copies disagree. So say which copy is the source of truth.",
  [
   "cassandra-data-modeling"
  ]
 ]
];
SD.deep["0C.3"] = [
 [
  "Reads and writes ask different things of a system. A read wants an answer quickly and usually tolerates one that is slightly out of date. A write must not be lost, has to reach every copy of the data, and can often take longer. They also arrive at very different rates.\n\nTwitter in 2013, as summarised by High Scalability from an engineering talk: 300K requests a second were spent reading timelines and only 6,000 a second on writes, 50 to 1. The site is described as primarily a consumption mechanism. The home-timeline read path took tens of milliseconds, while delivering a tweet to followers was something Twitter tried to do in under five seconds.\n\nWith numbers that far apart, one design cannot be best for both, so you draw two paths and tune each. ByteByteGo's news-feed example does this from the first sketch: the design is divided into a feed-publishing flow and a feed-building flow.\n\nA single arrow labelled \"CRUD\" hides all of that. Splitting it forces the useful questions: what does a read touch, what does a write touch, and which of the two is this system mostly made of?",
  [
   "highscalability-twitter-timelines",
   "bbg-framework"
  ]
 ],
 [
  "All four tools are the same trick: answer the read from a copy that is cheaper to reach than the source of truth. They differ in what is copied and where it sits.\n\nA cache copies individual answers into memory. It works when answers are reused across requests, which Amazon's Builders' Library calls a good hit ratio. A read replica copies the whole database: Amazon RDS describes it as a read-only copy that you route queries to in order to reduce load on the primary, with updates copied to it asynchronously. A CDN copies static files such as images and video to edge locations near users. A precomputed view copies data into the exact shape one query needs. Twitter's home timeline is the example: a ready-made list sitting in a Redis cluster, capped at 800 entries.\n\nBecause every one is a copy, every one can be stale. The Builders' Library says cached data necessarily grows inconsistent with the source over time, and a common expiry policy gives each entry a time to live chosen by how much staleness clients tolerate. Asynchronous replication means a replica can trail the primary.\n\nThe follow-up for each box: how stale may this be?",
  [
   "aws-bl-caching",
   "aws-rds-read-replicas",
   "hi-core-concepts",
   "highscalability-twitter-timelines"
  ]
 ],
 [
  "Write-path tools share one idea: do as little as possible at the moment of the write, and defer or spread the rest.\n\nLog-structured (LSM) storage defers. Cassandra's documentation lists the steps: record the write in an append-only commit log on disk, put it in an in-memory table (the memtable), later flush that to immutable sorted files on disk (SSTables). Appending needs no lookup of existing data, which the docs describe as a write path free of read lookups. The bill arrives later. Background compaction merges those files, so every write is re-written multiple times (write amplification), and reads cost more, which Cassandra offsets with Bloom filters.\n\nA queue defers at a larger scale. Microsoft's load-levelling pattern places it as a buffer so the downstream service handles messages at its own pace, even when producers send a burst. Batching follows naturally: a consumer can take many messages and write them together.\n\nSharding spreads. Read replicas do not help writes, because every replica must apply every write. Hello Interview's Core Concepts page lists write throughput limits, in the tens of thousands of writes per second, as one of the reasons to split data across independent servers.",
  [
   "cassandra-storage-engine",
   "azure-queue-load-leveling",
   "hi-core-concepts"
  ]
 ],
 [
  "Put numbers on it. Suppose a read costs 10 ms of database work and a write costs 5 ms. With 100 reads per write, one cycle of traffic costs 100 × 10 + 5 = 1,005 ms.\n\nNow precompute the answer at write time. The write becomes ten times dearer, 50 ms, because it also updates the stored result. Each read becomes a 1 ms lookup. The cycle costs 100 × 1 + 50 = 150 ms. Total work fell nearly sevenfold, even though the write got much worse, because the expensive step now runs once instead of a hundred times.\n\nFlip the ratio to 100 writes per read and the same change is a disaster: the original design costs 10 + 100 × 5 = 510 ms, the precomputing one costs 1 + 100 × 50 = 5,001 ms. Ten times worse.\n\nSo the ratio is the multiplier on each side of the trade. Total cost is reads × cost per read + writes × cost per write, and you shrink whichever term is larger, accepting that the other grows. That is why the read:write ratio is one of the first numbers to ask for.",
  "calc"
 ],
 [
  "The slow way to build a home timeline is at read time: look up everyone the user follows, fetch their recent posts, merge and sort. High Scalability's account of Twitter calls this naive materialisation, a massive select over all of Twitter, and says it was tried and died.\n\nThe replacement is fan-out on write. When a tweet arrives, the system works out where it should go and inserts it into the stored timeline of each follower. That is an O(n) job, where n is the follower count, writing into Redis. Reading is then a matter of finding the right Redis machine and returning the list. Their summary: don't do any computation on reads.\n\nWhere it bites is large n. Lady Gaga had 31 million followers, and a tweet could take up to five minutes to reach them all. One consequence was replies arriving before the tweet they answered. Twitter's adjustment was to stop fanning out for such accounts and merge their tweets in at read time, which the article says saves tens of percent of computational resources.\n\nHence the standard answer: push for ordinary accounts, pull for the few huge ones.",
  [
   "highscalability-twitter-timelines"
  ]
 ]
];
SD.deep["0C.4"] = [
 [
  "In a synchronous call the caller sends a request and blocks until the reply comes back. Two things follow. The caller's response time includes the callee's, so a chain of synchronous calls adds up. And the caller is only up when the callee is: AWS's Well-Architected guidance calls this a hard dependency, where an interruption in the dependent system directly translates to an interruption of the invoking system, and availability becomes the product of the parts. Its example: a system designed for 99.99% with hard dependencies on two others at 99.99% can achieve 99.97%.\n\nSo a synchronous step is one you are willing to pay for in both latency and availability. The test is whether the next thing the user sees depends on the result. Payment authorisation passes: you cannot show \"order confirmed\" without knowing the card was accepted. Reading a profile passes: the page is the result. Sending the receipt email fails the test: the confirmation page looks the same whether the email has left or not.\n\nMicrosoft's queue pattern gives the same boundary from the other side, listing \"the caller requires a low-latency, synchronous response\" as a case where a queue might not be suitable.",
  [
   "aws-wa-availability",
   "azure-queue-load-leveling"
  ]
 ],
 [
  "The mechanics are three steps. The service writes a message describing the work to a queue and replies to the user straight away. A separate worker later asks the queue for messages, does the work, and deletes each message once it is done; that is how Amazon's Builders' Library describes queue-based systems. The user's request finished back at step one.\n\nHTTP has a status code for that first reply: 202 Accepted, meaning the request has been accepted for processing but the processing has not been completed. The RFC calls it intentionally noncommittal, since the work might still fail later, and says the response ought to describe the current status and point to a status monitor. It also notes HTTP has no facility for re-sending a status code from an asynchronous operation. Microsoft's queue pattern makes the same point: message queues are one-way, so a reply needs its own mechanism. The client must poll a status URL or be notified some other way.\n\nExample: a video upload that takes four minutes to transcode. Return 202 with a job URL, transcode from the queue, notify when ready. Holding one HTTP connection open for four minutes is the alternative, and any timeout along the path breaks it.",
  [
   "aws-bl-queue-backlogs",
   "rfc9110",
   "azure-queue-load-leveling"
  ]
 ],
 [
  "The benefits come from the buffer. Microsoft's load-levelling pattern: the queue lets the service handle messages at its own pace even when producers send a burst, so you need enough instances for the average load, not the peak; and producers can keep posting when the service is down, which is the failure isolation.\n\nThe buffer has a limit, stated in the same pattern: if the average producer rate exceeds the consumer rate, the queue keeps growing and latency increases. Jobs arriving at 1,200 a second against 1,000 processed leaves 200 a second unprocessed, 720,000 after an hour.\n\nAmazon's Builders' Library describes the cost as two modes. With no backlog, latency is low. Once arrivals exceed processing, end-to-end latency grows and it can take a long time to return to the fast mode. Its example: after an hour-long outage, catching up takes double the system's capacity for another hour. Synchronous services drop requests during an outage but recover faster.\n\nEventual consistency and harder debugging follow from the delay. The user has been told \"accepted\" while the work is pending, so reads may not show it yet, and a failure happens later, in another process, with no user waiting to see the error.",
  [
   "azure-queue-load-leveling",
   "aws-bl-queue-backlogs"
  ]
 ],
 [
  "Duplicates are built into queues. Amazon SQS explains one cause: it stores copies of a message on several servers, and if one is unavailable when you delete the message, that copy survives and can be delivered again. A second cause is the worker: if it crashes after doing the work but before deleting the message, the queue cannot tell and hands the message out again. This is \"at-least-once\" delivery, and SQS's advice is to make applications idempotent, meaning not adversely affected by processing the same message more than once.\n\nThe usual technique is an operation ID. Stripe's description: the client generates a unique ID for the operation and sends it with the request; the server correlates the ID with the state of that request, so a retry with the same ID does not repeat the effect. A worker charging a card passes the message's ID as that key.\n\nRetries need a stopping rule, because a malformed message fails every time. Microsoft's pattern warns that such messages otherwise cycle indefinitely. In SQS the rule is maxReceiveCount: the number of times a message can be received before it is moved to a dead-letter queue, where it can be inspected. Alarm on that queue.",
  [
   "aws-sqs-at-least-once",
   "stripe-blog-idempotency",
   "aws-sqs-dlq",
   "azure-queue-load-leveling"
  ]
 ],
 [
  "Suppose checkout has five steps with these invented but plausible timings: authorise the card 300 ms, reserve inventory 50 ms, send the confirmation email 400 ms, render the invoice PDF 800 ms, update analytics 50 ms.\n\nAll synchronous: the user waits 1,600 ms, and the order fails if any of five systems is down. If each is 99.9% available, that is 0.999^5 ≈ 99.5%, about 44 hours a year of failed checkouts.\n\nMinimum synchronous: authorise and reserve, 350 ms, then reply with the order ID and queue the other three. Availability of the reply is 0.999² ≈ 99.8% (ignoring the queue itself), about 17.5 hours a year, and an email outage now delays emails without blocking orders.\n\nThe dividing question for each step is: if this has not happened yet, is the response I am about to send wrong? \"Order confirmed\" is wrong without the authorisation and the stock. It is not wrong without the PDF.\n\nThe rule cuts the other way too. If the user needs the result on the next screen, queueing it only forces the client to poll for something you could have returned. Async is for work whose result the response does not contain.",
  "calc"
 ]
];
SD.deep["0D.1"] = [
 [
  "A request is not the same size at every hop. One page load may become three service calls and ten queries (fan-out), while a cache may answer most reads before they reach the database (absorption). So you cannot read the bottleneck off the headline QPS; you have to carry the number through the diagram and recompute it at each box.\n\nBrendan Gregg's USE method is the production version of the same walk: for every resource check utilisation (how busy it is), saturation (work it cannot service yet, usually a queue) and errors. He suggests drawing a block diagram and writing each link's maximum bandwidth on it, which can expose a bottleneck before a single measurement is taken. That is exactly what you do on a whiteboard.\n\nExample: 10k requests/s reach the app tier; each makes 3 reads, so 30k reads/s; a cache with a 90% hit rate passes 3k/s to the database. The database sees 3k, not 10k and not 30k. Interviewers probe whether you tracked that.",
  [
   "gregg-use-method"
  ]
 ],
 [
  "In a chain of hops, end-to-end throughput is the minimum of the hop capacities, not the sum or the average. Headroom is capacity divided by arriving load: above 1 the hop keeps up, below 1 it falls behind and a queue grows.\n\nTake app tier 20k/s, cache 100k/s, database 6k/s, with 7k/s of queries reaching the database. Headroom is 6/7, about 0.86, so 1k queries a second pile up or get rejected. Double the app tier to 40k/s and the database still completes 6k/s; you paid for servers and the user sees no change. Make the app tier faster and it is actually worse: requests now reach the narrow point sooner and the queue there grows faster. That is the motorway narrowing to one lane: widening the four-lane stretch only delivers cars to the jam more quickly.\n\nWhere it bites: \"we added servers and nothing improved\" is the classic symptom of having scaled something upstream of the constraint. The follow-up question is always \"how do you know that hop is the limit?\", which is answered by the per-hop numbers.",
  "calc"
 ],
 [
  "A stateless process keeps nothing between requests that another copy would need. The Twelve-Factor App states the rule: processes are stateless and share-nothing, and anything that must persist goes into a stateful backing service, typically a database. Because any copy can serve any request, adding copies is, in its words, a simple and reliable operation. That is why the app tier is rarely the interesting part.\n\nThe cost is that all the state has been pushed into one place. A second database server is not just another copy: it needs the data, and the copies must stay in agreement. Microsoft's sharding guidance lists what a data store on a single server runs out of: storage space, computing resources and network bandwidth. Scaling up only postpones those limits temporarily.\n\nAnalogy: hiring more cashiers is easy because any cashier can serve any customer; there is still one stockroom they all walk to. In an interview, expect \"what did you do with the session?\" If sessions live in app-server memory, the tier is not really stateless, and the usual fix is to move them to a store such as Redis or Memcached.",
  [
   "12factor-processes",
   "12factor-concurrency",
   "azure-sharding"
  ]
 ],
 [
  "A capacity argument has three parts: a load figure derived from the requirements, a capacity figure for one unit, and the ratio. 60k read QPS against a primary assumed to serve 20k is a ratio of 3: the primary would need to be three times bigger, or two-thirds of the reads must go elsewhere. That one division tells you the size of fix required, which \"the DB might be slow\" never can.\n\nThe 20k is the weak number, and saying so is a strength. Real capacity depends on the query mix, indexes and hardware, so you label it an assumption and show the conclusion survives if it is wrong by 2x: at 40k the load is still 1.5 times capacity.\n\nDo not plan to run at 100%. Gregg notes that high utilisation, beyond roughly 70%, can already be a problem, because an average over minutes hides short bursts at 100%; his example is a customer with CPU latency problems whose five-minute averages never exceeded 80%. Sizing to 70% gives 60k / (20k x 0.7) = 4.3, so five units of that capacity, not three.",
  [
   "gregg-use-method"
  ]
 ],
 [
  "Removing a constraint does not remove constraints; it promotes the second-weakest hop. Continue the earlier example: reads were 60k/s against one primary, so you add a cache and read replicas. Reads are now fine. But every write still lands on the single primary, so if writes are 3k/s against a primary that handles about 1k of them, that is the new limit, and replicas did nothing for it. Fix writes by partitioning and the next candidates are things you just introduced: cache memory for the hot set, or queries that now span partitions.\n\nGregg makes the same point about real investigations: a system can have more than one performance problem, so the first one you find may be a problem but not the problem, and you keep iterating over the remaining resources.\n\nIn an interview this is what the wrap-up is for. ByteByteGo's framework says the interviewer may ask you to identify bottlenecks and potential improvements, and warns never to claim the design is perfect. Hello Interview expects senior candidates to recognise limitations in their own design proactively. Naming the next bottleneck, with its number, does both.",
  [
   "gregg-use-method",
   "bbg-framework",
   "hi-levels"
  ]
 ]
];
SD.deep["0D.2"] = [
 [
  "The three questions map onto three different failure classes, each needing a different defence. Dead is fail-stop: the component is either correct or stopped. Redundancy and a health check handle it, because a stopped thing is easy to see.\n\nSlow is what a Microsoft paper calls gray failure: failures subtle enough to defy quick, definitive detection, such as severe performance degradation, random packet loss or flaky I/O. Their defining trait is that different observers disagree. If the request-handling path is stuck but the heartbeat still answers, the failure detector sees a healthy system while clients see a failed one.\n\nWrong is the nastiest. An AWS engineer describes a bug that made a few web servers return blank error pages. They did it much faster than healthy servers rendered real pages, and the load balancer favoured fast servers, so the broken ones attracted a disproportionate share of traffic: a \"black hole\".\n\nSo for each box you are really asking: who notices, how quickly, and what do callers do meanwhile? Asking only the first question is how designs end up with redundancy and nothing else.",
  [
   "gray-failure-hotos17",
   "aws-bl-health-checks"
  ]
 ],
 [
  "The mechanism is that waiting is not free. While a caller waits for a reply it holds a thread, a connection and memory, and those pools are finite. A refused connection returns in milliseconds and frees everything; a call that hangs keeps them until the timeout.\n\nGoogle's SRE book works an example. A frontend has 10 servers with 100 worker threads each, 1,000 threads in total. At 1,000 QPS and 100 ms per request, about 100 threads are busy. Now 5% of requests never complete, and the deadline is 100 seconds. Those 50 requests a second each hold a thread for 100 s, which is 5,000 threads' worth of work, five times what exists. The frontend can serve only about 19.6% of requests: a fault touching 5% of traffic produces an 80.4% error rate.\n\nHence the fixes: set a deadline on every remote call, and fail fast when a backend is known to be unavailable rather than waiting. The AWS guidance adds the tuning problem: a timeout set too high is nearly useless because resources are still held while you wait; too low and healthy-but-slow requests get retried, adding load.",
  [
   "sre-cascading-failures",
   "aws-bl-timeouts-retries"
  ]
 ],
 [
  "Blast radius is set by what is shared. If every request passes through one pool, one deployment or one database, a fault there reaches everyone. You shrink it by making the shared thing smaller.\n\nCells do this at the level of the whole workload. AWS describes a cell-based architecture as multiple isolated instances of the workload, each independent, sharing no state with the others and serving a subset of requests, with a thin router in front. Its arithmetic: with 10 cells, a failure in one, such as a bad software update, leaves 90% of requests unaffected.\n\nBulkheads do it inside one process. Microsoft's example: a consumer calls several services through one connection pool; one service stops responding, the pool fills with waiting calls, and the consumer can no longer call the healthy services either. Give each downstream service its own pool and only that pool is exhausted. The name comes from a ship's hull, where only the damaged section floods.\n\nThe trade-off interviewers want: isolation costs capacity and operations, since each cell or pool needs its own headroom, and the cell router itself becomes something that must stay simple.",
  [
   "aws-wa-cell-based",
   "azure-bulkhead"
  ]
 ],
 [
  "A spare only removes a single point of failure if something notices the failure and moves traffic. For stateless servers the load balancer does this: it health-checks each backend and stops routing to one that has crashed. For a database it is harder, because the standby must also have the data. Amazon RDS, for example, copies updates to a read replica asynchronously, and the replica can be promoted to a standalone instance if the primary fails.\n\nFailover time is a sum you can state: detection, plus promotion, plus clients finding the new primary. If health checks run every 10 s and three must fail, detection alone is 30 s; add, say, 60 s to promote and 30 s for clients to reconnect and you are at two minutes of write downtime. Those figures are assumptions for illustration, but the structure is what the interviewer is checking.\n\nThe tension is in detection. Check aggressively and a brief slowdown triggers a failover you did not need; AWS notes that automation reacting to health checks needs enough thresholding to avoid drastic action on a false positive. Because replication is asynchronous, writes the replica had not received are lost on promotion.",
  [
   "hi-networking",
   "aws-rds-read-replicas",
   "aws-bl-health-checks"
  ]
 ],
 [
  "Degrading means deciding in advance which parts of a response are optional and what cheaper substitute you serve when they are unavailable or you are overloaded. Google's SRE book describes it as going one step beyond load shedding: instead of dropping requests, you reduce the work each one needs by lowering response quality. Its example is a search service that, under overload, searches only a subset of data held in an in-memory cache rather than the full on-disk database, or switches to a less accurate but faster ranking algorithm.\n\nIn a design that becomes a per-dependency fallback: recommendations time out, show a cached popular list; reviews are down, render the page without them.\n\nWhere it bites is that the fallback is code that almost never runs. The book's warning is that the code path you never use is the code path that often does not work, and it suggests regularly running a small subset of servers near overload to exercise it. It also says to keep degradation simple and easy to switch off, because a complicated mechanism can trip when you do not want it or feed back on itself.",
  [
   "sre-cascading-failures"
  ]
 ],
 [
  "Both are budgets set by the business, and each one constrains a different part of the design. RPO looks backwards from the incident: how old is the newest copy of the data you can recover? It is governed by how often data leaves the primary. Nightly backups mean up to 24 hours of writes can be lost; asynchronous replication that lags by up to 30 seconds means up to 30 seconds; only synchronous replication gets close to zero, and you pay for it in write latency.\n\nRTO looks forwards: how long until service is back? It is governed by detection plus recovery. Restoring a large backup onto a new machine may take hours; promoting a warm replica takes minutes.\n\nSo the numbers pick the architecture. \"RPO 24 h, RTO 4 h\" is satisfied by backups. \"RPO 30 s, RTO 5 min\" needs a live replica and automated failover.\n\nAWS's Well-Architected guidance adds a distinction worth knowing: RTO resembles MTTR, since both measure time from outage to recovery, but MTTR is a mean over several events while RTO is the maximum allowed for a single event. Meeting your RTO on average is not meeting it.",
  [
   "aws-wa-dr-objectives"
  ]
 ]
];
SD.deep["0D.3"] = [
 [
  "Scaling up means giving the same single database or server more CPU, memory, disk and network. Nothing about the application changes: one copy of the data, one place to run a transaction, ordinary queries. Microsoft's sharding guidance says as much: if data volume and throughput fit in one instance, vertical scaling preserves query simplicity and transactional integrity. That is why it is the right first move, not a naive one.\n\nThe ceiling is physical. The same guidance lists what one server runs out of: disk you can keep adding until you cannot, processors and memory you can upgrade until there is no bigger option, and a network connection with finite capacity. Scaling up, it says, only postpones those limits temporarily. The Twelve-Factor App makes the same point about processes: an individual VM can only grow so large.\n\n\"Still one machine\" is a separate problem from the ceiling. A server four times the size holds four times the load but is exactly as likely to be down, and when it is, everything is. So in an interview pair the two statements: vertical buys time on capacity, and you still need a replica for availability.",
  [
   "azure-sharding",
   "12factor-concurrency"
  ]
 ],
 [
  "Adding machines works when any machine can take any request. That requires the processes to hold no state of their own: the Twelve-Factor App calls this stateless and share-nothing, with anything persistent kept in a backing service, and says scaling out is then a simple and reliable operation.\n\nThe catch is that the machines are share-nothing but their dependencies are not. Suppose each app server keeps a pool of 20 database connections. Ten servers open 200 connections; fifty open 1,000, and every one of them can send work to the same primary. You scaled the tier that was fine and multiplied the pressure on the tier that was not. Microsoft's queue guidance puts it bluntly for worker fleets: autoscaling without bounding the consumers' aggregate downstream rate only moves the overload to downstream dependencies.\n\nFor a stateful tier, adding a machine is not enough because a new machine starts empty. Either it holds a copy of all the data, which is replication and helps reads, or it holds a slice of the data, which is partitioning and helps writes and size. Those are the next two tools, and they are separate decisions.",
  [
   "12factor-processes",
   "12factor-concurrency",
   "azure-queue-load-leveling"
  ]
 ],
 [
  "A cache pays off in proportion to its hit rate, and the arithmetic is unforgiving. If a fraction h of reads are answered from the cache, the origin sees (1 - h) of the load. At 90% it sees a tenth; at 99% a hundredth. Run it backwards: a drop from 99% to 98% doubles origin load, and an empty cache sends everything.\n\nThe hit rate comes from the workload, not from the cache. Amazon's Builders' Library says data is a good candidate when results can be reused across requests; if each request needs a unique query with unique results, the hit rate is negligible and the cache does no good. Its second test is staleness: cached data necessarily grows inconsistent with the source over time, so the service and its clients must tolerate that. Data that changes as often as it is read fails this test.\n\nWhere it bites: the same article describes services becoming \"addicted\" to their cache. The database is scaled down because the cache absorbs the load; then the cache goes cold or fails and the full traffic lands on a backend no longer sized for it.",
  [
   "aws-bl-caching"
  ]
 ],
 [
  "A read replica is a second database server that receives every change made on the primary and applies it, so it holds the same data and can answer queries. Amazon RDS describes the arrangement directly: updates on the primary are copied asynchronously to the replica; clients have read/write access to the primary and read-only access to the replica. Because a replica is a full database, it can run any query, which is what separates it from a cache. RDS lists business reporting as a use: point the heavy queries at a replica instead of production.\n\nTwo consequences follow from that mechanism. First, asynchronous means the replica is slightly behind, so a user who saves and immediately reloads may be shown the old value unless you send that read to the primary.\n\nSecond, writes are not spread at all. With 3k writes/s, the primary does 3k and each replica must also apply those 3k just to keep up. Five replicas multiply read capacity and leave write capacity exactly where it was. If your numbers show writes are the constraint, replicas are the wrong tool, and saying so is the point of this key idea.",
  [
   "aws-rds-read-replicas"
  ]
 ],
 [
  "Sharding splits one dataset across several databases, each with the same schema but its own subset of the rows, chosen by a shard key. Writes for different keys now land on different machines, which is the one thing replicas cannot give you. Microsoft's guidance names the two triggers: total data exceeds what a single instance can store, or throughput exceeds a single instance and replicas do not help because write load is also high.\n\nThe expense is everything that used to be one query. A request that needs rows from several shards becomes a fan-out to each of them, and even run in parallel the slowest shard sets the latency. A transaction across shards needs a coordination protocol such as two-phase commit, which adds latency and failure modes, so most sharded systems drop cross-shard transactions and accept eventual consistency. Skew builds up over time, and rebalancing moves data between shards, often with downtime or reduced throughput.\n\nThe same guidance calls this substantial and permanent complexity, lasting the system's lifetime. Hence the interview order: show the numbers that rule out indexes, caching, replicas and a bigger machine, then pick the shard key so most requests hit a single shard.",
  [
   "azure-sharding"
  ]
 ],
 [
  "A queue separates accepting work from doing it. Producers append messages; workers take them at whatever rate they can sustain. Microsoft's description of the pattern is that the service handles messages at its own pace even when many tasks arrive at once, so you need only enough instances for the average load, not the peak.\n\nWork an example. Uploads spike to 1,000 jobs/s for 60 seconds, then go quiet; your workers process 200 jobs/s. During the spike 60,000 jobs arrive and 12,000 are done, leaving 48,000 queued, which drain in 48,000 / 200 = 240 seconds. Nothing was dropped; the cost is that the last job waited about four minutes. Without the queue you would need five times the workers, idle most of the day.\n\nThe same example shows the limit. A queue moves work in time; it adds no capacity. If arrivals average more than 200/s, the backlog grows without end, and the guidance says exactly this: when the average producer rate exceeds the consumer rate the queue keeps growing and latency rises. It also lists a case where the pattern does not fit: the caller needs a low-latency, synchronous response.",
  [
   "azure-queue-load-leveling"
  ]
 ]
];
SD.deep["0D.4"] = [
 [
  "A node cannot observe a partition; it can only observe that a reply has not arrived. Brewer's later account of CAP makes this the operational core: the theorem plays out during a timeout, when the program must make \"the partition decision\": cancel the operation, which lowers availability, or proceed, which risks inconsistency. Retrying only postpones the decision, and retrying for ever is choosing consistency. A partition, pragmatically, is a time bound on communication.\n\nConcretely: a primary must confirm a write with a replica before acknowledging. The replica does not answer within 500 ms. Either return an error to the user (C) or acknowledge a write only one copy has (A). There is no third move, and how long you wait before deciding is your own design parameter.\n\nWhen the network is healthy the reply does arrive, so you get both, which is why Brewer says there is little reason to forfeit either outside a partition. But you still waited for it. Vogels' quorum notation shows the cost: with two copies, synchronous replication is W=2, so every write waits for the slower copy; W=1 returns sooner and no longer guarantees consistent reads from the backup.",
  [
   "brewer-cap-twelve-years-later",
   "vogels-eventually-consistent"
  ]
 ],
 [
  "The useful question is not \"is this data important?\" but \"is there an invariant here, and can a violation be repaired afterwards?\" An invariant is a rule that must always hold: a balance never below zero, a seat sold once, a username owned by one person, a lock held by one process. Brewer's point is that during a partition one side cannot know what the other has done, so there is no way to tell whether an operation will break the invariant. If it must hold, the designer has to prohibit or modify the operations that could violate it.\n\nWhether refusal is really required depends on repair. Brewer's airline example: overbooking violates \"seats >= passengers\", and it is tolerated because customer service can compensate the passenger who loses a seat. A numbered concert seat sold twice has no such remedy. Those go on the consistency side.\n\nHe also notes what makes repair hard: the mistake has been externalised. Once you told the customer they have the seat, or the cash left the machine, you cannot quietly correct it. So in an interview, name the invariant, then say whether a compensating action exists.",
  [
   "brewer-cap-twelve-years-later"
  ]
 ],
 [
  "Availability wins where a refused or failed request costs more than a slightly wrong one, and where \"wrong\" can be put right later. The Dynamo paper is the canonical statement. Amazon's requirement was that an \"Add to Cart\" operation can never be forgotten or rejected, because rejecting customer updates gives a poor customer experience, so Dynamo was designed as an always-writeable store: it accepts the write on whichever replicas it can reach and sorts out disagreements at read time. Traditional stores do the opposite and reject a write if they cannot reach all, or a majority of, the replicas.\n\nDNS is the everyday example. Vogels calls it the most popular eventually consistent system: an update to a name spreads through a configured pattern plus time-controlled caches, and eventually every client sees it. For a while some resolvers hand out the old address, and the internet keeps working.\n\nThe term to use is the inconsistency window: the time between an update and the moment every observer is guaranteed to see it. A like count that is a few seconds behind harms nobody. The interviewer's follow-up is \"how stale, and who notices?\"; answer with the window and the user-visible effect.",
  [
   "dynamo-sosp07",
   "vogels-eventually-consistent"
  ]
 ],
 [
  "Calling a whole system CP or AP hides the fact that its operations have different invariants. Brewer says the consistency/availability choice can occur many times within one system at very fine granularity, and can vary by operation and even by the specific data or user.\n\nHis ATM walk-through shows the method. An ATM has three operations: deposit, withdraw, check balance. The invariant is that the balance stays at or above zero. Only withdraw can break it, so deposit and check balance can always run during a partition, and only withdraw needs special treatment. Even then the choice is not all-or-nothing: in stand-in mode the machine allows net withdrawals up to a limit k, which he suggests might be $200, and refuses beyond it. Availability is kept, and the possible loss is capped.\n\nApply the same three steps to a shop. List the operations: browse, add to cart, check out. Browse and add-to-cart break nothing if stale, so they stay available. Decrementing the last unit of stock can violate an invariant, so it must either refuse or run under a bound you can afford. That is a much stronger answer than a label for the system.",
  [
   "brewer-cap-twelve-years-later"
  ]
 ],
 [
  "If two replicas both accept writes while they cannot talk, they will hold different values for the same key when the partition heals, and something must decide the result. Choosing availability therefore commits you to a conflict rule.\n\nLast-write-wins keeps the value with the latest timestamp and discards the other. It needs no application code. Riak's documentation is frank about the price: timestamps are not a reliable resolution mechanism in distributed systems and always carry a risk of data loss, and LWW will necessarily drop some writes when updates are concurrent. Two people add different items to a shared cart during a partition; one item silently vanishes.\n\nThe alternative is to keep both versions and let the application combine them. Dynamo does this: when it cannot reconcile versions itself, it hands them to the client, and the cart service merges them, so an add is never lost. The cost is that deletions can be undone. Replica A has {book, lamp}; the user deletes lamp on A while replica B, still holding {book, lamp}, receives an add of pen. Taking the union gives {book, lamp, pen}: the lamp is back. Dynamo's authors state exactly this: deleted items can resurface.",
  [
   "riak-conflict-resolution",
   "dynamo-sosp07"
  ]
 ]
];
SD.deep["0D.5"] = [
 [
  "The four are chosen so that together they answer \"is the service doing its job, and is it about to stop?\" Google's SRE book defines each with a catch worth knowing.\n\nLatency is the time to service a request, but track successes and failures separately. An HTTP 500 caused by a lost database connection may return very quickly, so mixing errors into the latency figure makes a failing service look fast. Traffic is demand in a unit that fits the system: HTTP requests per second for a web service, concurrent sessions for streaming. Errors are requests that fail explicitly (a 500), implicitly (a 200 carrying the wrong content), or by policy: if you promised one-second responses, anything slower counts as an error. Saturation is how full the service is, measured on its most constrained resource; because many systems degrade before 100% utilisation, you need a target below it.\n\nThe first three describe now; saturation is the leading indicator, and the book includes predictions such as a disk that will fill in four hours. Its claim is modest and useful: measure these four, page when one is problematic, and the service is at least decently covered.",
  [
   "sre-monitoring"
  ]
 ],
 [
  "RED and USE are the same idea pointed at two different kinds of thing. A service handles requests, so you ask how many (Rate), how many fail (Errors) and how long they take (Duration). A resource such as a CPU, disk or connection pool does not have requests in that sense; it has capacity, so you ask how busy it is (Utilisation), how much work is waiting for it (Saturation, often a queue length) and whether it is faulting (Errors).\n\nTom Wilkie, who created RED, said plainly why he needed it: the USE method does not really apply to services; it applies to hardware, network, disks. He also noted that the golden signals are basically RED plus saturation.\n\nUsed together they form a drill-down. RED on every service tells you which one is unhealthy, and Wilkie's argument is that it is a good proxy for customer happiness: high error rate means failed page loads, high duration means a slow site. USE on that service's resources then tells you why: the request-level symptom leads you to, say, a saturated disk. In an interview, state RED per service for alerts and USE per resource for diagnosis.",
  [
   "grafana-red-method"
  ]
 ],
 [
  "The three terms form a chain. The SLI is a number you can compute from telemetry, usually a ratio: good requests divided by all requests, where \"good\" might mean answered successfully within 300 ms. The SLO is the line that ratio must stay above over a window, such as 99.9% over 30 days. The error budget is simply the remainder, 0.1%.\n\nTurn it into something tangible. Thirty days is 43,200 minutes, so 0.1% is 43.2 minutes of total outage, or a longer period of partial failure: a 1% error rate would take three days to use it up.\n\n\"Spend it on shipping\" is the important part. Development is judged on how fast it ships and SRE on reliability, so they pull in opposite directions. Google's SRE book describes the budget as the shared rule that settles it: as long as measured reliability is above the SLO, there is budget left and new releases can be pushed; if violations use it up, releases are temporarily halted while effort goes into testing and resilience. Its example: with a 99.999% SLO the budget is a 0.001% failure rate, so a problem that fails 0.0002% of queries has spent 20% of the quarter's budget.",
  [
   "sre-slo",
   "sre-embracing-risk",
   "sre-workbook-alerting-on-slos"
  ]
 ],
 [
  "A symptom is what is broken from the user's side; a cause is why. Google's SRE book pairs them: \"I'm serving HTTP 500s\" is a symptom, \"database servers are refusing connections\" a cause; \"my responses are slow\" is a symptom, \"CPUs are overloaded\" a cause.\n\nThe mapping is many-to-many, which is the whole argument. CPU at 85% may be a batch job hurting nobody, so paging on it wakes someone for nothing. A bad deploy can return errors with CPU perfectly calm, so the cause alert stays silent during a real outage. A symptom alert is right in both cases because it measures the thing you care about. The book's rule for pages is that each one should be actionable and need human intelligence, since a person can only respond with urgency a few times a day.\n\nThe modern form of a symptom alert is error-budget burn rate: how fast you are consuming the budget relative to the SLO. For a 99.9% SLO, a burn rate of 14.4 means a 1.44% error rate; sustained for one hour of a 720-hour month it uses 14.4 / 720 = 2% of the budget, which is Google's suggested paging threshold.",
  [
   "sre-monitoring",
   "sre-workbook-alerting-on-slos"
  ]
 ],
 [
  "An average answers \"what is the total?\", not \"what do users experience?\" Google's SRE book gives the scale of the gap: a service averaging 100 ms at 1,000 requests per second might easily have 1% of requests taking 5 seconds. That is ten unhappy users every second, invisible in the mean. And if a page calls several such backends, one backend's 99th percentile can become the frontend's median.\n\nAveraging percentiles fails because a percentile is a position in a sorted list, and you cannot find a position in a merged list from positions in its parts. Host A serves 9,900 requests, all at 100 ms. Host B serves 100 requests, two of them at 5 s, so its p99 is 5 s. The average of the two p99s is 2.55 s. The true fleet p99: only 2 of 10,000 requests are slow, 0.02%, so it is 100 ms. Shift the traffic and the error flips direction.\n\nThe fix is to keep the raw distribution: each host exports counts per latency bucket, you add the counts across hosts, then read the percentile off the sum. Prometheus's documentation calls the averaged version statistically nonsensical and says aggregation is perfectly possible with histograms.",
  [
   "sre-monitoring",
   "prometheus-histograms"
  ]
 ]
];
SD.deep["0D.6"] = [
 [
  "The reason to find the biggest line first is plain arithmetic: cutting a line that is a fraction f of the bill by a fraction s saves f times s of the total. A heroic 50% cut on a line that is 10% of spend saves 5%. A modest 20% cut on a line that is 70% of spend saves 14%, nearly three times as much.\n\nThe three lines grow with different things, which is why the dominant one changes from system to system. Compute is billed for machine-hours, so it follows request rate and how heavy each request is. Storage is billed for bytes held multiplied by how long you hold them, so it follows retention. Data transfer is billed for bytes moved, so it follows payload size multiplied by traffic.\n\nRun that against two workloads. A logging pipeline that ingests 2 TB a day and keeps it a year holds about 730 TB at rest while serving few reads: bytes held dominate. A video service streams large files to every viewer while its API handles a few small requests each: bytes moved dominate. In an interview, say which multiplier is largest for this system before proposing any saving.",
  "calc"
 ],
 [
  "A commitment trades flexibility for price. With AWS Savings Plans you promise a steady amount of spend, measured in dollars per hour, for one or three years; usage up to that amount is billed at the discounted rate and anything beyond it at normal on-demand rates. AWS quotes savings of up to 66% for the flexible Compute plan and up to 72% for the plan tied to one instance family in one region.\n\nBecause you have promised that spend for every hour, the question is how many hours you would really use it. Suppose the committed rate is 40% below on-demand. An instance running 24 hours a day costs 0.6 of on-demand: a clear win. An instance needed only 8 hours a day still costs 0.6 x 24 = 14.4 instance-hours of on-demand money to cover, versus 8 if you simply rent it when needed. The break-even is 60% utilisation. So commit to the floor that is always on, and rent the peak.\n\nThe trap in the wording: a Savings Plan is a price, not a seat. AWS's FAQ states it does not provide a capacity reservation; reserving capacity is a separate product that can be combined with the discount.",
  [
   "aws-savings-plans-pricing",
   "aws-savings-plans-faq"
  ]
 ],
 [
  "Spot is the provider selling capacity nobody is currently using. AWS describes a Spot Instance as one that uses spare EC2 capacity at less than the on-demand price, with the price set by EC2 and adjusted gradually according to long-term supply and demand. The discount exists because the deal is revocable: when EC2 needs the capacity back it terminates, stops or hibernates the instance, after a two-minute warning.\n\nTwo minutes defines what is safe. It is enough for a stateless web server to stop taking new requests and finish the ones in flight. It is not enough to finish a 20-hour training run, so that job must save progress periodically; with a checkpoint every 10 minutes, an interruption costs at most 10 minutes of work. A single database primary has nowhere to put its state in two minutes, so it does not belong on spot.\n\nPut numbers on it. If spot is 70% cheaper and interruptions force 10% of the work to be redone, cost is 0.30 x 1.10 = 0.33 of on-demand. The other risk is availability: a spot request launches only if capacity is available, so keep an on-demand fallback for deadlines.",
  [
   "aws-ec2-spot-userguide",
   "aws-ec2-spot-product"
  ]
 ],
 [
  "Storage classes price the same bytes differently depending on how you promise to use them. The colder the class, the less you pay per GB held and the more you pay, in money or time, to get data out.\n\nAmazon S3 shows the ladder. Standard is the default for frequently accessed data. Standard-IA still returns objects in milliseconds, but S3 charges a retrieval fee, bills at least 30 days of storage even if you delete sooner, and bills objects under 128 KB as if they were 128 KB. Glacier Flexible Retrieval has a 90-day minimum and objects must be restored first, taking minutes to hours. Glacier Deep Archive has a 180-day minimum and retrieval in hours.\n\nThose conditions are where tiering goes wrong. Put data that is read daily into an infrequent-access class and retrieval fees eat the saving. Archive millions of tiny objects and you lose twice: lifecycle transitions are charged per object, which is why S3 by default does not transition objects under 128 KB, noting the transition cost can outweigh the storage saving.\n\nThe usual design is a lifecycle rule: keep logs in Standard while they are being queried, then transition by age.",
  [
   "aws-s3-storage-classes",
   "aws-s3-lifecycle-transitions"
  ]
 ],
 [
  "Data transfer is priced by where the bytes go, and the rules are worth knowing because they are counter-intuitive. On AWS, inbound data from the internet is free; outbound to the internet is charged, at rates that depend on the service and the originating region. Inside a region, traffic within one availability zone is free, but traffic between zones is charged at $0.01 per GB in each direction on the EC2 price list. Crossing regions is charged too, at a rate that depends on the source and destination region.\n\nThe cross-zone charge catches people because nothing leaves the provider. Service A sends 1 TB a day to service B in another zone. Each GB is billed out of one zone and into the other, so $0.02: 1,000 GB x $0.02 x 30 days = $600 a month for one chatty link.\n\nThe fix is not simply \"put everything in one zone\". AWS's own guidance presents multi-zone deployment as the way to get high availability and then notes that cross-zone charges apply between the servers. So the design choice is which traffic must cross zones for resilience, and which chatty pairs can be kept zone-local.",
  [
   "aws-arch-blog-data-transfer",
   "aws-ec2-on-demand-pricing"
  ]
 ]
];
