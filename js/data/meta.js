// Curriculum skeleton. Each module's topics live in its own file (m0.js … m9.js). A module given a `locked` list of
// titles here is drawn on the map as coming soon.
window.SD = window.SD || {};
SD.topics = [];
SD.T = function (o) { SD.topics.push(o); };
SD.worlds = [
  { id: 'w0', title: 'World 0 — The Interview Framework', blurb: 'The four-phase structure every answer follows.', mods: ['0A', '0B', '0C', '0D'] },
  { id: 'w1', title: 'World 1 — Foundations', blurb: 'Queues, capacity, and how systems fail under load.', mods: ['1'] },
  { id: 'w2', title: 'World 2 — Data Layer', blurb: 'Where the state lives, and why it is usually the bottleneck.', mods: ['2'] },
  { id: 'w3', title: 'World 3 — Async & Event-Driven', blurb: 'Work that does not have to finish while the user waits: queues, logs, fan-out and sagas.', mods: ['3'] },
  { id: 'w4', title: 'World 4 — Scaling Patterns', blurb: 'More machines, the edge, more regions, more services, and what each one costs.', mods: ['4'] },
  { id: 'w5', title: 'World 5 — ML System Design', blurb: 'A model is a slow server with few slots: serving, features, training, retrieval and LLMs.', mods: ['5'] },
  { id: 'w6', title: 'World 6 — Case Studies', blurb: 'Design a system like Discord, Uber, Netflix, Spotify, Twitter, Stripe or WhatsApp, from what their engineers published.', mods: ['6'] },
  { id: 'w7', title: 'World 7 — ML Case Studies', blurb: 'Ten end-to-end ML design prompts that combine everything in World 5.', mods: ['7'] },
  { id: 'w8', title: 'World 8 — Applied ML Design', blurb: 'The modelling half of an ML design round: framing, metrics, labels, features, models and evaluation.', mods: ['8'] },
  { id: 'w9', title: 'World 9 — ML Fundamentals & Theory', blurb: 'The theory rounds probe: generalization, classic models, optimization, deep nets, statistics, unsupervised learning and transformers.', mods: ['9'] }
];
SD.mods = {
  '0A': { title: 'Requirements', icon: '📋' },
  '0B': { title: 'API Design', icon: '🔌' },
  '0C': { title: 'High-Level Design', icon: '🗺️' },
  '0D': { title: 'Deep Dive & Probing', icon: '🔬' },
  '1': { title: 'Foundations', icon: '⚙️' },
  '2': { title: 'Data Layer', icon: '🗄️' },
  '3': { title: 'Async & Event-Driven', icon: '📨' },
  '4': { title: 'Scaling Patterns', icon: '📈' },
  '5': { title: 'ML System Design', icon: '🤖' },
  '6': { title: 'Case Studies', icon: '🏛️' },
  '7': { title: 'ML Case Studies', icon: '🧪' },
  '8': { title: 'Applied ML Design', icon: '📐' },
  '9': { title: 'ML Fundamentals & Theory', icon: '🧮' }
};
