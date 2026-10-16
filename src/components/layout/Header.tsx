/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Plus,
  FolderOutput,
  Sun,
  Moon,
  ChevronDown,
  Cpu,
  Sparkles,
  FileCode2,
  X,
} from 'lucide-react';
import { AppSettings } from '../../types';

interface HeaderProps {
  activeNav: AppSettings['activeNav'];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme: AppSettings['theme'];
  onToggleTheme: () => void;
  onQuickAdd: (type: 'mcp' | 'skill' | 'prompt') => void;
  onQuickExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNav,
  searchQuery,
  onSearchChange,
  theme,
  onToggleTheme,
  onQuickAdd,
  onQuickExport,
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const sectionTitles: Record<AppSettings['activeNav'], { title: string; subtitle: string }> = {
    overview: { title: 'Overview', subtitle: 'Agent Configuration Dashboard' },
    mcp: { title: 'MCP Servers', subtitle: 'Model Context Protocol Server Registry' },
    skills: { title: 'Skills Management', subtitle: 'Reusable SKILL.md Agent Instructions & Assets' },
    prompts: { title: 'Prompts & System Instructions', subtitle: 'Application-Specific Prompt Presets' },
    export: { title: 'Export Center', subtitle: 'Package Bundles & System Destination Files' },
    settings: { title: 'Settings', subtitle: 'Storage, Backups & Preferences' },
  };

  const current = sectionTitles[activeNav];

  return (
    <header className="h-14 border-b border-neutral-800 bg-neutral-950 px-6 flex items-center justify-between gap-6 shrink-0 z-20">
      {/* Zone 1: Section Title */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <h1 className="text-sm font-semibold text-neutral-100 whitespace-nowrap">
          {current.title}
        </h1>
        <span className="text-neutral-600 hidden md:inline">/</span>
        <span className="text-xs text-neutral-500 hidden md:inline truncate">
          {current.subtitle}
        </span>
      </div>

      {/* Zone 2: Global Search */}
      <div className="flex-1 max-w-md relative hidden sm:block">
        <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search MCPs, skills, prompts..."
          className="w-full h-8 pl-9 pr-8 text-xs rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-neutral-600 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-500 hover:text-neutral-300 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Zone 3: Actions & Theme */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quick Add Menu */}
        <div className="relative">
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="h-8 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Resource</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {isAddMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsAddMenuOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-44 rounded-lg bg-neutral-900 border border-neutral-800 shadow-xl py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    onQuickAdd('mcp');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add MCP Server</span>
                </button>
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    onQuickAdd('skill');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Skill</span>
                </button>
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    onQuickAdd('prompt');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Add Prompt Preset</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Quick Export Center button */}
        <button
          onClick={onQuickExport}
          className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <FolderOutput className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Export Bundles</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="h-8 w-8 rounded-lg border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 flex items-center justify-center transition-colors"
          aria-label="Toggle theme mode"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
          )}
        </button>
      </div>
    </header>
  );
};
