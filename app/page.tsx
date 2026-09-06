"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { getScanStatus, startScan } from "../lib/api/client";

const scanStages = [
  { status: "CLONING", label: "Cloning" },
  { status: "PARSING", label: "Parsing" },
  { status: "ANALYZING", label: "Analyzing" },
  { status: "GRAPH_BUILDING", label: "Building dependency graph" },
  { status: "RISK_PREDICTION", label: "Running risk prediction" },
  { status: "RAG_INDEXING", label: "Indexing codebase" },
];

export default function LandingPage() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [gitUrl, setGitUrl] = useState("");
  const [error, setError] = useState("");

  const handleScan = async () => {
    if (!gitUrl.trim()) return;
    setIsScanning(true);
    setCurrentStage(-1);
    setProgress(0);
    setError("");
    try {
      const { scan_id } = await startScan(gitUrl.trim());
      let status = await getScanStatus(scan_id);
      while (status.status !== "COMPLETED" && status.status !== "FAILED") {
        const stage = scanStages.findIndex((item) => item.status === status.status);
        if (stage >= 0) setCurrentStage(stage);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        status = await getScanStatus(scan_id);
      }
      if (status.status === "FAILED") throw new Error(status.message);
      setCurrentStage(scanStages.length);
      router.push(`/dashboard?scan_id=${encodeURIComponent(scan_id)}`);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Scan failed");
      setIsScanning(false);
    }
  };

  useEffect(() => {
    const targetProgress = Math.max(0, Math.min(100, (currentStage / scanStages.length) * 100));
    const timer = window.setInterval(() => {
      setProgress((currentProgress) => {
        if (currentProgress >= targetProgress) {
          window.clearInterval(timer);
          return currentProgress;
        }
        const nextProgress = Math.min(targetProgress, currentProgress + 1);
        if (nextProgress >= targetProgress) window.clearInterval(timer);
        return nextProgress;
      });
    }, 80);

    return () => window.clearInterval(timer);
  }, [currentStage]);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>



      <main className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 -mt-20">
        {!isScanning ? (
          <div className="max-w-3xl w-full text-center space-y-8">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight mb-6">
              Understand your codebase <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">before it breaks.</span>
            </h1>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 text-primary font-medium text-sm mb-4 mt-2">
              <SparklesIcon /> AI-Powered Codebase Intelligence
            </div>
            
            <p className="text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
              Analyze repository structure, code complexity, dependency architecture, Git history, and predict future bug risk using Random Forest.
            </p>

            <div className="bg-white p-2 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-2 max-w-xl mx-auto mt-12 transition-all hover:shadow-2xl hover:border-primary/30">
              <div className="flex items-center justify-center w-12 h-12 bg-gray-50 rounded-xl">
                <GitBranch className="w-6 h-6 text-gray-600" />
              </div>
              <input 
                type="text" 
                placeholder="https://github.com/your/repo"
                value={gitUrl}
                onChange={(event) => setGitUrl(event.target.value)}
                className="flex-1 bg-transparent border-none focus:outline-none text-foreground placeholder-gray-400 px-2"
                aria-label="Repository URL"
              />
              <button 
                onClick={handleScan}
                className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-secondary transition-colors flex items-center gap-2"
              >
                Analyze Repository <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="pt-8 text-foreground/50 text-sm">
              or <button onClick={() => document.getElementById('file-upload')?.click()} className="text-primary hover:underline">Upload Local Repository</button>
              <input
                type="file"
                id="file-upload"
                accept=".zip"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  setIsScanning(true);
                  setCurrentStage(-1);
                  setProgress(0);
                  setError("");
                  
                  try {
                    const { uploadLocalRepo } = await import("../lib/api/client");
                    const { scan_id } = await uploadLocalRepo(file);
                    
                    let status = await getScanStatus(scan_id);
                    while (status.status !== "COMPLETED" && status.status !== "FAILED") {
                      const stage = scanStages.findIndex((item) => item.status === status.status);
                      if (stage >= 0) setCurrentStage(stage);
                      await new Promise((resolve) => setTimeout(resolve, 1000));
                      status = await getScanStatus(scan_id);
                    }
                    if (status.status === "FAILED") throw new Error(status.message);
                    setCurrentStage(scanStages.length);
                    router.push(`/dashboard?scan_id=${encodeURIComponent(scan_id)}`);
                  } catch (scanError) {
                    setError(scanError instanceof Error ? scanError.message : "Upload failed");
                    setIsScanning(false);
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mb-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
              <h2 className="text-2xl font-bold text-foreground">Scanning repository...</h2>
              <p className="text-foreground/60 mt-2">Running AI intelligence pipeline</p>
            </div>

            <div className="space-y-4">
              {scanStages.map((stage, idx) => {
                const isCompleted = idx < currentStage;
                const isCurrent = idx === currentStage;
                
                return (
                  <div key={stage.status} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${isCompleted ? 'bg-accent/10' : ''}`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                    )}
                    <span className={`${isCompleted ? 'text-foreground font-medium' : isCurrent ? 'text-foreground/80' : 'text-foreground/40'}`}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm font-medium text-foreground/70 mb-2">
                <span>Overall progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
  );
}
