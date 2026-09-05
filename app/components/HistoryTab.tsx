"use client";

// Tab 5: Answer History Log panel.
// Displays the last 3 AI responses with expandable detail view.

import { HistoryRecord } from '../types';

interface HistoryTabProps {
  history: HistoryRecord[];
  expandedHistory: { [key: number]: boolean };
  onToggleItem: (idx: number) => void;
}

export default function HistoryTab({ history, expandedHistory, onToggleItem }: HistoryTabProps) {
  return (
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm font-bold text-gray-900">No snapshots recorded yet</p>
          <p className="text-xs text-gray-500">Send an image from your IoT calculator board to populate answer history.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record, idx) => (
            <div key={idx} className="flat-card rounded-lg overflow-hidden transition-transform hover:scale-[1.01]">
              <button
                onClick={() => onToggleItem(idx)}
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
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedHistory[idx] && (
                <div className="p-6 pt-0 flex flex-col gap-4 border-t border-gray-100">
                  <div className="flex-1 space-y-2 pt-4">
                    <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">AI Answer Response</p>
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
  );
}
