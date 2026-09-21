import { IProblemStatement } from '../models/Team.js';

export const TRACK_1_MACHINE_LEARNING: IProblemStatement[] = [
  {
    id: 'ML-1',
    title: 'Support Ticket Classifier with Explanations',
    description:
      'Problem: Support teams lose time sorting tickets by hand.\n\nBuild: A machine learning model that classifies customer tickets by category and priority, and explains which words drove each decision.\n\nKey deliverables:\n• Multi-output classifier (category + priority)\n• Word-level explanation for every prediction',
    domain: 'Machine Learning',
    category: 'NLP & Explainable AI',
    tags: ['Machine Learning', 'NLP', 'Classification', 'Explainable AI', 'Multi-Output'],
  },
  {
    id: 'ML-2',
    title: 'Fact-Checked Answer Generation',
    description:
      'Problem: Large language models often sound confident while being wrong.\n\nBuild: A system that checks every claim in a generated answer against trusted sources, then flags or rewrites anything it cannot support.\n\nEvaluation: Teams are scored on standard factuality benchmarks.\n\nKey deliverables:\n• Claim extraction and verification against trusted sources\n• Flag or rewrite step for unsupported claims',
    domain: 'Machine Learning',
    category: 'Fact-Checking & RAG',
    tags: ['Machine Learning', 'LLM', 'Fact-Checking', 'Hallucination', 'RAG'],
  },
  {
    id: 'ML-3',
    title: 'Lightweight AI for Resource-Limited Environments',
    description:
      'Problem: Most powerful models are too heavy and slow for low-resource deployments.\n\nBuild: Shrink a vision or language model using quantization, pruning, and distillation, and run it inside software-enforced limits such as a CPU-only container with capped memory and cores.\n\nEvaluation: Show clearly what was gained and lost in accuracy, latency, and memory compared to the original model.\n\nKey deliverables:\n• Compressed model using the three techniques\n• Constrained runtime (CPU-only, capped memory and cores)\n• Before/after comparison on accuracy, latency, memory',
    domain: 'Machine Learning',
    category: 'Model Optimization & Edge AI',
    tags: ['Machine Learning', 'Model Compression', 'Quantization', 'Pruning', 'Distillation', 'Edge AI'],
  },
  {
    id: 'ML-4',
    title: 'Answering Questions from Mixed-Format Documents',
    description:
      'Problem: Real documents combine paragraphs, tables, charts, and images, and most AI tools read only the text.\n\nBuild: A system that answers questions across all of these formats and points to the exact source of each answer.\n\nEvaluation (judging):\n• Answer correctness\n• Source attribution\n• How often the system makes things up (hallucination rate)',
    domain: 'Machine Learning',
    category: 'Multimodal & Document AI',
    tags: ['Machine Learning', 'Multimodal', 'Document AI', 'Tables & Charts', 'Attribution'],
  },
  {
    id: 'ML-5',
    title: 'Collaborative Training Without Sharing Data',
    description:
      'Problem: Hospitals, banks, and devices hold valuable data they cannot pool.\n\nBuild: A federated learning system where simulated clients with very different (non-IID) data train one shared model without sending raw records anywhere.\n\nEvaluation:\n• Accuracy close to centralized training\n• Communication cost\n• Privacy leakage',
    domain: 'Machine Learning',
    category: 'Federated Learning & Privacy',
    tags: ['Machine Learning', 'Federated Learning', 'Privacy', 'Distributed ML', 'Non-IID'],
  },
];

export const TRACK_2_CLOUD: IProblemStatement[] = [
  {
    id: 'CL-1',
    title: 'Autonomous Cloud Ops Copilot',
    description:
      'Build: One cloud-deployed platform that:\n• Forecasts traffic to autoscale ahead of spikes\n• Detects and explains abnormal cloud spend\n• Uses an LLM with retrieval over logs and runbooks to diagnose outages',
    domain: 'Cloud',
    category: 'CloudOps & AIOps',
    tags: ['Cloud', 'CloudOps', 'FinOps', 'Autoscaling', 'AIOps', 'Log Retrieval'],
  },
  {
    id: 'CL-2',
    title: 'Spot-Instance Orchestration',
    description:
      'Build: Run fault-tolerant workloads on preemptible VMs with checkpointing and automated recovery.\n\nEvaluation: Demonstrate measurable savings over on-demand pricing.',
    domain: 'Cloud',
    category: 'Cloud Infrastructure & Cost Optimization',
    tags: ['Cloud', 'Spot Instances', 'Fault Tolerance', 'Checkpointing', 'Cost Optimization'],
  },
  {
    id: 'CL-3',
    title: 'Smart Autoscaling with Cost Insights',
    description:
      'Build: An intelligent autoscaling platform driven by predictive traffic forecasts, paired with real-time cloud cost visibility, budget guardrails, and anomaly detection.\n\nScope: Autoscaling driven by traffic forecasts, paired with cost visibility.',
    domain: 'Cloud',
    category: 'Autoscaling & FinOps',
    tags: ['Cloud', 'Autoscaling', 'Cost Visibility', 'Predictive Scaling', 'Cloud Infrastructure'],
  },
  {
    id: 'CL-4',
    title: 'Agentless eBPF Observability',
    description:
      'Build: Capture service-level latency and network flows without code changes, and generate a live dependency map that highlights bottlenecks.',
    domain: 'Cloud',
    category: 'Observability & Networking',
    tags: ['Cloud', 'eBPF', 'Observability', 'Networking', 'Latency', 'Microservices'],
  },
];

