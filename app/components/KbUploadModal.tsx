"use client";

// Drag-and-Drop Knowledge Base file upload modal.
// Accepts .txt and .md files only. Shows preview before confirming upload into a KB slot.

interface KbUploadModalProps {
  kbModalIdx: number;                  // Which KB slot (0-based)
  kbModalFile: File | null;
  kbModalText: string;
  kbModalError: string;
  isDragging: boolean;
  onClose: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onConfirm: () => void;
}

export default function KbUploadModal({
  kbModalIdx, kbModalFile, kbModalText, kbModalError, isDragging,
  onClose, onFileSelect, onDrop, onDragOver, onDragLeave, onConfirm
}: KbUploadModalProps) {
  return (
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
              <h3 className="text-lg font-extrabold text-gray-900">Upload Document to KB #{kbModalIdx + 1}</h3>
              <p className="text-xs text-gray-500 font-medium">Select or drag-and-drop plain text (.txt) or Markdown (.md) files.</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-9 h-9 rounded-md bg-gray-100 text-gray-500 hover:text-gray-900 font-bold text-sm flex items-center justify-center hover:scale-105 transition-all">
            ✕
          </button>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => document.getElementById('kb-file-picker-input')?.click()}
          className={`bg-gray-100 rounded-lg p-8 text-center transition-all flex flex-col items-center justify-center gap-4 cursor-pointer ${
            isDragging
              ? 'border-4 border-blue-500 bg-blue-50 scale-[1.01]'
              : kbModalFile
              ? 'border-4 border-emerald-500 bg-emerald-50'
              : 'hover:bg-gray-200'
          }`}
        >
          <input id="kb-file-picker-input" type="file" accept=".txt, .md, text/plain, text/markdown"
            onChange={onFileSelect} className="hidden" />

          <div className={`w-14 h-14 rounded-lg bg-white flex items-center justify-center transition-transform ${isDragging ? 'text-blue-600 scale-110' : 'text-blue-600'}`}>
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>

          <div>
            <p className="text-sm font-extrabold text-gray-900">
              {isDragging ? "Drop your file here to upload" : "Drag & Drop your .txt or .md file here"}
            </p>
            <p className="text-xs text-gray-500 font-medium mt-1">Strictly Plain Text (.txt) or Markdown (.md) documents</p>
          </div>
          <span className="flat-btn-secondary px-5 py-2.5 rounded-md text-xs font-extrabold">Browse Files</span>
        </div>

        {/* Error Alert */}
        {kbModalError && (
          <div className="p-4 bg-red-50 rounded-md text-red-600 text-xs flex items-center gap-2 font-extrabold border-2 border-red-200">
            <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1">{kbModalError}</span>
          </div>
        )}

        {/* File Preview */}
        {kbModalFile && !kbModalError && (
          <div className="p-5 bg-gray-100 rounded-md space-y-3">
            <div className="flex justify-between items-center text-xs font-extrabold text-gray-900">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>File Selected</span>
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full font-mono font-bold">✓ Ready to upload</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-md">
                <span className="block text-[10px] text-gray-500 font-bold">File Name</span>
                <span className="font-mono font-extrabold text-gray-900 truncate block" title={kbModalFile.name}>{kbModalFile.name}</span>
              </div>
              <div className="bg-white p-3 rounded-md">
                <span className="block text-[10px] text-gray-500 font-bold">File Size</span>
                <span className="font-mono font-extrabold text-gray-900 block">{(kbModalFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="bg-white p-3 rounded-md">
                <span className="block text-[10px] text-gray-500 font-bold">File Type</span>
                <span className="font-mono font-extrabold text-gray-900 uppercase block">{kbModalFile.name.split('.').pop() || 'TXT'}</span>
              </div>
            </div>

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

        {/* Modal Footer */}
        <div className="flex justify-end items-center gap-3 pt-3">
          <button type="button" onClick={onClose} className="flat-btn-secondary px-5 py-2.5 rounded-md text-xs font-bold">
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            disabled={!kbModalFile || !kbModalText || !!kbModalError}
            className="flat-btn-primary px-6 py-2.5 rounded-md text-xs font-extrabold disabled:opacity-40">
            <span>Confirm Upload</span>
          </button>
        </div>
      </div>
    </div>
  );
}
