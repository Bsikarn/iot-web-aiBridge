"use client";

// Tab 2: 10 AI Model Slots configuration panel.
// Each slot has a display name, primary model ID, and an optional secondary model
// for parallel dual-LLM execution.

import { ModelSlotConfig, DEFAULT_SLOTS } from '../types';

interface ModelsTabProps {
  modelSlots: ModelSlotConfig[];
  onSlotChange: (index: number, updated: ModelSlotConfig) => void;
  onResetSlot: (index: number) => void;
}

export default function ModelsTab({ modelSlots, onSlotChange, onResetSlot }: ModelsTabProps) {
  return (
    <section className="space-y-6">
      <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
        <h2 className="text-2xl font-extrabold text-gray-900">10 AI Model Slots &amp; Dual-Model Groups</h2>
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
                  onClick={() => onResetSlot(idx)}
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
                  placeholder="e.g. Sol+Sonnet"
                  value={slot.name}
                  onChange={(e) => onSlotChange(idx, { ...slot, name: e.target.value })}
                />
              </div>

              {/* Primary Model ID */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Primary OpenRouter Model ID</label>
                <input
                  type="text"
                  className="flat-input w-full px-4 py-2.5 text-xs font-mono font-bold text-gray-900 placeholder-gray-400"
                  placeholder="e.g. anthropic/claude-3.5-sonnet"
                  value={slot.model_primary}
                  onChange={(e) => onSlotChange(idx, { ...slot, model_primary: e.target.value })}
                />
              </div>

              {/* Dual Model Toggle & Secondary Model ID */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasSecondary}
                      onChange={(e) =>
                        onSlotChange(idx, {
                          ...slot,
                          model_secondary: e.target.checked
                            ? (slot.model_secondary || "openai/gpt-4o-mini")
                            : ""
                        })
                      }
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
                      placeholder="e.g. openai/gpt-4o"
                      value={slot.model_secondary || ""}
                      onChange={(e) => onSlotChange(idx, { ...slot, model_secondary: e.target.value })}
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
  );
}
