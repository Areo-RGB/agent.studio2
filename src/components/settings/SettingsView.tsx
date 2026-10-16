/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Moon,
  Sun,
  Laptop,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Info,
  HardDrive,
  Check,
} from 'lucide-react';
import { AppSettings, AIToolId, AI_TOOLS } from '../../types';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onExportBackupJson: () => void;
  onImportBackupJson: (file: File) => void;
  onResetToDefaults: () => void;
  onClearAllData: () => void;
  mcpCount: number;
  skillsCount: number;
  promptsCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onExportBackupJson,
  onImportBackupJson,
  onResetToDefaults,
  onClearAllData,
  mcpCount,
  skillsCount,
  promptsCount,
}) => {
  const [storageEstimate, setStorageEstimate] = useState<{ used: number; total: number } | null>(null);

  useEffect(() => {
    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        if (est.usage !== undefined && est.quota !== undefined) {
          setStorageEstimate({
            used: est.usage,
            total: est.quota,
          });
        }
      });
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportBackupJson(file);
    }
  };

  const toggleToolVisibility = (toolId: AIToolId) => {
    onUpdateSettings({
      ...settings,
      visibleTools: {
        ...settings.visibleTools,
        [toolId]: !settings.visibleTools[toolId],
      },
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold text-white tracking-tight">Studio Settings</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Manage local persistence, backup snapshots, redaction rules, and display preferences
        </p>
      </div>

      {/* Storage and Local Sandbox Notice */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Browser IndexedDB Storage</h3>
              <p className="text-xs text-neutral-400">
                All MCP servers, skills, and prompts persist client-side in your browser
              </p>
            </div>
          </div>
          {storageEstimate && (
            <div className="text-right font-mono text-xs text-neutral-400">
              <span className="text-neutral-200">
                {(storageEstimate.used / 1024).toFixed(1)} KB
              </span>{' '}
              used
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 text-xs border-t border-neutral-800/80">
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-neutral-500 text-[11px]">MCP Servers</div>
            <div className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
              {mcpCount}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-neutral-500 text-[11px]">Agent Skills</div>
            <div className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
              {skillsCount}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-neutral-500 text-[11px]">Prompt Presets</div>
            <div className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
              {promptsCount}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5 mt-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Important Persistence Caution:</strong> Browsers may clear IndexedDB if website data is cleared or if disk space becomes constrained. We strongly recommend exporting regular JSON backups.
          </p>
        </div>
      </div>

      {/* Security & Secret Redaction */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white">Export Secret Redaction</h3>
              <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                When enabled, environment variables and headers containing tokens or API keys (e.g. <code>GITHUB_PERSONAL_ACCESS_TOKEN</code>, <code>CONTEXT7_API_KEY</code>) will be replaced with <code>***REDACTED_SECRET***</code> placeholders in generated export files and ZIP archives.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdateSettings({
                ...settings,
                redactSecretsInExport: !settings.redactSecretsInExport,
              })
            }
            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
              settings.redactSecretsInExport ? 'bg-amber-500' : 'bg-neutral-800'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-neutral-950 absolute top-1 transition-transform ${
                settings.redactSecretsInExport ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Target Application Visibility */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <h3 className="text-sm font-semibold text-white">Supported AI Coding Applications</h3>
        <p className="text-xs text-neutral-400">
          Agent Config Studio is specifically tailored for these four terminal agent tools:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {(['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).map((toolId) => {
            const meta = AI_TOOLS[toolId];
            const isVisible = settings.visibleTools[toolId] !== false;

            return (
              <div
                key={toolId}
                onClick={() => toggleToolVisibility(toolId)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  isVisible
                    ? 'border-neutral-700 bg-neutral-950 text-white'
                    : 'border-neutral-800/80 bg-neutral-950/40 text-neutral-500'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: meta.accentColor }}
                  />
                  <div>
                    <div className="font-semibold text-xs text-neutral-200">{meta.name}</div>
                    <div className="text-[11px] font-mono text-neutral-500">
                      {meta.mcpFormat.toUpperCase()} · {meta.promptFilename}
                    </div>
                  </div>
                </div>

                <div
                  className={`w-4 h-4 rounded flex items-center justify-center ${
                    isVisible ? 'bg-amber-500 text-neutral-950' : 'border border-neutral-700'
                  }`}
                >
                  {isVisible && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Theme Preference */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <h3 className="text-sm font-semibold text-white">Theme & Appearance</h3>
        <div className="grid grid-cols-3 gap-3">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => onUpdateSettings({ ...settings, theme: t })}
              className={`h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 capitalize transition-colors ${
                settings.theme === t
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 font-semibold'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
              }`}
            >
              {t === 'dark' ? (
                <Moon className="w-3.5 h-3.5" />
              ) : t === 'light' ? (
                <Sun className="w-3.5 h-3.5" />
              ) : (
                <Laptop className="w-3.5 h-3.5" />
              )}
              <span>{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Backup and Data Reset Operations */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <h3 className="text-sm font-semibold text-white">Backup & Restore</h3>
        <p className="text-xs text-neutral-400">
          Save your complete studio database as a JSON snapshot, or restore from a previous backup file.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExportBackupJson}
            className="h-8 px-3.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Backup (JSON)</span>
          </button>

          <label className="h-8 px-3.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Restore Backup (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={onResetToDefaults}
            className="h-8 px-3.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
            <span>Reset to Sample Data</span>
          </button>

          <button
            onClick={onClearAllData}
            className="h-8 px-3.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
