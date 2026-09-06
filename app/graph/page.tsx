"use client";

import dynamic from "next/dynamic";
import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { DependencyNode, GraphData } from "../../lib/types";
import { getGraph } from "../../lib/api/client";
import { useSearchParams } from "next/navigation";
import { Search, Filter, Expand, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// Dynamically import react-force-graph-2d so it doesn't break SSR
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

function GraphContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scan_id");
  const fgRef = useRef<any>(null);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] });
  const [hoverNode, setHoverNode] = useState<DependencyNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);

  useEffect(() => {
    if (scanId) getGraph(scanId).then(setGraph).catch(console.error);
  }, [scanId]);
  
  const handleNodeClick = useCallback((node: any) => {
    fgRef.current?.centerAt(node.x, node.y, 1000);
    fgRef.current?.zoom(8, 2000);
    setSelectedNode(node);
  }, []);

  // Obsidian categorical colors
  const obsidianColors = [
    "#F44336", // Red
    "#4CAF50", // Green
    "#2196F3", // Blue
    "#FFEB3B", // Yellow
    "#9C27B0", // Purple
    "#FF9800", // Orange
    "#00BCD4", // Cyan
    "#E91E63", // Pink
  ];

  // Obsidian-like custom rendering
  const paintRing = useCallback((node: any, ctx: any) => {
    const isHovered = node === hoverNode;
    const isSelected = node === selectedNode;
    const baseColor = obsidianColors[(node.group || 0) % obsidianColors.length];
    
    // Draw the node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, Math.sqrt(Math.max(1, node.val)) * 2, 0, 2 * Math.PI, false);
    ctx.fillStyle = baseColor;
    ctx.fill();

    // Draw selection/hover ring
    if (isHovered || isSelected) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, Math.sqrt(Math.max(1, node.val)) * 2 + 2, 0, 2 * Math.PI, false);
      ctx.strokeStyle = isSelected ? "#ffffff" : baseColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [hoverNode, selectedNode]);

  return (
    <div className="h-screen w-full relative overflow-hidden bg-[#1e1e1e]">
      {/* Search and Filters Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-4">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
          <Search className="w-4 h-4 text-white/70" />
          <input 
            type="text" 
            placeholder="Search nodes..." 
            className="bg-transparent border-none text-sm text-white placeholder-white/50 focus:outline-none w-64"
          />
        </div>
        <button className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-sm hover:bg-white/20 transition-colors">
          <Filter className="w-4 h-4" /> Filter Risk
        </button>
        <button 
          className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-sm hover:bg-white/20 transition-colors"
          onClick={() => {
            fgRef.current?.centerAt(0, 0, 1000);
            fgRef.current?.zoom(1, 1000);
            setSelectedNode(null);
          }}
        >
          <Expand className="w-4 h-4" /> Reset View
        </button>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={graph}
        nodeLabel="path"
        nodeCanvasObject={paintRing}
        linkColor={(link: any) => {
          if (hoverNode) {
            const isConnected = link.source.id === hoverNode.id || link.target.id === hoverNode.id;
            return isConnected ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.01)";
          }
          return "rgba(255,255,255,0.15)";
        }}
        linkWidth={(link: any) => {
          if (hoverNode) {
            return link.source.id === hoverNode.id || link.target.id === hoverNode.id ? 2 : 0.5;
          }
          return 0.5;
        }}
        backgroundColor="#1e1e1e"
        onNodeHover={(node: any) => setHoverNode(node)}
        onNodeClick={handleNodeClick}
        enableNodeDrag={true}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={100}
        cooldownTicks={100}
      />

      {/* Floating Hover Tooltip */}
      {hoverNode && !selectedNode && (
        <div 
          className="absolute z-20 bg-black/80 backdrop-blur-sm border border-white/10 text-white p-3 rounded-lg pointer-events-none transform -translate-x-1/2 -translate-y-[120%]"
          style={{ left: "50%", top: "50%" }} // In a real app we'd track mouse X/Y
        >
          <p className="font-mono text-xs">{hoverNode.path}</p>
          <div className="flex gap-4 mt-2 text-xs text-white/70">
            <span>Risk: {hoverNode.riskScore.toFixed(0)}%</span>
            <span>Size: {hoverNode.val.toFixed(1)}</span>
          </div>
        </div>
      )}

      {/* Selected Node Side Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-30 flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900 break-all">{selectedNode.path.split('/').pop()}</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">{selectedNode.path}</p>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                <span className="text-red-800 font-medium">Risk Score</span>
                <span className="text-2xl font-bold text-red-600">{selectedNode.riskScore.toFixed(0)}%</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 uppercase font-medium tracking-wider">PageRank</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">{(selectedNode.val / 100).toFixed(2)}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-xs text-gray-500 uppercase font-medium tracking-wider">Dependents</div>
                  <div className="text-lg font-bold text-gray-900 mt-1">{Math.floor(selectedNode.val)}</div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900">Future bug probability</h3>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-red-500 h-2.5 rounded-full" style={{ width: `${selectedNode.riskScore}%` }}></div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-3">
              <Link 
                href={`/code?scan_id=${scanId || ""}&file=${encodeURIComponent(selectedNode.path)}`}
                className="w-full block text-center px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Open Code Analyzer
              </Link>
              <Link 
                href={`/ai?scan_id=${scanId || ""}&file=${encodeURIComponent(selectedNode.path)}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-blue-600 transition-colors shadow-md shadow-primary/20"
              >
                <BrainCircuit className="w-4 h-4" /> Ask AI
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GraphPage() {
  return <Suspense fallback={<div className="h-screen bg-[#0F172A]" />}><GraphContent /></Suspense>;
}
