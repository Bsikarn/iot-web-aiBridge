import { NextResponse } from 'next/server';
import { presetsStore } from '@/lib/store';

export async function GET() {
  return NextResponse.json(presetsStore);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { activeSlot, data } = body;
  
  if (typeof activeSlot === 'number') presetsStore.activeSlot = activeSlot;
  if (data) presetsStore.data = data;
  
  return NextResponse.json({ success: true });
}