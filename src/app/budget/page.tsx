"use client";
import { useState, useEffect } from "react";
import { loadState, getAllCategories, addCustomCategory, getMonthRange } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, TrendingDown, Trash2, Edit2, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, BarChart3, PlusCircle } from "lucide-react";
import { useAudioFeedback, useInputAudio } from "@/lib/useAudioFeedback";

type Budget = {
  id: string;
  category: string;
  limit: number;
  spent: number;
};

type MonthlyBudgets = {
  [monthKey: string]: Budget[];
};

export default function Budget() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [limit, setLimit] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // Audio feedback
  const playSound = useAudioFeedback();
  const handleInputKeyDown = useInputAudio();

  const now = new Date();
  const displayMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthName = displayMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const monthKey = `${displayMonth.getFullYear()}-${String(displayMonth.getMonth() + 1).padStart(2, '0')}`;

  // Load budgets from localStorage for the selected month
  useEffect(() => {
    // Load categories
    const allCats = getAllCategories();
    setCategories(allCats.expense);
    if (!category) {
      setCategory(allCats.expense[0]);
    }
    
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hisabguru_monthly_budgets');
      const state = loadState();
      const { start, end } = getMonthRange(monthOffset);
      
      let monthlyBudgets: MonthlyBudgets = {};
      
      if (saved) {
        monthlyBudgets = JSON.parse(saved);
      } else {
        // Create default budgets for September, October, November 2025
        const defaultCategories = [
          { category: 'Food & Dining', limit: 2500 },
          { category: 'Transport', limit: 800 },
          { category: 'Shopping', limit: 1500 },
          { category: 'Education', limit: 3000 },
          { category: 'Entertainment', limit: 1000 },
          { category: 'Bills & Utilities', limit: 500 },
        ];
        
        // September 2025
        monthlyBudgets['2025-09'] = defaultCategories.map((cat, idx) => ({
          id: `sep-${idx + 1}`,
          ...cat,
          spent: 0
        }));
        
        // October 2025
        monthlyBudgets['2025-10'] = defaultCategories.map((cat, idx) => ({
          id: `oct-${idx + 1}`,
          ...cat,
          spent: 0
        }));
        
        // November 2025
        monthlyBudgets['2025-11'] = defaultCategories.map((cat, idx) => ({
          id: `nov-${idx + 1}`,
          ...cat,
          spent: 0
        }));
        
        localStorage.setItem('hisabguru_monthly_budgets', JSON.stringify(monthlyBudgets));
      }
      
      // Get budgets for current month
      const currentMonthBudgets = monthlyBudgets[monthKey] || [];
      
      // Calculate spent for each budget
      const budgetsWithSpent = currentMonthBudgets.map((budget: Budget) => {
        const spent = state.transactions
          .filter(tx => {
            const txDate = new Date(tx.date);
            return tx.type === 'expense' && 
                   tx.category === budget.category &&
                   txDate >= start &&
                   txDate <= end;
          })
          .reduce((sum, tx) => sum + tx.amount, 0);
        return { ...budget, spent };
      });
      
      setBudgets(budgetsWithSpent);
    }
  }, [monthOffset, monthKey]);

  // Save budgets to localStorage for the current month
  const saveBudgets = (budgetsToSave: Budget[]) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hisabguru_monthly_budgets');
      let monthlyBudgets: MonthlyBudgets = saved ? JSON.parse(saved) : {};
      
      // Save budgets for the current month
      monthlyBudgets[monthKey] = budgetsToSave;
      
      localStorage.setItem('hisabguru_monthly_budgets', JSON.stringify(monthlyBudgets));
    }
  };

  const handleAddBudget = () => {
    if (!limit || parseFloat(limit) <= 0) return;
    
    if (editingBudget) {
      // Update existing budget
      const state = loadState();
      const { start, end } = getMonthRange(monthOffset);
      
      const spent = state.transactions
        .filter(tx => {
          const txDate = new Date(tx.date);
          return tx.type === 'expense' && 
                 tx.category === category &&
                 txDate >= start &&
                 txDate <= end;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

      const updated = budgets.map(b => 
        b.id === editingBudget.id 
          ? { ...b, category, limit: parseFloat(limit), spent }
          : b
      );
      
      setBudgets(updated);
      saveBudgets(updated);
      setEditingBudget(null);
      setLimit('');
      setShowAddModal(false);
      playSound('success');
    } else {
      // Add new budget
      // Check if category already has a budget
      if (budgets.some(b => b.category === category)) {
        alert('Budget already exists for this category!');
        playSound('error');
        return;
      }

      const state = loadState();
      const { start, end } = getMonthRange(monthOffset);
      
      // Calculate spent for the new budget immediately
      const spent = state.transactions
        .filter(tx => {
          const txDate = new Date(tx.date);
          return tx.type === 'expense' && 
                 tx.category === category &&
                 txDate >= start &&
                 txDate <= end;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

      const newBudget: Budget = {
        id: Math.random().toString(36).substr(2, 9),
        category,
        limit: parseFloat(limit),
        spent
      };

      const updated = [...budgets, newBudget];
      setBudgets(updated);
      saveBudgets(updated);
      setLimit('');
      setShowAddModal(false);
      playSound('success');
    }
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setCategory(budget.category);
    setLimit(budget.limit.toString());
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingBudget(null);
    const allCats = getAllCategories();
    setCategory(allCats.expense[0]);
    setLimit('');
    setShowNewCategory(false);
    setNewCategoryName('');
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    
    const success = addCustomCategory('expense', trimmed);
    if (success) {
      // Reload categories
      const allCats = getAllCategories();
      setCategories(allCats.expense);
      setCategory(trimmed);
      setNewCategoryName("");
      setShowNewCategory(false);
      playSound('success');
    } else {
      alert("Category already exists!");
      playSound('error');
    }
  };

  const handleDeleteBudget = (id: string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      const updated = budgets.filter(b => b.id !== id);
      setBudgets(updated);
      saveBudgets(updated);
      playSound('delete');
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'from-red-500 to-rose-600';
    if (percentage >= 80) return 'from-orange-500 to-amber-600';
    if (percentage >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-emerald-600';
  };

  const getProgressStatus = (percentage: number) => {
    if (percentage >= 100) return { icon: AlertTriangle, text: 'Over Budget!', color: 'text-red-600' };
    if (percentage >= 80) return { icon: AlertTriangle, text: 'Near Limit', color: 'text-orange-600' };
    return { icon: CheckCircle, text: 'On Track', color: 'text-green-600' };
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-3 py-3">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Budget Management</h2>
            <p className="text-xs text-gray-500 mt-0.5">Set limits and track spending</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setShowChart(!showChart)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 px-3 py-2 text-xs font-bold text-white shadow-lg hover:shadow-xl transition-all"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Chart
            </motion.button>
            <motion.button
              onClick={() => setShowAddModal(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 rounded-lg gradient-teal px-3 py-2 text-xs font-bold text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Month Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-3 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <motion.button
            onClick={() => setMonthOffset(monthOffset - 1)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md hover:shadow-lg transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>
          <div className="text-center">
            <h3 className="text-base font-bold text-gray-800">{monthName}</h3>
          </div>
          <motion.button
            onClick={() => setMonthOffset(monthOffset + 1)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md hover:shadow-lg transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>

      {/* Bar Chart Visualization */}
      <AnimatePresence mode="wait">
        {showChart && budgets.length > 0 && (
          <motion.div
            key={`chart-${monthKey}-${budgets.length}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card rounded-xl p-4 shadow-lg overflow-hidden"
          >
            <h3 className="text-sm font-bold text-gray-800 mb-3">Budget vs Expense</h3>
            
            {/* Bar Graph Container */}
            <div className="relative">
              {/* Y-axis and bars */}
              <div className="flex items-end gap-2 h-48 pb-8 relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 bottom-8 top-0 flex flex-col justify-between text-[9px] font-semibold text-gray-500 pr-1">
                  {(() => {
                    const maxValue = Math.max(...budgets.map(b => Math.max(b.limit, b.spent)), 100);
                    // Calculate nice step size that fits the data better
                    const roughStep = maxValue / 5;
                    let step;
                    if (roughStep <= 50) step = Math.ceil(roughStep / 10) * 10; // 10, 20, 30...
                    else if (roughStep <= 100) step = Math.ceil(roughStep / 25) * 25; // 25, 50, 75, 100
                    else if (roughStep <= 200) step = Math.ceil(roughStep / 50) * 50; // 50, 100, 150, 200
                    else if (roughStep <= 600) step = Math.ceil(roughStep / 100) * 100; // 100, 200, 300, 400, 500, 600
                    else if (roughStep <= 1500) step = Math.ceil(roughStep / 250) * 250; // 250, 500, 750, 1000, 1250, 1500
                    else step = Math.ceil(roughStep / 500) * 500; // 500, 1000, 1500, 2000
                    
                    return [5, 4, 3, 2, 1, 0].map((i) => (
                      <span key={i} className="leading-none">৳{(i * step).toLocaleString()}</span>
                    ));
                  })()}
                </div>

                {/* Horizontal grid lines */}
                <div className="absolute left-8 right-0 bottom-8 top-0 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-full border-t border-gray-200"></div>
                  ))}
                </div>

                {/* Bars */}
                <div className="flex-1 flex items-end justify-around gap-1 pl-8 relative z-10">
                  {budgets.map((budget, idx) => {
                    const maxValue = Math.max(...budgets.map(b => Math.max(b.limit, b.spent)), 100);
                    // Calculate step for proper scaling - must match Y-axis calculation
                    const roughStep = maxValue / 5;
                    let step;
                    if (roughStep <= 50) step = Math.ceil(roughStep / 10) * 10; // 10, 20, 30...
                    else if (roughStep <= 100) step = Math.ceil(roughStep / 25) * 25; // 25, 50, 75, 100
                    else if (roughStep <= 200) step = Math.ceil(roughStep / 50) * 50; // 50, 100, 150, 200
                    else if (roughStep <= 600) step = Math.ceil(roughStep / 100) * 100; // 100, 200, 300, 400, 500, 600
                    else if (roughStep <= 1500) step = Math.ceil(roughStep / 250) * 250; // 250, 500, 750, 1000, 1250, 1500
                    else step = Math.ceil(roughStep / 500) * 500; // 500, 1000, 1500, 2000
                    
                    const yAxisMax = step * 5; // Maximum value on Y-axis
                    const limitHeight = yAxisMax > 0 ? Math.min(100, (budget.limit / yAxisMax) * 100) : 0;
                    const spentHeight = yAxisMax > 0 ? Math.min(100, (budget.spent / yAxisMax) * 100) : 0;
                    
                    // Debug logging
                    if (idx === 0) {
                      console.log('Bar Chart Debug:', {
                        maxValue,
                        roughStep,
                        step,
                        yAxisMax,
                        budgetLimit: budget.limit,
                        budgetSpent: budget.spent,
                        limitHeight: `${limitHeight}%`,
                        spentHeight: `${spentHeight}%`
                      });
                    }

                    return (
                      <div key={`bar-group-${budget.id}`} className="flex-1 flex items-end justify-center gap-0.5 max-w-[60px]">
                        {/* Limit Bar (Red gradient) */}
                        <motion.div
                          key={`limit-${budget.id}-${budget.limit}-${yAxisMax}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: `${limitHeight}%`, opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ 
                            duration: 0.8, 
                            delay: idx * 0.1,
                            ease: "easeOut"
                          }}
                          className="flex-1 bg-gradient-to-b from-red-400 to-red-500 rounded-t border-2 border-red-600 shadow-sm"
                          style={{ minHeight: limitHeight > 0 ? '8px' : '0px' }}
                        />
                        {/* Spent Bar (Cyan gradient) */}
                        <motion.div
                          key={`spent-${budget.id}-${budget.spent}-${yAxisMax}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: `${spentHeight}%`, opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ 
                            duration: 0.8, 
                            delay: idx * 0.1 + 0.2,
                            ease: "easeOut"
                          }}
                          className="flex-1 bg-gradient-to-b from-cyan-400 to-cyan-500 rounded-t border-2 border-cyan-600 shadow-sm"
                          style={{ minHeight: spentHeight > 0 ? '8px' : '0px' }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-axis labels (Category names) */}
              <div className="flex items-start justify-around gap-1 pl-8 mt-1">
                {budgets.map((budget) => (
                  <div key={budget.id} className="flex-1 max-w-[60px]">
                    <p className="text-[9px] font-semibold text-gray-700 text-center leading-tight break-words">
                      {budget.category.split(' ')[0]}
                    </p>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-3 rounded bg-gradient-to-b from-red-400 to-red-500 border border-red-600"></div>
                  <span className="text-[10px] font-semibold text-gray-700">Budget</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-3 rounded bg-gradient-to-b from-cyan-400 to-cyan-500 border border-cyan-600"></div>
                  <span className="text-[10px] font-semibold text-gray-700">Spent</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overall Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-3 shadow-lg"
      >
        <div className="grid grid-cols-3 gap-3 mb-2">
          <div className="text-center">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Budget</p>
            <p className="text-lg font-bold text-gray-800 mt-0.5">৳{totalBudget.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Spent</p>
            <p className="text-lg font-bold text-red-600 mt-0.5">৳{totalSpent.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Left</p>
            <p className="text-lg font-bold text-green-600 mt-0.5">৳{Math.max(0, totalBudget - totalSpent).toLocaleString()}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">Progress</span>
            <span className="font-bold text-gray-800">{Math.min(100, overallPercentage).toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, overallPercentage)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full bg-gradient-to-r ${getProgressColor(overallPercentage)} shadow-sm`}
            />
          </div>
        </div>
      </motion.div>

      {/* Budget List */}
      {budgets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-8 text-center"
        >
          <TrendingDown className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium text-sm mb-1">No budgets set yet</p>
          <p className="text-xs text-gray-400">Click "Add" to create budget</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {budgets.map((budget, idx) => {
            const percentage = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;
            const status = getProgressStatus(percentage);
            const StatusIcon = status.icon;

            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card rounded-xl p-3 shadow-md hover:shadow-lg transition-all relative group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-gray-800">{budget.category}</h4>
                      <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                    </div>
                    <p className={`text-[10px] font-semibold ${status.color}`}>{status.text}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditBudget(budget)}
                      className="p-1.5 rounded-md hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="p-1.5 rounded-md hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Spent: <span className="font-bold text-gray-800">৳{budget.spent.toLocaleString()}</span></span>
                    <span className="text-gray-600">Limit: <span className="font-bold text-gray-800">৳{budget.limit.toLocaleString()}</span></span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="h-4 w-full rounded-full bg-gray-200 overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, percentage)}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.08, ease: "easeOut" }}
                        className={`h-full bg-gradient-to-r ${getProgressColor(percentage)} shadow-inner`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-gray-700">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-500">৳0</span>
                      <span className="font-semibold text-gray-600">
                        ৳{Math.max(0, budget.limit - budget.spent).toLocaleString()} left
                      </span>
                      <span className="text-gray-500">৳{budget.limit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Budget Modal */}
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
                <h3 className="text-lg font-bold text-gray-800">{editingBudget ? 'Edit Budget' : 'Add Budget'}</h3>
                <button onClick={handleCloseModal} className="rounded-lg p-1 hover:bg-gray-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                    <span>Category</span>
                    <button
                      onClick={() => setShowNewCategory(!showNewCategory)}
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
                        onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}
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
                  <label className="mb-2 block text-xs font-bold text-gray-700 uppercase tracking-wide">Monthly Limit (৳)</label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white p-3 text-sm font-semibold focus:border-teal-500 focus:outline-none"
                    placeholder="Enter budget limit"
                  />
                </div>

                <motion.button
                  onClick={handleAddBudget}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl gradient-teal py-3 text-sm font-bold text-white shadow-lg"
                >
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
