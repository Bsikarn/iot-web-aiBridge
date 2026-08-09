import { get } from '@vercel/edge-config';

export interface HistoryRecord {
  timestamp: string;
  provider?: string;
  model: string;
  promptIndex: number;
  kbIndex: number;
  aiResponse: string;
  imageUrl: string;
}

export interface AISetting {
  prompts: string[];
  kbs: string[];
  models: string[]; // 10 AI Model slots (Model Slot #1 to #10)
  history: HistoryRecord[];
}

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
  models: [
    "google/gemini-2.5-flash",
    "openai/gpt-4o-mini",
    "anthropic/claude-3-5-haiku",
    "google/gemini-2.0-flash-lite",
    "openai/gpt-4o",
    "anthropic/claude-3-haiku",
    "deepseek/deepseek-r1",
    "meta-llama/llama-3.3-70b-instruct",
    "mistralai/mistral-small-24b-instruct-2501",
    "qwen/qwen-2.5-coder-32b-instruct"
  ],
  history: []
};

// In-memory fallback cache for local dev or when Edge Config API is unreachable
let localMemoryCache: AISetting = { ...DEFAULT_AI_SETTING };

/**
 * Retrieve AI Settings from Vercel Edge Config with fallback to local cache/default.
 */
export async function getAISettings(): Promise<AISetting> {
  try {
    if (process.env.EDGE_CONFIG) {
      const remoteData = await get<AISetting>('ai_setting');
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
        localMemoryCache = remoteData;
        return remoteData;
      }
    }
  } catch (error) {
    console.warn("[Edge Config] Error fetching 'ai_setting', using fallback:", error);
  }

  return localMemoryCache;
}

/**
 * Update AI Settings in Vercel Edge Config via Vercel REST API, and update local cache.
 */
export async function updateAISettings(data: AISetting): Promise<boolean> {
  // Normalize arrays to ensure exact element counts
  const prompts = Array.from({ length: 10 }, (_, i) => data.prompts[i] || "");
  const kbs = Array.from({ length: 3 }, (_, i) => data.kbs[i] || "");
  
  let models: string[] = [];
  if (Array.isArray(data.models)) {
    models = Array.from({ length: 10 }, (_, i) => data.models[i] || DEFAULT_AI_SETTING.models[i] || "");
  } else if (data.models && typeof data.models === 'object') {
    const legacy = data.models as any;
    models = [
      legacy.gemini || DEFAULT_AI_SETTING.models[0],
      legacy.gpt || DEFAULT_AI_SETTING.models[1],
      legacy.claude || DEFAULT_AI_SETTING.models[2],
      ...DEFAULT_AI_SETTING.models.slice(3)
    ];
  } else {
    models = [...DEFAULT_AI_SETTING.models];
  }

  const history = (data.history || []).slice(0, 3); // Max 3 records

  const updatedSetting: AISetting = {
    prompts,
    kbs,
    models,
    history
  };

  localMemoryCache = updatedSetting;

  const edgeConfigId = process.env.EDGE_CONFIG_ID;
  const token = process.env.VERCEL_API_TOKEN || process.env.EDGE_CONFIG_TOKEN;

  if (edgeConfigId && token) {
    try {
      const res = await fetch(`https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`, {
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
        console.error("[Edge Config API Error]:", errText);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[Edge Config Save Exception]:", error);
      return false;
    }
  }

  return true;
}
