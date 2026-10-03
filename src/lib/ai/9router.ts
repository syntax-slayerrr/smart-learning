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
  // Models available in 9Router daemon
  GEMINI_3_FLASH: "ag/gemini-3-flash",
  GEMINI_3_5_FLASH: "ag/gemini-3.5-flash-high",
  GEMINI_PRO: "ag/gemini-pro-agent",
  CLAUDE_SONNET: "ag/claude-sonnet-4-6",
  CLAUDE_OPUS: "ag/claude-opus-4-6-thinking",
  GPT_OSS_120B: "ag/gpt-oss-120b-medium",
} as const;

export async function call9Router(options: AIChatOptions) {
  const baseUrl = process.env.NINEROUTER_BASE_URL || "http://127.0.0.1:20128/v1";
  const apiKey =
    process.env.NINEROUTER_API_KEY || "sk-e3113e651fb1cbda-7jxiqm-4deb7d38";
  const model =
    options.model ||
    process.env.NINEROUTER_DEFAULT_MODEL ||
    ROUTER_MODELS.GEMINI_3_FLASH;

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

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "Smart Learning - AI Classroom Intelligence",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[9Router Gateway HTTP ${response.status}]:`, errorText);
      return {
        success: false,
        error: `HTTP_${response.status}`,
        details: errorText,
        content: null,
        usage: null,
      };
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      success: true,
      content: choice?.message?.content || "",
      tool_calls: choice?.message?.tool_calls || null,
      model: data.model || model,
      usage: data.usage || null,
    };
  } catch (error: any) {
    console.error("[9Router Network Exception]:", error);
    return {
      success: false,
      error: "GATEWAY_CONNECTION_ERROR",
      details: error.message,
      content: null,
      usage: null,
    };
  }
}
