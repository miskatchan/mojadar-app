// Client-side state + localStorage for HisabGuru
export type TxType = "expense" | "income" | "transfer";
export type Source = "manual" | "sms" | "mail";
export type Account = "Cash" | "bKash" | "Nagad" | "Bank" | "Rocket";

export const CATEGORIES = {
  expense: ["Food & Dining", "Transport", "Education", "Entertainment", "Shopping", "Health", "Bills & Utilities", "Groceries", "Personal Care", "Other"],
  income: ["Allowance", "Pocket Money", "Salary", "Freelance", "Gift", "Other"],
  transfer: ["Savings", "Investment", "Loan", "Other"],
};

export type CustomCategories = {
  expense: string[];
  income: string[];
  transfer: string[];
};

// Get all categories (default + custom)
export function getAllCategories(): typeof CATEGORIES & { custom: CustomCategories } {
  if (typeof window === "undefined") return { ...CATEGORIES, custom: { expense: [], income: [], transfer: [] } };
  
  const customCats = localStorage.getItem("hisabguru_custom_categories");
  if (!customCats) return { ...CATEGORIES, custom: { expense: [], income: [], transfer: [] } };
  
  const custom: CustomCategories = JSON.parse(customCats);
  return {
    expense: [...CATEGORIES.expense, ...custom.expense],
    income: [...CATEGORIES.income, ...custom.income],
    transfer: [...CATEGORIES.transfer, ...custom.transfer],
    custom
  };
}

// Add a custom category
export function addCustomCategory(type: TxType, categoryName: string) {
  if (typeof window === "undefined") return;
  
  const trimmedName = categoryName.trim();
  if (!trimmedName) return;
  
  const allCats = getAllCategories();
  
  // Check if category already exists (case-insensitive)
  const existsInDefault = CATEGORIES[type].some(cat => cat.toLowerCase() === trimmedName.toLowerCase());
  const existsInCustom = allCats.custom[type].some(cat => cat.toLowerCase() === trimmedName.toLowerCase());
  
  if (existsInDefault || existsInCustom) {
    return false; // Already exists
  }
  
  // Add to custom categories
  const custom = allCats.custom;
  custom[type].push(trimmedName);
  
  localStorage.setItem("hisabguru_custom_categories", JSON.stringify(custom));
  return true;
}

// Delete a custom category
export function deleteCustomCategory(type: TxType, categoryName: string) {
  if (typeof window === "undefined") return;
  
  const allCats = getAllCategories();
  const custom = allCats.custom;
  
  custom[type] = custom[type].filter(cat => cat !== categoryName);
  
  localStorage.setItem("hisabguru_custom_categories", JSON.stringify(custom));
}

export type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  currency: "BDT";
  category: string;
  note?: string;
  source: Source;
  date: string;
  account: Account;
  location?: { lat: number; lng: number } | null;
};

export type Notification = {
  id: string;
  message: string;
  timestamp: string;
  tags: string[];
  type?: "phishing" | "promo" | "normal" | "alert";
  confidence?: number;
  details?: string;
};

export type Memory = {
  id: string;
  text: string;
  timestamp: string;
};

export type State = {
  transactions: Transaction[];
  notifications: Notification[];
  memories: Memory[];
};

function getState(): State {
  if (typeof window === "undefined") return { transactions: [], notifications: [], memories: [] };
  const raw = localStorage.getItem("hisabguru_state");
  if (!raw) return { transactions: [], notifications: [], memories: [] };
  return JSON.parse(raw);
}

function setState(s: State) {
  if (typeof window === "undefined") return;
  localStorage.setItem("hisabguru_state", JSON.stringify(s));
}

export function loadState(): State {
  const s = getState();
  
  // Force data refresh if version mismatch
  if (typeof window !== 'undefined') {
    const dataVersion = localStorage.getItem('hisabguru_data_version');
    if (dataVersion !== 'v1.1') {
      localStorage.removeItem('hisabguru_state');
      localStorage.setItem('hisabguru_data_version', 'v1.1');
      seedSampleData();
      return getState();
    }
  }
  
  if (s.transactions.length === 0) {
    seedSampleData();
    return getState();
  }
  if (s.notifications.length === 0) {
    seedSecurityNotifications();
    return getState();
  }
  return s;
}

export function addTransaction(tx: Omit<Transaction, "id">) {
  const s = getState();
  s.transactions.push({ ...tx, id: Math.random().toString(36).substr(2, 9) });
  s.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  setState(s);
}

export function deleteTransaction(id: string) {
  const s = getState();
  s.transactions = s.transactions.filter(t => t.id !== id);
  setState(s);
}

export function updateTransaction(id: string, updates: Partial<Omit<Transaction, "id">>) {
  const s = getState();
  const index = s.transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    s.transactions[index] = { ...s.transactions[index], ...updates };
    s.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  setState(s);
}

export function addNotification(notif: Omit<Notification, "id" | "timestamp">) {
  const s = getState();
  s.notifications.push({ ...notif, id: Math.random().toString(36), timestamp: new Date().toISOString() });
  setState(s);
}

