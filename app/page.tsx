// app/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function Dashboard() {
  const [state, setState] = useState({ activeSlot: 0, data: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(d => {
        setState(d);
        setLoading(false);
      });
  }, []);

  const save = async (newData: any) => {
    setState(newData);
    await fetch('/api/settings', { method: 'POST', body: JSON.stringify(newData) });
  };

  const handleFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(prev => ({ ...prev, [index]: true }));
    const formData = new FormData();

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
        // APPEND the new parsed text to the existing context
        d[index].context = (d[index].context || "") + data.text;
        
        await save({ ...state, data: d });
        alert(`[Slot ${index + 1}] ความรู้ถูกเพิ่มเข้าสู่สมองแล้ว!\nสกัดมาได้: ${data.text.length} ตัวอักษร`);
      } else {
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsUploading(prev => ({ ...prev, [index]: false }));
      e.target.value = ''; // Reset input
    }
  };

  const clearKnowledgeBase = async (index: number) => {
    if (confirm(`คุณต้องการลบข้อมูลความรู้ใน Slot ${index + 1} ใช่หรือไม่?`)) {
      const d = [...state.data];
      d[index].context = ""; // Clear context
      await save({ ...state, data: d });
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-[#F0F7FF] ${inter.className}`}>
        <div className="font-medium text-[#0D6EFD] animate-pulse">INITIALIZING HQ...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F0F7FF] p-6 text-slate-800 ${inter.className}`}>
      <div className="max-w-3xl mx-auto space-y-6">

        <header className="flex justify-between items-end border-b-2 border-[#A3D8F4] pb-4">
          <h1 className="text-3xl font-black text-[#0D6EFD] tracking-tight">STEALTH <span className="font-light">HQ</span></h1>
          <span className="text-[10px] font-bold text-[#0D6EFD] bg-[#A3D8F4]/30 px-3 py-1 rounded-full">OPENROUTER BRIDGE</span>
        </header>

        <div className="grid gap-5">
          {state.data.map((slot, idx) => (
            <div 
              key={slot.id || idx} 
              className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
                state.activeSlot === idx 
                  ? 'bg-white border-[#0D6EFD] shadow-[0_8px_30px_rgb(13,110,253,0.12)]' 
                  : 'bg-white/60 border-transparent hover:bg-white/90 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-center mb-5">
                <input
                  className="font-semibold text-lg bg-transparent outline-none border-b border-transparent focus:border-[#A3D8F4] transition-colors w-1/2 text-slate-700"
                  value={slot.name}
                  onChange={e => {
                    const d = [...state.data]; d[idx].name = e.target.value;
                    save({ ...state, data: d });
                  }}
                />
                <button
                  onClick={() => save({ ...state, activeSlot: idx })}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    state.activeSlot === idx 
                      ? 'bg-[#0D6EFD] text-white shadow-md shadow-[#0D6EFD]/20' 
                      : 'bg-[#F0F7FF] text-[#0D6EFD] hover:bg-[#A3D8F4]/40 border border-[#A3D8F4]'
                  }`}
                >
                  {state.activeSlot === idx ? 'ACTIVE' : 'SELECT'}
                </button>
              </div>

              <div className="space-y-5">
                {/* 1. Prompt */}
                <div>
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 ml-1">
                    System Prompt
                  </label>
                  <textarea
                    className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#A3D8F4] focus:ring-4 focus:ring-[#A3D8F4]/20 min-h-[80px] transition-all resize-none"
                    placeholder="Enter instructions for the AI..."
                    value={slot.prompt}
                    onChange={e => {
                      const d = [...state.data]; d[idx].prompt = e.target.value;
                      save({ ...state, data: d });
                    }}
                  />
                </div>

                {/* 2. Knowledge Base */}
                <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Knowledge Base
                    </label>
                    <div className="text-[10px] font-medium">
                      {isUploading[idx] ? (
                        <span className="text-[#0D6EFD] animate-pulse">กำลังสกัดความรู้...</span>
                      ) : (
                        slot.context && slot.context.length > 0
                          ? <span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">✅ เก็บข้อมูลแล้ว {slot.context.length.toLocaleString()} ตัวอักษร</span>
                          : <span className="text-slate-400">ยังไม่มีข้อมูลในสมอง</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className={`flex-1 cursor-pointer flex items-center justify-center px-4 py-2 border border-dashed rounded-xl text-xs font-medium transition-all ${isUploading[idx] ? 'border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-[#A3D8F4] bg-[#F0F7FF] text-[#0D6EFD] hover:bg-[#0D6EFD] hover:text-white'}`}>
                      <input
                        type="file"
                        accept=".txt,.pdf"
                        multiple
                        disabled={isUploading[idx]}
                        onChange={(e) => handleFileUpload(idx, e)}
                        className="hidden"
                      />
                      <span>+ อัปโหลดไฟล์ .txt หรือ .pdf (เลือกได้หลายไฟล์)</span>
                    </label>

                    {slot.context && slot.context.length > 0 && (
                      <button 
                        onClick={() => clearKnowledgeBase(idx)}
                        disabled={isUploading[idx]}
                        className="px-4 py-2 bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        ล้างความรู้
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Models */}
                <div className="grid grid-cols-3 gap-3">
                  {slot.models && Object.keys(slot.models).map(provider => (
                    <div key={provider} className="flex flex-col">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider ml-1 mb-1">{provider}</label>
                      <input
                        className="p-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:border-[#A3D8F4] focus:ring-2 focus:ring-[#A3D8F4]/20 transition-all text-slate-600"
                        value={slot.models[provider]}
                        onChange={e => {
                          const d = [...state.data]; d[idx].models[provider] = e.target.value;
                          save({ ...state, data: d });
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* 4. History (Snaps) */}
                {(() => {
                  let history = [];
                  try {
                    history = slot.history ? JSON.parse(slot.history) : [];
                  } catch (e) {
                    history = [];
                  }
                  
                  if (history.length === 0) return null;
                  
                  return (
                    <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-xl">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                        Capture History
                      </label>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {history.slice().reverse().map((h: any, i: number) => (
                          <div key={i} className="flex gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_4px_15px_rgb(13,110,253,0.05)]">
                            {h.imageUrl && (
                              <img 
                                src={h.imageUrl} 
                                alt="stealth-snap" 
                                className="w-20 h-20 object-cover rounded-lg border border-[#A3D8F4]/50 shadow-sm"
                              />
                            )}
                            <div className="flex-1 flex flex-col">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                  {new Date(h.timestamp).toLocaleString()}
                                </span>
                                <span className="text-[9px] font-bold text-[#0D6EFD] bg-[#A3D8F4]/20 px-2 py-0.5 rounded-full uppercase">
                                  {h.provider}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {h.aiResponse}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center mt-10 text-[10px] font-medium text-slate-400 tracking-widest">DASHBOARD V2.0 // DATABASE ENABLED</p>
    </div>
  );
}