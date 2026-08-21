"use client";

import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

const BOARD_SECRET = process.env.NEXT_PUBLIC_BOARD_SECRET_KEY || "";

interface HistoryRecord {
  timestamp: string;
  provider?: string;
  model: string;
  promptIndex: number;
  kbIndex: number;
  aiResponse: string;
  imageUrl: string;
}

interface WiFiNetwork {
  id: string;
  ssid: string;
  password: string;
  username?: string;
  priority: number;
}

interface ModelSlotConfig {
  name: string;
  model_primary: string;
  model_secondary?: string;
}

interface AISetting {
  prompts: string[];
  kbs: string[];
  models: string[];
  model_slots?: ModelSlotConfig[];
  history: HistoryRecord[];
  wifi_networks?: WiFiNetwork[];
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

const DEFAULT_SLOTS: ModelSlotConfig[] = [
  { name: "Gemini 2.5 Flash", model_primary: "google/gemini-2.5-flash", model_secondary: "" },
  { name: "GPT-4o Mini", model_primary: "openai/gpt-4o-mini", model_secondary: "" },
  { name: "Claude 3.5 Haiku", model_primary: "anthropic/claude-3-5-haiku", model_secondary: "" },
  { name: "Gemini 2.0 Flash", model_primary: "google/gemini-2.0-flash-lite", model_secondary: "" },
  { name: "GPT-4o", model_primary: "openai/gpt-4o", model_secondary: "" },
  { name: "Claude 3 Haiku", model_primary: "anthropic/claude-3-haiku", model_secondary: "" },
  { name: "DeepSeek R1", model_primary: "deepseek/deepseek-r1", model_secondary: "" },
  { name: "Llama 3.3 70B", model_primary: "meta-llama/llama-3.3-70b-instruct", model_secondary: "" },
  { name: "Mistral Small", model_primary: "mistralai/mistral-small-24b-instruct-2501", model_secondary: "" },
  { name: "Qwen 2.5 Coder", model_primary: "qwen/qwen-2.5-coder-32b-instruct", model_secondary: "" }
];

export default function Dashboard() {
  const [prompts, setPrompts] = useState<string[]>(Array(10).fill(""));
  const [kbs, setKbs] = useState<string[]>(Array(3).fill(""));
  const [models, setModels] = useState<string[]>(PRESET_MODELS);
  const [modelSlots, setModelSlots] = useState<ModelSlotConfig[]>(DEFAULT_SLOTS);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [wifiNetworks, setWifiNetworks] = useState<WiFiNetwork[]>([]);

  // Form state for adding new Wi-Fi network
  const [newSsid, setNewSsid] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPriority, setNewPriority] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<{ [key: number]: boolean }>({ 0: true });
  const [activeTab, setActiveTab] = useState<'prompts' | 'models' | 'kbs' | 'wifi' | 'history'>('prompts');