export function addMemory(text: string) {
  const s = getState();
  s.memories.push({ id: Math.random().toString(36), text, timestamp: new Date().toISOString() });
  setState(s);
}

export function updateMemory(id: string, text: string) {
  const s = getState();
  const index = s.memories.findIndex(m => m.id === id);
  if (index !== -1) {
    s.memories[index] = { ...s.memories[index], text, timestamp: new Date().toISOString() };
  }
  setState(s);
}

export function deleteMemory(id: string) {
  const s = getState();
  s.memories = s.memories.filter(m => m.id !== id);
  setState(s);
}

export function getTransactionsByDateRange(startDate: Date, endDate: Date) {
  const txs = loadState().transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= startDate && d <= endDate;
  });
  
  // Group by date
  const grouped = new Map<string, Transaction[]>();
  txs.forEach((tx) => {
    const dateKey = new Date(tx.date).toISOString().split('T')[0];
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(tx);
  });
  
  return Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

export function getMonthRange(monthOffset: number): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + monthOffset;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
}

export function getSummary(monthOffset: number) {
  const { start, end } = getMonthRange(monthOffset);
  const txs = loadState().transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
  const income = txs.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, balance: income - expense };
}

function seedSampleData() {
  const s: State = { transactions: [], notifications: [], memories: [] };
  const now = new Date();

  // Seed current month up to today (Nov 6, 2025)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  // Add current month allowance on 1st
  s.transactions.push({
    id: Math.random().toString(36),
    type: "income",
    amount: 5000,
    currency: "BDT",
    category: "Allowance",
    note: "Monthly allowance",
    source: "manual",
    date: new Date(currentYear, currentMonth, 1).toISOString(),
    account: "Cash",
    location: null,
  });

  // Weekly pocket money for current month (up to current week)
  const weeksElapsed = Math.floor(currentDay / 7);
  for (let w = 0; w <= weeksElapsed && w < 4; w++) {
    const day = 1 + w * 7;
    if (day <= currentDay) {
      s.transactions.push({
        id: Math.random().toString(36),
        type: "income",
        amount: 500,
        currency: "BDT",
        category: "Pocket Money",
        note: `Week ${w + 1}`,
        source: "manual",
        date: new Date(currentYear, currentMonth, day).toISOString(),
        account: "Cash",
        location: null,
      });
    }
  }

  // Current month expenses (up to today)
  const currentMonthExpenses = [
    { day: 2, amount: 150, category: "Food & Dining", note: "Breakfast at canteen", account: "Cash", source: "manual" },
    { day: 2, amount: 200, category: "Transport", note: "Uber ride", account: "bKash", source: "sms" },
    { day: 3, amount: 300, category: "Food & Dining", note: "Lunch payment", account: "bKash", source: "sms" },
    { day: 3, amount: 450, category: "Shopping", note: "Daraz order", account: "Nagad", source: "mail" },
    { day: 4, amount: 50, category: "Transport", note: "Bus fare", account: "Cash", source: "manual" },
    { day: 4, amount: 150, category: "Bills & Utilities", note: "Mobile recharge", account: "bKash", source: "sms" },
    { day: 5, amount: 120, category: "Food & Dining", note: "Coffee & snacks", account: "Cash", source: "manual" },
    { day: 5, amount: 380, category: "Education", note: "Course books", account: "Bank", source: "mail" },
    { day: 6, amount: 85, category: "Transport", note: "Rickshaw", account: "Cash", source: "manual" },
    { day: 6, amount: 250, category: "Food & Dining", note: "Food Panda order", account: "Rocket", source: "sms" },
  ];

  currentMonthExpenses.forEach((e) => {
    if (e.day <= currentDay) {
      s.transactions.push({
        id: Math.random().toString(36),
        type: "expense",
        amount: e.amount,
        currency: "BDT",
        category: e.category,
        note: e.note,
        source: e.source as Source,
        date: new Date(currentYear, currentMonth, e.day).toISOString(),
        account: e.account as Account,
        location: null,
      });
    }
  });

  // Seed previous 2 months with complete data
  for (let m = -2; m <= -1; m++) {
    const { start } = getMonthRange(m);
    const monthStart = new Date(start);

    // Monthly allowance: ৳5,000 on 1st
    s.transactions.push({
      id: Math.random().toString(36),
      type: "income",
      amount: 5000,
      currency: "BDT",
      category: "Allowance",
      note: "Monthly allowance",
      source: "manual",
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1).toISOString(),
      account: "Cash",
      location: null,
    });

    // Weekly pocket money: ৳500 x 4 weeks
    for (let w = 0; w < 4; w++) {
      s.transactions.push({
        id: Math.random().toString(36),
        type: "income",
        amount: 500,
        currency: "BDT",
        category: "Pocket Money",
        note: `Week ${w + 1}`,
        source: "manual",
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 + w * 7).toISOString(),
        account: "Cash",
        location: null,
      });
    }

    // Expenses throughout month
    const expenses = [
      { day: 2, amount: 150, category: "Food & Dining", note: "Breakfast at canteen", account: "Cash", source: "manual" },
      { day: 3, amount: 300, category: "Food & Dining", note: "Lunch with friends", account: "bKash", source: "sms" },
      { day: 5, amount: 50, category: "Transport", note: "Bus fare", account: "Cash", source: "manual" },
      { day: 7, amount: 400, category: "Education", note: "Course books", account: "Bank", source: "mail" },
      { day: 9, amount: 120, category: "Food & Dining", note: "Coffee & snacks", account: "Cash", source: "manual" },
      { day: 10, amount: 250, category: "Food & Dining", note: "Dinner", account: "Nagad", source: "sms" },
      { day: 12, amount: 100, category: "Transport", note: "Rickshaw", account: "Cash", source: "manual" },
      { day: 14, amount: 180, category: "Groceries", note: "Weekly groceries", account: "bKash", source: "sms" },
      { day: 15, amount: 600, category: "Entertainment", note: "Movie tickets", account: "bKash", source: "sms" },
      { day: 17, amount: 85, category: "Personal Care", note: "Haircut", account: "Cash", source: "manual" },
      { day: 18, amount: 350, category: "Food & Dining", note: "Restaurant", account: "Nagad", source: "sms" },
      { day: 20, amount: 80, category: "Transport", note: "Bus pass", account: "Cash", source: "manual" },
      { day: 21, amount: 200, category: "Health", note: "Medicine", account: "Bank", source: "mail" },
      { day: 22, amount: 500, category: "Shopping", note: "Clothes", account: "bKash", source: "sms" },
      { day: 24, amount: 150, category: "Bills & Utilities", note: "Mobile recharge", account: "bKash", source: "sms" },
      { day: 25, amount: 200, category: "Food & Dining", note: "Snacks", account: "Cash", source: "manual" },
      { day: 27, amount: 320, category: "Food & Dining", note: "Birthday treat", account: "Nagad", source: "sms" },
    ];

    expenses.forEach((e) => {
      s.transactions.push({
        id: Math.random().toString(36),
        type: "expense",
        amount: e.amount,
        currency: "BDT",
        category: e.category,
        note: e.note,
        source: e.source as Source,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), e.day).toISOString(),
        account: e.account as Account,
        location: null,
      });
    });

    // Savings transfer
    s.transactions.push({
      id: Math.random().toString(36),
      type: "transfer",
      amount: 1000,
      currency: "BDT",
      category: "Savings",
      note: "Monthly savings",
      source: "manual",
      date: new Date(monthStart.getFullYear(), monthStart.getMonth(), 28).toISOString(),
      account: "Bank",
      location: null,
    });
  }

  setState(s);
}

