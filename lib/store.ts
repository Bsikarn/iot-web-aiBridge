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
      gemini: "openrouter/free",
      gpt: "openrouter/free",
      claude: "openrouter/free",
    }
  })) as Preset[]
};