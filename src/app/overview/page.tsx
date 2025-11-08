"use client";
import { useState, useEffect } from "react";
import { loadState, getSummary, getTransactionsByDateRange, addTransaction, deleteTransaction, getAllCategories, addCustomCategory } from "@/lib/store";
import type { Account, TxType, Transaction } from "@/lib/store";
import { TrendingUp, TrendingDown, Wallet, Plus, X, ArrowRightLeft, Edit2, Trash2, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAudioFeedback, useInputAudio } from "@/lib/useAudioFeedback";

type TimeRange = "today" | "week" | "month";

export default function Overview() {
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  const [monthOffset, setMonthOffset] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>("today");
  const [groupedTxs, setGroupedTxs] = useState<[string, Transaction[]][]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hoveredTxId, setHoveredTxId] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Audio feedback
  const playSound = useAudioFeedback();
  const handleInputKeyDown = useInputAudio();
  
  // Form state
  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState<Account>("Cash");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setSummary(getSummary(monthOffset));
    loadTransactions();
    // Load categories for current type
    const allCats = getAllCategories();
    setCategories(allCats[txType]);
    // Set default category
    if (!category || !allCats[txType].includes(category)) {
      setCategory(allCats[txType][0]);
    }
  }, [monthOffset, timeRange]);

  useEffect(() => {
    const allCats = getAllCategories();
    setCategories(allCats[txType]);
    setCategory(allCats[txType][0]);
    setShowNewCategory(false);
    setNewCategoryName("");
  }, [txType]);

  const loadTransactions = () => {
    const now = new Date();
    let startDate: Date, endDate: Date;

    // If not current month, show all transactions for selected month
    if (monthOffset !== 0) {
      const { start, end } = { 
        start: new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
        end: new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59)
      };
      startDate = start;
      endDate = end;
    } else {
      // Current month - use time range filter
      if (timeRange === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (timeRange === "week") {
        const day = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        endDate = new Date();
      } else {
        const { start, end } = { 
          start: new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
          end: new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59)
        };
        startDate = start;
        endDate = end;
      }
    }

    const grouped = getTransactionsByDateRange(startDate, endDate);
    setGroupedTxs(grouped);
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTransaction(id);
      setSummary(getSummary(monthOffset));
      loadTransactions();
      playSound('delete');
    }
  };

  const handleAddTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    addTransaction({
      type: txType,
      amount: parseFloat(amount),
      currency: "BDT",
      category,
      note,
      source: "manual",
      date: new Date(date).toISOString(),
      account,
      location: null,
    });

    // Reset form
    setAmount("");
    setNote("");
    setDate(new Date().toISOString().split('T')[0]);
    setShowAddModal(false);
    
    // Reload
    setSummary(getSummary(monthOffset));
    loadTransactions();
    
    // Success sound
    playSound('success');
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    
    const success = addCustomCategory(txType, trimmed);
    if (success) {
      // Reload categories
      const allCats = getAllCategories();
      setCategories(allCats[txType]);
      setCategory(trimmed);
      setNewCategoryName("");
      setShowNewCategory(false);
      playSound('success');
    } else {
      alert("Category already exists!");
      playSound('error');
    }
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentDate = new Date();
  const displayMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1);

  const cards = [
    { label: "Income", value: summary.income, icon: TrendingUp, gradient: "from-green-500 to-emerald-600", bg: "bg-gradient-to-br from-green-50 to-emerald-50" },
    { label: "Expense", value: summary.expense, icon: TrendingDown, gradient: "from-red-500 to-rose-600", bg: "bg-gradient-to-br from-red-50 to-rose-50" },
    { label: "Balance", value: summary.balance, icon: Wallet, gradient: "from-teal-500 to-cyan-600", bg: "bg-gradient-to-br from-teal-50 to-cyan-50" },
  ];

  return (
    <div className="space-y-5 py-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Financial Overview</h2>
        <p className="text-sm text-gray-500 mt-1">Your financial snapshot</p>
      </motion.div>

      {/* Month selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-2">
        <button onClick={() => setMonthOffset(monthOffset - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border-2 border-gray-200 hover:border-teal-500 transition-all">
          <span className="text-lg">‹</span>
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-bold text-gray-800">{monthNames[displayMonth.getMonth()]} {displayMonth.getFullYear()}</p>
        </div>
        <button onClick={() => setMonthOffset(monthOffset + 1)} disabled={monthOffset >= 0} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border-2 border-gray-200 hover:border-teal-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          <span className="text-lg">›</span>
        </button>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: idx * 0.1, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className={`relative overflow-hidden rounded-2xl ${card.bg} p-4 shadow-lg border border-white/50`}
            >
              <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${card.gradient} opacity-20`} />
              <div className={`mb-2 inline-flex rounded-xl bg-gradient-to-br ${card.gradient} p-2 shadow-lg`}>
                <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{card.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-1">৳{card.value.toLocaleString()}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Time range selector - only show for current month */}
      {monthOffset === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
          {(["today", "week", "month"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                timeRange === range
                  ? "gradient-teal text-white shadow-lg"
                  : "bg-white border-2 border-gray-200 text-gray-600 hover:border-teal-500"
              }`}
            >
              {range === "today" ? "Today" : range === "week" ? "Last Week" : "Current Month"}
            </button>
          ))}
        </motion.div>
      )}

      {/* Transactions grouped by date */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
        
        {groupedTxs.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-500">No transactions for this period</p>
          </div>
        ) : (
          groupedTxs.map(([dateKey, txs], groupIdx) => (
            <motion.div
              key={dateKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + groupIdx * 0.05 }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  {new Date(dateKey).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="space-y-2">
                {txs.map((tx, idx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * idx }}
                    onMouseEnter={() => setHoveredTxId(tx.id)}
                    onMouseLeave={() => setHoveredTxId(null)}
                    className="glass-card rounded-xl p-3 hover:shadow-xl transition-all cursor-pointer relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          tx.type === "income" ? "bg-green-100" : tx.type === "transfer" ? "bg-purple-100" : "bg-red-100"
                        }`}>
                          {tx.type === "income" ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : tx.type === "transfer" ? (
                            <ArrowRightLeft className="h-4 w-4 text-purple-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800">{tx.category}</p>
                            {tx.source !== "manual" && (
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-sm">
                                {tx.source}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {tx.note && <p className="text-xs text-gray-500">{tx.note}</p>}
                            <span className="text-xs text-gray-400">• {tx.account}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-base font-bold ${
                          tx.type === "income" ? "text-green-600" : tx.type === "transfer" ? "text-purple-600" : "text-red-600"
                        }`}>
                          {tx.type === "income" ? "+" : tx.type === "transfer" ? "→" : "-"}৳{tx.amount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {/* Action buttons - visible on hover */}
                    <AnimatePresence>
                      {hoveredTxId === tx.id && (
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 bg-white rounded-lg shadow-lg p-1 border border-gray-200"
                        >
                          <button
                            onClick={() => alert("Edit functionality coming soon!")}
                            className="p-1.5 rounded hover:bg-blue-50 transition-colors group/edit"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4 text-gray-400 group-hover/edit:text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 rounded hover:bg-red-50 transition-colors group/delete"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-gray-400 group-hover/delete:text-red-600" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Floating Add Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { setShowAddModal(true); playSound('tap'); }}
        className="fixed bottom-24 right-4 md:right-[calc(50%-12rem)] z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-teal shadow-2xl hover:shadow-3xl transition-all"
      >
        <Plus className="h-7 w-7 text-white" strokeWidth={3} />
      </motion.button>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-md glass-card rounded-2xl p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">Add Transaction</h3>
                <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700 uppercase tracking-wide">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["expense", "income", "transfer"] as TxType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => { setTxType(type); playSound('tap'); }}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                          txType === type
                            ? "gradient-teal text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700 uppercase tracking-wide">Amount (৳)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-semibold focus:border-teal-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                    <span>Category</span>
                    <button
                      onClick={() => { setShowNewCategory(!showNewCategory); playSound('tap'); }}
                      className="text-teal-600 hover:text-teal-700 flex items-center gap-1"
                      type="button"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-semibold">New</span>
                    </button>
                  </label>
                  
                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddCustomCategory()}
                        onKeyDown={handleInputKeyDown}
                        className="flex-1 rounded-xl border-2 border-teal-500 bg-white p-3 text-sm font-medium focus:outline-none"
                        placeholder="Enter category name..."
                        autoFocus
                      />
                      <button
                        onClick={handleAddCustomCategory}
                        className="px-4 rounded-xl gradient-teal text-white text-sm font-semibold"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setShowNewCategory(false); setNewCategoryName(""); playSound('tap'); }}
                        className="px-3 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-medium focus:border-teal-500 focus:outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700 uppercase tracking-wide">Account</label>
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value as Account)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-medium focus:border-teal-500 focus:outline-none"
                  >
                    {(["Cash", "bKash", "Nagad", "Bank", "Rocket"] as Account[]).map((acc) => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700 uppercase tracking-wide">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-medium focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700 uppercase tracking-wide">Note (Optional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm focus:border-teal-500 focus:outline-none"
                    placeholder="Add a note..."
                  />
                </div>

                <motion.button
                  onClick={handleAddTransaction}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl gradient-teal py-3 text-sm font-bold text-white shadow-lg"
                >
                  Add Transaction
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
