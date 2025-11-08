"use client";
import { useState, useEffect } from "react";
import { addTransaction, loadState, addMemory } from "@/lib/store";
import { parseNaturalLanguage, executeParsedAction } from "@/lib/transactionParser";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Brain } from "lucide-react";
import MemoriesManager from "@/components/MemoriesManager";

export default function AskAI() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [memoriesCount, setMemoriesCount] = useState(0);

  useEffect(() => {
    updateMemoriesCount();
  }, []);

  const updateMemoriesCount = () => {
    const state = loadState();
    setMemoriesCount(state.memories.length);
  };

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      // First, try to parse the input locally for immediate transaction operations
      const parsed = parseNaturalLanguage(userMsg);
      
      if (parsed && (parsed.action === "add_transaction" || parsed.action === "add_to_last" || parsed.action === "add_to_specific")) {
        // Execute the parsed action immediately
        const result = executeParsedAction(parsed);
        if (result.success) {
          setMessages((m) => [...m, { role: "system", text: result.message }]);
          setLoading(false);
          return;
        }
      }

      // Check for memory keywords
      const memoryKeywords = /\b(?:remember|next month|next week|birthday|anniversary|event|don't forget|keep in mind)/i;
      if (memoryKeywords.test(userMsg)) {
        addMemory(userMsg);
        updateMemoriesCount();
        setMessages((m) => [...m, { 
          role: "assistant", 
          text: "I've stored this memory and will consider it in future budget planning and financial advice. You can view and manage all memories using the 'View Memories' button above." 
        }]);
        setLoading(false);
        return;
      }

      // For other queries, send to AI API
      const memories = loadState().memories.map((m) => m.text).join("; ");
      const prompt = `User memories: ${memories}\n\nUser: ${userMsg}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      const text = json.text || "";

      setMessages((m) => [...m, { role: "assistant", text }]);

      // Parse AI response for commands
      const cmdMatch = text.match(/\{[^]*\}/);
      if (cmdMatch) {
        try {
          const cmd = JSON.parse(cmdMatch[0]);
          
          // Handle different action types
          if (cmd.action === "add_transaction") {
            addTransaction({
              type: cmd.type || "expense",
              amount: Number(cmd.amount),
              currency: "BDT",
              category: cmd.category || "Other",
              note: cmd.note || "Added via AI",
              source: "manual",
              date: new Date().toISOString(),
              account: cmd.account || "Cash",
              location: null,
            });
            setMessages((m) => [...m, { role: "system", text: `✅ Added ${cmd.type || "expense"} of ৳${cmd.amount} for ${cmd.category || "Other"}` }]);
          }
          else if (cmd.action === "add_to_last" || cmd.action === "add_to_specific") {
            const result = executeParsedAction(cmd);
            if (result.success) {
              setMessages((m) => [...m, { role: "system", text: result.message }]);
            } else {
              setMessages((m) => [...m, { role: "system", text: `❌ ${result.message}` }]);
            }
          }
          else if (cmd.action === "add_memory") {
            addMemory(cmd.text);
            updateMemoriesCount();
          }
        } catch (e) {
          console.error("Failed to parse command:", e);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((m) => [...m, { 
        role: "system", 
        text: "❌ Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col py-5" style={{ height: "calc(100vh - 140px)" }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Ask AI</h2>
            <p className="text-sm text-gray-500 mt-1">Chat with your financial assistant</p>
          </div>
          <motion.button
            onClick={() => setShowMemories(!showMemories)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Brain className="h-4 w-4" />
            {showMemories ? "Hide" : "View"} Memories
            {memoriesCount > 0 && (
              <span className="ml-1 bg-white text-purple-600 rounded-full px-2 py-0.5 text-[10px] font-bold">
                {memoriesCount}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Memories Section */}
      <AnimatePresence>
        {showMemories && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="glass-card rounded-2xl p-4 shadow-lg max-h-64 overflow-y-auto">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                Stored Memories
              </h3>
              <MemoriesManager />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 p-4 shadow-inner">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-5xl">💬</div>
              <p className="text-sm font-semibold text-gray-600">Start a conversation</p>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <p>• "I spent 100tk on food"</p>
                <p>• "Add 50tk to my last transaction"</p>
                <p>• "Remember, next month is my sister's birthday"</p>
                <p>• "Optimize my budget for savings"</p>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`rounded-2xl p-3 text-sm shadow-lg ${
              msg.role === "user" 
                ? "ml-auto max-w-[80%] gradient-teal text-white font-medium" 
                : msg.role === "system" 
                ? "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-900 font-semibold border-2 border-yellow-200" 
                : "glass-card max-w-[85%] text-gray-700"
            }`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-gray-500"
          >
            <div className="h-2 w-2 animate-bounce rounded-full bg-teal-500" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-teal-500" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-teal-500" style={{ animationDelay: '300ms' }} />
            <span className="ml-1 font-medium">AI is thinking...</span>
          </motion.div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && send()}
          className="flex-1 rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-medium focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 transition-all shadow-sm"
          placeholder="Try: 'I spent 100tk on food' or 'Remember my birthday is next month'..."
        />
        <motion.button 
          onClick={send} 
          disabled={loading || !input.trim()}
          whileHover={{ scale: loading || !input.trim() ? 1 : 1.05 }}
          whileTap={{ scale: loading || !input.trim() ? 1 : 0.95 }}
          className="rounded-xl gradient-teal px-5 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "⏳" : "📤"}
        </motion.button>
      </div>
    </div>
  );
}
