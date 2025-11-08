"use client";
import { useState, useEffect } from "react";
import Papa from "papaparse";
import { NaiveBayesModel, saveModel, restoreModel } from "@/lib/smishModel";
import type { Label } from "@/lib/smishModel";
import { loadState, addNotification } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp } from "lucide-react";

export default function Security() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ label: Label; confidence: number; probabilities: Record<Label, number> } | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [modelReady, setModelReady] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadState().notifications);
    
    // Clear old model to force retrain with improved features
    if (typeof window !== 'undefined') {
      const modelVersion = localStorage.getItem('smish_model_version');
      if (modelVersion !== 'v2.1') {
        localStorage.removeItem('smish_model');
        localStorage.setItem('smish_model_version', 'v2.1');
      }
    }
    
    const existing = restoreModel();
    if (existing) {
      setModelReady(true);
    } else {
      // Train model from both CSV files
      Promise.all([
        fetch("/data/smishing.csv").then(res => res.text()),
        fetch("/data/bangla_spam.csv").then(res => res.text())
      ])
        .then(([smishingCsv, spamCsv]) => {
          const allData: { text: string; label: Label }[] = [];
          
          // Parse smishing dataset (label,text format)
          const parsed1 = Papa.parse<{text: string; label: string}>(smishingCsv, { header: true });
          parsed1.data
            .filter((row) => row.text && row.label)
            .forEach((row) => {
              allData.push({
                text: row.text,
                label: (row.label.toLowerCase() === "smish" ? "smish" : 
                       row.label.toLowerCase() === "promo" ? "promo" : "normal") as Label,
              });
            });
          
          // Parse bangla spam dataset (spam/ham format)
          const parsed2 = Papa.parse<string[]>(spamCsv, { header: false });
          parsed2.data
            .filter((row) => row.length >= 2 && row[0] && row[1])
            .forEach((row) => {
              const label = row[0].toLowerCase();
              // Map spam->smish, ham->normal
              allData.push({
                text: row[1],
                label: (label === "spam" ? "smish" : "normal") as Label,
              });
            });
          
          console.log(`Training model with ${allData.length} samples (${parsed1.data.length} from smishing dataset + ${parsed2.data.length} from spam dataset)`);
          const model = new NaiveBayesModel();
          model.train(allData);
          saveModel(model);
          setModelReady(true);
        })
        .catch((err) => {
          console.error("Failed to load datasets", err);
          setModelReady(false);
        });
    }
  }, []);

  const analyze = () => {
    if (!text.trim()) return;
    
    const model = restoreModel();
    if (!model) {
      alert("AI model is not ready yet. Please wait a moment.");
      return;
    }

    const analysisResult = model.getConfidencePercentage(text);
    setResult(analysisResult);

    // Add to notifications
    const notifType = analysisResult.label === "smish" ? "phishing" : analysisResult.label === "promo" ? "promo" : "normal";
    let message = "";
    if (analysisResult.label === "smish") {
      message = `Suspected phishing attempt - ${analysisResult.confidence}% confident`;
    } else if (analysisResult.label === "promo") {
      message = `Promotional content identified - ${analysisResult.confidence}% confident`;
    } else {
      message = `Safe message verified - ${analysisResult.confidence}% confident`;
    }

    addNotification({
      message,
      tags: ["manual-test"],
      type: notifType as any,
      confidence: analysisResult.confidence,
      details: `Analyzed text: "${text.substring(0, 100)}..."`,
    } as any);

    setItems(loadState().notifications);
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case "phishing":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "promo":
        return <Info className="h-5 w-5 text-blue-600" />;
      case "normal":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const getColorScheme = (type?: string) => {
    switch (type) {
      case "phishing":
        return {
          bg: "from-red-50 to-rose-50",
          border: "border-red-200",
          text: "text-red-800",
          badge: "bg-red-100 text-red-700",
        };
      case "promo":
        return {
          bg: "from-blue-50 to-cyan-50",
          border: "border-blue-200",
          text: "text-blue-800",
          badge: "bg-blue-100 text-blue-700",
        };
      case "normal":
        return {
          bg: "from-green-50 to-emerald-50",
          border: "border-green-200",
          text: "text-green-800",
          badge: "bg-green-100 text-green-700",
        };
      default:
        return {
          bg: "from-gray-50 to-gray-100",
          border: "border-gray-200",
          text: "text-gray-800",
          badge: "bg-gray-100 text-gray-700",
        };
    }
  };

  return (
    <div className="space-y-5 py-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-teal-600" />
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Security Center</h2>
            <p className="text-sm text-gray-500 mt-1">AI-powered phishing detection & alerts</p>
          </div>
        </div>
      </motion.div>

      {/* AI Testing Interface */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 shadow-xl border-2 border-teal-100"
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Test AI Detection</h3>
            <p className="text-xs text-gray-600">Paste any SMS or email to analyze</p>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 p-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200 transition-all"
          rows={4}
          placeholder="Example: আপনার bKash অ্যাকাউন্ট ভেরিফাই করতে এই লিঙ্কে ক্লিক করুন..."
          disabled={!modelReady}
        />

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {modelReady ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-600">AI Model Ready</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs font-medium text-yellow-600">Training AI...</span>
              </>
            )}
          </div>
          <motion.button 
            onClick={analyze}
            disabled={!text.trim() || !modelReady}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl gradient-teal px-6 py-2 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔍 Analyze Message
          </motion.button>
        </div>

        {/* Analysis Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mt-4 rounded-xl p-4 border-2 bg-gradient-to-r ${getColorScheme(result.label === "smish" ? "phishing" : result.label).bg} ${getColorScheme(result.label === "smish" ? "phishing" : result.label).border}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getIcon(result.label === "smish" ? "phishing" : result.label)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-base ${getColorScheme(result.label === "smish" ? "phishing" : result.label).text}`}>
                      {result.label === "smish" ? "⚠️ PHISHING DETECTED" : result.label === "promo" ? "📢 PROMOTIONAL" : "✅ SAFE MESSAGE"}
                    </h4>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${getColorScheme(result.label === "smish" ? "phishing" : result.label).badge}`}>
                      {result.confidence}% Confident
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-semibold text-gray-700">Classification Breakdown:</div>
                    {Object.entries(result.probabilities).map(([label, prob]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="w-20 text-xs font-medium capitalize text-gray-600">{label === "smish" ? "Phishing" : label}:</span>
                        <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${label === "smish" ? "bg-red-500" : label === "promo" ? "bg-blue-500" : "bg-green-500"}`}
                            style={{ width: `${prob * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700">{Math.round(prob * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Security Notifications */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-800">Security Alerts</h3>
        
        {items.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No security alerts yet</p>
          </div>
        ) : (
          items.slice().reverse().map((n, idx) => {
            const colors = getColorScheme(n.type);
            const isExpanded = expandedId === n.id;
            
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`glass-card rounded-xl p-4 shadow-lg border-2 ${colors.border} bg-gradient-to-r ${colors.bg} hover:shadow-xl transition-all`}
              >
                <div 
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : n.id)}
                >
                  <div className="mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${colors.text}`}>{n.message}</p>
                      {n.confidence && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${colors.badge}`}>
                          {n.confidence}%
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {n.tags.map((tag: string) => (
                        <span key={tag} className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          {tag}
                        </span>
                      ))}
                      <span className="text-xs text-gray-600 ml-auto">
                        {new Date(n.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                </div>
                
                <AnimatePresence>
                  {isExpanded && n.details && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-gray-300/50"
                    >
                      <p className="text-xs text-gray-700 leading-relaxed">{n.details}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
