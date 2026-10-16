/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Copy,
  Download,
  Check,
  Columns,
  Eye,
  FileCode2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { PromptPreset, AIToolId, PiPromptType, AI_TOOLS } from '../../types';
import { downloadTextFile } from '../../services/zipService';

interface PromptEditorDrawerProps {
  isOpen: boolean;
  presetToEdit?: PromptPreset | null;
  defaultTool: AIToolId;
  onClose: () => void;
  onSave: (preset: PromptPreset) => void;
}

const SAMPLE_PROMPT_TEMPLATES = [
  {
    name: 'Code Review & Security Auditor',
    description: 'System instructions for rigorous code auditing and finding OWASP flaws.',
    content: `# Code Review & Security Instructions

You are a Principal Security Engineer and Code Reviewer.

## Principles
1. Check every user input before raw query building.
2. Demand unit tests for all edge cases.
3. Suggest explicit, readable variable names and pure functional transforms.
`,
  },
  {
    name: 'Full-Stack Software Architect',
    description: 'Focuses on boundary separation, clean data models, and maintainable systems.',
    content: `# Software Architect Guidelines

Act as a Principal Architect overseeing full-stack web and cloud systems.

## Directives
- Prefer simple, decoupled architectures over premature abstractions.
- Ensure strict runtime schema validation at network boundaries.
- Minimize external dependencies when native browser/Node APIs suffice.
`,
  },
  {
    name: 'Concise Terminal Pair-Programmer',
    description: 'High token efficiency, no conversational fluff, straight to code diffs.',
    content: `# High-Density Coder

Omit pleasantries, conversational commentary, and summary repeats.
Answer questions directly and output precise, copy-pasteable code blocks with minimal explanation.
`,
  },
  {
    name: 'Documentation & API Specialist',
    description: 'Specializes in clear JSDoc, OpenAPI specs, and user guides.',
    content: `# Documentation Specialist

Write clear, accurate technical prose.
- Provide practical code usage snippets.
- Document parameter types, return contracts, and potential error states.
`,
  },
];

