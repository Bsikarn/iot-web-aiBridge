// lib/store.ts
export interface Preset {
  id: number;
  name: string;
  prompt: string;
  context: string;
  models: Record<string, string>;
}

export const presetsStore = {
  activeSlot: 0,
  data: Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: `Slot ${i + 1}`,
    prompt: "จงแก้โจทย์จากภาพนี้",
    context: "",
    models: {
      gemini: "google/gemini-flash-1.5",
      gpt: "openai/gpt-4o-mini",
      claude: "anthropic/claude-3-haiku",
    }
  })) as Preset[]
};