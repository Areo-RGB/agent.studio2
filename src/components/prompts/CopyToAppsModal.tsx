/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { PromptPreset, AIToolId, AI_TOOLS } from '../../types';

interface CopyToAppsModalProps {
  isOpen: boolean;
  preset: PromptPreset | null;
  onClose: () => void;
  onConfirmCopy: (preset: PromptPreset, targetTools: AIToolId[]) => void;
}

export const CopyToAppsModal: React.FC<CopyToAppsModalProps> = ({
  isOpen,
  preset,
  onClose,
  onConfirmCopy,
}) => {
  if (!isOpen || !preset) return null;

  const currentTool = preset.toolId;
  const availableTools: AIToolId[] = (['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).filter(
    (t) => t !== currentTool
  );

  const [selectedTools, setSelectedTools] = useState<AIToolId[]>([...availableTools]);

  const toggleTool = (toolId: AIToolId) => {
    if (selectedTools.includes(toolId)) {
      setSelectedTools(selectedTools.filter((t) => t !== toolId));
    } else {
      setSelectedTools([...selectedTools, toolId]);
    }
  };

  const handleCopy = () => {
    if (selectedTools.length === 0) {
      alert('Please select at least one target application.');
      return;
    }
    onConfirmCopy(preset, selectedTools);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-semibold text-white">Copy Preset to Other Tools</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Source preset: <span className="text-amber-400 font-medium">{preset.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-3 text-xs">
          <p className="text-neutral-300">
            Create independent prompt copies in the selected application libraries. Copied prompts start as inactive so they will not override existing active presets.
          </p>

          <div className="space-y-2 pt-2">
            {availableTools.map((toolId) => {
              const meta = AI_TOOLS[toolId];
              const isChecked = selectedTools.includes(toolId);

              return (
                <div
                  key={toolId}
                  onClick={() => toggleTool(toolId)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    isChecked
                      ? 'border-neutral-700 bg-neutral-950 text-white'
                      : 'border-neutral-800/80 bg-neutral-950/40 text-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: meta.accentColor }}
                    />
                    <div>
                      <div className="font-semibold text-neutral-200">{meta.name}</div>
                      <div className="text-[11px] font-mono text-neutral-500">
                        Target: {meta.promptFilename}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center ${
                      isChecked ? 'bg-amber-500 text-neutral-950' : 'border border-neutral-700'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={selectedTools.length === 0}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Create Copies</span>
          </button>
        </div>
      </div>
    </div>
  );
};
