"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Search, Filter, Expand, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DependencyNode, GraphData } from "../../lib/types";
import { getGraph } from "../../lib/api/client";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });
const colors = ["#F44336", "#4CAF50", "#2196F3", "#FFEB3B", "#9C27B0", "#FF9800", "#00BCD4", "#E91E63"];

function GraphContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scan_id");
  const fgRef = useRef<any>(null);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] });
  const [hoverNode, setHoverNode] = useState<DependencyNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [is3D, setIs3D] = useState(true);

  useEffect(() => {
    if (scanId) getGraph(scanId).then(setGraph).catch(console.error);
  }, [scanId]);

  const nodeColor = useCallback((node: any) => colors[(node.group || 0) % colors.length], []);
  const handleNodeClick = useCallback((node: any) => {
    if (is3D) {
      const distance = 80;
      fgRef.current?.cameraPosition(
        { x: node.x || 0, y: node.y || 0, z: (node.z || 0) + distance },
        node,
        1000,
      );
    } else {
      fgRef.current?.centerAt(node.x, node.y, 1000);
      fgRef.current?.zoom(8, 2000);
    }
    setSelectedNode(node);
  }, [is3D]);

  const paintRing = useCallback((node: any, ctx: any) => {
    const color = nodeColor(node);
    const radius = Math.sqrt(Math.max(1, node.val)) * 2;
    const active = node === hoverNode || node === selectedNode;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = active ? 18 : 10;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius * 0.48, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fill();
    if (active) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = node === selectedNode ? "#ffffff" : color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [hoverNode, nodeColor, selectedNode]);

  const paint3DNode = useCallback((node: any) => {
    const color = nodeColor(node);
    const radius = Math.max(2.5, Math.sqrt(Math.max(1, node.val)) * 0.7);
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), new THREE.MeshBasicMaterial({ color }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.8, 16, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false }));
    group.add(halo, core);
    return group;
  }, [nodeColor]);

  const resetView = () => {
    if (is3D) {
      fgRef.current?.zoomToFit(1000, 80);
    } else {
      fgRef.current?.centerAt(0, 0, 1000);
      fgRef.current?.zoom(1, 1000);
    }
    setSelectedNode(null);
  };

  return (
    <div className="h-screen w-full relative overflow-hidden bg-[#090d16]">
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex gap-4">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20"><Search className="w-4 h-4 text-white/70" /><input type="text" placeholder="Search nodes..." className="bg-transparent border-none text-sm text-white placeholder-white/50 focus:outline-none w-64" /></div>
        <button className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 text-white text-sm"><Filter className="w-4 h-4" /> Filter Risk</button>
        <button onClick={resetView} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20 text-white text-sm"><Expand className="w-4 h-4" /> Reset View</button>
        <button onClick={() => setIs3D((value) => !value)} className="flex items-center gap-2 bg-cyan-400/15 px-4 py-2 rounded-full border border-cyan-300/40 text-cyan-100 text-sm shadow-[0_0_18px_rgba(34,211,238,0.2)]">{is3D ? "2D View" : "3D View"}</button>
      </div>

      {is3D ? <ForceGraph3D ref={fgRef} graphData={graph} nodeLabel="path" nodeThreeObject={paint3DNode} nodeThreeObjectExtend={false} linkColor={(link: any) => hoverNode && (link.source.id === hoverNode.id || link.target.id === hoverNode.id) ? nodeColor(link.source) : "rgba(100,220,255,0.55)"} linkWidth={(link: any) => hoverNode && (link.source.id === hoverNode.id || link.target.id === hoverNode.id) ? 2.5 : 0.8} linkOpacity={0.7} linkDirectionalParticles={2} linkDirectionalParticleWidth={2.5} linkDirectionalParticleColor={(link: any) => nodeColor(link.source)} backgroundColor="#090d16" onNodeHover={(node: any) => setHoverNode(node)} onNodeClick={handleNodeClick} enableNodeDrag warmupTicks={100} cooldownTicks={100} /> : <ForceGraph2D ref={fgRef} graphData={graph} nodeLabel="path" nodeCanvasObject={paintRing} linkColor={(link: any) => hoverNode && (link.source.id === hoverNode.id || link.target.id === hoverNode.id) ? "rgba(255,255,255,0.8)" : "rgba(110,220,255,0.38)"} linkWidth={(link: any) => hoverNode && (link.source.id === hoverNode.id || link.target.id === hoverNode.id) ? 2 : 0.9} backgroundColor="#090d16" onNodeHover={(node: any) => setHoverNode(node)} onNodeClick={handleNodeClick} enableNodeDrag d3AlphaDecay={0.02} d3VelocityDecay={0.3} warmupTicks={100} cooldownTicks={100} />}

      {hoverNode && !selectedNode && <div className="absolute z-20 bg-black/80 backdrop-blur-sm border border-white/10 text-white p-3 rounded-lg pointer-events-none -translate-x-1/2 translate-y-[-120%]" style={{ left: "50%", top: "50%" }}><p className="font-mono text-xs">{hoverNode.path}</p><div className="flex gap-4 mt-2 text-xs text-white/70"><span>Risk: {hoverNode.riskScore.toFixed(0)}%</span><span>Size: {hoverNode.val.toFixed(1)}</span></div></div>}

      <AnimatePresence>{selectedNode && <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-30 flex flex-col"><div className="p-6 border-b border-gray-100 flex justify-between items-start"><div><h2 className="text-xl font-bold text-gray-900 break-all">{selectedNode.path.split("/").pop()}</h2><p className="text-sm text-gray-500 font-mono mt-1">{selectedNode.path}</p></div><button onClick={() => setSelectedNode(null)} className="text-gray-400">X</button></div><div className="p-6 flex-1"><div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100"><span className="text-red-800 font-medium">Risk Score</span><span className="text-2xl font-bold text-red-600">{selectedNode.riskScore.toFixed(0)}%</span></div></div><div className="p-6 border-t border-gray-100 bg-gray-50 space-y-3"><Link href={`/code?scan_id=${scanId || ""}&file=${encodeURIComponent(selectedNode.path)}`} className="w-full block text-center px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl">Open Code Analyzer</Link><Link href={`/ai?scan_id=${scanId || ""}&file=${encodeURIComponent(selectedNode.path)}`} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl"><BrainCircuit className="w-4 h-4" /> Ask AI</Link></div></motion.div>}</AnimatePresence>
    </div>
  );
}

export default function GraphPage() {
  return <Suspense fallback={<div className="h-screen bg-[#0F172A]" />}><GraphContent /></Suspense>;
}
