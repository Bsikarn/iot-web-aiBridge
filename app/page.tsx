// app/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function Dashboard() {
  const [state, setState] = useState({ activeSlot: 0, data: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<{ [key: number]: boolean }>({});
  const [expandedHistory, setExpandedHistory] = useState<{ [key: string]: boolean }>({});

  const toggleHistory = (id: string) => setExpandedHistory(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(d => {
        if (d.error) {
          alert("Server Error: " + d.error);
        }
        setState({
          activeSlot: d.activeSlot || 0,
          data: Array.isArray(d.data) ? d.data : []
        });
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setState(s => ({ ...s, data: [] }));
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
          <div className="flex items-center gap-2">
            <a
              href="/wifi"
              className="text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full transition-colors"
            >
              📶 WIFI
            </a>
            <span className="text-[10px] font-bold text-[#0D6EFD] bg-[#A3D8F4]/30 px-3 py-1 rounded-full">OPENROUTER BRIDGE</span>
          </div>
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
                {/* 1. Prompts */}
                <div className="space-y-3">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 ml-1">
                    System Prompts (1-5)
                  </label>
                  {[1, 2, 3, 4, 5].map(num => (
                    <div key={num}>
                      <textarea
                        className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#A3D8F4] focus:ring-4 focus:ring-[#A3D8F4]/20 min-h-[60px] transition-all resize-none"
                        placeholder={`Prompt ${num} instructions...`}
                        value={slot[`prompt${num}`] || ""}
                        onChange={e => {
                          const d = [...state.data]; 
                          d[idx][`prompt${num}`] = e.target.value;
                          save({ ...state, data: d });
                        }}
                      />
                    </div>
                  ))}
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
                  
                  const recentHistory = history.slice().reverse().slice(0, 3);
                  
                  return (
                    <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-xl">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                        Latest Answers (Max 3)
                      </label>
                      <div className="space-y-3">
                        {recentHistory.map((h: any, i: number) => {
                          const historyId = `${idx}-${i}`;
                          const isExpanded = expandedHistory[historyId];
                          return (
                            <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_4px_15px_rgb(13,110,253,0.05)] overflow-hidden">
                              <button 
                                onClick={() => toggleHistory(historyId)}
                                className="w-full text-left p-4 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold text-slate-700">Latest Answer {i + 1}</span>
                                  <span className="text-[9px] font-bold text-[#0D6EFD] bg-[#A3D8F4]/20 px-2 py-0.5 rounded-full uppercase">
                                    {h.provider}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] font-medium text-slate-400">
                                    {new Date(h.timestamp).toLocaleString()}
                                  </span>
                                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </button>
                              
                              {isExpanded && (
                                <div className="p-4 border-t border-slate-50 flex gap-4 bg-slate-50/30">
                                  {h.imageUrl && (
                                    <img 
                                      src={h.imageUrl} 
                                      alt="stealth-snap" 
                                      className="w-20 h-20 object-cover rounded-lg border border-[#A3D8F4]/50 shadow-sm"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                      {h.aiResponse}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
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