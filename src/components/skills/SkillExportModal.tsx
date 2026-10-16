/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Download,
  Archive,
  FileCode2,
  FolderDown,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Skill, AIToolId, AI_TOOLS } from '../../types';
import {
  downloadTextFile,
  downloadBlob,
  createSingleSkillZip,
  createSkillZipForTool,
  createAllEnabledSkillsZip,
} from '../../services/zipService';

interface SkillExportModalProps {
  isOpen: boolean;
  skills: Skill[];
  singleSkill?: Skill | null;
  onClose: () => void;
  onOpenWorkspaceExport: () => void;
}

export const SkillExportModal: React.FC<SkillExportModalProps> = ({
  isOpen,
  skills,
  singleSkill,
  onClose,
  onOpenWorkspaceExport,
}) => {
  if (!isOpen) return null;

  const [selectedToolForAppZip, setSelectedToolForAppZip] = useState<AIToolId>('claude');
  const [selectedToolsForBulk, setSelectedToolsForBulk] = useState<AIToolId[]>([
    'claude',
    'codex',
    'pi',
    'opencode',
  ]);
  const [isExporting, setIsExporting] = useState(false);

  // If singleSkill is passed, offer single skill export options
  const targetSkill = singleSkill || (skills.length > 0 ? skills[0] : null);

  const handleDownloadSingleMd = () => {
    if (!targetSkill) return;
    downloadTextFile(targetSkill.skillMdContent, `${targetSkill.id}-SKILL.md`, 'text/markdown');
  };

  const handleDownloadSingleZip = async () => {
    if (!targetSkill) return;
    setIsExporting(true);
    try {
      const blob = await createSingleSkillZip(targetSkill);
      downloadBlob(blob, `skill-${targetSkill.id}.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadForToolZip = async () => {
    if (!targetSkill) return;
    setIsExporting(true);
    try {
      const blob = await createSkillZipForTool(targetSkill, selectedToolForAppZip);
      downloadBlob(blob, `${selectedToolForAppZip}-skill-${targetSkill.id}.zip`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllEnabledZip = async () => {
    if (selectedToolsForBulk.length === 0) {
      alert('Please select at least one target application.');
      return;
    }
    setIsExporting(true);
    try {
      const blob = await createAllEnabledSkillsZip(skills, selectedToolsForBulk);
      downloadBlob(blob, 'enabled-skills-bundle.zip');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleBulkTool = (toolId: AIToolId) => {
    if (selectedToolsForBulk.includes(toolId)) {
      setSelectedToolsForBulk(selectedToolsForBulk.filter((t) => t !== toolId));
    } else {
      setSelectedToolsForBulk([...selectedToolsForBulk, toolId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-2xl w-full shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-white">Export Agent Skills</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Download standalone SKILL.md, single-skill ZIP packages, or full multi-application archives
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
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Section 1: Single Skill Options (if skill selected) */}
          {targetSkill && (
            <div className="space-y-3 p-4 rounded-xl border border-neutral-800 bg-neutral-950/60">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-200">
                    Export Specific Skill: <span className="text-amber-400">{targetSkill.name}</span>
                  </span>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    Slug: {targetSkill.id} ({targetSkill.files.length} asset files)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  onClick={handleDownloadSingleMd}
                  className="p-3 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:border-neutral-700 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-neutral-200 group-hover:text-amber-300">
                    <FileCode2 className="w-4 h-4 text-amber-400" />
                    <span>Download SKILL.md</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1 leading-tight">
                    Clean standalone markdown file with YAML frontmatter.
                  </p>
                </button>

                <button
                  onClick={handleDownloadSingleZip}
                  disabled={isExporting}
                  className="p-3 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:border-neutral-700 text-left transition-all group"
                >
                  <div className="flex items-center gap-2 text-xs font-medium text-neutral-200 group-hover:text-amber-300">
                    <Archive className="w-4 h-4 text-emerald-400" />
                    <span>Download Skill Folder ZIP</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1 leading-tight">
                    Preserves folder structure with references and scripts.
                  </p>
                </button>
              </div>

              {/* Tool Specific package */}
              <div className="pt-2 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Package for application:</span>
                  <select
                    value={selectedToolForAppZip}
                    onChange={(e) => setSelectedToolForAppZip(e.target.value as AIToolId)}
                    className="h-7 px-2 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-200 font-medium"
                  >
                    {(['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).map((t) => (
                      <option key={t} value={t}>
                        {AI_TOOLS[t].name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleDownloadForToolZip}
                  disabled={isExporting}
                  className="h-8 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download for {AI_TOOLS[selectedToolForAppZip].shortName}</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 2: Bulk Export All Enabled Skills */}
          <div className="space-y-4 p-4 rounded-xl border border-neutral-800 bg-neutral-950/60">
            <div>
              <h3 className="text-xs font-semibold text-neutral-200">
                Bulk Export: All Enabled Skills Archive
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Generate a unified ZIP archive organized with each target tool's expected directory tree and install instructions.
              </p>
            </div>

            {/* Application Checkboxes */}
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">
                Include skills enabled for:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).map((toolId) => {
                  const meta = AI_TOOLS[toolId];
                  const isChecked = selectedToolsForBulk.includes(toolId);
                  const count = skills.filter((s) => s.enabledTools[toolId]).length;

                  return (
                    <label
                      key={toolId}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                        isChecked
                          ? 'border-neutral-700 bg-neutral-900 text-white'
                          : 'border-neutral-800/80 bg-neutral-950 text-neutral-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBulkTool(toolId)}
                          className="rounded border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-0"
                        />
                        <span>{meta.shortName}</span>
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-neutral-500">
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleDownloadAllEnabledZip}
              disabled={isExporting || selectedToolsForBulk.length === 0}
              className="w-full h-9 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download All Enabled Skills ZIP</span>
            </button>
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
            <span>Need full workspace bundle with MCPs and Prompts? Open Export Center</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
