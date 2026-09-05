"use client";

// Tab 5: Answer History Log panel.
// Displays the last 3 AI responses with expandable detail view including the captured image.

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
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
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
                <div className="p-6 pt-0 flex flex-col md:flex-row gap-6 border-t border-gray-100">
                  {record.imageUrl && (
                    <div className="flex-shrink-0 pt-4">
                      <a href={record.imageUrl} target="_blank" rel="noopener noreferrer" className="block group relative">
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
