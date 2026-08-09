"use client";

import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

interface HistoryRecord {
  timestamp: string;
  provider?: string;
  model: string;
  promptIndex: number;
  kbIndex: number;
  aiResponse: string;
  imageUrl: string;
}

interface AISetting {
  prompts: string[];
  kbs: string[];
  models: string[];
  history: HistoryRecord[];
}

const PRESET_MODELS = [
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "anthropic/claude-3-5-haiku",
  "google/gemini-2.0-flash-lite",
  "openai/gpt-4o",
  "anthropic/claude-3-haiku",
  "deepseek/deepseek-r1",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-small-24b-instruct-2501",
  "qwen/qwen-2.5-coder-32b-instruct"
];

export default function Dashboard() {
  const [prompts, setPrompts] = useState<string[]>(Array(10).fill(""));
  const [kbs, setKbs] = useState<string[]>(Array(3).fill(""));
  const [models, setModels] = useState<string[]>(PRESET_MODELS);
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingKb, setUploadingKb] = useState<{ [key: number]: boolean }>({});
  const [expandedHistory, setExpandedHistory] = useState<{ [key: number]: boolean }>({ 0: true });
  const [activeTab, setActiveTab] = useState<'prompts' | 'kbs' | 'models' | 'history'>('prompts');

  // Load configuration from settings API
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.data) {
        const d: AISetting = json.data;
        const normalizedPrompts = Array.from({ length: 10 }, (_, i) => d.prompts?.[i] || "");
        const normalizedKbs = Array.from({ length: 3 }, (_, i) => d.kbs?.[i] || "");
        
        let normalizedModels: string[] = [];
        if (Array.isArray(d.models)) {
          normalizedModels = Array.from({ length: 10 }, (_, i) => d.models[i] || PRESET_MODELS[i]);
        } else if (d.models && typeof d.models === 'object') {
          const legacyObj = d.models as any;
          normalizedModels = [
            legacyObj.gemini || PRESET_MODELS[0],
            legacyObj.gpt || PRESET_MODELS[1],
            legacyObj.claude || PRESET_MODELS[2],
            ...PRESET_MODELS.slice(3)
          ];
        } else {
          normalizedModels = [...PRESET_MODELS];
        }

        setPrompts(normalizedPrompts);
        setKbs(normalizedKbs);
        setModels(normalizedModels);
        setHistory(d.history || []);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // Save current settings to server
  const handleSave = async (updatedPrompts = prompts, updatedKbs = kbs, updatedModels = models) => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: updatedPrompts,
          kbs: updatedKbs,
          models: updatedModels
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Failed to save settings: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Network error while saving settings");
    } finally {
      setSaving(false);
    }
  };

  // Upload PDF/TXT file and append extracted text to Knowledge Base
  const handleFileUpload = async (kbIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingKb(prev => ({ ...prev, [kbIdx]: true }));
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
        const newKbs = [...kbs];
        newKbs[kbIdx] = (newKbs[kbIdx] || "") + data.text;
        setKbs(newKbs);
        await handleSave(prompts, newKbs, models);
      } else {
        alert("Failed to parse file: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error uploading file. Please try again.");
    } finally {
      setUploadingKb(prev => ({ ...prev, [kbIdx]: false }));
      e.target.value = '';
    }
  };

  // Clear Knowledge Base context
  const clearKb = async (kbIdx: number) => {
    if (confirm(`Are you sure you want to clear Knowledge Base #${kbIdx + 1}?`)) {
      const newKbs = [...kbs];
      newKbs[kbIdx] = "";
      setKbs(newKbs);
      await handleSave(prompts, newKbs, models);
    }
  };

  const toggleHistoryItem = (idx: number) => {
    setExpandedHistory(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center bg-[#F0F7FF] ${inter.className}`}>
        <div className="w-12 h-12 border-4 border-[#0D6EFD] border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="font-semibold text-slate-700 tracking-wide animate-pulse">
          INITIALIZING STEALTH HQ...
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F0F7FF] text-slate-800 pb-16 ${inter.className}`}>
      {/* Top Banner & Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#A3D8F4]/60 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0D6EFD] to-[#A3D8F4] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#0D6EFD]/20">
              ⚡
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#0D6EFD] tracking-tight">
                STEALTH <span className="font-light text-slate-700">HQ</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                IoT AI Calculator Central Controller
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              EDGE CONFIG ACTIVE
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              DISCORD WEBHOOK STORAGE
            </span>
            
            <button
              id="save-settings-btn"
              onClick={() => handleSave()}
              disabled={saving}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 ${
                saveSuccess
                  ? 'bg-emerald-500 shadow-emerald-500/20'
                  : 'bg-[#0D6EFD] hover:bg-[#0B5ED7] shadow-[#0D6EFD]/20 active:scale-95'
              } disabled:opacity-50`}
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <span>✓ Saved!</span>
                </>
              ) : (
                <>
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-6 pt-8 space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-5 py-2.5 rounded-t-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'prompts'
                ? 'bg-white text-[#0D6EFD] border-t-2 border-x border-[#0D6EFD] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <span>📝 10 System Prompts</span>
            <span className="bg-[#A3D8F4]/30 text-[#0D6EFD] text-[10px] px-2 py-0.5 rounded-full font-bold">10</span>
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`px-5 py-2.5 rounded-t-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'models'
                ? 'bg-white text-[#0D6EFD] border-t-2 border-x border-[#0D6EFD] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <span>🤖 10 AI Model Slots</span>
            <span className="bg-[#A3D8F4]/30 text-[#0D6EFD] text-[10px] px-2 py-0.5 rounded-full font-bold">10 Slots</span>
          </button>

          <button
            onClick={() => setActiveTab('kbs')}
            className={`px-5 py-2.5 rounded-t-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'kbs'
                ? 'bg-white text-[#0D6EFD] border-t-2 border-x border-[#0D6EFD] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <span>📚 Knowledge Bases</span>
            <span className="bg-[#A3D8F4]/30 text-[#0D6EFD] text-[10px] px-2 py-0.5 rounded-full font-bold">3 Slots</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-t-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white text-[#0D6EFD] border-t-2 border-x border-[#0D6EFD] shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
            }`}
          >
            <span>📜 Answer History</span>
            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {history.length}
            </span>
          </button>
        </div>

        {/* Tab 1: System Prompts (1 to 10) */}
        {activeTab === 'prompts' && (
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">10 System Prompts</h2>
                <p className="text-xs text-slate-400">
                  Selectable by prompt_index (1 to 10) from the IoT calculator board.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {prompts.map((pText, idx) => (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-[#A3D8F4] transition-all"
                >
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-[#0D6EFD] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#F0F7FF] border border-[#A3D8F4] flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      Prompt #{idx + 1}
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {pText.length} chars
                    </span>
                  </div>

                  <textarea
                    id={`prompt-input-${idx + 1}`}
                    rows={3}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0D6EFD] focus:ring-2 focus:ring-[#0D6EFD]/10 transition-all resize-y font-sans"
                    placeholder={`Enter instruction for Prompt #${idx + 1}...`}
                    value={pText}
                    onChange={(e) => {
                      const updated = [...prompts];
                      updated[idx] = e.target.value;
                      setPrompts(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 2: 10 AI Model Slots (1 to 10) */}
        {activeTab === 'models' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">10 AI Model Slots</h2>
              <p className="text-xs text-slate-400">
                Selectable by ai_index (1 to 10) from the IoT calculator board.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {models.map((mText, idx) => (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:border-[#A3D8F4] transition-all space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#0D6EFD] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#F0F7FF] border border-[#A3D8F4] flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      Model Slot #{idx + 1}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = [...models];
                        updated[idx] = PRESET_MODELS[idx] || PRESET_MODELS[0];
                        setModels(updated);
                      }}
                      className="text-[10px] text-slate-400 hover:text-[#0D6EFD] underline"
                    >
                      Reset Preset
                    </button>
                  </div>

                  <input
                    id={`model-input-${idx + 1}`}
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0D6EFD] focus:ring-2 focus:ring-[#0D6EFD]/10 font-mono transition-all"
                    placeholder={`e.g. google/gemini-2.5-flash`}
                    value={mText}
                    onChange={(e) => {
                      const updated = [...models];
                      updated[idx] = e.target.value;
                      setModels(updated);
                    }}
                  />
                  
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Target Model string for OpenRouter</span>
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">ai_index={idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 3: Knowledge Base Contexts (1 to 3) */}
        {activeTab === 'kbs' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">3 Knowledge Base Contexts</h2>
              <p className="text-xs text-slate-400">
                Upload PDF or TXT documents to append context into Knowledge Base slots (kb_index 1 to 3).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {kbs.map((kbText, idx) => (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#0D6EFD] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                        {idx + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          Document Context #{idx + 1}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Mapped to kb_index = {idx + 1}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {kbText ? (
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                          ✓ {kbText.length.toLocaleString()} characters stored
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                          Empty Context
                        </span>
                      )}
                    </div>
                  </div>

                  <textarea
                    id={`kb-input-${idx + 1}`}
                    rows={6}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#0D6EFD] focus:ring-2 focus:ring-[#0D6EFD]/10 transition-all font-mono leading-relaxed"
                    placeholder={`Knowledge Base #{idx + 1} text content...`}
                    value={kbText}
                    onChange={(e) => {
                      const updated = [...kbs];
                      updated[idx] = e.target.value;
                      setKbs(updated);
                    }}
                  />

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <label className={`flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed rounded-xl text-xs font-semibold transition-all ${
                      uploadingKb[idx]
                        ? 'border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border-[#0D6EFD] bg-[#F0F7FF] text-[#0D6EFD] hover:bg-[#0D6EFD] hover:text-white'
                    }`}>
                      <input
                        type="file"
                        accept=".txt,.pdf"
                        multiple
                        disabled={uploadingKb[idx]}
                        onChange={(e) => handleFileUpload(idx, e)}
                        className="hidden"
                      />
                      <span>{uploadingKb[idx] ? '⏳ Extracting document text...' : '📁 + Upload .txt / .pdf documents'}</span>
                    </label>

                    {kbText && (
                      <button
                        onClick={() => clearKb(idx)}
                        disabled={uploadingKb[idx]}
                        className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        🗑️ Clear KB #{idx + 1}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 4: Latest Answers History Log (Max 3 records) */}
        {activeTab === 'history' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Latest Answers History Log</h2>
              <p className="text-xs text-slate-400">
                Displays the 3 most recent answers returned to the IoT calculator.
              </p>
            </div>

            {history.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 space-y-2">
                <div className="text-3xl">📷</div>
                <p className="text-sm font-semibold text-slate-600">No snapshots recorded yet</p>
                <p className="text-xs text-slate-400">
                  Send an image from your IoT calculator board to populate answer history.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((record, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden transition-all hover:border-[#A3D8F4]"
                  >
                    <button
                      onClick={() => toggleHistoryItem(idx)}
                      className="w-full p-5 text-left flex justify-between items-center bg-white hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-md bg-[#F0F7FF] text-[#0D6EFD] font-bold text-xs flex items-center justify-center border border-[#A3D8F4]">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-md font-mono">
                          {record.model || record.provider || 'AI Model'}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          Prompt #{record.promptIndex} • KB #{record.kbIndex}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(record.timestamp).toLocaleString()}
                        </span>
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform ${expandedHistory[idx] ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {expandedHistory[idx] && (
                      <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-5">
                        {record.imageUrl && (
                          <div className="flex-shrink-0">
                            <a
                              href={record.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block group relative"
                            >
                              <img
                                src={record.imageUrl}
                                alt="Snap Preview"
                                className="w-28 h-28 object-cover rounded-xl border border-slate-200 shadow-sm group-hover:opacity-95 transition-opacity"
                              />
                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                                Discord CDN
                              </span>
                            </a>
                          </div>
                        )}

                        <div className="flex-1 space-y-2">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            AI Answer Response
                          </p>
                          <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans shadow-inner">
                            {record.aiResponse}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 mt-12 text-center">
        <p className="text-[11px] font-mono text-slate-400 tracking-widest uppercase">
          STEALTH AI CALCULATOR HQ // 10 PROMPTS • 10 AI MODELS • 3 KNOWLEDGE BASES
        </p>
      </footer>
    </div>
  );
}