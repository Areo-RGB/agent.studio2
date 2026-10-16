/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  FolderTree,
  Archive,
  RefreshCw,
  CopyPlus,
  Check,
  CheckSquare,
  Square,
  Globe,
  HardDrive,
  Info,
  X,
} from 'lucide-react';
import { Skill, AIToolId, AI_TOOLS } from '../../types';
import { SkillDiscoverView } from './SkillDiscoverView';
import { downloadTextFile, createSingleSkillZip, downloadBlob } from '../../services/zipService';

interface SkillsListViewProps {
  skills: Skill[];
  onAddSkill: () => void;
  onOpenImportModal: () => void;
  onOpenExportModal: (skill?: Skill) => void;
  onEditSkill: (skill: Skill) => void;
  onDuplicateSkill: (skill: Skill) => void;
  onDeleteSkill: (id: string) => void;
  onToggleTool: (skillId: string, toolId: AIToolId) => void;
  onBulkToggle: (skillIds: string[], toolId: AIToolId, enable: boolean) => void;
  onBulkDelete: (skillIds: string[]) => void;
  onImportSkillFromDiscover: (skill: Partial<Skill>) => void;
}

export const SkillsListView: React.FC<SkillsListViewProps> = ({
  skills,
  onAddSkill,
  onOpenImportModal,
  onOpenExportModal,
  onEditSkill,
  onDuplicateSkill,
  onDeleteSkill,
  onToggleTool,
  onBulkToggle,
  onBulkDelete,
  onImportSkillFromDiscover,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'library' | 'discover'>('library');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'github'>('all');
  const [toolFilter, setToolFilter] = useState<'all' | AIToolId>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // File tree inspect modal
  const [inspectSkill, setInspectSkill] = useState<Skill | null>(null);

  const tools: AIToolId[] = ['claude', 'codex', 'pi', 'opencode'];

  const filteredSkills = skills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesSource =
      sourceFilter === 'all' || s.sourceType === sourceFilter;

    const matchesTool = toolFilter === 'all' || s.enabledTools[toolFilter];

    return matchesSearch && matchesSource && matchesTool;
  });

  const allFilteredSelected =
    filteredSkills.length > 0 &&
    filteredSkills.every((s) => selectedIds.includes(s.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSkills.map((s) => s.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCopyMarkdown = async (skill: Skill) => {
    try {
      await navigator.clipboard.writeText(skill.skillMdContent);
      alert(`SKILL.md for "${skill.name}" copied to clipboard.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadZip = async (skill: Skill) => {
    const blob = await createSingleSkillZip(skill);
    downloadBlob(blob, `${skill.id}.zip`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Banner Notice */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-xs text-neutral-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-neutral-200 font-medium">Browser-Stored Agent Skills:</span>
          <p>
            Skills are organized with standard <code>SKILL.md</code> YAML frontmatter and directory assets. Toggling an application includes the skill in that tool's generated destination archive (e.g. <code>~/.claude/skills/&lt;slug&gt;</code>).
          </p>
        </div>
      </div>

      {/* Main Tab Navigation: Installed Library vs Discover */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMainTab('library')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeMainTab === 'library'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span>Installed Library</span>
            <span className="font-mono tabular-nums text-[11px] text-neutral-500">
              ({skills.length})
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('discover')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeMainTab === 'discover'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Discover Skills</span>
          </button>
        </div>

        {activeMainTab === 'library' && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImportModal}
              className="h-8 px-3 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-neutral-400" />
              <span>Import Skill</span>
            </button>

            <button
              onClick={() => onOpenExportModal()}
              className="h-8 px-3 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>Export Skills</span>
            </button>

            <button
              onClick={onAddSkill}
              className="h-8 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Skill</span>
            </button>
          </div>
        )}
      </div>

      {activeMainTab === 'discover' ? (
        <SkillDiscoverView
          existingSkills={skills}
          onImportSkill={onImportSkillFromDiscover}
          onOpenImportModal={onOpenImportModal}
        />
      ) : (
        /* Library View */
        <div className="space-y-4">
          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-neutral-800 bg-neutral-900/30">
            <div className="flex-1 max-w-sm relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills by name, slug, tag..."
                className="w-full h-8 pl-9 pr-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-neutral-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Source Filter */}
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <span className="text-[11px] text-neutral-500">Source:</span>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as any)}
                  className="h-8 px-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300"
                >
                  <option value="all">All Sources</option>
                  <option value="local">Local Library</option>
                  <option value="github">GitHub Repo</option>
                </select>
              </div>

              {/* Tool Target Filter */}
              <div className="flex items-center gap-1 text-xs text-neutral-400">
                <span className="text-[11px] text-neutral-500">Enabled for:</span>
                <select
                  value={toolFilter}
                  onChange={(e) => setToolFilter(e.target.value as any)}
                  className="h-8 px-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300"
                >
                  <option value="all">All Tools</option>
                  {tools.map((t) => (
                    <option key={t} value={t}>
                      {AI_TOOLS[t].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Action Strip if items are selected */}
          {selectedIds.length > 0 && (
            <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-100">
              <div className="flex items-center gap-2 text-neutral-200">
                <span className="font-semibold">{selectedIds.length}</span> skills selected
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-neutral-500 text-[11px]">Enable for:</span>
                {tools.map((toolId) => (
                  <button
                    key={toolId}
                    onClick={() => onBulkToggle(selectedIds, toolId, true)}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                  >
                    + {AI_TOOLS[toolId].shortName}
                  </button>
                ))}

                <span className="text-neutral-500 text-[11px] ml-1">Disable:</span>
                {tools.map((toolId) => (
                  <button
                    key={toolId}
                    onClick={() => onBulkToggle(selectedIds, toolId, false)}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-300 transition-colors"
                  >
                    - {AI_TOOLS[toolId].shortName}
                  </button>
                ))}

                <button
                  onClick={() => onBulkDelete(selectedIds)}
                  className="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors ml-2 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Selected</span>
                </button>
              </div>
            </div>
          )}

          {/* Matrix Management Table */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/60 text-neutral-400 text-[11px] select-none">
                    <th className="py-3 px-4 w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="text-neutral-400 hover:text-neutral-200"
                      >
                        {allFilteredSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 font-medium text-neutral-300 min-w-[220px]">
                      Skill Name & Slug
                    </th>
                    <th className="py-3 px-4 font-medium text-neutral-300 min-w-[220px]">
                      Description
                    </th>
                    <th className="py-3 px-3 font-medium text-neutral-300 w-28">
                      Source & Files
                    </th>

                    {/* AI Tool columns */}
                    {tools.map((toolId) => {
                      const meta = AI_TOOLS[toolId];
                      return (
                        <th
                          key={toolId}
                          className="py-3 px-3 font-medium min-w-[120px] text-center"
                        >
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: meta.accentColor }}
                              />
                              <span className="text-neutral-200">{meta.shortName}</span>
                            </div>
                            <span className="text-[10px] text-neutral-500 font-mono truncate max-w-[100px]">
                              {meta.skillsPath.split('/').pop()}
                            </span>
                          </div>
                        </th>
                      );
                    })}

                    <th className="py-3 px-4 font-medium text-neutral-400 w-20 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-800/60">
                  {filteredSkills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-500">
                        <p className="text-sm">No agent skills match your filters.</p>
                        <p className="text-xs mt-1 text-neutral-600">
                          Create a skill or explore public skills in Discover Skills.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSkills.map((skill) => {
                      const isSelected = selectedIds.includes(skill.id);
                      const isMenuOpen = activeMenuId === skill.id;

                      return (
                        <tr
                          key={skill.id}
                          className={`hover:bg-neutral-900/40 transition-colors ${
                            isSelected ? 'bg-neutral-900/50' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleSelectRow(skill.id)}
                              className="text-neutral-400 hover:text-neutral-200"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-amber-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Name & Slug */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-neutral-200">{skill.name}</div>
                            <div className="font-mono text-[11px] text-neutral-500">
                              {skill.id}
                            </div>
                            {skill.tags && skill.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-500">
                                {skill.tags.slice(0, 3).map((tag) => (
                                  <span key={tag}>#{tag}</span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4 max-w-xs">
                            <div className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                              {skill.description || 'No description'}
                            </div>
                          </td>

                          {/* Source & Files count */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                              {skill.sourceType === 'github' ? (
                                <span className="font-mono text-emerald-400 truncate max-w-[90px]" title={skill.sourceRepo}>
                                  GH: {skill.sourceRepo?.split('/')[1] || 'git'}
                                </span>
                              ) : (
                                <span className="text-neutral-400">Local</span>
                              )}
                            </div>
                            <button
                              onClick={() => setInspectSkill(skill)}
                              className="mt-1 text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            >
                              <FolderTree className="w-3 h-3" />
                              <span>{skill.files.length} file{skill.files.length !== 1 ? 's' : ''}</span>
                            </button>
                          </td>

                          {/* AI Tool Toggles */}
                          {tools.map((toolId) => {
                            const isIncluded = skill.enabledTools[toolId];

                            return (
                              <td key={toolId} className="py-3 px-3 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => onToggleTool(skill.id, toolId)}
                                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                                      isIncluded ? 'bg-amber-500' : 'bg-neutral-800'
                                    }`}
                                    title={
                                      isIncluded
                                        ? `Included in ${AI_TOOLS[toolId].name} export`
                                        : `Excluded from ${AI_TOOLS[toolId].name} export`
                                    }
                                  >
                                    <span
                                      className={`w-3.5 h-3.5 rounded-full bg-neutral-950 absolute top-0.75 transition-transform ${
                                        isIncluded ? 'left-5.5' : 'left-1'
                                      }`}
                                    />
                                  </button>
                                  <span
                                    className={`text-[9px] mt-0.5 font-mono ${
                                      isIncluded ? 'text-amber-400 font-medium' : 'text-neutral-600'
                                    }`}
                                  >
                                    {isIncluded ? 'Included' : 'Excluded'}
                                  </span>
                                </div>
                              </td>
                            );
                          })}

                          {/* Actions */}
                          <td className="py-3 px-4 text-right relative">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => onEditSkill(skill)}
                                className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-neutral-800 transition-colors"
                                title="Edit skill"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setActiveMenuId(isMenuOpen ? null : skill.id)
                                  }
                                  className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-neutral-800 transition-colors"
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
                                          setInspectSkill(skill);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                      >
                                        <FolderTree className="w-3.5 h-3.5 text-neutral-400" />
                                        <span>View Files & Folder</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleCopyMarkdown(skill);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                      >
                                        <Copy className="w-3.5 h-3.5 text-neutral-400" />
                                        <span>Copy SKILL.md</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          downloadTextFile(skill.skillMdContent, `${skill.id}-SKILL.md`);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5 text-neutral-400" />
                                        <span>Download SKILL.md</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleDownloadZip(skill);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                      >
                                        <Archive className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Download Skill ZIP</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          onDuplicateSkill(skill);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                      >
                                        <CopyPlus className="w-3.5 h-3.5 text-neutral-400" />
                                        <span>Duplicate Skill</span>
                                      </button>

                                      <div className="my-1 border-t border-neutral-800" />

                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          onDeleteSkill(skill.id);
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
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Skill Files Modal */}
      {inspectSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full shadow-2xl p-6 flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-amber-400" />
                  <span>Files in Skill: {inspectSkill.name}</span>
                </h3>
                <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  slug: {inspectSkill.id}
                </p>
              </div>
              <button
                onClick={() => setInspectSkill(null)}
                className="p-1 text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {inspectSkill.files.map((file, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-neutral-800 bg-neutral-950 text-xs font-mono"
                >
                  <div className="flex items-center justify-between text-neutral-300 mb-1.5">
                    <span className="font-semibold text-amber-300">{file.path}</span>
                    <span className="text-[10px] text-neutral-500">
                      {file.content.length} characters
                    </span>
                  </div>
                  <pre className="text-[11px] text-neutral-400 max-h-32 overflow-y-auto bg-neutral-900/60 p-2 rounded whitespace-pre-wrap">
                    {file.content.slice(0, 300)}
                    {file.content.length > 300 ? '\n... [truncated]' : ''}
                  </pre>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
              <button
                onClick={() => handleDownloadZip(inspectSkill)}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Download Skill ZIP</span>
              </button>
              <button
                onClick={() => setInspectSkill(null)}
                className="px-3 py-1.5 text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
