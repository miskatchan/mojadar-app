// Budget optimizer using Holt's exponential smoothing
import { getSummary } from "./store";

export function holtForecast(history: number[], alpha = 0.3, beta = 0.1): number {
  if (history.length === 0) return 0;
  if (history.length === 1) return history[0];

  let level = history[0];
  let trend = history[1] - history[0];

  for (let i = 1; i < history.length; i++) {
    const prevLevel = level;
    level = alpha * history[i] + (1 - alpha) * (prevLevel + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  return Math.max(0, level + trend);
}

export function generateOptimizedBudget() {
  const monthMinus2 = getSummary(-2);
  const monthMinus1 = getSummary(-1);
  const currentMonth = getSummary(0);

  const incomeHistory = [monthMinus2.income, monthMinus1.income, currentMonth.income];
  const expenseHistory = [monthMinus2.expense, monthMinus1.expense, currentMonth.expense];

  const forecastIncome = holtForecast(incomeHistory);
  const forecastExpense = holtForecast(expenseHistory);

  // Rule-based allocation
  const essentials = Math.min(forecastIncome * 0.5, forecastExpense * 0.6);
  const savings = Math.max(forecastIncome * 0.3, 1000);
  const discretionary = Math.max(forecastIncome - essentials - savings, 0);

  return {
    forecastIncome: Math.round(forecastIncome),
    forecastExpense: Math.round(forecastExpense),
    essentials: Math.round(essentials),
    savings: Math.round(savings),
    discretionary: Math.round(discretionary),
  };
}
