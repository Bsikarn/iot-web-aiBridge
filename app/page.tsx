// app/page.tsx
"use client";
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [state, setState] = useState({ activeSlot: 0, data: [] as any[] });
  const [loading, setLoading] = useState(true);

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
                  className="font-bold bg-transparent outline-none focus:border-b border-blue-300"
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

              <div className="space-y-3">
                <textarea
                  className="w-full p-3 bg-slate-50 border border-blue-50 rounded-xl text-sm outline-none focus:ring-2 ring-blue-100"
                  placeholder="System Prompt..."
                  value={slot.prompt}
                  onChange={e => {
                    const d = [...state.data]; d[idx].prompt = e.target.value;
                    save({ ...state, data: d });
                  }}
                />

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
      <p className="text-center mt-10 text-[10px] text-slate-300">DASHBOARD V2.0 // KISS REFACTORED</p>
    </div>
  );
}