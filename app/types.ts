// Shared type definitions for the AI Bridge Dashboard UI.
// Re-exports core interfaces from lib/edge-config so the client side
// does NOT need to import server-only code directly.

export interface HistoryRecord {
  timestamp: string;
  provider?: string;
  model: string;
  promptIndex: number;
  kbIndex: number;
  aiResponse: string;
  imageUrl: string;
}

export interface WiFiNetwork {
  id: string;
  ssid: string;
  password: string;
  username?: string;
  priority: number;
}

export interface ModelSlotConfig {
  name: string;
  model_primary: string;
  model_secondary?: string;
}

export interface AISetting {
  prompts: string[];
  kbs: string[];
  models: string[];
  model_slots?: ModelSlotConfig[];
  history: HistoryRecord[];
  wifi_networks?: WiFiNetwork[];
}

// Default model list used for ordering and preset resets
export const PRESET_MODELS = [
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
];

// Default slot configurations that map 1-to-1 with PRESET_MODELS
export const DEFAULT_SLOTS: ModelSlotConfig[] = [
  { name: "Gemini 2.5 Flash",  model_primary: "google/gemini-2.5-flash",                        model_secondary: "" },
  { name: "GPT-4o Mini",       model_primary: "openai/gpt-4o-mini",                              model_secondary: "" },
  { name: "Claude 3.5 Haiku",  model_primary: "anthropic/claude-3-5-haiku",                      model_secondary: "" },
  { name: "Gemini 2.0 Flash",  model_primary: "google/gemini-2.0-flash-lite",                    model_secondary: "" },
  { name: "GPT-4o",            model_primary: "openai/gpt-4o",                                   model_secondary: "" },
  { name: "Claude 3 Haiku",    model_primary: "anthropic/claude-3-haiku",                        model_secondary: "" },
  { name: "DeepSeek R1",       model_primary: "deepseek/deepseek-r1",                            model_secondary: "" },
  { name: "Llama 3.3 70B",     model_primary: "meta-llama/llama-3.3-70b-instruct",               model_secondary: "" },
  { name: "Mistral Small",     model_primary: "mistralai/mistral-small-24b-instruct-2501",        model_secondary: "" },
  { name: "Qwen 2.5 Coder",    model_primary: "qwen/qwen-2.5-coder-32b-instruct",                model_secondary: "" },
];
