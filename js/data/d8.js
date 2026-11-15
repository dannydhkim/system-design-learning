// "More detail" for the key ideas of each topic: one entry per key idea, [text, source keys or 'calc'].
// Shown under each key idea on the Learn station (js/app.js). Checked by tools/check-content.mjs.
window.SD = window.SD || {}; SD.deep = SD.deep || {};
SD.deep["8.1"] = [
 [
  "Hello Interview sorts ML interviews into four broad types and says the applied kind makes up the majority, so \"ML system design\" on a schedule most often means this one. The reason it can skip infrastructure is organisational: larger companies tend to have established ML infra teams who own databases, APIs and serving, so the applied engineer is hired for the decisions upstream of those. In the guide's words you can take for granted that high-performance feature extraction and model inference components exist.\n\nThink of a chef auditioning in a fully equipped kitchen. Nobody asks how the oven was wired; they watch what is cooked with it. The guide's sample prompts show the flavour: a recommender for an e-commerce platform, fraud detection for a financial service, content moderation for a social network.\n\nWhere it bites: the same prompt can be either round. Hello Interview's advice is to ask the recruiter what the role is and work backwards to what the interview will cover, because consistency between companies and interviewers is low.",
  [
   "hi-ml-intro",
   "hi-ml-delivery"
  ]
 ],
 [
  "The order is a chain of dependencies, not a ritual. You cannot choose a label until you know what the business wants more of; you cannot list features until you know what is being predicted and at what moment; you cannot judge a model without a baseline and a metric; and serving constraints only mean something once there is a model to serve. Each step consumes the output of the one before, which is why three frameworks written by different people land on the same sequence.\n\nChip Huyen adds the part the tidy list hides: the process is iterative, and the output of one step may be used to update earlier ones. Her examples: after examining the data you find you cannot get what the problem as defined needs, so you reframe it; after training you find you need more data or new labels; after serving you find users behave differently from your assumptions.\n\nIn the round, that licenses going back. Hello Interview says jumping back and forth between steps is completely normal. Say \"this changes my label definition\" out loud rather than pretending the first framing was final.",
  [
   "huyen-mlsd-design",
   "hi-ml-delivery"
  ]
 ],
 [
  "Do the sums, because they show how little slack there is. Hello Interview's fixed blocks, taking the midpoints, are 6 minutes framing + 2.5 sketch + 10 data and features + 10 modelling + 7 inference and evaluation = 35.5 minutes. In a 45-minute slot that leaves about 9.5 minutes for deep dives, and that is before introductions and your own questions at the end, which can easily take 5 of them. Exponent's split is tighter still: 5 steps × 8 minutes = 40, plus 5 to wrap up = 45, which is the bottom of its 45 to 55 minute range.\n\nSo both budgets are fully spent on paper. Any block that overruns is paid for by a later one, and the later ones are evaluation and deep dives. A 4-minute overrun on framing is more than a third of the deep-dive time.\n\nThe practical use is as a clock check, not a script: at minute 20 you should be leaving data and starting on a baseline. Hello Interview is explicit that if the interviewer drags you off course you follow their lead.",
  [
   "hi-ml-delivery",
   "exponent-ml-sd"
  ]
 ],
 [
  "Each graded area is really a question about judgement. On framing, Hello Interview wants you to state assumptions and risks, decide quickly whether ML is appropriate at all, and justify a formulation (classification or ranking, regression or forecasting) by business impact, data availability and operational constraints. On data, it describes seasoned candidates as those who make use of more data and hold stronger hypotheses about which data matters and how to represent it. On modelling, it wants a model that is both effective and efficient.\n\nExponent describes the stance behind all of these: the interviewer watches how you reason about trade-offs at each stage rather than whether you reach one \"correct\" architecture, and it says incorporating the interviewer's feedback during the round matters as much as the final design.\n\nThat changes how to talk. \"I'd use gradient-boosted trees\" is an answer; \"trees, because the features are tabular and we need 20 ms scoring, at the cost of handling the ID features less well\" is a graded answer. The second sentence exposes the reasoning, and reasoning is the only thing an interviewer can score when two designs would both work.",
  [
   "hi-ml-intro",
   "exponent-ml-sd"
  ]
 ],
 [
  "A baseline does two jobs. Huyen names both: adding complexity gradually makes the system easier to debug step by step, and the simplest model is the yardstick the complex ones are compared with. She lists three baselines to think about: random (what does guessing score?), human (how well would people do?) and a simple heuristic.\n\nWork her number through. If \"suggest the most-used app\" is right 70% of the time and your network reaches 74%, the model's whole contribution is 4 points, bought with training pipelines, serving cost and on-call load. Without the baseline, 74% would have sounded like the achievement. Hello Interview makes the same point about the conversation: a baseline moves it from theory to the costs and benefits of each added piece of complexity. Its example for a recommender is popularity or basic collaborative filtering.\n\nHuyen also marks the other end: resist ever more complex heuristics, and once a system has more than 100 nested if-else branches it is time for ML. On unprompted operations, Hello Interview notes that measuring cost and latency demonstrates breadth, which is why raising them yourself reads as experience.",
  [
   "huyen-mlsd-design",
   "hi-ml-delivery"
  ]
 ],
 [
  "The first failure is the root of the others. Take Hello Interview's harmful-content case with made-up numbers: 1,000 harmful posts, of which 10 are viral and collect 99% of all views of harmful content. A classifier judged per post that misses those 10 scores 99% recall. Judged by exposure, the thing the business cares about, it stopped 1% of the harm. Same model, same predictions; the naive objective simply counted the wrong unit. The guide also warns that \"improve user experience\" or \"increase revenue\" is too vague to act on, while \"increase click-through rate on recommendations\" can guide later decisions.\n\nThe remaining failures follow from skipping that step. With no sharp objective there is no way to say which features matter, so they arrive as a laundry list; Hello Interview wants each feature to come with a hypothesis for why it is predictive. With no objective there is nothing to tie evaluation to. And a complex model chosen first has no simpler alternative to be weighed against.\n\nDatabase and API talk is a different failure: it is time spent where, in this round, nothing is scored.",
  [
   "hi-ml-delivery"
  ]
 ]
];
SD.deep["8.2"] = [
 [
  "The heuristic is there to price the ML, not to avoid it. Google's course asks two things of the comparison. Quality: how much better could a model plausibly be? If only a little, the current solution may already be the best one. Cost and maintenance: ML can cost significantly more in compute and engineering time, though a small improvement in a large system can easily justify that. You can answer neither without a number from the non-ML version, and if none exists the course says to solve the problem by hand with a heuristic first.\n\nRules of ML supplies the other half: without data a model has nothing to learn from, so \"if machine learning is not absolutely required for your product, don't use it until you have data\". Its spam example is as blunt as the contacts one: filter out publishers that have sent spam before.\n\nThe hand-over point is Rule #3. A simple heuristic gets the product out of the door; a complex one is unmaintainable, and a learned model is easier to update. So in an interview, name the heuristic, say what it would score, and say what would make you replace it.",
  [
   "google-pf-problem",
   "rules-of-ml"
  ]
 ],
 [
  "Why the proxy at all: a model needs one number per training example, recorded automatically, millions of times. \"Was this video useful to this person\" is not logged anywhere, while \"did they press play\" is. Google's course walks down the candidates for a video app and each fails differently. Shares: some people never share, and some share videos because they dislike them. Rewatches: favours rewatchable genres. Its advice is to pick the proxy with the fewest problems for your case, since none is clean.\n\nRule #13 explains \"attributable\". A click on a ranked link happens seconds after the system's action and because of it. A visit tomorrow has a hundred other causes (a notification, a habit, the weather), so the signal linking it to one ranking decision is faint and slow. The rule also admits something candidates rarely say: often you do not know the true objective, and team members cannot agree on it. Hence train on the simple one and, if needed, put a small \"policy layer\" of extra logic on top for the final ranking.\n\nThe follow-up to expect: \"how would you know your proxy has gone wrong?\" Answer with the launch metrics it should move.",
  [
   "google-pf-framing",
   "rules-of-ml"
  ]
 ],
 [
  "YouTube's own illustration of the 2011 lesson: you search for Wimbledon highlights and click a thumbnail that promises match footage, but it is someone in their bedroom talking about the match. You click the next one, same again. Every one of those clicks counted as a success for a click-trained ranker, and you still have not seen any tennis.\n\nHow do you train for watch time? The 2016 paper keeps an ordinary click classifier and changes the weights: clicked impressions are weighted by the watch time observed, unclicked ones get weight 1. A logistic model learns odds, positives over negatives, so the weighted version learns roughly (total watch time) ÷ (unclicked impressions), which is close to expected watch time per impression when clicks are rare. A 10-minute watch simply counts 20 times as much as a 30-second one.\n\nWatch time has its own blind spot, which YouTube states plainly: staying up late on random videos is time, not value. Surveys fix that but are sparse, since not everyone answers, so YouTube trains a model to predict the survey response for everyone and holds some responses back to check it.",
  [
   "youtube-recs-signals-2021",
   "youtube-dnn-recs"
  ]
 ],
 [
  "The 28-versus-32 point is about what the loss can see. Google's example: cache a video if it is predicted to get at least 30 views. For a video with exactly 30 views, squared error charges (28 − 30)² = 4 and (32 − 30)² = 4. The model is told these mistakes are equal, yet one caches the video and the other does not. A classifier trained on \"30 or more: yes or no\" is charged more for the prediction that lands on the wrong side. As the course puts it, classification models produce thresholds by default, and regression models are unaware of product-defined thresholds.\n\nThe price of predicting the decision is that the threshold is baked into the labels. Move the cut to 50 and every label changes, so you retrain. A regression model keeps the cut as one line of application code, which is why the course picks regression for its own cache example: cache thresholds change over time.\n\nSo the question to ask the interviewer is who owns the threshold and how often it moves. For ranking, the usual first version is the pointwise one: predict a score per item, then sort.",
  [
   "google-pf-framing"
  ]
 ],
 [
  "The mechanics at Facebook: for each person and post, separate models output probabilities Y for each action (like, comment, share), and the final value is V = w1 × Y1 + w2 × Y2 + … . The weights say how much each action is worth, and the surveys ask people how meaningful an interaction was or whether a post was worth their time, so that the weights reflect stated value rather than raw frequency. Facebook points out a handy property of the linear form: an action someone almost never takes has Y near zero, so it automatically plays almost no part in that person's ranking.\n\nWhy not one model for \"value\"? Because each action has its own label, base rate and meaning, and separate predictions let the product change what it values by editing weights instead of retraining.\n\nThe weighted sum is still a proxy, which is what the launch-review story is for. Rules of ML warns not to confuse your objective with the ultimate health of the system, and lists what the team actually has to care about: engagement, 1-day and 30-day active users, revenue, advertisers' return on investment. If the optimised number keeps rising and you keep declining to launch, the rule says the objective needs revising.",
  [
   "fb-news-feed-ranking",
   "rules-of-ml"
  ]
 ],
 [
  "Work Stripe's margins into thresholds. Take a $100 order. A grocer on a 0.5% margin earns $0.50 if it is good and loses about $99.50 of goods if it is fraud, so one fraud eats the profit of 99.50 ÷ 0.50 = 199 good orders: Stripe's \"hundreds\". With a calibrated fraud probability p, blocking is worth it when p × 99.50 > (1 − p) × 0.50, that is p > 0.5%. A SaaS seller on an 80% margin loses about $20 of cost to a fraud and $80 of margin to a wrongly blocked customer, so it blocks only when p × 20 > (1 − p) × 80, p > 80%. Same model, same score, thresholds 160 times apart. (This ignores chargeback fees and the lifetime value of a subscriber, which push in the same directions.)\n\nThe other two constraints change the design rather than the threshold. A latency budget decides whether the model runs before the payment is authorised or scores it afterwards for review. And a feature that only exists later, such as whether the customer disputed the charge, cannot be an input at all.\n\nHence ask for the cost of each error before choosing metrics.",
  [
   "stripe-radar-guide"
  ]
 ]
];
SD.deep["8.3"] = [
 [
  "The layers exist because each one is measurable on a different clock. An offline ML metric is available in minutes on logged data, a product metric takes a week or two of live traffic, and the business objective (people who keep coming back) takes months. You steer by the fast number, so you need reason to believe it moves the slow one. \"Tied to the one above\" means exactly that: a claim, checked by experiment, that when the lower metric improves the upper one follows.\n\nThe Overall Evaluation Criterion is the name Kohavi and colleagues give to the single measure an experiment is judged on, possibly a weighted combination of objectives. They argue for one metric because it forces the trade-offs to be made once, for all experiments, and aligns the organisation behind a clear objective; otherwise every launch review reopens the argument about whether clicks or revenue matters more. Bing's choice, described in 2013, is sessions per user: making search worse forces people to issue more queries, but people who are satisfied come back.\n\nAn interviewer's follow-up is usually \"what is your OEC, and why would a team not be able to game it?\".",
  [
   "kohavi-survey-2009",
   "kohavi-at-scale-2013"
  ]
 ],
 [
  "Take 10,000 transactions with 100 frauds (1%). A model gives each a score and you flag everything above a threshold. At a high threshold it flags 50, of which 45 are fraud: precision 45 ÷ 50 = 90%, recall 45 ÷ 100 = 45%. Lower the threshold and it flags 400, of which 90 are fraud: precision 90 ÷ 400 = 22.5%, recall 90%. Nothing about the model changed. Google's crash course states the mechanism: raising the threshold tends to cut false positives and add false negatives, and lowering it does the opposite, so the two usually move against each other. Accuracy barely notices any of this: the two settings score 99.4% and 96.8%, and flagging nothing scores 99%.\n\nThink of a fishing net. A finer mesh catches more of the fish you want and more seaweed. The model decides how well fish and seaweed separate; the mesh size is your choice.\n\nThat choice comes from costs. If a missed fraud costs $500 and a wrongly flagged customer costs $5 of reviewer time, the second setting is clearly better: it catches 45 more frauds ($22,500) for 305 more false alarms ($1,525). Saying \"it depends on the threshold, and the threshold depends on these costs\" is the expected answer.",
  [
   "mlcc-precision-recall"
  ]
 ],
 [
  "Both curves sweep the threshold; they differ in what goes on the axes. ROC plots the true positive rate against the false positive rate, and the false positive rate divides by the number of negatives. When negatives are plentiful that denominator hides a great many mistakes.\n\nRun it: 1,000,000 payments, 1,000 fraudulent. At some threshold the model catches 90% of fraud with a 1% false positive rate, a point near the top-left corner of a ROC plot. That is 900 true positives and 1% × 999,000 = 9,990 false positives, so precision is 900 ÷ 10,890 ≈ 8%. Eleven of every twelve flags are wrong, and ROC showed a near-perfect model. Saito and Rehmsmeier call this an intuitive but wrong reading of specificity, and note that the PR curve evaluates the fraction of true positives among positive predictions, which is what the review team experiences.\n\nThe moving baseline is a consequence. A random scorer's precision is just the positive rate: 0.5 when balanced, 0.09 at 1:10 in their example, 0.001 here. So a PR-AUC of 0.3 can be an excellent model on this data, and PR-AUC values cannot be compared across datasets with different class ratios. Google's course gives the same guidance: ROC for roughly balanced data, PR curves for imbalanced.",
  [
   "saito-prc",
   "mlcc-roc-auc"
  ]
 ],
 [
  "AUC asks only whether clicked impressions were scored above unclicked ones. Double every prediction and the order, and so the AUC, is untouched. An auction, though, multiplies the bid by the predicted click rate, so a model that says 2% where the truth is 1% makes every ad look worth twice what it is. Facebook's paper wants the prediction to be accurate, not merely well ordered, to avoid under-delivery or over-delivery.\n\nLog loss does punish the wrong level, but its raw value depends on how rare clicks are, and Facebook notes that the closer the background rate is to 0 or 1, the easier a low log loss becomes. So they divide by the log loss of a model that always predicts the background rate. Worked for a 1% CTR: always predicting 0.01 scores −(0.01 × ln 0.01 + 0.99 × ln 0.99) ≈ 0.056, and normalised entropy is 0.056 ÷ 0.056 = 1.0. Any model worth having is below 1. Always predicting 0.02 instead scores about 0.059, an NE of about 1.06: worse than knowing nothing, with an identical AUC.\n\nCalibration is the cheap companion check: expected clicks ÷ observed clicks, ideally 1. It can be 1 overall and still wrong within segments, so check it by slice.",
  [
   "fb-ads-ctr"
  ]
 ],
 [
  "Each metric encodes a guess about how people read the list. MRR takes the reciprocal of the position of the first relevant result and averages it over queries: first relevant at position 1 scores 1, at position 3 scores 0.33, and everything after it is ignored. That suits \"one right answer\" products such as navigational search or autocomplete. NDCG keeps counting down the list but discounts each result by the log of its rank; Hello Interview calls it a good all-rounder.\n\nRecall@k drops position altogether, and that is why it suits retrieval. In Facebook's feed, pass 0 is a lightweight model that selects about 500 posts, and pass 1 then scores each and re-orders all of them. The order pass 0 produced is thrown away. What cannot be recovered is a good post that pass 0 left out, since later passes never see it. Suppose a user would have engaged with 20 posts and 17 are among the 500: recall@500 is 85%, and that 85% is a ceiling on everything downstream.\n\nFixing k from the interface stops metric-shopping: Hello Interview treats k as a product parameter. It also warns that offline ranking metrics only approximate user utility, so they need checking against online results.",
  [
   "hi-ml-evaluation",
   "fb-news-feed-ranking"
  ]
 ],
 [
  "Why did a bug raise revenue? Kohavi and colleagues decompose Bing's query volume as users per month × sessions per user × distinct queries per session. Poor results inflate the last term: people who do not find the answer reformulate and search again, and they click more ads along the way because the organic results are no help. Both headline numbers rise while the experience gets worse. Their comparison is a shop raising prices: short-term revenue goes up, customers drift to competitors, and lifetime value falls.\n\nA guardrail is the tripwire for that pattern: a metric the change is not meant to improve but must not damage. Here the tell would be queries per session rising with no rise in sessions per user, a combination that suggests the \"win\" is people struggling. Hello Interview makes the general point that optimising short-term results can cannibalise long-term ones.\n\nThe offline-to-online gap is a second reason not to trust one number. YouTube uses offline metrics such as precision, recall and ranking loss to guide iteration, but makes the final call with live A/B tests. So present offline metrics as a filter for what deserves a live test, not as proof.",
  [
   "kohavi-puzzling",
   "youtube-dnn-recs",
   "hi-ml-evaluation"
  ]
 ]
];
