"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      <div className={`flex flex-col flex-1 transition-all duration-300 ${isSidebarCollapsed ? "ml-0 lg:ml-20" : "ml-0 lg:ml-64"}`}>
        <TopNav />
        <main className="flex-1 bg-background/30">
          {children}
        </main>
      </div>
    </div>
  );
}