  // Dashboard Access PIN Lock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Drag-and-Drop Knowledge Base Upload Modal State
  const [kbModalIdx, setKbModalIdx] = useState<number | null>(null);
  const [kbModalFile, setKbModalFile] = useState<File | null>(null);
  const [kbModalText, setKbModalText] = useState<string>("");
  const [kbModalError, setKbModalError] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Check saved session unlock state on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUnlocked = sessionStorage.getItem('dashboard_unlocked');
      if (savedUnlocked === 'true') {
        setIsUnlocked(true);
      }
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const dashboardPin = process.env.NEXT_PUBLIC_DASHBOARD_PIN || "1234";
    if (pinInput.trim() === dashboardPin) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('dashboard_unlocked', 'true');
      }
      setIsUnlocked(true);
      setPinError("");
      setPinInput("");
    } else {
      setPinError("Invalid PIN / Passcode. Please try again.");
    }
  };

  const openKbModal = (idx: number) => {
    setKbModalIdx(idx);
    setKbModalFile(null);
    setKbModalText("");
    setKbModalError("");
    setIsDragging(false);
  };

  const closeKbModal = () => {
    setKbModalIdx(null);
    setKbModalFile(null);
    setKbModalText("");
    setKbModalError("");
    setIsDragging(false);
  };

  const processKbFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isTxt = fileName.endsWith('.txt');
    const isMd = fileName.endsWith('.md');
    
    if (!isTxt && !isMd) {
      setKbModalError(`Unsupported file "${file.name}". Strictly only Plain Text (.txt) and Markdown (.md) files are allowed.`);
      setKbModalFile(null);
      setKbModalText("");
      return;
    }

    setKbModalError("");
    setKbModalFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string || "";
      setKbModalText(text);
    };
    reader.onerror = () => {
      setKbModalError("Failed to read file content.");
    };
    reader.readAsText(file);
  };

  const handleKbFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processKbFile(files[0]);
    }
  };

  const handleKbDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processKbFile(files[0]);
    }
  };

  const handleKbDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleKbDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleConfirmKbUpload = async () => {
    if (kbModalIdx === null || !kbModalFile || !kbModalText) return;
    
    const formattedText = `\n--- [DOCUMENT: ${kbModalFile.name}] ---\n${kbModalText}\n`;
    const updatedKbs = [...kbs];
    updatedKbs[kbModalIdx] = (updatedKbs[kbModalIdx] || "") + formattedText;
    
    setKbs(updatedKbs);
    closeKbModal();
    await handleSave(prompts, updatedKbs, modelSlots, wifiNetworks);
  };

  // Load configuration from settings API
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: {
          'x-board-key': BOARD_SECRET
        }
      });
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

        const normalizedWifi = (d.wifi_networks || []).sort((a, b) => a.priority - b.priority);

        const normalizedSlots: ModelSlotConfig[] = Array.from({ length: 10 }, (_, i) => {
          const s = d.model_slots?.[i];
          return {
            name: s?.name || DEFAULT_SLOTS[i].name,
            model_primary: s?.model_primary || normalizedModels[i] || DEFAULT_SLOTS[i].model_primary,
            model_secondary: s?.model_secondary || ""
          };
        });

        setPrompts(normalizedPrompts);
        setKbs(normalizedKbs);
        setModels(normalizedModels);
        setModelSlots(normalizedSlots);
        setHistory(d.history || []);
        setWifiNetworks(normalizedWifi);
        setNewPriority(normalizedWifi.length + 1);
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

  // Save current settings to server with robust error reporting
  const handleSave = async (
    updatedPrompts = prompts,
    updatedKbs = kbs,
    updatedSlots = modelSlots,
    updatedWifi = wifiNetworks
  ) => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const safePrompts = Array.from({ length: 10 }, (_, i) => updatedPrompts[i] || "");
      const safeKbs = Array.from({ length: 3 }, (_, i) => updatedKbs[i] || "");
      const safeSlots: ModelSlotConfig[] = Array.from({ length: 10 }, (_, i) => ({
        name: updatedSlots[i]?.name?.trim() || DEFAULT_SLOTS[i].name,
        model_primary: updatedSlots[i]?.model_primary?.trim() || DEFAULT_SLOTS[i].model_primary,
        model_secondary: updatedSlots[i]?.model_secondary?.trim() || ""
      }));
      const safeModels = safeSlots.map(s => s.model_primary);
      const safeWifi = [...updatedWifi].sort((a, b) => a.priority - b.priority);

      const payload = {
        prompts: safePrompts,
        kbs: safeKbs,
        models: safeModels,
        model_slots: safeSlots,
        wifi_networks: safeWifi
      };

      console.log("1. Constructing Save Payload:", payload);
      console.log("2. Sending POST to /api/settings...");

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-board-key': BOARD_SECRET
        },
        body: JSON.stringify(payload)
      });

      const responseText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn("Response body could not be parsed as JSON:", parseErr);
      }

      if (!res.ok || (data && !data.success)) {
        const errorMessage = data?.error || responseText || res.statusText || "Unknown Error";
        console.error(`Save Failed [HTTP ${res.status}]:`, errorMessage);
        alert(`Save Failed [${res.status}]: ${errorMessage}`);
        return;
      }

      console.log("3. Settings Saved Successfully:", data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err: any) {
      console.error("Client Exception Details:", err);
      alert("Save Exception: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  // Wi-Fi Management Handlers
  const handleAddWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSsid.trim()) {
      alert("Please enter a valid Wi-Fi SSID.");
      return;
    }

    const newNet: WiFiNetwork = {
      id: `wifi-${Date.now()}`,
      ssid: newSsid.trim(),
      password: newPassword,
      username: newUsername.trim() || undefined,
      priority: newPriority || wifiNetworks.length + 1
    };

    const updated = [...wifiNetworks, newNet].sort((a, b) => a.priority - b.priority);
    setWifiNetworks(updated);
    setNewSsid("");
    setNewPassword("");
    setNewUsername("");
    setNewPriority(updated.length + 1);

    await handleSave(prompts, kbs, modelSlots, updated);
  };

  const handleUpdateWifiNetwork = (index: number, field: keyof WiFiNetwork, value: any) => {
    const updated = [...wifiNetworks];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setWifiNetworks(updated);
  };

  const handleDeleteWifi = async (id: string) => {
    if (confirm("Are you sure you want to delete this Wi-Fi network profile?")) {
      const updated = wifiNetworks.filter(net => net.id !== id);
      setWifiNetworks(updated);
      await handleSave(prompts, kbs, modelSlots, updated);
    }
  };

  const handleMovePriority = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === wifiNetworks.length - 1)) {
      return;
    }
    const updated = [...wifiNetworks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Re-assign priorities explicitly based on new order
    const reordered = updated.map((net, i) => ({ ...net, priority: i + 1 }));
    setWifiNetworks(reordered);
    await handleSave(prompts, kbs, modelSlots, reordered);
  };

  // Clear Knowledge Base context
  const clearKb = async (kbIdx: number) => {
    if (confirm(`Are you sure you want to clear Knowledge Base #${kbIdx + 1}?`)) {
      const newKbs = [...kbs];
      newKbs[kbIdx] = "";
      setKbs(newKbs);
      await handleSave(prompts, newKbs, modelSlots, wifiNetworks);
    }
  };

  const toggleHistoryItem = (idx: number) => {
    setExpandedHistory(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F3F4F6] font-sans text-gray-900">
        <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center text-blue-600 mb-4 animate-pulse">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="font-extrabold text-sm text-gray-900 tracking-wider animate-pulse">
          INITIALIZING AI BRIDGE...
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F3F4F6] text-gray-900 pb-16 font-sans ${!isUnlocked ? 'pointer-events-none select-none overflow-hidden h-screen' : ''}`}>
      {/* Flat Header */}
      <header className="sticky top-4 z-30 max-w-7xl mx-auto px-4">
        <div className="bg-white border-2 border-gray-200 rounded-lg px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-600">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                AI <span className="text-blue-600">BRIDGE</span>
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border-2 border-blue-200 px-3.5 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              EDGE CONFIG ACTIVE
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border-2 border-emerald-200 px-3.5 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              DISCORD WEBHOOK STORAGE
            </span>
            
            <button
              id="save-settings-btn"
              onClick={() => handleSave()}
              disabled={saving}
              className={`flat-btn-primary px-6 py-2.5 rounded-md text-xs font-extrabold transition-all flex items-center gap-2 ${
                saveSuccess ? 'bg-emerald-600 border-emerald-700' : ''
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
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        
        {/* Flat Navigation Tabs Track */}
        <div className="bg-white border-2 border-gray-200 p-2 rounded-lg flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('prompts')}
            className={`px-5 py-3 rounded-md font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'prompts'
                ? 'bg-blue-600 text-white border-2 border-blue-700 font-extrabold shadow-none scale-105'
                : 'text-gray-700 border-2 border-transparent hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'prompts' ? 'text-white' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>10 System Prompts</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'prompts' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>10</span>
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`px-5 py-3 rounded-md font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'models'
                ? 'bg-blue-600 text-white border-2 border-blue-700 font-extrabold shadow-none scale-105'
                : 'text-gray-700 border-2 border-transparent hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'models' ? 'text-white' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <span>10 AI Model Slots</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'models' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>10 Slots</span>
          </button>

          <button
            onClick={() => setActiveTab('kbs')}
            className={`px-5 py-3 rounded-md font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'kbs'
                ? 'bg-blue-600 text-white border-2 border-blue-700 font-extrabold shadow-none scale-105'
                : 'text-gray-700 border-2 border-transparent hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'kbs' ? 'text-white' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <span>Knowledge Bases</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'kbs' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>3 Slots</span>
          </button>

          <button
            onClick={() => setActiveTab('wifi')}
            className={`px-5 py-3 rounded-md font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'wifi'
                ? 'bg-blue-600 text-white border-2 border-blue-700 font-extrabold shadow-none scale-105'
                : 'text-gray-700 border-2 border-transparent hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'wifi' ? 'text-white' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            <span>Wi-Fi Settings</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'wifi' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
              {wifiNetworks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-3 rounded-md font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white border-2 border-blue-700 font-extrabold shadow-none scale-105'
                : 'text-gray-700 border-2 border-transparent hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <svg className={`w-4 h-4 ${activeTab === 'history' ? 'text-white' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Answer History</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
              {history.length}
            </span>
          </button>
        </div>

        {/* Tab 1: System Prompts (1 to 10) */}
        {activeTab === 'prompts' && (
          <section className="space-y-6">
            <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
              <h2 className="text-2xl font-extrabold text-gray-900">10 System Prompts</h2>
              <p className="text-xs text-gray-500 mt-1">
                Selectable by prompt_index (1 to 10) from the IoT calculator board.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prompts.map((pText, idx) => (
                <div
                  key={idx}
                  className="flat-card p-6 space-y-4 hover:scale-[1.015] transition-transform"
                >
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-extrabold text-blue-600 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center text-xs font-extrabold text-blue-600">
                        #{idx + 1}
                      </span>
                      Prompt #{idx + 1}
                    </label>
                    <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                      {pText.length} chars
                    </span>
                  </div>

                  <textarea
                    id={`prompt-input-${idx + 1}`}
                    rows={3}
                    className="flat-input w-full p-4 text-xs font-sans text-gray-900 placeholder-gray-400 resize-y"
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
          <section className="space-y-6">
            <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
              <h2 className="text-2xl font-extrabold text-gray-900">10 AI Model Slots & Dual-Model Groups</h2>
              <p className="text-xs text-gray-500 mt-1">
                Selectable by ai_index (1 to 10) from the IoT calculator board. Supports custom display names and parallel dual-model reasoning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modelSlots.map((slot, idx) => {
                const hasSecondary = Boolean(slot.model_secondary && slot.model_secondary.trim());
                return (
                  <div
                    key={idx}
                    className="flat-card p-6 space-y-4 hover:scale-[1.015] transition-transform"
                  >
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-extrabold text-blue-600 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center text-xs font-extrabold text-blue-600">
                          #{idx + 1}
                        </span>
                        Slot #{idx + 1}: {slot.name}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...modelSlots];
                          updated[idx] = { ...DEFAULT_SLOTS[idx] };
                          setModelSlots(updated);
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline transition-colors"
                      >
                        Reset Preset
                      </button>
                    </div>

                    {/* Custom Display Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700">Display Label (E-Ink Menu Name)</label>
                      <input
                        type="text"
                        className="flat-input w-full px-4 py-2 text-xs font-bold text-gray-900"
                        placeholder={`e.g. Sol+Sonnet`}
                        value={slot.name}
                        onChange={(e) => {
                          const updated = [...modelSlots];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setModelSlots(updated);
                        }}
                      />
                    </div>

                    {/* Primary Model ID */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700">Primary OpenRouter Model ID</label>
                      <input
                        type="text"
                        className="flat-input w-full px-4 py-2.5 text-xs font-mono font-bold text-gray-900 placeholder-gray-400"
                        placeholder={`e.g. anthropic/claude-3.5-sonnet`}
                        value={slot.model_primary}
                        onChange={(e) => {
                          const updated = [...modelSlots];
                          updated[idx] = { ...updated[idx], model_primary: e.target.value };
                          setModelSlots(updated);
                        }}
                      />
                    </div>

                    {/* Dual Model Toggle & Secondary Model ID */}
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800 flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasSecondary}
                            onChange={(e) => {
                              const updated = [...modelSlots];
                              updated[idx] = {
                                ...updated[idx],
                                model_secondary: e.target.checked ? (updated[idx].model_secondary || "openai/gpt-4o-mini") : ""
                              };
                              setModelSlots(updated);
                            }}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          Enable Parallel Dual Model
                        </label>
                        {hasSecondary && (
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Dual Execution
                          </span>
                        )}
                      </div>

                      {hasSecondary && (
                        <div className="space-y-1 pl-6 pt-1">
                          <label className="text-[11px] font-bold text-emerald-700">Secondary Model ID (Executes in Parallel)</label>
                          <input
                            type="text"
                            className="flat-input w-full px-4 py-2.5 text-xs font-mono font-bold text-gray-900 placeholder-gray-400 border-emerald-200 focus:border-emerald-500"
                            placeholder={`e.g. openai/gpt-4o`}
                            value={slot.model_secondary || ""}
                            onChange={(e) => {
                              const updated = [...modelSlots];
                              updated[idx] = { ...updated[idx], model_secondary: e.target.value };
                              setModelSlots(updated);
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
                      <span>Mapped Index for hardware payload</span>
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">ai_index={idx + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}        {/* Tab 3: Knowledge Base Contexts (1 to 3) */}
        {activeTab === 'kbs' && (
          <section className="space-y-6">
            <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
              <h2 className="text-2xl font-extrabold text-gray-900">3 Knowledge Base Contexts</h2>
              <p className="text-xs text-gray-500 mt-1">
                Upload plain text (.txt) or Markdown (.md) documents to append context into Knowledge Base slots (kb_index 1 to 3).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {kbs.map((kbText, idx) => (
                <div
                  key={idx}
                  className="flat-card p-8 space-y-4 hover:scale-[1.01] transition-transform"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-600 font-black text-sm flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-gray-900">
                          Document Context #{idx + 1}
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium">
                          Mapped to kb_index = {idx + 1}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {kbText ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full">
                          ✓ {kbText.length.toLocaleString()} characters stored
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3.5 py-1.5 rounded-full">
                          Empty Context
                        </span>
                      )}
                    </div>
                  </div>

                  <textarea
                    id={`kb-input-${idx + 1}`}
                    rows={6}
                    className="flat-input w-full p-4 text-xs font-mono leading-relaxed text-gray-900 placeholder-gray-400"
                    placeholder={`Knowledge Base #${idx + 1} text content...`}
                    value={kbText}
                    onChange={(e) => {
                      const updated = [...kbs];
                      updated[idx] = e.target.value;
                      setKbs(updated);
                    }}
                  />

                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => openKbModal(idx)}
                      className="flat-btn-secondary flex-1 px-5 py-3 rounded-md text-xs font-extrabold flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Upload Drag & Drop (.txt / .md)</span>
                    </button>

                    {kbText && (
                      <button
                        onClick={() => clearKb(idx)}
                        className="bg-red-50 text-red-600 hover:bg-red-100 hover:scale-105 transition-all px-5 py-3 rounded-md text-xs font-bold flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Clear KB #{idx + 1}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 4: Wi-Fi Management & Hardware Sync */}
        {activeTab === 'wifi' && (
          <section className="space-y-6">
            <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
              <h2 className="text-2xl font-extrabold text-gray-900">IoT Board Wi-Fi Profiles</h2>
              <p className="text-xs text-gray-500 mt-1">
                Configure priority-ordered Wi-Fi networks for your IoT board. Hardware pulls profiles via GET /api/wifi-settings.
              </p>
            </div>

            {/* Add New Wi-Fi Form */}
            <form onSubmit={handleAddWifi} className="flat-card p-8 space-y-4">
              <h3 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add New Wi-Fi Profile</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-900">SSID (Network Name)*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Home_WiFi"
                    value={newSsid}
                    onChange={(e) => setNewSsid(e.target.value)}
                    className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-900">Password</label>
                  <input
                    type="password"
                    placeholder="WPA2/WPA3 password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-900">Username (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enterprise login if needed"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-900">Priority (1 = Highest)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={newPriority}
                      onChange={(e) => setNewPriority(parseInt(e.target.value, 10) || 1)}
                      className="flat-input w-20 px-3 py-3 text-xs font-mono font-bold text-gray-900"
                    />
                    <button
                      type="submit"
                      className="flex-1 flat-btn-primary rounded-md px-4 py-3 text-xs font-extrabold"
                    >
                      + Add Wi-Fi
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* List of Configured Wi-Fi Networks */}
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                Configured Network Profiles (Sorted by Connection Priority)
              </h3>

              {wifiNetworks.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-lg text-xs text-gray-500 font-medium">
                  No Wi-Fi profiles configured yet. Add one using the form above.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {wifiNetworks.map((net, idx) => (
                    <div
                      key={net.id || idx}
                      className="flat-card p-6 space-y-4 hover:scale-[1.01] transition-transform"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-600 font-black text-xs flex items-center justify-center">
                            #{net.priority}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900 font-mono">{net.ssid}</span>
                              {net.password && net.password.length > 0 ? (
                                <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold flex items-center gap-1">
                                  <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                  Password Saved
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-mono text-[10px] flex items-center gap-1">
                                  <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                  </svg>
                                  Open Network (No Password)
                                </span>
                              )}
                              {net.username && (
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold">
                                  Enterprise ({net.username})
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                              Priority Level #{net.priority}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleMovePriority(idx, 'up')}
                            disabled={idx === 0}
                            className="flat-btn-secondary px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-30 flex items-center gap-1"
                            title="Move Priority Up"
                          >
                            <svg className="w-3 h-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                            <span>Up</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePriority(idx, 'down')}
                            disabled={idx === wifiNetworks.length - 1}
                            className="flat-btn-secondary px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-30 flex items-center gap-1"
                            title="Move Priority Down"
                          >
                            <svg className="w-3 h-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                            <span>Down</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWifi(net.id)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 hover:scale-105 transition-all px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Inputs for SSID, Password Overwrite, and Username */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-gray-900">SSID (Network Name)</label>
                          <input
                            type="text"
                            className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900"
                            value={net.ssid}
                            onChange={(e) => handleUpdateWifiNetwork(idx, 'ssid', e.target.value)}
                            placeholder="Network SSID"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-gray-900">Set/Update Password</label>
                          <input
                            type="password"
                            className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900"
                            onChange={(e) => handleUpdateWifiNetwork(idx, 'password', e.target.value)}
                            placeholder={net.password && net.password.length > 0 ? "Type new password to overwrite" : "Enter network password"}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-extrabold text-gray-900">Username (Optional)</label>
                          <input
                            type="text"
                            className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900"
                            value={net.username || ''}
                            onChange={(e) => handleUpdateWifiNetwork(idx, 'username', e.target.value)}
                            placeholder="Enterprise login username"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab 5: Latest Answers History Log (Max 3 records) */}
        {activeTab === 'history' && (
          <section className="space-y-6">
            <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
              <h2 className="text-2xl font-extrabold text-gray-900">Latest Answers History Log</h2>
              <p className="text-xs text-gray-500 mt-1">
                Displays the 3 most recent answers returned to the IoT calculator.
              </p>
            </div>

            {history.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-lg space-y-2">
                <svg className="w-8 h-8 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm font-bold text-gray-900">No snapshots recorded yet</p>
                <p className="text-xs text-gray-500">
                  Send an image from your IoT calculator board to populate answer history.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((record, idx) => (
                  <div
                    key={idx}
                    className="flat-card rounded-lg overflow-hidden transition-transform hover:scale-[1.01]"
                  >
                    <button
                      onClick={() => toggleHistoryItem(idx)}
                      className="w-full p-6 text-left flex justify-between items-center bg-white transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 font-black text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full font-mono">
                          {record.model || record.provider || 'AI Model'}
                        </span>
                        <span className="text-xs font-bold text-gray-600">
                          Prompt #{record.promptIndex} • KB #{record.kbIndex}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 font-mono font-bold">
                          {new Date(record.timestamp).toLocaleString()}
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform ${expandedHistory[idx] ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {expandedHistory[idx] && (
                      <div className="p-6 pt-0 flex flex-col md:flex-row gap-6 border-t border-gray-100">
                        {record.imageUrl && (
                          <div className="flex-shrink-0 pt-4">
                            <a
                              href={record.imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block group relative"
                            >
                              <img
                                src={record.imageUrl}
                                alt="Snap Preview"
                                className="w-28 h-28 object-cover rounded-md border-2 border-gray-200 group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute bottom-2 right-2 bg-gray-900/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                                Discord CDN
                              </span>
                            </a>
                          </div>
                        )}

                        <div className="flex-1 space-y-2 pt-4">
                          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                            AI Answer Response
                          </p>
                          <div className="p-5 bg-gray-100 rounded-md text-xs text-gray-900 font-mono whitespace-pre-wrap leading-relaxed">
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
      <footer className="max-w-7xl mx-auto px-6 mt-12 text-center">
        <p className="text-xs font-mono font-bold text-gray-400 tracking-widest uppercase">
          AI BRIDGE // 10 PROMPTS • 10 AI MODELS • 3 KNOWLEDGE BASES • WI-FI SYNC
        </p>
      </footer>

      {/* Flat Drag-and-Drop KB Upload Modal */}
      {kbModalIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xl p-4 pointer-events-auto">
          <div className="bg-white rounded-lg p-8 max-w-xl w-full space-y-6 relative border-2 border-gray-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 font-extrabold text-base flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">
                    Upload Document to KB #{kbModalIdx + 1}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Select or drag-and-drop plain text (.txt) or Markdown (.md) files.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeKbModal}
                className="w-9 h-9 rounded-md bg-gray-100 text-gray-500 hover:text-gray-900 font-bold text-sm flex items-center justify-center hover:scale-105 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Dropzone Area */}
            <div
              onDragOver={handleKbDragOver}
              onDragLeave={handleKbDragLeave}
              onDrop={handleKbDrop}
              onClick={() => document.getElementById('kb-file-picker-input')?.click()}
              className={`bg-gray-100 rounded-lg p-8 text-center transition-all flex flex-col items-center justify-center gap-4 cursor-pointer ${
                isDragging
                  ? 'border-4 border-blue-500 bg-blue-50 scale-[1.01]'
                  : kbModalFile
                  ? 'border-4 border-emerald-500 bg-emerald-50'
                  : 'hover:bg-gray-200'
              }`}
            >
              <input
                id="kb-file-picker-input"
                type="file"
                accept=".txt, .md, text/plain, text/markdown"
                onChange={handleKbFileSelect}
                className="hidden"
              />

              <div className={`w-14 h-14 rounded-lg bg-white flex items-center justify-center transition-transform ${
                isDragging ? 'text-blue-600 scale-110' : 'text-blue-600'
              }`}>
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>

              <div>
                <p className="text-sm font-extrabold text-gray-900">
                  {isDragging ? "Drop your file here to upload" : "Drag & Drop your .txt or .md file here"}
                </p>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Strictly Plain Text (.txt) or Markdown (.md) documents
                </p>
              </div>

              <span className="flat-btn-secondary px-5 py-2.5 rounded-md text-xs font-extrabold">
                Browse Files
              </span>
            </div>

            {/* Error Alert Box */}
            {kbModalError && (
              <div className="p-4 bg-red-50 rounded-md text-red-600 text-xs flex items-center gap-2 font-extrabold border-2 border-red-200">
                <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="flex-1">{kbModalError}</span>
              </div>
            )}

            {/* Selected File Details Preview */}
            {kbModalFile && !kbModalError && (
              <div className="p-5 bg-gray-100 rounded-md space-y-3">
                <div className="flex justify-between items-center text-xs font-extrabold text-gray-900">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>File Selected</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono font-bold">
                    ✓ Ready to upload
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-md">
                    <span className="block text-[10px] text-gray-500 font-bold">File Name</span>
                    <span className="font-mono font-extrabold text-gray-900 truncate block" title={kbModalFile.name}>
                      {kbModalFile.name}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-md">
                    <span className="block text-[10px] text-gray-500 font-bold">File Size</span>
                    <span className="font-mono font-extrabold text-gray-900 block">
                      {(kbModalFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-md">
                    <span className="block text-[10px] text-gray-500 font-bold">File Type</span>
                    <span className="font-mono font-extrabold text-gray-900 uppercase block">
                      {kbModalFile.name.split('.').pop() || 'TXT'}
                    </span>
                  </div>
                </div>

                {/* Text Preview Snippet */}
                {kbModalText && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                      Content Preview ({kbModalText.length.toLocaleString()} chars)
                    </span>
                    <div className="p-3.5 bg-white rounded-md text-[11px] font-mono text-gray-900 max-h-28 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                      {kbModalText.slice(0, 300)}
                      {kbModalText.length > 300 && "..."}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex justify-end items-center gap-3 pt-3">
              <button
                type="button"
                onClick={closeKbModal}
                className="flat-btn-secondary px-5 py-2.5 rounded-md text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmKbUpload}
                disabled={!kbModalFile || !kbModalText || !!kbModalError}
                className="flat-btn-primary px-6 py-2.5 rounded-md text-xs font-extrabold disabled:opacity-40"
              >
                <span>Confirm Upload</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Access PIN Lock Overlay */}
      {!isUnlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xl p-4 pointer-events-auto">
          <div className="bg-white rounded-lg p-8 max-w-md w-full text-center space-y-6 relative border-2 border-gray-200">
            <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-3xl mx-auto">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Dashboard Access Lock
              </h2>
              <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto">
                Enter your access PIN / passcode to manage system prompts, AI models, and IoT settings.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-900 flex justify-between items-center">
                  <span>Access PIN / Passcode</span>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-[11px] text-blue-600 font-bold hover:underline"
                  >
                    {showPin ? "Hide" : "Show"}
                  </button>
                </label>

                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    required
                    autoFocus
                    placeholder="Enter PIN..."
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      if (pinError) setPinError("");
                    }}
                    className="flat-input w-full px-5 py-3.5 text-sm font-mono tracking-widest text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>

              {pinError && (
                <div className="p-3.5 bg-red-50 rounded-md text-red-600 text-xs font-bold flex items-center gap-2 border-2 border-red-200">
                  <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full flat-btn-primary py-3.5 rounded-md font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2"
              >
                <span>Unlock Dashboard</span>
                <span>➔</span>
              </button>
            </form>

            <p className="text-[10px] text-gray-400 font-medium pt-2 border-t border-gray-100">
              Protected by AI Bridge Security Policy
            </p>
          </div>
        </div>
      )}
    </div>
  );
}