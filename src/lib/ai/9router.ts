/**
 * 9Router & Hermes Agent Client
 * Dedicated AI Gateway for Smart Learning (SYNTAX SLAYER)
 * Direct connection to local 9Router daemon (:20128)
 */

export interface AIClientMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface AIClientTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AIChatOptions {
  model?: string;
  messages: AIClientMessage[];
  temperature?: number;
  max_tokens?: number;
  tools?: AIClientTool[];
  stream?: boolean;
}

export const ROUTER_MODELS = {
  // Local 9Router models
  GEMINI_3_FLASH: "ag/gemini-3-flash",
  GEMINI_3_5_FLASH: "ag/gemini-3.5-flash-high",
  GEMINI_PRO: "ag/gemini-pro-agent",
  CLAUDE_SONNET: "ag/claude-sonnet-4-6",
  CLAUDE_OPUS: "ag/claude-opus-4-6-thinking",
  GPT_OSS_120B: "ag/gpt-oss-120b-medium",
  // Cloud models (Groq / OpenRouter)
  GROQ_QWEN: "qwen/qwen3.8-27b",
  GROQ_GPT_OSS: "openai/gpt-oss-120b",
  DEEPSEEK_CHAT: "deepseek/deepseek-chat",
  QWEN_FREE: "qwen/qwen3.8-27b:free",
} as const;

const GROQ_DEFAULT_KEY =
  process.env.GROQ_API_KEY ||
  process.env.CUSTOM_API_KEY ||
  "gsk_MBXfpeP7fBsqcI9w1y3uWGdyb3FYX43xP22e2W63vHXHY7pn";

const OPENROUTER_FALLBACK_KEY =
  process.env.OPENROUTER_API_KEY ||
  "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";

async function callGroqCloud(options: AIChatOptions) {
  const models = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b", "openai/gpt-oss-20b"];

  for (const model of models) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_DEFAULT_KEY}`,
          "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 1500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Groq Cloud ${model} HTTP ${response.status}]:`, errorText);
        continue;
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (choice?.message?.content) {
        return {
          success: true,
          content: choice.message.content as string,
          tool_calls: choice.message.tool_calls || null,
          model,
          usage: data.usage || null,
        };
      }
    } catch (e: any) {
      console.warn(`[Groq Cloud ${model} Exception]:`, e.message);
    }
  }

  // If Groq fails, fallback to OpenRouter
  return await callOpenRouterCloud(options);
}

async function callOpenRouterCloud(options: AIChatOptions) {
  const candidateModels = [
    "poolside/laguna-s-2.1:free",
    "deepseek/deepseek-chat",
    "qwen/qwen3.8-27b:free",
    "inclusionai/ling-3.0-flash-sante:free",
  ];

  for (const model of candidateModels) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_FALLBACK_KEY}`,
          "HTTP-Referer": "https://smart-learning-black.vercel.app",
          "X-Title": "Smart Learning (SYNTAX SLAYER)",
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 1500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[OpenRouter Cloud ${model} HTTP ${response.status}]:`, errorText);
        continue;
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (choice?.message?.content) {
        return {
          success: true,
          content: choice.message.content as string,
          tool_calls: choice.message.tool_calls || null,
          model,
          usage: data.usage || null,
        };
      }
    } catch (e: any) {
      console.warn(`[OpenRouter Cloud ${model} Exception]:`, e.message);
    }
  }

  return {
    success: false,
    error: "CLOUD_LLM_FAILED",
    details: "All cloud LLM models failed or timed out",
    content: null,
    usage: null,
  };
}

export async function call9Router(options: AIChatOptions) {
  const baseUrl = process.env.NINEROUTER_BASE_URL || "http://127.0.0.1:20128/v1";
  const apiKey =
    process.env.NINEROUTER_API_KEY || "sk-e31d4e410b9854cebb43e867bb408eb3f30999557bfa16da08527a2995b07d38";
  const model =
    options.model ||
    process.env.NINEROUTER_DEFAULT_MODEL ||
    ROUTER_MODELS.GEMINI_3_FLASH;

  const isLocalHost = baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost");
  const isVercelCloud = Boolean(process.env.VERCEL);

  // If running in cloud environment and baseUrl is pointing to localhost, switch to Cloud LLM directly
  if (isVercelCloud && isLocalHost) {
    return await callGroqCloud(options);
  }

  try {
    const payload: Record<string, unknown> = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
      stream: options.stream ?? false,
    };

    if (options.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = "auto";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "Smart Learning - AI Classroom Intelligence",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[9Router Gateway HTTP ${response.status}]:`, errorText);
      // Fallback to OpenRouter cloud
      return await callOpenRouterCloud(options);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (choice?.message?.content) {
      return {
        success: true,
        content: choice.message.content,
        tool_calls: choice.message.tool_calls || null,
        model: data.model || model,
        usage: data.usage || null,
      };
    }

    return await callGroqCloud(options);
  } catch (error: any) {
    console.warn("[9Router Network Exception -> Falling back to Cloud LLM]:", error?.message);
    return await callGroqCloud(options);
  }
}
