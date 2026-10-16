/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  FileCode2,
  FolderTree,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
  Eye,
  Sliders,
  Check,
} from 'lucide-react';
import { Skill, SkillFile, AIToolId, AI_TOOLS } from '../../types';
import { slugify } from '../../services/mcpParsers';
import { parseSkillFrontmatter } from '../../services/zipService';

interface SkillEditorDrawerProps {
  isOpen: boolean;
  skillToEdit?: Skill | null;
  existingIds: string[];
  onClose: () => void;
  onSave: (skill: Skill) => void;
}

export const SkillEditorDrawer: React.FC<SkillEditorDrawerProps> = ({
  isOpen,
  skillToEdit,
  existingIds,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(skillToEdit);

  const [activeTab, setActiveTab] = useState<'markdown' | 'preview' | 'files' | 'config'>('markdown');

  // Metadata
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [category, setCategory] = useState('');
  const [sourceType, setSourceType] = useState<'local' | 'github'>('local');
  const [sourceRepo, setSourceRepo] = useState('');
  const [sourcePath, setSourcePath] = useState('');

  // SKILL.md content
  const [skillMdContent, setSkillMdContent] = useState('');

  // Additional files
  const [files, setFiles] = useState<SkillFile[]>([]);
  const [selectedFileIdx, setSelectedFileIdx] = useState<number | null>(null);
  const [newFilePath, setNewFilePath] = useState('');

  // Target tools enablement
  const [enabledTools, setEnabledTools] = useState<Record<AIToolId, boolean>>({
    claude: true,
    codex: true,
    pi: true,
    opencode: true,
  });

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (skillToEdit) {
      setId(skillToEdit.id);
      setName(skillToEdit.name);
      setDescription(skillToEdit.description);
      setTagsInput(skillToEdit.tags.join(', '));
      setCategory(skillToEdit.category || 'Engineering');
      setSourceType(skillToEdit.sourceType);
      setSourceRepo(skillToEdit.sourceRepo || '');
      setSourcePath(skillToEdit.sourcePath || '');
      setSkillMdContent(skillToEdit.skillMdContent);
      setFiles([...skillToEdit.files]);
      setEnabledTools({ ...skillToEdit.enabledTools });
    } else {
      const defaultId = 'new-agent-skill';
      setId(defaultId);
      setName('New Agent Skill');
      setDescription('Instructions for AI agent behavior and domain guidelines.');
      setTagsInput('utility, agent');
      setCategory('General');
      setSourceType('local');
      setSourceRepo('');
      setSourcePath('');

      const initialMd = `---
name: new-agent-skill
description: Instructions for AI agent behavior and domain guidelines.
tags: [utility, agent]
---

# New Agent Skill

## When to use
Describe under what circumstances this skill should be leveraged by the agent.

## Instructions
1. First step.
2. Second step.
3. Third step.
`;
      setSkillMdContent(initialMd);
      setFiles([
        {
          path: 'SKILL.md',
          content: initialMd,
        },
      ]);
      setEnabledTools({
        claude: true,
        codex: true,
        pi: true,
        opencode: true,
      });
    }
  }, [skillToEdit, isOpen]);

  // Keep frontmatter updated or parse on change
  const handleMdChange = (newMd: string) => {
    setSkillMdContent(newMd);
    // Parse frontmatter
    const { name: parsedName, description: parsedDesc, tags: parsedTags } = parseSkillFrontmatter(newMd);
    if (parsedName && parsedName !== 'new-skill' && parsedName !== name) {
      setName(parsedName);
    }
    if (parsedDesc && parsedDesc !== description) {
      setDescription(parsedDesc);
    }
    if (parsedTags.length > 0) {
      setTagsInput(parsedTags.join(', '));
    }

    // Also update SKILL.md in files array
    const updatedFiles = files.map((f) =>
      f.path.toLowerCase() === 'skill.md' ? { ...f, content: newMd } : f
    );
    setFiles(updatedFiles);
  };

  const handleAddFile = () => {
    const cleanPath = newFilePath.trim().replace(/^\/+/, '');
    if (!cleanPath) return;

    if (files.some((f) => f.path === cleanPath)) {
      alert(`File "${cleanPath}" already exists.`);
      return;
    }

    const newFile: SkillFile = {
      path: cleanPath,
      content: `# ${cleanPath}\n\nEnter supporting documentation or code here.`,
    };

    setFiles([...files, newFile]);
    setSelectedFileIdx(files.length);
    setNewFilePath('');
  };

  const handleRemoveFile = (index: number) => {
    const file = files[index];
    if (file.path.toLowerCase() === 'skill.md') {
      alert('SKILL.md cannot be deleted as it is the core skill manifest.');
      return;
    }
    setFiles(files.filter((_, i) => i !== index));
    if (selectedFileIdx === index) {
      setSelectedFileIdx(null);
    } else if (selectedFileIdx !== null && selectedFileIdx > index) {
      setSelectedFileIdx(selectedFileIdx - 1);
    }
  };

  const handleFileContentChange = (content: string) => {
    if (selectedFileIdx === null) return;
    const updated = [...files];
    updated[selectedFileIdx] = { ...updated[selectedFileIdx], content };
    setFiles(updated);

    if (updated[selectedFileIdx].path.toLowerCase() === 'skill.md') {
      setSkillMdContent(content);
    }
  };

  const toggleToolEnablement = (toolId: AIToolId) => {
    setEnabledTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const handleSave = () => {
    const errs: string[] = [];
    const finalId = id.trim();

    if (!finalId) {
      errs.push('Directory slug/identifier is required.');
    } else if (!isEditing && existingIds.includes(finalId)) {
      errs.push(`Skill with identifier "${finalId}" already exists. Please choose a unique slug.`);
    }

    if (!name.trim()) {
      errs.push('Skill display name is required.');
    }

    if (!skillMdContent.trim()) {
      errs.push('SKILL.md content is required.');
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    // Ensure SKILL.md is in files list
    let finalFiles = [...files];
    const skillMdIdx = finalFiles.findIndex((f) => f.path.toLowerCase() === 'skill.md');
    if (skillMdIdx >= 0) {
      finalFiles[skillMdIdx] = { path: 'SKILL.md', content: skillMdContent };
    } else {
      finalFiles.unshift({ path: 'SKILL.md', content: skillMdContent });
    }

    const savedSkill: Skill = {
      id: finalId,
      name: name.trim(),
      description: description.trim(),
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      category: category.trim() || 'General',
      sourceType,
      sourceRepo: sourceRepo.trim() || undefined,
      sourcePath: sourcePath.trim() || undefined,
      version: skillToEdit?.version || '1.0.0',
      lastImportedAt: Date.now(),
      skillMdContent,
      files: finalFiles,
      enabledTools,
      createdAt: skillToEdit?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSave(savedSkill);
  };

  const activeFile = selectedFileIdx !== null ? files[selectedFileIdx] : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="h-16 px-6 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
          <div>
            <h2 className="text-base font-semibold text-white">
              {isEditing ? `Edit Skill: ${skillToEdit?.name}` : 'Create New Skill'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Reusable agent instructions, YAML frontmatter, and supporting file assets
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tabs */}
            <div className="flex items-center p-0.5 bg-neutral-800 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('markdown')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'markdown' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <FileCode2 className="w-3 h-3" />
                <span>SKILL.md</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preview' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('files')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'files' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <FolderTree className="w-3 h-3" />
                <span>Files ({files.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'config' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Metadata</span>
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

        {/* Errors banner */}
        {errors.length > 0 && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Please fix the following:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-rose-400 pl-2">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'markdown' && (
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>SKILL.md source with YAML frontmatter. Frontmatter updates sync with metadata.</span>
                <span className="font-mono text-[11px] text-neutral-500">
                  {skillMdContent.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                value={skillMdContent}
                onChange={(e) => handleMdChange(e.target.value)}
                className="w-full flex-1 min-h-[460px] p-4 bg-neutral-950 font-mono text-xs text-neutral-200 border border-neutral-800 rounded-lg focus:outline-hidden focus:border-amber-500/50 resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="p-5 rounded-lg border border-neutral-800 bg-neutral-950 min-h-[460px] text-xs text-neutral-300 space-y-4">
              <div className="p-3 rounded bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-400">
                Frontmatter: name: <span className="text-amber-400">{name}</span> | slug:{' '}
                <span className="text-amber-400">{id}</span>
              </div>
              <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3 whitespace-pre-wrap font-sans">
                {skillMdContent.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').trim()}
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-neutral-300 mb-1">
                  Supporting Files & Directories
                </h3>
                <p className="text-xs text-neutral-400">
                  Add referenced guides, checklists, or scripts (e.g. <code>references/guide.md</code>, <code>scripts/checker.py</code>).
                </p>
              </div>

              {/* Add file bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  placeholder="Relative path, e.g. references/checklist.md"
                  className="flex-1 h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:border-neutral-700"
                />
                <button
                  type="button"
                  onClick={handleAddFile}
                  className="h-8 px-3.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create File</span>
                </button>
              </div>

              {/* Files Manager Split */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* File list */}
                <div className="space-y-1 rounded-lg border border-neutral-800 bg-neutral-950 p-2 max-h-[380px] overflow-y-auto">
                  {files.map((file, idx) => {
                    const isSelected = selectedFileIdx === idx;
                    const isMain = file.path.toLowerCase() === 'skill.md';

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedFileIdx(idx)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-neutral-800 text-white font-medium'
                            : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          <span className="truncate">{file.path}</span>
                        </div>
                        {!isMain && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(idx);
                            }}
                            className="p-1 text-neutral-500 hover:text-rose-400 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* File Content Editor */}
                <div className="md:col-span-2 flex flex-col min-h-[380px]">
                  {activeFile ? (
                    <div className="flex-1 flex flex-col space-y-2">
                      <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-800 pb-1.5">
                        <span className="font-mono text-neutral-300">{activeFile.path}</span>
                        <span className="text-[11px] text-neutral-500">
                          {activeFile.content.length} bytes
                        </span>
                      </div>
                      <textarea
                        value={activeFile.content}
                        onChange={(e) => handleFileContentChange(e.target.value)}
                        className="w-full flex-1 p-3 bg-neutral-950 font-mono text-xs text-neutral-200 border border-neutral-800 rounded-lg focus:outline-hidden focus:border-amber-500/50 resize-none leading-relaxed"
                        spellCheck={false}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-neutral-800 rounded-lg text-xs text-neutral-500">
                      Select a file to inspect or edit its contents.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2">
                Skill Metadata & Target Export Toggles
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Directory Slug (ID) *
                  </label>
                  <input
                    type="text"
                    value={id}
                    disabled={isEditing}
                    onChange={(e) => setId(slugify(e.target.value))}
                    placeholder="e.g. code-review"
                    className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono disabled:opacity-60"
                  />
                  <span className="text-[11px] text-neutral-500 mt-0.5 block">
                    Folder name inside ~/.claude/skills/&lt;slug&gt;
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Code Review Specialist"
                    className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short explanation of what this agent skill accomplishes..."
                  className="w-full p-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Engineering, Design, Testing..."
                    className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="audit, pr, git"
                    className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200"
                  />
                </div>
              </div>

              {/* Target Tool Export Toggles */}
              <div className="pt-2">
                <label className="block text-xs font-medium text-neutral-300 mb-2">
                  Target Export Applications
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).map((toolId) => {
                    const isEnabled = enabledTools[toolId];
                    const toolMeta = AI_TOOLS[toolId];

                    return (
                      <div
                        key={toolId}
                        onClick={() => toggleToolEnablement(toolId)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isEnabled
                            ? 'border-neutral-700 bg-neutral-950 text-white'
                            : 'border-neutral-800/60 bg-neutral-950/40 text-neutral-500 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: toolMeta.accentColor }}
                          />
                          <div>
                            <div className="font-medium text-xs text-neutral-200">
                              {toolMeta.name}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono">
                              {toolMeta.skillsPath}/{id}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                            isEnabled ? 'bg-amber-500 text-neutral-950' : 'border border-neutral-700'
                          }`}
                        >
                          {isEnabled && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
          <div className="text-xs text-neutral-500">
            Stored in browser IndexedDB library.
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
              <span>{isEditing ? 'Save Changes' : 'Create Skill'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
