"use client";

import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';

import {
  HistoryRecord, WiFiNetwork, ModelSlotConfig, AISetting,
  PRESET_MODELS, DEFAULT_SLOTS
} from './types';

import PromptsTab        from './components/PromptsTab';
import ModelsTab         from './components/ModelsTab';
import KnowledgeBaseTab  from './components/KnowledgeBaseTab';
import WifiTab           from './components/WifiTab';
import HistoryTab        from './components/HistoryTab';
import KbUploadModal     from './components/KbUploadModal';
import PinLockOverlay    from './components/PinLockOverlay';

const inter = Inter({ subsets: ['latin'] });

// Secret used in API request headers for same-origin authentication
const BOARD_SECRET = process.env.NEXT_PUBLIC_BOARD_SECRET_KEY || "";

// ---------------------------------------------------------------------------
// Dashboard Component
// ---------------------------------------------------------------------------
export default function Dashboard() {
  // --- Settings State ---
  const [prompts, setPrompts]         = useState<string[]>(Array(10).fill(""));
  const [kbs, setKbs]                 = useState<string[]>(Array(3).fill(""));
  const [models, setModels]           = useState<string[]>(PRESET_MODELS);
  const [modelSlots, setModelSlots]   = useState<ModelSlotConfig[]>(DEFAULT_SLOTS);
  const [history, setHistory]         = useState<HistoryRecord[]>([]);
  const [wifiNetworks, setWifiNetworks] = useState<WiFiNetwork[]>([]);

  // --- Wi-Fi Add Form State ---
  const [newSsid, setNewSsid]         = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPriority, setNewPriority] = useState<number>(1);

  // --- UI State ---
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<{ [key: number]: boolean }>({ 0: true });
  const [activeTab, setActiveTab]     = useState<'prompts' | 'models' | 'kbs' | 'wifi' | 'history'>('prompts');

  // --- PIN Lock State ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput]     = useState("");
  const [pinError, setPinError]     = useState("");
  const [showPin, setShowPin]       = useState(false);

  // --- KB Upload Modal State ---
  const [kbModalIdx, setKbModalIdx]     = useState<number | null>(null);
  const [kbModalFile, setKbModalFile]   = useState<File | null>(null);
  const [kbModalText, setKbModalText]   = useState<string>("");
  const [kbModalError, setKbModalError] = useState<string>("");
  const [isDragging, setIsDragging]     = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // Session Restore
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUnlocked = sessionStorage.getItem('dashboard_unlocked');
      if (savedUnlocked === 'true') setIsUnlocked(true);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // PIN Lock Handlers
  // ---------------------------------------------------------------------------
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const dashboardPin = process.env.NEXT_PUBLIC_DASHBOARD_PIN || "1234";
    if (pinInput.trim() === dashboardPin) {
      if (typeof window !== 'undefined') sessionStorage.setItem('dashboard_unlocked', 'true');
      setIsUnlocked(true);
      setPinError("");
      setPinInput("");
    } else {
      setPinError("Invalid PIN / Passcode. Please try again.");
    }
  };

  // ---------------------------------------------------------------------------
  // KB Upload Modal Handlers
  // ---------------------------------------------------------------------------
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
    if (!fileName.endsWith('.txt') && !fileName.endsWith('.md')) {
      setKbModalError(`Unsupported file "${file.name}". Strictly only Plain Text (.txt) and Markdown (.md) files are allowed.`);
      setKbModalFile(null);
      setKbModalText("");
      return;
    }
    setKbModalError("");
    setKbModalFile(file);
    const reader = new FileReader();
    reader.onload  = (e) => setKbModalText((e.target?.result as string) || "");
    reader.onerror = () => setKbModalError("Failed to read file content.");
    reader.readAsText(file);
  };

  const handleKbFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processKbFile(e.target.files[0]);
  };

  const handleKbDrop     = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length > 0) processKbFile(e.dataTransfer.files[0]); };
  const handleKbDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleKbDragLeave= (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };

  const handleConfirmKbUpload = async () => {
    if (kbModalIdx === null || !kbModalFile || !kbModalText) return;
    const formattedText = `\n--- [DOCUMENT: ${kbModalFile.name}] ---\n${kbModalText}\n`;
    const updatedKbs = [...kbs];
    updatedKbs[kbModalIdx] = (updatedKbs[kbModalIdx] || "") + formattedText;
    setKbs(updatedKbs);
    closeKbModal();
    await handleSave(prompts, updatedKbs, modelSlots, wifiNetworks);
  };

  // ---------------------------------------------------------------------------
  // Settings API — Load
  // ---------------------------------------------------------------------------
  const loadSettings = async () => {
    try {
      const res  = await fetch('/api/settings', { headers: { 'x-board-key': BOARD_SECRET } });
      const json = await res.json();
      if (json.data) {
        const d: AISetting = json.data;
        const normalizedPrompts = Array.from({ length: 10 }, (_, i) => d.prompts?.[i] || "");
        const normalizedKbs     = Array.from({ length: 3  }, (_, i) => d.kbs?.[i]     || "");

        let normalizedModels: string[];
        if (Array.isArray(d.models)) {
          normalizedModels = Array.from({ length: 10 }, (_, i) => d.models[i] || PRESET_MODELS[i]);
        } else if (d.models && typeof d.models === 'object') {
          // Legacy object format { gemini, gpt, claude }
          const legacyObj = d.models as any;
          normalizedModels = [
            legacyObj.gemini || PRESET_MODELS[0],
            legacyObj.gpt    || PRESET_MODELS[1],
            legacyObj.claude || PRESET_MODELS[2],
            ...PRESET_MODELS.slice(3)
          ];
        } else {
          normalizedModels = [...PRESET_MODELS];
        }

        const normalizedWifi  = (d.wifi_networks || []).sort((a, b) => a.priority - b.priority);
        const normalizedSlots = Array.from({ length: 10 }, (_, i) => {
          const s = d.model_slots?.[i];
          return {
            name:            s?.name            || DEFAULT_SLOTS[i].name,
            model_primary:   s?.model_primary   || normalizedModels[i] || DEFAULT_SLOTS[i].model_primary,
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

  useEffect(() => { loadSettings(); }, []);

  // ---------------------------------------------------------------------------
  // Settings API — Save
  // ---------------------------------------------------------------------------
  const handleSave = async (
    updatedPrompts = prompts,
    updatedKbs     = kbs,
    updatedSlots   = modelSlots,
    updatedWifi    = wifiNetworks
  ) => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const safePrompts = Array.from({ length: 10 }, (_, i) => updatedPrompts[i] || "");
      const safeKbs     = Array.from({ length: 3  }, (_, i) => updatedKbs[i]     || "");
      const safeSlots: ModelSlotConfig[] = Array.from({ length: 10 }, (_, i) => ({
        name:            updatedSlots[i]?.name?.trim()            || DEFAULT_SLOTS[i].name,
        model_primary:   updatedSlots[i]?.model_primary?.trim()   || DEFAULT_SLOTS[i].model_primary,
        model_secondary: updatedSlots[i]?.model_secondary?.trim() || ""
      }));
      const safeModels = safeSlots.map(s => s.model_primary);
      const safeWifi   = [...updatedWifi].sort((a, b) => a.priority - b.priority);

      const payload = { prompts: safePrompts, kbs: safeKbs, models: safeModels, model_slots: safeSlots, wifi_networks: safeWifi };
      console.log("1. Constructing Save Payload:", payload);
      console.log("2. Sending POST to /api/settings...");

      const res          = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-board-key': BOARD_SECRET }, body: JSON.stringify(payload) });
      const responseText = await res.text();
      let data: any = null;
      try { data = JSON.parse(responseText); } catch { console.warn("Response body could not be parsed as JSON"); }

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

  // ---------------------------------------------------------------------------
  // Wi-Fi Handlers
  // ---------------------------------------------------------------------------
  const handleAddWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSsid.trim()) { alert("Please enter a valid Wi-Fi SSID."); return; }
    const newNet: WiFiNetwork = { id: `wifi-${Date.now()}`, ssid: newSsid.trim(), password: newPassword, username: newUsername.trim() || undefined, priority: newPriority || wifiNetworks.length + 1 };
    const updated = [...wifiNetworks, newNet].sort((a, b) => a.priority - b.priority);
    setWifiNetworks(updated);
    setNewSsid(""); setNewPassword(""); setNewUsername("");
    setNewPriority(updated.length + 1);
    await handleSave(prompts, kbs, modelSlots, updated);
  };

  const handleUpdateWifiNetwork = (index: number, field: keyof WiFiNetwork, value: any) => {
    const updated = [...wifiNetworks];
    updated[index] = { ...updated[index], [field]: value };
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
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === wifiNetworks.length - 1)) return;
    const updated      = [...wifiNetworks];
    const targetIndex  = direction === 'up' ? index - 1 : index + 1;
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    const reordered    = updated.map((net, i) => ({ ...net, priority: i + 1 }));
    setWifiNetworks(reordered);
    await handleSave(prompts, kbs, modelSlots, reordered);
  };

  // ---------------------------------------------------------------------------
  // KB Handlers
  // ---------------------------------------------------------------------------
  const clearKb = async (kbIdx: number) => {
    if (confirm(`Are you sure you want to clear Knowledge Base #${kbIdx + 1}?`)) {
      const newKbs = [...kbs];
      newKbs[kbIdx] = "";
      setKbs(newKbs);
      await handleSave(prompts, newKbs, modelSlots, wifiNetworks);
    }
  };

  const handleKbChange = (index: number, value: string) => {
    const updated = [...kbs];
    updated[index] = value;
    setKbs(updated);
  };

  const handlePromptChange = (index: number, value: string) => {
    const updated = [...prompts];
    updated[index] = value;
    setPrompts(updated);
  };

  const handleSlotChange = (index: number, updated: ModelSlotConfig) => {
    const slots = [...modelSlots];
    slots[index] = updated;
    setModelSlots(slots);
  };

  const handleResetSlot = (index: number) => {
    const updated = [...modelSlots];
    updated[index] = { ...DEFAULT_SLOTS[index] };
    setModelSlots(updated);
  };

  const toggleHistoryItem = (idx: number) =>
    setExpandedHistory(prev => ({ ...prev, [idx]: !prev[idx] }));

  // ---------------------------------------------------------------------------
  // Loading Screen
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Tab button helper to avoid repeating className logic
  // ---------------------------------------------------------------------------
  const tabClass = (tab: typeof activeTab) =>
    `px-5 py-3 rounded-md font-bold text-xs transition-all flex items-center gap-2 ${
      activeTab === tab
        ? 'bg-blue-600 text-white border-2 border-blue-700 font-extrabold shadow-none scale-105'
        : 'text-gray-700 border-2 border-transparent hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const tabIconClass = (tab: typeof activeTab) =>
    `w-4 h-4 ${activeTab === tab ? 'text-white' : 'text-gray-500'}`;

  const tabBadgeClass = (tab: typeof activeTab) =>
    `text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300'}`;

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------
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
              className={`flat-btn-primary px-6 py-2.5 rounded-md text-xs font-extrabold transition-all flex items-center gap-2 ${saveSuccess ? 'bg-emerald-600 border-emerald-700' : ''} disabled:opacity-50`}
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
                <span>✓ Saved!</span>
              ) : (
                <span>Save All Changes</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">

        {/* Tab Navigation */}
        <div className="bg-white border-2 border-gray-200 p-2 rounded-lg flex gap-2 overflow-x-auto">

          <button onClick={() => setActiveTab('prompts')} className={tabClass('prompts')}>
            <svg className={tabIconClass('prompts')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>10 System Prompts</span>
            <span className={tabBadgeClass('prompts')}>10</span>
          </button>

          <button onClick={() => setActiveTab('models')} className={tabClass('models')}>
            <svg className={tabIconClass('models')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <span>10 AI Model Slots</span>
            <span className={tabBadgeClass('models')}>10 Slots</span>
          </button>

          <button onClick={() => setActiveTab('kbs')} className={tabClass('kbs')}>
            <svg className={tabIconClass('kbs')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <span>Knowledge Bases</span>
            <span className={tabBadgeClass('kbs')}>3 Slots</span>
          </button>

          <button onClick={() => setActiveTab('wifi')} className={tabClass('wifi')}>
            <svg className={tabIconClass('wifi')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            <span>Wi-Fi Settings</span>
            <span className={tabBadgeClass('wifi')}>{wifiNetworks.length}</span>
          </button>

          <button onClick={() => setActiveTab('history')} className={tabClass('history')}>
            <svg className={tabIconClass('history')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Answer History</span>
            <span className={tabBadgeClass('history')}>{history.length}</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'prompts' && (
          <PromptsTab prompts={prompts} onPromptChange={handlePromptChange} />
        )}
        {activeTab === 'models' && (
          <ModelsTab modelSlots={modelSlots} onSlotChange={handleSlotChange} onResetSlot={handleResetSlot} />
        )}
        {activeTab === 'kbs' && (
          <KnowledgeBaseTab kbs={kbs} onKbChange={handleKbChange} onOpenUploadModal={openKbModal} onClearKb={clearKb} />
        )}
        {activeTab === 'wifi' && (
          <WifiTab
            wifiNetworks={wifiNetworks}
            newSsid={newSsid} newPassword={newPassword} newUsername={newUsername} newPriority={newPriority}
            onNewSsidChange={setNewSsid} onNewPasswordChange={setNewPassword}
            onNewUsernameChange={setNewUsername} onNewPriorityChange={setNewPriority}
            onAddWifi={handleAddWifi} onUpdateNetwork={handleUpdateWifiNetwork}
            onMovePriority={handleMovePriority} onDeleteWifi={handleDeleteWifi}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab history={history} expandedHistory={expandedHistory} onToggleItem={toggleHistoryItem} />
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 mt-12 text-center">
        <p className="text-xs font-mono font-bold text-gray-400 tracking-widest uppercase">
          AI BRIDGE // 10 PROMPTS • 10 AI MODELS • 3 KNOWLEDGE BASES • WI-FI SYNC
        </p>
      </footer>

      {/* KB Upload Modal */}
      {kbModalIdx !== null && (
        <KbUploadModal
          kbModalIdx={kbModalIdx}
          kbModalFile={kbModalFile}
          kbModalText={kbModalText}
          kbModalError={kbModalError}
          isDragging={isDragging}
          onClose={closeKbModal}
          onFileSelect={handleKbFileSelect}
          onDrop={handleKbDrop}
          onDragOver={handleKbDragOver}
          onDragLeave={handleKbDragLeave}
          onConfirm={handleConfirmKbUpload}
        />
      )}

      {/* PIN Lock Overlay */}
      {!isUnlocked && (
        <PinLockOverlay
          pinInput={pinInput}
          pinError={pinError}
          showPin={showPin}
          onPinChange={(v) => { setPinInput(v); if (pinError) setPinError(""); }}
          onToggleShowPin={() => setShowPin(!showPin)}
          onSubmit={handleUnlock}
        />
      )}
    </div>
  );
}