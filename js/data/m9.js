// Module 9 — ML Fundamentals & Theory: the theory rounds of senior and staff ML interviews (generalization, classic
// models, optimization, deep nets, statistics, unsupervised learning, transformers). Module 8 covers applied design.
(function (T) {

  T({
    "id": "9.1",
    "mod": "9",
    "title": "Generalization and regularization",
    "tag": "Bias, variance, capacity and the knobs that trade them",
    "analogy": "A student revising from past exam papers. One who skims the syllabus fails the mock and the real exam alike (underfitting); one who memorises the past answers word for word aces the mock and fails the new paper (overfitting). Regularization is the tutor's rules: keep your notes short (weight decay, L1), stop drilling when mock scores stop rising (early stopping), revise with random study partners missing (dropout), and practise on reworded questions (augmentation).",
    "points": [
      "Goodfellow, Bengio and Courville name the two central challenges: underfitting, when training error itself is too high, and overfitting, when the gap between training and test error is too large. Both are controlled through capacity, a model's ability to fit a wide variety of functions; adding x² and higher powers as features raises capacity while the model stays linear in its parameters.",
      "The scikit-learn bias–variance example splits expected squared error at a point into bias² (how far the average prediction over training sets is from the best possible model), variance (how much predictions move between training sets) and noise, the irreducible part. Goodfellow et al. note that raising capacity tends to raise variance and lower bias, which gives the classical U-shaped test-error curve.",
      "L2 regularization, or weight decay, shrinks the weights by a constant factor at every step before the gradient update. Goodfellow et al. show it rescales the unregularized optimum along each Hessian eigenvector by λᵢ/(λᵢ + α): directions the loss barely cares about shrink most. It equals MAP inference with a Gaussian prior, and biases are usually left unpenalized. Loshchilov and Hutter show L2 and weight decay coincide for SGD but not for Adam, hence decoupled weight decay (AdamW).",
      "Why L1 gives exact zeros: with a diagonal Hessian, Goodfellow et al. derive that the L1 solution is wᵢ = 0 whenever |wᵢ*| ≤ α/Hᵢᵢ and is otherwise shifted towards zero by α/Hᵢᵢ (soft thresholding). L2 only rescales by Hᵢᵢ/(Hᵢᵢ + α), so a nonzero weight stays nonzero. L1 equals MAP with a Laplace prior; scikit-learn notes the Lasso picks one of a group of correlated features at random, where elastic net tends to keep both.",
      "Implicit regularizers: early stopping keeps the parameters with the lowest validation error, and for a linear model with quadratic loss Goodfellow et al. show it is equivalent to L2, the number of steps times the learning rate acting like 1/α. Dropout (Srivastava et al.) randomly drops units so they cannot co-adapt, approximating an average over exponentially many thinned networks. Data augmentation adds label-preserving transformed copies, since, as Goodfellow et al. put it, training on more data is the best way to generalize better.",
      "Double descent: Belkin et al. find that test risk follows the U-curve up to the interpolation threshold, where training error reaches zero, then falls again as capacity keeps growing. Nakkiran et al. see it in model size, in training epochs and in sample count, where more data can make results worse near the threshold, and conclude that early stopping helps mainly near that critical regime."
    ],
    "pitfall": "Adding λ‖w‖² to the loss, training with Adam, and calling it weight decay. Adam divides each gradient, the penalty's included, by that weight's running gradient magnitude, so weights with large gradients are barely regularized; Loshchilov and Hutter show the two are not equivalent for Adam. Use decoupled weight decay (AdamW) and tune it separately from the learning rate.",
    "say": "Training and validation error tell me which side I'm on. Both high means underfitting, so I add capacity or features. A large gap means overfitting, so I add data or augmentation, decoupled weight decay, dropout, and early stopping on validation loss; L1 if I want a sparse model. I don't assume bigger always overfits: past the interpolation threshold, test error can fall again.",
    "refs": [
      [
        "dlbook-ml",
        "Overfitting defined — “Overfitting occurs when the gap between the training error and test error is too large.”"
      ],
      [
        "dlbook-ml",
        "Capacity — “Informally, a model’s capacity is its ability to fit a wide variety of functions.”"
      ],
      [
        "dlbook-ml",
        "Polynomial features, still linear in the parameters — “the output is still a linear function of the parameters, so we can still use the normal equations to train the model in closed form.”"
      ],
      [
        "dlbook-ml",
        "Capacity trades bias for variance — “increasing capacity tends to increase variance and decrease bias.”"
      ],
      [
        "sklearn-bias-variance",
        "Three terms — “In regression, the expected mean squared error of an estimator can be decomposed in terms of bias, variance and noise.”"
      ],
      [
        "sklearn-bias-variance",
        "Noise is irreducible — “the noise measures the irreducible part of the error which is due the variability in the data.”"
      ],
      [
        "dlbook-regularization",
        "Weight decay per step — “the addition of the weight decay term has modified the learning rule to multiplicatively shrink the weight vector by a constant factor on each step, just before performing the usual gradient update.”"
      ],
      [
        "dlbook-regularization",
        "Rescaling along the Hessian — “the effect of weight decay is to rescale w ∗ along the axes defined by the eigenvectors of H”"
      ],
      [
        "dlbook-regularization",
        "Biases left alone — “we typically choose to use a parameter norm penalty Ω that penalizes only the weights of the affine transformation at each layer and leaves the biases unregularized.”"
      ],
      [
        "dlbook-regularization",
        "L2 does not zero weights; L1 can — “This demonstrates that L 2 regularization does not cause the parameters to become sparse, while L 1 regularization may do so for large enough α.”"
      ],
      [
        "dlbook-regularization",
        "Priors — “L 2 regularization is equivalent to MAP Bayesian inference with a Gaussian prior on the weights.”"
      ],
      [
        "dlbook-regularization",
        "L1 as a Laplace prior — “equivalent to the log-prior term that is maximized by MAP Bayesian inference when the prior is an isotropic Laplace distribution”"
      ],
      [
        "sklearn-linear-models",
        "Lasso zeros coefficients — “The Lasso is a linear model that estimates sparse coefficients, i.e., it is able to set coefficients exactly to zero.”"
      ],
      [
        "sklearn-linear-models",
        "Correlated features — “Lasso is likely to pick one of these at random, while elastic-net is likely to pick both.”"
      ],
      [
        "adamw",
        "Not equivalent under Adam — “L2 regularization and weight decay regularization are equivalent for standard stochastic gradient descent (when rescaled by the learning rate), but as we demonstrate this is not the case for adaptive gradient algorithms, such as Adam.”"
      ],
      [
        "adamw",
        "Who escapes the penalty — “when combined with adaptive gradients, L2 regularization leads to weights with large historic parameter and/or gradient amplitudes being regularized less than they would be when using weight decay.”"
      ],
      [
        "dlbook-regularization",
        "Early stopping ≈ L2 — “in the case of a simple linear model with a quadratic error function and simple gradient descent—early stopping is equivalent to L 2 regularization.”"
      ],
      [
        "dlbook-regularization",
        "Keep the best checkpoint — “by returning to the parameter setting at the point in time with the lowest validation set error.”"
      ],
      [
        "dropout",
        "The idea — “The key idea is to randomly drop units (along with their connections) from the neural network during training. This prevents units from co-adapting too much.”"
      ],
      [
        "dropout",
        "Paper convention: p is the keep probability — “If a unit is retained with probability p during training, the outgoing weights of that unit are multiplied by p at test time”"
      ],
      [
        "pytorch-dropout",
        "PyTorch convention: p is the drop probability — “randomly zeroes some of the elements of the input tensor with probability p”"
      ],
      [
        "dlbook-regularization",
        "More data first — “The best way to make a machine learning model generalize better is to train it on more data.”"
      ],
      [
        "dlbook-regularization",
        "Preserve the label — “One must be careful not to apply transformations that would change the correct class.”"
      ],
      [
        "belkin-double-descent",
        "Past the threshold — “increasing model capacity beyond the point of interpolation results in improved performance.”"
      ],
      [
        "double-descent",
        "Not just model size — “double descent occurs not just as a function of model size, but also as a function of the number of training epochs.”"
      ],
      [
        "double-descent",
        "More data can hurt — “this shifting effect can sometimes result in a setting where more data is worse!”"
      ],
      [
        "double-descent",
        "Where early stopping helps — “early stopping only helps in the relatively narrow parameter regime of critically parameterized models.”"
      ]
    ],
    "cards": [
      [
        "Write the bias–variance decomposition of expected squared error and say what each term means.",
        "E[(y − f̂(x))²] = bias² + variance + noise. Bias: how far the average prediction over training sets is from the best possible model. Variance: how much the prediction moves when the training set changes. Noise: irreducible variability in y given x, which no model can remove."
      ],
      [
        "Why does L1 produce exact zeros when L2 does not?",
        "With a diagonal Hessian, the L1 optimum is a soft threshold: wᵢ = sign(wᵢ*)·max(|wᵢ*| − α/Hᵢᵢ, 0), so small weights land exactly on zero. L2 multiplies by Hᵢᵢ/(Hᵢᵢ + α), which shrinks but never reaches zero. Geometrically, the L1 penalty has a kink at zero; the L2 gradient vanishes there."
      ],
      [
        "What is double descent?",
        "Test error follows the classical U as capacity grows, peaks near the interpolation threshold, where the model can just fit the training set to zero error, and then falls again as capacity grows further (Belkin et al.). Nakkiran et al. also see it over training epochs, and in sample count, where adding data can hurt near the threshold."
      ]
    ],
    "quiz": [
      [
        "At a test point, a model's average prediction across training sets is off from the best possible model by 0.3, its predictions vary across training sets with variance 0.16, and the label noise variance is 0.25. What is the expected squared error there?",
        [
          "0.50",
          "0.71",
          "0.41",
          "0.25"
        ],
        "Expected error = bias² + variance + noise = 0.3² + 0.16 + 0.25 = 0.09 + 0.16 + 0.25 = 0.50. 0.71 forgets to square the bias; 0.41 drops the bias term; 0.25 is the noise alone, the floor that no model can beat.",
        "calc"
      ],
      [
        "An interviewer asks why L1 regularization zeroes weights while L2 only shrinks them. Which answer is right?",
        [
          "L1's optimum is a soft threshold: small weights land exactly on zero",
          "L1 penalizes large weights more heavily than L2 does, pushing them to zero",
          "L2 is applied to biases as well, which keeps every weight from reaching zero",
          "L1 needs a far larger α, and any penalty that strong zeroes most weights"
        ],
        "Goodfellow et al. derive that, with a diagonal Hessian, the L1 solution is zero whenever |wᵢ*| ≤ α/Hᵢᵢ, while L2 rescales by Hᵢᵢ/(Hᵢᵢ + α) and so never reaches zero. The pull of L1 is a constant α·sign(w) however small the weight, whereas the pull of L2, 2αw, fades as the weight shrinks. Biases are usually left unregularized under either penalty.",
        [
          "dlbook-regularization"
        ]
      ],
      [
        "A team trains a transformer with Adam and adds 0.01·‖w‖² to the loss as \"weight decay\". Raising the learning rate changes which weight-decay value works best, and embedding rows with large gradients barely shrink. What is the best fix?",
        [
          "Switch to decoupled weight decay (AdamW) and retune it",
          "Raise the L2 coefficient tenfold so it reaches every weight",
          "Replace the L2 penalty with an L1 penalty of the same size",
          "Lower Adam's epsilon so the penalty gradient is not rescaled"
        ],
        "Loshchilov and Hutter show L2 and weight decay are equivalent for SGD but not for Adam: the penalty's gradient is divided by each weight's running gradient magnitude, so weights with large gradients are regularized less. Decoupling the decay from the gradient step fixes this and separates the best decay from the learning rate. A bigger coefficient or L1 still goes through the same adaptive rescaling, and epsilon is not what causes it.",
        [
          "adamw"
        ]
      ],
      [
        "A layer uses PyTorch nn.Dropout(p=0.2). In training, a unit whose input is 2.0 survives the mask. What value does it pass on, and what happens at evaluation?",
        [
          "2.5 in training; at evaluation inputs pass through unchanged",
          "1.6 in training; at evaluation it passes inputs through unchanged",
          "2.0 in training; at evaluation every output is multiplied by 0.8",
          "2.0 in training; at evaluation every output is multiplied by 0.2"
        ],
        "PyTorch zeroes each element with probability p = 0.2 and scales survivors by 1/(1 − p) = 1.25 during training, so 2.0 → 2.5, and evaluation is the identity. The original paper uses the opposite convention: p is the probability of keeping a unit, and weights are multiplied by p at test time. Mixing up the two conventions is a common slip.",
        [
          "pytorch-dropout",
          "dropout"
        ]
      ],
      [
        "You double a ResNet's width and its test error goes up, although training error falls to about zero. The data has some label noise. What is the most likely explanation and next step?",
        [
          "It sits near the interpolation threshold; try a much larger model, or regularize",
          "It has started to overfit, and test error will only keep rising as width grows",
          "The optimizer has diverged at the larger width; lower the learning rate and retrain",
          "Label noise makes test error meaningless; clean the labels before changing size"
        ],
        "Belkin et al. and Nakkiran et al. find test error peaks around the interpolation threshold, where the model can just fit the training set, and falls again as capacity keeps growing. The classical U-curve story (only rising from here) misses the second descent. A diverged optimizer would not drive training error to zero.",
        [
          "belkin-double-descent",
          "double-descent"
        ]
      ]
    ],
    "explain": [
      "Explain the bias–variance trade-off and how you would diagnose and fix overfitting in a model you are training.",
      [
        "Decomposition: bias² + variance + irreducible noise, and how capacity moves each term",
        "Diagnose with training vs validation error (learning curves): high both = underfit, large gap = overfit",
        "Explicit penalties: L2/weight decay (shrinks; Gaussian prior; decoupled under Adam) and L1 (exact zeros; Laplace prior)",
        "Implicit regularizers: early stopping, dropout, data augmentation; more data first",
        "Modern caveat: double descent past the interpolation threshold, so bigger is not always worse"
      ]
    ],
    "duck": [
      "If my model gets 100% training accuracy, is it necessarily overfitting?",
      "Why would an absolute-value penalty send weights to exactly zero when a squared one doesn't?"
    ],
    "lab": {
      "type": "estimate",
      "brief": "Penalty arithmetic. Assume a quadratic loss with a diagonal Hessian, so each weight can be treated on its own.",
      "fixed": [
        {
          "q": "A weight's unregularized optimum is w* = 0.4, the curvature along it is H = 2, and you add an L1 penalty with α = 1. What is the regularized weight?",
          "a": 0,
          "unit": "",
          "tol": 0,
          "how": "L1 soft-thresholds at α/H = 1/2 = 0.5. Since |0.4| ≤ 0.5, the weight is exactly 0."
        },
        {
          "q": "Same H = 2 and α = 1 with L1, but w* = 3. What is the regularized weight?",
          "a": 2.5,
          "unit": "",
          "tol": 0.01,
          "how": "|3| > 0.5, so the weight is shifted towards zero by α/H = 0.5: 3 − 0.5 = 2.5."
        },
        {
          "q": "Now use an L2 penalty with α = 1 instead, for w* = 3 and H = 2. What is the regularized weight?",
          "a": 2,
          "unit": "",
          "tol": 0.01,
          "how": "L2 rescales by H/(H + α) = 2/3: 3 × 2/3 = 2. Even w* = 0.4 would only shrink to 0.267, never to zero."
        },
        {
          "q": "Along a direction where the Hessian eigenvalue is λ = 0.5, weight decay with α = 1 keeps what fraction of the unregularized optimum?",
          "a": 0.333,
          "unit": "",
          "tol": 0.02,
          "how": "λ/(λ + α) = 0.5/1.5 ≈ 0.333. Low-curvature directions, which the loss barely cares about, are shrunk the most."
        },
        {
          "q": "SGD with learning rate 0.1 and weight decay 0.01 multiplies each weight by (1 − 0.1 × 0.01) every step. If a weight gets no loss gradient for 1,000 steps, what fraction of it is left?",
          "a": 0.368,
          "unit": "",
          "tol": 0.02,
          "how": "0.999^1000 = e^(1000 × ln 0.999) ≈ e^(−1.0005) ≈ 0.368. An unused weight decays to about a third of its value."
        }
      ]
    }
  });

  T({
    "id": "9.2",
    "mod": "9",
    "title": "Linear and logistic models",
    "tag": "Least squares, log loss, and where each loss comes from",
    "analogy": "A stiff rod hung from springs, one spring to each data point. A spring stores energy in proportion to its stretch squared, so the rod settles where the total squared miss is smallest: that is least squares. Logistic regression bends the rod's height through an S-shaped dial into a probability, and each point then tugs on it with a force of (p − y) times its position.",
    "points": [
      "Least squares minimizes ‖Xw − y‖². Setting the gradient to zero gives the normal equations XᵀXw = Xᵀy, so w = (XᵀX)⁻¹Xᵀy (Goodfellow et al.; Ng's CS229 notes). scikit-learn solves it through an SVD of X at O(n·d²) cost; with correlated features XᵀX is close to singular and the estimates become high-variance, which is the problem ridge regression's α‖w‖² penalty addresses.",
      "Why squared error: Ng's notes assume y = θᵀx + ε with ε i.i.d. Gaussian; maximizing the log-likelihood is then exactly minimizing ½Σ(y − θᵀx)², and the answer does not depend on σ². Goodfellow et al. add that the equivalence holds for any model f(x; θ) that predicts the Gaussian's mean. Ng stresses that the Gaussian assumption is sufficient but not necessary to justify least squares.",
      "Logistic regression sets p = σ(wᵀx) and treats y as Bernoulli: the likelihood is p^y(1 − p)^(1−y), and its negative log is the cross-entropy, or log loss. Unlike least squares it has no closed-form solution (Goodfellow et al.), and scikit-learn, noting that despite the name it is a classifier, regularizes it by default. Softmax regression generalizes it to K classes (Ng). Softmax is unchanged by adding a constant to every logit, so libraries compute softmax(z − max z) for numerical stability (Goodfellow et al.).",
      "The per-example gradient of log loss is (p − y)x, because σ′ = σ(1 − σ) cancels against the log. Ng notes that the update looks identical to the least-squares (LMS) rule but is a different algorithm, since p is nonlinear in θ. Goodfellow et al. explain why cross-entropy beats MSE here: the log undoes the sigmoid's exp, so the loss saturates only when the answer is already right, while MSE through a saturated sigmoid gives tiny gradients.",
      "Convexity: Goodfellow et al. note that linear and logistic regression can be fitted in closed form or by convex optimization, which converges from any starting point; a neural network's nonlinearity makes the loss nonconvex. One catch: log loss usually has no minimum, because logistic regression can only approach probabilities of 0 and 1, so on separable data the weights grow without bound unless you regularize. Newton's method on this likelihood is called Fisher scoring (Ng).",
      "Generative or discriminative: a generative model learns p(x, y) and applies Bayes' rule; a discriminative one models p(y | x) directly. Naive Bayes and logistic regression form such a pair. Ng and Jordan show that logistic regression has the lower asymptotic error, but naive Bayes can approach its own higher error with a number of examples only logarithmic in the number of parameters, so naive Bayes can win on small data and logistic regression on large."
    ],
    "pitfall": "Fitting unregularized logistic regression when a feature, often a leaky one, separates the classes perfectly. The log loss then has no minimum: the weights grow every epoch, the predicted probabilities pile up at 0 and 1. Keep the L2 penalty (scikit-learn's default) and check for leakage.",
    "say": "Least squares is maximum likelihood under Gaussian noise; log loss is maximum likelihood for a Bernoulli label, and its gradient is just (p − y)x, error times input. Both are convex for a linear model, so any reasonable solver finds the global optimum. I'd still regularize, because on separable data the logistic loss has no minimum, and with few examples I'd try naive Bayes as a baseline too.",
    "refs": [
      [
        "dlbook-ml",
        "Normal equations — “The system of equations whose solution is given by equation 5.12 is known as the normal equations”"
      ],
      [
        "cs229-notes",
        "Closed form — “Thus, the value of θ that minimizes J(θ) is given in closed form by the equation”"
      ],
      [
        "sklearn-linear-models",
        "How it is solved — “The least squares solution is computed using the singular value decomposition of”"
      ],
      [
        "sklearn-linear-models",
        "Collinearity — “the design matrix becomes close to singular and as a result, the least-squares estimate becomes highly sensitive to random errors in the observed target, producing a large variance.”"
      ],
      [
        "cs229-notes",
        "Gaussian noise gives least squares — “least-squares regression corresponds to finding the maximum likelihood estimate of θ.”"
      ],
      [
        "cs229-notes",
        "Sufficient, not necessary — “the probabilistic assumptions are by no means necessary for least-squares to be a perfectly good and rational procedure”"
      ],
      [
        "dlbook-mlp",
        "Holds for any mean model — “the equivalence holds regardless of the f (x; θ) used to predict the mean of the Gaussian.”"
      ],
      [
        "dlbook-ml",
        "No closed form — “There is no closed-form solution for its optimal weights.”"
      ],
      [
        "sklearn-linear-models",
        "A classifier — “Despite its name, it is implemented as a linear model for classification rather than regression”"
      ],
      [
        "sklearn-linear-models",
        "Regularized by default — “Regularization is applied by default, which is common in machine learning but not in statistics.”"
      ],
      [
        "cs229-notes",
        "Softmax — “is called softmax regression. It is a generalization of logistic regression.”"
      ],
      [
        "dlbook-mlp",
        "Stable softmax — “numerically stable variant of the softmax”"
      ],
      [
        "cs229-notes",
        "Same update, different algorithm — “If we compare this to the LMS update rule, we see that it looks identical; but this is not the same algorithm”"
      ],
      [
        "dlbook-mlp",
        "The log undoes the exp — “the log in the cost function undoes the exp of the sigmoid.”"
      ],
      [
        "dlbook-mlp",
        "Saturates only when right — “Saturation thus occurs only when the model already has the right answer”"
      ],
      [
        "dlbook-mlp",
        "MSE for classification — “mean squared error and mean absolute error often lead to poor results when used with gradient-based optimization.”"
      ],
      [
        "dlbook-mlp",
        "Convex for linear models — “Linear models, such as logistic regression and linear regression, are appealing because they can be fit efficiently and reliably, either in closed form or with convex optimization.”"
      ],
      [
        "dlbook-mlp",
        "Any starting point — “Convex optimization converges starting from any initial parameters”"
      ],
      [
        "dlbook-mlp",
        "No minimum — “it usually does not have a minimum value when applied to the models commonly used in practice.”"
      ],
      [
        "cs229-notes",
        "Newton — “the resulting method is also called Fisher scoring.”"
      ],
      [
        "ng-jordan",
        "Generative defined — “Generative classifiers learn a model of the joint probability, p( x, y), of the inputs x and the label y”"
      ],
      [
        "ng-jordan",
        "Two regimes — “while discriminative learning has lower asymptotic error, a generative classifier may also approach its (higher) asymptotic error much faster.”"
      ],
      [
        "ng-jordan",
        "How much faster — “with a number of training examples that is only logarithmic, rather than linear, in the number of parameters.”"
      ]
    ],
    "cards": [
      [
        "Derive the closed form for least squares. What does it cost and when does it break?",
        "Minimize ‖Xw − y‖²; the gradient 2Xᵀ(Xw − y) = 0 gives XᵀXw = Xᵀy, so w = (XᵀX)⁻¹Xᵀy. scikit-learn solves it with an SVD at O(n·d²). With correlated features XᵀX is near-singular and the estimates have high variance; ridge regression adds α‖w‖² to fix that."
      ],
      [
        "Derive the gradient of logistic loss for one example.",
        "L = −[y log p + (1 − y) log(1 − p)] with p = σ(z), z = wᵀx. Then dL/dp = (p − y)/(p(1 − p)) and dp/dz = p(1 − p), so dL/dz = p − y and ∇w L = (p − y)x. The sigmoid's derivative cancels, so a confidently wrong prediction still gets a large gradient."
      ],
      [
        "Generative vs discriminative: what did Ng and Jordan find?",
        "Generative models (naive Bayes) learn p(x, y); discriminative ones (logistic regression) learn p(y | x). Logistic regression has the lower asymptotic error, but naive Bayes approaches its higher error with examples only logarithmic in the parameter count, so there are two regimes: naive Bayes wins with little data, logistic regression with a lot."
      ]
    ],
    "quiz": [
      [
        "A logistic regression has input x = (1, 2, −1), the first entry being the bias feature, and its current weights give z = wᵀx = 0. The label is y = 1. What is the gradient of the log loss with respect to the weight on the second feature?",
        [
          "−1.0",
          "−0.25",
          "+1.0",
          "−0.5"
        ],
        "p = σ(0) = 0.5, so the gradient is (p − y)·x₂ = (0.5 − 1) × 2 = −1.0, and gradient descent raises that weight. −0.25 is what MSE through the sigmoid gives, (p − y)·p(1 − p)·x₂: the extra p(1 − p) factor is why MSE learns slowly. +1.0 has the sign flipped; −0.5 forgets to multiply by x₂.",
        "calc"
      ],
      [
        "Under which assumption is fitting a linear model by least squares exactly maximum likelihood?",
        [
          "y = wᵀx + ε, where ε is i.i.d. Gaussian noise of any fixed variance",
          "y = wᵀx + ε, with ε i.i.d. Gaussian of a variance known in advance",
          "Each feature xⱼ is Gaussian and independent of the other features",
          "y is Bernoulli with mean σ(wᵀx), observed independently per row"
        ],
        "Ng's notes derive that with i.i.d. Gaussian noise the log-likelihood is a constant minus Σ(y − θᵀx)²/2σ², so the best θ does not depend on σ², which need not be known. Least squares makes no assumption about how the features are distributed, and a Bernoulli label gives log loss, not squared error.",
        [
          "cs229-notes",
          "dlbook-mlp"
        ]
      ],
      [
        "Your unregularized logistic regression trains on a dataset where one feature perfectly separates the classes. Each epoch the training loss falls, the weights keep growing and predictions approach 0 and 1. What is happening?",
        [
          "The log loss has no minimum here; add an L2 penalty or stop early",
          "The learning rate is too high, so the optimizer is diverging from the optimum",
          "The problem is nonconvex, so the solver is stuck drifting along a bad ridge",
          "Too few iterations: run the solver longer until the weights settle down"
        ],
        "Goodfellow et al. note that logistic regression can approach probabilities of 0 and 1 but never reach them, so on separable data the cross-entropy has no minimum and the weights grow without bound. The loss is convex and falling steadily, so this is neither divergence nor a bad local region, and more iterations only make the weights larger. scikit-learn regularizes by default; also check whether the separating feature leaks the label.",
        [
          "dlbook-mlp",
          "sklearn-linear-models"
        ]
      ],
      [
        "You have 300 labelled emails described by 5,000 binary word features and must choose between naive Bayes and logistic regression. What does Ng and Jordan's result suggest?",
        [
          "Naive Bayes may well win at this size; logistic regression with more data",
          "Logistic regression wins at every size, since discriminative models always do",
          "Naive Bayes wins at every size, since it models the full joint distribution",
          "They tie at every size, since they are a generative-discriminative pair"
        ],
        "Ng and Jordan find logistic regression has the lower asymptotic error, but naive Bayes approaches its own higher error much faster, with examples only logarithmic in the number of parameters. With 300 examples and 5,000 features you are likely in the small-data regime where naive Bayes does better; with much more data logistic regression usually overtakes it.",
        [
          "ng-jordan"
        ]
      ],
      [
        "Why is cross-entropy preferred over mean squared error for training a sigmoid classifier?",
        [
          "With MSE a saturated sigmoid gives tiny gradients even when badly wrong",
          "MSE is undefined for labels of 0 and 1, so it cannot be computed for this task",
          "Cross-entropy is cheaper to compute, since it avoids squaring each residual",
          "MSE can only be minimized in closed form, which a sigmoid output prevents"
        ],
        "Goodfellow et al.: MSE with saturating outputs gives very small gradients, while the log in the negative log-likelihood undoes the sigmoid's exp, so the loss saturates only when the answer is already right. MSE is perfectly computable for 0/1 labels, cost is not the issue, and MSE is routinely minimized by gradient descent.",
        [
          "dlbook-mlp"
        ]
      ]
    ],
    "explain": [
      "Derive logistic regression from maximum likelihood and explain how it relates to least squares.",
      [
        "Bernoulli likelihood p^y(1 − p)^(1−y) with p = σ(wᵀx); negative log = cross-entropy",
        "Gradient (p − y)x, from σ′ = σ(1 − σ), and the same form as the LMS update",
        "Least squares is the MLE under Gaussian noise; normal equations and when XᵀX is ill-conditioned",
        "Convex for linear models, but no minimum on separable data, hence regularization",
        "Extensions and context: softmax for K classes; generative (naive Bayes) vs discriminative (Ng & Jordan)"
      ]
    ],
    "duck": [
      "Why does logistic regression use log loss rather than squared error, if both measure how wrong it is?",
      "If logistic regression is convex, why can training on perfectly separable data still go wrong?"
    ],
    "lab": {
      "type": "estimate",
      "brief": "Fit and score linear models by hand. Round to three decimals.",
      "fixed": [
        {
          "q": "Fit y = w·x with no intercept to the points (1, 2), (2, 4), (3, 7) by least squares. What is w?",
          "a": 2.214,
          "unit": "",
          "tol": 0.02,
          "how": "With one feature the normal equation is w = Σxy ÷ Σx² = (2 + 8 + 21) ÷ (1 + 4 + 9) = 31 ÷ 14 ≈ 2.214."
        },
        {
          "q": "A logistic regression has weights w = (0.5, −1) and no bias. For x = (4, 1), what is the predicted probability of class 1?",
          "a": 0.731,
          "unit": "",
          "tol": 0.02,
          "how": "z = 0.5 × 4 − 1 × 1 = 1, and σ(1) = 1 ÷ (1 + e^(−1)) = 1 ÷ 1.368 ≈ 0.731."
        },
        {
          "q": "Same example, but the true label is y = 0. What is its log loss (natural log)?",
          "a": 1.313,
          "unit": "nats",
          "tol": 0.02,
          "how": "−ln(1 − p) = −ln(0.269) ≈ 1.313. A confident wrong answer costs a lot."
        },
        {
          "q": "Same example (y = 0). What is the gradient of the log loss with respect to the first weight?",
          "a": 2.924,
          "unit": "",
          "tol": 0.02,
          "how": "(p − y)·x₁ = (0.731 − 0) × 4 ≈ 2.924. Gradient descent lowers that weight."
        },
        {
          "q": "A 3-class softmax regression outputs logits z = (2, 1, 0). What probability does it give class 1, the one with logit 2?",
          "a": 0.665,
          "unit": "",
          "tol": 0.02,
          "how": "e² ÷ (e² + e¹ + e⁰) = 7.389 ÷ (7.389 + 2.718 + 1) = 7.389 ÷ 11.107 ≈ 0.665. Subtracting max z first gives the same answer: 1 ÷ (1 + e^(−1) + e^(−2))."
        }
      ]
    }
  });

  T({
    "id": "9.3",
    "mod": "9",
    "title": "Trees and ensembles",
    "tag": "Splits, bagging, boosting, and why trees win on tables",
    "analogy": "Valuing a house. Ask one appraiser and you get their quirks; ask a hundred who each saw a different set of comparable sales and average them, and the quirks cancel, unless they all copied the same listing (bagging, and why forests decorrelate). Or hire a relay of editors, each fixing only what the last draft still gets wrong, in small cautious edits (boosting with shrinkage).",
    "points": [
      "A tree grows greedily: at each node it tries candidate splits and keeps the one whose children are purest. The scikit-learn guide defines Gini impurity as Σ p(1 − p) and entropy as −Σ p log p over the class shares in a node, and shows that splitting on entropy is the same as minimising the tree's log loss; regression trees use squared error and predict the leaf mean. A fully grown tree has low bias and high variance.",
      "Bagging trains the same model on bootstrap resamples and averages them. Goodfellow et al. derive the ensemble's expected squared error as v/k + (k − 1)c/k for k members with error variance v and covariance c: independent errors give v/k, perfectly correlated ones give v and no gain. So bagging cuts variance, not bias, which is why scikit-learn calls it a way to reduce the variance of a base estimator such as a tree.",
      "Random forests add a random subset of features at every node so the trees make less correlated errors; Breiman writes that the injected randomness has to lower correlation while keeping each tree strong. scikit-learn's guide suggests √(n_features) per split for classification and all features (plain bagged trees) for regression as good defaults, noting that fewer features cut variance more but add bias. Each bootstrap leaves out about a third of the rows ((1 − 1/n)ⁿ → 1/e ≈ 36.8%), and Breiman's out-of-bag error, scoring each row only with trees that never saw it, removes the need for a held-out test set.",
      "Gradient boosting adds trees one at a time, F_m = F_(m−1) + h_m. The scikit-learn guide derives from a first-order Taylor expansion that each new tree is fitted to the negative gradients of the loss, \"gradient descent in a functional space\"; for squared error those are just the residuals. A learning rate shrinks each step, and the scikit-learn guide, citing Hastie et al., suggests 0.1 or less with enough trees for early stopping to pick the count, because boosting keeps lowering training loss and can overfit.",
      "XGBoost (Chen and Guestrin, 2016) uses a second-order expansion and a regularised objective, Ω = γT + ½λΣw², so a leaf's optimal weight is −G/(H + λ) and a split's gain is ½[G_L²/(H_L + λ) + G_R²/(H_R + λ) − (G_L + G_R)²/(H_L + H_R + λ)] − γ: a split worth less than γ is not made. It adds shrinkage, column subsampling and a learned default direction for missing values. LightGBM buckets each feature into histogram bins (scikit-learn's version uses typically 256), so split search costs O(#bins × #features) instead of sorting, and grows trees leaf-wise, always splitting the leaf with the largest loss reduction, which its docs say can overfit small data unless max_depth is capped.",
      "On medium-sized tables (about 10,000 rows), Grinsztajn et al.'s 2022 benchmark of 45 datasets found tree ensembles still ahead of deep networks after 20,000 compute-hours of tuning per learner. Their explanations: real target functions are irregular while networks are biased to smooth ones; tables carry many uninformative features, which hurt MLPs most; and MLPs are rotation-invariant while tabular columns carry meaning individually. Randomly rotating the data reversed the ranking."
    ],
    "pitfall": "Tuning boosting like a random forest. More trees in a forest only make the average converge (Breiman proves the error tends to a limit), so 'more is safer'. In boosting each tree keeps fitting what is left, including noise, so a large n_estimators without a small learning rate and early stopping on a validation set overfits, and a leaf-wise booster with many leaves on a few thousand rows overfits faster still.",
    "say": "For this tabular problem I'd use a histogram GBDT such as LightGBM or XGBoost's hist mode, with a learning rate around 0.05, early stopping on a time-based validation split, and num_leaves and min-data-per-leaf capped because leaf-wise growth overfits small data. I'd keep a random forest as the robust baseline, since its out-of-bag error is a free estimate. Boosting lowers bias one tree at a time; bagging and feature subsampling lower variance by decorrelating the trees.",
    "refs": [
      [
        "sk-tree-guide",
        "Entropy is log loss — “Using the Shannon entropy as tree node splitting criterion is equivalent to minimizing the log loss (also known as cross-entropy and multinomial deviance)”"
      ],
      [
        "dlbook-regularization",
        "Bagging reuses one model — “Bagging is a method that allows the same kind of model, training algorithm and objective function to be reused several times.”"
      ],
      [
        "dlbook-regularization",
        "Averaging helps when errors are independent (eq. 7.51) — “if the members make independent errors, the ensemble will perform significantly better than its members.”"
      ],
      [
        "sk-ensemble-guide",
        "Bagging targets variance — “These methods are used as a way to reduce the variance of a base estimator (e.g., a decision tree), by introducing randomization into its construction procedure and then making an ensemble out of it.”"
      ],
      [
        "breiman-rf",
        "Decorrelate, but keep trees strong — “To improve accuracy, the randomness injected has to minimize the correlation ρ while maintaining strength.”"
      ],
      [
        "sk-ensemble-guide",
        "max_features trades variance for bias — “The lower the greater the reduction of variance, but also the greater the increase in bias.”"
      ],
      [
        "breiman-rf",
        "About a third left out — “In each bootstrap training set, about one-third of the instances are left out.”"
      ],
      [
        "breiman-rf",
        "OOB replaces a test set — “Therefore, using the out-of-bag error estimate removes the need for a set aside test set.”"
      ],
      [
        "breiman-rf",
        "More trees converge, not overfit — “generalization error for forests converges a.s. to a limit as the number of trees in the forest becomes large.”"
      ],
      [
        "sk-ensemble-guide",
        "Functional gradient descent — “is fitted to predict the negative gradients of the samples . The gradients are updated at each iteration. This can be considered as some kind of gradient descent in a functional space.”"
      ],
      [
        "sk-ensemble-guide",
        "Small learning rate plus early stopping — “Empirical evidence suggests that small values of learning_rate favor better test error.”"
      ],
      [
        "xgboost-chen",
        "Regularised objective — “The additional regularization term helps to smooth the final learnt weights to avoid over-fitting.”"
      ],
      [
        "xgboost-chen",
        "Missing values — “The optimal default directions are learnt from the data.”"
      ],
      [
        "xgboost-tutorial",
        "The split gain, term by term — “This formula can be decomposed as 1) the score on the new left leaf 2) the score on the new right leaf 3) The score on the original leaf 4) regularization on the additional leaf.”"
      ],
      [
        "xgboost-chen",
        "Column subsampling — “According to user feedback, using column sub-sampling prevents over-fitting even more so than the traditional row sub-sampling”"
      ],
      [
        "lightgbm-ke",
        "Histogram split finding — “histogram-based algorithm buckets continuous feature values into discrete bins and uses these bins to construct feature histograms during training.”"
      ],
      [
        "sk-ensemble-guide",
        "Binning makes it fast — “These fast estimators first bin the input samples X into integer-valued bins (typically 256 bins) which tremendously reduces the number of splitting points to consider”"
      ],
      [
        "lightgbm-docs-features",
        "Leaf-wise growth — “Holding #leaf fixed, leaf-wise algorithms tend to achieve lower loss than level-wise algorithms.”"
      ],
      [
        "lightgbm-docs-features",
        "And its risk — “Leaf-wise may cause over-fitting when #data is small, so LightGBM includes the max_depth parameter to limit tree depth.”"
      ],
      [
        "grinsztajn-tabular",
        "Trees still lead on medium data — “remain state-of-the-art on medium-sized data (∼10K samples) even without accounting for their superior speed.”"
      ],
      [
        "grinsztajn-tabular",
        "Three reasons — “1. be robust to uninformative features, 2. preserve the orientation of the data, and 3. be able to easily learn irregular functions.”"
      ],
      [
        "grinsztajn-tabular",
        "Irregular targets — “Such results suggest that the target functions in our datasets are not smooth, and that NNs struggle to fit these irregular functions compared to tree-based models.”"
      ],
      [
        "grinsztajn-tabular",
        "Rotation flips the ranking — “random rotations reverse the performance order: NNs are now above tree-based models”"
      ]
    ],
    "cards": [
      [
        "Why does bagging lower variance but not bias, and what limits it?",
        "Averaging k models with error variance v and covariance c gives v/k + (k − 1)c/k (Goodfellow et al.). The average has the same expected prediction as one model, so bias is unchanged; the variance falls towards c, the shared part. Bootstrap trees are highly correlated, which is why random forests also subsample features at each split."
      ],
      [
        "In what sense is gradient boosting gradient descent?",
        "Each round fits a new tree to the negative gradient of the loss with respect to the current predictions, then adds it, scaled by the learning rate: a gradient step taken in function space, with the tree as the step direction. For squared error the negative gradient is the residual. XGBoost also uses the second derivative, giving leaf weight −G/(H + λ)."
      ],
      [
        "Why do trees still beat deep networks on many tables?",
        "Grinsztajn et al. (2022), 45 datasets of about 10,000 rows: tabular targets are irregular and networks are biased to smooth functions; tables have many uninformative columns, which hurt MLPs most; and MLPs are rotation-invariant, while each column carries its own meaning. Trees split one column at a time, so they keep that orientation."
      ]
    ],
    "quiz": [
      [
        "A forest averages 100 trees. Each tree's error has variance 1, and any two trees' errors have correlation 0.3. Using Goodfellow et al.'s formula v/k + (k − 1)c/k, what is the forest's error variance?",
        [
          "About 0.31: mostly the shared part",
          "0.01: a hundredth of one tree's variance",
          "0.70: the uncorrelated share of the variance",
          "0.10: one over the square root of 100 trees"
        ],
        "c = 0.3 × 1 = 0.3, so 1/100 + 99 × 0.3/100 = 0.01 + 0.297 = 0.307. The 0.01 answer assumes independent trees; 0.70 takes the wrong share; 0.10 confuses the standard error with the variance. The lesson: past a few dozen trees, more trees barely help, while lowering the correlation (fewer features per split) lowers the floor of 0.3.",
        "calc"
      ],
      [
        "A random forest with 30 trees reports an out-of-bag error of 9.0%; a held-out test set gives 8.0%. With 500 trees the two agree. What explains the gap at 30 trees?",
        [
          "Each OOB vote uses only the third of trees that skipped the row",
          "OOB rows were seen in training, which makes the estimate optimistic",
          "Bootstrap duplicates leak labels into the OOB estimate at 30 trees",
          "The test set is too small; OOB error is exact at any forest size"
        ],
        "Breiman: about a third of the rows are left out of each bootstrap, so each OOB prediction combines only about a third as many trees as the full forest (about 10 of 30), and since error falls as trees are added, OOB overestimates error until the forest is past the point where the error has converged. OOB rows are, by construction, ones those trees never saw, so it is not optimistic.",
        [
          "breiman-rf"
        ]
      ],
      [
        "An XGBoost node has gradient sums G_L = −6, H_L = 2 on the left and G_R = 4, H_R = 3 on the right, with λ = 1 and γ = 1. What is the split's gain, and is it made?",
        [
          "≈ 6.67, so the split is made",
          "≈ 7.67, so the split is made",
          "≈ 14.3, so the split is made",
          "≈ −0.33, so the split is pruned"
        ],
        "Gain = ½[36/(2+1) + 16/(3+1) − (−2)²/(5+1)] − 1 = ½[12 + 4 − 0.67] − 1 = 7.67 − 1 = 6.67 > 0, so the split is made. 7.67 forgets γ; 14.3 forgets the ½; a negative gain would mean the split is worth less than γ, which XGBoost's tutorial says is exactly when the branch should not be added.",
        "calc"
      ],
      [
        "A LightGBM model on 5,000 rows uses num_leaves = 255 and no depth limit. Training loss is near zero and validation loss is poor. What do LightGBM's docs point to?",
        [
          "Leaf-wise growth overfits small data; cap max_depth and use fewer leaves",
          "Too few histogram bins; raise max_bin so the splits are more exact",
          "The learning rate is too low; raise it so fewer trees need to be built",
          "Level-wise growth is the cause; switch to leaf-wise to cut the loss"
        ],
        "LightGBM grows the leaf with the largest loss reduction first, which reaches lower training loss for a fixed number of leaves and, its docs warn, can overfit when data is small, hence the max_depth limit. More bins make splits finer, which overfits more; a higher learning rate takes bigger steps; and LightGBM is already leaf-wise.",
        [
          "lightgbm-docs-features"
        ]
      ],
      [
        "A teammate says an MLP lost to XGBoost on a 10,000-row churn table only because it was not tuned enough. What did Grinsztajn et al. (2022) find?",
        [
          "Trees stayed ahead after heavy tuning",
          "Tuned MLPs matched trees on most datasets",
          "MLPs won once features were standardised",
          "Trees won only on data with categoricals"
        ],
        "With a random search of 20,000 compute-hours per learner over 45 datasets, tree ensembles remained state of the art on medium-sized data, on numeric-only as well as mixed benchmarks. The authors trace it to inductive biases: networks prefer smooth functions, are hurt by uninformative features, and are rotation-invariant, while table columns carry individual meaning.",
        [
          "grinsztajn-tabular"
        ]
      ]
    ],
    "explain": [
      "Explain how bagging, random forests and gradient boosting each improve on a single decision tree, and how you would choose among them for a tabular problem.",
      [
        "Greedy splits on Gini/entropy (log loss) or squared error; deep trees are low-bias, high-variance",
        "Bagging averages bootstrap trees: variance v/k + (k − 1)c/k, so correlation sets the floor",
        "Random forests subsample features per split to decorrelate trees; OOB error comes free",
        "Boosting fits each tree to the loss's negative gradient; learning rate and early stopping control overfitting",
        "XGBoost's regularised second-order gain, LightGBM's histograms and leaf-wise growth; trees vs nets on tables (Grinsztajn)"
      ]
    ],
    "duck": [
      "If averaging 100 trees divides the variance by 100, why do random forests also throw away features?",
      "Why does adding trees never hurt a random forest but can hurt a boosted model?"
    ],
    "lab": {
      "type": "estimate",
      "brief": "Tree and ensemble arithmetic: impurity, out-of-bag share, ensemble variance, and an XGBoost leaf.",
      "fixed": [
        {
          "q": "A node holds 40 positives and 60 negatives. What is its Gini impurity, Σ p(1 − p)?",
          "a": 0.48,
          "unit": "",
          "tol": 0.02,
          "how": "0.4 × 0.6 + 0.6 × 0.4 = 0.48 (equivalently 1 − 0.4² − 0.6² = 1 − 0.52)."
        },
        {
          "q": "A split sends 30 positives and 10 negatives left, and 10 positives and 50 negatives right. What is the size-weighted Gini of the two children?",
          "a": 0.317,
          "unit": "",
          "tol": 0.03,
          "how": "Left (40 rows): 2 × 0.75 × 0.25 = 0.375. Right (60 rows): 2 × (1/6) × (5/6) = 0.278. Weighted: 0.4 × 0.375 + 0.6 × 0.278 = 0.150 + 0.167 = 0.317, an impurity decrease of 0.48 − 0.317 ≈ 0.163."
        },
        {
          "q": "A bootstrap sample draws 1,000 rows with replacement from 1,000. What share of the original rows is expected to be left out (out of bag)?",
          "a": 36.8,
          "unit": "%",
          "tol": 0.02,
          "how": "Each row is missed on every draw with probability (1 − 1/1000)^1000 ≈ 0.3677 ≈ 1/e, so about 36.8%: Breiman's 'about one-third'."
        },
        {
          "q": "A forest of 500 trees: each tree's error variance is 1 and the pairwise correlation is 0.2. What is the forest's error variance, v/k + (k − 1)c/k?",
          "a": 0.2016,
          "unit": "",
          "tol": 0.02,
          "how": "1/500 + 499 × 0.2/500 = 0.002 + 0.1996 = 0.2016. Almost all of it is the correlated part, 0.2, which only decorrelating the trees can lower."
        },
        {
          "q": "An XGBoost leaf collects gradient sum G = −12 and Hessian sum H = 5, with λ = 1. What is its optimal weight, −G/(H + λ)?",
          "a": 2,
          "unit": "",
          "tol": 0.02,
          "how": "−(−12)/(5 + 1) = 12/6 = 2.0. Without λ it would be 2.4: the L2 penalty shrinks leaf weights towards zero, and the learning rate then scales the tree's contribution again."
        }
      ]
    }
  });

  T({
    "id": "9.4",
    "mod": "9",
    "title": "Optimization",
    "tag": "SGD, momentum, AdamW, schedules, big batches, clipping",
    "analogy": "Walking down a foggy mountain. Full-batch gradient descent surveys the whole slope before every step; SGD glances at a few square metres and steps, which is noisier but far cheaper. Momentum is a sledge that keeps sliding along the valley floor. Adam gives each boot its own stride length. Warmup is walking slowly until your eyes adjust, the cosine schedule is shortening your stride as you near the hut, and clipping is refusing to leap when the ground suddenly drops away.",
    "points": [
      "Goodfellow, Bengio and Courville call methods that use the whole training set batch or deterministic gradient methods, and those that use more than one but fewer than all examples minibatch stochastic methods. Because the standard error of a mean falls as σ/√n, a gradient from 10,000 examples costs 100 times more than one from 100 but is only 10 times less noisy. SGD's sampling noise does not vanish at a minimum, so its learning rate has to decay over time.",
      "Momentum keeps a velocity, an exponentially decaying average of past negative gradients; Goodfellow et al. say it targets poor conditioning of the Hessian and variance in the stochastic gradient. With constant gradients its step tops out at ε‖g‖/(1−α), so α = 0.9 multiplies the maximum speed by 10. Adam (Kingma and Ba) gives each parameter its own step size from moving averages of the gradient and the squared gradient, and corrects both for starting at zero.",
      "Loshchilov and Hutter show that L2 regularisation and weight decay are the same thing for plain SGD (once rescaled by the learning rate) but not for Adam: the L2 gradient goes through Adam's per-parameter scaling, so weights with large historical gradients are regularised less. AdamW decouples the decay from the gradient step, applies the same rate to every weight, and makes the best decay factor much less dependent on the learning rate.",
      "Schedules: SGDR anneals the learning rate along half a cosine, η = η_min + ½(η_max − η_min)(1 + cos(π·T_cur/T)), and the AdamW paper found cosine annealing clearly better than a fixed rate or step drops in its experiments. Goyal et al. add warmup at the start, because a large learning rate fails while the network is changing fast early in training; their gradual warmup ramps it up over the first 5 epochs.",
      "The linear scaling rule (Goyal et al.): when the minibatch is multiplied by k, multiply the learning rate by k. With warmup it trained ResNet-50 at batch 8,192 in one hour on 256 GPUs while matching batch-256 accuracy, but accuracy degrades quickly past about 8k. Keskar et al. report that large batches tend to converge to sharp minima that generalise worse, a gap they say is not overfitting, and link the flat minima of small batches to gradient noise.",
      "Gradient clipping: Pascanu, Mikolov and Bengio rescale the gradient to a fixed norm whenever its norm passes a threshold, which keeps its direction, and suggest setting the threshold from the average norm over many updates. Goodfellow et al. explain the reason: a gradient gives only the best direction in a tiny region, so near the \"cliffs\" of deep and recurrent nets a full step can throw the parameters far away."
    ],
    "pitfall": "Calling Adam with an L2 penalty \"weight decay\" and tuning it like AdamW. Loshchilov and Hutter show the two differ under Adam: the penalty is divided by each weight's gradient scale, so the weights with the largest gradients are barely regularised, and the best decay value moves every time the learning rate does.",
    "say": "I'd start with AdamW, a short linear warmup and then cosine decay, and clip the global gradient norm at a value set from its typical size. If we raise the batch from 256 to 8k I'd scale the learning rate linearly with a gradual warmup, as Goyal et al. did, and watch for the generalisation gap Keskar et al. tie to sharp minima.",
    "refs": [
      [
        "dlbook-optimization",
        "Square-root returns on batch size — “The latter requires 100 times more computation than the former but reduces the standard error of the mean only by a factor of 10.”"
      ],
      [
        "dlbook-optimization",
        "Why SGD needs a decaying rate — “This is because the SGD gradient estimator introduces a source of noise (the random sampling of m training examples) that does not vanish even when we arrive at a minimum.”"
      ],
      [
        "dlbook-optimization",
        "What momentum is for — “Momentum aims primarily to solve two problems: poor conditioning of the Hessian matrix and variance in the stochastic gradient.”"
      ],
      [
        "dlbook-optimization",
        "Momentum with α = 0.9 — “corresponds to multiplying the maximum speed by 10 relative to the gradient descent algorithm.”"
      ],
      [
        "adam",
        "Per-parameter step sizes — “The method computes individual adaptive learning rates for different parameters from estimates of first and second moments of the gradients”"
      ],
      [
        "adam",
        "Why bias correction — “these moving averages are initialized as (vectors of) 0’s, leading to moment estimates that are biased towards zero”"
      ],
      [
        "adam",
        "The defaults — “Good default settings for the tested machine learning problems are α = 0.001, β1 = 0.9, β2 = 0.999”"
      ],
      [
        "adamw",
        "L2 is not weight decay under Adam — “L2 regularization and weight decay regularization are equivalent for standard stochastic gradient descent (when rescaled by the learning rate), but as we demonstrate this is not the case for adaptive gradient algorithms, such as Adam.”"
      ],
      [
        "adamw",
        "Who gets regularised less — “weights x with large typical gradient magnitude s are regularized by a smaller relative amount than other weights.”"
      ],
      [
        "adamw",
        "Decoupling eases tuning — “decoupled weight decay renders the optimal settings of the learning rate and the weight decay factor much more independent”"
      ],
      [
        "sgdr",
        "Cosine annealing — “Within the i-th run, we decay the learning rate with a cosine annealing for each batch as follows:”"
      ],
      [
        "adamw",
        "Cosine beat the alternatives tested — “Cosine annealing yields clearly superior results.”"
      ],
      [
        "goyal-large-minibatch",
        "The rule — “Linear Scaling Rule: When the minibatch size is multiplied by k, multiply the learning rate by k.”"
      ],
      [
        "goyal-large-minibatch",
        "Why warmup — “for large minibatches (e.g., 8k) the linear scaling rule breaks down when the network is changing rapidly, which commonly occurs in early stages of training.”"
      ],
      [
        "goyal-large-minibatch",
        "Constant warmup was not enough — “a transition out of the low learning rate warmup phase can cause the training error to spike.”"
      ],
      [
        "goyal-large-minibatch",
        "The result — “allowing us to train an accurate 8k minibatch ResNet-50 model in 1 hour on 256 GPUs.”"
      ],
      [
        "goyal-large-minibatch",
        "The limit — “while results are stable for a large range of sizes, beyond a certain point accuracy degrades rapidly.”"
      ],
      [
        "keskar",
        "Sharp minima — “large-batch methods tend to converge to sharp minimizers of the training and testing functions—and as is well known, sharp minima lead to poorer generalization.”"
      ],
      [
        "keskar",
        "Not overfitting — “We emphasize that the generalization gap is not due to over-fitting or over-training as commonly observed in statistics.”"
      ],
      [
        "pascanu",
        "Norm clipping — “one simple mechanism to deal with a sudden increase in the norm of the gradients is to rescale them whenever they go over a threshold”"
      ],
      [
        "pascanu",
        "Choosing the threshold — “One good heuristic for setting this threshold is to look at statistics on the average norm over a sufficiently large number of updates.”"
      ],
      [
        "dlbook-optimization",
        "Why clip — “When the traditional gradient descent algorithm proposes making a very large step, the gradient clipping heuristic intervenes to reduce the step size”"
      ]
    ],
    "cards": [
      [
        "Why is Adam with an L2 penalty not the same as AdamW?",
        "Under Adam the L2 gradient is divided by each parameter's running gradient scale, so weights with large historical gradients are regularised less. AdamW applies the decay directly to the weights, outside the adaptive step, so every weight decays at the same rate and the best decay value depends much less on the learning rate (Loshchilov and Hutter)."
      ],
      [
        "State the linear scaling rule and say where it breaks.",
        "Multiply the batch by k, multiply the learning rate by k, keep other hyperparameters (Goyal et al.). It breaks early in training, when the network changes fast (hence gradual warmup), and beyond a certain batch size; about 8k for ResNet-50 on ImageNet. Keskar et al. also find that large batches tend to reach sharp minima that generalise worse."
      ],
      [
        "Why does Adam bias-correct its moment estimates?",
        "Both moving averages start at zero, so early estimates are biased towards zero, most strongly when β is close to 1. Dividing by (1 − βᵗ) removes that bias; without it, Kingma and Ba found that β₂ close to 1 led to unstable training."
      ]
    ],
    "quiz": [
      [
        "Goyal et al.'s baseline trains ResNet-50 at batch 256 with learning rate 0.1. You move to batch 4,096 on 16× the GPUs. Following their recipe, what learning rate do you train at after warmup?",
        [
          "1.6, reached by ramping up from 0.1 over the first 5 epochs",
          "0.4, scaling the rate by the square root of the 16× batch",
          "0.1, because the per-example gradient does not change",
          "1.6 from step one, since warmup only matters past 8k"
        ],
        "k = 4,096 / 256 = 16, so the linear scaling rule gives 0.1 × 16 = 1.6. Goyal et al. reach it with a gradual warmup from 0.1 over 5 epochs, because the rule breaks down while the network is changing fast early on; a constant low rate followed by a jump made the training error spike. Square-root scaling is a different rule from the one they used.",
        "calc"
      ],
      [
        "A team trains with Adam plus an L2 penalty and finds that the embedding rows with the largest gradients barely shrink, whatever penalty they choose. What do Loshchilov and Hutter say is happening?",
        [
          "Adam divides the penalty gradient by each weight's scale",
          "Bias correction cancels the penalty during the first steps",
          "L2 only acts on biases, so embedding rows are not penalised",
          "The penalty is too small; under Adam it must grow with depth"
        ],
        "With L2 under Adam, the penalty's gradient joins the loss gradient and both are divided by the running gradient magnitude, so weights with large typical gradients are regularised by a smaller relative amount. AdamW decouples the decay from the adaptive step, so every weight decays at the same rate. Bias correction only rescales the early moment estimates.",
        [
          "adamw"
        ]
      ],
      [
        "SGD with momentum sees the same gradient g step after step. With momentum α = 0.99 and learning rate ε, how large does each step eventually get, compared with plain gradient descent's ε‖g‖?",
        [
          "100 times larger",
          "10 times larger",
          "99 times larger",
          "About 1.01 times larger"
        ],
        "Goodfellow et al. give the terminal step size as ε‖g‖/(1 − α). With α = 0.99 that is ε‖g‖/0.01 = 100 ε‖g‖. Their own example: α = 0.9 multiplies the maximum speed by 10. 99 is α/(1 − α) rather than 1/(1 − α); 1.01 is 1/α.",
        "calc"
      ],
      [
        "You raise the batch from 256 to 10% of the dataset. Training loss matches the small-batch run, but test accuracy is several points lower and never peaks then falls. What explanation do Keskar et al. support?",
        [
          "Large batches reach sharper minima, which generalise worse",
          "The model is overfitting, so stopping earlier would close the gap",
          "Large-batch gradients are noisier, so the run cannot settle",
          "Adam's bias correction fails once the batch is very large"
        ],
        "Keskar et al. find that large-batch methods tend to converge to sharp minimizers, while small batches reach flat ones, which they link to gradient noise. They stress that the gap is not overfitting: test accuracy does not peak and then decay. Large batches give less noisy gradients, not more.",
        [
          "keskar"
        ]
      ],
      [
        "An RNN's gradient for one step is (30, 40), norm 50. You clip by norm with threshold 5, as Pascanu et al. do. What gradient goes to the optimizer?",
        [
          "(3, 4), the same direction rescaled to norm 5",
          "(5, 5), each entry capped at 5",
          "(30, 40), as clipping only applies to the loss",
          "(0.6, 0.8), the unit vector in the same direction"
        ],
        "Norm clipping rescales g to threshold × g/‖g‖ = 5 × (30, 40)/50 = (3, 4): same direction, norm 5. Capping each entry at 5 gives (5, 5), which changes the direction; that is the element-wise variant (Mikolov's) that Pascanu et al. describe before their norm version. The unit vector forgets to multiply by the threshold.",
        "calc"
      ]
    ],
    "explain": [
      "Explain how you would choose an optimizer and learning-rate schedule for a large training run, and what you would change if the batch size went up 32×.",
      [
        "Minibatch SGD trades exactness for cheap steps: noise falls only as 1/√batch",
        "Momentum and Adam: velocity, per-parameter step sizes, bias correction",
        "AdamW: weight decay decoupled from the adaptive step, unlike Adam with L2",
        "Warmup, then cosine decay; clip the gradient norm with a measured threshold",
        "Linear scaling rule with gradual warmup, its limits, and the sharp-minima gap"
      ]
    ],
    "duck": [
      "Why doesn't a bigger batch just give a better model?",
      "Why isn't weight decay the same as an L2 penalty when I use Adam?"
    ],
    "lab": {
      "type": "estimate",
      "brief": "Work through the numbers behind the optimizer settings. Baseline: batch 256, learning rate 0.1. Adam defaults β₁ = 0.9, β₂ = 0.999.",
      "fixed": [
        {
          "q": "Linear scaling rule: learning rate at batch 4,096?",
          "a": 1.6,
          "unit": "learning rate",
          "tol": 0.02,
          "how": "k = 4,096 / 256 = 16; 0.1 × 16 = 1.6 (Goyal et al.)."
        },
        {
          "q": "Gradual warmup from 0.1 to 1.6, rising by equal steps over 5 epochs. Learning rate after 2 epochs?",
          "a": 0.7,
          "unit": "learning rate",
          "tol": 0.02,
          "how": "It rises by (1.6 − 0.1)/5 = 0.3 per epoch; 0.1 + 2 × 0.3 = 0.7."
        },
        {
          "q": "Adam at step 1 without bias correction: the update divided by α is m₁/√v₁ = (1 − β₁)g / (√(1 − β₂)|g|). Its value?",
          "a": 3.162,
          "unit": "× α",
          "tol": 0.02,
          "how": "m₁ = 0.1g and v₁ = 0.001g², so 0.1 / √0.001 = 0.1 / 0.031623 = 3.162. With bias correction it is g/|g| = 1, a step of α."
        },
        {
          "q": "Cosine schedule with η_max = 0.1 and η_min = 0, a quarter of the way through the run (T_cur/T = 0.25). Learning rate?",
          "a": 0.0854,
          "unit": "learning rate",
          "tol": 0.02,
          "how": "0.5 × 0.1 × (1 + cos(π/4)) = 0.05 × (1 + 0.70711) = 0.05 × 1.70711 = 0.08536."
        },
        {
          "q": "Gradient (30, 40) clipped by norm at threshold 5. New first component?",
          "a": 3,
          "unit": "",
          "tol": 0,
          "how": "‖g‖ = √(900 + 1,600) = 50 > 5, so g becomes 5 × (30, 40)/50 = (3, 4)."
        }
      ]
    }
  });

  T({
    "id": "9.5",
    "mod": "9",
    "title": "Neural networks",
    "tag": "Backprop, activations, init, normalisation, residuals, mixed precision",
    "analogy": "A long relay of translators passing a message down a line and the corrections back up it. Backprop is each translator fixing only their own step and passing the blame on. A sigmoid translator who mumbles at the extremes loses the correction; good initialisation sets everyone's volume so the message neither fades nor turns into shouting; normalisation re-levels the volume at every desk; a residual connection is a copy of the original note handed straight down the line; mixed precision is writing drafts in pencil and keeping the master copy in ink.",
    "points": [
      "Backpropagation is the chain rule applied backwards through the computation graph. In the CS231n notes, each gate multiplies the gradient arriving from above by its own local gradient, gradients from branches that fork add up, and forward values are cached for the backward pass. Goodfellow et al. call it a table-filling (dynamic-programming) algorithm whose cost is of the same order as the forward computation, linear in the number of edges.",
      "Activations: Goodfellow et al. say sigmoids saturate across most of their domain, so their use as hidden units is now discouraged. ReLU, max(0, z), is easy to optimise because it is nearly linear, but it gets no gradient on examples where it outputs zero. GELU, xΦ(x), weights inputs by their value instead of gating them by sign, and Hendrycks and Gimpel note it became the default in BERT and GPT.",
      "Initialisation must break symmetry: two units with the same inputs need different starting weights (Goodfellow et al.). Glorot and Bengio show the variance of back-propagated gradients can shrink or grow with depth, and propose \"normalized\" initialisation, W ~ U[−√6/√(n_in + n_out), +√6/√(n_in + n_out)], derived for linear activations. He et al. redo the derivation for ReLU and get a Gaussian with standard deviation √(2/n_in); their 30-layer net converged where Xavier initialisation stalled.",
      "Vanishing and exploding gradients: repeatedly multiplying by a matrix scales signals by its eigenvalues to the power t, so any eigenvalue away from magnitude 1 vanishes or explodes; Goodfellow et al. note this hits RNNs hardest because they reuse the same matrix. He et al. found that deeper plain nets trained with batch norm still had higher training error, and argue that this is an optimisation difficulty, not vanishing gradients. Residual blocks learn F(x) and output F(x) + x, so a block can approach an identity map by pushing F to zero, at no extra parameter cost.",
      "Batch norm normalises each unit over the mini-batch; Ioffe and Szegedy report much higher usable learning rates and a regularising effect, and at inference it switches to population statistics. Layer norm (Ba, Kiros and Hinton) normalises over all the units of a layer for a single example, so it does not depend on the batch size, does the same computation at training and test time, and applies at each RNN time step. The original Transformer wraps every sub-layer as LayerNorm(x + Sublayer(x)).",
      "Mixed precision, in NVIDIA's guide: run forward and backward in FP16 for less memory and bandwidth and faster Tensor Core maths, keep a primary FP32 copy of the weights, and multiply the loss by a scale factor so small gradients do not round to zero; unscale before clipping and the update, and skip the step and lower the scale on overflow. PyTorch's autocast picks a precision per op (linear layers and convolutions in FP16 or bfloat16, reductions in FP32) and warns that models pretrained in bfloat16 often overflow FP16's maximum of 65,504."
    ],
    "pitfall": "Serving a batch-norm model in training mode, so each prediction is normalised by whatever else happens to share its batch. Ioffe and Szegedy switch to population statistics at inference so the output depends only on the input; layer norm avoids the problem because it does the same computation at training and test time.",
    "say": "Backprop costs about the same order as the forward pass because each local derivative is computed once and chained. To keep gradients healthy in a deep net I'd use ReLU or GELU with He-style initialisation, residual connections, and layer norm for sequence models or batch norm for large-batch vision, then train in mixed precision with an FP32 primary copy of the weights and dynamic loss scaling.",
    "refs": [
      [
        "cs231n",
        "Local gradient times upstream — “Chain rule says that the gate should take that gradient and multiply it into every gradient it normally computes for all of its inputs.”"
      ],
      [
        "cs231n",
        "Gradients add at forks — “if a variable branches out to different parts of the circuit, then the gradients that flow back to it will add.”"
      ],
      [
        "cs231n",
        "Cache the forward pass — “In practice you want to structure your code so that you cache these variables, and so that they are available during backpropagation.”"
      ],
      [
        "dlbook-mlp",
        "Cost relative to the forward pass — “the number of computations for the gradient computation is of the same order as the number of computations for the forward computation”"
      ],
      [
        "dlbook-mlp",
        "Backprop is dynamic programming — “This table-ﬁlling strategy is sometimes called dynamic programming.”"
      ],
      [
        "dlbook-mlp",
        "Sigmoids saturate — “sigmoidal units saturate across most of their domain”"
      ],
      [
        "dlbook-mlp",
        "So not for hidden layers — “their use as hidden units in feedforward networks is now discouraged.”"
      ],
      [
        "dlbook-mlp",
        "ReLU is easy to optimise — “These units are easy to optimize because they are so similar to linear units.”"
      ],
      [
        "dlbook-mlp",
        "ReLU's blind spot — “on examples for which their activation is zero. Various generalizations of rectiﬁed linear units guarantee that they receive gradient everywhere.”"
      ],
      [
        "gelu",
        "GELU — “The GELU nonlinearity weights inputs by their value, rather than gates inputs by their sign as in ReLUs”"
      ],
      [
        "gelu",
        "Adopted by Transformers — “Things changed as the GELU began to be used in BERT and GPT, becoming the default activation for state-of-the-art Transformers.”"
      ],
      [
        "dlbook-optimization",
        "Break symmetry — “If two hidden units with the same activation function are connected to the same inputs, then these units must have diﬀerent initial parameters.”"
      ],
      [
        "glorot",
        "Depth changes gradient variance — “the variance of the backpropagated gradient might still vanish or explode as we consider deeper networks.”"
      ],
      [
        "glorot",
        "Normalized initialisation's aim — “we suggest the following initialization procedure to approximately satisfy our objectives of maintaining activation variances and back-propagated gradients variance as one moves up or down the network.”"
      ],
      [
        "he-init",
        "Xavier assumes linearity — “Its derivation is based on the assumption that the activations are linear. This assumption is invalid for ReLU and PReLU.”"
      ],
      [
        "he-init",
        "Xavier on a 30-layer ReLU net — “completely stalls the learning, and the gradients are diminishing as monitored in the experiments.”"
      ],
      [
        "dlbook-optimization",
        "Eigenvalues decide — “that are not near an absolute value of 1 will either explode if they are greater than 1 in magnitude or vanish if they are less than 1 in magnitude.”"
      ],
      [
        "dlbook-optimization",
        "Why RNNs suffer most — “Recurrent networks use the same matrix W at each time step, but feedforward networks do not”"
      ],
      [
        "resnet",
        "Degradation — “adding more layers to a suitably deep model leads to higher training error”"
      ],
      [
        "resnet",
        "Not vanishing gradients — “We argue that this optimization difficulty is unlikely to be caused by vanishing gradients.”"
      ],
      [
        "resnet",
        "Why residuals help — “if an identity mapping were optimal, it would be easier to push the residual to zero than to fit an identity mapping by a stack of nonlinear layers.”"
      ],
      [
        "resnet",
        "Free shortcut — “Identity shortcut connections add neither extra parameter nor computational complexity.”"
      ],
      [
        "batchnorm",
        "What batch norm buys — “Batch Normalization allows us to use much higher learning rates and be less careful about initialization. It also acts as a regularizer, in some cases eliminating the need for Dropout.”"
      ],
      [
        "batchnorm",
        "Inference uses population statistics — “using the population, rather than mini-batch, statistics.”"
      ],
      [
        "layernorm",
        "Batch norm's limits — “the effect of batch normalization is dependent on the mini-batch size and it is not obvious how to apply it to recurrent neural networks.”"
      ],
      [
        "layernorm",
        "Per-example statistics — “computing the mean and variance used for normalization from all of the summed inputs to the neurons in a layer on a single training case.”"
      ],
      [
        "layernorm",
        "Gain and bias, like batch norm — “Like batch normalization, we also give each neuron its own adaptive bias and gain”"
      ],
      [
        "layernorm",
        "Same at train and test — “Unlike batch normalization, layer normalization performs exactly the same computation at training and test times.”"
      ],
      [
        "attention",
        "Residual plus layer norm in the Transformer — “the output of each sub-layer is LayerNorm(x + Sublayer(x))”"
      ],
      [
        "amp",
        "Primary weights — “Maintain a primary copy of weights in FP32.”"
      ],
      [
        "amp",
        "Loss scaling — “You can scale the loss values computed in the forward pass, before starting backpropagation. By the chain rule, backpropagation ensures that all the gradient values of the same amount are scaled.”"
      ],
      [
        "amp",
        "Unscale before clipping — “It is simplest to perform this descaling right after the backward pass but before gradient clipping or any other gradient-related computations.”"
      ],
      [
        "amp",
        "Dynamic scaling — “If an overflow occurs, skip the weight update and decrease the scaling factor.”"
      ],
      [
        "amp",
        "Partial speed-ups — “If Tensor Cores provide a 5x speed-up for those operations, then the total speedup will be 1. / (0.5 + (0.5 / 5.)) = 1.67x.”"
      ],
      [
        "pytorch-amp",
        "Per-op precision — “Some ops, like linear layers and convolutions, are much faster in lower_precision_fp . Other ops, like reductions, often require the dynamic range of float32 .”"
      ],
      [
        "pytorch-amp",
        "FP16 range — “most bf16-pretrained models cannot operate in the fp16 numerical range of max 65504”"
      ]
    ],
    "cards": [
      [
        "Why does backprop cost about the same order as the forward pass, not one forward pass per parameter?",
        "It applies the chain rule backwards once, storing each node's gradient in a table (dynamic programming), so every local derivative is computed once with one multiply and one add per edge. Goodfellow et al. show the cost is linear in the number of graph edges, the same order as the forward computation."
      ],
      [
        "Batch norm vs layer norm: what is averaged over, and when do you pick each?",
        "Batch norm averages each unit over the mini-batch and uses population statistics at inference; it depends on the batch size. Layer norm averages over a layer's units for one example, so training and test match and it works per time step in RNNs. Transformers use layer norm; batch norm came from large-batch image models."
      ],
      [
        "Why does mixed-precision training need loss scaling, and where does unscaling go?",
        "Small FP16 gradients round to zero. Multiplying the loss by S scales every gradient by S through the chain rule, which keeps them representable. Divide by S after the backward pass and before clipping and the update, so the clipping threshold and weight decay need no change; with dynamic scaling, skip the step and lower S on overflow (NVIDIA halves it in its example)."
      ]
    ],
    "quiz": [
      [
        "A 10-layer network uses sigmoid activations. The sigmoid's derivative σ(1 − σ) is at most 0.25. Ignoring the weights, by how much can the activation derivatives alone shrink a gradient on its way from the top layer to the bottom?",
        [
          "To at most about one millionth (0.25¹⁰ ≈ 9.5 × 10⁻⁷)",
          "To at most a quarter, since each layer's factors are added",
          "To at most 0.25 ÷ 10 = 0.025, spread across the 10 layers",
          "Not at all: the chain rule keeps gradient norms unchanged"
        ],
        "The chain rule multiplies one local derivative per layer: 0.25¹⁰ = 1/1,048,576 ≈ 9.5 × 10⁻⁷, and that is the best case, at z = 0. Goodfellow et al. give saturation across most of the domain as the reason sigmoids are discouraged as hidden units. Local gradients multiply along a path; they add only where branches fork.",
        "calc"
      ],
      [
        "A recommendation model with batch norm scores the same user differently depending on which other requests land in its serving batch. What is the most likely cause?",
        [
          "Inference uses batch statistics, not population ones",
          "The learning rate was too high for batch norm's scale",
          "Batch norm needs layer norm stacked after it at serving",
          "The model's ReLUs are dead for this particular user"
        ],
        "Batch norm normalises with mini-batch statistics during training; Ioffe and Szegedy switch to population statistics at inference so the output depends only on the input. Running in training mode at serving time ties each score to its batch-mates. Layer norm would avoid this by design, but stacking it after batch norm does not fix it.",
        [
          "batchnorm",
          "layernorm"
        ]
      ],
      [
        "A ReLU layer has fan-in 512. Using He et al.'s initialisation, what standard deviation do you draw its Gaussian weights from?",
        [
          "√(2/512) = 0.0625, scaled up to make up for ReLU zeroing half",
          "√(1/512) ≈ 0.044, the linear-case variance that Xavier keeps",
          "2/512 ≈ 0.0039, using the variance formula as the std directly",
          "0.01 for every layer, a fixed std common in earlier deep nets"
        ],
        "He et al. derive Var[w] = 2/n for ReLU, so std = √(2/512) = √0.0039 = 0.0625. The linear-case derivation gives 1/n (std ≈ 0.044); they note Xavier's std is 1/√2 of theirs and that it stalled their 30-layer model. He et al. also note that a fixed std such as 0.01 left very deep models (more than 8 conv layers) struggling to converge.",
        "calc"
      ],
      [
        "He et al.'s 34-layer plain network, trained with batch norm, has higher training error than their 18-layer one. Which explanation do they give?",
        [
          "An optimisation difficulty, not vanishing gradients",
          "Overfitting, because the deeper model has more parameters",
          "Vanishing gradients, since batch norm does not reach that deep",
          "Too little data for 34 layers, so test error rises first"
        ],
        "Training error, not just test error, is higher, so it is not overfitting. He et al. checked that with batch norm the forward signals have non-zero variance and the backward gradients have healthy norms, and argue the difficulty is unlikely to be vanishing gradients. Residual connections make the identity easy to reach by pushing F(x) to zero.",
        [
          "resnet"
        ]
      ],
      [
        "You switch a model to FP16 mixed precision. Training tracks FP32 at first, then stalls, and many weight gradients come back exactly zero. What does NVIDIA's guide recommend?",
        [
          "Scale the loss up, then unscale gradients before clipping and the update",
          "Clip gradients first, then multiply the loss by the scale factor",
          "Keep the weights only in FP16 so that the update rounds less",
          "Lower the learning rate until the zero gradients become non-zero"
        ],
        "Small gradients underflow to zero in FP16. Multiplying the loss by S scales every gradient by S through the chain rule; unscale right after the backward pass and before clipping, so thresholds and weight decay keep their meaning, and keep a primary FP32 copy of the weights for the update. Lowering the learning rate does not make a zero gradient non-zero.",
        [
          "amp",
          "pytorch-amp"
        ]
      ]
    ],
    "explain": [
      "Explain why deep networks can be hard to train, and the techniques that make a 100-layer network trainable.",
      [
        "Backprop multiplies local derivatives; its cost is the same order as the forward pass",
        "Saturating activations and badly scaled weights make gradients vanish or explode",
        "Initialisation scaled to fan-in: Glorot for linear/tanh, He for ReLU",
        "Normalisation: batch norm (mini-batch statistics) vs layer norm (per example)",
        "Residual connections so a block can default to the identity; mixed precision with loss scaling"
      ]
    ],
    "duck": [
      "Why is backprop not just \"run the forward pass once per parameter\"?",
      "Why can a deeper plain network have higher training error than a shallower one?"
    ],
    "lab": {
      "type": "seq",
      "parts": [
        {
          "type": "estimate",
          "brief": "Work out the numbers behind backprop, initialisation and mixed precision.",
          "fixed": [
            {
              "q": "f = x · y with x = 3, y = −4. The gradient arriving at f from above is 2. What is the gradient on x?",
              "a": -8,
              "unit": "",
              "tol": 0,
              "how": "The local gradient of a multiply gate for x is y = −4; chain rule: −4 × 2 = −8."
            },
            {
              "q": "He initialisation: standard deviation for a ReLU layer with fan-in 512?",
              "a": 0.0625,
              "unit": "",
              "tol": 0.02,
              "how": "√(2/512) = √0.00390625 = 0.0625."
            },
            {
              "q": "Glorot \"normalized\" uniform initialisation for a 256 → 256 layer: the limit √6/√(n_in + n_out)?",
              "a": 0.1083,
              "unit": "",
              "tol": 0.02,
              "how": "√6 / √512 = 2.4495 / 22.627 = 0.10825."
            },
            {
              "q": "Best case for 10 sigmoid layers: 0.25¹⁰. Give the answer in units of 10⁻⁷.",
              "a": 9.54,
              "unit": "× 10⁻⁷",
              "tol": 0.02,
              "how": "0.25¹⁰ = 1/4¹⁰ = 1/1,048,576 = 9.537 × 10⁻⁷."
            },
            {
              "q": "Half the training time is in Tensor Core operations, which mixed precision speeds up 5×; the rest is unchanged. Overall speed-up?",
              "a": 1.67,
              "unit": "×",
              "tol": 0.02,
              "how": "1 / (0.5 + 0.5/5) = 1 / 0.6 = 1.67× (NVIDIA's own example)."
            }
          ]
        },
        {
          "type": "sort",
          "brief": "Batch norm, layer norm, or both?",
          "buckets": [
            "Batch norm",
            "Layer norm",
            "Both"
          ],
          "items": [
            [
              "Statistics taken over the examples in a mini-batch",
              0
            ],
            [
              "Statistics taken over one example's units in a layer",
              1
            ],
            [
              "Switches to population statistics at inference",
              0
            ],
            [
              "Exactly the same computation at training and test time",
              1
            ],
            [
              "Its effect depends on the mini-batch size",
              0
            ],
            [
              "Applied separately at each time step of an RNN",
              1
            ],
            [
              "Learns a per-unit gain and bias after normalising",
              2
            ],
            [
              "Wraps each sub-layer in the original Transformer",
              1
            ],
            [
              "Its paper says it can, in some cases, replace dropout",
              0
            ]
          ]
        }
      ]
    }
  });

  T({
    "id": "9.6",
    "mod": "9",
    "title": "Probability and statistics for ML",
    "tag": "Bayes, likelihood and honest uncertainty",
    "analogy": "A smoke alarm that catches every real fire but also goes off for burnt toast. Because toast burns far more often than kitchens catch fire, most alarms are toast. Statistics for ML is the habit of asking how often the alarm rings for toast, and how sure you are of that rate, before you trust the alarm.",
    "points": [
      "Bayes' rule turns P(evidence | class) into P(class | evidence): P(x | y) = P(x) P(y | x) / P(y), with P(y) obtained by summing over classes (Goodfellow et al., ch. 3). The prior P(x) is the base rate. When prevalence is below a test's false-positive rate, positives are mostly false: at 2% prevalence, a 5% false-positive rate and perfect recall, 1,000 tests give 20 true and 49 false positives, so a positive means only a 29% chance of disease (the worked example on Wikipedia's base-rate page).",
      "Maximum likelihood picks the parameters that make the training data most probable. Goodfellow et al. show this is the same as minimising the KL divergence from the empirical distribution to the model, that is, the cross-entropy: log loss is maximum likelihood for a Bernoulli or softmax output, and mean squared error is maximum likelihood under Gaussian noise. If the true distribution is in the model family and maps to a single parameter value, the estimate is consistent: it converges to the truth as data grows.",
      "The common distributions map onto output heads and losses: Bernoulli (parameter φ, mean φ, variance φ(1 − φ)) for binary labels, categorical for softmax classes, Gaussian for real-valued noise, Laplace for a sharp peak at zero. Goodfellow et al. justify the Gaussian default by the central limit theorem and because, for a given variance, it assumes the least. Estimators can be biased: the sample variance that divides by m has bias −σ²/m.",
      "MAP estimation adds a log prior, θ_MAP = argmax log p(x | θ) + log p(θ); Goodfellow et al. show that a Gaussian prior N(0, (1/λ)I) on the weights gives the λwᵀw weight-decay penalty (L2), and an isotropic Laplace prior gives L1. The prior lowers the variance of the estimate at the price of bias. Not every regulariser is a prior: some penalties depend on the data, which a prior may not.",
      "A p-value is the probability, computed as if every model assumption including the null were true, that the test statistic would be at least as large as the one observed (Greenland et al., 2016). The American Statistical Association's 2016 statement says what it is not: not the probability that the hypothesis is true, not the probability the data arose by chance alone, not a measure of effect size or importance, and not a sound basis for decisions on its own by passing a threshold.",
      "A 95% confidence interval comes from a procedure that covers the truth in 95% of valid repetitions, not a 95% chance for any one interval (Greenland et al.); for a test-set error Goodfellow et al. use mean ± 1.96·σ/√m, and where no formula exists the bootstrap resamples with replacement and reads the interval off the recomputed statistics. Testing many hypotheses inflates false positives: Benjamini–Hochberg controls the false discovery rate, the expected share of rejections that are wrong, and in SciPy's 15-test example rejects 4 where Bonferroni rejects 3."
    ],
    "pitfall": "Reading p = 0.01 as \"a 1% chance the new model is no better\". The p-value is computed assuming the null is true, so it cannot be the probability of the null; that needs a prior and Bayes' rule. Greenland et al. put this first in their list of 25 common misinterpretations, and the ASA statement makes it its second principle.",
    "say": "Before trusting the 0.4-point offline gain I'd bootstrap the test set, resampling examples and scoring both models on each resample, to get a 95% interval on the difference. I'd report that interval rather than a bare p-value, and since we compared twelve variants, control the false discovery rate with Benjamini–Hochberg instead of keeping every p below 0.05.",
    "refs": [
      [
        "dlbook-prob",
        "Bayes' rule needs the prior — “Fortunately, if we also know P ( x ), we can compute the desired quantity using Bayes’ rule”"
      ],
      [
        "wikipedia-base-rate-fallacy",
        "Rare classes, mostly false alarms — “even tests that have a very low risk of giving a false positive in an individual case will give more false than true positives overall”"
      ],
      [
        "dlbook-ml",
        "Maximum likelihood as distribution matching — “We can thus see maximum likelihood as an attempt to make the model distribution match the empirical distribution”"
      ],
      [
        "dlbook-ml",
        "MSE is Gaussian maximum likelihood — “mean squared error is the cross-entropy between the empirical distribution and a Gaussian model”"
      ],
      [
        "dlbook-ml",
        "Consistency — “as the number of training examples approaches infinity, the maximum likelihood estimate of a parameter converges to the true value of the parameter”"
      ],
      [
        "dlbook-prob",
        "Why the Gaussian is the default — “The central limit theorem shows that the sum of many independent random variables is approximately normally distributed.”"
      ],
      [
        "dlbook-ml",
        "A biased estimator — “Therefore, the sample variance is a biased estimator.”"
      ],
      [
        "dlbook-ml",
        "L2 = MAP with a Gaussian prior — “MAP Bayesian inference with a Gaussian prior on the weights thus corresponds to weight decay.”"
      ],
      [
        "dlbook-ml",
        "The trade — “This additional information helps to reduce the variance in the MAP point estimate (in comparison to the ML estimate). However, it does so at the price of increased bias.”"
      ],
      [
        "dlbook-regularization",
        "L1 = MAP with a Laplace prior — “equivalent to the log-prior term that is maximized by MAP Bayesian inference when the prior is an isotropic Laplace distribution”"
      ],
      [
        "greenland-pvalues",
        "The definition — “The P value is then the probability that the chosen test statistic would have been at least as large as its observed value if every model assumption were correct, including the test hypothesis.”"
      ],
      [
        "asa-pvalue",
        "ASA principle 2 — “P-values do not measure the probability that the studied hypothesis is true, or the probability that the data were produced by random chance alone.”"
      ],
      [
        "asa-pvalue",
        "ASA principle 5 — “A p-value, or statistical significance, does not measure the size of an effect or the importance of a result.”"
      ],
      [
        "greenland-pvalues",
        "Coverage belongs to the procedure — “this coverage probability is a property of a long sequence of confidence intervals computed from valid models, rather than a property of any single confidence interval”"
      ],
      [
        "scipy-bootstrap",
        "The bootstrap step — “take a random sample of the original sample (with replacement) of the same size as the original sample”"
      ],
      [
        "scipy-fdr",
        "What FDR means — “The false discovery rate (FDR) is the expected proportion of rejected null hypotheses that are actually true.”"
      ],
      [
        "wikipedia-fdr",
        "The BH step-up rule, with P(k) the k-th smallest of m p-values — “For a given α , find the largest k for which P ( k ) ≤ k m α”"
      ]
    ],
    "cards": [
      [
        "Why is L2 regularisation \"MAP with a Gaussian prior\"?",
        "θ_MAP = argmax log p(data | θ) + log p(θ). With w ~ N(0, (1/λ)I), log p(w) = −(λ/2)wᵀw + constant, so maximising the posterior means minimising the negative log-likelihood plus a weight-decay penalty. A Laplace prior gives an L1 penalty the same way (Goodfellow et al.)."
      ],
      [
        "A test gives p = 0.03. What does that mean, and what does it not mean?",
        "If every assumption, including the null, were true, a statistic at least this extreme would turn up about 3% of the time. It is not the probability the null is true, not the chance the result is a fluke, and says nothing about how large or important the effect is (ASA 2016; Greenland et al. 2016)."
      ],
      [
        "Bonferroni or Benjamini–Hochberg?",
        "Bonferroni tests each of m hypotheses at α/m and controls the family-wise error rate (any false positive at all). BH sorts the p-values and rejects the k smallest, where k is the largest index with p(k) ≤ (k/m)α; it controls the expected share of false discoveries and has more power. BH assumes independent or positively dependent tests; Benjamini–Yekutieli handles any dependence."
      ]
    ],
    "quiz": [
      [
        "A fraud model has 90% recall and a 2% false-positive rate, and 0.5% of transactions are fraud. A transaction is flagged. Roughly what is the chance it is fraud?",
        [
          "About 18%",
          "About 90%, the recall",
          "About 98%, one minus the FPR",
          "About 50%, as positives split"
        ],
        "True positives: 0.005 × 0.9 = 0.0045. False positives: 0.995 × 0.02 = 0.0199. P(fraud | flag) = 0.0045 ÷ 0.0244 ≈ 18%. The false positives outnumber the frauds four to one because fraud is rarer than the false-positive rate. 90% is the recall, P(flag | fraud), the conditional the wrong way round.",
        "calc"
      ],
      [
        "You fit logistic regression by minimising log loss + λ‖w‖². In Bayesian terms, what are you computing?",
        [
          "The MAP estimate under a zero-mean Gaussian prior on the weights",
          "The maximum likelihood estimate, as the penalty leaves the optimum alone",
          "The posterior mean under an isotropic Laplace prior on weights",
          "The full posterior over the weights, with its covariance matrix"
        ],
        "Log loss is the negative log-likelihood, and λ‖w‖² is, up to a constant, the negative log of a zero-mean Gaussian prior, so the minimiser is the MAP estimate; Goodfellow et al. say MAP with a Gaussian prior corresponds to weight decay. A Laplace prior would give an L1 penalty, and MAP returns a single point, not a posterior with a covariance.",
        [
          "dlbook-ml",
          "dlbook-regularization"
        ]
      ],
      [
        "An A/B test of a new ranker gives p = 0.01 against the null of no difference in click rate. Which statement is correct?",
        [
          "A difference this large would be rare if there were truly none and the test's assumptions held",
          "There is a 1% chance that the new ranker is no better than the old one",
          "There is a 99% chance a repeat of the test would also give p < 0.05",
          "The improvement is large enough to matter for the product"
        ],
        "Greenland et al. define the p-value as the probability of a statistic at least this extreme if every assumption, the null included, were correct. The ASA statement says it does not measure the probability that the hypothesis is true, nor the size or importance of the effect, and Greenland et al. add that it does not predict replication.",
        [
          "greenland-pvalues",
          "asa-pvalue"
        ]
      ],
      [
        "A paper reports a 95% confidence interval of [0.8, 2.4] points for a model's gain. Which reading is correct?",
        [
          "Over many repeats, 95% of intervals built this way cover the true gain",
          "There is a 95% probability that the true gain lies between 0.8 and 2.4",
          "95% of future studies will report a gain between 0.8 and 2.4 points",
          "Gains below 0.8 points have been ruled out by these data"
        ],
        "Greenland et al.: coverage is a property of the procedure over many valid repetitions, not of one interval; a given interval either contains the true value or not. A probability statement about the true gain needs a prior and gives a Bayesian credible interval. They also list \"future estimates fall inside\" and \"values outside are refuted\" as misreadings.",
        [
          "greenland-pvalues"
        ]
      ],
      [
        "You compare 10 variants with a baseline and get p = 0.001, 0.008, 0.012, 0.019, 0.030, 0.041, 0.090, 0.20, 0.45, 0.80. How many discoveries do Benjamini–Hochberg (q = 0.05) and Bonferroni (α = 0.05) make?",
        [
          "BH 4, Bonferroni 1",
          "BH 6, Bonferroni 1",
          "BH 4, Bonferroni 4",
          "BH 6, Bonferroni 3"
        ],
        "BH thresholds are (k/10) × 0.05 = 0.005, 0.010, 0.015, 0.020, 0.025, …. The 4th p-value, 0.019, is under 0.020; the 5th, 0.030, is over 0.025, and no later one passes its threshold, so k = 4. Bonferroni tests each at 0.05 ÷ 10 = 0.005, and only 0.001 passes. \"BH 6\" counts the p-values below 0.05 with no correction.",
        "calc"
      ]
    ],
    "explain": [
      "Explain how maximum likelihood, cross-entropy loss and L2 regularisation are related, and when you would want more than a point estimate.",
      [
        "Maximum likelihood = minimising KL from the empirical distribution = minimising cross-entropy",
        "Log loss is Bernoulli/softmax maximum likelihood; MSE is maximum likelihood under Gaussian noise",
        "MAP adds log p(θ): a Gaussian prior gives L2 (weight decay), a Laplace prior gives L1",
        "The prior trades variance for bias; not every regulariser is a prior",
        "A full posterior or an interval matters when decisions depend on uncertainty, e.g. small data or rare classes"
      ]
    ],
    "duck": [
      "Why isn't a p-value the probability that the null hypothesis is true?",
      "Why does a 99%-accurate detector raise mostly false alarms when the thing it looks for is rare?"
    ],
    "lab": {
      "type": "estimate",
      "brief": "Bayes, intervals and multiple testing, worked by hand.",
      "fixed": [
        {
          "q": "A harmful-content classifier has 99% recall and a 1% false-positive rate. 1 in 1,000 posts is harmful. What share of flagged posts are actually harmful?",
          "a": 9.0,
          "unit": "%",
          "tol": 0.05,
          "how": "Per 100,000 posts: 100 harmful, 99 caught. 99,900 benign × 1% = 999 false flags. 99 ÷ (99 + 999) = 99 ÷ 1,098 ≈ 9.0%. A \"99% accurate\" detector is wrong about 91% of the time it fires."
        },
        {
          "q": "A model errs on 5% of a 10,000-example test set. What is the half-width of the normal-approximation 95% confidence interval, in percentage points?",
          "a": 0.43,
          "unit": "points",
          "tol": 0.05,
          "how": "Bernoulli variance φ(1 − φ) = 0.05 × 0.95 = 0.0475. SE = √(0.0475 ÷ 10,000) ≈ 0.00218. Half-width = 1.96 × 0.00218 ≈ 0.0043, about 0.43 points, so the interval is roughly 4.6% to 5.4%."
        },
        {
          "q": "You test 20 independent features, none of which has any real effect, each at α = 0.05. What is the chance of at least one \"significant\" result?",
          "a": 64,
          "unit": "%",
          "tol": 0.03,
          "how": "P(no false positive) = 0.95²⁰ ≈ 0.358, so P(at least one) ≈ 1 − 0.358 = 0.642, about 64%. Bonferroni (test each at 0.0025) brings it back under 5%."
        },
        {
          "q": "You estimate a Gaussian's variance (true σ² = 10) from m = 5 samples with the sample variance that divides by m. What is its expected value?",
          "a": 8,
          "unit": "",
          "tol": 0.01,
          "how": "Goodfellow et al. give the bias as −σ²/m = −10 ÷ 5 = −2, so the expected value is 10 − 2 = 8, i.e. σ²(m − 1)/m. Dividing by m − 1 removes the bias."
        }
      ]
    }
  });

  T({
    "id": "9.7",
    "mod": "9",
    "title": "Unsupervised learning",
    "tag": "Clusters, components, anomalies, embeddings",
    "analogy": "A librarian handed 10,000 unlabelled books. She piles them by resemblance (k-means), finds the two or three properties that separate them most, such as length and era (PCA), notices the odd volume that one or two questions set apart from everything else (isolation forest), and learns that two editions of the same book belong together while any other pair does not (contrastive learning).",
    "points": [
      "k-means minimises inertia, the within-cluster sum of squared distances to each centroid. Lloyd's algorithm alternates two steps, assign every point to its nearest centroid and move each centroid to the mean of its points; Arthur and Vassilvitskii note the error never increases, so it terminates, but solving the problem exactly is NP-hard even for two clusters, and scikit-learn warns it may stop in a local minimum. Inertia assumes convex, isotropic clusters and handles elongated ones poorly.",
      "k-means++ seeds the centroids with D² weighting: each new centre is a point chosen with probability proportional to its squared distance from the nearest centre already chosen. Arthur and Vassilvitskii prove this alone is Θ(log k)-competitive, E[φ] ≤ 8(ln k + 2)φ_OPT, and it is scikit-learn's init option, usually with several restarts. Inertia cannot choose k by itself, since it keeps falling as k grows (k = n gives zero); the silhouette, (b − a)/max(a, b), runs from −1 to +1 and, scikit-learn notes, favours convex clusters.",
      "PCA finds successive orthogonal directions of maximum variance (scikit-learn). Goodfellow et al. show the components are the right singular vectors of the centred data matrix, X = UΣWᵀ, and that the projected features are uncorrelated (diagonal covariance); the top components also give the best linear reconstruction in squared error. scikit-learn's PCA centres but does not scale features, and whiten=True rescales each component to unit variance, useful when a downstream model such as an RBF SVM or k-means assumes isotropic data.",
      "Anomaly detection comes in two settings in scikit-learn's guide: outlier detection, where the training data is already polluted, and novelty detection, where it is clean. Isolation forest (Liu, Ting and Zhou, 2008) uses the fact that anomalies are 'few and different': random features and random split values isolate them in short paths, scored s = 2^(−E[h(x)]/c(n)), near 1 for anomalies and about 0.5 everywhere when there is none, with small subsamples (256) and linear time. A one-class SVM learns a frontier around normal data, with nu the share of normal points allowed outside it; scikit-learn says it is sensitive to outliers in training data, so it suits novelty detection better.",
      "Contrastive learning trains embeddings by telling a matching pair from distractors. CPC's InfoNCE loss is the cross-entropy of picking the one positive among N candidates, and minimising it maximises a lower bound on mutual information, I ≥ log N − L, so more negatives give a tighter bound. SimCLR uses two augmentations of each image and treats the other 2(N − 1) in the batch as negatives, gains from larger batches and stronger augmentation, and keeps the layer before its projection head; CLIP does the same across N × N image–text pairs with a batch of 32,768. Wang and Liu show a small temperature focuses the penalty on the hardest negatives.",
      "The curse of dimensionality: Goodfellow et al. note that distinguishing v values on each of d axes takes O(vᵈ) cells, so most cells hold no training example. Beyer et al. show that under broad conditions the distance to the nearest point approaches the distance to the farthest as dimension grows, from as few as 10–15 dimensions, though data with structure, such as clusters, can escape it. scikit-learn notes Euclidean distances inflate in high dimensions and suggests PCA before k-means."
    ],
    "pitfall": "Running k-means or PCA on raw features in mixed units, such as dollars beside counts. Both work on Euclidean variance, and scikit-learn's PCA centres but does not scale, so the widest column becomes the first component and decides the clusters. Then reading a falling inertia curve as support for a larger k: inertia always falls as k grows. Standardise first, and choose k with a silhouette or with what the clusters are for.",
    "say": "For the clustering I'd standardise, reduce with PCA to the components that hold most of the variance, run k-means with k-means++ seeding and several restarts, and choose k by silhouette and by whether the segments are usable. For fraud, where the training data already contains unlabelled fraud, I'd use an isolation forest rather than a one-class SVM. For embeddings, an InfoNCE objective with in-batch negatives and a tuned temperature, then check nearest-neighbour contrast on our real data.",
    "refs": [
      [
        "sk-clustering-guide",
        "Inertia's assumption — “Inertia makes the assumption that clusters are convex and isotropic, which is not always the case.”"
      ],
      [
        "sk-clustering-guide",
        "Local minima — “Given enough time, K-means will always converge, however this may be to a local minimum.”"
      ],
      [
        "kmeanspp",
        "Lloyd's steps never raise the error — “One can check that the total error φ is monotonically decreasing, which ensures that no clustering is repeated during the course of the algorithm.”"
      ],
      [
        "kmeanspp",
        "Exact k-means is hard — “Solving this problem exactly is NP-hard, even with just two clusters”"
      ],
      [
        "kmeanspp",
        "D² seeding's guarantee — “we obtain an algorithm that is Θ(log k)-competitive with the optimal clustering.”"
      ],
      [
        "sk-clustering-guide",
        "Silhouette range — “The score is bounded between -1 for incorrect clustering and +1 for highly dense clustering.”"
      ],
      [
        "sk-decomposition-guide",
        "PCA maximises variance — “orthogonal components that explain a maximum amount of the variance”"
      ],
      [
        "dlbook-ml",
        "Via the SVD — “The principal components may also be obtained via singular value decomposition (SVD).”"
      ],
      [
        "dlbook-ml",
        "Decorrelated features — “It also learns a representation whose elements have no linear correlation with each other.”"
      ],
      [
        "sk-decomposition-guide",
        "Centres, does not scale — “PCA centers but does not scale the input data for each feature before applying the SVD.”"
      ],
      [
        "sk-decomposition-guide",
        "Whitening — “The optional parameter whiten=True makes it possible to project the data onto the singular space while scaling each component to unit variance.”"
      ],
      [
        "sk-outlier-guide",
        "Novelty detection — “The training data is not polluted by outliers and we are interested in detecting whether a new observation is an outlier.”"
      ],
      [
        "iforest-liu",
        "Few and different — “anomalies are ‘few and different’, which make them more susceptible to isolation than normal points.”"
      ],
      [
        "sk-outlier-guide",
        "Short paths — “Random partitioning produces noticeably shorter paths for anomalies.”"
      ],
      [
        "iforest-liu",
        "Reading the score — “if all the instances return s ≈ 0.5, then the entire sample does not really have any distinct anomaly.”"
      ],
      [
        "sk-outlier-guide",
        "One-class SVM's nu — “corresponds to the probability of finding a new, but regular, observation outside the frontier.”"
      ],
      [
        "sk-outlier-guide",
        "Not for polluted data — “The svm.OneClassSVM is known to be sensitive to outliers and thus does not perform very well for outlier detection.”"
      ],
      [
        "cpc",
        "InfoNCE is a classification loss — “The loss in Equation 4 is the categorical cross-entropy of classifying the positive sample correctly”"
      ],
      [
        "cpc",
        "A bound on mutual information — “minimizing the InfoNCE loss LN maximizes a lower bound on mutual information.”"
      ],
      [
        "simclr",
        "In-batch negatives — “we treat the other 2(N − 1) augmented examples within a minibatch as negative examples.”"
      ],
      [
        "simclr",
        "Batch size — “Contrastive learning benefits from larger batch sizes and longer training compared to its supervised counterpart.”"
      ],
      [
        "simclr",
        "Use the layer before the head — “the layer before the projection head, h, is still much better (>10%) than the layer after”"
      ],
      [
        "clip",
        "CLIP's batch — “We use a very large minibatch size of 32,768.”"
      ],
      [
        "contrastive-temperature",
        "Temperature and hard negatives — “contrastive loss with small temperature tends to penalize much more on the hardest negative samples”"
      ],
      [
        "dlbook-ml",
        "Empty cells — “a typical grid cell has no training example associated with it.”"
      ],
      [
        "beyer-nn",
        "Distance concentration — “as dimensionality increases, the distance to the nearest data point approaches the distance to the farthest data point.”"
      ],
      [
        "beyer-nn",
        "Early onset — “this effect can occur for as few as 10-15 dimensions.”"
      ],
      [
        "beyer-nn",
        "Not always — “we illustrate this point by identifying some high-dimensional workloads for which this effect does not occur.”"
      ],
      [
        "sk-clustering-guide",
        "Distances inflate — “in very high-dimensional spaces, Euclidean distances tend to become inflated”"
      ]
    ],
    "cards": [
      [
        "What does Lloyd's algorithm do, and what does k-means++ change?",
        "Lloyd's: assign each point to its nearest centroid, move each centroid to the mean of its points, repeat until nothing moves. The error never rises, but it can stop in a poor local minimum. k-means++ only changes the start: each new seed is drawn with probability proportional to its squared distance from the nearest seed so far, which gives an expected error within 8(ln k + 2) of optimal."
      ],
      [
        "How does an isolation forest score a point?",
        "Build random trees, each splitting on a random feature at a random value between its min and max, on small subsamples (256 rows). Anomalies, being few and different, are isolated in short paths. The score s = 2^(−E[h]/c(n)) normalises the average path length by that of an unsuccessful search in a binary search tree: near 1 means anomalous, about 0.5 everywhere means no distinct anomalies."
      ],
      [
        "What is the curse of dimensionality, concretely?",
        "Two effects. Coverage: v values on each of d axes means vᵈ cells, so almost every cell is empty of training data (Goodfellow et al.). Distance concentration: under broad conditions, the nearest and farthest neighbours become almost equally far, from as few as 10–15 dimensions (Beyer et al.). Real data with low intrinsic dimension or clusters can escape the second."
      ]
    ],
    "quiz": [
      [
        "k-means++ has placed its first centre. The three remaining points lie at distances 1, 2 and 3 from it. With what probability is the farthest point chosen as the second centre?",
        [
          "About 64%, which is 9/14",
          "About 50%, which is 3/6",
          "About 33%, one in three",
          "100%: farthest-first rule"
        ],
        "D² weighting: the weights are 1² + 2² + 3² = 14, so the farthest point is chosen with probability 9/14 ≈ 64%. 3/6 weights by plain distance; one in three is uniform seeding, which k-means++ replaces; always taking the farthest point is a deterministic rule that outliers would capture. Squared distance keeps a random element while favouring spread-out seeds.",
        "calc"
      ],
      [
        "A contrastive model scores each anchor against 1,024 candidates, one of them positive, with an InfoNCE loss in nats. At initialisation all scores are equal. What is the loss?",
        [
          "≈ 6.93, that is ln 1024",
          "≈ 0.69, which is ln 2, as a binary task",
          "≈ 3.47, which is half of ln 1024",
          "≈ 0.001, which is 1/1024"
        ],
        "InfoNCE is the cross-entropy of picking the positive among N candidates (CPC). With equal scores the positive gets probability 1/1024, so the loss is −ln(1/1024) = ln 1024 ≈ 6.93. The bound I ≥ log N − L is then 0, and can never exceed ln N ≈ 6.93 nats, which is one reason more negatives help.",
        "calc"
      ],
      [
        "A card-fraud team wants anomaly scores from a year of transactions. Nobody has labelled them, and some unknown share is fraud. Which method does scikit-learn's guide point towards?",
        [
          "Isolation forest; a one-class SVM is easily skewed by outliers in training",
          "A one-class SVM; its nu parameter is the share of fraud expected in training",
          "k-means with k = 2; the smaller of the two clusters is taken as the fraud",
          "PCA alone; any point with a large first-component score is the fraud"
        ],
        "Training data that already contains anomalies is outlier detection, not novelty detection. scikit-learn says the one-class SVM is sensitive to outliers and does not do well there, while isolation forest performs reasonably well. Nu is the share of normal points allowed outside the frontier, not a fraud rate; and k-means assumes anomalies form a cluster, whereas outlier methods assume they sit in low-density regions.",
        [
          "sk-outlier-guide",
          "iforest-liu"
        ]
      ],
      [
        "A teammate says nearest-neighbour search over 256-dimensional item embeddings is meaningless because of the curse of dimensionality. What does Beyer et al.'s paper support?",
        [
          "Contrast can vanish from 10–15 dimensions, yet structured data may escape it",
          "Distances stay meaningful as long as the space has fewer than 1,000 dimensions",
          "Nearest-neighbour search is meaningless above 15 dimensions, whatever the data",
          "Only Euclidean distance concentrates; cosine similarity is unaffected by it"
        ],
        "Beyer et al. prove that under broad conditions the nearest and farthest distances converge as dimension grows, and show it from as few as 10–15 dimensions, but they also identify high-dimensional workloads where it does not happen, such as clustered data. The practical answer is to measure the nearest-to-farthest contrast on your own embeddings rather than assume either way.",
        [
          "beyer-nn"
        ]
      ],
      [
        "After SimCLR pre-training, an engineer feeds the projection-head outputs z = g(h) into a linear classifier. What did the SimCLR paper find?",
        [
          "The encoder output h, before the head, is much better",
          "z is better, since the loss was computed on it",
          "h and z score about the same in linear evaluation",
          "The head should be kept and fine-tuned with labels"
        ],
        "SimCLR reports that the layer before the projection head is better by more than 10% in linear evaluation, and conjectures that the contrastive loss makes z discard information useful downstream, such as colour or orientation. The head is thrown away after pre-training; it still matters during training, where a nonlinear head beat no head by more than 10%.",
        [
          "simclr"
        ]
      ]
    ],
    "explain": [
      "Explain how you would find structure in an unlabelled dataset: clusters, a compact representation, anomalies and embeddings, and what goes wrong in high dimensions.",
      [
        "k-means objective, Lloyd's two steps, local minima, k-means++ D² seeding, choosing k",
        "PCA as variance maximisation via the SVD of centred data; scaling and whitening",
        "Isolation forest's short paths vs one-class SVM's frontier; outlier vs novelty settings",
        "InfoNCE: cross-entropy over one positive and N − 1 negatives; batch size, temperature, projection head",
        "Curse of dimensionality: empty cells, distance concentration, and why structure can rescue you"
      ]
    ],
    "duck": [
      "Why can't I just pick the k with the lowest inertia?",
      "Why do anomalies end up near the root of a random tree?"
    ],
    "lab": {
      "type": "estimate",
      "brief": "Clustering, PCA, isolation and dimensionality arithmetic.",
      "fixed": [
        {
          "q": "Points on a line at 1, 2, 3, 10 and 11, with k-means centroids at 2 and 10.5. What is the inertia (sum of squared distances to the nearest centroid)?",
          "a": 2.5,
          "unit": "",
          "tol": 0.02,
          "how": "(1−2)² + 0 + (3−2)² + (10−10.5)² + (11−10.5)² = 1 + 0 + 1 + 0.25 + 0.25 = 2.5."
        },
        {
          "q": "A covariance matrix has eigenvalues 6, 3 and 1. What share of the variance do the first two principal components explain?",
          "a": 90,
          "unit": "%",
          "tol": 0.01,
          "how": "(6 + 3) ÷ (6 + 3 + 1) = 9 ÷ 10 = 90%."
        },
        {
          "q": "Same data with whiten=True. By what factor is the first component's projection divided to give it unit variance?",
          "a": 2.449,
          "unit": "×",
          "tol": 0.02,
          "how": "Its variance is 6, so divide by √6 ≈ 2.449; the second is divided by √3 ≈ 1.732 and the third by 1."
        },
        {
          "q": "Ten distinguishable values on each of 6 features. With 100,000 training examples, at most what share of the grid cells can hold even one example?",
          "a": 10,
          "unit": "%",
          "tol": 0.01,
          "how": "10⁶ = 1,000,000 cells; 100,000 examples fill at most 100,000 of them = 10%, and real data, which clumps, fills far fewer."
        },
        {
          "q": "Isolation forest with subsamples of 256: c(n) = 2H(n − 1) − 2(n − 1)/n, with H(i) ≈ ln i + 0.5772. What is c(256)?",
          "a": 10.24,
          "unit": "",
          "tol": 0.02,
          "how": "H(255) ≈ ln 255 + 0.5772 = 5.5413 + 0.5772 = 6.1185. c = 2 × 6.1185 − 2 × 255/256 = 12.237 − 1.992 = 10.245."
        },
        {
          "q": "A point's average path length across the trees is half of c(n). What is its anomaly score s = 2^(−E[h]/c(n))?",
          "a": 0.707,
          "unit": "",
          "tol": 0.02,
          "how": "2^(−0.5) = 1/√2 ≈ 0.707: above 0.5, so more anomalous than typical, but not the near-1 score of a clear anomaly."
        }
      ]
    }
  });

  T({
    "id": "9.8",
    "mod": "9",
    "title": "Transformers from first principles",
    "tag": "Attention, positions, tokens, FLOPs and scaling",
    "analogy": "A conference hall where everyone holds up a question card (query), wears a name badge (key) and carries notes (value). Each person glances at every badge, decides how relevant it is to their question, and walks away with a blend of the matching notes. Several halls run at once with different questions (heads), and in a decoder you may only read the badges of people who arrived before you. The catch: with n people there are n² glances.",
    "points": [
      "Vaswani et al. (2017) define Attention(Q, K, V) = softmax(QKᵀ/√d_k)V: each query scores every key, the softmax turns scores into weights, and the output is the weighted mix of values. If query and key components are independent with unit variance, q·k has variance d_k, and large logits push the softmax into regions with extremely small gradients; dividing by √d_k restores unit variance. Without the scaling, dot-product attention lost to additive attention at large d_k.",
      "Multi-head attention runs h attention functions on separate learned projections of size d_k = d_model/h and concatenates the results, so different heads can attend to different subspaces and positions; because each head is narrower, the total cost is close to one full-width head (the original used h = 8, d_k = 64). A decoder must not see the future, so the mask sets the logits of future positions to −∞ before the softmax. nanoGPT does this with a lower-triangular mask, or passes is_causal=True to PyTorch's fused kernel.",
      "BPE (Sennrich et al., 2015) starts from characters and repeatedly merges the most frequent adjacent pair, the number of merges being its only hyperparameter; tokenization shows up in behaviour, as GPT-3.5 and GPT-4 do arithmetic far better when commas force right-to-left digit grouping (Singh and Strouse). Attention ignores order, so the original Transformer added sinusoids, hoping they would extrapolate to longer sequences, while RoPE (Su et al.) rotates queries and keys so their inner product depends only on the relative offset and decays with distance.",
      "Kaplan et al. count non-embedding parameters as N ≈ 12·n_layer·d_model² (per layer, 4d² for the Q, K, V and output projections and 8d² for an MLP four times as wide). A forward pass costs about 2N FLOPs per token, a multiply and an add per weight, plus 2·n_layer·n_ctx·d_model for attending over the context. Counting the backward pass as twice the forward gives C ≈ 6N FLOPs per training token, so training costs about 6ND; the context term stays small while d_model is above n_ctx/12.",
      "Self-attention costs O(n²·d) per layer against O(n·d²) for a recurrent layer, but needs O(1) sequential steps instead of O(n), and the n × n score matrix is the memory problem. FlashAttention (Dao et al., 2022) computes exact attention in tiles held in on-chip SRAM with running softmax statistics, never writes the full matrix to GPU HBM, and recomputes it in the backward pass. It does more FLOPs but far fewer memory reads and writes: up to 7.6× faster attention on GPT-2, with memory linear in sequence length.",
      "Kaplan et al. (2020) found loss falls as a power law in parameters, data and compute, and that a fixed budget is best spent on a very large model stopped well short of convergence (N ∝ C^0.73). Hoffmann et al. (2022) matched the learning-rate schedule to each run, which Kaplan had held fixed, and found parameters and tokens should grow equally (both about C^0.5). Their Chinchilla, 70B parameters on 1.4T tokens (20 per parameter) with Gopher's budget, outperformed the 280B Gopher."
    ],
    "pitfall": "Quoting 6N FLOPs per token for inference. 6N is training: a forward pass of about 2N plus a backward pass costing about twice that. Inference is about 2N per generated token, N excludes the embedding matrices, and at long context the attention term 2·n_layer·n_ctx·d_model is no longer small. Kaplan et al. drop it only because their models have d_model above n_ctx/12.",
    "say": "A 7B dense model on 2T tokens costs about 6 × 7×10⁹ × 2×10¹² ≈ 8.4×10²² FLOPs. At 40% utilisation of an accelerator with a 10¹⁵ FLOP/s peak, that is about 2.1×10⁸ device-seconds, roughly 2,400 device-days. Chinchilla's ratio of about 20 tokens per parameter would suggest 140B tokens; training on far more costs extra compute now but buys a smaller, cheaper model to serve.",
    "refs": [
      [
        "attention",
        "The mechanism (the √ is lost in the PDF text) — “We compute the dot products of the query with all keys, divide each by dk , and apply a softmax function to obtain the weights on the values.”"
      ],
      [
        "attention",
        "Why scale — “the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients”"
      ],
      [
        "attention",
        "The variance argument (footnote 4) — “has mean 0 and variance dk”"
      ],
      [
        "attention",
        "Evidence for scaling — “additive attention outperforms dot product attention without scaling for larger values of dk”"
      ],
      [
        "attention",
        "Why several heads — “Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.”"
      ],
      [
        "attention",
        "Heads are cheap — “Due to the reduced dimension of each head, the total computational cost is similar to that of single-head attention with full dimensionality.”"
      ],
      [
        "attention",
        "Causal masking — “masking out (setting to −∞) all values in the input of the softmax which correspond to illegal connections”"
      ],
      [
        "nanogpt",
        "The mask in code — “att = att.masked_fill(self.bias[:,:,:T,:T] == 0, float('-inf'))”"
      ],
      [
        "bpe",
        "The BPE merge step — “We iteratively count all symbol pairs and replace each occurrence of the most frequent pair (‘A’, ‘B’) with a new symbol ‘AB’.”"
      ],
      [
        "bpe",
        "One hyperparameter — “The final symbol vocabulary size is equal to the size of the initial vocabulary, plus the number of merge operations”"
      ],
      [
        "tokarith",
        "Tokenization changes arithmetic — “right-to-left tokenization (enforced by comma separating numbers at inference time) leads to largely improved performance”"
      ],
      [
        "attention",
        "Why sinusoids — “We chose the sinusoidal version because it may allow the model to extrapolate to sequence lengths longer than the ones encountered during training.”"
      ],
      [
        "rope",
        "RoPE's goal — “we hope that the inner product encodes position information only in the relative form”"
      ],
      [
        "rope",
        "Decay with distance — “We study the properties of RoPE and show that it decays with the relative distance increased”"
      ],
      [
        "kaplan",
        "What N counts — “We use N to denote the model size, which we define as the number of non-embedding parameters”"
      ],
      [
        "kaplan",
        "Where the 2 comes from — “where the factor of two comes from the multiply-accumulate operation used in matrix multiplication”"
      ],
      [
        "kaplan",
        "Where the 6 comes from — “Accounting for the backwards pass (approximately twice the compute as the forwards pass), we then define the estimated non-embedding compute as C ≈ 6N floating point operators per training token.”"
      ],
      [
        "attention",
        "Parallel but quadratic — “a self-attention layer connects all positions with a constant number of sequentially executed operations, whereas a recurrent layer requires O(n) sequential operations”"
      ],
      [
        "flash",
        "IO-aware tiling — “an IO-aware exact attention algorithm that uses tiling to reduce the number of memory reads/writes between GPU high bandwidth memory (HBM) and GPU on-chip SRAM”"
      ],
      [
        "flash",
        "More FLOPs, less time — “Even with the increased FLOPs due to recomputation, our algorithm both runs faster (up to 7.6x on GPT-2 [67], Figure 1 right) and uses less memory—linear in sequence length—than standard attention”"
      ],
      [
        "kaplan",
        "Kaplan's allocation — “optimally compute-efficient training involves training very large models on a relatively modest amount of data and stopping significantly before convergence”"
      ],
      [
        "chinchilla",
        "Chinchilla's allocation — “for every doubling of model size the number of training tokens should also be doubled”"
      ],
      [
        "chinchilla",
        "Why the answers differ — “First, the authors use a fixed number of training tokens and learning rate schedule for all models”"
      ],
      [
        "chinchilla",
        "The test — “We verify this by training a more compute-optimal 70B model, called Chinchilla, on 1.4 trillion tokens.”"
      ]
    ],
    "cards": [
      [
        "Why divide attention logits by √d_k?",
        "If query and key components are independent with mean 0 and variance 1, q·k has variance d_k. Large logits saturate the softmax into a near one-hot regime with tiny gradients. Dividing by √d_k restores unit variance; Vaswani et al. report that unscaled dot products lost to additive attention at large d_k."
      ],
      [
        "Where does N ≈ 12·n_layer·d_model² come from?",
        "Per layer: the Q, K, V and output projections are each d × d (4d²), and the MLP maps d → 4d → d (8d²), so 12d² per layer. Kaplan et al. leave out embeddings, biases and norms. Forward cost ≈ 2N FLOPs per token; training ≈ 6N per token, so ≈ 6ND in total."
      ],
      [
        "Kaplan vs Chinchilla in two sentences?",
        "Kaplan et al. (2020): for a fixed budget, grow the model much faster than the data (N ∝ C^0.73) and stop before convergence. Hoffmann et al. (2022), matching the learning-rate schedule to each run: grow parameters and tokens equally (≈ C^0.5 each), about 20 tokens per parameter, as with Chinchilla (70B params, 1.4T tokens)."
      ]
    ],
    "quiz": [
      [
        "Query and key components are independent with mean 0 and variance 1, and d_k = 256. What is the standard deviation of a raw dot product q·k, and what does dividing by √d_k do?",
        [
          "16; it rescales the logits back to unit variance",
          "256; it rescales the logits back to unit variance",
          "16; it makes the attention weights sum to one",
          "1; it only makes the matrix multiply cheaper"
        ],
        "The variance of a sum of 256 independent unit-variance products is 256, so the standard deviation is √256 = 16. Dividing by √d_k = 16 brings it back to 1, keeping the softmax out of its saturated, tiny-gradient regime (Vaswani et al., footnote 4). 256 is the variance, not the standard deviation, and the softmax makes the weights sum to one whatever the scale.",
        "calc"
      ],
      [
        "Roughly how many FLOPs does it take to train a 70B-parameter dense transformer on 1.4T tokens, Chinchilla's budget?",
        [
          "About 5.9 × 10²³",
          "About 2.0 × 10²³",
          "About 9.8 × 10²²",
          "About 5.9 × 10²⁶"
        ],
        "C ≈ 6ND = 6 × 7×10¹⁰ × 1.4×10¹² ≈ 5.9×10²³ (Kaplan et al.'s 6N per training token). 2.0×10²³ is 2ND, the forward pass alone; 9.8×10²² is ND; 5.9×10²⁶ treats 1.4T as 1.4 quadrillion.",
        "calc"
      ],
      [
        "In a decoder-only language model trained with teacher forcing, what does the causal mask do?",
        [
          "Sets logits for future positions to −∞ before the softmax",
          "Zeroes attention weights to future positions after the softmax",
          "Drops future tokens from the batch so each sequence is shorter",
          "Adds a learned penalty that grows with distance between tokens"
        ],
        "Vaswani et al. mask by setting the softmax inputs of illegal connections to −∞, and nanoGPT does the same with masked_fill on a lower-triangular mask, so the remaining weights still sum to one. Zeroing after the softmax leaves weights that no longer sum to one; dropping tokens would lose the parallel next-token targets; a distance penalty is a positional scheme, not a mask.",
        [
          "attention",
          "nanogpt"
        ]
      ],
      [
        "Why is FlashAttention faster than standard attention even though it performs more FLOPs?",
        [
          "It keeps tiles in SRAM and never writes the n × n matrix out to HBM",
          "It approximates the softmax with a low-rank kernel, cutting FLOPs",
          "It drops attention to distant tokens, making the cost linear in n",
          "It stores the full score matrix in fp8 so it fits in the GPU cache"
        ],
        "Dao et al. describe exact, IO-aware attention: tiling and running softmax statistics avoid writing the n × n matrix to HBM, and the backward pass recomputes it on-chip. Fewer memory accesses outweigh the extra FLOPs, giving up to 7.6× on GPT-2. Low-rank and sparse methods are the approximate alternatives they contrast with.",
        [
          "flash"
        ]
      ],
      [
        "With a fixed compute budget, how do Kaplan et al. (2020) and Hoffmann et al. (2022, Chinchilla) differ on spending it?",
        [
          "Chinchilla grows parameters and tokens equally; Kaplan favours parameters",
          "Kaplan grows parameters and tokens equally; Chinchilla favours tokens",
          "Both favour parameters; Chinchilla changes only the optimiser it uses",
          "Chinchilla favours parameters; Kaplan favours more training tokens"
        ],
        "Kaplan et al. found the optimum is a very large model trained on relatively little data and stopped early (N ∝ C^0.73). Hoffmann et al. matched the learning-rate schedule to each run's length and found both should scale equally, a doubling of model size calling for a doubling of tokens. Their 70B Chinchilla beat the 280B Gopher on the same compute.",
        [
          "kaplan",
          "chinchilla"
        ]
      ]
    ],
    "explain": [
      "Walk through one decoder-only transformer layer, from token IDs to next-token logits, and say where the parameters and FLOPs go.",
      [
        "Tokens (BPE) → embeddings; position via sinusoids, learned embeddings or RoPE applied to Q and K",
        "softmax(QKᵀ/√d_k)V with a causal −∞ mask; h heads of size d_model/h, then an output projection",
        "The MLP (d → 4d → d) holds about 8d² of the 12d² parameters per layer",
        "≈ 2N FLOPs per token forward, ≈ 6N for training, plus the attention term 2·n_layer·n_ctx·d",
        "Attention is O(n²) in time; FlashAttention removes the O(n²) memory traffic, not the FLOPs"
      ]
    ],
    "duck": [
      "Why does attention need positional information at all?",
      "How can FlashAttention do more arithmetic and still finish sooner?"
    ],
    "lab": {
      "type": "estimate",
      "brief": "Size a decoder with 32 layers and d_model = 4096 using Kaplan et al.'s approximations.",
      "fixed": [
        {
          "q": "Non-embedding parameters N ≈ 12·n_layer·d_model². In billions?",
          "a": 6.44,
          "unit": "billion",
          "tol": 0.02,
          "how": "12 × 32 × 4096² = 384 × 16,777,216 = 6,442,450,944 ≈ 6.44 billion. Embeddings (vocab × 4096) come on top."
        },
        {
          "q": "Forward-pass FLOPs per token from the weights alone (2N), in GFLOPs?",
          "a": 12.9,
          "unit": "GFLOPs",
          "tol": 0.02,
          "how": "2 × 6.44×10⁹ ≈ 12.9×10⁹: one multiply and one add per weight."
        },
        {
          "q": "At n_ctx = 8,192, the attention term 2·n_layer·n_ctx·d_model is what percentage of 2N?",
          "a": 16.7,
          "unit": "%",
          "tol": 0.03,
          "how": "2 × 32 × 8,192 × 4,096 = 2,147,483,648 ≈ 2.15 GFLOPs; 2.15 ÷ 12.9 ≈ 16.7%. In general the ratio is n_ctx ÷ (12·d_model) = 8,192 ÷ 49,152 = 1/6."
        },
        {
          "q": "Training FLOPs on 1 trillion tokens (6ND), in units of 10²²?",
          "a": 3.87,
          "unit": "× 10²² FLOPs",
          "tol": 0.03,
          "how": "6 × 6.44×10⁹ × 10¹² = 3.87×10²² FLOPs (context term ignored)."
        },
        {
          "q": "Standard attention at n = 32,768 materialises an n × n score matrix. In fp16 (2 bytes), how big is it for one head in one layer, in GiB?",
          "a": 2,
          "unit": "GiB",
          "tol": 0.02,
          "how": "32,768² × 2 B = 2,147,483,648 B = 2 GiB, per head, per layer, per sequence. FlashAttention never writes it to HBM."
        },
        {
          "q": "At Chinchilla's ratio (70B parameters on 1.4T tokens), how many training tokens suit N = 6.44B, in billions?",
          "a": 129,
          "unit": "billion tokens",
          "tol": 0.03,
          "how": "1.4T ÷ 70B = 20 tokens per parameter; 20 × 6.44B ≈ 129B tokens."
        }
      ]
    }
  });

})(SD.T);