export const TRACK_3_AI_GENAI: IProblemStatement[] = [
  {
    id: 'AI-1',
    title: 'Claim-level auditor for RAG answers',
    description:
      "Problem: RAG systems give fluent answers with a few citations, but users can't tell which sentence is actually supported.\n\nBuild: A layer that splits an answer into atomic claims, checks each against the retrieved passages using entailment rather than just similarity, and returns a per-claim support score with the exact source span, or flags the claim as unsupported.\n\nWhy it's hard: Claim decomposition, numeric and partially supported claims, and proving it works with a labeled set (how many hallucinations it catches vs. falsely flags).",
    domain: 'AI & Gen AI',
    category: 'RAG & Hallucination Auditor',
    tags: ['AI & Gen AI', 'RAG', 'Claim Extraction', 'Entailment', 'Hallucination Auditor'],
  },
  {
    id: 'AI-2',
    title: 'Indirect prompt-injection firewall for tool-using agents',
    description:
      "Problem: An agent that reads emails, web pages, and PDFs can be hijacked by instructions hidden in that content.\n\nBuild: A runtime guard between the agent and its tools that tags untrusted content, tracks where it flows (taint tracking), and blocks or asks for confirmation when tainted data tries to trigger a sensitive action such as sending mail or making a payment.\n\nWhy it's hard: Keeping false positives low, and building a red-team attack suite to measure attack success rate before and after.",
    domain: 'AI & Gen AI',
    category: 'Agent Security & Firewalls',
    tags: ['AI & Gen AI', 'Prompt Injection', 'Taint Tracking', 'Agent Safety', 'Security Firewall'],
  },
  {
    id: 'AI-3',
    title: 'Agent memory that understands time and contradiction',
    description:
      'Problem: Long-running assistants store facts like "the deadline is Friday" that later become false.\n\nBuild: A memory layer that stores facts with validity windows, detects contradictions when new information arrives, resolves them (supersede, keep both with context, or ask the user), and forgets low-value entries.\n\nWhy it\'s hard: Entity resolution, temporal reasoning, and designing a benchmark for memory correctness across long multi-session conversations.',
    domain: 'AI & Gen AI',
    category: 'Memory & Temporal Reasoning',
    tags: ['AI & Gen AI', 'Agent Memory', 'Temporal Reasoning', 'Contradiction Resolution', 'Knowledge Graph'],
  },
  {
    id: 'AI-4',
    title: 'Hypothesis-driven incident root-cause agent',
    description:
      "Problem: Given logs, metrics, deploy history, and alert threads from an outage, find the cause.\n\nBuild: Produce ranked root-cause hypotheses, each with evidence and a suggested verification step. Use a multi-agent setup where one agent proposes causes and another tries to falsify them by querying the data.\n\nWhy it's hard: Noisy long-context inputs, grounding every claim in a specific log line or metric, and evaluating on replayed or synthetic incidents with known causes.",
    domain: 'AI & Gen AI',
    category: 'Multi-Agent & Root Cause Analysis',
    tags: ['AI & Gen AI', 'Multi-Agent', 'Root Cause Analysis', 'SRE', 'Incident Management'],
  },
  {
    id: 'AI-5',
    title: 'Adaptive tutor that generates verified problems for specific misconceptions',
    description:
      "Build: Diagnose the misconception behind a student's wrong answer, not just the topic, then generate a fresh problem targeting it. Verify the problem's answer with a symbolic solver or code executor before showing it, and track mastery with knowledge tracing.\n\nWhy it's hard: Correctness guarantees for generated content, difficulty calibration, and measuring learning gain against static practice sets.",
    domain: 'AI & Gen AI',
    category: 'EdTech & Neuro-Symbolic AI',
    tags: ['AI & Gen AI', 'EdTech', 'Knowledge Tracing', 'Symbolic Solver', 'Adaptive Learning'],
  },
];

