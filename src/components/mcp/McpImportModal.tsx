/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { McpServer, AIToolId, AI_TOOLS } from '../../types';
import { parseMcpContent, ParsedMcpCandidate } from '../../services/mcpParsers';

interface McpImportModalProps {
  isOpen: boolean;
  existingServers: McpServer[];
  onClose: () => void;
  onImportComplete: (serversToAdd: McpServer[], replacedCount: number) => void;
}

type ConflictResolution = 'replace' | 'rename' | 'skip';

export const McpImportModal: React.FC<McpImportModalProps> = ({
  isOpen,
  existingServers,
  onClose,
  onImportComplete,
}) => {
  if (!isOpen) return null;

  const [inputMethod, setInputMethod] = useState<'paste' | 'upload'>('paste');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Analysis result
  const [candidates, setCandidates] = useState<ParsedMcpCandidate[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<string>('');
  const [analyzed, setAnalyzed] = useState(false);

  // Per candidate conflict resolution
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [targetToolAssociations, setTargetToolAssociations] = useState<Record<AIToolId, boolean>>({
    claude: true,
    codex: true,
    pi: true,
    opencode: true,
  });

  const existingIds = new Set(existingServers.map((s) => s.id));

  const handleAnalyze = () => {
    setParseError(null);
    if (!rawText.trim()) {
      setParseError('Please provide JSON or TOML content to import.');
      return;
    }

    const res = parseMcpContent(rawText, fileName);
    if (res.error) {
      setParseError(res.error);
      setCandidates([]);
      setAnalyzed(false);
      return;
    }

    if (res.candidates.length === 0) {
      setParseError('No MCP server configurations could be identified in the provided content.');
      setCandidates([]);
      setAnalyzed(false);
      return;
    }

    setCandidates(res.candidates);
    setDetectedFormat(res.formatDetected.toUpperCase());
    setAnalyzed(true);

    // Initial resolutions: if exists, default to 'replace', else keep
    const initRes: Record<string, ConflictResolution> = {};
    res.candidates.forEach((c) => {
      if (existingIds.has(c.id)) {
        initRes[c.id] = 'replace';
      }
    });
    setResolutions(initRes);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawText(text);
      setParseError(null);
    };
    reader.readAsText(file);
  };

  const handleCommitImport = () => {
    const validCandidates = candidates.filter((c) => c.isValid);
    const serversToSave: McpServer[] = [];
    let replacedCount = 0;

    for (const c of validCandidates) {
      const hasConflict = existingIds.has(c.id);
      const res = resolutions[c.id] || 'replace';

      if (hasConflict && res === 'skip') {
        continue;
      }

      let finalId = c.id;
      let finalName = c.name;

      if (hasConflict && res === 'rename') {
        finalId = `${c.id}-imported-${Date.now().toString().slice(-4)}`;
        finalName = `${c.name} (Imported)`;
      } else if (hasConflict && res === 'replace') {
        replacedCount++;
      }

      const server: McpServer = {
        id: finalId,
        name: finalName,
        description: c.description || 'Imported MCP server',
        tags: ['imported', c.detectedSource],
        transport: c.transport,
        command: c.command,
        args: c.args,
        env: c.env,
        url: c.url,
        headers: c.headers,
        enabledTools: { ...targetToolAssociations },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isCustom: true,
      };

      serversToSave.push(server);
    }

    onImportComplete(serversToSave, replacedCount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-white">Import MCP Configuration</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Paste or upload Claude Code JSON, Codex TOML, OpenCode JSON, or Pi configs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!analyzed ? (
            <>
              {/* Input Method Tabs */}
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <button
                  type="button"
                  onClick={() => setInputMethod('paste')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    inputMethod === 'paste'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Configuration</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMethod('upload')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    inputMethod === 'upload'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload .json or .toml</span>
                </button>
              </div>

              {inputMethod === 'upload' ? (
                <div className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-xl p-8 text-center bg-neutral-950/40">
                  <Upload className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                  <p className="text-xs text-neutral-300 font-medium">
                    {fileName ? fileName : 'Select a JSON or TOML file from your computer'}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Supports ~/.claude.json, ~/.codex/config.toml, ~/.config/opencode/opencode.json, etc.
                  </p>
                  <input
                    type="file"
                    accept=".json,.toml"
                    onChange={handleFileUpload}
                    className="mt-4 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer text-neutral-400"
                  />
                </div>
              ) : (
                <div>
                  <textarea
                    rows={12}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Paste your JSON or TOML here, e.g.:\n\n{\n  "mcpServers": {\n    "fetch": {\n      "command": "uvx",\n      "args": ["mcp-server-fetch"]\n    }\n  }\n}`}
                    className="w-full p-3 font-mono text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-hidden focus:border-amber-500/50 resize-none leading-relaxed"
                    spellCheck={false}
                  />
                </div>
              )}

              {parseError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>{parseError}</div>
                </div>
              )}
            </>
          ) : (
            /* Analysis & Conflict Resolution Preview */
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-neutral-400">Detected Format: </span>
                  <span className="font-mono font-semibold text-amber-400">{detectedFormat}</span>
                </div>
                <div className="text-neutral-400">
                  <span className="font-semibold text-white">{candidates.length}</span> servers detected
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyzed(false)}
                  className="text-neutral-400 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-paste</span>
                </button>
              </div>

              {/* Candidates list */}
              <div className="space-y-2">
                {candidates.map((cand) => {
                  const hasConflict = existingIds.has(cand.id);
                  const resolution = resolutions[cand.id] || 'replace';

                  return (
                    <div
                      key={cand.id}
                      className={`p-3 rounded-lg border text-xs ${
                        !cand.isValid
                          ? 'border-rose-500/30 bg-rose-500/5'
                          : hasConflict
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-neutral-800 bg-neutral-950'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-200">{cand.name}</span>
                            <span className="font-mono text-[10px] text-neutral-500">({cand.id})</span>
                            <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-[10px] font-mono uppercase text-neutral-400">
                              {cand.transport}
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              from {cand.detectedSource}
                            </span>
                          </div>

                          <div className="text-[11px] font-mono text-neutral-400 mt-1 truncate max-w-md">
                            {cand.transport === 'stdio'
                              ? `${cand.command} ${(cand.args || []).join(' ')}`
                              : cand.url}
                          </div>

                          {cand.error && (
                            <div className="text-rose-400 text-[11px] mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>{cand.error}</span>
                            </div>
                          )}
                        </div>

                        {/* Conflict Controls */}
                        {hasConflict && (
                          <div className="shrink-0 flex items-center gap-2">
                            <span className="text-[11px] text-amber-400 font-medium">Already exists:</span>
                            <select
                              value={resolution}
                              onChange={(e) =>
                                setResolutions((prev) => ({
                                  ...prev,
                                  [cand.id]: e.target.value as ConflictResolution,
                                }))
                              }
                              className="h-7 px-2 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-200"
                            >
                              <option value="replace">Replace</option>
                              <option value="rename">Rename (Keep both)</option>
                              <option value="skip">Skip</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Target Tool Enablement Selection */}
              <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 space-y-2">
                <div className="text-xs font-semibold text-neutral-300">
                  Include imported servers in generated exports for:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).map((toolId) => (
                    <label
                      key={toolId}
                      className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={targetToolAssociations[toolId]}
                        onChange={(e) =>
                          setTargetToolAssociations((prev) => ({
                            ...prev,
                            [toolId]: e.target.checked,
                          }))
                        }
                        className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
                      />
                      <span>{AI_TOOLS[toolId].shortName}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {analyzed ? 'Review conflict resolutions before saving.' : 'Parse configuration to review.'}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {!analyzed ? (
              <button
                type="button"
                onClick={handleAnalyze}
                className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span>Detect Entries</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCommitImport}
                className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Import Detected Servers</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
