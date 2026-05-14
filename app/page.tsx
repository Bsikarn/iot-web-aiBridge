// app/page.tsx
"use client";
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [state, setState] = useState({ activeSlot: 0, data: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false); // เพิ่ม State สำหรับจัดการ UI ตอนอัปโหลด

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(d => {
      setState(d);
      setLoading(false);
    });
  }, []);

  const save = async (newData: any) => {
    setState(newData);
    await fetch('/api/settings', { method: 'POST', body: JSON.stringify(newData) });
  };

  // ฟังก์ชันอัปโหลดแบบใหม่ ยิงไปหา API ให้ช่วยแกะ PDF
  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();

    // ยัดทุกไฟล์ที่เลือกใส่ FormData
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.text) {
        const d = [...state.data];
        d[index].context = data.text; // แทนที่ความรู้เดิมด้วยไฟล์ที่อัปโหลดใหม่
        await save({ ...state, data: d });
        alert(`[Slot ${index + 1}] สกัดความรู้สำเร็จ!\nอ่านไฟล์ได้ทั้งหมด: ${data.text.length} ตัวอักษร`);
      } else {
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้งครับ");
    } finally {
      setIsUploading(false);
      e.target.value = ''; // เคลียร์ช่อง input ให้เลือกไฟล์เดิมซ้ำได้
    }
  };

  if (loading) return <div className="p-10 text-center font-mono text-[#0D6EFD]">INITIALIZING HQ...</div>;

  return (
    <div className="min-h-screen bg-[#F0F7FF] p-6 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto space-y-6">

        <header className="flex justify-between items-end border-b-2 border-[#A3D8F4] pb-4">
          <h1 className="text-3xl font-black text-[#0D6EFD]">STEALTH <span className="font-light">HQ</span></h1>
          <span className="text-xs font-bold text-blue-400">OPENROUTER BRIDGE ACTIVE</span>
        </header>

        <div className="grid gap-4">
          {state.data.map((slot, idx) => (
            <div key={slot.id} className={`p-5 rounded-2xl border-2 transition-all ${state.activeSlot === idx ? 'bg-white border-[#0D6EFD] shadow-lg' : 'bg-white/50 border-transparent opacity-70'}`}>
              <div className="flex justify-between items-center mb-4">
                <input
                  className="font-bold bg-transparent outline-none focus:border-b border-blue-300 w-1/2"
                  value={slot.name}
                  onChange={e => {
                    const d = [...state.data]; d[idx].name = e.target.value;
                    save({ ...state, data: d });
                  }}
                />
                <button
                  onClick={() => save({ ...state, activeSlot: idx })}
                  className={`px-6 py-2 rounded-full text-xs font-black transition-all ${state.activeSlot === idx ? 'bg-[#0D6EFD] text-white' : 'bg-[#A3D8F4] text-[#0D6EFD]'}`}
                >
                  {state.activeSlot === idx ? 'ACTIVE' : 'SELECT'}
                </button>
              </div>

              <div className="space-y-4">
                {/* 1. ช่องใส่ Prompt หลัก */}
                <div>
                  <textarea
                    className="w-full p-3 bg-slate-50 border border-blue-50 rounded-xl text-sm outline-none focus:ring-2 ring-blue-100 min-h-[80px]"
                    placeholder="System Prompt..."
                    value={slot.prompt}
                    onChange={e => {
                      const d = [...state.data]; d[idx].prompt = e.target.value;
                      save({ ...state, data: d });
                    }}
                  />
                </div>

                {/* 2. พระเอกของเรา: ปุ่มอัปโหลดไฟล์ (อัปเกรดให้รับ PDF และหลายไฟล์ได้) */}
                <div className="bg-slate-50 p-3 border border-blue-50 rounded-xl">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">
                    Knowledge Base (แนบไฟล์ .txt, .pdf ได้หลายไฟล์)
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="file"
                      accept=".txt,.pdf"
                      multiple // เปิดโหมดให้เลือกหลายไฟล์พร้อมกัน
                      disabled={isUploading}
                      onChange={(e) => handleFileUpload(idx, e)}
                      className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#0D6EFD] file:text-white hover:file:bg-blue-600 cursor-pointer w-full sm:w-auto disabled:opacity-50"
                    />

                    {/* UI โชว์สถานะอัปโหลด */}
                    {isUploading ? (
                      <span className="text-[10px] font-bold text-blue-500 animate-pulse">กำลังสกัดความรู้...</span>
                    ) : (
                      <span className="text-[10px] font-bold">
                        {slot.context && slot.context.length > 0
                          ? <span className="text-green-500">✅ มีข้อมูลในสมองแล้ว ({slot.context.length} chars)</span>
                          : <span className="text-red-400">❌ ยังไม่มีข้อมูล</span>}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. ช่องเลือกโมเดล 3 ค่าย */}
                <div className="grid grid-cols-3 gap-2">
                  {Object.keys(slot.models).map(provider => (
                    <div key={provider} className="flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{provider}</label>
                      <input
                        className="p-2 text-[10px] bg-white border border-blue-50 rounded-lg outline-none"
                        value={slot.models[provider]}
                        onChange={e => {
                          const d = [...state.data]; d[idx].models[provider] = e.target.value;
                          save({ ...state, data: d });
                        }}
                      />
                    </div>
                  ))}
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center mt-10 text-[10px] text-slate-300">DASHBOARD V2.0 // PDF PARSER ENABLED</p>
    </div>
  );
}