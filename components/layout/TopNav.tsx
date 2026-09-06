"use client";

import { usePathname } from "next/navigation";
import { Search, GitBranch } from "lucide-react";

export function TopNav() {
  const pathname = usePathname();

  // Don't show top nav on landing page
  if (pathname === "/") return null;

  return (
    <header className="h-20 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-8">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search files, functions, or risks..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
          <GitBranch className="w-4 h-4 text-gray-600" />
          <input 
            type="text" 
            placeholder="Repository URL"
            className="bg-transparent text-sm w-64 focus:outline-none text-gray-600"
          />
        </div>
        <button className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors shadow-md shadow-primary/20">
          Scan Repository
        </button>
      </div>
    </header>
  );
}