function seedSecurityNotifications() {
  const s = getState();
  const now = new Date();
  
  const sampleNotifications = [
    {
      message: "Suspected phishing attempt blocked",
      type: "phishing" as const,
      confidence: 92,
      details: "Message claimed you won ৳10,000 lottery. Contains suspicious link requesting personal banking information.",
      tags: ["sms", "blocked"],
      hoursAgo: 2
    },
    {
      message: "High-risk SMS detected",
      type: "phishing" as const,
      confidence: 87,
      details: "Fake bKash verification message asking to click link and provide PIN. Official bKash never requests PIN via SMS.",
      tags: ["sms", "high-risk"],
      hoursAgo: 5
    },
    {
      message: "Promotional content identified",
      type: "promo" as const,
      confidence: 95,
      details: "GP internet package offer detected. Legitimate promotional message from verified sender.",
      tags: ["sms", "promo"],
      hoursAgo: 8
    },
    {
      message: "Investment scam warning",
      type: "phishing" as const,
      confidence: 94,
      details: "Message promises ৳30,000 return on ৳10,000 investment. Classic 'get rich quick' scam pattern detected.",
      tags: ["sms", "scam"],
      hoursAgo: 12
    },
    {
      message: "Safe message verified",
      type: "normal" as const,
      confidence: 98,
      details: "Personal message from known contact. No suspicious patterns or links detected.",
      tags: ["sms", "safe"],
      hoursAgo: 24
    },
    {
      message: "Suspicious job offer detected",
      type: "phishing" as const,
      confidence: 89,
      details: "Work-from-home offer claiming ৳12,000/month income. Contains Telegram bot link - common phishing tactic.",
      tags: ["mail", "job-scam"],
      hoursAgo: 30
    },
    {
      message: "Bank verification scam blocked",
      type: "phishing" as const,
      confidence: 96,
      details: "Fake Sonali Bank message requesting account verification. Official banks never request verification via SMS links.",
      tags: ["sms", "blocked"],
      hoursAgo: 48
    },
  ];

  sampleNotifications.forEach(notif => {
    const timestamp = new Date(now.getTime() - notif.hoursAgo * 60 * 60 * 1000);
    s.notifications.push({
      id: Math.random().toString(36),
      message: notif.message,
      timestamp: timestamp.toISOString(),
      tags: notif.tags,
      type: notif.type,
      confidence: notif.confidence,
      details: notif.details
    });
  });

  setState(s);
}
