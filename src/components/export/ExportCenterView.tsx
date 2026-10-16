/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FolderOutput,
  Download,
  Copy,
  Check,
  FileCode2,
  Cpu,
  Sparkles,
  Archive,
  Layers,
  Eye,
  FileText,
  AlertTriangle,
  FolderTree,
  Database,
  CheckSquare,
  Square,
  ArrowRight,
  GitMerge,
  Upload,
  X,
} from 'lucide-react';
import { AIToolId, McpServer, Skill, PromptPreset, AI_TOOLS } from '../../types';
import {
  createToolBundleZip,
  createWorkspaceBundleZip,
  createAllEnabledSkillsZip,
  downloadBlob,
  downloadTextFile,
} from '../../services/zipService';
import { generateToolMcpConfig } from '../../services/mcpSerializers';
import { generatePromptExport } from '../../services/promptGenerators';
import { CodeViewer } from '../common/CodeViewer';

interface ExportCenterViewProps {
  mcpServers: McpServer[];
  skills: Skill[];
  prompts: PromptPreset[];
  redactSecrets: boolean;
  onExportFullLibraryJson: () => void;
}

interface VirtualFileNode {
  path: string;
  name: string;
  size: number;
  content: string;
  language: string;
  toolId?: AIToolId;
  type: 'mcp' | 'prompt' | 'skill' | 'doc';
}

