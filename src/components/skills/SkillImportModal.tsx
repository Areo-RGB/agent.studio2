/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Archive,
  AlertCircle,
  CheckCircle2,
  FolderTree,
  ArrowRight,
} from 'lucide-react';
import { Skill, SkillFile, AIToolId, AI_TOOLS } from '../../types';
import { parseSkillsFromZip, parseSkillFrontmatter, ImportedSkillData } from '../../services/zipService';
import { slugify } from '../../services/mcpParsers';
import { SkillsCliImportPanel } from './SkillsCliImportPanel';

interface SkillImportModalProps {
  isOpen: boolean;
  existingSkills: Skill[];
  onClose: () => void;
  onImportComplete: (skillsToAdd: Skill[], replacedCount: number) => void;
}

type ConflictResolution = 'replace' | 'rename' | 'skip';

export const SkillImportModal: React.FC<SkillImportModalProps> = ({
  isOpen,
  existingSkills,
  onClose,
  onImportComplete,
}) => {
  const [inputMode, setInputMode] = useState<'zip' | 'file' | 'paste' | 'cli'>('zip');
  const [pastedText, setPastedText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Parsed candidates
  const [candidates, setCandidates] = useState<ImportedSkillData[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [targetToolAssociations, setTargetToolAssociations] = useState<Record<AIToolId, boolean>>({
    claude: true,
    codex: true,
    pi: true,
    opencode: true,
  });

  const existingIds = new Set(existingSkills.map((s) => s.id));

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds safety limit of 25MB.');
      return;
    }

    setSelectedFileName(file.name);
    setIsLoading(true);
    setError(null);

    try {
      const parsed = await parseSkillsFromZip(file);
      setIsLoading(false);

      if (parsed.length === 0) {
        setError('No SKILL.md file or valid skill directories found in this ZIP archive.');
        setCandidates([]);
        setAnalyzed(false);
        return;
      }

      setCandidates(parsed);
      setAnalyzed(true);

      const initRes: Record<string, ConflictResolution> = {};
      parsed.forEach((c) => {
        if (existingIds.has(c.id)) {
          initRes[c.id] = 'replace';
        }
      });
      setResolutions(initRes);
    } catch (err: any) {
      setIsLoading(false);
      setError(`Failed to process ZIP archive: ${err?.message || 'Invalid ZIP structure'}`);
    }
  };

  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      processSingleSkillText(text, file.name.replace(/\.md$/i, ''));
    };
    reader.readAsText(file);
  };

  const handleAnalyzePasted = () => {
    if (!pastedText.trim()) {
      setError('Please paste SKILL.md content.');
      return;
    }
    processSingleSkillText(pastedText, 'pasted-skill');
  };

  const processSingleSkillText = (content: string, fallbackSlug: string) => {
    const { name, description, tags } = parseSkillFrontmatter(content, fallbackSlug);
    const id = slugify(name || fallbackSlug);

    const singleSkill: ImportedSkillData = {
      id,
      name: name || fallbackSlug,
      description: description || 'Imported Skill',
      skillMdContent: content,
      files: [{ path: 'SKILL.md', content }],
      tags,
    };

    setCandidates([singleSkill]);
    setAnalyzed(true);

    const initRes: Record<string, ConflictResolution> = {};
    if (existingIds.has(id)) {
      initRes[id] = 'replace';
    }
    setResolutions(initRes);
  };

  const handleCommitImport = () => {
    const skillsToSave: Skill[] = [];
    let replacedCount = 0;

    for (const c of candidates) {
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

      const skill: Skill = {
        id: finalId,
        name: finalName,
        description: c.description,
        tags: c.tags,
        category: 'Imported',
        sourceType: 'local',
        version: '1.0.0',
        lastImportedAt: Date.now(),
        skillMdContent: c.skillMdContent,
        files: c.files,
        enabledTools: { ...targetToolAssociations },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      skillsToSave.push(skill);
    }

    onImportComplete(skillsToSave, replacedCount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-white">Import Agent Skills</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Import a standalone SKILL.md or an entire ZIP containing skill directories & assets
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
              {/* Mode Tabs */}
              <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
                <button
                  type="button"
                  onClick={() => setInputMode('zip')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    inputMode === 'zip'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Upload Skill ZIP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('file')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    inputMode === 'file'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload SKILL.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('paste')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    inputMode === 'paste'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste SKILL.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('cli')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    inputMode === 'cli'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Skills CLI Command</span>
                </button>
              </div>

              {inputMode === 'zip' && (
                <div className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-xl p-8 text-center bg-neutral-950/40">
                  <Archive className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                  <p className="text-xs text-neutral-300 font-medium">
                    {selectedFileName ? selectedFileName : 'Select a ZIP archive containing Skills'}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Automatically discovers SKILL.md manifests and extracts supporting assets (references, scripts, etc.)
                  </p>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleZipUpload}
                    className="mt-4 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer text-neutral-400"
                  />
                </div>
              )}

              {inputMode === 'file' && (
                <div className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-xl p-8 text-center bg-neutral-950/40">
                  <FileText className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                  <p className="text-xs text-neutral-300 font-medium">
                    {selectedFileName ? selectedFileName : 'Select a SKILL.md file from your computer'}
                  </p>
                  <input
                    type="file"
                    accept=".md,.txt"
                    onChange={handleSingleFileUpload}
                    className="mt-4 text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer text-neutral-400"
                  />
                </div>
              )}

              {inputMode === 'paste' && (
                <div className="space-y-3">
                  <textarea
                    rows={12}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`---\nname: my-skill\ndescription: A useful agent skill\n---\n\n# My Skill\n\nInstructions here...`}
                    className="w-full p-3 font-mono text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-hidden focus:border-amber-500/50 resize-none leading-relaxed"
                    spellCheck={false}
                  />
                  <button
                    onClick={handleAnalyzePasted}
                    className="h-8 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium"
                  >
                    Parse Pasted Content
                  </button>
                </div>
              )}

              {inputMode === 'cli' && (
                <SkillsCliImportPanel
                  existingSkills={existingSkills}
                  onImportComplete={onImportComplete}
                />
              )}

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}
            </>
          ) : (
            /* Analysis & Conflict Resolution Preview */
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-neutral-400">Detected Skills: </span>
                  <span className="font-semibold text-white">{candidates.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyzed(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  Choose different file
                </button>
              </div>

              {/* Skills list */}
              <div className="space-y-2">
                {candidates.map((cand) => {
                  const hasConflict = existingIds.has(cand.id);
                  const resolution = resolutions[cand.id] || 'replace';

                  return (
                    <div
                      key={cand.id}
                      className={`p-3 rounded-lg border text-xs ${
                        hasConflict
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-neutral-800 bg-neutral-950'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-200">{cand.name}</span>
                            <span className="font-mono text-[10px] text-neutral-500">({cand.id})</span>
                            <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-[10px] text-neutral-400">
                              {cand.files.length} file{cand.files.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                            {cand.description}
                          </p>

                          <div className="flex flex-wrap gap-1 mt-2 text-[10px] text-neutral-500">
                            {cand.files.map((f) => (
                              <span key={f.path} className="font-mono bg-neutral-900 px-1.5 py-0.5 rounded">
                                {f.path}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Conflict Resolution */}
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

              {/* Tool Target Enablement */}
              <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 space-y-2">
                <div className="text-xs font-semibold text-neutral-300">
                  Include imported skills in generated exports for:
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
            {analyzed ? 'Ready to add to local browser library.' : inputMode === 'cli' ? 'Fetch and preview the real GitHub files above.' : 'Select or upload a skill to proceed.'}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {analyzed && (
              <button
                type="button"
                onClick={handleCommitImport}
                className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Import {candidates.length} Skill{candidates.length !== 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
