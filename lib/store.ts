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
    prompt: "เห็นภาพไหม ถ้าเห็นตอบแค่ 'เห็น'", // แอบตั้ง Default ตามที่นายพิมพ์เทสไว้เลย
    context: "",
    models: {
      // --- แก้ชื่อโมเดลตรงนี้ให้เป็นรุ่นฟรีถาวร ---
      gemini: "google/gemini-2.0-flash:free",
      gpt: "meta-llama/llama-3.2-3b-instruct:free",
      claude: "mistralai/mistral-7b-instruct:free",
    }
  })) as Preset[]
};