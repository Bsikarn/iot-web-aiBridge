import { NextResponse } from 'next/server';
import { getAISettings, updateAISettings, AISetting, DEFAULT_AI_SETTING, DEFAULT_MODEL_SLOTS, ModelSlotConfig, WiFiNetwork } from '@/lib/edge-config';
import { isAuthorizedBoardRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    // Allow Same-Origin, Web Dashboard, valid x-board-key, or general settings GET request
    const isAuthorized = isAuthorizedBoardRequest(req);
    
    // For GET settings, if not strictly authorized by key or origin, we still allow GET access for settings mapping
    if (!isAuthorized) {
      // Log info but permit GET settings retrieval for hardware auto-discovery / web preview
      console.info("GET /api/settings: Permitting public settings GET request");
    }

    const settings = await getAISettings();
    const wifiNetworks = (settings.wifi_networks || []).sort((a, b) => a.priority - b.priority);
    
    // Construct custom model slots mapping & dictionary for hardware auto-discovery
    const modelsDict: Record<string, string> = {};
    const modelsList: { index: number; name: string }[] = [];

    const modelSlots = Array.from({ length: 10 }, (_, i) => {
      const slot = settings.model_slots?.[i] || {
        name: DEFAULT_MODEL_SLOTS[i].name,
        model_primary: settings.models?.[i] || DEFAULT_MODEL_SLOTS[i].model_primary,
        model_secondary: ""
      };
      modelsDict[String(i + 1)] = slot.name;
      modelsList.push({
        index: i + 1,
        name: slot.name
      });
      return {
        index: i + 1,
        ...slot
      };
    });

    const slots = Array.from({ length: 10 }, (_, i) => {
      const promptText = settings.prompts?.[i] || "";
      const slotName = modelSlots[i].name;
      const customName = promptText ? promptText.slice(0, 20).trim() : `Slot #${i + 1}`;
      
      return {
        index: i + 1,
        name: customName,
        prompt: promptText,
        model: slotName
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...settings,
        model_slots: modelSlots,
        wifi_networks: wifiNetworks
      },
      slots: slots,
      models: modelsDict, // Object dictionary format { "1": "Sol+Sonnet", "2": "Claude-Ckt", ... }
      models_list: modelsList, // Array format [ { index: 1, name: "Sol+Sonnet" }, ... ]
      model_slots: modelSlots,
      wifi_networks: wifiNetworks
    });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Secret Header Authorization Check (x-board-key or Same-Origin Web Dashboard)
    if (!isAuthorizedBoardRequest(req)) {
      return NextResponse.json(
        { error: "Unauthorized API Access", status: 401 },
        { status: 401 }
      );
    }

    const token = process.env.VERCEL_API_TOKEN || process.env.GLOBAL_CONFIG_TOKEN || process.env.EDGE_CONFIG_TOKEN;
    const configId = process.env.GLOBAL_CONFIG_ID || process.env.EDGE_CONFIG_ID;

    // Check for required Vercel Global/Edge Config environment variables
    if (!token || !configId) {
      console.error("POST /api/settings error: Missing VERCEL_API_TOKEN or GLOBAL_CONFIG_ID / EDGE_CONFIG_ID");
      return NextResponse.json(
        { error: "Missing required environment variable: VERCEL_API_TOKEN, GLOBAL_CONFIG_TOKEN, or GLOBAL_CONFIG_ID / EDGE_CONFIG_ID" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const currentSettings = await getAISettings();

    const newPrompts = Array.isArray(body.prompts) ? body.prompts : currentSettings.prompts;
    const newKbs = Array.isArray(body.kbs) ? body.kbs : currentSettings.kbs;
    
    let newModelSlots = Array.isArray(body.model_slots)
      ? Array.from({ length: 10 }, (_, i) => ({
          name: body.model_slots[i]?.name || DEFAULT_MODEL_SLOTS[i].name,
          model_primary: body.model_slots[i]?.model_primary || DEFAULT_MODEL_SLOTS[i].model_primary,
          model_secondary: body.model_slots[i]?.model_secondary || ""
        }))
      : Array.isArray(body.models)
      ? Array.from({ length: 10 }, (_, i) => ({
          name: currentSettings.model_slots?.[i]?.name || DEFAULT_MODEL_SLOTS[i].name,
          model_primary: body.models[i] || currentSettings.models[i] || DEFAULT_MODEL_SLOTS[i].model_primary,
          model_secondary: currentSettings.model_slots?.[i]?.model_secondary || ""
        }))
      : (currentSettings.model_slots || DEFAULT_MODEL_SLOTS);

    const newModels = newModelSlots.map((s: ModelSlotConfig) => s.model_primary);

    const newWifiNetworks: WiFiNetwork[] = Array.isArray(body.wifi_networks)
      ? body.wifi_networks
      : (currentSettings.wifi_networks || []);

    const updatedSettings: AISetting = {
      prompts: newPrompts,
      kbs: newKbs,
      models: newModels,
      model_slots: newModelSlots,
      history: currentSettings.history || [],
      wifi_networks: newWifiNetworks
    };

    const result = await updateAISettings(updatedSettings);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update Vercel Config" },
        { status: result.status || 500 }
      );
    }
    
    return NextResponse.json({ success: true, data: updatedSettings });
  } catch (error: any) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred while updating settings" },
      { status: 500 }
    );
  }
}