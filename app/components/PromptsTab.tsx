"use client";

// Tab 1: 10 System Prompts management panel.
// Renders editable textarea for each of the 10 prompt slots.

interface PromptsTabProps {
  prompts: string[];
  onPromptChange: (index: number, value: string) => void;
}

export default function PromptsTab({ prompts, onPromptChange }: PromptsTabProps) {
  return (
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
              onChange={(e) => onPromptChange(idx, e.target.value)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
