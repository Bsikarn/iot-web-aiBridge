import { createClient } from '@vercel/edge-config';

export interface HistoryRecord {
  timestamp: string;
  provider?: string;
  model: string;
  promptIndex: number;
  kbIndex: number;
  aiResponse: string;
  imageUrl?: string;
}

export interface WiFiNetwork {
  id: string;
  ssid: string;
  password: string;
  username?: string;
  priority: number;
}

export interface ModelSlotConfig {
  name: string;          // Custom Display Name / Label (e.g., "Sol+Sonnet", "Claude-Ckt")
  model_primary: string; // Primary OpenRouter Model ID
  model_secondary?: string; // Optional Secondary OpenRouter Model ID for parallel execution
}

export interface AISetting {
  prompts: string[];
  kbs: string[];
  models: string[]; // 10 AI Model primary IDs (for backward compatibility)
  model_slots?: ModelSlotConfig[]; // 10 Model slot configurations
  history: HistoryRecord[];
  wifi_networks?: WiFiNetwork[];
}

export interface UpdateResult {
  success: boolean;
  error?: string;
  status?: number;
}

export const DEFAULT_MODEL_SLOTS: ModelSlotConfig[] = [
  { name: "Gemini 2.5 Flash", model_primary: "google/gemini-2.5-flash", model_secondary: "" },
  { name: "GPT-4o Mini", model_primary: "openai/gpt-4o-mini", model_secondary: "" },
  { name: "Claude 3.5 Haiku", model_primary: "anthropic/claude-3-5-haiku", model_secondary: "" },
  { name: "Gemini 2.0 Flash", model_primary: "google/gemini-2.0-flash-lite", model_secondary: "" },
  { name: "GPT-4o", model_primary: "openai/gpt-4o", model_secondary: "" },
  { name: "Claude 3 Haiku", model_primary: "anthropic/claude-3-haiku", model_secondary: "" },
  { name: "DeepSeek R1", model_primary: "deepseek/deepseek-r1", model_secondary: "" },
  { name: "Llama 3.3 70B", model_primary: "meta-llama/llama-3.3-70b-instruct", model_secondary: "" },
  { name: "Mistral Small", model_primary: "mistralai/mistral-small-24b-instruct-2501", model_secondary: "" },
  { name: "Qwen 2.5 Coder", model_primary: "qwen/qwen-2.5-coder-32b-instruct", model_secondary: "" }
];

export const DEFAULT_AI_SETTING: AISetting = {
  prompts: [
    "Identify the main text or formula in the image and explain it concisely.",
    "Solve the math problem step by step.",
    "Extract code from the image and format it cleanly.",
    "Translate any foreign text in the image to English.",
    "Summarize key data points shown in the chart or diagram.",
    "Check for any calculation errors in the handwritten work.",
    "Provide a high-level overview of what this image depicts.",
    "Draft a quick solution outline based on the captured diagram.",
    "Analyze the technical diagram and list key components.",
    "Explain the concept shown in simple, beginner-friendly terms."
  ],
  kbs: [
    "",
    "",
    ""
  ],
  models: DEFAULT_MODEL_SLOTS.map(s => s.model_primary),
  model_slots: DEFAULT_MODEL_SLOTS,
  history: [],
  wifi_networks: [
    {
      id: "wifi-default-1",
      ssid: "Home_WiFi",
      password: "",
      username: "",
      priority: 1
    }
  ]
};

// In-memory fallback cache for local dev or when Global Config / Edge Config API is unreachable
let localMemoryCache: AISetting = { ...DEFAULT_AI_SETTING };

/**
 * Retrieve AI Settings from Vercel Global/Edge Config with fallback to local cache/default.
 */
