// Curriculum skeleton. Built modules have full topic content in m0/m1/m2.js; locked ones only list titles.
window.SD = window.SD || {};
SD.topics = [];
SD.T = function (o) { SD.topics.push(o); };
SD.worlds = [
  { id: 'w0', title: 'World 0 — The Interview Framework', blurb: 'The four-phase structure every answer follows.', mods: ['0A', '0B', '0C', '0D'] },
  { id: 'w1', title: 'World 1 — Foundations', blurb: 'Queues, capacity, and how systems fail under load.', mods: ['1'] },
  { id: 'w2', title: 'World 2 — Data Layer', blurb: 'Where the state lives, and why it is always the bottleneck.', mods: ['2'] },
  { id: 'w3', title: 'Coming soon', blurb: 'On the map, not yet built.', mods: ['3', '4', '5', '7'] }
];
SD.mods = {
  '0A': { title: 'Requirements', icon: '📋' },
  '0B': { title: 'API Design', icon: '🔌' },
  '0C': { title: 'High-Level Design', icon: '🗺️' },
  '0D': { title: 'Deep Dive & Probing', icon: '🔬' },
  '1': { title: 'Foundations', icon: '⚙️' },
  '2': { title: 'Data Layer', icon: '🗄️' },
  '3': { title: 'Async & Event-Driven', icon: '📨', locked: ['Message queues', 'Stream processing', 'Pub/sub', 'Push vs pull dataflow', 'CQRS', 'Saga pattern', 'Batch processing'] },
  '4': { title: 'Scaling Patterns', icon: '📈', locked: ['Horizontal vs vertical', 'Autoscaling', 'CDN and edge', 'Multi-region', 'Microservices'] },
  '5': { title: 'ML System Design', icon: '🤖', locked: ['ML serving', 'Feature stores', 'Batch vs real-time inference', 'Model registry', 'Training pipelines', 'Embedding services', 'Recommendation systems', 'RAG architecture', 'Pipeline orchestration', 'A/B testing', 'Data pipelines', 'Monitoring ML', 'GPU cluster design', 'LLM serving'] },
  '7': { title: 'ML Case Studies', icon: '🧪', locked: ['Real-time recommendations', 'Inference platform', 'Search ranking', 'Fraud detection', 'RAG Q&A', 'Content moderation pipeline', 'Feature platform', 'LLM serving infra', 'Notification ranking', 'Autonomous driving data'] }
};
