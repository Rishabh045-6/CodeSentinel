"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FolderGit2, FileCode2, ChevronRight, ChevronLeft, ChevronDown, ShieldAlert, GitCommit, FileText, BrainCircuit, Edit2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getFileContent, getFileList, getOverview } from "../../lib/api/client";
import { FileMetrics } from "../../lib/types";

function fileMetricsForPath(path: string): FileMetrics {
  return {
    id: path, path, language: "Unknown", loc: 0, complexity: 0, churn: 0, commitCount: 0, bugFixCommits: 0,
    dependencies: 0, dependents: 0, pageRank: 0, riskScore: 0, lastModified: "", riskFactors: [],
  };
}

const GitTree = ({ paths, files, selectedPath, onSelect }: { paths: string[], files: FileMetrics[], selectedPath: string, onSelect: (f: FileMetrics) => void }) => {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({"src": true});
  
  // Build nested structure
  const tree: any = {};
  paths.forEach(p => {
    const parts = p.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      if (!current[parts[i]]) current[parts[i]] = i === parts.length - 1 ? { _file: p } : {};
      current = current[parts[i]];
    }
  });

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({...prev, [folder]: !prev[folder]}));
  };

  const renderNode = (node: any, pathName: string, fullPrefix: string, depth: number = 0) => {
    if (node._file) {
      const fileData = files.find(f => f.path === node._file) || fileMetricsForPath(node._file);
      return (
        <div 
          key={node._file}
          onClick={() => onSelect(fileData)}
          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-xs ${
            selectedPath === node._file ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-100"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <div className="flex items-center gap-1.5 truncate">
            <FileCode2 className={`w-3.5 h-3.5 shrink-0 ${fileData.riskScore > 80 ? 'text-red-500' : 'text-gray-400'}`} />
            <span className="truncate">{pathName}</span>
          </div>
          {fileData.riskScore > 80 && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 ml-1"></div>}
        </div>
      );
    }
    const folderPath = fullPrefix ? `${fullPrefix}/${pathName}` : pathName;
    const isExpanded = expandedFolders[folderPath] ?? (depth === 0);
    
    return (
      <div key={folderPath} className="flex flex-col">
        <div 
          onClick={() => toggleFolder(folderPath)}
          className="flex items-center gap-1.5 p-1.5 rounded cursor-pointer hover:bg-gray-100 text-gray-700 text-xs font-medium"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
          <FolderGit2 className="w-3.5 h-3.5 text-primary" />
          <span className="truncate">{pathName}</span>
        </div>
        {isExpanded && (
          <div className="flex flex-col">
            {Object.keys(node).map(k => renderNode(node[k], k, folderPath, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return <div className="py-1">{Object.keys(tree).map(k => renderNode(tree[k], k, "", 0))}</div>;
};

function CodeAnalyzerContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scan_id");
  const [files, setFiles] = useState<FileMetrics[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileMetrics | null>(null);
  const [repositoryFiles, setRepositoryFiles] = useState<string[]>([]);
  const [codeContent, setCodeContent] = useState("Select a file to view its source.");
  const [isRiskCollapsed, setIsRiskCollapsed] = useState(false);
  const [isFileTreeCollapsed, setIsFileTreeCollapsed] = useState(false);
  
  const [allowChanges, setAllowChanges] = useState(false);
  const [editableCode, setEditableCode] = useState("");

  useEffect(() => {
    if (!scanId) return;
    getFileList(scanId).then((result) => {
      setRepositoryFiles(result.files);
      if (result.files.length) setSelectedFile((currentFile) => currentFile || fileMetricsForPath(result.files[0]));
    }).catch(console.error);
    getOverview(scanId).then((overview) => {
      const nextFiles = overview.top_risky_files || [];
      if (nextFiles.length) {
        setFiles(nextFiles);
        setSelectedFile(nextFiles[0]);
      }
    }).catch(console.error);
  }, [scanId]);

  useEffect(() => {
    if (scanId && selectedFile?.path) {
      getFileContent(scanId, selectedFile.path).then((result) => {
        setCodeContent(result.content);
        setEditableCode(result.content);
      }).catch(console.error);
    }
  }, [scanId, selectedFile]);

  if (!selectedFile) return <div className="p-8 text-gray-500">Loading repository files...</div>;

  const displayFiles = repositoryFiles.length ? repositoryFiles : files.map((file) => file.path);

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-white w-full">
      {/* LEFT: File Tree (10vw) */}
      <div className={`border-r border-gray-200 bg-gray-50/50 flex flex-col transition-all duration-300 relative ${isFileTreeCollapsed ? 'w-10' : 'w-[10vw]'}`}>
        <button 
          onClick={() => setIsFileTreeCollapsed(!isFileTreeCollapsed)}
          className="absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-primary z-10"
        >
          {isFileTreeCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {!isFileTreeCollapsed ? (
          <>
            <div className="p-3 border-b border-gray-200">
              <input type="text" placeholder="Filter..." className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex-1 overflow-y-auto px-1">
              <GitTree paths={displayFiles} files={files} selectedPath={selectedFile.path} onSelect={(f) => {setSelectedFile(f); setAllowChanges(false);}} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex justify-center pt-6">
            <FolderGit2 className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>

      {/* CENTER: Code Viewer (60vw flex) */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d1117] text-gray-300 relative transition-all duration-300">
        <div className="h-12 border-b border-gray-800 bg-[#161b22] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="text-gray-200">{selectedFile.path}</span>
          </div>
          
          <button 
            onClick={() => setAllowChanges(!allowChanges)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${allowChanges ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10 border border-transparent'}`}
          >
            {allowChanges ? <><CheckCircle2 className="w-3.5 h-3.5" /> Editing Allowed</> : <><Edit2 className="w-3.5 h-3.5" /> Allow Changes</>}
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed relative">
          {allowChanges ? (
            <textarea
              className="w-full h-full bg-transparent text-gray-300 resize-none outline-none font-mono focus:ring-0"
              value={editableCode}
              onChange={(e) => setEditableCode(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <pre className="relative whitespace-pre-wrap">
              {codeContent.split('\n').map((line, i) => (
                <div key={i} className={`flex hover:bg-white/5 px-2 rounded ${line.includes('HIGH RISK') ? 'bg-red-500/10 border-l-2 border-red-500' : ''}`}>
                  <span className="w-10 text-gray-600 select-none text-right pr-4 shrink-0">{i + 1}</span>
                  <span className={line.includes('class') || line.includes('def') ? 'text-blue-400' : line.includes('import') ? 'text-pink-400' : line.includes('#') ? 'text-gray-500 italic' : 'text-gray-300'}>
                    {line}
                  </span>
                </div>
              ))}
            </pre>
          )}
        </div>
      </div>

      {/* RIGHT: Analysis Panel (20vw) */}
      <div className={`border-l border-gray-200 bg-white flex flex-col overflow-y-auto transition-all duration-300 relative ${isRiskCollapsed ? 'w-10' : 'w-[20vw]'}`}>
        <button 
          onClick={() => setIsRiskCollapsed(!isRiskCollapsed)}
          className="absolute -left-3 top-6 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-primary z-10"
        >
          {isRiskCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className={`p-4 border-b border-gray-100 flex items-center gap-2 ${isRiskCollapsed ? 'justify-center px-2' : ''}`}>
          <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" title={isRiskCollapsed ? "Risk Analysis" : undefined} />
          {!isRiskCollapsed && <h2 className="text-base font-bold text-gray-900 truncate">Risk Analysis</h2>}
        </div>
        
        {!isRiskCollapsed && (
          <div className="p-4 space-y-5">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
              <div>
                <span className="text-red-800 text-sm font-medium block">Risk Score</span>
                <span className="text-[10px] text-red-600 uppercase font-bold tracking-wider">High Risk</span>
              </div>
              <span className="text-2xl font-bold text-red-600">{selectedFile.riskScore.toFixed(1)}%</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-500 flex items-center gap-1"><FileText className="w-3 h-3" /> LOC</div>
                <div className="font-semibold text-sm text-gray-900 mt-1">{selectedFile.loc}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-500 flex items-center gap-1"><GitCommit className="w-3 h-3" /> Commits</div>
                <div className="font-semibold text-sm text-gray-900 mt-1">{selectedFile.commitCount}</div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-900 mb-3">Model Features</h3>
              <div className="space-y-3">
                {selectedFile.riskFactors.map(factor => (
                  <div key={factor.name}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="font-medium text-gray-700">{factor.name}</span>
                      <span className={factor.level === 'High' ? 'text-red-600 font-bold' : 'text-orange-500 font-bold'}>{factor.level}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${factor.score * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-1 rounded-full ${factor.level === 'High' ? 'bg-red-500' : 'bg-orange-500'}`}
                      ></motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <Link href={`/ai?scan_id=${scanId || ""}&file=${encodeURIComponent(selectedFile.path)}`} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-primary text-white rounded-lg font-medium hover:bg-blue-600 transition-colors shadow-sm">
                <BrainCircuit className="w-3.5 h-3.5" /> Ask AI Analyst
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CodeAnalyzer() {
  return <Suspense fallback={<div className="p-8">Loading code analysis...</div>}><CodeAnalyzerContent /></Suspense>;
}
