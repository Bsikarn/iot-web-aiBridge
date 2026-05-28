// app/wifi/page.tsx
"use client";
import { useState, useEffect, useRef } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

type WifiEntry = { ssid: string; password: string };

export default function WifiManager() {
  const [list, setList] = useState<WifiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rawOutput, setRawOutput] = useState<string | null>(null);
  const [visiblePass, setVisiblePass] = useState<Set<string>>(new Set());

  // Form refs — no need for controlled state on a simple static form
  const ssidRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  // Load the WiFi list by fetching the plain-text output then re-parsing it
  const loadList = async () => {
    setLoading(true);
    const res = await fetch('/api/wifi-sync');
    const text = await res.text();

    setRawOutput(text);

    // Parse "SSID,PASS|SSID2,PASS2" back into an array for the UI
    if (text.trim() === '') {
      setList([]);
    } else {
      const parsed: WifiEntry[] = text.split('|').map(pair => {
        const commaIdx = pair.indexOf(',');
        return {
          ssid: pair.slice(0, commaIdx),
          password: pair.slice(commaIdx + 1),
        };
      });
      setList(parsed);
    }
    setLoading(false);
  };

  useEffect(() => { loadList(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const ssid = ssidRef.current?.value.trim() ?? '';
    const password = passRef.current?.value ?? '';

    if (!ssid) return;
    setSubmitting(true);

    const res = await fetch('/api/wifi-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || 'เกิดข้อผิดพลาด');
    } else {
      // Reset form and reload
      if (ssidRef.current) ssidRef.current.value = '';
      if (passRef.current) passRef.current.value = '';
      await loadList();
    }
    setSubmitting(false);
  };

  const handleDelete = async (ssid: string) => {
    if (!confirm(`ลบ "${ssid}" ออกจากรายการ?`)) return;
    setDeleting(ssid);

    await fetch('/api/wifi-sync', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid }),
    });

    await loadList();
    setDeleting(null);
  };

  const togglePassVisibility = (ssid: string) => {
    setVisiblePass(prev => {
      const next = new Set(prev);
      if (next.has(ssid)) next.delete(ssid); else next.add(ssid);
      return next;
    });
  };

  return (
    <div className={`min-h-screen bg-[#F0F7FF] p-6 text-slate-800 ${inter.className}`}>
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex justify-between items-end border-b-2 border-[#A3D8F4] pb-4">
          <div>
            <h1 className="text-3xl font-black text-[#0D6EFD] tracking-tight">
              WIFI <span className="font-light">MANAGER</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">จัดการ WiFi Credentials สำหรับ ESP32</p>
          </div>
          <a
            href="/"
            className="text-[10px] font-bold text-[#0D6EFD] bg-[#A3D8F4]/30 hover:bg-[#A3D8F4]/60 px-3 py-1 rounded-full transition-colors"
          >
            ← HQ
          </a>
        </header>

        {/* Add form */}
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-2xl border-2 border-[#0D6EFD] p-5 shadow-[0_8px_30px_rgb(13,110,253,0.08)] space-y-4"
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            เพิ่ม WiFi Network ใหม่
          </p>

          <div className="grid gap-3">
            <input
              ref={ssidRef}
              id="wifi-ssid"
              type="text"
              placeholder="ชื่อ WiFi (SSID)"
              required
              autoComplete="off"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#A3D8F4] focus:ring-4 focus:ring-[#A3D8F4]/20 transition-all placeholder:text-slate-300"
            />
            <input
              ref={passRef}
              id="wifi-password"
              type="text"
              placeholder="รหัสผ่าน (Password)"
              autoComplete="off"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#A3D8F4] focus:ring-4 focus:ring-[#A3D8F4]/20 transition-all placeholder:text-slate-300 font-mono"
            />
          </div>

          <button
            id="btn-add-wifi"
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#0D6EFD] text-white font-bold text-sm rounded-xl shadow-md shadow-[#0D6EFD]/20 hover:bg-[#0B5ED7] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'กำลังบันทึก...' : '+ เพิ่ม WiFi'}
          </button>
        </form>

        {/* WiFi List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              รายการ WiFi ({list.length})
            </p>
            <a
              href="/api/wifi-sync"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono text-[#0D6EFD] hover:underline"
            >
              ดู ESP32 Output →
            </a>
          </div>

          {loading ? (
            <div className="text-center text-sm text-[#0D6EFD] animate-pulse py-8">
              กำลังโหลด...
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10 text-slate-300 text-sm">
              ยังไม่มี WiFi ในรายการ
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((entry, idx) => (
                <div
                  key={entry.ssid}
                  className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.03)] p-4 flex items-center gap-4 hover:shadow-[0_4px_15px_rgb(13,110,253,0.05)] transition-all"
                >
                  {/* Index badge */}
                  <span className="text-[10px] font-black text-[#0D6EFD] bg-[#A3D8F4]/20 w-6 h-6 flex items-center justify-center rounded-md flex-shrink-0">
                    {idx + 1}
                  </span>

                  {/* SSID + Password */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{entry.ssid}</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {visiblePass.has(entry.ssid) ? entry.password : '••••••••'}
                    </p>
                  </div>

                  {/* Toggle password visibility */}
                  <button
                    onClick={() => togglePassVisibility(entry.ssid)}
                    className="text-slate-300 hover:text-slate-500 transition-colors p-1 flex-shrink-0"
                    title="แสดง/ซ่อน password"
                  >
                    {visiblePass.has(entry.ssid) ? (
                      // Eye-off icon
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      // Eye icon
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(entry.ssid)}
                    disabled={deleting === entry.ssid}
                    className="text-red-300 hover:text-red-500 transition-colors p-1 flex-shrink-0 disabled:opacity-40"
                    title="ลบ WiFi นี้"
                  >
                    {deleting === entry.ssid ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Raw ESP32 Output preview */}
        {rawOutput !== null && (
          <div className="bg-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              ESP32 Raw Output Preview
            </p>
            <p className="font-mono text-xs text-emerald-400 break-all leading-relaxed">
              {rawOutput === '' ? <span className="text-slate-500">(empty)</span> : rawOutput}
            </p>
          </div>
        )}

        <p className="text-center text-[10px] font-medium text-slate-400 tracking-widest pb-4">
          WIFI SYNC // ESP32 READY
        </p>
      </div>
    </div>
  );
}