export const TRACK_4_WEB_APP: IProblemStatement[] = [
  {
    id: 'WA-1',
    title: 'Offline-first collaborative field-inspection app',
    description:
      "Problem: Technicians fill shared checklists, notes, and photos in places with no connectivity.\n\nBuild: A PWA or mobile app that works fully offline, syncs multi-user edits using CRDTs (or operational transforms), and shows a readable conflict and audit history instead of silently overwriting data.\n\nWhy it's hard: The sync protocol, schema migrations on clients that have been offline for days, and resumable media uploads.",
    domain: 'Web & App Development',
    category: 'Offline-First & PWA',
    tags: ['Web & App Development', 'Offline-First', 'PWA', 'CRDT', 'Sync Protocol'],
  },
  {
    id: 'WA-2',
    title: 'Fair flash-sale / ticketing platform',
    description:
      "Build: Handle limited inventory (say 10k tickets against 500k simultaneous users) with a virtual waiting room, time-limited holds, no overselling, and bot resistance.\n\nWhy it's hard: Concurrency control, idempotent checkout, backpressure, and load-test evidence (k6 or Locust) that the no-oversell guarantee holds under stress.",
    domain: 'Web & App Development',
    category: 'High Concurrency & Distributed Systems',
    tags: ['Web & App Development', 'High Concurrency', 'Virtual Waiting Room', 'Anti-Bot', 'Distributed Locking'],
  },
  {
    id: 'WA-3',
    title: 'End-to-end encrypted notes with search and revocable sharing',
    description:
      "Problem: The server never sees plaintext, yet users can search their notes, share one with a teammate, and later revoke that access.\n\nWhy it's hard: Key management and rotation, a searchable-encryption approach (client-side index or blind indexes), and a written threat model.",
    domain: 'Web & App Development',
    category: 'Security & Cryptography',
    tags: ['Web & App Development', 'E2EE', 'Cryptography', 'Searchable Encryption', 'Zero Knowledge'],
  },
  {
    id: 'WA-4',
    title: 'Privacy-safe session replay and bug reproduction',
    description:
      "Build: Record DOM changes, network responses, and app state from real sessions so developers can replay a bug exactly, while PII is masked in the browser before anything leaves the device.\n\nWhy it's hard: Deterministic replay, a strict performance-overhead budget, and masking accuracy on dynamic content.",
    domain: 'Web & App Development',
    category: 'DevTools & Privacy',
    tags: ['Web & App Development', 'Session Replay', 'DOM Recording', 'PII Masking', 'DevTools'],
  },
  {
    id: 'WA-5',
    title: 'Network- and device-adaptive web app',
    description:
      "Build: An app (news or e-commerce, for example) that detects connection quality and device capability and changes what it ships: image formats and sizes, JS bundles, features, and prefetching.\n\nWhy it's hard: Showing measurable Core Web Vitals gains on throttled 3G and low-end device profiles, with graceful fallbacks.",
    domain: 'Web & App Development',
    category: 'Web Performance & Adaptive UI',
    tags: ['Web & App Development', 'Adaptive Loading', 'Core Web Vitals', 'Network Aware', 'Performance'],
  },
];

export const ALL_PROBLEM_STATEMENTS: IProblemStatement[] = [
  ...TRACK_1_MACHINE_LEARNING,
  ...TRACK_2_CLOUD,
  ...TRACK_3_AI_GENAI,
  ...TRACK_4_WEB_APP,
];

export const DOMAIN_PROBLEM_STATEMENTS: Record<string, IProblemStatement[]> = {
  'Machine Learning': TRACK_1_MACHINE_LEARNING,
  'Machine Learning and AI': TRACK_1_MACHINE_LEARNING,
  'Cloud': TRACK_2_CLOUD,
  'Cloud Computing': TRACK_2_CLOUD,
  'AI & Gen AI': TRACK_3_AI_GENAI,
  'Gen AI & AI': TRACK_3_AI_GENAI,
  'Web & App Development': TRACK_4_WEB_APP,
  'Web development & App development': TRACK_4_WEB_APP,
};

export const getProblemsForDomain = (domain: string): IProblemStatement[] => {
  const normalized = (domain || '').trim();
  if (DOMAIN_PROBLEM_STATEMENTS[normalized]) {
    return DOMAIN_PROBLEM_STATEMENTS[normalized];
  }
  const lower = normalized.toLowerCase();
  if (lower.includes('gen ai') || lower.includes('generative')) {
    return TRACK_3_AI_GENAI;
  }
  if (lower.includes('machine learning') || lower.includes('ml')) {
    return TRACK_1_MACHINE_LEARNING;
  }
  if (lower.includes('cloud')) {
    return TRACK_2_CLOUD;
  }
  if (lower.includes('web') || lower.includes('app')) {
    return TRACK_4_WEB_APP;
  }
  // Default to AI & Gen AI
  return TRACK_3_AI_GENAI;
};
