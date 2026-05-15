import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let slots = await prisma.slot.findMany({
      orderBy: { slotIndex: 'asc' }
    });

    if (slots.length === 0) {
      // Create default 3 slots
      const defaultSlots = Array.from({ length: 3 }, (_, i) => ({
        slotIndex: i,
        isActive: i === 0, // Slot แรกเป็น active by default
        name: `Slot ${i + 1}`,
        prompt: "เห็นภาพไหม ถ้าเห็นตอบแค่ 'เห็น'",
        context: "",
        history: "",
        models: {
          gemini: "openrouter/free",
          gpt: "openrouter/free",
          claude: "openrouter/free",
        }
      }));

      await prisma.slot.createMany({ data: defaultSlots });
      slots = await prisma.slot.findMany({
        orderBy: { slotIndex: 'asc' }
      });
    }

    // หาว่า slot ไหนกำลัง active อยู่
    const activeSlotItem = slots.find(s => s.isActive);
    const activeSlot = activeSlotItem ? activeSlotItem.slotIndex : 0;

    return NextResponse.json({ activeSlot, data: slots });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { activeSlot, data } = body;
    
    if (data && Array.isArray(data)) {
      for (const slot of data) {
        if (slot.id) {
          // อัปเดตข้อมูลของ slot และเซ็ต isActive ให้ตรงกับ activeSlot ที่ส่งมา
          await prisma.slot.update({
            where: { id: slot.id },
            data: {
              isActive: slot.slotIndex === activeSlot,
              name: slot.name,
              prompt: slot.prompt,
              context: slot.context,
              models: slot.models,
              history: slot.history || "",
            }
          });
        }
      }
    }
    
    return NextResponse.json({ success: true, activeSlot });
  } catch (error) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}