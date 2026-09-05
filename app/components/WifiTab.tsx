"use client";

// Tab 4: Wi-Fi Profile Management panel.
// Displays sorted list of Wi-Fi networks with add, delete, and priority reorder controls.

import { WiFiNetwork } from '../types';

interface WifiTabProps {
  wifiNetworks: WiFiNetwork[];
  newSsid: string;
  newPassword: string;
  newUsername: string;
  newPriority: number;
  onNewSsidChange: (v: string) => void;
  onNewPasswordChange: (v: string) => void;
  onNewUsernameChange: (v: string) => void;
  onNewPriorityChange: (v: number) => void;
  onAddWifi: (e: React.FormEvent) => void;
  onUpdateNetwork: (index: number, field: keyof WiFiNetwork, value: any) => void;
  onMovePriority: (index: number, direction: 'up' | 'down') => void;
  onDeleteWifi: (id: string) => void;
}

export default function WifiTab({
  wifiNetworks, newSsid, newPassword, newUsername, newPriority,
  onNewSsidChange, onNewPasswordChange, onNewUsernameChange, onNewPriorityChange,
  onAddWifi, onUpdateNetwork, onMovePriority, onDeleteWifi
}: WifiTabProps) {
  return (
    <section className="space-y-6">
      <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
        <h2 className="text-2xl font-extrabold text-gray-900">IoT Board Wi-Fi Profiles</h2>
        <p className="text-xs text-gray-500 mt-1">
          Configure priority-ordered Wi-Fi networks for your IoT board. Hardware pulls profiles via GET /api/wifi-settings.
        </p>
      </div>

      {/* Add New Wi-Fi Form */}
      <form onSubmit={onAddWifi} className="flat-card p-8 space-y-4">
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
              type="text" required placeholder="e.g. Home_WiFi" value={newSsid}
              onChange={(e) => onNewSsidChange(e.target.value)}
              className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-gray-900">Password</label>
            <input
              type="password" placeholder="WPA2/WPA3 password" value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-gray-900">Username (Optional)</label>
            <input
              type="text" placeholder="Enterprise login if needed" value={newUsername}
              onChange={(e) => onNewUsernameChange(e.target.value)}
              className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-gray-900">Priority (1 = Highest)</label>
            <div className="flex gap-2">
              <input
                type="number" min={1} value={newPriority}
                onChange={(e) => onNewPriorityChange(parseInt(e.target.value, 10) || 1)}
                className="flat-input w-20 px-3 py-3 text-xs font-mono font-bold text-gray-900"
              />
              <button type="submit" className="flex-1 flat-btn-primary rounded-md px-4 py-3 text-xs font-extrabold">
                + Add Wi-Fi
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Configured Networks List */}
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
              <div key={net.id || idx} className="flat-card p-6 space-y-4 hover:scale-[1.01] transition-transform">
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
                      <p className="text-[10px] font-mono text-gray-500 mt-0.5">Priority Level #{net.priority}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button type="button" onClick={() => onMovePriority(idx, 'up')} disabled={idx === 0}
                      className="flat-btn-secondary px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-30 flex items-center gap-1" title="Move Priority Up">
                      <svg className="w-3 h-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                      <span>Up</span>
                    </button>
                    <button type="button" onClick={() => onMovePriority(idx, 'down')} disabled={idx === wifiNetworks.length - 1}
                      className="flat-btn-secondary px-3 py-1.5 rounded-md text-xs font-bold disabled:opacity-30 flex items-center gap-1" title="Move Priority Down">
                      <svg className="w-3 h-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      <span>Down</span>
                    </button>
                    <button type="button" onClick={() => onDeleteWifi(net.id)}
                      className="bg-red-50 text-red-600 hover:bg-red-100 hover:scale-105 transition-all px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Inline edit fields for SSID, Password, Username */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-900">SSID (Network Name)</label>
                    <input type="text" className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900"
                      value={net.ssid} onChange={(e) => onUpdateNetwork(idx, 'ssid', e.target.value)} placeholder="Network SSID" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-900">Set/Update Password</label>
                    <input type="password" className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900"
                      onChange={(e) => onUpdateNetwork(idx, 'password', e.target.value)}
                      placeholder={net.password && net.password.length > 0 ? "Type new password to overwrite" : "Enter network password"} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-gray-900">Username (Optional)</label>
                    <input type="text" className="flat-input w-full px-4 py-3 text-xs font-mono font-bold text-gray-900"
                      value={net.username || ''} onChange={(e) => onUpdateNetwork(idx, 'username', e.target.value)}
                      placeholder="Enterprise login username" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
