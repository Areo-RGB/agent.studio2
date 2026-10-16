/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { PromptPreset, AIToolId, AI_TOOLS } from '../../types';

interface PromptImportModalProps {
  isOpen: boolean;
  defaultTool: AIToolId;
  existingPresets: PromptPreset[];
  onClose: () => void;
  onImportComplete: (preset: PromptPreset) => void;
}

export const PromptImportModal: React.FC<PromptImportModalProps> = ({
  isOpen,
  defaultTool,
  existingPresets,
  onClose,
  onImportComplete,
}) => {
  if (!isOpen) return null;

  const [inputMode, setInputMode] = useState<'paste' | 'upload'>('paste');
  const [targetTool, setTargetTool] = useState<AIToolId>(defaultTool);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!name) {
      setName(file.name.replace(/\.(md|txt)$/i, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setContent((event.target?.result as string) || '');
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleCommit = () => {
    if (!name.trim()) {
      setError('Please provide a name for this prompt preset.');
      return;
    }
    if (!content.trim()) {
      setError('Prompt content cannot be empty.');
      return;
    }

    // Check conflict
    let finalName = name.trim();
    const hasSameName = existingPresets.some(
      (p) => p.toolId === targetTool && p.name.toLowerCase() === finalName.toLowerCase()
    );
    if (hasSameName) {
      finalName = `${finalName} (Imported ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    }

    const newPreset: PromptPreset = {
      id: `prompt-${Date.now().toString().slice(-6)}`,
      name: finalName,
      description: description.trim() || `Imported prompt for ${AI_TOOLS[targetTool].name}`,
      toolId: targetTool,
      tags: ['imported'],
      content: content.trim(),
      isActive: false, // Don't disrupt active preset automatically
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onImportComplete(newPreset);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-xl w-full shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-semibold text-white">Import Prompt Preset</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Paste or upload an existing CLAUDE.md or AGENTS.md markdown file
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Target Tool Library
              </label>
              <select
                value={targetTool}
                onChange={(e) => setTargetTool(e.target.value as AIToolId)}
                className="w-full h-8 px-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200"
              >
                {(['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).map((t) => (
                  <option key={t} value={t}>
                    {AI_TOOLS[t].name} ({AI_TOOLS[t].promptFilename})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Preset Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lead Architect Guidelines"
                className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note on instructions..."
              className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200"
            />
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`px-3 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                inputMode === 'paste' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Markdown</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`px-3 py-1 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                inputMode === 'upload' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File (.md / .txt)</span>
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-xl p-6 text-center bg-neutral-950/40">
              <Upload className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
              <input
                type="file"
                accept=".md,.txt"
                onChange={handleFileUpload}
                className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer text-neutral-400"
              />
            </div>
          ) : (
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# System Instructions&#10;&#10;Enter prompt markdown here..."
              className="w-full p-3 font-mono text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-hidden focus:border-amber-500/50 resize-none leading-relaxed"
              spellCheck={false}
            />
          )}

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div>{error}</div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCommit}
            className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save Preset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
