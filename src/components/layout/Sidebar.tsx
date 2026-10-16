/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Layers,
  Cpu,
  Sparkles,
  FileCode2,
  FolderOutput,
  Settings,
  Database,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { AppSettings, AI_TOOLS } from '../../types';

interface SidebarProps {
  activeNav: AppSettings['activeNav'];
  onNavigate: (nav: AppSettings['activeNav']) => void;
  mcpCount: number;
  skillsCount: number;
  promptsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeNav,
  onNavigate,
  mcpCount,
  skillsCount,
  promptsCount,
}) => {
  const navItems = [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: Layers,
    },
    {
      id: 'mcp' as const,
      label: 'MCP Servers',
      icon: Cpu,
      badge: mcpCount,
    },
    {
      id: 'skills' as const,
      label: 'Skills',
      icon: Sparkles,
      badge: skillsCount,
    },
    {
      id: 'prompts' as const,
      label: 'Prompts',
      icon: FileCode2,
      badge: promptsCount,
    },
    {
      id: 'export' as const,
      label: 'Export Center',
      icon: FolderOutput,
      highlight: true,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 border-r border-neutral-800 bg-neutral-950 flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-14 px-5 flex items-center gap-3 border-b border-neutral-800/80">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-xs">
          <Cpu className="w-4 h-4 text-neutral-950" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold tracking-tight text-neutral-100 whitespace-nowrap">
            Agent Config Studio
          </span>
          <span className="text-[11px] text-neutral-500 font-mono tracking-tight">
            Local Configuration Hub
          </span>
        </div>
      </div>

      {/* Main Nav Items */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
          Workspace
        </div>

        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-amber-400' : 'text-neutral-500'
                  }`}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </div>
              {typeof item.badge === 'number' && (
                <span
                  className={`text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-neutral-700 text-neutral-200'
                      : 'text-neutral-500'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Supported AI Tools section */}
        <div className="pt-6 px-3 pb-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
          Target Environments
        </div>
        <div className="space-y-1 px-1">
          {Object.values(AI_TOOLS).map((tool) => (
            <div
              key={tool.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-neutral-400 hover:text-neutral-300"
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: tool.accentColor }}
                />
                <span className="text-neutral-300">{tool.name}</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">
                {tool.mcpFormat.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Persistence notice */}
      <div className="p-3 border-t border-neutral-800/80 bg-neutral-900/20 text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5 text-neutral-300 mb-1">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium">IndexedDB Storage</span>
        </div>
        <p className="text-[11px] text-neutral-500 leading-tight">
          Client-only library. Enables configs for manual export & backup.
        </p>
      </div>
    </aside>
  );
};
