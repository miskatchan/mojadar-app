import { NextResponse } from "next/server";
import OpenAI from "openai";

// Use environment variable or empty string if not set
const openaiApiKey = process.env.OPENAI_API_KEY || "";
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

console.log("OpenAI client initialized:", !!openai);

export async function POST(req: Request) {
  console.log("POST request received");
  try {
    const body = await req.json().catch(() => ({ prompt: "" }));
    console.log("Request body:", body);
    const prompt: string = body.prompt || "";
    console.log("Prompt:", prompt);

    // If no API key, return a helpful simulated response
    if (!openai || !openaiApiKey) {
      console.log("No OpenAI API key found, using simulated response");
      return generateSimulatedResponse(prompt);
    }
    
    // Test if the OpenAI client is properly configured
    try {
      // This will throw an error if the API key is invalid
      await openai.models.list();
    } catch (configError) {
      console.error("OpenAI API key configuration error:", configError);
      console.log("Falling back to simulated response due to configuration error");
      return generateSimulatedResponse(prompt);
    }

    const system = `You are HisabGuru, an intelligent financial assistant for personal finance management in Bangladesh.

Your capabilities:
1. **Transaction Logging**: Parse natural language to add/modify transactions
   - "I spent 1000tk" → Add expense of 1000 BDT, category "Other"
   - "1000tk on food" → Add expense with category "Food & Dining"
   - "Add 50tk to my last transaction" → Increase last transaction by 50 BDT
   - "Add 50tk to my food transaction where note says 'shama's kitchen'" → Find and update specific transaction

2. **Memory Storage**: Store future events and important information
   - "Next month is my mother's birthday" → Store as memory with timestamp
   - "Remember I will get 1000tk bonus" → Store financial event

3. **Budget Optimization**: Create intelligent budget plans considering stored memories
   - For budget requests, respond with ONLY valid JSON, no explanatory text

Response Format:
- For transactions: Acknowledge + JSON command
  Example: "I'll add an expense of ৳100 for Food & Dining.\n\n{\"action\":\"add_transaction\",\"type\":\"expense\",\"amount\":100,\"category\":\"Food & Dining\"}"
- For memories: Acknowledge storage  
  Example: "I've stored this memory and will consider it in future budget planning.\n\n{\"action\":\"add_memory\",\"text\":\"Next month is mother's birthday\"}"
- For budget: Return ONLY valid JSON budget plan, no extra text
  Example: {\"totalBudget\":7000,\"categories\":[...],\"savingsGoal\":1000,\"tips\":[...],\"considerations\":[...]}

IMPORTANT: For budget requests, respond with ONLY the JSON object, no extra text before or after.

Available categories: Food & Dining, Transport, Education, Entertainment, Shopping, Health, Bills & Utilities, Groceries, Personal Care, Other
Available accounts: Cash, bKash, Nagad, Rocket, Bank
Currency: BDT (৳)`;
    
    console.log("Making OpenAI API call with prompt:", prompt);
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      });

      const responseText = completion.choices[0]?.message?.content || "";
      console.log("OpenAI response text:", responseText);
      const responseJson = { text: responseText };
      console.log("Returning OpenAI response:", responseJson);
      return NextResponse.json(responseJson);
    } catch (apiError: any) {
      console.error("OpenAI API Error:", apiError);
      
      // If quota exceeded or rate limited, fall back to simulated response
      if (apiError?.status === 429 || apiError?.message?.includes('quota') || apiError?.message?.includes('rate_limit')) {
        console.log("OpenAI API quota exceeded or rate limited, using simulated response");
        return generateSimulatedResponse(prompt);
      }
      
      // For other errors, fall back to simulated response
      console.log("OpenAI API error, falling back to simulated response");
      return generateSimulatedResponse(prompt);
    }
  } catch (error) {
    console.error("API Error:", error);
    
    // Return user-friendly error response
    const errorMessage = error instanceof Error ? error.message : "Failed to generate response";
    const errorResponse = { 
      error: `OpenAI API Error: ${errorMessage}`,
      text: "I'm experiencing difficulties connecting to the AI service. Please try again later or check your API key configuration."
    };
    console.log("Returning error response:", errorResponse);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

function generateSimulatedResponse(prompt: string) {
  console.log("generateSimulatedResponse called with prompt:", prompt);
  console.log("Prompt length:", prompt.length);
  console.log("Is prompt empty:", prompt.length === 0);
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for transaction operations
  console.log("Checking for transaction operations");
  console.log("Contains spent:", lowerPrompt.includes('spent'));
  console.log("Contains paid:", lowerPrompt.includes('paid'));
  console.log("Contains bought:", lowerPrompt.includes('bought'));
  console.log("Contains amount pattern:", /\d+\s*(?:tk|৳|taka)/i.test(prompt));
  if (lowerPrompt.includes('spent') || lowerPrompt.includes('paid') || lowerPrompt.includes('bought') || 
      /\d+\s*(?:tk|৳|taka)/i.test(prompt)) {
    // Extract amount
    const amountMatch = prompt.match(/(\d+)\s*(?:tk|৳|taka)?/i);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
    
    // Detect category
    let category = "Other";
    if (/food|lunch|dinner|breakfast/i.test(lowerPrompt)) category = "Food & Dining";
    else if (/transport|bus|rickshaw|uber/i.test(lowerPrompt)) category = "Transport";
    else if (/book|education|course/i.test(lowerPrompt)) category = "Education";
    else if (/movie|entertainment|game/i.test(lowerPrompt)) category = "Entertainment";
    else if (/shop|cloth|purchase/i.test(lowerPrompt)) category = "Shopping";
    
    // Check if it's "add to last transaction"
    if (/add.*to.*last.*transaction/i.test(lowerPrompt)) {
      return NextResponse.json({ 
        text: `I'll add ৳${amount} to your last transaction.\n\n{"action":"add_to_last","amount":${amount}}` 
      });
    }
    
    // Check if it's "add to specific transaction"
    if (/add.*to.*transaction/i.test(lowerPrompt)) {
      const noteMatch = lowerPrompt.match(/note.*['"]([^'"]+)['"]/i);
      if (noteMatch) {
        return NextResponse.json({ 
          text: `I'll add ৳${amount} to the transaction with note "${noteMatch[1]}".\n\n{"action":"add_to_specific","amount":${amount},"targetNote":"${noteMatch[1]}"}` 
        });
      }
      // Category-based
      const catMatch = lowerPrompt.match(/add.*to.*(?:my\s+)?(\w+).*transaction/i);
      if (catMatch) {
        return NextResponse.json({ 
          text: `I'll add ৳${amount} to your ${catMatch[1]} transaction.\n\n{"action":"add_to_specific","amount":${amount},"targetCategory":"${catMatch[1]}"}` 
        });
      }
    }
    
    // Regular transaction add
    console.log("About to return transaction response");
    return NextResponse.json({ 
      text: `I'll add an expense of ৳${amount} for ${category}.

{"action":"add_transaction","type":"expense","amount":${amount},"category":"${category}"}`
    });
  }
  
  // Check for memory storage
  console.log("Checking for memory storage keywords");
  console.log("Contains remember:", /remember/i.test(lowerPrompt));
  console.log("Contains next month:", /next month/i.test(lowerPrompt));
  console.log("Contains birthday:", /birthday/i.test(lowerPrompt));
  console.log("Contains event:", /event/i.test(lowerPrompt));
  if (/remember|next month|birthday|event/i.test(lowerPrompt)) {
    const memoryResponse = { 
      text: `I've stored this memory for future reference. I'll consider it when creating budgets and providing financial advice.\n\n{"action":"add_memory","text":"${prompt.replace(/"/g, "'")}"}` 
    };
    console.log("Returning memory response:", memoryResponse);
    return NextResponse.json(memoryResponse);
  }
  
  // Check if it's a budget planning request
  console.log("Checking for budget request. Lower prompt:", lowerPrompt);
  console.log("Contains 'budget':", lowerPrompt.includes('budget'));
  console.log("Contains 'optimize':", lowerPrompt.includes('optimize'));
  console.log("Contains 'create':", lowerPrompt.includes('create'));
  console.log("Contains 'plan':", lowerPrompt.includes('plan'));
  if (lowerPrompt.includes('budget') && (lowerPrompt.includes('optimize') || lowerPrompt.includes('create') || lowerPrompt.includes('plan'))) {
    console.log("Budget request detected, generating simulated response");
    const response = {
      "totalBudget": 7000,
      "categories": [
        {"category": "Food & Dining", "suggested": 2000, "reasoning": "Based on typical student spending patterns in Bangladesh, allocating 28% for meals and snacks"},
        {"category": "Transport", "suggested": 800, "reasoning": "Daily commute and occasional ride-sharing expenses"},
        {"category": "Education", "suggested": 1500, "reasoning": "Books, stationery, and course materials"},
        {"category": "Entertainment", "suggested": 700, "reasoning": "Movies, social activities, and hobbies for balanced lifestyle"},
        {"category": "Shopping", "suggested": 1000, "reasoning": "Clothing and personal items as needed"},
        {"category": "Bills & Utilities", "suggested": 500, "reasoning": "Mobile recharge and internet expenses"}
      ],
      "savingsGoal": 1500,
      "tips": [
        "Track all expenses daily to stay aware of spending patterns",
        "Use bKash/Nagad for digital payments to automatically log transactions",
        "Set aside savings at the beginning of the month, not the end"
      ],
      "considerations": [
        "Consider upcoming events or special occasions this month",
        "Adjust food budget if eating out frequently with friends"
      ]
    };
    // For budget requests, return the JSON object directly in the text field as a properly formatted string
    // This matches the format that the real AI would return
    const responseJson = { 
      text: JSON.stringify(response)
    };
    console.log("Returning budget response:", responseJson);
    console.log("Response JSON string:", JSON.stringify(responseJson));
    return NextResponse.json(responseJson);
  }
  
  // Default helpful response
  const response = "I'm your HisabGuru AI assistant! I can help you:\n\n• Add transactions: \"I spent 100tk on food\"\n• Modify transactions: \"Add 50tk to my last transaction\"\n• Store memories: \"Remember, next month is my mother's birthday\"\n• Create budgets: \"Optimize my budget\"\n\nWhat would you like to do?";
  const responseJson = { text: response };
  console.log("Returning default response:", responseJson);
  console.log("Default response JSON string:", JSON.stringify(responseJson));
  return NextResponse.json(responseJson);
}
