// Enhanced Naive Bayes classifier for smishing detection with confidence scores
export type Label = "smish" | "promo" | "normal";

type ClassStats = {
  totalDocs: number;
  totalTokens: number;
  tokenCounts: Map<string, number>;
};

export class NaiveBayesModel {
  classes: Map<Label, ClassStats> = new Map();
  vocabulary: Set<string> = new Set();
  
  // Enhanced feature weights for Bangladesh-specific patterns
  private strongPhishingIndicators = [
    // Bangla phishing patterns
    'জিতেছেন', 'জিতে', 'জিতুন', 'লটারি', 'পুরস্কার', 'উপহার',
    'ক্লিক', 'লিংক', 'ভেরিফাই', 'যাচাই', 'নিশ্চিত', 'জরুরি',
    'ব্লক', 'সাসপেন্ড', 'বন্ধ', 'সমস্যা', 'ত্রুটি',
    'পিন', 'পাসওয়ার্ড', 'ওটিপি', 'কোড',
    'টাকা', 'হাজার', 'লাখ', 'কোটি', 'ইনকাম', 'আয়', 'বিনিয়োগ',
    'বিকাশ', 'নগদ', 'রকেট', 'ব্যাংক',
    'কল', 'ফোন', 'নাম্বার', 'হোয়াটসঅ্যাপ', 'যোগাযোগ',
    'সোনা', 'ভরি', 'চাকরি', 'কাজ', 'বেতন',
    // English phishing patterns
    'won', 'win', 'winner', 'lottery', 'prize', 'gift', 'reward',
    'click', 'link', 'verify', 'confirm', 'urgent', 'hurry',
    'account', 'blocked', 'suspended', 'problem', 'error',
    'pin', 'password', 'otp', 'code', 'cvv',
    'bkash', 'nagad', 'rocket', 'bank', 'payment',
    'call', 'whatsapp', 'telegram', 'contact',
    'gold', 'tola', 'job', 'work', 'salary', 'income', 'investment'
  ];

  tokenize(text: string): string[] {
    // Enhanced tokenization with bigrams
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);
    
    const tokens = [...words];
    
    // Add bigrams for better context
    for (let i = 0; i < words.length - 1; i++) {
      tokens.push(`${words[i]}_${words[i + 1]}`);
    }
    
