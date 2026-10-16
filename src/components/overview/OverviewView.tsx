/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Cpu,
  Sparkles,
  FileCode2,
  FolderOutput,
  Info,
  ArrowRight,
  ExternalLink,
  Check,
  Shield,
  Download,
} from 'lucide-react';
import { McpServer, Skill, PromptPreset, AIToolId, AI_TOOLS } from '../../types';

interface OverviewViewProps {
  mcpServers: McpServer[];
  skills: Skill[];
  prompts: PromptPreset[];
  onNavigate: (nav: 'mcp' | 'skills' | 'prompts' | 'export') => void;
  onOpenMcpAdd: () => void;
  onOpenSkillAdd: () => void;
  onOpenPromptAdd: () => void;
  onExportTool: (toolId: AIToolId) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  mcpServers,
  skills,
  prompts,
  onNavigate,
  onOpenMcpAdd,
  onOpenSkillAdd,
  onOpenPromptAdd,
  onExportTool,
}) => {
  const tools: AIToolId[] = ['claude', 'codex', 'pi', 'opencode'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top Banner: Crucial Concept Explanation */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-neutral-300 flex items-start gap-3.5">
        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="font-semibold text-amber-300 tracking-wide uppercase text-[11px]">
            Browser Sandbox Architecture & Export Model
          </div>
          <p className="text-neutral-300 leading-relaxed">
            <span className="font-semibold text-white">Enabling</span> an MCP server, Skill, or Prompt in this studio includes it in that tool's generated export file or ZIP archive.
            This application operates entirely in your browser without local filesystem access—it does <strong>not</strong> directly overwrite files on your system. Generate exports here, then apply them with full control.
          </p>
        </div>
      </div>

      {/* Main Stats Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('mcp')}
          className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-neutral-300">MCP Servers</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-white font-mono tabular-nums">
            {mcpServers.length}
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            Stdio, HTTP & SSE connection definitions
          </p>
        </div>

        <div
          onClick={() => onNavigate('skills')}
          className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-neutral-300">Agent Skills</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-white font-mono tabular-nums">
            {skills.length}
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            Reusable SKILL.md packages with supporting assets
          </p>
        </div>

        <div
          onClick={() => onNavigate('prompts')}
          className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 hover:border-neutral-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-neutral-400 mb-3">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-medium text-neutral-300">Prompt Presets</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-white font-mono tabular-nums">
            {prompts.length}
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            System instruction presets for terminal coding agents
          </p>
        </div>
      </div>

      {/* Target Environments Grid: The 4 Supported Tools */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Target AI Coding Applications
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Current configuration enablement across the four supported environments
            </p>
          </div>
          <button
            onClick={() => onNavigate('export')}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-medium transition-colors"
          >
            <span>Open Export Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((toolId) => {
            const meta = AI_TOOLS[toolId];
            const enabledMcps = mcpServers.filter((s) => s.enabledTools[toolId]);
            const enabledSkills = skills.filter((s) => s.enabledTools[toolId]);
            const activePrompt = prompts.find((p) => p.toolId === toolId && p.isActive);

            return (
              <div
                key={toolId}
                className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 flex flex-col justify-between hover:border-neutral-700 transition-colors"
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

                  <p className="text-xs text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
                    {meta.description}
                  </p>

                  <div className="space-y-2.5 py-3 border-y border-neutral-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">MCP Servers</span>
                      <span className="font-mono tabular-nums text-neutral-200 font-medium">
                        {enabledMcps.length} enabled
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Skills</span>
                      <span className="font-mono tabular-nums text-neutral-200 font-medium">
                        {enabledSkills.length} enabled
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Active Prompt</span>
                      <span className="font-medium text-neutral-200 truncate max-w-[120px] text-right" title={activePrompt?.name || 'None'}>
                        {activePrompt ? activePrompt.name : <span className="text-neutral-500">None</span>}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] font-mono text-neutral-400 space-y-1">
                    <div className="truncate" title={`MCP Target: ${meta.mcpPath}`}>
                      MCP: <span className="text-neutral-300">{meta.mcpPath}</span>
                    </div>
                    <div className="truncate" title={`Prompt Target: ${meta.promptPath}`}>
                      Prompt: <span className="text-neutral-300">{meta.promptFilename}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3">
                  <button
                    onClick={() => onExportTool(toolId)}
                    className="w-full h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Export {meta.shortName}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Launch & Resource Manager */}
      <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/30">
        <h3 className="text-sm font-semibold text-white mb-1">Quick Actions</h3>
        <p className="text-xs text-neutral-400 mb-4">
          Add or configure resources to bundle into your export targets.
        </p>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={onOpenMcpAdd}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 hover:text-white flex items-center gap-2 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Add MCP Server</span>
          </button>

          <button
            onClick={onOpenSkillAdd}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 hover:text-white flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Add Skill</span>
          </button>

          <button
            onClick={onOpenPromptAdd}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 hover:text-white flex items-center gap-2 transition-colors"
          >
            <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Add Prompt Preset</span>
          </button>

          <button
            onClick={() => onNavigate('export')}
            className="px-4 py-2 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-semibold flex items-center gap-2 transition-colors ml-auto shadow-xs"
          >
            <FolderOutput className="w-3.5 h-3.5 text-neutral-900" />
            <span>Generate Workspace Bundle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
