import { config, llmEnabled } from "./config";
import type { AppLocale, SessionUser } from "./domain";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmChatRequest {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LlmChatResponse {
  content: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

/**
 * Provider-independent LLM adapter.
 *
 * When LLM_API_KEY is not configured, `isAvailable()` returns false and callers
 * should fall back to the rule-based response generator in ai-service.ts.
 *
 * The adapter targets the OpenAI-compatible chat completions API. Any provider
 * that exposes the same `/chat/completions` endpoint (OpenAI, Azure OpenAI,
 * OpenRouter, local vLLM/Ollama with an OpenAI-compatible layer, etc.) works
 * by setting LLM_BASE_URL accordingly.
 */
export const llm = {
  isAvailable(): boolean {
    return llmEnabled();
  },

  get model(): string {
    return config.llm.model;
  },

  async chat(req: LlmChatRequest): Promise<LlmChatResponse> {
    if (!llmEnabled()) {
      throw new Error("LLM_NOT_CONFIGURED");
    }
    const url = `${config.llm.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.2,
        max_tokens: req.maxTokens ?? 800,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LLM_HTTP_${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    return {
      content,
      model: json.model ?? config.llm.model,
      usage: {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
      },
    };
  },
};

const SYSTEM_PROMPT = `You are the Balsathi AI Assistant for an Anganwadi child development monitoring platform.

STRICT RULES:
1. You must ONLY use the information provided in the "Authorized Records" section. Never invent names, dates, milestones, observations, measurements, recommendations, or risk assessments.
2. If the requested information is not in the records, say so explicitly in the user's language.
3. Do NOT diagnose any developmental disorder, medical condition, or disability. You may only summarize recorded observations and flag items marked for follow-up.
4. Always identify the date range and source records used in your summary.
5. Distinguish clearly between: (a) verified database facts, (b) your summary, (c) suggested activities, and (d) uncertain interpretations.
6. Respond in the user's requested language (English, Hindi, or Marathi).
7. Keep answers concise and helpful for Anganwadi workers, parents, or administrators.
8. If the user asks about a child not in the authorized records, explain you cannot access that information without revealing whether such records exist.

Format your response as plain text. Use bullet points where helpful.`;

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildLlmMessages(
  session: SessionUser,
  locale: AppLocale,
  question: string,
  records: unknown,
): LlmMessage[] {
  return [
    { role: "system", content: buildSystemPrompt() },
    {
      role: "user",
      content: `User role: ${session.role}\nLocale: ${locale}\n\nQuestion: ${question}\n\nAuthorized Records (JSON):\n${JSON.stringify(records, null, 2)}\n\nRespond in ${locale} based ONLY on the records above.`,
    },
  ];
}
