import { NextResponse } from 'next/server';
import { getAISettings, updateAISettings, WiFiNetwork } from '@/lib/edge-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/wifi-settings
 * Returns sorted list of Wi-Fi profiles based on priority for hardware board sync (Raspberry Pi).
 */
export async function GET() {
  try {
    const settings = await getAISettings();
    const wifiNetworks = (settings.wifi_networks || []).sort((a, b) => a.priority - b.priority);

    return NextResponse.json({
      success: true,
      total_count: wifiNetworks.length,
      wifi_networks: wifiNetworks
    });
  } catch (error: any) {
    console.error("GET /api/wifi-settings error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to fetch Wi-Fi settings"
    }, { status: 500 });
  }
}

/**
 * POST /api/wifi-settings
 * Save, add, update, or reorder Wi-Fi profiles.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const settings = await getAISettings();

    let updatedNetworks: WiFiNetwork[] = [];

    if (Array.isArray(body.wifi_networks)) {
      // Bulk update / reorder full array
      updatedNetworks = body.wifi_networks.map((net: any, idx: number) => ({
        id: net.id || `wifi-${Date.now()}-${idx}`,
        ssid: String(net.ssid || "").trim(),
        password: String(net.password || ""),
        username: String(net.username || "").trim(),
        priority: typeof net.priority === 'number' ? net.priority : idx + 1
      })).filter((net: WiFiNetwork) => net.ssid.length > 0);
    } else if (body.ssid) {
      // Add single Wi-Fi network profile
      const current = settings.wifi_networks || [];
      const newNet: WiFiNetwork = {
        id: body.id || `wifi-${Date.now()}`,
        ssid: String(body.ssid).trim(),
        password: String(body.password || ""),
        username: String(body.username || "").trim(),
        priority: typeof body.priority === 'number' ? body.priority : current.length + 1
      };
      
      // Update existing if SSID matches, otherwise append
      const existingIdx = current.findIndex(n => n.id === newNet.id || n.ssid.toLowerCase() === newNet.ssid.toLowerCase());
      if (existingIdx >= 0) {
        current[existingIdx] = newNet;
        updatedNetworks = [...current];
      } else {
        updatedNetworks = [...current, newNet];
      }
    } else {
      return NextResponse.json({
        success: false,
        error: "Payload must contain wifi_networks array or single ssid object"
      }, { status: 400 });
    }

    // Sort by priority ascending
    updatedNetworks.sort((a, b) => a.priority - b.priority);

    const updatedSettings = {
      ...settings,
      wifi_networks: updatedNetworks
    };

    const result = await updateAISettings(updatedSettings);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to update Wi-Fi settings"
      }, { status: result.status || 500 });
    }

    return NextResponse.json({
      success: true,
      total_count: updatedNetworks.length,
      wifi_networks: updatedNetworks
    });

  } catch (error: any) {
    console.error("POST /api/wifi-settings error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred while updating Wi-Fi settings"
    }, { status: 500 });
  }
}

/**
 * DELETE /api/wifi-settings
 * Delete a Wi-Fi profile by id or ssid.
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const ssid = searchParams.get('ssid');

    if (!id && !ssid) {
      return NextResponse.json({
        success: false,
        error: "Missing required query parameter: id or ssid"
      }, { status: 400 });
    }

    const settings = await getAISettings();
    const current = settings.wifi_networks || [];

    const updatedNetworks = current.filter(net => {
      if (id && net.id === id) return false;
      if (ssid && net.ssid.toLowerCase() === ssid.toLowerCase()) return false;
      return true;
    });

    const updatedSettings = {
      ...settings,
      wifi_networks: updatedNetworks
    };

    const result = await updateAISettings(updatedSettings);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || "Failed to delete Wi-Fi network"
      }, { status: result.status || 500 });
    }

    return NextResponse.json({
      success: true,
      total_count: updatedNetworks.length,
      wifi_networks: updatedNetworks
    });

  } catch (error: any) {
    console.error("DELETE /api/wifi-settings error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to delete Wi-Fi network"
    }, { status: 500 });
  }
}
