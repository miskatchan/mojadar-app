"use client";
import { useState, useEffect } from "react";
import { loadState, updateMemory, deleteMemory, type Memory } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Edit2, Trash2, X, Save, Calendar } from "lucide-react";

export default function MemoriesManager() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = () => {
    const state = loadState();
    setMemories(state.memories);
  };

  const handleEdit = (memory: Memory) => {
    setEditingId(memory.id);
    setEditText(memory.text);
  };

  const handleSave = (id: string) => {
    if (editText.trim()) {
      updateMemory(id, editText.trim());
      loadMemories();
      setEditingId(null);
      setEditText("");
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this memory?")) {
      deleteMemory(id);
      loadMemories();
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditText("");
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (memories.length === 0) {
    return (
      <div className="text-center py-8">
        <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 font-medium">No memories stored yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Tell the AI to remember important events or information
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {memories.map((memory, index) => (
          <motion.div
            key={memory.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card rounded-xl p-3 shadow-md"
          >
            {editingId === memory.id ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full rounded-lg border-2 border-teal-300 bg-white p-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => handleSave(memory.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </motion.button>
                  <motion.button
                    onClick={handleCancel}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gray-200 px-3 py-2 text-xs font-bold text-gray-700 shadow-md hover:shadow-lg transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </motion.button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 leading-relaxed">{memory.text}</p>
                  </div>
                  <div className="flex gap-1">
                    <motion.button
                      onClick={() => handleEdit(memory)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Edit memory"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </motion.button>
                    <motion.button
                      onClick={() => handleDelete(memory.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Delete memory"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(memory.timestamp)}</span>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
