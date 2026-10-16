/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  AlertTriangle,
  FolderDown,
  GitMerge,
  FileText,
  Upload,
} from 'lucide-react';
import { AIToolId, McpServer, AI_TOOLS } from '../../types';
import { generateToolMcpConfig } from '../../services/mcpSerializers';
import { downloadTextFile } from '../../services/zipService';
import { CodeViewer } from '../common/CodeViewer';

interface McpExportModalProps {
  isOpen: boolean;
  servers: McpServer[];
  initialTool?: AIToolId;
  redactSecrets?: boolean;
  onClose: () => void;
  onOpenWorkspaceExport: () => void;
}

export const McpExportModal: React.FC<McpExportModalProps> = ({
  isOpen,
  servers,
  initialTool = 'claude',
  redactSecrets = true,
  onClose,
  onOpenWorkspaceExport,
}) => {
  if (!isOpen) return null;

  const [selectedTool, setSelectedTool] = useState<AIToolId>(initialTool);
  const [mergeMode, setMergeMode] = useState(false);
  const [existingConfigText, setExistingConfigText] = useState('');
  const [copied, setCopied] = useState(false);

  const exportResult = generateToolMcpConfig(selectedTool, servers, {
    redactSecrets,
    existingConfig: mergeMode && existingConfigText.trim() ? existingConfigText : undefined,
  });

  const toolMeta = AI_TOOLS[selectedTool];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportResult.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    const filename =
      selectedTool === 'claude'
        ? '.claude.json'
        : selectedTool === 'codex'
        ? 'config.toml'
        : selectedTool === 'pi'
        ? 'mcp.json'
        : 'opencode.json';
    const mime = selectedTool === 'codex' ? 'text/plain' : 'application/json';
    downloadTextFile(exportResult.content, filename, mime);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setExistingConfigText((event.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-4xl w-full shadow-2xl p-6 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-white">Export MCP Server Configurations</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Review and copy formatted configurations for your target AI coding tool.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tool Selector Tabs */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-neutral-800">
          {(['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).map((toolId) => {
            const meta = AI_TOOLS[toolId];
            const isSelected = selectedTool === toolId;
            const count = servers.filter((s) => s.enabledTools[toolId]).length;

            return (
              <button
                key={toolId}
                onClick={() => setSelectedTool(toolId)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                  isSelected
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: meta.accentColor }}
                />
                <span>{meta.name}</span>
                <span className="font-mono tabular-nums text-[11px] text-neutral-500">
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Metadata & Warnings */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
            <div>
              <div className="text-neutral-400">
                Suggested target file destination:
              </div>
              <div className="font-mono text-amber-300 font-semibold mt-0.5">
                {exportResult.filePath}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMergeMode(!mergeMode)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  mergeMode
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>{mergeMode ? 'Merging with Existing' : 'Merge with Existing File'}</span>
              </button>
            </div>
          </div>

          {/* Merge panel if active */}
          {mergeMode && (
            <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-200">
                  Paste or upload your current {toolMeta.mcpPath} content to merge non-destructively:
                </span>
                <label className="cursor-pointer text-amber-400 hover:text-amber-300 flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept=".json,.toml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={4}
                value={existingConfigText}
                onChange={(e) => setExistingConfigText(e.target.value)}
                placeholder={`Paste your existing ${exportResult.filePath} here...`}
                className="w-full p-2.5 font-mono text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 resize-none"
              />
              <p className="text-[11px] text-neutral-500">
                Non-destructive merge: Agent Config Studio injects only the enabled MCP servers and keeps all other existing settings intact.
              </p>
            </div>
          )}

          {/* Warnings */}
          {exportResult.warnings.length > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Export Notices:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-2 text-amber-400">
                {exportResult.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Backup Caution Notice */}
          <div className="text-[11px] text-neutral-400 flex items-center gap-2 px-1">
            <AlertTriangle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <span>
              Always back up your existing <code className="font-mono text-neutral-300">{exportResult.filePath}</code> file before replacing it.
            </span>
          </div>

          {/* Code Viewer */}
          <CodeViewer
            code={exportResult.content}
            language={toolMeta.mcpFormat}
            filename={exportResult.filePath}
            maxHeight="360px"
          />

          {/* Installation Guidance */}
          <div className="p-3.5 rounded-lg border border-neutral-800 bg-neutral-950/60 text-xs text-neutral-400 space-y-1">
            <span className="font-semibold text-neutral-300 block">
              Manual Setup Instructions for {toolMeta.name}:
            </span>
            <ol className="list-decimal list-inside space-y-1 text-neutral-400 pl-1">
              <li>
                Download or copy the generated configuration above.
              </li>
              <li>
                Open or create <code className="font-mono text-neutral-200">{exportResult.filePath}</code> on your computer.
              </li>
              <li>
                Paste the configuration and replace any <code className="font-mono text-amber-400">***REDACTED_SECRET***</code> placeholders with your real API credentials.
              </li>
              <li>
                Restart or launch <strong className="text-neutral-200">{toolMeta.name}</strong> to inspect the enabled MCP tools.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onOpenWorkspaceExport}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5"
          >
            <FolderDown className="w-3.5 h-3.5 text-amber-400" />
            <span>Need a complete ZIP with Skills & Prompts? Open Export Center</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Configuration</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
