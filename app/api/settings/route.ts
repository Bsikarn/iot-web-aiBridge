import { NextResponse } from 'next/server';
import { getAISettings, updateAISettings, AISetting, DEFAULT_AI_SETTING } from '@/lib/edge-config';

export async function GET() {
  try {
    const settings = await getAISettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentSettings = await getAISettings();

    const newPrompts = Array.isArray(body.prompts) ? body.prompts : currentSettings.prompts;
    const newKbs = Array.isArray(body.kbs) ? body.kbs : currentSettings.kbs;
    
    let newModels: string[] = [];
    if (Array.isArray(body.models)) {
      newModels = Array.from({ length: 10 }, (_, i) => body.models[i] || currentSettings.models[i] || DEFAULT_AI_SETTING.models[i]);
    } else if (body.models && typeof body.models === 'object') {
      // Legacy conversion fallback
      newModels = [
        body.models.gemini || currentSettings.models[0] || DEFAULT_AI_SETTING.models[0],
        body.models.gpt || currentSettings.models[1] || DEFAULT_AI_SETTING.models[1],
        body.models.claude || currentSettings.models[2] || DEFAULT_AI_SETTING.models[2],
        ...currentSettings.models.slice(3)
      ];
    } else {
      newModels = currentSettings.models;
    }

    const updatedSettings: AISetting = {
      prompts: newPrompts,
      kbs: newKbs,
      models: newModels,
      history: currentSettings.history || []
    };

    const success = await updateAISettings(updatedSettings);
    
    return NextResponse.json({ success, data: updatedSettings });
  } catch (error: any) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}