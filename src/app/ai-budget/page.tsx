"use client";
import { useState, useEffect } from "react";
import { loadState, getMonthRange, addMemory, CATEGORIES, getAllCategories } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Calendar, Zap, Brain, Target, ArrowLeftRight, Check, Plus, MessageSquare } from "lucide-react";
import { useAudioFeedback } from "@/lib/useAudioFeedback";

type BudgetMode = "optimize" | "create";

type CategoryBudget = {
  category: string;
  suggested: number;
  reasoning: string;
};

type AIBudgetPlan = {
  totalBudget: number;
  categories: CategoryBudget[];
  savingsGoal: number;
  tips: string[];
  considerations: string[];
};

type CurrentBudget = {
  category: string;
  limit: number;
  spent: number;
};

export default function AIBudget() {
  const [mode, setMode] = useState<BudgetMode>("optimize");
  const [loading, setLoading] = useState(false);
  const [budgetPlan, setBudgetPlan] = useState<AIBudgetPlan | null>(null);
  const [currentMonthData, setCurrentMonthData] = useState<any>(null);
  const [currentBudgets, setCurrentBudgets] = useState<CurrentBudget[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  
  const playSound = useAudioFeedback();
  
  // Helper function to clean JSON strings from control characters
  const cleanJsonString = (str: string): string => {
    console.log("cleanJsonString called with:", str);
    console.log("str type:", typeof str);
    console.log("str length:", str ? str.length : 'N/A');
    if (!str) {
      console.log("cleanJsonString returning early because str is falsy");
      return str;
    }
    
    // Remove common control characters that can break JSON parsing
    const result = str
      .replace(/[\0-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t') // Escape tabs
      .trim();
    console.log("cleanJsonString result:", result);
    console.log("result length:", result.length);
    return result;
  };

  useEffect(() => {
    // Load current month data
    const state = loadState();
    const { start, end } = getMonthRange(0);
    const currentTxs = state.transactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= start && txDate <= end;
    });

    const income = currentTxs.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expense = currentTxs.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    
    const categorySpending: Record<string, number> = {};
    currentTxs.filter(t => t.type === "expense").forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

    setCurrentMonthData({
      income,
      expense,
      balance: income - expense,
      categorySpending,
      memories: state.memories
    });
    
    // Load current budgets
    loadCurrentBudgets();
  }, []);

  const loadCurrentBudgets = () => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('hisabguru_monthly_budgets');
    if (!saved) {
      setCurrentBudgets([]);
      return;
    }
    
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyBudgets = JSON.parse(saved);
    const budgets = monthlyBudgets[monthKey] || [];
    
    // Calculate spent for each budget
    const state = loadState();
    const { start, end } = getMonthRange(0);
    const budgetsWithSpent = budgets.map((budget: any) => {
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
    
    setCurrentBudgets(budgetsWithSpent);
  };

  const applyBudgetToMonth = (monthOffset: number) => {
    if (!budgetPlan) return;
    
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem('hisabguru_monthly_budgets');
    let monthlyBudgets: any = saved ? JSON.parse(saved) : {};
    
    // Create budget entries from AI suggestions
    const newBudgets = budgetPlan.categories.map((cat, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      category: cat.category,
      limit: cat.suggested,
      spent: 0
    }));
    
    // Replace existing budgets for the target month
    monthlyBudgets[monthKey] = newBudgets;
    
    localStorage.setItem('hisabguru_monthly_budgets', JSON.stringify(monthlyBudgets));
    
    // If current month, reload budgets
    if (monthOffset === 0) {
      loadCurrentBudgets();
    }
    
    playSound('success');
    addMemory(`Applied AI budget to ${monthName}: ৳${budgetPlan.totalBudget} total budget`);
    alert(`✅ Budget successfully applied to ${monthName}!\n\nTotal Budget: ৳${budgetPlan.totalBudget}\n${budgetPlan.categories.length} categories created`);
  };

  const getTargetMonthName = () => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const generateBudget = async (customInstructions?: string) => {
    if (!currentMonthData) return;

    setLoading(true);
    setBudgetPlan(null); // Clear previous results
    setShowComparison(false);
    try {
      const state = loadState();
      
      // Get historical data (last 3 months)
      const now = new Date();
      const historicalData = [];
      for (let i = 0; i < 3; i++) {
        const { start, end } = getMonthRange(-i);
        const monthTxs = state.transactions.filter(tx => {
          const txDate = new Date(tx.date);
          return txDate >= start && txDate <= end;
        });
        const monthIncome = monthTxs.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
        const monthExpense = monthTxs.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
        const categorized: Record<string, number> = {};
        monthTxs.filter(t => t.type === "expense").forEach(t => {
          categorized[t.category] = (categorized[t.category] || 0) + t.amount;
        });
        historicalData.push({ income: monthIncome, expense: monthExpense, categories: categorized });
      }

      const targetMonth = mode === "optimize" ? "current month (November 2025)" : "next month (December 2025)";
      
      let taskDescription = mode === "optimize" ? "Optimize the budget for the current month" : "Create a smart budget plan for next month";
      if (customInstructions) {
        taskDescription += `. USER INSTRUCTIONS: ${customInstructions}`;
      }
      
      const prompt = `You are a personal finance AI assistant for a student in Bangladesh. Analyze this data and provide a smart budget plan.

**Current Month (November 2025):**
- Income: ৳${currentMonthData.income}
- Expense: ৳${currentMonthData.expense}
- Balance: ৳${currentMonthData.balance}
- Category Spending: ${JSON.stringify(currentMonthData.categorySpending)}

**Historical Data (Last 3 months):**
${historicalData.map((m, i) => `Month ${i + 1}: Income ৳${m.income}, Expense ৳${m.expense}, Categories: ${JSON.stringify(m.categories)}`).join('\n')}

**User Memories/Events:**
${state.memories.length > 0 ? state.memories.map(m => `- ${m.text}`).join('\n') : 'None'}

**Available Expense Categories:**
${CATEGORIES.expense.join(', ')}

**Task:** ${taskDescription}

Considerations:
1. Average monthly income is ৳7,000 (৳5,000 allowance + ৳2,000 pocket money)
2. Consider user memories (birthdays, events) when allocating budget - increase relevant category budgets
3. ${customInstructions || "Recommend 10-20% savings"}
4. Allocate for all relevant categories based on spending patterns
5. Provide 3 actionable tips

Respond ONLY with valid JSON in this exact format:
{
  "totalBudget": 7000,
  "categories": [
    {"category": "Food & Dining", "suggested": 2000, "reasoning": "Based on current spending trend"},
    {"category": "Transport", "suggested": 500, "reasoning": "Typical monthly commute costs"}
  ],
  "savingsGoal": 1000,
  "tips": ["Tip 1", "Tip 2", "Tip 3"],
  "considerations": ["Special events this month", "Other factors"]
}`;
      
      console.log("Sending budget prompt to API:", prompt);

      console.log("Making fetch request to /api/chat with prompt");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      console.log("Fetch request completed, response:", res);

      console.log("Response status:", res.status, "OK:", res.ok);

      // Check if response is OK
      console.log("Response ok:", res.ok);
      console.log("Response status:", res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response text:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP error ${res.status}` };
        }
        console.error("Error data:", errorData);
        throw new Error(errorData.error || `API error: ${res.status}`);
      }

      // Read response as text first to avoid JSON parse errors
      const responseText = await res.text();
      console.log("Raw response (first 300 chars):", responseText.substring(0, 300));
      console.log("Full raw response:", responseText);
      console.log("Response headers:", [...res.headers.entries()]);
      console.log("Response status:", res.status);
      console.log("Response status text:", res.statusText);
      
      // Parse the text as JSON
      let json;
      try {
        console.log("Attempting to parse responseText as JSON:", responseText);
        json = JSON.parse(responseText);
        console.log("Successfully parsed JSON:", json);
      } catch (parseError) {
        console.error("Failed to parse API response:", parseError);
        console.error("Response was:", responseText);
        throw new Error("Server returned invalid JSON");
      }
      
      console.log("Parsed API response:", json);
      console.log("API response text field:", json.text);
      
      // Check if response has error
      if (json.error) {
        console.error("API returned error:", json.error);
        console.error("Full error response:", json);
        throw new Error(json.error);
      }
      
      // For OpenAI responses, the budget data is directly in the text field as JSON
      // For simulated responses, it might be wrapped in text
      console.log("json.text:", json.text);
      let aiResponseText = json.text || "";
      console.log("aiResponseText:", aiResponseText);
      console.log("aiResponseText type:", typeof aiResponseText);
      console.log("aiResponseText length:", aiResponseText.length);
      
      // Check if response is empty
      if (!aiResponseText || aiResponseText.trim() === "") {
        console.error("Empty AI response");
        console.error("Full json object:", json);
        throw new Error("Empty response from AI");
      }
      
      console.log("AI response (first 300 chars):", aiResponseText.substring(0, 300));
      
      // Try to parse the response directly first (in case it's already JSON)
      let budgetData;
      try {
        console.log("Attempting direct JSON parse of aiResponseText:", aiResponseText);
        // First, try to parse it directly as JSON (for real OpenAI responses)
        // Clean the JSON string to remove control characters
        const cleanedResponse = cleanJsonString(aiResponseText);
        console.log("Cleaned response:", cleanedResponse);
        console.log("Cleaned response type:", typeof cleanedResponse);
        console.log("Cleaned response length:", cleanedResponse.length);
        budgetData = JSON.parse(cleanedResponse);
        console.log("Direct parse successful, budgetData:", budgetData);
      } catch (directParseError) {
        console.log("Direct JSON parse failed with error:", directParseError);
        console.log("aiResponseText that failed to parse:", aiResponseText);
        // If that fails, try the extraction methods (for simulated responses)
        console.log("Direct JSON parse failed, trying extraction methods");
        
        // Extract JSON from the response - try multiple methods
        let jsonText = aiResponseText;
        
        // Method 1: Extract from code blocks
        const codeBlockMatch = aiResponseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          console.log("Extracted JSON from code block");
          jsonText = codeBlockMatch[1].trim();
        } else {
          // Method 2: Find JSON object in the text (starts with { and ends with })
          const jsonObjectMatch = aiResponseText.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            console.log("Extracted JSON object from response");
            jsonText = jsonObjectMatch[0];
          }
        }

        console.log("Final JSON to parse:", jsonText.substring(0, 300));
        console.log("Final JSON to parse length:", jsonText.length);

        // Clean and parse the extracted JSON
        const cleanedJsonText = cleanJsonString(jsonText);
        console.log("Cleaned JSON text:", cleanedJsonText);
        console.log("Cleaned JSON text length:", cleanedJsonText.length);
        budgetData = JSON.parse(cleanedJsonText);
        console.log("Extraction parse successful, budgetData:", budgetData);
      }
      
      console.log("Successfully parsed budget data:", budgetData);
      console.log("Budget data type:", typeof budgetData);
      console.log("Budget data keys:", Object.keys(budgetData));
      
      // Validate response structure
      console.log("Validating budgetData:", budgetData);
      console.log("budgetData type:", typeof budgetData);
      console.log("budgetData is object:", typeof budgetData === 'object');
      console.log("budgetData is null:", budgetData === null);
      console.log("budgetData keys:", budgetData ? Object.keys(budgetData) : 'N/A');
      
      // Simple and robust check for empty or invalid budget data
      const isInvalidBudgetData = !budgetData || 
                                  typeof budgetData !== 'object' || 
                                  Array.isArray(budgetData) || 
                                  Object.keys(budgetData).length === 0;
      
      console.log("isInvalidBudgetData:", isInvalidBudgetData);
      
      // If we have invalid budget data, create a default budget and skip further validation
      if (isInvalidBudgetData) {
        console.error("Budget data is invalid or empty. Creating default budget. Got:", budgetData);
        budgetData = {
          totalBudget: 7000,
          categories: [
            { category: "Food & Dining", suggested: 2000, reasoning: "Based on typical spending patterns" },
            { category: "Transport", suggested: 800, reasoning: "Daily commute costs" },
            { category: "Education", suggested: 1500, reasoning: "Books and course materials" },
            { category: "Entertainment", suggested: 700, reasoning: "Movies and social activities" },
            { category: "Shopping", suggested: 1000, reasoning: "Clothing and personal items" },
            { category: "Bills & Utilities", suggested: 500, reasoning: "Mobile and internet expenses" }
          ],
          savingsGoal: 1500,
          tips: [
            "Track all expenses daily",
            "Use digital payments to automatically log transactions",
            "Set aside savings at the beginning of the month"
          ],
          considerations: [
            "Consider upcoming events or special occasions",
            "Adjust budget based on actual spending patterns"
          ]
        };
        console.log("Created default budget:", budgetData);
      } else {
        // Only validate individual fields if we have valid data
        console.log("Validating individual fields because we have valid data");
        console.log("budgetData before individual field validation:", budgetData);
        console.log("budgetData.totalBudget:", budgetData.totalBudget);
        console.log("budgetData.totalBudget === undefined:", budgetData.totalBudget === undefined);
        console.log("budgetData.categories:", budgetData.categories);
        console.log("!budgetData.categories:", !budgetData.categories);
        console.log("Array.isArray(budgetData.categories):", Array.isArray(budgetData.categories));
        
        // Individual field validation
        if (budgetData.totalBudget === undefined) {
          console.error("Budget data missing totalBudget field. Got:", budgetData);
          budgetData.totalBudget = 7000; // Set a reasonable default
        }
        
        if (!budgetData.categories || !Array.isArray(budgetData.categories)) {
          console.error("Budget data missing categories array. Got:", budgetData);
          // Create default categories
          budgetData.categories = [
            { category: "Food & Dining", suggested: 2000, reasoning: "Based on typical spending patterns" },
            { category: "Transport", suggested: 800, reasoning: "Daily commute costs" },
            { category: "Education", suggested: 1500, reasoning: "Books and course materials" },
            { category: "Entertainment", suggested: 700, reasoning: "Movies and social activities" },
            { category: "Shopping", suggested: 1000, reasoning: "Clothing and personal items" },
            { category: "Bills & Utilities", suggested: 500, reasoning: "Mobile and internet expenses" }
          ];
        }
        
        // Ensure we have all required fields
        if (!budgetData.savingsGoal) {
          budgetData.savingsGoal = 1500;
        }
        
        if (!budgetData.tips || !Array.isArray(budgetData.tips)) {
          budgetData.tips = [
            "Track all expenses daily",
            "Use digital payments to automatically log transactions",
            "Set aside savings at the beginning of the month"
          ];
        }
        
        if (!budgetData.considerations || !Array.isArray(budgetData.considerations)) {
          budgetData.considerations = [
            "Consider upcoming events or special occasions",
            "Adjust budget based on actual spending patterns"
          ];
        }
      }
      
      console.log("Final budgetData after validation:", budgetData);
      
      console.log("Budget plan validated successfully");
      console.log("Final budgetData being set:", budgetData);
      
      // Final check to ensure we have valid data
      const isFinalDataValid = budgetData && 
                              typeof budgetData === 'object' && 
                              !Array.isArray(budgetData) && 
                              Object.keys(budgetData).length > 0 &&
                              budgetData.totalBudget !== undefined &&
                              Array.isArray(budgetData.categories);
      
      if (!isFinalDataValid) {
        console.error("Budget data is still invalid after all validation attempts");
        console.error("budgetData:", budgetData);
        console.error("typeof budgetData:", typeof budgetData);
        console.error("Array.isArray(budgetData):", Array.isArray(budgetData));
        console.error("Object.keys(budgetData).length:", budgetData ? Object.keys(budgetData).length : 'N/A');
        console.error("budgetData.totalBudget:", budgetData ? budgetData.totalBudget : 'N/A');
        console.error("Array.isArray(budgetData.categories):", budgetData && budgetData.categories ? Array.isArray(budgetData.categories) : 'N/A');
        throw new Error("Failed to generate valid budget data");
      }
      
      setBudgetPlan(budgetData);
      
      // Add a memory to indicate we used a default budget
      if (budgetData.categories.length > 0 && budgetData.categories[0].reasoning && budgetData.categories[0].reasoning.includes("Based on typical")) {
        console.log("Using default budget plan");
        addMemory(`Default AI Budget created: ৳${budgetData.totalBudget} total, ৳${budgetData.savingsGoal} savings`);
      }
      
      // Auto-show comparison for optimize mode
      if (mode === "optimize") {
        setShowComparison(true);
      }
      
      // Add to memories
      addMemory(`AI Budget created for ${targetMonth}: ৳${budgetData.totalBudget} total, ৳${budgetData.savingsGoal} savings`);
      console.log("Budget generation completed successfully!");
    } catch (error) {
      console.error("Budget generation failed:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Full error object:", error);
      alert(`Failed to generate budget: ${errorMessage}

Debugging info:
- Check browser console for detailed logs
- The app will use simulated responses if no API key is configured
- If this persists, try refreshing the page and generating again

If you continue to have issues, please contact support with the console logs.`);
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatMessages((m) => [...m, { role: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      // Process the chat message as budget optimization instructions
      const state = loadState();
      const memories = state.memories.map((m) => m.text).join("; ");
      
      setChatMessages((m) => [...m, { 
        role: "assistant", 
        text: "I understand your instructions. I'll consider this when optimizing your budget. Click the optimize button to generate a budget plan with these considerations." 
      }]);
      
      // Generate budget with custom instructions
      await generateBudget(userMsg);
      
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((m) => [...m, { 
        role: "system", 
        text: "❌ Sorry, I encountered an error processing your request." 
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-3 py-3">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">AI Budget Planner</h2>
        <p className="text-xs text-gray-500 mt-0.5">Intelligent budget optimization with OpenAI</p>
      </motion.div>

      {/* Mode Selection */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-3 shadow-lg"
      >
        <p className="text-xs font-bold text-gray-700 mb-2">Select Mode</p>
        <div className="flex gap-2">
          <button
            onClick={() => { setMode("optimize"); setBudgetPlan(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition-all ${
              mode === "optimize"
                ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md"
                : "bg-white border-2 border-gray-200 text-gray-600 hover:border-purple-500"
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            Optimize Current Month
          </button>
          <button
            onClick={() => { setMode("create"); setBudgetPlan(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition-all ${
              mode === "create"
                ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                : "bg-white border-2 border-gray-200 text-gray-600 hover:border-teal-500"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Create Next Month
          </button>
        </div>
      </motion.div>

      {/* Current Month Overview */}
      {currentMonthData && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-xl p-3 shadow-lg"
        >
          <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-teal-600" />
            Current Month Snapshot
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-green-50 rounded-lg p-2 border border-green-200">
              <p className="text-[10px] font-semibold text-gray-600">Income</p>
              <p className="text-sm font-bold text-green-700">৳{currentMonthData.income.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2 border border-red-200">
              <p className="text-[10px] font-semibold text-gray-600">Expense</p>
              <p className="text-sm font-bold text-red-700">৳{currentMonthData.expense.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
              <p className="text-[10px] font-semibold text-gray-600">Balance</p>
              <p className="text-sm font-bold text-blue-700">৳{currentMonthData.balance.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Generate Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-3 shadow-lg"
      >
        {/* AI Chat Interface */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 border-2 border-purple-200">
                  <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                  Chat with AI Budget Assistant (OpenAI)
                </h3>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {chatMessages.length === 0 && (
                    <p className="text-[10px] text-gray-500 text-center py-2">
                      Give me instructions like: "Optimize keeping in mind mother's birthday" or "Do your best so I can save"
                    </p>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`rounded-lg p-2 text-[10px] max-w-[85%] ${
                        msg.role === "user" 
                          ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white" 
                          : msg.role === "system"
                          ? "bg-yellow-100 text-yellow-900 border border-yellow-200"
                          : "bg-white text-gray-700 border border-gray-200"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" style={{ animationDelay: '150ms' }} />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" style={{ animationDelay: '300ms' }} />
                      <span className="ml-1">AI is processing...</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !chatLoading && sendChatMessage()}
                    className="flex-1 rounded-lg border border-purple-300 bg-white p-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-200"
                    placeholder="e.g., 'Optimize for maximum savings' or 'Consider birthday expenses'"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={chatLoading || !chatInput.trim()}
                    className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 mb-2">
          <motion.button
            onClick={() => setShowChat(!showChat)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border-2 border-purple-300 bg-white px-3 py-2 text-xs font-bold text-purple-600 hover:bg-purple-50 transition-all"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {showChat ? "Hide" : "Show"} AI Chat
          </motion.button>
        </div>
        
        <motion.button 
          onClick={() => generateBudget()} 
          disabled={loading}
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          className="w-full rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              AI is thinking...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" />
              {mode === "optimize" ? "🎯 Optimize Current Budget" : "🗓️ Create Next Month Budget"}
            </span>
          )}
        </motion.button>
      </motion.div>

      {/* AI Generated Budget Plan */}
      <AnimatePresence>
        {budgetPlan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            {/* Budget Summary */}
            <motion.div className="glass-card rounded-xl p-3 shadow-lg">
              <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-purple-600" />
                AI Budget Plan
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2.5 border-2 border-purple-200">
                  <p className="text-[10px] font-semibold text-gray-600">Total Budget</p>
                  <p className="text-lg font-bold text-purple-700">৳{budgetPlan.totalBudget.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-2.5 border-2 border-teal-200">
                  <p className="text-[10px] font-semibold text-gray-600">Savings Goal</p>
                  <p className="text-lg font-bold text-teal-700">৳{budgetPlan.savingsGoal.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            {/* Category Allocations */}
            <motion.div className="glass-card rounded-xl p-3 shadow-lg">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Category Allocations</h3>
              <div className="space-y-2">
                {budgetPlan.categories.map((cat, idx) => (
                  <motion.div
                    key={cat.category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-lg p-2.5 border border-gray-200 hover:border-teal-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-800">{cat.category}</span>
                      <span className="text-sm font-bold text-teal-700">৳{cat.suggested.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-gray-600 leading-relaxed">{cat.reasoning}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* AI Tips */}
            <motion.div className="glass-card rounded-xl p-3 shadow-lg">
              <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-yellow-600" />
                AI Tips
              </h3>
              <div className="space-y-1.5">
                {budgetPlan.tips.map((tip, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed"
                  >
                    <span className="text-teal-600 font-bold">{idx + 1}.</span>
                    <span>{tip}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Considerations */}
            {budgetPlan.considerations.length > 0 && (
              <motion.div className="glass-card rounded-xl p-3 shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200">
                <h3 className="text-sm font-bold text-gray-800 mb-2">⚠️ Special Considerations</h3>
                <div className="space-y-1">
                  {budgetPlan.considerations.map((consideration, idx) => (
                    <p key={idx} className="text-xs text-gray-700 leading-relaxed">
                      • {consideration}
                    </p>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Budget Comparison (Optimize Mode) */}
            {mode === "optimize" && currentBudgets.length > 0 && showComparison && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-3 shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                    <ArrowLeftRight className="h-4 w-4 text-purple-600" />
                    Budget Comparison
                  </h3>
                  <button
                    onClick={() => setShowComparison(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Hide
                  </button>
                </div>
                
                <div className="space-y-2">
                  {budgetPlan.categories.map((aiCat, idx) => {
                    const current = currentBudgets.find(b => b.category === aiCat.category);
                    const difference = current ? aiCat.suggested - current.limit : aiCat.suggested;
                    const percentChange = current && current.limit > 0 ? ((difference / current.limit) * 100) : 0;
                    
                    return (
                      <motion.div
                        key={aiCat.category}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-lg p-2.5 border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-gray-800">{aiCat.category}</span>
                          {difference !== 0 && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              difference > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {difference > 0 ? '+' : ''}৳{difference.toLocaleString()}
                              {current && ` (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(0)}%)`}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-gray-50 rounded p-1.5">
                            <p className="text-gray-500 font-semibold">Current</p>
                            <p className="text-gray-800 font-bold">৳{current ? current.limit.toLocaleString() : '0'}</p>
                          </div>
                          <div className="bg-purple-50 rounded p-1.5">
                            <p className="text-purple-600 font-semibold">AI Suggests</p>
                            <p className="text-purple-800 font-bold">৳{aiCat.suggested.toLocaleString()}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                
                <div className="mt-3 p-2.5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">Total Budget</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">৳{currentBudgets.reduce((sum, b) => sum + b.limit, 0).toLocaleString()}</span>
                      <span className="text-purple-600">→</span>
                      <span className="text-purple-700 font-bold">৳{budgetPlan.totalBudget.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {mode === "optimize" ? (
                <>
                  {!showComparison && currentBudgets.length > 0 && (
                    <motion.button
                      onClick={() => setShowComparison(true)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Compare with Current Budget
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => { applyBudgetToMonth(0); playSound('tap'); }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Update to This Budget
                  </motion.button>
                </>
              ) : (
                <motion.button
                  onClick={() => { applyBudgetToMonth(1); playSound('tap'); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Budget to {getTargetMonthName()}
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
