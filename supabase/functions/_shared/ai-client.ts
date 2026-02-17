/**
 * Shared AI client with OpenAI priority and Lovable AI fallback.
 * Usage: import { callAI } from "../_shared/ai-client.ts";
 */

interface AICallOptions {
  model?: string;
  temperature?: number;
  tools?: any[];
  tool_choice?: any;
}

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callAI(
  messages: AIMessage[],
  options: AICallOptions = {}
): Promise<any> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  if (openaiKey) {
    return callOpenAI(messages, options, openaiKey);
  }

  if (lovableKey) {
    return callLovableAI(messages, options, lovableKey);
  }

  throw new Error("No AI API key configured (OPENAI_API_KEY or LOVABLE_API_KEY)");
}

async function callOpenAI(
  messages: AIMessage[],
  options: AICallOptions,
  apiKey: string
): Promise<any> {
  const model = mapToOpenAIModel(options.model);

  const body: any = {
    model,
    messages,
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`OpenAI error ${response.status}:`, text);

    // Fallback to Lovable AI on OpenAI error
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) {
      console.log("Falling back to Lovable AI...");
      return callLovableAI(messages, options, lovableKey);
    }

    throw new Error(`OpenAI API error: ${response.status} - ${text}`);
  }

  return response.json();
}

function mapToOpenAIModel(model?: string): string {
  if (!model) return "gpt-4o-mini";
  // Map Lovable/Gemini model names to OpenAI equivalents
  if (model.startsWith("google/") || model.startsWith("gemini")) return "gpt-4o-mini";
  if (model === "gpt-4o-mini" || model === "gpt-4o") return model;
  return "gpt-4o-mini";
}

async function callLovableAI(
  messages: AIMessage[],
  options: AICallOptions,
  apiKey: string
): Promise<any> {
  const body: any = {
    model: options.model || "google/gemini-2.5-flash",
    messages,
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Insufficient credits");
    const text = await response.text();
    throw new Error(`Lovable AI error: ${response.status} - ${text}`);
  }

  return response.json();
}
