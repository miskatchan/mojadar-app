"use client";
import { useState, useEffect } from "react";
import { loadState, getMonthRange } from "@/lib/store";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type AnalysisType = "expense" | "income";
type ViewMode = "lastMonths" | "singleMonth";

export default function Analysis() {
  const [data, setData] = useState<any[]>([]);
  const [analysisType, setAnalysisType] = useState<AnalysisType>("expense");
  const [viewMode, setViewMode] = useState<ViewMode>("lastMonths");
  const [monthsCount, setMonthsCount] = useState(3);
  const [monthOffset, setMonthOffset] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const state = loadState();
    let filteredTxs;

    if (viewMode === "lastMonths") {
      // Get transactions from last K months
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      filteredTxs = state.transactions.filter(t => {
        const txDate = new Date(t.date);
        return t.type === analysisType && txDate >= startDate && txDate <= endDate;
      });
    } else {
      // Get transactions from specific month
      const { start, end } = getMonthRange(monthOffset);
      filteredTxs = state.transactions.filter(t => {
        const txDate = new Date(t.date);
        return t.type === analysisType && txDate >= start && txDate <= end;
      });
    }

    const catMap = new Map<string, number>();
    filteredTxs.forEach((t) => {
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    });
    
    const totalAmount = Array.from(catMap.values()).reduce((sum, val) => sum + val, 0);
    setTotal(totalAmount);
    setData(Array.from(catMap.entries()).map(([name, value]) => ({ name, value })));
  }, [analysisType, viewMode, monthsCount, monthOffset]);

  const COLORS = [
    "#14b8a6", // Teal
    "#06b6d4", // Cyan
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#10b981", // Emerald
    "#6366f1", // Indigo
    "#f97316", // Orange
    "#84cc16", // Lime
  ];

  const now = new Date();
  const displayMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthName = displayMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Custom tooltip with percentage
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = total > 0 ? (payload[0].value / total * 100).toFixed(1) : 0;
      return (
        <div className="bg-white/95 backdrop-blur-sm border-none rounded-xl shadow-lg p-3">
          <p className="text-xs font-bold text-gray-800">{payload[0].name}</p>
          <p className="text-sm font-bold text-teal-600">৳{payload[0].value.toLocaleString()}</p>
          <p className="text-xs font-semibold text-gray-600">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3 py-3">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Financial Analysis</h2>
        <p className="text-xs text-gray-500 mt-0.5">Visualize your spending patterns</p>
      </motion.div>

      {/* Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-3 shadow-lg space-y-3"
      >
        {/* Type Toggle */}
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2">Analysis Type</p>
          <div className="flex gap-2">
            <button
              onClick={() => setAnalysisType("expense")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                analysisType === "expense"
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md"
                  : "bg-white border-2 border-gray-200 text-gray-600 hover:border-red-500"
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              Expense
            </button>
            <button
              onClick={() => setAnalysisType("income")}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                analysisType === "income"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md"
                  : "bg-white border-2 border-gray-200 text-gray-600 hover:border-green-500"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Income
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2">View Mode</p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("lastMonths")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                viewMode === "lastMonths"
                  ? "gradient-teal text-white shadow-md"
                  : "bg-white border-2 border-gray-200 text-gray-600 hover:border-teal-500"
              }`}
            >
              Last K Months
            </button>
            <button
              onClick={() => setViewMode("singleMonth")}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                viewMode === "singleMonth"
                  ? "gradient-teal text-white shadow-md"
                  : "bg-white border-2 border-gray-200 text-gray-600 hover:border-teal-500"
              }`}
            >
              Single Month
            </button>
          </div>
        </div>

        {/* Last K Months Selector */}
        {viewMode === "lastMonths" && (
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Number of Months: {monthsCount}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 6, 12].map((count) => (
                <button
                  key={count}
                  onClick={() => setMonthsCount(count)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-all ${
                    monthsCount === count
                      ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md"
                      : "bg-white border-2 border-gray-200 text-gray-600 hover:border-purple-500"
                  }`}
                >
                  {count}M
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Single Month Selector */}
        {viewMode === "singleMonth" && (
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Select Month</p>
            <div className="flex items-center justify-between bg-white rounded-lg p-2 border-2 border-gray-200">
              <button
                onClick={() => setMonthOffset(monthOffset - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md hover:shadow-lg transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-gray-600" />
                <span className="text-xs font-bold text-gray-800">{monthName}</span>
              </div>
              <button
                onClick={() => setMonthOffset(monthOffset + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md hover:shadow-lg transition-all"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Summary Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-3 shadow-lg"
      >
        <div className="text-center">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            Total {analysisType === "expense" ? "Expense" : "Income"}
            {viewMode === "lastMonths" && ` (Last ${monthsCount} ${monthsCount === 1 ? 'Month' : 'Months'})`}
            {viewMode === "singleMonth" && ` (${monthName})`}
          </p>
          <p className={`text-2xl font-bold mt-1 ${
            analysisType === "expense" ? "text-red-600" : "text-green-600"
          }`}>
            ৳{total.toLocaleString()}
          </p>
        </div>
      </motion.div>

      {data.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-8 text-center"
        >
          <p className="text-gray-500 font-medium text-sm">No {analysisType} data available for this period</p>
        </motion.div>
      ) : (
        <>
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass-card rounded-xl p-3 shadow-lg"
          >
            <h3 className="mb-3 text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="text-base">📊</span>
              {analysisType === "expense" ? "Expense" : "Income"} Breakdown
            </h3>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie 
                    data={data} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={65}
                    label={false}
                    labelLine={false}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px', fontWeight: '600' }}
                    iconSize={8}
                    formatter={(value, entry: any) => (
                      <span style={{ color: '#374151' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.1 }} 
            className="glass-card rounded-xl p-3 shadow-lg"
          >
            <h3 className="mb-3 text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="text-base">📈</span>
              Category Totals
            </h3>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 40 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 9, fontWeight: 600, fill: '#4B5563' }}
                    stroke="#6B7280"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fontWeight: 600, fill: '#4B5563' }}
                    stroke="#6B7280"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    radius={[6, 6, 0, 0]}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
