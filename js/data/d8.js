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
SD.deep["8.4"] = [
 [
  "Each source trades volume against meaning. Explicit feedback says what you want to know but few people give it. Implicit behaviour is logged for every impression but is ambiguous: a click may be curiosity or a mis-tap. Human raters can judge anything you can write instructions for, slowly and at a price. Later outcomes such as a purchase or a chargeback are closest to the truth and arrive last.\n\nGoogle's crash course frames the choice as direct versus proxy labels. A direct label is the thing you want to predict; a proxy is an imperfect approximation used when the direct label is missing or cannot be expressed as a number, and the model can only ever be as good as the link between the two. If the proxy is \"clicked\" and the goal is \"satisfied\", every case where those disagree is a case the model is being trained to get wrong.\n\nThe rater check is deliberately symmetrical. Label about 1,000 examples yourself and compare. Where you disagree, the course says not to assume your own labels are right, especially on value judgements. A disagreement usually means the instructions are ambiguous, and a model trained on those labels would inherit the ambiguity as noise.",
  [
   "mlcc-labels"
  ]
 ],
 [
  "Put numbers on the dilemma. Say 1,000 clicks today will produce 50 conversions eventually, a true rate of 5%. Build tomorrow's training set and, on Criteo's figures, only about half have arrived: 25 positives and 975 \"negatives\", of which 25 are future buyers. The model is taught 2.5%. Because the labels of a click fill in over time, the newest campaigns and newest data are always the most understated, which is exactly the data you most wanted the model to learn from. Waiting the full attribution window (30 days in the paper) fixes the labels and makes every training example at least a month old.\n\nChapelle's way out borrows from survival analysis, the statistics of \"time until an event\" when some subjects have not had the event yet. In a medical study a patient still alive at the end is censored: you know only that the survival time is longer than the follow-up. A click from two hours ago with no conversion is the same kind of observation. So he adds a second model: one predicts whether a click converts, the other how long conversion takes. A missing conversion on a fresh click is then weak evidence, and on a 3-week-old click strong evidence, as it should be.",
  [
   "chapelle-delayed"
  ]
 ],
 [
  "The bias comes from who gets to produce a label. A spam filter that blocks 75% of spam shows users only the remaining 25%, the spam it failed on, so user reports are a sample of the model's mistakes, not of spam. Train on them and the next model learns the hard cases while forgetting the easy ones nobody was allowed to see. The same holds for a fraud model: a blocked payment never becomes a chargeback or a happy customer, so the cases where the model was most confident are the ones it never gets corrected on.\n\nRule #34's fix is to pay a small, known price for unbiased data. Mark 1% of traffic as held out and deliver all of it. The filter still works on the other 99%, so it blocks 75% × 99% ≈ 74% of spam, and the 1% yields labels for everything, including mail the filter would have removed. The rule's title says it: small short-term sacrifices in performance for very clean data.\n\nIn an interview, name the cost when you propose this. For spam it is a few extra junk mails; for fraud, the held-out slice lets real fraud through, so you would cap it by amount or risk.",
  [
   "rules-of-ml"
  ]
 ],
 [
  "Why sampling shifts the prediction, and where the formula comes from: think in odds, clicks per non-click. A true CTR of 0.1% is odds of about 1 to 999. Keep every click and 1 in 100 non-clicks (w = 0.01) and the training set has odds of 1 to 9.99, a rate of 1 ÷ 10.99 ≈ 9.1%, Facebook's \"roughly 10%\". Sampling multiplied the odds by 1 ÷ w and did nothing else, so a model that fits the sampled data well reports odds 100 times too high for every impression.\n\nUndo it by multiplying the odds by w. With p the sampled-space prediction, odds are p ÷ (1 − p); corrected odds are w × p ÷ (1 − p); turning that back into a probability gives q = p ÷ (p + (1 − p) ÷ w), the formula in the paper. Check: p = 0.091 gives 0.091 ÷ (0.091 + 0.909 × 100) ≈ 0.001.\n\nThe alternative in Google's course is to correct during training instead: having downsampled the majority class by a factor of 25, count each kept negative's loss 25 times. Either way the ranking is unaffected by a missing correction, which is why the bug survives offline review and shows up only when something consumes the probability.",
  [
   "fb-ads-ctr",
   "mlcc-imbalanced"
  ]
 ],
 [
  "Leakage is hard to see because nothing crashes: the column is in the table, the join succeeds, the metric goes up. The question is never \"is this column correlated with the label\" but \"what would this cell have contained at the instant of prediction\". scikit-learn's guide gives the consequence: over-optimistic performance estimates, then poorer performance on genuinely new data.\n\nHello Interview, which calls leakage an incredibly popular interview topic, lists three shapes that all sound innocent. A moderator label assigned after the prediction would be made: the feature is the answer. A lifetime click total on the impression being scored: the row knows the future. And a user's average click rate computed over the whole dataset when that user has rows in both train and test: the test rows leak through the aggregate. The third is the subtle one, since no single column is \"from the future\"; the aggregation window is.\n\nThe discipline that prevents all three is mechanical. Give every raw event a timestamp, give every training example a prediction time, and compute each feature only from events earlier than that time. Then treat any single feature with startling importance as a suspect until you can say when its value was written.",
  [
   "hi-ml-features",
   "sklearn-common-pitfalls"
  ]
 ],
 [
  "A random split answers \"how well does the model fill gaps in a period it has seen?\". Production asks \"how well does it predict a period it has not seen?\". Those differ whenever the world drifts or examples near in time resemble each other, which is nearly always: the same campaign, the same trending video, the same fraud ring appear on both sides of a random split.\n\nRule #33 says what to expect from the honest version. Performance on the later data will not be quite as good, but should not be radically worse; and since there are daily effects the average click rate may be off, while AUC should stay reasonably close. A big drop from random-split to time-split numbers is therefore a finding: it measures how much the model was leaning on the period.\n\nYouTube's case shows the same leak inside a single user's history. People watch episodic series in order and explore a genre from the popular artists towards the niche ones. Hide a random watch, say episode 3, and the model sees episode 4 among its inputs, so the answer is nearly given. YouTube instead \"rolls back\" the history: pick a watch, and feed only the actions before it.",
  [
   "rules-of-ml",
   "youtube-dnn-recs"
  ]
 ]
];
SD.deep["8.5"] = [
 [
  "Listing columns produces a laundry list; walking the four sources produces coverage. For \"will this user click this ad now\" ask in turn: what do we know about the user, about the ad, about this request (device, page, hour), and about what has happened between this user and this ad or ads like it?\n\nFacebook measured how much each kind carries. It trained one boosted model on contextual features only, one on historical features only, and compared both with the full model. Taking contextual-only as 100%, historical-only scored a normalised entropy of 96.32% and the full model 95.65% (lower is better). So history alone gets within 0.7 points of everything, while dropping history costs about 4.5%. The intuition: the best predictor of whether someone clicks this kind of ad is whether they, and people like them, have clicked it before. Context is a much weaker description of the same thing.\n\nHistory has a hole where the entity is new. Hello Interview's advice for that hole is not to impute the average, which pretends to know something, but to pass an explicit \"missing\" marker the model can learn from, or to run a separate cold-start feature set until behaviour accumulates.",
  [
   "fb-ads-ctr",
   "hi-ml-features"
  ]
 ],
 [
  "Why do these generalise where an ID does not? A video ID tells the model about one video, and only after it has seen that video many times. \"This user has watched 14 videos from this channel, the last one yesterday\" describes a relationship, and the same number means the same thing for any channel, including one uploaded this morning. YouTube's phrase is that such features generalise well across disparate items.\n\nSmoothing, worked with Hello Interview's example. Video A has 12,000 views and 240 negative reactions, B has 8 views and 4, C has 9,000 and 1,800. The raw rates are 2%, 50% and 20%, so B looks worst on the strength of eight views. Add a prior: smoothed = (negatives + prior × C) ÷ (views + C), with a prior rate of 2% and a pseudo-count C of 50. B becomes (4 + 1) ÷ 58 ≈ 8.6%; the 9,000-view video barely moves, (1,800 + 1) ÷ 9,050 ≈ 19.9%. The pseudo-count is how many real views it takes to outvote the prior.\n\nThe window matters as much as the count. The same guide suggests computing a signal over 1 hour, 1 day and 7 days: a high 1-hour rate against a normal 7-day rate says something unusual is happening right now.",
  [
   "youtube-dnn-recs",
   "hi-ml-features"
  ]
 ],
 [
  "A linear model adds one weight per active feature. With \"user installed Netflix\" and \"shown app is Pandora\" as separate features, the score is w(Netflix) + w(Pandora): it can say Netflix users install more and Pandora is popular, but not that this particular pair goes together. The cross is a new feature that is 1 only when both hold, with a weight of its own. Wide & Deep calls what it gives you memorisation: the model records how the co-occurrence of a pair relates to the label.\n\nBoth limits follow from that. A pair never seen in training has a weight that was never updated, so the cross contributes nothing. And each pair needs its own examples: crossing 100 values with 200 creates 20,000 weights, most of which see little or no data. Wide & Deep's less granular version, crossing installed category with shown category (video × music), trades precision for coverage.\n\nEmbeddings fail the other way: every pair gets a non-zero score, so a user with niche tastes is nudged towards things that are merely similar. Hence the paper's design of training both parts together. Facebook's 2014 shortcut was to let boosted trees build the tuples: each root-to-leaf path is a learned cross.",
  [
   "wide-deep",
   "google-mlcc-feature-crosses",
   "fb-ads-ctr"
  ]
 ],
 [
  "An embedding table is a lookup: row i holds the vector for ID i, and training adjusts only the rows that appear in a batch. So a row is as good as the number of times its ID was seen. Size is the other constraint: 50 million video IDs × 64 floats × 4 bytes is 12.8 GB for one feature.\n\nYouTube's truncation deals with both at once. Keep the top N IDs by frequency in clicked impressions, the ones with enough data to learn a useful vector, and send everything else to a zero vector. Keeping 1 million of those rows is 256 MB. The cost is that the whole tail looks identical to the model, so tail items must be told apart by other features. The paper adds a second saving: features in the same ID space (the impression's video, the last video watched, the video that seeded the recommendation) share one table.\n\nHashing makes the opposite trade. Every ID gets a row, chosen by hash(ID) mod table size, so nothing is out of vocabulary and no dictionary has to be built, but unrelated IDs share rows. Weinberger and colleagues designed it for spam filters with severe memory limits handling billions of emails a day, where a rare but telling token still gets to contribute.",
  [
   "youtube-dnn-recs",
   "weinberger-hashing"
  ]
 ],
 [
  "Why scale matters to one family and not the other. A tree split asks \"is follower count above 12,000?\"; replace the count by its logarithm and the same split exists at a different number, so nothing changes. A network computes weight × value. With one input ranging to 300,000,000 and another between 0 and 1, the first dominates the sum and its gradients, and training tends to be unstable. YouTube found proper normalisation of continuous features critical for convergence.\n\nTwo standard fixes. Log scaling suits power-law data, where a few items have huge values and most have tiny ones: ln(300,000,000) ≈ 19.5 and ln(1,000) ≈ 6.9, so a gap of more than five orders of magnitude becomes a ratio of about three. YouTube's choice is the quantile: replace each value by its position in the cumulative distribution, giving a number evenly spread over [0, 1). Its ranking network is also fed powers of the normalised value.\n\nBucketing is the linear-model trick: Facebook bins the feature and treats the bin index as a category, so each bin gets its own weight and the model fits a step function.\n\nThe serving rule exists because the transform has parameters (quantile boundaries, bin edges). Hello Interview: they come from training data and are applied identically at serve time.",
  [
   "youtube-dnn-recs",
   "google-mlcc-normalization",
   "fb-ads-ctr",
   "hi-ml-features"
  ]
 ],
 [
  "The three questions are three different failure modes. Existence is the leakage test, and Hello Interview's wording is the one to use aloud: could this value actually be known at request time, in production, before the prediction is made? If answering takes squinting, treat the feature as leaky.\n\nStaleness is subtler because the feature does exist; it just has a different value. Rules of ML describes joining document IDs to a table of comment or click counts. Training reads the table as it is today; serving read it as it was when the request arrived. The same document gets different inputs, so different predictions. The rule's remedy is to log the features at serving time and train from that log, or, for slowly changing tables, to snapshot hourly or daily and accept a small gap. It reports that YouTube's home page moved to logging features at serving time and gained quality while reducing code complexity.\n\nCost is plain arithmetic the interviewer will expect you to do. A \"clicks in the last 5 minutes\" feature needs a streaming pipeline and an online store; a 7-day count needs a nightly batch job. If the fresh version buys little accuracy, the batch one is the better engineering choice.",
  [
   "hi-ml-features",
   "rules-of-ml"
  ]
 ]
];
