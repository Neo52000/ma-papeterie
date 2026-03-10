/**
 * Shared AI client with OpenAI as the primary provider.
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

  if (!openaiKey) {
    throw new Error("No AI API key configured (OPENAI_API_KEY)");
  }

  return callOpenAI(messages, options, openaiKey);
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
    throw new Error(`OpenAI API error: ${response.status} - ${text}`);
  }

  return response.json();
}

function mapToOpenAIModel(model?: string): string {
  if (!model) return "gpt-4o-mini";
  if (model === "gpt-4o-mini" || model === "gpt-4o") return model;
  return "gpt-4o-mini";
}