export const PromptEditorDrawer: React.FC<PromptEditorDrawerProps> = ({
  isOpen,
  presetToEdit,
  defaultTool,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(presetToEdit);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [toolId, setToolId] = useState<AIToolId>(defaultTool);
  const [piPromptType, setPiPromptType] = useState<PiPromptType>('AGENTS');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (presetToEdit) {
      setName(presetToEdit.name);
      setDescription(presetToEdit.description);
      setToolId(presetToEdit.toolId);
      setPiPromptType(presetToEdit.piPromptType || 'AGENTS');
      setTagsInput(presetToEdit.tags.join(', '));
      setContent(presetToEdit.content);
    } else {
      setName('');
      setDescription('');
      setToolId(defaultTool);
      setPiPromptType('AGENTS');
      setTagsInput('custom');
      setContent(`# System Instructions for ${AI_TOOLS[defaultTool].name}\n\nEnter guidelines here...`);
    }
  }, [presetToEdit, defaultTool, isOpen]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    const filename =
      toolId === 'claude'
        ? 'CLAUDE.md'
        : toolId === 'pi' && piPromptType === 'APPEND_SYSTEM'
        ? 'APPEND_SYSTEM.md'
        : toolId === 'pi' && piPromptType === 'SYSTEM'
        ? 'SYSTEM.md'
        : 'AGENTS.md';
    downloadTextFile(content, filename, 'text/markdown');
  };

  const handleLoadTemplate = (tmpl: typeof SAMPLE_PROMPT_TEMPLATES[0]) => {
    setName(tmpl.name);
    setDescription(tmpl.description);
    setContent(tmpl.content);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Preset name is required.');
      return;
    }
    if (!content.trim()) {
      setError('Content cannot be empty.');
      return;
    }

    const savedPreset: PromptPreset = {
      id: presetToEdit?.id || `prompt-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      description: description.trim(),
      toolId,
      piPromptType: toolId === 'pi' ? piPromptType : undefined,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      content: content.trim(),
      isActive: presetToEdit?.isActive || false,
      createdAt: presetToEdit?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(savedPreset);
  };

  const targetFilename =
    toolId === 'claude'
      ? 'CLAUDE.md'
      : toolId === 'pi' && piPromptType === 'APPEND_SYSTEM'
      ? 'APPEND_SYSTEM.md'
      : toolId === 'pi' && piPromptType === 'SYSTEM'
      ? 'SYSTEM.md'
      : 'AGENTS.md';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="h-16 px-6 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
          <div>
            <h2 className="text-base font-semibold text-white">
              {isEditing ? `Edit Preset: ${presetToEdit?.name}` : 'New Prompt Preset'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
              <span>Target:</span>
              <span className="font-mono text-amber-400">{targetFilename}</span>
              <span>for</span>
              <span className="text-neutral-200">{AI_TOOLS[toolId].name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View layout modes */}
            <div className="flex items-center p-0.5 bg-neutral-800 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  viewMode === 'split' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400'
                }`}
                title="Side-by-side split view"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  viewMode === 'edit' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400'
                }`}
                title="Editor only"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  viewMode === 'preview' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400'
                }`}
                title="Preview only"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Settings Strip */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-950/60 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Target Application
              </label>
              <select
                value={toolId}
                onChange={(e) => setToolId(e.target.value as AIToolId)}
                className="w-full h-8 px-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
              >
                {(['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).map((t) => (
                  <option key={t} value={t}>
                    {AI_TOOLS[t].name} ({AI_TOOLS[t].promptFilename})
                  </option>
                ))}
              </select>
            </div>

            {toolId === 'pi' && (
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Pi File Mode
                </label>
                <select
                  value={piPromptType}
                  onChange={(e) => setPiPromptType(e.target.value as PiPromptType)}
                  className="w-full h-8 px-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
                >
                  <option value="AGENTS">AGENTS.md (Agent directives)</option>
                  <option value="APPEND_SYSTEM">APPEND_SYSTEM.md (Appends to base system)</option>
                  <option value="SYSTEM">SYSTEM.md (Replaces full base system)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Preset Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lead TypeScript Architect"
                className="w-full h-8 px-3 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="frontend, react, rules"
                className="w-full h-8 px-3 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note on instructions..."
              className="w-full h-8 px-3 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200"
            />
          </div>

          {/* Quick sample prompt loader */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-neutral-500">
            <span className="flex items-center gap-1 text-neutral-400 font-medium">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Load sample preset:</span>
            </span>
            {SAMPLE_PROMPT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => handleLoadTemplate(tmpl)}
                className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white"
              >
                {tmpl.name}
              </button>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto flex">
            {/* Editor column */}
            {(viewMode === 'split' || viewMode === 'edit') && (
              <div
                className={`h-full flex flex-col p-4 ${
                  viewMode === 'split' ? 'w-1/2 border-r border-neutral-800' : 'w-full'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-2 font-mono">
                  <span>MARKDOWN SOURCE</span>
                  <span>
                    {wordCount} words · {charCount} characters
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full flex-1 p-3.5 font-mono text-xs bg-neutral-950 text-neutral-200 border border-neutral-800 rounded-lg focus:outline-hidden focus:border-amber-500/50 resize-none leading-relaxed"
                  spellCheck={false}
                />
              </div>
            )}

            {/* Preview column */}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <div
                className={`h-full flex flex-col p-4 bg-neutral-950/40 overflow-y-auto ${
                  viewMode === 'split' ? 'w-1/2' : 'w-full'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-2 font-mono">
                  <span>RENDERED PREVIEW</span>
                  <span className="text-amber-400">{targetFilename}</span>
                </div>
                <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-950 flex-1 overflow-y-auto prose prose-invert max-w-none text-xs font-sans leading-relaxed whitespace-pre-wrap text-neutral-300">
                  {content}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Save Changes' : 'Save Preset'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
