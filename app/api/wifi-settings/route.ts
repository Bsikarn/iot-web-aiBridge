import { NextResponse } from 'next/server';
import { getAISettings, updateAISettings, WiFiNetwork } from '@/lib/edge-config';
import { isAuthorizedBoardRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/wifi-settings
 * Returns sorted list of Wi-Fi profiles based on priority for hardware board sync (Raspberry Pi).
 */
export async function GET(req: Request) {
  try {
    // Secret Header Authorization Check (x-board-key)
    if (!isAuthorizedBoardRequest(req)) {
      return NextResponse.json(
        { error: "Unauthorized API Access", status: 401 },
        { status: 401 }
      );
    }

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
 * Save, add, update, or reorder Wi-Fi profiles with flexible request body parsing.
 */
export async function POST(req: Request) {
  try {
    // Secret Header Authorization Check (x-board-key)
    if (!isAuthorizedBoardRequest(req)) {
      return NextResponse.json(
        { error: "Unauthorized API Access", status: 401 },
        { status: 401 }
      );
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.warn("POST /api/wifi-settings: Invalid JSON body:", parseErr);
      return NextResponse.json({
        success: false,
        error: "Invalid JSON request body"
      }, { status: 400 });
    }

    const settings = await getAISettings();
    const currentNetworks = settings.wifi_networks || [];

    // Extract Wi-Fi list from array directly or common object keys (wifi_networks, networks, wifi, profiles, data)
    let rawList: any[] = [];

    if (Array.isArray(body)) {
      rawList = body;
    } else if (typeof body === 'object' && body !== null) {
      if (Array.isArray(body.wifi_networks)) {
        rawList = body.wifi_networks;
      } else if (Array.isArray(body.networks)) {
        rawList = body.networks;
      } else if (Array.isArray(body.wifi)) {
        rawList = body.wifi;
      } else if (Array.isArray(body.profiles)) {
        rawList = body.profiles;
      } else if (Array.isArray(body.data)) {
        rawList = body.data;
      } else if (body.ssid || body.name || body.SSID) {
        // Single Wi-Fi network object
        rawList = [body];
      }
    }

    // Permissive sanitization mapping for Wi-Fi profiles
    const sanitized: WiFiNetwork[] = rawList.map((item: any, index: number) => {
      const ssid = String(item.ssid || item.name || item.SSID || '').trim();
      const password = String(item.password || item.pass || item.psk || item.key || '');
      const username = String(item.username || item.user || '').trim();
      const priority = typeof item.priority === 'number' ? item.priority : (index + 1);
      const id = String(item.id || `wifi_${index + 1}_${Date.now()}`);

      return {
        id,
        ssid,
        password,
        username,
        priority
      };
    }).filter((item: WiFiNetwork) => item.ssid.length > 0);

    let updatedNetworks: WiFiNetwork[] = [];

    if (sanitized.length > 0) {
      if (
        Array.isArray(body) ||
        Array.isArray(body.wifi_networks) ||
        Array.isArray(body.networks) ||
        Array.isArray(body.wifi) ||
        Array.isArray(body.profiles) ||
        Array.isArray(body.data)
      ) {
        // Full array replacement / reorder
        updatedNetworks = sanitized;
      } else {
        // Single network insert/update
        const newNet = sanitized[0];
        const existingIdx = currentNetworks.findIndex(
          n => n.id === newNet.id || n.ssid.toLowerCase() === newNet.ssid.toLowerCase()
        );
        if (existingIdx >= 0) {
          currentNetworks[existingIdx] = newNet;
          updatedNetworks = [...currentNetworks];
        } else {
          updatedNetworks = [...currentNetworks, newNet];
        }
      }
    } else {
      // If no valid Wi-Fi items parsed, retain existing networks without throwing HTTP 400
      updatedNetworks = currentNetworks;
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
      count: updatedNetworks.length,
      total_count: updatedNetworks.length,
      message: "Wi-Fi settings updated successfully",
      wifi_networks: updatedNetworks
    }, { status: 200 });

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
    // Secret Header Authorization Check (x-board-key)
    if (!isAuthorizedBoardRequest(req)) {
      return NextResponse.json(
        { error: "Unauthorized API Access", status: 401 },
        { status: 401 }
      );
    }

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
      count: updatedNetworks.length,
      total_count: updatedNetworks.length,
      message: "Wi-Fi network deleted successfully",
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
