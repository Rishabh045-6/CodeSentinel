"use client";

import { motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileCode, Activity, Users, GitCommit, ShieldAlert, ChevronRight, TriangleAlert, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import Link from "next/link";
import { getOverview } from "../../lib/api/client";
import { ScanStatus } from "../../lib/types";

const kpiVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const }
  })
};

const COLORS = ['#121358', '#232F72', '#2F578A', '#36ADA3', '#56C5B9', '#B8D8D8'];

function DashboardContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scan_id");
  const [overview, setOverview] = useState<ScanStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!scanId) return;

    getOverview(scanId)
      .then(setOverview)
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to load scan"));
  }, [scanId]);

  const displayError = loadError || (!scanId ? "No scan was selected." : null);
  if (displayError) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900">Unable to load this scan</h1>
          <p className="mt-2 text-gray-500">{displayError}</p>
          <Link href="/" className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 font-medium text-white hover:opacity-90">
            Start a new scan
          </Link>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-gray-500 font-serif">Loading analysis data...</p>
        </div>
      </div>
    );
  }

  const repository = {
    name: overview?.repository || "Repository",
    files: overview?.total_files || 0,
    lines: overview?.total_lines || 0,
    contributors: overview?.contributors || 0,
    riskScore: overview?.repository_risk || 0,
    languages: overview?.languages || {},
  };
  const riskyFiles = overview?.top_risky_files || [];
  const langEntries = Object.entries(overview.languages || {}).map(([name, value]) => ({ name, value: Number(value) }));
  const knownEntries = langEntries.filter((e) => e.name !== "Other");
  const existingOther = langEntries.find((e) => e.name === "Other")?.value || 0;
  knownEntries.sort((a, b) => b.value - a.value);

  let extensionData = [];
  if (knownEntries.length <= 5) {
    extensionData = [...knownEntries];
    if (existingOther > 0) extensionData.push({ name: "Other", value: existingOther });
  } else {
    const top5 = knownEntries.slice(0, 5);
    const extraOthers = knownEntries.slice(5).reduce((sum, e) => sum + e.value, 0);
    extensionData = [...top5, { name: "Other", value: existingOther + extraOthers }];
  }
  
  const riskData = [
    ...(overview?.risk_distribution || [
      { name: "High", value: 15 },
      { name: "Medium", value: 35 },
      { name: "Low", value: 50 },
    ]),
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{repository.name} Overview</h1>
        <p className="text-gray-500 mt-2">Analyzing {repository.files.toLocaleString()} files across {Object.keys(repository.languages).join(" / ")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Files", value: repository.files.toLocaleString(), icon: FileCode, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Total Lines", value: repository.lines.toLocaleString(), icon: Activity, color: "text-purple-500", bg: "bg-purple-50" },
          { label: "Contributors", value: repository.contributors, icon: Users, color: "text-green-500", bg: "bg-green-50" },
          { label: "High Risk Files", value: riskyFiles.filter((file) => file.riskScore >= 50).length, icon: ShieldAlert, color: "text-red-500", bg: "bg-red-50" },
          { 
            label: "Repository Risk", 
            value: `${repository.riskScore.toFixed(1)}%`,
            subtitle: overview?.risk_label || (repository.riskScore >= 70 ? "High Risk" : repository.riskScore >= 35 ? "Medium Risk" : "Low Risk"),
            icon: TriangleAlert, 
            color: "text-white", 
            bg: "bg-gradient-to-br from-orange-400 to-red-500",
            textColor: "text-white"
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={kpiVariants}
            className={`p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col ${kpi.bg}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-white/20 backdrop-blur-md`}>
                <kpi.icon className={`w-6 h-6 ${kpi.textColor || kpi.color}`} />
              </div>
            </div>
            <div className={`text-3xl font-bold ${kpi.textColor || "text-gray-900"}`}>{kpi.value}</div>
            <div className={`text-sm font-medium mt-1 ${kpi.textColor || "text-gray-500"}`}>{kpi.label}</div>
            {kpi.subtitle && (
              <div className="text-xs bg-white/20 py-1 px-2 rounded-lg mt-2 inline-block text-white backdrop-blur-md w-max">
                {kpi.subtitle}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risk Distribution */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-6">Risk Distribution</h2>
          <div className="flex-1 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  <Cell fill="#ef4444" />
                  <Cell fill="#f97316" />
                  <Cell fill="#22c55e" />
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-sm text-gray-600">High</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-sm text-gray-600">Medium</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-sm text-gray-600">Low</span></div>
          </div>
        </motion.div>

        {/* Language Distribution */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col lg:col-span-2"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-6">File Type Distribution</h2>
          <div className="flex-1 h-72 overflow-y-auto overflow-x-hidden">
            <div style={{ height: `${Math.max(240, extensionData.length * 40)}px`, minWidth: "280px" }}>
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={extensionData} layout="vertical" margin={{ top: 8, right: 24, left: 72, bottom: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={72} />
                <RechartsTooltip cursor={{ fill: "transparent" }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {extensionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Top Risky Files */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Top Risky Files</h2>
          <Link href={`/code?scan_id=${scanId || ""}`} className="text-sm text-primary font-medium hover:underline flex items-center">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-sm text-gray-500 font-medium">
                <th className="px-6 py-4">File</th>
                <th className="px-6 py-4">Risk</th>
                <th className="px-6 py-4">Language</th>
                <th className="px-6 py-4">LOC</th>
                <th className="px-6 py-4">Churn</th>
                <th className="px-6 py-4">Dependents</th>
                <th className="px-6 py-4">Last Modified</th>
              </tr>
            </thead>
            <tbody>
              {riskyFiles.map((file) => (
                <tr key={file.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group cursor-pointer">
                  <td className="px-6 py-4 font-medium text-gray-900 group-hover:text-primary transition-colors">
                    <Link href={`/code?scan_id=${scanId || ""}&file=${encodeURIComponent(file.path)}`}>{file.path}</Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {file.riskScore}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{file.language}</td>
                  <td className="px-6 py-4 text-gray-600">{file.loc}</td>
                  <td className="px-6 py-4 text-gray-600">{file.churn}</td>
                  <td className="px-6 py-4 text-gray-600">{file.dependents}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{file.lastModified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default function Dashboard() {
  return <Suspense fallback={<div className="p-8">Loading analysis...</div>}><DashboardContent /></Suspense>;
}
