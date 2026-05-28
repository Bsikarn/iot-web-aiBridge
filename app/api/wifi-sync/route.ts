// app/api/wifi-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Path to the local JSON data store
const DATA_FILE = path.join(process.cwd(), 'data', 'wifi-credentials.json');

type WifiEntry = { ssid: string; password: string };

// Helper: read credentials from disk
function readCredentials(): WifiEntry[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as WifiEntry[];
  } catch {
    return [];
  }
}

// Helper: write credentials to disk
function writeCredentials(list: WifiEntry[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// GET /api/wifi-sync
// Returns credentials as plain-text delimited string for the ESP32 to parse.
// Format: SSID1,PASS1|SSID2,PASS2
export async function GET() {
  const list = readCredentials();

  // Build the exact plain-text format: SSID,PASS separated by pipe — no spaces
  const payload = list
    .filter(entry => entry.ssid.trim() !== '')
    .map(entry => `${entry.ssid},${entry.password}`)
    .join('|');

  return new NextResponse(payload, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// POST /api/wifi-sync
// Body: { ssid: string, password: string }
// Adds a new WiFi entry (rejects duplicates by SSID).
export async function POST(req: NextRequest) {
  const body = await req.json() as WifiEntry;

  if (!body.ssid || body.ssid.trim() === '') {
    return NextResponse.json({ error: 'SSID is required' }, { status: 400 });
  }

  const list = readCredentials();

  // Prevent duplicate SSIDs
  if (list.some(e => e.ssid === body.ssid.trim())) {
    return NextResponse.json({ error: 'SSID already exists' }, { status: 409 });
  }

  list.push({ ssid: body.ssid.trim(), password: body.password });
  writeCredentials(list);

  return NextResponse.json({ ok: true, total: list.length });
}

// DELETE /api/wifi-sync
// Body: { ssid: string }
// Removes a WiFi entry by SSID name.
export async function DELETE(req: NextRequest) {
  const body = await req.json() as { ssid: string };

  if (!body.ssid) {
    return NextResponse.json({ error: 'SSID is required' }, { status: 400 });
  }

  const list = readCredentials();
  const filtered = list.filter(e => e.ssid !== body.ssid);

  if (filtered.length === list.length) {
    return NextResponse.json({ error: 'SSID not found' }, { status: 404 });
  }

  writeCredentials(filtered);
  return NextResponse.json({ ok: true, total: filtered.length });
}
