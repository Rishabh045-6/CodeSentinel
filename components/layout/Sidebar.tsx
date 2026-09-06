"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Network, Code2, Sparkles, FolderGit2, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import { getOverview, cleanupScan } from "../../lib/api/client";

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Dependency Graph", href: "/graph", icon: Network },
  { name: "Code Analyzer", href: "/code", icon: Code2 },
  { name: "AI Analyst", href: "/ai", icon: Sparkles },
];

export function Sidebar({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean, setIsCollapsed: (val: boolean) => void }) {
  const pathname = usePathname();
  const [scanId, setScanId] = useState<string | null>(null);
  const [repositoryName, setRepositoryName] = useState("No repository selected");

  useEffect(() => {
    setScanId(new URLSearchParams(window.location.search).get("scan_id"));
  }, [pathname]);

  useEffect(() => {
    if (scanId) getOverview(scanId).then((overview) => setRepositoryName(overview.repository || "Repository")).catch(() => setRepositoryName("Repository unavailable"));
  }, [scanId]);

  const handleLogout = async () => {
    if (scanId) await cleanupScan(scanId).catch(console.error);
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className={`${isCollapsed ? "w-16 lg:w-20" : "w-64"} h-screen border-r border-gray-200 bg-white flex flex-col fixed left-0 top-0 transition-all duration-300 z-50`}>
      <div className={`p-6 flex items-center ${isCollapsed ? "justify-center px-0" : ""}`}>
        <h1 className={`font-bold flex items-center gap-2 text-primary ${isCollapsed ? "text-xl" : "text-2xl"}`}>
          <FolderGit2 className="w-6 h-6 shrink-0" />
          {!isCollapsed && <span>CodeLens AI</span>}
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 relative">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute ${isCollapsed ? "-right-3" : "-right-5"} top-2 bg-white border border-gray-200 rounded-full p-1 text-gray-500 hover:text-primary z-50`}
          title="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        {navItems.map((item) => {
          if (!scanId && item.name !== "Overview") return null;
          
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={`${item.href}${scanId ? `?scan_id=${encodeURIComponent(scanId)}` : ""}`}
              onClick={() => setIsCollapsed(false)}
              className={`flex items-center gap-3 py-3 rounded-xl transition-all ${
                isCollapsed ? "justify-center px-0" : "px-4"
              } ${
                isActive
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-gray-600 hover:bg-background hover:text-primary"
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="font-medium truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`p-6 border-t border-gray-100 ${isCollapsed ? "px-2" : ""}`}>
        {!isCollapsed ? (
          <div className="bg-background rounded-xl p-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Repository</p>
            <p className="font-semibold text-gray-800 truncate">{repositoryName}</p>
            {scanId && <p className="text-xs text-gray-400 mt-3">Analysis ID: {scanId.slice(0, 8)}</p>}
          </div>
        ) : (
          <div className="bg-background rounded-xl p-2 flex justify-center">
            <FolderGit2 className="w-5 h-5 text-gray-500" title={repositoryName} />
          </div>
        )}
        
        <div className={`mt-4 ${isCollapsed ? "flex justify-center" : "px-2"}`}>
          {scanId && (
            <button onClick={handleLogout} className="flex items-center gap-2 text-xs text-red-600 hover:text-red-800" title={isCollapsed ? "Log out" : undefined}>
              <LogOut className="w-4 h-4 shrink-0" /> {!isCollapsed && <span>Log out</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
