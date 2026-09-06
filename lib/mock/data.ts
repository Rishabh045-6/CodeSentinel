import { Repository, FileMetrics, GraphData, AIMessage, DependencyNode, DependencyEdge } from "../types";

export const mockRepository: Repository = {
  id: "repo-1",
  name: "Transformers",
  branch: "main",
  lastScan: new Date().toISOString(),
  files: 21342,
  lines: 1542093,
  contributors: 142,
  riskScore: 37,
  languages: {
    Python: 65,
    "C++": 20,
    Rust: 10,
    Other: 5,
  },
};

export const mockTopRiskyFiles: FileMetrics[] = [
  {
    id: "file-1",
    path: "src/auth/security.py",
    language: "Python",
    loc: 1362,
    complexity: 45,
    churn: 124,
    commitCount: 56,
    bugFixCommits: 12,
    dependencies: 14,
    dependents: 27,
    pageRank: 0.82,
    riskScore: 91,
    lastModified: "2 hours ago",
    riskFactors: [
      { name: "PageRank", score: 0.95, level: "High" },
      { name: "Change Frequency", score: 0.85, level: "High" },
      { name: "Function Length", score: 0.8, level: "High" },
      { name: "Historical Bug Fixes", score: 0.6, level: "Medium" },
      { name: "Dependency Count", score: 0.5, level: "Medium" },
    ],
  },
  {
    id: "file-2",
    path: "src/engine/decision_engine.py",
    language: "Python",
    loc: 850,
    complexity: 38,
    churn: 90,
    commitCount: 42,
    bugFixCommits: 8,
    dependencies: 8,
    dependents: 45,
    pageRank: 0.75,
    riskScore: 87,
    lastModified: "1 day ago",
    riskFactors: [
      { name: "PageRank", score: 0.88, level: "High" },
      { name: "Dependents", score: 0.9, level: "High" },
    ],
  },
  {
    id: "file-3",
    path: "src/api/service.py",
    language: "Python",
    loc: 540,
    complexity: 25,
    churn: 60,
    commitCount: 30,
    bugFixCommits: 5,
    dependencies: 12,
    dependents: 15,
    pageRank: 0.55,
    riskScore: 82,
    lastModified: "3 days ago",
    riskFactors: [
      { name: "Change Frequency", score: 0.82, level: "High" },
    ],
  },
];

// Generate a random graph with ~500 nodes for visualization
export const generateMockGraph = (): GraphData => {
  const nodes: DependencyNode[] = [];
  const links: DependencyEdge[] = [];
  const numNodes = 500;

  for (let i = 0; i < numNodes; i++) {
    const isHighRisk = Math.random() > 0.9;
    const isMediumRisk = !isHighRisk && Math.random() > 0.7;
    nodes.push({
      id: `node-${i}`,
      path: `src/module_${Math.floor(i / 50)}/file_${i}.py`,
      group: Math.floor(i / 50),
      val: Math.random() * 20 + 2, // Size
      riskLevel: isHighRisk ? "High" : isMediumRisk ? "Medium" : "Low",
      riskScore: isHighRisk ? 80 + Math.random() * 20 : isMediumRisk ? 40 + Math.random() * 40 : Math.random() * 40,
    } as DependencyNode);
  }

  // Generate some scale-free edges
  for (let i = 1; i < numNodes; i++) {
    const target = Math.floor(Math.random() * i); // Prefer earlier nodes as hubs
    links.push({ source: `node-${i}`, target: `node-${target}` });
    
    // Add random extra links
    if (Math.random() > 0.8) {
      links.push({ source: `node-${i}`, target: `node-${Math.floor(Math.random() * numNodes)}` });
    }
  }

  // Ensure top risky files are hubs
  mockTopRiskyFiles.forEach((file, idx) => {
    nodes[idx] = {
      id: file.id,
      path: file.path,
      group: 0,
      val: 40, // Large hub
      riskLevel: "High",
      riskScore: file.riskScore,
    } as DependencyNode;
    // Make many things depend on it
    for (let j = 0; j < file.dependents; j++) {
      links.push({ source: `node-${Math.floor(Math.random() * numNodes)}`, target: file.id });
    }
  });

  return { nodes, links };
};

export const mockGraph = generateMockGraph();

export const mockChatHistory: AIMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Why is auth_security.py high risk?",
  },
  {
    id: "msg-2",
    role: "assistant",
    content: "The file `auth_security.py` is classified as high risk (91%) primarily because:\n\n1. **High PageRank**: It acts as a central hub in your architecture, meaning a bug here cascades to many dependents.\n2. **Change Frequency**: It has been modified frequently in recent commits.\n3. **Function Length**: It contains complex, monolithic functions.\n4. **Historical Bug-Fix Activity**: It has a track record of requiring patches.\n\nI recommend refactoring the core authentication logic to reduce its monolithic size and isolate the highly dependent modules.",
    sources: [
      { id: "src-1", type: "file", name: "src/auth/security.py" },
      { id: "src-2", type: "graph", name: "Dependency Graph" },
      { id: "src-3", type: "commit", name: "Git History" }
    ]
  }
];