    return tokens;
  }

  // Extract advanced features from text
  private extractFeatures(text: string): string[] {
    const tokens = this.tokenize(text);
    const features: string[] = [...tokens];
    const lowerText = text.toLowerCase();
    
    // Early exit for very short, simple messages (greetings, simple words)
    const wordCount = tokens.filter(t => !t.includes('_')).length; // Exclude bigrams
    if (wordCount <= 3 && text.length < 20) {
      const simpleGreetings = /^(hi|hello|hey|ok|thanks|thank you|yes|no|ধন্যবাদ|হ্যালো|হাই|ঠিক আছে)$/i;
      if (simpleGreetings.test(text.trim())) {
        features.push('SIMPLE_GREETING', 'SIMPLE_GREETING', 'SIMPLE_GREETING', 'SIMPLE_GREETING', 'SIMPLE_GREETING');
        return features; // Early return - no phishing features
      }
    }
    
    // Count pattern occurrences
    let phishKeywordCount = 0;
    this.strongPhishingIndicators.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        phishKeywordCount++;
      }
    });
    
    // Feature 1: URLs (very strong phishing indicator - 4x weight)
    if (/http|www\.|bit\.ly|t\.me|cutt\.ly|rebrand\.ly|tinyurl|wa\.me|chdl\.co|\.com|\.org|\.net/i.test(text)) {
      features.push('HAS_URL', 'HAS_URL', 'HAS_URL', 'HAS_URL');
    }
    
    // Feature 2: Phone numbers with call action
    const hasPhone = /\+880|০১\d{9}|01\d{9}/i.test(text);
    if (hasPhone) {
      features.push('HAS_PHONE');
      if (/কল|call|ফোন|phone|dial|যোগাযোগ|contact/i.test(lowerText)) {
        features.push('CALL_ACTION', 'CALL_ACTION', 'CALL_ACTION');
      }
    }
    
    // Feature 3: Prize/winning claims (4x weight)
    if (/জিতেছেন|জিতে|জিতুন|won|win|winner|prize|lottery|লটারি|পুরস্কার/i.test(lowerText)) {
      features.push('PRIZE_CLAIM', 'PRIZE_CLAIM', 'PRIZE_CLAIM', 'PRIZE_CLAIM');
      
      // Prize + Phone = classic scam (additional 3x)
      if (hasPhone) {
        features.push('PRIZE_PHONE_SCAM', 'PRIZE_PHONE_SCAM', 'PRIZE_PHONE_SCAM');
      }
    }
    
    // Feature 4: Gold/jewelry prizes (5x weight - very common scam)
    if (/সোনা|gold|ভরি|tola|গহনা|jewelry/i.test(lowerText)) {
      features.push('GOLD_SCAM', 'GOLD_SCAM', 'GOLD_SCAM', 'GOLD_SCAM', 'GOLD_SCAM');
    }
    
    // Feature 5: Money amounts
    const moneyMatches = text.match(/\d+[,\d]*\s*(টাকা|tk|taka|৳|লাখ|কোটি|lakh|crore)/gi);
    if (moneyMatches) {
      moneyMatches.forEach(match => {
        const amount = parseInt(match.replace(/[^\d]/g, ''));
        if (amount >= 1000) {
          features.push('MONEY_LARGE', 'MONEY_LARGE');
        }
        if (amount >= 10000) {
          features.push('MONEY_VERY_LARGE', 'MONEY_VERY_LARGE', 'MONEY_VERY_LARGE');
        }
        if (amount >= 100000) {
          features.push('MONEY_EXTREME', 'MONEY_EXTREME', 'MONEY_EXTREME', 'MONEY_EXTREME');
        }
      });
    }
    
    // Feature 6: PIN/Password requests (5x - NEVER legitimate)
    if (/pin|পিন|password|পাসওয়ার্ড|otp|ওটিপি|cvv/i.test(lowerText)) {
      features.push('CREDENTIAL_REQUEST', 'CREDENTIAL_REQUEST', 'CREDENTIAL_REQUEST', 'CREDENTIAL_REQUEST', 'CREDENTIAL_REQUEST');
    }
    
    // Feature 7: Account threats (3x weight)
    if (/account|অ্যাকাউন্ট|blocked|ব্লক|suspended|সাসপেন্ড|বন্ধ|সমস্যা|problem/i.test(lowerText)) {
      features.push('ACCOUNT_THREAT', 'ACCOUNT_THREAT', 'ACCOUNT_THREAT');
    }
    
    // Feature 8: Urgency patterns (2x weight)
    if (/urgent|জরুরি|now|এখনই|today|আজই|last|শেষ|final|verify|ভেরিফাই|যাচাই|confirm|নিশ্চিত/i.test(lowerText)) {
      features.push('URGENCY', 'URGENCY');
    }
    
    // Feature 9: Job/income scams (3x when combined with money)
    if (/job|চাকরি|work|কাজ|salary|বেতন|income|ইনকাম|earn|আয়|investment|বিনিয়োগ/i.test(lowerText)) {
      features.push('JOB_INCOME');
      if (/\d{4,}/.test(text) || moneyMatches) {
        features.push('JOB_SCAM', 'JOB_SCAM', 'JOB_SCAM');
      }
    }
    
    // Feature 10: Legitimate telecom promo patterns (3x weight for promo)
    if (/mygp\.li|\*121\*|\*111\*|\*123\*|dial.*\*|ডায়াল.*\*/i.test(lowerText)) {
      features.push('OFFICIAL_TELECOM', 'OFFICIAL_TELECOM', 'OFFICIAL_TELECOM');
    }
    if (/জিবি|gb|মিনিট|minute|min|রিচার্জ|recharge/i.test(lowerText)) {
      if (!hasPhone && phishKeywordCount < 2) {
        features.push('DATA_PACKAGE', 'DATA_PACKAGE');
      }
    }
    
    // Feature 11: Shopping/discount patterns (promo indicator)
    if (/ছাড়|ছাড|discount|ক্যাশব্যাক|cashback|offer|অফার|%/i.test(lowerText)) {
      if (!hasPhone && phishKeywordCount < 2) {
        features.push('SHOPPING_PROMO', 'SHOPPING_PROMO');
      }
    }
    
    // Feature 12: Multiple phishing signals (escalating weight)
    if (phishKeywordCount >= 3) {
      for (let i = 0; i < phishKeywordCount; i++) {
        features.push('MULTI_PHISH_SIGNAL');
      }
    }
    
    // Feature 13: Message length analysis
    const msgLength = tokens.length;
    if (msgLength < 15 && phishKeywordCount >= 2) {
      features.push('SHORT_SUSPICIOUS', 'SHORT_SUSPICIOUS');
    }
    
    return features;
  }

  train(data: { text: string; label: Label }[]) {
    this.classes.clear();
    this.vocabulary.clear();

    for (const { text, label } of data) {
      const features = this.extractFeatures(text);
      if (!this.classes.has(label)) {
        this.classes.set(label, { totalDocs: 0, totalTokens: 0, tokenCounts: new Map() });
      }
      const stats = this.classes.get(label)!;
      stats.totalDocs++;
      for (const feature of features) {
        this.vocabulary.add(feature);
        stats.tokenCounts.set(feature, (stats.tokenCounts.get(feature) || 0) + 1);
        stats.totalTokens++;
      }
    }
  }

  predictProba(text: string): Record<Label, number> {
    const features = this.extractFeatures(text);
    const V = this.vocabulary.size || 1;
    const logProbs: Record<Label, number> = { smish: 0, promo: 0, normal: 0 };

    let totalsAcross = 0;
    for (const [, stats] of this.classes) totalsAcross += stats.totalDocs;

    for (const [label, stats] of this.classes) {
      const prior = Math.log((stats.totalDocs + 1) / (totalsAcross + this.classes.size));
      let logLik = 0;
      
      for (const feature of features) {
        const count = stats.tokenCounts.get(feature) || 0;
        const smoothed = (count + 1) / (stats.totalTokens + V);
        logLik += Math.log(smoothed);
      }
      
      logProbs[label] = prior + logLik;
    }

    // Apply softmax normalization
    const maxLog = Math.max(...Object.values(logProbs));
    const exps = Object.fromEntries(
      Object.entries(logProbs).map(([k, v]) => [k, Math.exp(v - maxLog)])
    ) as Record<Label, number>;
    const sumExp = Object.values(exps).reduce((a, b) => a + b, 0) || 1;
    
    return Object.fromEntries(
      Object.entries(exps).map(([k, v]) => [k, v / sumExp])
    ) as Record<Label, number>;
  }

  predict(text: string): Label {
    const proba = this.predictProba(text);
    
    // Very short simple messages are almost always normal
    if (text.length < 20 && /^(hi|hello|hey|ok|thanks|yes|no|ধন্যবাদ|হ্যালো|হাই|ঠিক আছে|শুভ|good)/i.test(text.trim())) {
      return 'normal';
    }
    
    // If normal probability is very high (>65%), classify as normal
    if (proba.normal >= 0.65) {
      return 'normal';
    }
    
    // Safety-first approach: if smish probability is >= 40%, classify as smish
    if (proba.smish >= 0.40) {
      return 'smish';
    }
    
    // If close call between smish and others (difference < 20%), prefer smish
    const maxProba = Math.max(proba.smish, proba.promo, proba.normal);
    if (Math.abs(proba.smish - maxProba) < 0.20 && proba.smish > 0.30) {
      return 'smish';
    }
    
    // Otherwise return highest probability
    return (Object.entries(proba).reduce((a, b) => (a[1] > b[1] ? a : b))[0] as Label);
  }

  getConfidencePercentage(text: string): { label: Label; confidence: number; probabilities: Record<Label, number> } {
    const probabilities = this.predictProba(text);
    const label = this.predict(text);
    const confidence = Math.round(probabilities[label] * 100);
    return { label, confidence, probabilities };
  }

  serialize(): string {
    const obj = {
      classes: Array.from(this.classes.entries()).map(([label, stats]) => ({
        label,
        totalDocs: stats.totalDocs,
        totalTokens: stats.totalTokens,
        tokenCounts: Array.from(stats.tokenCounts.entries()),
      })),
      vocabulary: Array.from(this.vocabulary),
    };
    return JSON.stringify(obj);
  }

  static deserialize(data: string): NaiveBayesModel {
    const obj = JSON.parse(data);
    const model = new NaiveBayesModel();
    model.vocabulary = new Set(obj.vocabulary);
    for (const c of obj.classes) {
      model.classes.set(c.label, {
        totalDocs: c.totalDocs,
        totalTokens: c.totalTokens,
        tokenCounts: new Map(c.tokenCounts),
      });
    }
    return model;
  }
}

export function saveModel(model: NaiveBayesModel) {
  if (typeof window === "undefined") return;
  localStorage.setItem("smish_model", model.serialize());
}

export function restoreModel(): NaiveBayesModel | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("smish_model");
  return data ? NaiveBayesModel.deserialize(data) : null;
}