export const ExportCenterView: React.FC<ExportCenterViewProps> = ({
  mcpServers,
  skills,
  prompts,
  redactSecrets,
  onExportFullLibraryJson,
}) => {
  const tools: AIToolId[] = ['claude', 'codex', 'pi', 'opencode'];

  const [selectedToolsForWorkspace, setSelectedToolsForWorkspace] = useState<AIToolId[]>([
    'claude',
    'codex',
    'pi',
    'opencode',
  ]);

  // Preview Modal state
  const [previewFiles, setPreviewFiles] = useState<VirtualFileNode[] | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Single tool bundle generation
  const handleExportToolBundle = async (toolId: AIToolId) => {
    setIsExporting(true);
    try {
      const activePrompt = prompts.find((p) => p.toolId === toolId && p.isActive);
      const blob = await createToolBundleZip(
        toolId,
        mcpServers,
        skills,
        activePrompt,
        redactSecrets
      );
      downloadBlob(blob, `${toolId}-config-bundle.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  // Preview single tool bundle before download
  const handlePreviewToolBundle = (toolId: AIToolId) => {
    const toolMeta = AI_TOOLS[toolId];
    const nodes: VirtualFileNode[] = [];

    // 1. MCP
    const mcpExport = generateToolMcpConfig(toolId, mcpServers, { redactSecrets });
    const mcpFilename =
      toolId === 'claude'
        ? '.claude.json'
        : toolId === 'codex'
        ? 'config.toml'
        : toolId === 'pi'
        ? 'mcp.json'
        : 'opencode.json';

    nodes.push({
      path: mcpFilename,
      name: mcpFilename,
      size: mcpExport.content.length,
      content: mcpExport.content,
      language: toolMeta.mcpFormat,
      toolId,
      type: 'mcp',
    });

    // 2. Prompt
    const activePrompt = prompts.find((p) => p.toolId === toolId && p.isActive);
    const promptExport = generatePromptExport(toolId, activePrompt);
    if (promptExport.hasActivePrompt) {
      nodes.push({
        path: promptExport.fileName,
        name: promptExport.fileName,
        size: promptExport.content.length,
        content: promptExport.content,
        language: 'markdown',
        toolId,
        type: 'prompt',
      });
    }

    // 3. Skills
    const enabledSkills = skills.filter((s) => s.enabledTools[toolId]);
    for (const skill of enabledSkills) {
      nodes.push({
        path: `skills/${skill.id}/SKILL.md`,
        name: `${skill.id}/SKILL.md`,
        size: skill.skillMdContent.length,
        content: skill.skillMdContent,
        language: 'markdown',
        toolId,
        type: 'skill',
      });
      for (const f of skill.files) {
        if (f.path !== 'SKILL.md') {
          nodes.push({
            path: `skills/${skill.id}/${f.path}`,
            name: `${skill.id}/${f.path}`,
            size: f.content.length,
            content: f.content,
            language: 'text',
            toolId,
            type: 'skill',
          });
        }
      }
    }

    // 4. README
    nodes.push({
      path: 'README.md',
      name: 'README.md',
      size: 400,
      content: `# ${toolMeta.name} Installation Instructions\n\n1. Copy ${mcpFilename} to ${toolMeta.mcpPath}\n2. Copy prompt to ${toolMeta.promptPath}\n3. Copy skills/ into ${toolMeta.skillsPath}/`,
      language: 'markdown',
      toolId,
      type: 'doc',
    });

    setPreviewTitle(`${toolMeta.name} Bundle Preview`);
    setPreviewFiles(nodes);
    setSelectedFileIdx(0);
  };

  // Preview Workspace Bundle
  const handlePreviewWorkspaceBundle = () => {
    const nodes: VirtualFileNode[] = [];

    for (const toolId of selectedToolsForWorkspace) {
      const toolMeta = AI_TOOLS[toolId];
      // MCP
      const mcpExport = generateToolMcpConfig(toolId, mcpServers, { redactSecrets });
      const mcpFilename =
        toolId === 'claude'
          ? '.claude.json'
          : toolId === 'codex'
          ? 'config.toml'
          : toolId === 'pi'
          ? 'mcp.json'
          : 'opencode.json';

      nodes.push({
        path: `${toolId}/${mcpFilename}`,
        name: `${toolId}/${mcpFilename}`,
        size: mcpExport.content.length,
        content: mcpExport.content,
        language: toolMeta.mcpFormat,
        toolId,
        type: 'mcp',
      });

      // Prompt
      const activePrompt = prompts.find((p) => p.toolId === toolId && p.isActive);
      const promptExport = generatePromptExport(toolId, activePrompt);
      if (promptExport.hasActivePrompt) {
        nodes.push({
          path: `${toolId}/${promptExport.fileName}`,
          name: `${toolId}/${promptExport.fileName}`,
          size: promptExport.content.length,
          content: promptExport.content,
          language: 'markdown',
          toolId,
          type: 'prompt',
        });
      }

      // Skills
      const enabledSkills = skills.filter((s) => s.enabledTools[toolId]);
      for (const skill of enabledSkills) {
        nodes.push({
          path: `${toolId}/skills/${skill.id}/SKILL.md`,
          name: `${toolId}/skills/${skill.id}/SKILL.md`,
          size: skill.skillMdContent.length,
          content: skill.skillMdContent,
          language: 'markdown',
          toolId,
          type: 'skill',
        });
      }
    }

    nodes.push({
      path: 'README.md',
      name: 'README.md',
      size: 350,
      content: `# Master Workspace Bundle\n\nContains configured MCP, prompts, and skills directories for ${selectedToolsForWorkspace.join(', ')}.`,
      language: 'markdown',
      type: 'doc',
    });

    setPreviewTitle('Master Workspace Bundle Preview');
    setPreviewFiles(nodes);
    setSelectedFileIdx(0);
  };

  const handleDownloadWorkspaceBundle = async () => {
    if (selectedToolsForWorkspace.length === 0) {
      alert('Select at least one tool to export.');
      return;
    }
    setIsExporting(true);
    try {
      const blob = await createWorkspaceBundleZip(
        selectedToolsForWorkspace,
        mcpServers,
        skills,
        prompts,
        redactSecrets
      );
      downloadBlob(blob, 'workspace-config-bundle.zip');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleWorkspaceTool = (toolId: AIToolId) => {
    if (selectedToolsForWorkspace.includes(toolId)) {
      setSelectedToolsForWorkspace(selectedToolsForWorkspace.filter((t) => t !== toolId));
    } else {
      setSelectedToolsForWorkspace([...selectedToolsForWorkspace, toolId]);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Banner Notice */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-xs text-neutral-400 flex items-start gap-3">
        <FolderOutput className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-neutral-200 font-medium">Export Center & File Assembly:</span>
          <p>
            Generate valid JSON, TOML, Markdown, and ZIP packages containing your managed configurations. Each export is tailored specifically for the target application's directory format.
          </p>
        </div>
      </div>

      {/* Target Application Cards */}
      <div>
        <h2 className="text-base font-semibold text-white tracking-tight mb-1">
          Application Target Bundles
        </h2>
        <p className="text-xs text-neutral-400 mb-4">
          Export full bundles containing MCP servers, active prompts, and skills for each specific coding agent
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((toolId) => {
            const meta = AI_TOOLS[toolId];
            const enabledMcps = mcpServers.filter((s) => s.enabledTools[toolId]);
            const enabledSkills = skills.filter((s) => s.enabledTools[toolId]);
            const activePrompt = prompts.find((p) => p.toolId === toolId && p.isActive);

            return (
              <div
                key={toolId}
                className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: meta.accentColor }}
                      />
                      <h3 className="font-semibold text-sm text-white">{meta.name}</h3>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                      {meta.mcpFormat}
                    </span>
                  </div>

                  <div className="space-y-2 py-3 border-y border-neutral-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-amber-400" />
                        <span>MCP Servers</span>
                      </span>
                      <span className="font-mono tabular-nums text-neutral-200 font-medium">
                        {enabledMcps.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Skills</span>
                      </span>
                      <span className="font-mono tabular-nums text-neutral-200 font-medium">
                        {enabledSkills.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Prompt</span>
                      </span>
                      <span className="font-medium text-neutral-200 truncate max-w-[120px] text-right" title={activePrompt?.name || 'None'}>
                        {activePrompt ? activePrompt.name : <span className="text-neutral-500">None</span>}
                      </span>
                    </div>
                  </div>

                  {/* Target paths */}
                  <div className="mt-3 text-[10px] font-mono text-neutral-500 space-y-1">
                    <div className="truncate">MCP: {meta.mcpPath}</div>
                    <div className="truncate">Prompt: {meta.promptFilename}</div>
                    <div className="truncate">Skills: {meta.skillsPath}</div>
                  </div>
                </div>

                <div className="mt-5 pt-3 flex items-center gap-2">
                  <button
                    onClick={() => handlePreviewToolBundle(toolId)}
                    className="flex-1 h-8 rounded-lg border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <Eye className="w-3 h-3 text-neutral-400" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => handleExportToolBundle(toolId)}
                    disabled={isExporting}
                    className="flex-1 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <Download className="w-3 h-3 text-amber-400" />
                    <span>Download ZIP</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace Multi-Tool Bundle Card */}
      <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-400" />
              <span>Complete Master Workspace Bundle</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Generates a master ZIP archive containing separate folders for Claude Code, Codex, Pi, and OpenCode
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviewWorkspaceBundle}
              className="h-8 px-3 rounded-lg border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span>Preview Tree</span>
            </button>

            <button
              onClick={handleDownloadWorkspaceBundle}
              disabled={isExporting || selectedToolsForWorkspace.length === 0}
              className="h-8 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Master Workspace ZIP</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-neutral-800/80">
          <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">
            Select Applications to Include in Workspace:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tools.map((toolId) => {
              const meta = AI_TOOLS[toolId];
              const isChecked = selectedToolsForWorkspace.includes(toolId);

              return (
                <label
                  key={toolId}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                    isChecked
                      ? 'border-neutral-700 bg-neutral-950 text-white'
                      : 'border-neutral-800/80 bg-neutral-950/40 text-neutral-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleWorkspaceTool(toolId)}
                      className="rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-0"
                    />
                    <span className="font-medium">{meta.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-neutral-500">
                    {toolId}/
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Other Specialized Export Modes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Full JSON Backup */}
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-semibold text-white">Full Library JSON Backup</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Export complete IndexedDB snapshot of all MCP definitions, skills, prompts, and target application enablement states.
            </p>
          </div>
          <button
            onClick={onExportFullLibraryJson}
            className="mt-4 w-full h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Library Backup (JSON)</span>
          </button>
        </div>

        {/* Enabled Skills Archive */}
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-white">Skills Archive Only</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Download all currently enabled agent skills packaged into their respective application destination directories.
            </p>
          </div>
          <button
            onClick={async () => {
              const blob = await createAllEnabledSkillsZip(skills, tools);
              downloadBlob(blob, 'all-enabled-skills.zip');
            }}
            className="mt-4 w-full h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Download Skills ZIP</span>
          </button>
        </div>

        {/* Sensitive Data Notice */}
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-neutral-400" />
              <h4 className="text-sm font-semibold text-white">Security & Redaction</h4>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {redactSecrets
                ? 'Secret redaction is ENABLED. Tokens and API keys in environment variables will be replaced with placeholders.'
                : 'Secret redaction is DISABLED. Real tokens in environment variables will be included.'}
            </p>
          </div>
          <div className="mt-4 text-[11px] text-neutral-500">
            Configure redaction behavior in Settings.
          </div>
        </div>
      </div>

      {/* Interactive Bundle Preview Modal */}
      {previewFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-4xl w-full shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-amber-400" />
                  <span>{previewTitle}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Inspect generated directory layout and file contents prior to downloading
                </p>
              </div>
              <button
                onClick={() => setPreviewFiles(null)}
                className="p-1 text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Split tree view & preview */}
            <div className="flex-1 overflow-hidden py-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* File list tree */}
              <div className="space-y-1 overflow-y-auto max-h-[460px] p-2 bg-neutral-950 rounded-lg border border-neutral-800">
                <div className="px-2 py-1 text-[10px] font-mono uppercase text-neutral-500 tracking-wider">
                  Generated Files ({previewFiles.length})
                </div>
                {previewFiles.map((file, idx) => {
                  const isSelected = selectedFileIdx === idx;
                  let Icon = FileText;
                  if (file.type === 'mcp') Icon = Cpu;
                  if (file.type === 'prompt') Icon = FileCode2;
                  if (file.type === 'skill') Icon = Sparkles;

                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFileIdx(idx)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono text-left transition-colors ${
                        isSelected
                          ? 'bg-neutral-800 text-white font-medium shadow-xs'
                          : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span className="truncate">{file.path}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 tabular-nums shrink-0 ml-1">
                        {file.size}b
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Code viewer for selected file */}
              <div className="md:col-span-2 overflow-y-auto max-h-[460px] flex flex-col">
                {previewFiles[selectedFileIdx] && (
                  <CodeViewer
                    code={previewFiles[selectedFileIdx].content}
                    language={previewFiles[selectedFileIdx].language}
                    filename={previewFiles[selectedFileIdx].path}
                    maxHeight="420px"
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <div className="text-xs text-neutral-500">
                Approximate download size:{' '}
                <span className="font-mono text-neutral-300">
                  {(previewFiles.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)} KB
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const active = previewFiles[selectedFileIdx];
                    if (active) downloadTextFile(active.content, active.name);
                  }}
                  className="px-3.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  Download Selected File
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (previewTitle.includes('Workspace')) {
                      await handleDownloadWorkspaceBundle();
                    } else {
                      const firstTool = previewFiles[0]?.toolId || 'claude';
                      await handleExportToolBundle(firstTool);
                    }
                    setPreviewFiles(null);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Complete ZIP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
