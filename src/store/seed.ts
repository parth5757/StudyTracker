import {NodeItem} from '../types';
import {newId} from '../utils/id';

type Seed = {name: string; emoji?: string; children?: Seed[]};

// Starter structure matching: math + ML/DL/NLP/CV + DSA + thesis + AI for Health.
// Everything here can be renamed / deleted / extended inside the app.
export const STARTER: Seed[] = [
  {
    name: 'Mathematics', emoji: '📐',
    children: [
      {name: 'Probability', children: [{name: 'Conditional probability & Bayes'}, {name: 'Random variables & distributions'}, {name: 'Expectation, variance, moments'}, {name: 'Limit theorems (LLN, CLT)'}]},
      {name: 'Statistics', children: [{name: 'Estimation (MLE, MAP)'}, {name: 'Hypothesis testing'}, {name: 'Regression'}, {name: 'Time-series basics'}]},
      {name: 'Calculus', children: [{name: 'Multivariable calculus'}, {name: 'Optimization'}]},
      {name: 'Linear Algebra', children: [{name: 'Vector spaces & projections'}, {name: 'Eigen / SVD / PCA'}]},
      {name: 'Stochastic Processes', children: [{name: 'Markov chains'}, {name: 'Poisson process'}, {name: 'Martingales'}]},
      {name: 'Stochastic Calculus', children: [{name: 'Brownian motion'}, {name: 'Itô integral & lemma'}, {name: 'Black–Scholes'}]},
    ],
  },
  {
    name: 'Machine Learning', emoji: '🤖',
    children: [
      {name: 'Supervised learning', children: [{name: 'Linear / logistic regression'}, {name: 'Trees & ensembles'}, {name: 'SVM'}]},
      {name: 'Unsupervised learning', children: [{name: 'Clustering'}, {name: 'Dimensionality reduction'}]},
      {name: 'Model evaluation', children: [{name: 'Bias–variance'}, {name: 'Cross-validation & metrics'}]},
    ],
  },
  {
    name: 'Deep Learning', emoji: '🧠',
    children: [
      {name: 'Fundamentals', children: [{name: 'Backpropagation'}, {name: 'Optimizers & regularization'}]},
      {name: 'Architectures', children: [{name: 'CNN'}, {name: 'RNN / LSTM'}, {name: 'Transformers'}]},
    ],
  },
  {
    name: 'NLP', emoji: '💬',
    children: [{name: 'Embeddings & tokenization'}, {name: 'Sequence models'}, {name: 'LLMs & fine-tuning'}],
  },
  {
    name: 'Computer Vision', emoji: '👁️',
    children: [{name: 'Classification & detection'}, {name: 'Segmentation'}, {name: 'Vision transformers'}],
  },
  {
    name: 'DSA', emoji: '🧩',
    children: [
      {name: 'C++', children: [{name: 'STL & syntax practice'}, {name: 'Arrays / strings'}, {name: 'Trees & graphs'}, {name: 'Dynamic programming'}]},
      {name: 'Python', children: [{name: 'Python practice'}, {name: 'Problem solving'}]},
    ],
  },
  {
    name: 'MTech Thesis', emoji: '🎓',
    children: [{name: 'Paper reading'}, {name: 'Experiments'}, {name: 'Writing'}, {name: 'Professor tasks'}],
  },
  {
    name: 'AI for Health (course project)', emoji: '🩺',
    children: [{name: 'Problem & dataset'}, {name: 'Modeling'}, {name: 'Evaluation'}, {name: 'Report & presentation'}],
  },
];

export function buildStarterNodes(): NodeItem[] {
  const out: NodeItem[] = [];
  const now = new Date().toISOString();
  const walk = (items: Seed[], parentId: string | null) => {
    items.forEach((s, i) => {
      const id = newId('n');
      out.push({
        id,
        parentId,
        name: s.name,
        emoji: s.emoji || '',
        notes: '',
        order: i,
        createdAt: now,
        learnedOn: null,
        lastRevised: null,
        nextRevision: null,
        stage: 0,
        revisionCount: 0,
        confidence: null,
        revisionPaused: false,
      });
      if (s.children) {
        walk(s.children, id);
      }
    });
  };
  walk(STARTER, null);
  return out;
}
