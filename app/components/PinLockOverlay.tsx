"use client";

// Dashboard Access PIN Lock overlay.
// Blocks the entire dashboard behind a full-screen blur overlay until the correct PIN is entered.
// Unlock state is persisted via sessionStorage.

interface PinLockOverlayProps {
  pinInput: string;
  pinError: string;
  showPin: boolean;
  onPinChange: (value: string) => void;
  onToggleShowPin: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function PinLockOverlay({
  pinInput, pinError, showPin, onPinChange, onToggleShowPin, onSubmit
}: PinLockOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xl p-4 pointer-events-auto">
      <div className="bg-white rounded-lg p-8 max-w-md w-full text-center space-y-6 relative border-2 border-gray-200">

        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-3xl mx-auto">
          <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard Access Lock</h2>
          <p className="text-xs text-gray-500 font-medium max-w-xs mx-auto">
            Enter your access PIN / passcode to manage system prompts, AI models, and IoT settings.
          </p>
        </div>

        {/* PIN Form */}
        <form onSubmit={onSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-gray-900 flex justify-between items-center">
              <span>Access PIN / Passcode</span>
              <button type="button" onClick={onToggleShowPin} className="text-[11px] text-blue-600 font-bold hover:underline">
                {showPin ? "Hide" : "Show"}
              </button>
            </label>

            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                required autoFocus placeholder="Enter PIN..."
                value={pinInput}
                onChange={(e) => onPinChange(e.target.value)}
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

          <button type="submit"
            className="w-full flat-btn-primary py-3.5 rounded-md font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2">
            <span>Unlock Dashboard</span>
            <span>➔</span>
          </button>
        </form>

        <p className="text-[10px] text-gray-400 font-medium pt-2 border-t border-gray-100">
          Protected by AI Bridge Security Policy
        </p>
      </div>
    </div>
  );
}
