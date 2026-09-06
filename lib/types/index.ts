export interface Repository {
  id: string;
  name: string;
  branch: string;
  lastScan: string;
  files: number;
  lines: number;
  contributors: number;
  riskScore: number;
  languages: Record<string, number>;
}

export interface FileMetrics {
  id: string;
  path: string;
  language: string;
  loc: number;
  complexity: number;
  churn: number;
  commitCount: number;
  bugFixCommits: number;
  dependencies: number;
  dependents: number;
  pageRank: number;
  riskScore: number;
  lastModified: string;
  riskFactors: RiskFactor[];
}

export interface RiskFactor {
  name: string;
  score: number; // 0 to 1
  level: "Low" | "Medium" | "High";
}

export interface DependencyNode {
  id: string;
  path: string;
  group: number; // For coloring by language or folder
  val: number; // Size (e.g. PageRank or dependents)
  riskLevel: "Low" | "Medium" | "High";
  riskScore: number;
}

export interface DependencyEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: DependencyNode[];
  links: DependencyEdge[];
}

export interface ScanStatus {
  status: string;
  message: string;
  repository?: string;
  total_files?: number;
  total_lines?: number;
  languages?: Record<string, number>;
  extensions?: Record<string, number>;
  contributors?: number;
  repository_risk?: number;
  risk_distribution?: { name: string; value: number }[];
  top_risky_files?: FileMetrics[];
  artifact_dir?: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AISource[];
}

export interface AISource {
  id: string;
  type: "file" | "graph" | "commit" | "doc";
  name: string;
  url?: string;
}
