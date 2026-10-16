/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileCode2,
  Plus,
  Upload,
  Download,
  Copy,
  Check,
  Search,
  CheckCircle2,
  Circle,
  MoreVertical,
  Edit2,
  Trash2,
  CopyPlus,
  ArrowRight,
  Info,
  Archive,
} from 'lucide-react';
import { PromptPreset, AIToolId, AI_TOOLS } from '../../types';
import { downloadTextFile, downloadBlob } from '../../services/zipService';
import JSZip from 'jszip';

interface PromptsViewProps {
  prompts: PromptPreset[];
  activeTool: AIToolId;
  onSelectTool: (toolId: AIToolId) => void;
  onAddPrompt: () => void;
  onOpenImport: () => void;
  onEditPrompt: (preset: PromptPreset) => void;
  onDuplicatePrompt: (preset: PromptPreset) => void;
  onDeletePrompt: (id: string) => void;
  onToggleActive: (id: string, toolId: AIToolId) => void;
  onOpenCopyToApps: (preset: PromptPreset) => void;
}

export const PromptsView: React.FC<PromptsViewProps> = ({
  prompts,
  activeTool,
  onSelectTool,
  onAddPrompt,
  onOpenImport,
  onEditPrompt,
  onDuplicatePrompt,
  onDeletePrompt,
  onToggleActive,
  onOpenCopyToApps,
}) => {
  const [search, setSearch] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const toolMeta = AI_TOOLS[activeTool];
  const toolPrompts = prompts.filter((p) => p.toolId === activeTool);

  const filteredPrompts = toolPrompts.filter((p) => {
    return (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const activePreset = toolPrompts.find((p) => p.isActive);

  const handleCopyText = async (preset: PromptPreset) => {
    try {
      await navigator.clipboard.writeText(preset.content);
      alert(`Prompt "${preset.name}" content copied to clipboard.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadActive = () => {
    if (!activePreset) {
      alert('No prompt preset is currently active for this tool.');
      return;
    }
    const filename =
      activeTool === 'claude'
        ? 'CLAUDE.md'
        : activeTool === 'pi' && activePreset.piPromptType === 'APPEND_SYSTEM'
        ? 'APPEND_SYSTEM.md'
        : activeTool === 'pi' && activePreset.piPromptType === 'SYSTEM'
        ? 'SYSTEM.md'
        : 'AGENTS.md';
    downloadTextFile(activePreset.content, filename, 'text/markdown');
  };

  const handleDownloadAllActiveZip = async () => {
    const zip = new JSZip();
    const activeClaude = prompts.find((p) => p.toolId === 'claude' && p.isActive);
    const activeCodex = prompts.find((p) => p.toolId === 'codex' && p.isActive);
    const activePi = prompts.find((p) => p.toolId === 'pi' && p.isActive);
    const activeOpenCode = prompts.find((p) => p.toolId === 'opencode' && p.isActive);

    let count = 0;
    if (activeClaude) {
      zip.file('CLAUDE.md', activeClaude.content);
      count++;
    }
    if (activeCodex) {
      zip.file('codex-AGENTS.md', activeCodex.content);
      count++;
    }
    if (activePi) {
      const piFilename =
        activePi.piPromptType === 'APPEND_SYSTEM'
          ? 'pi-APPEND_SYSTEM.md'
          : activePi.piPromptType === 'SYSTEM'
          ? 'pi-SYSTEM.md'
          : 'pi-AGENTS.md';
      zip.file(piFilename, activePi.content);
      count++;
    }
    if (activeOpenCode) {
      zip.file('opencode-AGENTS.md', activeOpenCode.content);
      count++;
    }

    if (count === 0) {
      alert('No prompt presets are currently active across any tool.');
      return;
    }

    zip.file(
      'README.md',
      `# Active System Prompts Archive\n\nContains active markdown prompt files for your AI coding agents.`
    );

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'active-prompts-bundle.zip');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Banner Notice */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-xs text-neutral-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-neutral-200 font-medium">Single Active Prompt Rule:</span>
          <p>
            Each AI coding tool has exactly <strong>one</strong> active prompt preset at a time. Selecting a preset for export automatically deactivates the previous preset for that tool. Presets across different tools remain strictly independent.
          </p>
        </div>
      </div>

      {/* Tool Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).map((t) => {
            const meta = AI_TOOLS[t];
            const isSelected = activeTool === t;
            const count = prompts.filter((p) => p.toolId === t).length;
            const activeP = prompts.find((p) => p.toolId === t && p.isActive);

            return (
              <button
                key={t}
                onClick={() => onSelectTool(t)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                  isSelected
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: meta.accentColor }}
                />
                <span>{meta.name}</span>
                <span className="font-mono text-[11px] text-neutral-500">
                  ({count})
                </span>
                {activeP && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={`Active: ${activeP.name}`} />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImport}
            className="h-8 px-3 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-400" />
            <span>Import</span>
          </button>

          <button
            onClick={handleDownloadAllActiveZip}
            className="h-8 px-3 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Download ZIP with active prompt for each tool"
          >
            <Archive className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Active Prompts ZIP</span>
          </button>

          <button
            onClick={onAddPrompt}
            className="h-8 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Preset</span>
          </button>
        </div>
      </div>

      {/* Target Destination Info Strip */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <div className="text-neutral-400">
            Target Destination for {toolMeta.name}:
          </div>
          <div className="font-mono text-amber-300 font-semibold mt-0.5 flex items-center gap-2">
            <span>{toolMeta.promptPath}</span>
            <span className="text-[11px] text-neutral-500">({toolMeta.promptFilename})</span>
          </div>
          {activeTool === 'pi' && (
            <p className="text-[11px] text-neutral-400 mt-1">
              Pi additionally supports editing <code>SYSTEM.md</code> (replaces base system prompt) and <code>APPEND_SYSTEM.md</code> (appends onto default prompts).
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activePreset ? (
            <button
              onClick={handleDownloadActive}
              className="h-8 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Active ({activePreset.name})</span>
            </button>
          ) : (
            <span className="text-xs text-neutral-500 italic">
              No prompt currently active for {toolMeta.shortName}
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 max-w-sm relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${toolMeta.shortName} prompts...`}
            className="w-full h-8 pl-9 pr-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-neutral-600"
          />
        </div>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrompts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
            <p className="text-sm">No prompt presets for {toolMeta.name}.</p>
            <p className="text-xs mt-1 text-neutral-600">
              Create a new preset or copy one from another AI coding tool.
            </p>
          </div>
        ) : (
          filteredPrompts.map((preset) => {
            const isMenuOpen = activeMenuId === preset.id;
            const wordCount = preset.content.split(/\s+/).filter(Boolean).length;

            return (
              <div
                key={preset.id}
                className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                  preset.isActive
                    ? 'border-emerald-500/40 bg-neutral-900/80 shadow-md shadow-emerald-950/10'
                    : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                }`}
              >
                <div>
                  {/* Top line: Active badge & menu */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleActive(preset.id, activeTool)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          preset.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300'
                        }`}
                        title={preset.isActive ? 'Active for export (click to disable)' : 'Click to make active'}
                      >
                        {preset.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Active Preset</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-3 h-3" />
                            <span>Set Active</span>
                          </>
                        )}
                      </button>

                      {preset.piPromptType && (
                        <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                          {preset.piPromptType}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setActiveMenuId(isMenuOpen ? null : preset.id)}
                        className="p-1 text-neutral-400 hover:text-neutral-200 rounded hover:bg-neutral-800"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 rounded-lg bg-neutral-900 border border-neutral-800 shadow-xl py-1 z-40 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onEditPrompt(preset);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Edit Preset</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleCopyText(preset);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Copy Markdown</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                downloadTextFile(
                                  preset.content,
                                  `${preset.name.toLowerCase().replace(/\s+/g, '-')}.md`
                                );
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Download Markdown</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onOpenCopyToApps(preset);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                            >
                              <CopyPlus className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Copy to Other Apps</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDuplicatePrompt(preset);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                            >
                              <CopyPlus className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Duplicate</span>
                            </button>

                            <div className="my-1 border-t border-neutral-800" />

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDeletePrompt(preset.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-neutral-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm text-neutral-100 mb-1">
                    {preset.name}
                  </h3>
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-3">
                    {preset.description || 'No description provided.'}
                  </p>

                  {/* Markdown snippet */}
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80 text-[11px] font-mono text-neutral-400 max-h-24 overflow-hidden relative">
                    <pre className="whitespace-pre-wrap">{preset.content.slice(0, 150)}</pre>
                    <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-neutral-900 to-transparent pointer-events-none" />
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500 font-mono tabular-nums">
                    {wordCount} words
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenCopyToApps(preset)}
                      className="text-neutral-400 hover:text-white transition-colors"
                      title="Clone to another AI coding tool"
                    >
                      Copy to app
                    </button>
                    <button
                      onClick={() => onEditPrompt(preset)}
                      className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
