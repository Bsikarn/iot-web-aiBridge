"use client";

// Tab 3: Knowledge Base Contexts management panel.
// Renders 3 KB slots with editable textarea and file upload / clear controls.

interface KnowledgeBaseTabProps {
  kbs: string[];
  onKbChange: (index: number, value: string) => void;
  onOpenUploadModal: (index: number) => void;
  onClearKb: (index: number) => void;
}

export default function KnowledgeBaseTab({ kbs, onKbChange, onOpenUploadModal, onClearKb }: KnowledgeBaseTabProps) {
  return (
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
                  <h3 className="text-base font-extrabold text-gray-900">Document Context #{idx + 1}</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Mapped to kb_index = {idx + 1}</p>
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
              onChange={(e) => onKbChange(idx, e.target.value)}
            />

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                type="button"
                onClick={() => onOpenUploadModal(idx)}
                className="flat-btn-secondary flex-1 px-5 py-3 rounded-md text-xs font-extrabold flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>Upload Drag &amp; Drop (.txt / .md)</span>
              </button>

              {kbText && (
                <button
                  onClick={() => onClearKb(idx)}
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
  );
}