export async function getAISettings(): Promise<AISetting> {
  const connectionString = process.env.GLOBAL_CONFIG || process.env.EDGE_CONFIG;

  try {
    if (connectionString) {
      const client = createClient(connectionString);
      const remoteData = await client.get<AISetting>('ai_setting');
      if (remoteData) {
        // Ensure models is normalized as an array of 10 strings
        if (remoteData.models && !Array.isArray(remoteData.models)) {
          const legacyObj = remoteData.models as any;
          remoteData.models = [
            legacyObj.gemini || DEFAULT_AI_SETTING.models[0],
            legacyObj.gpt || DEFAULT_AI_SETTING.models[1],
            legacyObj.claude || DEFAULT_AI_SETTING.models[2],
            ...DEFAULT_AI_SETTING.models.slice(3)
          ];
        }

        // Ensure model_slots is normalized as 10 slot objects
        remoteData.model_slots = Array.from({ length: 10 }, (_, i) => {
          const existingSlot = remoteData.model_slots?.[i];
          const primaryModel = remoteData.models?.[i] || DEFAULT_MODEL_SLOTS[i].model_primary;
          return {
            name: existingSlot?.name || DEFAULT_MODEL_SLOTS[i].name,
            model_primary: existingSlot?.model_primary || primaryModel,
            model_secondary: existingSlot?.model_secondary || ""
          };
        });

        if (!remoteData.wifi_networks) {
          remoteData.wifi_networks = [...(DEFAULT_AI_SETTING.wifi_networks || [])];
        }
        localMemoryCache = remoteData;
        return remoteData;
      }
    }
  } catch (error) {
    console.warn("[Global Config] Error fetching 'ai_setting', using fallback:", error);
  }

  // Ensure local memory cache also has model_slots normalized
  if (!localMemoryCache.model_slots || localMemoryCache.model_slots.length < 10) {
    localMemoryCache.model_slots = Array.from({ length: 10 }, (_, i) => ({
      name: localMemoryCache.model_slots?.[i]?.name || DEFAULT_MODEL_SLOTS[i].name,
      model_primary: localMemoryCache.models?.[i] || DEFAULT_MODEL_SLOTS[i].model_primary,
      model_secondary: localMemoryCache.model_slots?.[i]?.model_secondary || ""
    }));
  }

  return localMemoryCache;
}

/**
 * Update AI Settings in Vercel Global/Edge Config via Vercel REST API, and update local cache.
 */
export async function updateAISettings(data: AISetting): Promise<UpdateResult> {
  // Normalize arrays to ensure exact element counts
  const prompts = Array.from({ length: 10 }, (_, i) => data.prompts[i] || "");
  const kbs = Array.from({ length: 3 }, (_, i) => data.kbs[i] || "");

  const model_slots: ModelSlotConfig[] = Array.from({ length: 10 }, (_, i) => {
    const slot = data.model_slots?.[i];
    const fallbackPrimary = data.models?.[i] || DEFAULT_MODEL_SLOTS[i].model_primary;
    return {
      name: slot?.name?.trim() || DEFAULT_MODEL_SLOTS[i].name,
      model_primary: slot?.model_primary?.trim() || fallbackPrimary,
      model_secondary: slot?.model_secondary?.trim() || ""
    };
  });

  const models: string[] = model_slots.map(s => s.model_primary);
  const history = (data.history || []).slice(0, 3); // Max 3 records
  const wifi_networks = (data.wifi_networks || []).sort((a, b) => a.priority - b.priority);

  const updatedSetting: AISetting = {
    prompts,
    kbs,
    models,
    model_slots,
    history,
    wifi_networks
  };

  // Instantly synchronize in-memory cache for immediate UI revalidation
  localMemoryCache = updatedSetting;

  const configId = process.env.GLOBAL_CONFIG_ID || process.env.EDGE_CONFIG_ID;
  const token = process.env.VERCEL_API_TOKEN || process.env.GLOBAL_CONFIG_TOKEN || process.env.EDGE_CONFIG_TOKEN;

  if (configId && token) {
    try {
      const res = await fetch(`https://api.vercel.com/v1/edge-config/${configId}/items`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [
            {
              operation: 'upsert',
              key: 'ai_setting',
              value: updatedSetting
            }
          ]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        let parsedErr: any = null;
        try { parsedErr = JSON.parse(errText); } catch { }
        const errorMsg = parsedErr?.error?.message || parsedErr?.error || errText || res.statusText;
        console.error(`[Global Config API Error ${res.status}]:`, errorMsg);

        let detailedHint = "";
        if (res.status === 404) {
          detailedHint = " (HTTP 404: Verify GLOBAL_CONFIG_ID / EDGE_CONFIG_ID and ensure store ID is correct)";
        }

        return {
          success: false,
          status: res.status,
          error: `Vercel Config API Error (${res.status}): ${errorMsg}${detailedHint}`
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error("[Global Config Save Exception]:", error);
      return {
        success: false,
        status: 500,
        error: `Global Config Save Exception: ${error?.message || String(error)}`
      };
    }
  }

  return { success: true };
}
