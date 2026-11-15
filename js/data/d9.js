// "More detail" for the key ideas of each topic: one entry per key idea, [text, source keys or 'calc'].
// Shown under each key idea on the Learn station (js/app.js). Checked by tools/check-content.mjs.
window.SD = window.SD || {}; SD.deep = SD.deep || {};
SD.deep["9.1"] = [
 [
  "Think of capacity as the size of the menu of functions the learner is allowed to choose from. A straight-line model has a short menu; add x², x³ and so on as extra columns and the menu grows, yet each new power is just another input column with its own weight, which is why the fit is still an ordinary linear regression.\n\nGoodfellow et al. illustrate this by fitting a linear, a quadratic and a degree-9 polynomial to points drawn from a quadratic. The line cannot bend, so it misses even the training points: underfitting. The degree-9 curve can represent the right answer, but it can also represent infinitely many other curves that pass exactly through the training points, because it has more parameters than examples, and nothing in the training data says which to pick. It hits every training point and swings wildly between them: overfitting.\n\nIn practice you read two numbers. High training error means the menu is too short. Low training error with a much worse test error means it is too long for the data you have. The book adds that a model can have the right capacity and still show a large gap; then the fix is more training examples.",
  [
   "dlbook-ml"
  ]
 ],
 [
  "The decomposition is a thought experiment: draw many different training sets from the same problem, fit the same kind of model on each, and look at the cloud of predictions at one test point. The scikit-learn example does this literally with decision trees on a toy 1-D regression. Variance is the width of the beam of predictions from the individual trees; the wider the beam, the more a prediction depends on which training set you happened to get. Bias is the distance between the average of all those predictions and the best possible model. For a single deep tree the example finds low bias and a wide beam.\n\nAn archery picture fits: bias is how far the centre of your grouping sits from the bullseye, variance is how scattered the grouping is, and noise is the target itself jiggling, which no archer can fix.\n\nWorked numbers: bias 0.3, variance 0.16, noise 0.25 give 0.3² + 0.16 + 0.25 = 0.50. Note the bias is squared and the 0.25 is a floor. Where it bites: you only ever have one training set, so you cannot measure the terms directly. You infer them from symptoms, high training error for bias and a large train-test gap for variance, and the fixes pull in opposite directions.",
  [
   "sklearn-bias-variance"
  ]
 ],
 [
  "Start from the update. With the penalty (α/2)‖w‖² the gradient gains a term αw, so one SGD step is w ← w − ε(αw + ∇J) = (1 − εα)w − ε∇J: multiply the weight by a number just under 1, then take the usual step. With learning rate 0.1 and decay 0.01 the factor is 0.999; a weight that gets no gradient for 1,000 steps is left with 0.999^1000 ≈ 0.37 of its value. A weight survives only if the data keeps pushing it back.\n\nHow hard the data pushes is the curvature λ along that direction. Where the loss is steep (λ = 100, α = 1) the optimum keeps 100/101 ≈ 99% of its size; where the loss is nearly flat (λ = 0.5) it keeps 0.5/1.5 ≈ 33%. So weight decay mostly removes weight the loss was indifferent to.\n\nUnder Adam this breaks. The αw term is added to the gradient and then the whole thing is divided by that weight's running gradient magnitude, so a weight with large gradients has its decay divided by a large number. AdamW takes the shrink step outside that division, so every weight decays at the same rate again, and Loshchilov and Hutter report that this also separates the best decay value from the learning rate.",
  [
   "dlbook-regularization",
   "adamw"
  ]
 ],
 [
  "Treat one weight on its own. Near its unregularized optimum w* the loss is roughly ½H(w − w*)², a spring pulling the weight back to w* with force H·|w − w*|. The L1 penalty α|w| adds a pull towards zero whose strength is α no matter how small the weight is (its gradient is α·sign(w)). The L2 pull is αw, which fades as the weight shrinks.\n\nBalance the forces for w > 0: H(w* − w) = α gives w = w* − α/H. That is only valid if it is still positive. If w* ≤ α/H the spring, whose force is at most H·w* when the weight sits at zero, can never beat the constant pull, so the weight stays pinned at exactly zero. With L2 the balance H(w* − w) = αw gives w = w*·H/(H + α), a rescaling that never reaches zero.\n\nNumbers, with H = 2 and α = 1 so the threshold is 0.5: w* = 0.4 becomes 0 under L1 and 0.267 under L2; w* = 3 becomes 2.5 under L1 and 2 under L2.\n\nWhere it bites: sparsity doubles as feature selection, but scikit-learn warns that with two correlated features the Lasso keeps one more or less at random, so do not read meaning into which one survived.",
  [
   "dlbook-regularization",
   "sklearn-linear-models"
  ]
 ],
 [
  "Early stopping works like L2 because of where gradient descent goes first. Starting from small weights, it moves quickly along directions where the loss is steeply curved and crawls along flat ones. Stop after τ steps and the flat directions have barely left zero, which are exactly the directions weight decay shrinks most. Goodfellow et al. make this exact for a linear model: the number of iterations plays a role inversely proportional to the L2 coefficient. In practice it costs nothing extra: you keep the checkpoint with the lowest validation error.\n\nDropout's \"exponentially many\" is literal: a network with n droppable units has 2^n on/off patterns, each a thinned network sharing the same weights, and every mini-batch trains a different one. No unit can rely on a specific partner being present. At test time the paper uses the full network with outgoing weights multiplied by the keep probability p, so each unit's expected output matches training. PyTorch's p is the drop probability, and it rescales during training instead.\n\nAugmentation must preserve the label. The book's example: in character recognition a horizontal flip turns \"b\" into \"d\" and a 180° rotation turns \"6\" into \"9\", so those transforms would teach the model wrong answers.",
  [
   "dlbook-regularization",
   "dropout",
   "pytorch-dropout"
  ]
 ],
 [
  "Why would the worst model be the one that only just fits? At the interpolation threshold there is essentially one way to pass through every training point, and the model must take it, noise included, however contorted the function becomes. Make the model larger and many functions fit the training set exactly, so the training procedure has room to settle on a more regular one. Belkin et al. frame this with the norm of the learned predictor: they expect it to be largest at the threshold and to shrink as capacity grows, which is the second descent.\n\nNakkiran et al. generalize \"capacity\" to effective model complexity: the largest number of samples a training procedure can fit to roughly zero error. That number grows with model size and with training time, and test error peaks where it roughly equals the size of the training set. This one definition explains all three versions. Training longer raises it, so the peak appears over epochs. Adding data moves the peak to the right, so a model that was safely past it can find itself sitting on it: more data, worse result.\n\nWhere it bites: a test-error bump after widening a model or adding data is not proof you should go back. Check whether training error has just reached zero.",
  [
   "belkin-double-descent",
   "double-descent"
  ]
 ]
];
SD.deep["9.2"] = [
 [
  "The gradient of ‖Xw − y‖² is 2Xᵀ(Xw − y). Setting it to zero says Xᵀ(Xw − y) = 0: the leftover error is at right angles to every feature column. If any column still correlated with the residual, nudging its weight would reduce the error, so at the optimum none does. With a single feature and no intercept this collapses to w = Σxy ÷ Σx²; for the points (1, 2), (2, 4), (3, 7) that is 31 ÷ 14 ≈ 2.21.\n\nThe cost O(n·d²) means features hurt more than rows: a million rows with 100 features is about 10^10 operations, but ten times the features costs a hundred times more.\n\nWhy correlated features break it: suppose two columns are nearly identical. Then weights (1, 1) and (5, −3) give almost the same predictions, because only the sum is pinned down by the data. Which split you get is decided by noise in y, so the individual coefficients swing wildly between samples even though predictions look fine. That is what \"XᵀX close to singular\" feels like in practice. Ridge's α‖w‖² breaks the tie by preferring the smallest weights, here the even split. The interview follow-up is usually: \"your coefficients flipped sign after retraining, why?\"",
  [
   "sklearn-linear-models",
   "dlbook-ml"
  ]
 ],
 [
  "Follow the algebra once and the square stops looking arbitrary. A Gaussian's density is proportional to exp(−(error)²/2σ²). Independent examples multiply, so the likelihood of the whole dataset is a product of such terms; taking the log turns the product into a sum and strips the exp, leaving a constant minus (1/2σ²)·Σ(y − θᵀx)². Maximizing that is minimizing the sum of squares. The square in the loss is the square in the Gaussian's exponent.\n\nσ² only scales the sum, like changing currency: it changes the height of the curve but not where its lowest point is. Ng notes you would reach the same θ even if σ² were unknown.\n\nNothing in the derivation used the fact that the mean was θᵀx, which is why Goodfellow et al. can say the same holds when a neural network predicts the mean: training a regression net with MSE is maximum likelihood under Gaussian noise.\n\nWhere it bites: choosing squared error is quietly choosing a noise model with thin tails. One residual of 10 costs 100, as much as a hundred residuals of 1, so a few outliers can drag the fit. Ng's caveat cuts the other way: least squares can be justified on other grounds too, so non-Gaussian noise does not make it invalid.",
  [
   "cs229-notes",
   "dlbook-mlp"
  ]
 ],
 [
  "The expression p^y(1 − p)^(1−y) is a switch written as algebra: when y = 1 it equals p, when y = 0 it equals 1 − p. So it is \"the probability the model gave to what actually happened\", and the loss is minus its log. Example: weights give z = 1, so p = σ(1) ≈ 0.731. If the label is 1 the loss is −ln 0.731 ≈ 0.31; if the label is 0 it is −ln 0.269 ≈ 1.31. Confident and wrong is expensive, and the cost grows without limit as p approaches the wrong extreme.\n\nThere is no closed form because the weights now sit inside the sigmoid: the condition \"gradient = 0\" is no longer a linear system you can solve by matrix algebra, so you iterate.\n\nSoftmax turns K scores into probabilities, e^z for each class divided by the sum. For logits (2, 1, 0): 7.39 ÷ (7.39 + 2.72 + 1) ≈ 0.665. Adding c to every logit multiplies top and bottom by e^c, which cancels; only differences between logits matter. Libraries exploit this. Logits (1000, 999, 998) would overflow e^1000, but subtracting the max gives (0, −1, −2) and the same answer. This is why you pass raw logits to a framework's cross-entropy function and do not apply softmax yourself first.",
  [
   "dlbook-ml",
   "dlbook-mlp"
  ]
 ],
 [
  "Do the chain rule in three links. The loss depends on p: dL/dp = (p − y)/(p(1 − p)). p depends on z: dp/dz = p(1 − p). z depends on w: dz/dw = x. Multiply and the p(1 − p) factors cancel, leaving (p − y)x: error times input. A feature that was zero for this example gets no update; a large error on a large feature gets a large one.\n\nSwap in squared error, ½(p − y)², and the first link becomes just (p − y), so nothing cancels: the gradient is (p − y)·p(1 − p)·x. Now take a confidently wrong prediction, z = −10 with y = 1, so p ≈ 0.00005. Log loss gives a gradient of about −1 per unit of x, a strong push. MSE gives about −1 × 0.00005: the model is as wrong as it can be and learns almost nothing. That is what \"saturation\" means, and the log loss saturates only on the side where the prediction is already correct.\n\nOn Ng's remark: linear regression's update is also (prediction − y)x, but there the prediction is θᵀx, a straight line, while here it is σ(θᵀx). Same formula on the page, different function inside it, hence different behaviour. The shared form is not a coincidence, as his notes go on to show with generalized linear models.",
  [
   "cs229-notes",
   "dlbook-mlp"
  ]
 ],
 [
  "Convex means the loss surface is a single bowl: no separate valleys to get trapped in, so the starting point does not matter. That is the guarantee neural networks give up.\n\nBut a bowl can have a floor that slopes down forever. Take one feature and perfectly separated data: every positive has x = +1, every negative x = −1. The loss per example is ln(1 + e^(−w)). At w = 1 it is 0.31, at w = 5 it is 0.0067, at w = 10 it is 0.00005. Every increase in w makes every prediction more confident and still correct, so the loss always falls, approaching zero without reaching it. In general, if w separates the data then 2w separates it with more confident probabilities, so there is always something better. The optimizer is working correctly as the weights head to infinity.\n\nAn L2 penalty adds a cost that grows with w², which eventually outweighs the shrinking gain, so a finite minimum appears. Early stopping has a similar effect. The practical symptom is enormous coefficients and probabilities of exactly 0 or 1, often caused by a feature that leaks the label.\n\nFisher scoring is just Newton's method here: it uses curvature to take better steps, at the price, Ng notes, of finding and inverting an n-by-n Hessian each iteration.",
  [
   "dlbook-mlp",
   "cs229-notes"
  ]
 ],
 [
  "Why would the model with the worse ceiling learn faster? Naive Bayes assumes the features are independent given the class, so training is just counting: for each word separately, how often does it appear in spam and in non-spam? Each count is a simple frequency, and frequencies settle quickly; Ng and Jordan show that a number of examples logarithmic in the number of parameters is enough for all of them to be close to their limits. But the independence assumption is usually false, so the place it settles is slightly wrong, and no amount of data fixes that.\n\nLogistic regression assumes less. It fits all the weights jointly so that they compensate for correlated features, which gets it to a better limit but needs examples roughly in proportion to the number of parameters.\n\nPut numbers on the quiz case: 5,000 word features. \"Linear in the parameters\" means thousands of emails; \"logarithmic\" means a scale set by ln 5,000 ≈ 8.5. With 300 emails naive Bayes may already be near its plateau while logistic regression is still noisy. The paper's experiments on 15 datasets mostly show this crossover: naive Bayes ahead at first, logistic regression catching up and usually overtaking. So \"which is better?\" has the answer \"at what training-set size?\".",
  [
   "ng-jordan"
  ]
 ]
];
SD.deep["9.3"] = [
 [
  "Impurity scores how mixed a node is: zero when every row has the same class, highest at an even mix. A node with 40 positives and 60 negatives has Gini 0.4 × 0.6 + 0.6 × 0.4 = 0.48. Try a split that sends 30 positives and 10 negatives left, and 10 positives and 50 negatives right. The left child scores 0.375, the right 0.278; weighted by size (40 and 60 rows) that is 0.317. The split is worth a drop of 0.163, and the tree keeps whichever candidate gives the biggest drop.\n\n\"Greedy\" means it never looks ahead or goes back. The scikit-learn guide explains why: finding the optimal tree is NP-complete, so practical algorithms make the locally best decision at each node and cannot guarantee the best tree overall.\n\nLow bias, high variance follows from letting it run. With no depth limit a tree splits until leaves are pure, so it can carve out a region for each training row, noise included. Because every split depends on the ones above it, the guide warns that small variations in the data can produce a completely different tree. A single tree is therefore rarely the final model; it is the unstable ingredient that the next ideas average or add up.",
  [
   "sk-tree-guide"
  ]
 ],
 [
  "A bootstrap resample draws n rows with replacement from the n you have, so each model sees a slightly different dataset and makes slightly different mistakes. Average them and the mistakes that differ cancel; the mistakes they all share do not.\n\nThat is what the formula says. Rewrite v/k + (k − 1)c/k as c + (v − c)/k: a floor c that every member shares, plus a private part that shrinks as you add members. With v = 1 and c = 0.3, ten trees give 0.37, a hundred give 0.307, a thousand give 0.3007. After the first few dozen you are paying for almost nothing, because the floor is the correlation, not the count.\n\nBias does not move because every member is the same kind of model trained the same way; the average of a hundred answers that are each systematically 5% low is still 5% low. So bagging suits models whose problem is instability, such as deep trees, and does little for a stable, biased model such as a linear regression.\n\nThe interviewer's follow-up is \"then how do you lower c?\", which is the next idea: make the trees disagree more.",
  [
   "dlbook-regularization",
   "sk-ensemble-guide"
  ]
 ],
 [
  "Bootstrap resampling alone leaves the trees too alike. If one feature is very predictive, nearly every tree splits on it first, and the trees share most of their structure and most of their errors. Restricting each node to a random subset of features forces variety: with 100 features and √100 = 10 candidates per split, the dominant feature is on offer at only about one node in ten, so other features get to shape the tree. Each tree becomes a little worse on its own, which is the added bias scikit-learn mentions and the reason Breiman says the randomness must keep each tree strong.\n\nThe out-of-bag share is plain arithmetic. One draw misses a given row with probability 1 − 1/n; n draws all miss it with probability (1 − 1/n)^n, which for n = 1,000 is 0.368. So every tree has about a third of the rows it never saw, and every row has about a third of the trees that never saw it. Scoring each row with only those trees gives a test-like error with no data held back.\n\nOne catch from Breiman: that vote uses a third as many trees as the full forest, so on a small forest the OOB error reads somewhat worse than the true error.",
  [
   "breiman-rf",
   "sk-ensemble-guide"
  ]
 ],
 [
  "Ordinary gradient descent nudges parameters. Boosting nudges predictions. Treat the model's output on each training row as the thing being optimized: the gradient of the loss with respect to that output says which way each prediction should move. You cannot move predictions row by row, because that would not generalize, so you fit a small tree to those desired moves and add it. The tree is the step.\n\nFor squared error ½(y − F)², the gradient with respect to F is F − y, so the negative gradient is y − F, the residual. One row as an example: target 10, initial prediction 6, residual 4. With learning rate 0.1 the first tree adds 0.4, leaving 3.6; each round removes a tenth of what is left, so after 50 rounds about 0.9^50 ≈ 0.5% of the gap remains. For other losses the \"residual\" is whatever the gradient says, which is why one algorithm handles regression, classification and ranking.\n\nThe small learning rate means no single tree is trusted much, so an early tree that chased noise can be corrected later. But the process never stops on its own: once the signal is fitted, later trees fit the noise. That is why the tree count is chosen by early stopping on validation data, not set by hand.",
  [
   "sk-ensemble-guide"
  ]
 ],
 [
  "G and H are the sums, over the rows in a leaf, of the loss's first and second derivatives at the current prediction. Approximating the loss to second order, giving the leaf an output w changes the objective by G·w + ½(H + λ)w². That is a parabola, lowest at w = −G/(H + λ), where it is worth −½G²/(H + λ). For squared error each row's first derivative is prediction minus target and its second derivative is 1, so the leaf weight is the sum of residuals divided by (row count + λ): the mean residual, pulled towards zero. With G = −12, H = 5, λ = 1 that is 2.0 instead of 2.4.\n\nThe gain formula is then bookkeeping: score of left leaf plus score of right leaf minus score of the unsplit leaf, minus γ for adding a leaf. The XGBoost tutorial reads it exactly this way and notes that a gain below γ means the branch is better not added, which is pruning derived from the objective.\n\nHistograms attack the cost of finding splits. A numeric column with a million distinct values has a million candidate thresholds; bucket it into 256 bins and there are 255. Leaf-wise growth then spends the leaf budget wherever the gain is largest, giving deep, lopsided trees. That is efficient on big data and risky on a few thousand rows.",
  [
   "xgboost-tutorial",
   "xgboost-chen",
   "lightgbm-docs-features",
   "sk-ensemble-guide"
  ]
 ],
 [
  "The three explanations are about what each model family assumes before seeing data.\n\nIrregular targets: a tree's prediction is a step function, so a rule like \"risk jumps above age 65\" costs one split. A network trained by gradient descent favours smooth functions and needs a lot of data to carve a sharp jump.\n\nUninformative features: a tree ignores a useless column simply by never splitting on it. An MLP mixes every column into every hidden unit from the first layer and has to learn to cancel the useless ones.\n\nRotation invariance ties these together. Rotating the data replaces each column with a weighted blend of all columns. Grinsztajn et al. point out that training an MLP gives the same result before and after such a rotation, since its first layer is itself a blend. So an MLP cannot take advantage of the fact that \"age\" and \"income\" are meaningful axes; they cite Ng's result that any such learner needs samples growing at least linearly with the number of irrelevant features. A tree splits one original column at a time, so the axes are its native language. Scramble the axes with a random rotation and the trees lose that advantage, which is exactly the reversal the paper observed.\n\nWhere it bites: do not promise that a tuned network will beat the GBDT baseline on a 10,000-row table.",
  [
   "grinsztajn-tabular"
  ]
 ]
];
SD.deep["9.4"] = [
 [
  "A minibatch gradient is a sample mean: the average of per-example gradients over the examples you happened to draw. Like any poll, its error shrinks with the square root of the sample size. Going from 100 to 10,000 examples costs 100 times the compute and buys a 10 times cleaner estimate. Spend the same compute on 100 separate steps of 100 examples instead and you move 100 times, each in a roughly right direction. That trade is why minibatch training wins, and why batch size is mostly set by hardware.\n\nThe noise also explains the decaying learning rate. At a minimum the full-data gradient is zero, but that zero is an average: individual examples still pull in different directions and only cancel across the whole dataset. A random minibatch does not cancel exactly, so its gradient is non-zero even at the perfect weights. With a constant learning rate the weights therefore never settle; they jitter around the minimum, with a jitter proportional to the step size. Shrinking the learning rate shrinks the jitter. Full-batch descent has no such problem, since its gradient really does go to zero.\n\nFollow-up to expect: \"why not just use a huge batch then?\" Square-root returns, and the generalization issue covered under the linear scaling rule.",
  [
   "dlbook-optimization"
  ]
 ],
 [
  "Momentum's update is v ← αv − εg, then w ← w + v. If g never changes, the step is ε‖g‖(1 + α + α² + …), a geometric series summing to ε‖g‖/(1 − α). So 1/(1 − α) is the \"memory length\": about 10 steps for 0.9, 100 for 0.99. The benefit shows in what Goodfellow et al. call a long narrow canyon, a poorly conditioned loss. Across the canyon the gradient flips sign every step, so those components cancel in the average; along the canyon it always points the same way, so those components pile up. The same averaging smooths minibatch noise.\n\nAdam replaces the raw gradient with m/√v, where m averages gradients and v averages squared gradients. If a parameter's gradient is steady, m ≈ g and √v ≈ |g|, the ratio is about ±1, and the step is about the learning rate whether the gradient is 0.001 or 1,000. If the gradient keeps flipping sign, m is near zero while √v is not, so the step shrinks. Kingma and Ba call the ratio a signal-to-noise ratio.\n\nBias correction matters only at the start. At step 1, m = 0.1g and v = 0.001g², so the uncorrected ratio is 0.1/√0.001 ≈ 3.2, a step three times too large. Dividing by (1 − β^t) restores it to 1.",
  [
   "dlbook-optimization",
   "adam"
  ]
 ],
 [
  "Under plain SGD the L2 penalty's gradient, λw, is added to the loss gradient and both are multiplied by the same learning rate, so every weight shrinks by the same proportion per step. That is weight decay.\n\nAdam divides each weight's total gradient by that weight's typical gradient size. Take two weights that both equal 1, with λ = 0.01, so each gets a penalty gradient of 0.01. Weight A's loss gradients are typically around 10; weight B's around 0.01. For A the penalty is 0.01 out of roughly 10, about a thousandth of the normalized step. For B it is 0.01 out of roughly 0.02, about half the step. Same weight value, same λ, and B is pushed towards zero hundreds of times harder than A. The weights the loss cares about most escape regularization, which is the reverse of what you would choose.\n\nAdamW applies the shrink directly to the weight, outside the division, so A and B decay at the same rate λ again. And since the decay no longer passes through the adaptive scaling, changing the learning rate does not silently change the regularization strength, so the two can be tuned more independently.\n\nWhere it bites: a \"weight_decay\" value copied from an SGD recipe means something different under Adam with L2, and different again under AdamW.",
  [
   "adamw"
  ]
 ],
 [
  "Read the cosine formula at three points. At the start T_cur/T = 0, cos 0 = 1, and η = η_max. Halfway, cos(π/2) = 0 and η is the midpoint. At the end, cos π = −1 and η = η_min. Because a cosine is flat near its ends, the rate lingers high, drops fastest in the middle and lands gently: a quarter of the way through with η_max = 0.1 and η_min = 0 it is still 0.05 × (1 + 0.707) ≈ 0.085. Compared with step drops there are no drop epochs to choose. SGDR's original idea also included warm restarts, periodically jumping back to η_max; the single half-cosine is the piece in everyday use.\n\nWhy decay at all: large steps make fast progress early, small steps are needed late to settle into a minimum despite gradient noise.\n\nWarmup covers the opposite end. Early in training the network changes quickly, and a large step computed from a gradient that is stale almost immediately does damage. Goyal et al. first tried a low constant rate for five epochs and then a jump to the target; the jump made training error spike. Their fix starts low and adds a constant amount every iteration, reaching the target after five epochs. From 0.1 to 1.6 that is +0.3 per epoch, so 0.7 after two.",
  [
   "sgdr",
   "adamw",
   "goyal-large-minibatch"
  ]
 ],
 [
  "The rule comes from comparing two ways to consume k minibatches. Take k small steps at rate η, or one step at rate kη on a batch k times larger. If the gradient would not have changed much across those k small steps, the two end up in almost the same place. So for a 32-times larger batch (256 to 8,192) the baseline rate of 0.1 becomes 3.2. The assumption fails exactly when the network is changing fast, early in training, which is why the rule needs warmup, and Goyal et al. find it stops working at all beyond roughly 8k on ImageNet.\n\nKeskar et al. describe a separate cost. Compare a wide valley with a narrow crevice of the same depth. The test loss surface is a slightly shifted copy of the training one; shift a wide valley sideways and the loss at your weights barely changes, shift a crevice and it shoots up. Small batches' noisy gradients keep bouncing the weights out of crevices, so they come to rest in wide valleys. Large batches, with little noise, stay in whichever minimum they first reach.\n\nThey stress this is not overfitting: the test curve does not peak and then decline, so early stopping will not rescue it. Their large-batch runs used 10% of the training set per batch.",
  [
   "goyal-large-minibatch",
   "keskar"
  ]
 ],
 [
  "A gradient is a local statement: \"downhill is this way, right here\". Its length is the local steepness, and multiplying it by the learning rate assumes that steepness holds over the whole step. Usually that is close enough. But deep and recurrent networks multiply many weights together, which creates near-vertical walls in the loss surface. On such a wall the gradient is enormous, and a normal step, scaled by it, launches the parameters far across the landscape and can undo most of the training done so far.\n\nNorm clipping keeps the direction and caps the length: if ‖g‖ exceeds the threshold, replace g with g × threshold/‖g‖. A gradient of (30, 40) has norm 50; with threshold 5 it becomes (3, 4). The ratio between components is unchanged, so you still step downhill, just not far. Capping each component separately at 5 would instead give (5, 5), a different direction.\n\nSetting the threshold: log the gradient norm for a while and pick something around its typical value, so ordinary steps pass untouched and only spikes are cut. Pascanu et al. report that training is not very sensitive to the exact number. A warning sign in practice: if nearly every step is being clipped, the threshold is acting as a hidden learning-rate cut, not a safety net.",
  [
   "pascanu",
   "dlbook-optimization"
  ]
 ]
];
SD.deep["9.5"] = [
 [
  "Work the CS231n example: f = (x + y)·z with x = −2, y = 5, z = −4. Forward: the add gate outputs 3 and the multiply gate outputs −12. Backward, start with 1 at the output. A multiply gate's local gradient for each input is the other input, so the add gate's output receives −4 and z receives 3. An add gate's local gradient is +1 for both inputs, so x and y each receive 1 × (−4) = −4. Every gate did one local multiplication and knew nothing about the rest of the circuit.\n\nNotice the multiply gate needed the forward values (3 and −4) to compute its gradients. That is why forward values are cached, and why training needs far more memory than inference: every layer's activations must be kept until the backward pass has used them.\n\nThe dynamic-programming point is about not repeating work. A deep graph has enormous numbers of distinct paths from a weight to the loss. Summing over them one by one would be hopeless; backprop instead stores one number per node, \"how much does the loss change if this node changes\", and each node reuses its downstream neighbours' stored numbers. Each edge is handled once, so a backward pass costs about as much as a forward pass.",
  [
   "cs231n",
   "dlbook-mlp"
  ]
 ],
 [
  "An activation matters twice: for what it outputs, and for the derivative that backprop multiplies by on the way down. The sigmoid's derivative is σ(1 − σ), which peaks at 0.25 when the input is 0 and collapses in the flat tails: at an input of 5 it is about 0.0066. So each sigmoid layer multiplies the gradient by at most a quarter, and ten layers by at most 0.25^10, about a millionth, before the weights are even counted.\n\nReLU's derivative is exactly 1 for positive inputs, so active units pass gradients through undiminished, and 0 for negative ones. The zero side is the catch: a unit gets no learning signal from any example on which it outputs zero, so a unit that is off for every example cannot recover.\n\nGELU multiplies x by Φ(x), the probability that a standard normal falls below x. At x = 3 that is 3 × 0.9987 ≈ 3.0, behaving like ReLU. At x = −1 it is −1 × 0.159 ≈ −0.16, not zero, so small negative inputs still leak a little signal and a little gradient. At x = −3 it is about −0.004. The result is a smooth curve with no hard corner at zero. Hendrycks and Gimpel also give a cheap approximation, x·σ(1.702x).",
  [
   "dlbook-mlp",
   "gelu"
  ]
 ],
 [
  "Symmetry first. If two units in a layer start with identical weights and see the same inputs, they compute the same output, receive the same gradient and get the same update, so they stay identical forever and the layer effectively has one unit fewer. Random initial weights make each unit start as a different detector.\n\nScale second. A unit sums n inputs, each multiplied by a random weight, so its variance is about n × Var(w) × the input variance. If n·Var(w) is above 1 the signal grows at every layer; below 1 it shrinks; and the effect compounds with depth. Keeping it at 1 needs Var(w) = 1/n. The backward pass gives the same condition with fan-out in place of fan-in, so Glorot and Bengio compromise on Var(w) = 2/(n_in + n_out). Their uniform range is just that variance: a uniform on [−a, a] has variance a²/3, and a = √6/√(n_in + n_out) gives 2/(n_in + n_out).\n\nReLU zeroes roughly half its inputs, which halves the signal's second moment, so He et al.'s condition becomes ½·n·Var(w) = 1, that is Var(w) = 2/n. For fan-in 512 the standard deviation is √(2/512) = 0.0625. Use Xavier's 1/n under ReLU and the variance halves per layer: over 30 layers, 2^−30, about a billionth. That fits the stall they observed.",
  [
   "dlbook-optimization",
   "glorot",
   "he-init"
  ]
 ],
 [
  "Compounding is the whole story of vanishing and exploding. Multiply a signal by 0.9 fifty times and 0.5% is left; multiply by 1.1 fifty times and it is 117 times larger. A recurrent net applies the same matrix at every time step, so the same factors compound over the whole sequence. A feedforward net has a different matrix per layer, which gives initialisation and training a chance to balance them.\n\nThe ResNet finding is a different problem. He et al.'s 56-layer plain network had higher training error than the 20-layer one, so it was not overfitting. Their argument: the deeper net could simply copy the shallow one and make its extra layers do nothing, so it should never be worse. The fact that training did not find that solution means \"do nothing\" is hard for a stack of nonlinear layers to learn.\n\nA residual block changes the default. Its output is x + F(x), so with F near zero the block already passes x through unchanged, and learning only has to add corrections. Differentiating gives 1 + F′(x): the gradient always has a direct route back through the \"1\", whatever the layers in F do. The shortcut is an addition, so it adds no parameters.\n\nInterview follow-up: \"why can we train 100-layer networks now?\" Normalisation, good initialisation, and skip connections, in combination.",
  [
   "dlbook-optimization",
   "resnet"
  ]
 ],
 [
  "Picture a layer's activations as a table: one row per example in the batch, one column per unit. Batch norm works down each column: for one unit, take its mean and variance across the examples in the batch, subtract and divide, then apply a learned gain and bias. Layer norm works across each row: for one example, take the mean and variance across all the units in the layer.\n\nEverything else follows from that direction. Batch norm makes an example's output depend on which other examples share its batch. During training that acts as noise, which is the regularising effect; with a small batch the statistics are poor estimates. At inference you want an output that depends only on the input, so the batch statistics are replaced by fixed population estimates collected during training. Forgetting to switch modes is the classic serving bug.\n\nLayer norm uses only the example's own row. It works at batch size 1, needs no stored statistics, and behaves identically in training and inference. It also suits sequences: Ba et al. note it is not obvious how to apply batch norm to recurrent nets, while layer norm simply recomputes its statistics at every time step. That is why Transformers use it, placed after each residual addition in the original design: LayerNorm(x + Sublayer(x)).",
  [
   "batchnorm",
   "layernorm",
   "attention"
  ]
 ],
 [
  "FP16 is a much narrower number format. NVIDIA's guide gives its limits: the largest value is 65,504, the smallest normal value about 6 × 10^−5, the smallest value of all about 6 × 10^−8, with 11 bits of significand. Two things go wrong if you simply train in it.\n\nFirst, small gradients vanish. A gradient of 10^−8 is below the smallest FP16 number and becomes exactly zero; in one network the guide examined, 31% of gradient values became zeros when converted. Loss scaling fixes this with the chain rule: multiply the loss by, say, 1,024 and every gradient is 1,024 times larger, lifting 10^−8 to a representable 10^−5. The gradients are divided back before clipping and before the update, so the learning rate is unaffected. The guide's networks needed factors from 8 to 32K.\n\nSecond, small updates vanish. Eleven bits resolve about one part in 2,000, so adding an update of 10^−6 to a weight of 1.0 changes nothing in FP16. Hence the FP32 primary copy: updates accumulate there, and an FP16 copy is made for each forward pass.\n\nScale too far and gradients overflow to infinity, so the dynamic scheme skips that step and lowers the factor. PyTorch packages the two halves as autocast and GradScaler. Expect less than 2x: if half the runtime speeds up 5x, the total is 1.67x.",
  [
   "amp",
   "pytorch-amp"
  ]
 ]
];
