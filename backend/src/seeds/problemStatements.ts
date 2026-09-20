import { IProblemStatement } from '../models/Team.js';

export const DOMAIN_PROBLEM_STATEMENTS: Record<string, IProblemStatement[]> = {
  'Gen AI & AI': [
    {
      id: 'GENAI-01',
      title: 'Autonomous Multimodal Clinical Report Summarizer & Diagnostic Co-Pilot',
      description: 'Build an offline-resilient generative AI assistant that ingests lab results, vitals, and physician notes to produce structured, clinically verifiable summaries with hallucination-guardrails.',
      domain: 'Gen AI & AI',
      category: 'Healthcare & AI',
      tags: ['LLM', 'RAG', 'Multimodal', 'Healthcare'],
    },
    {
      id: 'GENAI-02',
      title: 'Adaptive Real-time Code Review & Vulnerability Remediation Agent',
      description: 'Design an intelligent paired-programming agent that scans git commit diffs, flags OWASP Top 10 vulnerabilities, and generates cryptographically verified AST-safe code patches.',
      domain: 'Gen AI & AI',
      category: 'Developer Tools',
      tags: ['DevSecOps', 'GenAI', 'AST', 'Automation'],
    },
    {
      id: 'GENAI-03',
      title: 'Multilingual Vernacular Legal Contract Analyzer for Rural Communities',
      description: 'Develop an AI model capable of parsing complex regional land and agricultural agreements into simple spoken audio and colloquial language explaining clauses, risks, and obligations.',
      domain: 'Gen AI & AI',
      category: 'LegalTech & Social Impact',
      tags: ['NLP', 'Speech-to-Text', 'Regional Languages', 'GovTech'],
    },
  ],
  'Web development & App development': [
    {
      id: 'WEB-01',
      title: 'Offline-First Disaster Relief & Micro-Logistics Coordination Engine',
      description: 'Create a PWA with local-first CRDT synchronization that functions without cellular data during natural calamities, enabling victim SOS mesh routing and drone drop-off scheduling.',
      domain: 'Web development & App development',
      category: 'Disaster Management',
      tags: ['PWA', 'CRDT', 'Offline-First', 'WebSockets'],
    },
    {
      id: 'WEB-02',
      title: 'Hyperlocal Peer-to-Peer Renewable Energy Trading Platform',
      description: 'Build an ultra-responsive web application that enables residential solar microgrid owners to auction excess kilowatt-hours to neighboring homes in sub-second settlement cycles.',
      domain: 'Web development & App development',
      category: 'CleanTech & Web3',
      tags: ['Real-time', 'Microservices', 'Energy', 'FinTech'],
    },
    {
      id: 'WEB-03',
      title: 'Interactive Civic Grievance & Municipal Infrastructure Digital Twin',
      description: 'Construct a 3D browser-based geospatial dashboard linking citizen geotagged complaint uploads with municipal maintenance crew routing and automated escalation trackers.',
      domain: 'Web development & App development',
      category: 'Smart Cities',
      tags: ['Three.js', 'GeoJSON', 'React', 'Mobile First'],
    },
  ],
  'Machine Learning and AI': [
    {
      id: 'ML-01',
      title: 'Predictive Grid Frequency Stabilization for Renewable Energy Integrations',
      description: 'Train a lightweight time-series deep learning model predicting transient power surges and frequency anomalies across wind and solar farms up to 15 minutes before grid disruptions occur.',
      domain: 'Machine Learning and AI',
      category: 'Energy & Predictive Analytics',
      tags: ['Time-Series', 'LSTM', 'Smart Grid', 'Edge AI'],
    },
    {
      id: 'ML-02',
      title: 'Edge-Computer Vision for Early Stage Crop Pathology & Soil Nutrient Deficit',
      description: 'Develop a quantized mobile CV model that diagnoses crop diseases and nitrogen-phosphorus deficits directly on farmer smartphones in fields with zero network latency.',
      domain: 'Machine Learning and AI',
      category: 'AgriTech',
      tags: ['Edge CV', 'TensorFlow Lite', 'AgriTech', 'YOLO'],
    },
    {
      id: 'ML-03',
      title: 'Ultra-Low Latency Synthetic Fraud Detection for Cross-Border Micro-Payments',
      description: 'Construct a graph neural network (GNN) capable of identifying synthetic identity rings and mule account clusters in high-velocity UPI and instant payment streams.',
      domain: 'Machine Learning and AI',
      category: 'FinTech & Security',
      tags: ['GNN', 'Anomaly Detection', 'Streaming Data', 'FinTech'],
    },
  ],
  'Cloud Computing': [
    {
      id: 'CLOUD-01',
      title: 'Zero-Overhead Serverless Event Broker for High-Density IoT Fleets',
      description: 'Architect a distributed, fault-tolerant ingestion pipeline handling 100,000 telemetry events/sec with automated backpressure handling and cold-start minimization.',
      domain: 'Cloud Computing',
      category: 'Cloud Infrastructure',
      tags: ['Serverless', 'Kafka', 'Distributed Systems', 'IoT'],
    },
    {
      id: 'CLOUD-02',
      title: 'Multi-Cloud Dynamic Cost & Carbon Footprint Autoscaling Controller',
      description: 'Design a Kubernetes controller that autonomously shifts batch computing workloads between cloud providers and regions based on live spot pricing and grid clean energy percentages.',
      domain: 'Cloud Computing',
      category: 'Green Computing',
      tags: ['Kubernetes', 'Multi-Cloud', 'FinOps', 'Carbon Neutral'],
    },
  ],
};

export const getProblemsForDomain = (domain: string): IProblemStatement[] => {
  const normalized = domain.trim();
  if (DOMAIN_PROBLEM_STATEMENTS[normalized]) {
    return DOMAIN_PROBLEM_STATEMENTS[normalized];
  }
  // Try partial match
  for (const [key, list] of Object.entries(DOMAIN_PROBLEM_STATEMENTS)) {
    if (normalized.toLowerCase().includes('gen ai') || normalized.toLowerCase().includes('generative')) {
      return DOMAIN_PROBLEM_STATEMENTS['Gen AI & AI'];
    }
    if (normalized.toLowerCase().includes('machine learning') || normalized.toLowerCase().includes('ml')) {
      return DOMAIN_PROBLEM_STATEMENTS['Machine Learning and AI'];
    }
    if (normalized.toLowerCase().includes('web') || normalized.toLowerCase().includes('app')) {
      return DOMAIN_PROBLEM_STATEMENTS['Web development & App development'];
    }
    if (normalized.toLowerCase().includes('cloud')) {
      return DOMAIN_PROBLEM_STATEMENTS['Cloud Computing'];
    }
  }
  // Default to Gen AI & AI
  return DOMAIN_PROBLEM_STATEMENTS['Gen AI & AI'];
};
