import { GraphData, ScanStatus } from "../types";


let API_URL = process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8000` : "http://localhost:8000");

// Prevent double /api/api/ paths if the user configured NEXT_PUBLIC_API_URL with a trailing /api
if (API_URL.endsWith("/api")) API_URL = API_URL.slice(0, -4);
if (API_URL.endsWith("/")) API_URL = API_URL.slice(0, -1);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.json();
}

export function startScan(gitUrl: string, fullHistory = false) {
  return request<{ scan_id: string }>("/api/scan", {
    method: "POST",
    body: JSON.stringify({ git_url: gitUrl, full_history: fullHistory }),
  });
}

export async function uploadLocalRepo(file: File, fullHistory = false) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("full_history", String(fullHistory));
  const response = await fetch(`${API_URL}/api/scan/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Upload failed (${response.status})`);
  }
  return response.json() as Promise<{ scan_id: string }>;
}

export function getScanStatus(scanId: string) {
  return request<ScanStatus>(`/api/scan/${encodeURIComponent(scanId)}/status`);
}

export function getOverview(scanId: string) {
  return request<ScanStatus>(`/api/scan/${encodeURIComponent(scanId)}/overview`);
}

export function getGraph(scanId: string) {
  return request<GraphData>(`/api/scan/${encodeURIComponent(scanId)}/graph`);
}

export function getFileContent(scanId: string, path: string) {
  return request<{ content: string }>(`/api/scan/${encodeURIComponent(scanId)}/files/${path.split("/").map(encodeURIComponent).join("/")}`);
}

export function askAi(scanId: string, message: string) {
  return request<{ answer: string; sources: { id: string; type: string; name: string }[] }>(`/api/scan/${encodeURIComponent(scanId)}/ai/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function getFileList(scanId: string) {
  return request<{ files: string[] }>(`/api/scan/${encodeURIComponent(scanId)}/files`);
}

export function cleanupScan(scanId: string) {
  return request<{ status: string }>(`/api/scan/${encodeURIComponent(scanId)}/cleanup`, { method: "DELETE" });
}