"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrainCircuit, Send, FileCode2, GitCommit, Network, FileText, Loader2 } from "lucide-react";
import { AIMessage, AISource } from "../../lib/types";
import { askAi } from "../../lib/api/client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function AIAnalystContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get("scan_id");
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !scanId) return;

    const newMsg: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input
    };

    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await askAi(scanId, newMsg.content);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: response.answer,
        sources: response.sources as AISource[]
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: error instanceof Error ? error.message : "AI request failed" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'file': return <FileCode2 className="w-3 h-3" />;
      case 'graph': return <Network className="w-3 h-3" />;
      case 'commit': return <GitCommit className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const uniqueSources = (sources: AISource[]) => Array.from(
    new Map(sources.map((source) => [`${source.type}:${source.id}`, source])).values()
  );

  const [suggestions, setSuggestions] = useState<string[]>([
    "What dependencies exist in the architecture?",
    "Where is authentication implemented?", 
    "Which files have changed the most recently?"
  ]);

  useEffect(() => {
    if (scanId) {
      import("../../lib/api/client").then(({ getScanStatus }) => {
        getScanStatus(scanId).then((status) => {
          if (status.top_risky_files && status.top_risky_files.length > 0) {
            const topFile = status.top_risky_files[0].path;
            const name = topFile.split('/').pop() || topFile;
            setSuggestions([
              `What depends on ${name}?`,
              `Why is ${name} marked as high risk?`,
              "Which files have changed the most recently?"
            ]);
          }
        }).catch(console.error);
      });
    }
  }, [scanId]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-background">
      <div className="bg-white border-b border-gray-200 px-8 py-6 text-center shadow-sm z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-2xl mb-3">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">AI Codebase Analyst</h1>
        <p className="text-gray-500 mt-1 max-w-xl mx-auto">Ask questions about this repository using its code, architecture, and Git history powered by RAG embeddings.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-4xl mx-auto w-full">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl p-5 ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-br-none shadow-md shadow-primary/20' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none shadow-sm'
              }`}>
                <div className={`leading-relaxed ${msg.role === 'assistant' ? 'ai-markdown prose prose-sm prose-slate max-w-none prose-table:border-collapse prose-table:w-full prose-td:border prose-td:border-gray-200 prose-td:p-2 prose-th:border prose-th:border-gray-200 prose-th:p-2 prose-th:bg-gray-50 prose-a:text-primary prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md' : 'whitespace-pre-wrap'}`}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      Sources used
                    </p>
                    <div className="flex flex-col gap-3">
                      {uniqueSources(msg.sources).map((source: AISource) => (
                        <div key={`${source.type}-${source.id}`} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm hover:border-primary/30 transition-colors">
                          <div className="flex items-center gap-2 font-medium text-primary mb-2">
                            {getSourceIcon(source.type)}
                            <Link 
                              href={source.type === 'file'
                                ? `/code?scan_id=${encodeURIComponent(scanId || "")}&file=${encodeURIComponent(source.id)}`
                                : `/graph?scan_id=${encodeURIComponent(scanId || "")}`}
                              className="hover:underline"
                            >
                              {source.id}{source.start_line && source.end_line && source.start_line !== -1 ? `:${source.start_line}-${source.end_line}` : ''}
                            </Link>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
                            {source.risk_score !== undefined && (
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-gray-700">Risk metrics:</span> 
                                <span className={source.risk_score > 70 ? "text-red-600 font-medium" : source.risk_score > 30 ? "text-orange-500 font-medium" : "text-green-600 font-medium"}>
                                  {source.risk_score}/100
                                </span>
                              </div>
                            )}
                            {source.git_churn !== undefined && (
                              <div><span className="font-semibold text-gray-700">Churn:</span> {source.git_churn} modifications</div>
                            )}
                            {source.recent_commits && source.recent_commits !== "None" && (
                              <div className="col-span-2 truncate"><span className="font-semibold text-gray-700">Git history:</span> {source.recent_commits}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start"
            >
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-5 shadow-sm flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-gray-500 font-medium animate-pulse">Analyzing codebase vectors...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about high-risk files, architectural dependencies, or Git history..."
              className="w-full pl-6 pr-16 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-inner"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-3 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {suggestions.map(suggestion => (
              <button 
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
                className="whitespace-nowrap px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AIAnalyst() {
  return <Suspense fallback={<div className="p-8">Loading AI analyst...</div>}><AIAnalystContent /></Suspense>;
}
