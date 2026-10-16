/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  McpServer,
  Skill,
  PromptPreset,
  AppSettings,
  AIToolId,
  ToastMessage,
  AI_TOOLS,
} from './types';
import {
  db,
  initializeDatabase,
  loadSettings,
  saveSettings,
  resetDatabaseToDefault,
  clearAllDatabaseData,
} from './db/database';
import { downloadTextFile } from './services/zipService';

// Layout components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Common components
import { ToastContainer } from './components/common/Toast';
import { ConfirmModal } from './components/common/ConfirmModal';

// Views
import { OverviewView } from './components/overview/OverviewView';
import { McpListView } from './components/mcp/McpListView';
import { McpEditorDrawer } from './components/mcp/McpEditorDrawer';
import { McpTemplateModal, McpTemplate } from './components/mcp/McpTemplateModal';
import { McpImportModal } from './components/mcp/McpImportModal';
import { McpExportModal } from './components/mcp/McpExportModal';

import { SkillsListView } from './components/skills/SkillsListView';
import { SkillEditorDrawer } from './components/skills/SkillEditorDrawer';
import { SkillImportModal } from './components/skills/SkillImportModal';
import { SkillExportModal } from './components/skills/SkillExportModal';

import { PromptsView } from './components/prompts/PromptsView';
import { PromptEditorDrawer } from './components/prompts/PromptEditorDrawer';
import { PromptImportModal } from './components/prompts/PromptImportModal';
import { CopyToAppsModal } from './components/prompts/CopyToAppsModal';

import { ExportCenterView } from './components/export/ExportCenterView';
import { SettingsView } from './components/settings/SettingsView';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [prompts, setPrompts] = useState<PromptPreset[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Global search & notifications
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Active sub-selection for Prompts
  const [activePromptTool, setActivePromptTool] = useState<AIToolId>('claude');

  // Drawers and Modals state
  const [isMcpEditorOpen, setIsMcpEditorOpen] = useState(false);
  const [editingMcpServer, setEditingMcpServer] = useState<McpServer | null>(null);
  const [isMcpTemplateOpen, setIsMcpTemplateOpen] = useState(false);
  const [isMcpImportOpen, setIsMcpImportOpen] = useState(false);
  const [isMcpExportOpen, setIsMcpExportOpen] = useState(false);
  const [mcpExportInitialTool, setMcpExportInitialTool] = useState<AIToolId>('claude');

  const [isSkillEditorOpen, setIsSkillEditorOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isSkillImportOpen, setIsSkillImportOpen] = useState(false);
  const [isSkillExportOpen, setIsSkillExportOpen] = useState(false);
  const [skillExportTarget, setSkillExportTarget] = useState<Skill | null>(null);

  const [isPromptEditorOpen, setIsPromptEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptPreset | null>(null);
  const [isPromptImportOpen, setIsPromptImportOpen] = useState(false);
  const [copyToAppsPreset, setCopyToAppsPreset] = useState<PromptPreset | null>(null);

  // Confirm modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Notification helper
  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Reload data from IndexedDB
  const reloadData = useCallback(async () => {
    try {
      const [serversData, skillsData, promptsData] = await Promise.all([
        db.mcpServers.toArray(),
        db.skills.toArray(),
        db.prompts.toArray(),
      ]);
      setMcpServers(serversData);
      setSkills(skillsData);
      setPrompts(promptsData);
    } catch (e) {
      console.error('Failed to load database:', e);
      addToast('error', 'Database Error', 'Could not read from IndexedDB.');
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    initializeDatabase()
      .then(() => reloadData())
      .then(() => setIsDbLoaded(true))
      .catch((e) => console.error(e));
  }, [reloadData]);

  // Handle theme changes (dark, light, system)
  useEffect(() => {
    const applyTheme = () => {
      const isDark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (settings.theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [settings.theme]);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleToggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const nextTheme: AppSettings['theme'] = isCurrentlyDark ? 'light' : 'dark';
    handleUpdateSettings({ ...settings, theme: nextTheme });
    addToast('info', 'Theme Changed', `Switched to ${nextTheme} mode.`);
  };

  const handleNavigate = (nav: AppSettings['activeNav']) => {
    handleUpdateSettings({ ...settings, activeNav: nav });
  };

  /* =========================================================================
     MCP SERVER HANDLERS
     ========================================================================= */

  const handleSaveMcpServer = async (server: McpServer) => {
    try {
      await db.mcpServers.put(server);
      await reloadData();
      setIsMcpEditorOpen(false);
      setEditingMcpServer(null);
      addToast('success', 'Server Saved', `MCP Server "${server.name}" saved successfully.`);
    } catch (e: any) {
      addToast('error', 'Save Failed', e?.message || 'Failed to save server.');
    }
  };

  const handleDeleteMcpServer = (id: string) => {
    const target = mcpServers.find((s) => s.id === id);
    setConfirmModalState({
      isOpen: true,
      title: 'Delete MCP Server',
      message: `Are you sure you want to delete "${target?.name || id}"? This removes it from your studio library.`,
      confirmLabel: 'Delete Server',
      isDestructive: true,
      onConfirm: async () => {
        await db.mcpServers.delete(id);
        await reloadData();
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        addToast('info', 'Server Deleted', `"${target?.name || id}" has been removed.`);
      },
    });
  };

  const handleDuplicateMcpServer = async (server: McpServer) => {
    const newId = `${server.id}-copy-${Date.now().toString().slice(-4)}`;
    const duplicate: McpServer = {
      ...server,
      id: newId,
      name: `${server.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.mcpServers.add(duplicate);
    await reloadData();
    addToast('success', 'Server Duplicated', `Created duplicate "${duplicate.name}".`);
  };

  const handleToggleMcpTool = async (serverId: string, toolId: AIToolId) => {
    const server = mcpServers.find((s) => s.id === serverId);
    if (!server) return;

    // Warning check for Pi + SSE
    if (toolId === 'pi' && server.transport === 'sse' && !server.enabledTools.pi) {
      addToast(
        'warning',
        'Pi Transport Notice',
        'Pi Coding Agent does not support SSE transport. Generated exports for Pi will omit this server with a warning.'
      );
    }

    const updated: McpServer = {
      ...server,
      enabledTools: {
        ...server.enabledTools,
        [toolId]: !server.enabledTools[toolId],
      },
      updatedAt: Date.now(),
    };

    await db.mcpServers.put(updated);
    await reloadData();
  };

  const handleBulkToggleMcp = async (serverIds: string[], toolId: AIToolId, enable: boolean) => {
    for (const id of serverIds) {
      const server = mcpServers.find((s) => s.id === id);
      if (server) {
        server.enabledTools[toolId] = enable;
        server.updatedAt = Date.now();
        await db.mcpServers.put(server);
      }
    }
    await reloadData();
    addToast(
      'info',
      'Bulk Update',
      `${serverIds.length} servers ${enable ? 'enabled' : 'disabled'} for ${AI_TOOLS[toolId].shortName}.`
    );
  };

  const handleBulkDeleteMcp = (serverIds: string[]) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Bulk Delete MCP Servers',
      message: `Delete ${serverIds.length} selected MCP servers from your library?`,
      confirmLabel: 'Delete All Selected',
      isDestructive: true,
      onConfirm: async () => {
        await db.mcpServers.bulkDelete(serverIds);
        await reloadData();
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        addToast('info', 'Servers Deleted', `${serverIds.length} servers removed.`);
      },
    });
  };

  const handleSelectMcpTemplate = (template: McpTemplate) => {
    const newServer: McpServer = {
      id: template.id,
      name: template.name,
      description: template.description,
      tags: template.tags,
      homepageUrl: template.homepageUrl,
      documentationUrl: template.documentationUrl,
      transport: template.transport,
      command: template.command,
      args: template.args,
      env: template.env,
      url: template.url,
      headers: template.headers,
      enabledTools: {
        claude: true,
        codex: true,
        pi: template.transport !== 'sse',
        opencode: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isCustom: false,
    };
    setEditingMcpServer(newServer);
    setIsMcpEditorOpen(true);
  };

  const handleMcpImportComplete = async (serversToAdd: McpServer[], replacedCount: number) => {
    for (const server of serversToAdd) {
      await db.mcpServers.put(server);
    }
    await reloadData();
    setIsMcpImportOpen(false);
    addToast(
      'success',
      'Import Complete',
      `Imported ${serversToAdd.length} MCP servers (${replacedCount} replaced existing).`
    );
  };

  const handleCopyMcpConfig = async (server: McpServer) => {
    let snippet = '';
    if (server.transport === 'stdio') {
      snippet = JSON.stringify(
        {
          command: server.command,
          args: server.args,
          env: server.env,
        },
        null,
        2
      );
    } else {
      snippet = JSON.stringify(
        {
          url: server.url,
          headers: server.headers,
        },
        null,
        2
      );
    }
    await navigator.clipboard.writeText(snippet);
    addToast('info', 'Copied Snippet', `Configuration snippet for "${server.name}" copied.`);
  };

  /* =========================================================================
     SKILLS HANDLERS
     ========================================================================= */

  const handleSaveSkill = async (skill: Skill) => {
    try {
      await db.skills.put(skill);
      await reloadData();
      setIsSkillEditorOpen(false);
      setEditingSkill(null);
      addToast('success', 'Skill Saved', `Agent skill "${skill.name}" saved.`);
    } catch (e: any) {
      addToast('error', 'Save Failed', e?.message || 'Failed to save skill.');
    }
  };

  const handleDeleteSkill = (id: string) => {
    const target = skills.find((s) => s.id === id);
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Agent Skill',
      message: `Delete skill "${target?.name || id}" and all associated files?`,
      confirmLabel: 'Delete Skill',
      isDestructive: true,
      onConfirm: async () => {
        await db.skills.delete(id);
        await reloadData();
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        addToast('info', 'Skill Deleted', `"${target?.name || id}" removed.`);
      },
    });
  };

  const handleDuplicateSkill = async (skill: Skill) => {
    const newId = `${skill.id}-copy-${Date.now().toString().slice(-4)}`;
    const duplicate: Skill = {
      ...skill,
      id: newId,
      name: `${skill.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.skills.add(duplicate);
    await reloadData();
    addToast('success', 'Skill Duplicated', `Created duplicate "${duplicate.name}".`);
  };

  const handleToggleSkillTool = async (skillId: string, toolId: AIToolId) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    const updated: Skill = {
      ...skill,
      enabledTools: {
        ...skill.enabledTools,
        [toolId]: !skill.enabledTools[toolId],
      },
      updatedAt: Date.now(),
    };

    await db.skills.put(updated);
    await reloadData();
  };

  const handleBulkToggleSkill = async (skillIds: string[], toolId: AIToolId, enable: boolean) => {
    for (const id of skillIds) {
      const s = skills.find((item) => item.id === id);
      if (s) {
        s.enabledTools[toolId] = enable;
        s.updatedAt = Date.now();
        await db.skills.put(s);
      }
    }
    await reloadData();
    addToast(
      'info',
      'Bulk Update',
      `${skillIds.length} skills ${enable ? 'enabled' : 'disabled'} for ${AI_TOOLS[toolId].shortName}.`
    );
  };

  const handleBulkDeleteSkill = (skillIds: string[]) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Bulk Delete Skills',
      message: `Delete ${skillIds.length} selected agent skills from your library?`,
      confirmLabel: 'Delete All Selected',
      isDestructive: true,
      onConfirm: async () => {
        await db.skills.bulkDelete(skillIds);
        await reloadData();
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        addToast('info', 'Skills Deleted', `${skillIds.length} skills removed.`);
      },
    });
  };

  const handleSkillImportComplete = async (skillsToAdd: Skill[], replacedCount: number) => {
    for (const s of skillsToAdd) {
      await db.skills.put(s);
    }
    await reloadData();
    setIsSkillImportOpen(false);
    addToast(
      'success',
      'Import Complete',
      `Imported ${skillsToAdd.length} skills (${replacedCount} replaced existing).`
    );
  };

  const handleImportSkillFromDiscover = async (skillData: Partial<Skill>) => {
    const id = skillData.id || `skill-${Date.now().toString().slice(-4)}`;
    const fullSkill: Skill = {
      id,
      name: skillData.name || id,
      description: skillData.description || 'Imported Skill',
      tags: skillData.tags || [],
      category: skillData.category || 'General',
      sourceType: skillData.sourceType || 'github',
      sourceRepo: skillData.sourceRepo,
      sourcePath: skillData.sourcePath,
      version: skillData.version || '1.0.0',
      lastImportedAt: Date.now(),
      skillMdContent: skillData.skillMdContent || '',
      files: skillData.files || [{ path: 'SKILL.md', content: skillData.skillMdContent || '' }],
      enabledTools: {
        claude: true,
        codex: true,
        pi: true,
        opencode: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.skills.put(fullSkill);
    await reloadData();
    addToast('success', 'Skill Added', `"${fullSkill.name}" imported into library.`);
  };

  /* =========================================================================
     PROMPTS HANDLERS
     ========================================================================= */

  const handleSavePrompt = async (preset: PromptPreset) => {
    try {
      await db.prompts.put(preset);
      await reloadData();
      setIsPromptEditorOpen(false);
      setEditingPrompt(null);
      addToast('success', 'Preset Saved', `Prompt "${preset.name}" saved.`);
    } catch (e: any) {
      addToast('error', 'Save Failed', e?.message || 'Failed to save preset.');
    }
  };

  const handleDeletePrompt = (id: string) => {
    const target = prompts.find((p) => p.id === id);
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Prompt Preset',
      message: `Delete prompt preset "${target?.name || id}"?`,
      confirmLabel: 'Delete Preset',
      isDestructive: true,
      onConfirm: async () => {
        await db.prompts.delete(id);
        await reloadData();
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        addToast('info', 'Prompt Deleted', `Preset removed.`);
      },
    });
  };

  const handleDuplicatePrompt = async (preset: PromptPreset) => {
    const newId = `prompt-${Date.now().toString().slice(-6)}`;
    const duplicate: PromptPreset = {
      ...preset,
      id: newId,
      name: `${preset.name} (Copy)`,
      isActive: false, // Independent copy starts inactive
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.prompts.add(duplicate);
    await reloadData();
    addToast('success', 'Prompt Duplicated', `Duplicate created: "${duplicate.name}".`);
  };

  // CRITICAL ACTIVATION RULE:
  // Only ONE preset active per tool at a time!
  const handleTogglePromptActive = async (id: string, toolId: AIToolId) => {
    const target = prompts.find((p) => p.id === id);
    if (!target) return;

    const willBeActive = !target.isActive;

    await db.transaction('rw', db.prompts, async () => {
      // If setting active, deactivate any other preset for this tool
      if (willBeActive) {
        const others = await db.prompts.where('toolId').equals(toolId).toArray();
        for (const other of others) {
          if (other.id !== id && other.isActive) {
            other.isActive = false;
            other.updatedAt = Date.now();
            await db.prompts.put(other);
          }
        }
      }

      target.isActive = willBeActive;
      target.updatedAt = Date.now();
      await db.prompts.put(target);
    });

    await reloadData();
    if (willBeActive) {
      addToast('success', 'Active Prompt Set', `"${target.name}" is now the active export prompt for ${AI_TOOLS[toolId].name}.`);
    } else {
      addToast('info', 'Prompt Deactivated', `No prompt is currently active for ${AI_TOOLS[toolId].name}.`);
    }
  };

  const handleConfirmCopyToApps = async (preset: PromptPreset, targetTools: AIToolId[]) => {
    for (const targetTool of targetTools) {
      const copy: PromptPreset = {
        id: `prompt-${Date.now().toString().slice(-6)}-${targetTool}`,
        name: `${preset.name} (${AI_TOOLS[targetTool].shortName})`,
        description: preset.description,
        toolId: targetTool,
        tags: [...preset.tags, 'copied'],
        content: preset.content,
        isActive: false, // Copied prompts do not become active automatically
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.prompts.add(copy);
    }
    await reloadData();
    setCopyToAppsPreset(null);
    addToast(
      'success',
      'Copies Created',
      `Prompt copied to ${targetTools.map((t) => AI_TOOLS[t].shortName).join(', ')}.`
    );
  };

  const handlePromptImportComplete = async (preset: PromptPreset) => {
    await db.prompts.add(preset);
    await reloadData();
    setIsPromptImportOpen(false);
    addToast('success', 'Prompt Imported', `Saved preset "${preset.name}".`);
  };

  /* =========================================================================
     BACKUP & RESTORE / SETTINGS OPERATIONS
     ========================================================================= */

  const handleExportBackupJson = async () => {
    const backupData = {
      version: 1,
      appName: 'Agent Config Studio',
      exportedAt: new Date().toISOString(),
      mcpServers,
      skills,
      prompts,
      settings,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    downloadTextFile(jsonStr, `agent-config-studio-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    addToast('success', 'Backup Exported', 'Full library snapshot downloaded.');
  };

  const handleImportBackupJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = (event.target?.result as string) || '';
        const parsed = JSON.parse(text);

        if (!parsed.mcpServers && !parsed.skills && !parsed.prompts) {
          throw new Error('File does not match Agent Config Studio backup format.');
        }

        setConfirmModalState({
          isOpen: true,
          title: 'Restore Database Backup',
          message: `This backup contains ${parsed.mcpServers?.length || 0} MCP servers, ${parsed.skills?.length || 0} skills, and ${parsed.prompts?.length || 0} prompt presets. Restoring will replace your current library. Proceed?`,
          confirmLabel: 'Restore and Overwrite',
          isDestructive: true,
          onConfirm: async () => {
            await db.transaction('rw', db.mcpServers, db.skills, db.prompts, async () => {
              await db.mcpServers.clear();
              await db.skills.clear();
              await db.prompts.clear();

              if (Array.isArray(parsed.mcpServers)) await db.mcpServers.bulkAdd(parsed.mcpServers);
              if (Array.isArray(parsed.skills)) await db.skills.bulkAdd(parsed.skills);
              if (Array.isArray(parsed.prompts)) await db.prompts.bulkAdd(parsed.prompts);
            });

            if (parsed.settings) {
              handleUpdateSettings(parsed.settings);
            }

            await reloadData();
            setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
            addToast('success', 'Backup Restored', 'Your library has been restored successfully.');
          },
        });
      } catch (err: any) {
        addToast('error', 'Restore Failed', err?.message || 'Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDefaults = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Reset to Sample Data',
      message: 'This will reset your library back to the initial sample MCP servers, skills, and prompts. Any custom modifications will be replaced.',
      confirmLabel: 'Reset Everything',
      isDestructive: true,
      onConfirm: async () => {
        await resetDatabaseToDefault();
        await reloadData();
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        addToast('info', 'Reset Complete', 'Database restored to initial sample state.');
      },
    });
  };

  const handleClearAllData = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Clear All Studio Data',
      message: 'This will completely erase all MCP servers, skills, and prompt presets stored in this browser. This action cannot be undone.',
      confirmLabel: 'Permanently Erase',
      isDestructive: true,
      onConfirm: async () => {
        await clearAllDatabaseData();
        await reloadData();
        setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
        addToast('warning', 'Data Cleared', 'All local configurations have been erased.');
      },
    });
  };

  // Quick Add router
  const handleQuickAdd = (type: 'mcp' | 'skill' | 'prompt') => {
    if (type === 'mcp') {
      setEditingMcpServer(null);
      setIsMcpEditorOpen(true);
    } else if (type === 'skill') {
      setEditingSkill(null);
      setIsSkillEditorOpen(true);
    } else if (type === 'prompt') {
      setEditingPrompt(null);
      setIsPromptEditorOpen(true);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmLabel={confirmModalState.confirmLabel}
        isDestructive={confirmModalState.isDestructive}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Fixed Sidebar */}
      <Sidebar
        activeNav={settings.activeNav}
        onNavigate={handleNavigate}
        mcpCount={mcpServers.length}
        skillsCount={skills.length}
        promptsCount={prompts.length}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-neutral-950">
        <Header
          activeNav={settings.activeNav}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onQuickAdd={handleQuickAdd}
          onQuickExport={() => handleNavigate('export')}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto">
          {settings.activeNav === 'overview' && (
            <OverviewView
              mcpServers={mcpServers}
              skills={skills}
              prompts={prompts}
              onNavigate={handleNavigate}
              onOpenMcpAdd={() => {
                setEditingMcpServer(null);
                setIsMcpEditorOpen(true);
              }}
              onOpenSkillAdd={() => {
                setEditingSkill(null);
                setIsSkillEditorOpen(true);
              }}
              onOpenPromptAdd={() => {
                setEditingPrompt(null);
                setIsPromptEditorOpen(true);
              }}
              onExportTool={(toolId) => {
                setMcpExportInitialTool(toolId);
                setIsMcpExportOpen(true);
              }}
            />
          )}

          {settings.activeNav === 'mcp' && (
            <McpListView
              servers={mcpServers}
              onAddServer={() => {
                setEditingMcpServer(null);
                setIsMcpEditorOpen(true);
              }}
              onOpenTemplates={() => setIsMcpTemplateOpen(true)}
              onOpenImport={() => setIsMcpImportOpen(true)}
              onOpenExport={(toolId) => {
                if (toolId) setMcpExportInitialTool(toolId);
                setIsMcpExportOpen(true);
              }}
              onEditServer={(server) => {
                setEditingMcpServer(server);
                setIsMcpEditorOpen(true);
              }}
              onDuplicateServer={handleDuplicateMcpServer}
              onDeleteServer={handleDeleteMcpServer}
              onToggleTool={handleToggleMcpTool}
              onBulkToggle={handleBulkToggleMcp}
              onBulkDelete={handleBulkDeleteMcp}
              onCopyServerConfig={handleCopyMcpConfig}
            />
          )}

          {settings.activeNav === 'skills' && (
            <SkillsListView
              skills={skills}
              onAddSkill={() => {
                setEditingSkill(null);
                setIsSkillEditorOpen(true);
              }}
              onOpenImportModal={() => setIsSkillImportOpen(true)}
              onOpenExportModal={(skill) => {
                setSkillExportTarget(skill || null);
                setIsSkillExportOpen(true);
              }}
              onEditSkill={(skill) => {
                setEditingSkill(skill);
                setIsSkillEditorOpen(true);
              }}
              onDuplicateSkill={handleDuplicateSkill}
              onDeleteSkill={handleDeleteSkill}
              onToggleTool={handleToggleSkillTool}
              onBulkToggle={handleBulkToggleSkill}
              onBulkDelete={handleBulkDeleteSkill}
              onImportSkillFromDiscover={handleImportSkillFromDiscover}
            />
          )}

          {settings.activeNav === 'prompts' && (
            <PromptsView
              prompts={prompts}
              activeTool={activePromptTool}
              onSelectTool={setActivePromptTool}
              onAddPrompt={() => {
                setEditingPrompt(null);
                setIsPromptEditorOpen(true);
              }}
              onOpenImport={() => setIsPromptImportOpen(true)}
              onEditPrompt={(preset) => {
                setEditingPrompt(preset);
                setIsPromptEditorOpen(true);
              }}
              onDuplicatePrompt={handleDuplicatePrompt}
              onDeletePrompt={handleDeletePrompt}
              onToggleActive={handleTogglePromptActive}
              onOpenCopyToApps={(preset) => setCopyToAppsPreset(preset)}
            />
          )}

          {settings.activeNav === 'export' && (
            <ExportCenterView
              mcpServers={mcpServers}
              skills={skills}
              prompts={prompts}
              redactSecrets={settings.redactSecretsInExport}
              onExportFullLibraryJson={handleExportBackupJson}
            />
          )}

          {settings.activeNav === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onExportBackupJson={handleExportBackupJson}
              onImportBackupJson={handleImportBackupJson}
              onResetToDefaults={handleResetToDefaults}
              onClearAllData={handleClearAllData}
              mcpCount={mcpServers.length}
              skillsCount={skills.length}
              promptsCount={prompts.length}
            />
          )}
        </main>
      </div>

      {/* MCP Drawers and Modals */}
      <McpEditorDrawer
        isOpen={isMcpEditorOpen}
        serverToEdit={editingMcpServer}
        existingIds={mcpServers.map((s) => s.id)}
        onClose={() => {
          setIsMcpEditorOpen(false);
          setEditingMcpServer(null);
        }}
        onSave={handleSaveMcpServer}
      />

      <McpTemplateModal
        isOpen={isMcpTemplateOpen}
        onClose={() => setIsMcpTemplateOpen(false)}
        onSelectTemplate={handleSelectMcpTemplate}
      />

      <McpImportModal
        isOpen={isMcpImportOpen}
        existingServers={mcpServers}
        onClose={() => setIsMcpImportOpen(false)}
        onImportComplete={handleMcpImportComplete}
      />

      <McpExportModal
        isOpen={isMcpExportOpen}
        servers={mcpServers}
        initialTool={mcpExportInitialTool}
        redactSecrets={settings.redactSecretsInExport}
        onClose={() => setIsMcpExportOpen(false)}
        onOpenWorkspaceExport={() => {
          setIsMcpExportOpen(false);
          handleNavigate('export');
        }}
      />

      {/* Skills Drawers and Modals */}
      <SkillEditorDrawer
        isOpen={isSkillEditorOpen}
        skillToEdit={editingSkill}
        existingIds={skills.map((s) => s.id)}
        onClose={() => {
          setIsSkillEditorOpen(false);
          setEditingSkill(null);
        }}
        onSave={handleSaveSkill}
      />

      <SkillImportModal
        isOpen={isSkillImportOpen}
        existingSkills={skills}
        onClose={() => setIsSkillImportOpen(false)}
        onImportComplete={handleSkillImportComplete}
      />

      <SkillExportModal
        isOpen={isSkillExportOpen}
        skills={skills}
        singleSkill={skillExportTarget}
        onClose={() => {
          setIsSkillExportOpen(false);
          setSkillExportTarget(null);
        }}
        onOpenWorkspaceExport={() => {
          setIsSkillExportOpen(false);
          handleNavigate('export');
        }}
      />

      {/* Prompts Drawers and Modals */}
      <PromptEditorDrawer
        isOpen={isPromptEditorOpen}
        presetToEdit={editingPrompt}
        defaultTool={activePromptTool}
        onClose={() => {
          setIsPromptEditorOpen(false);
          setEditingPrompt(null);
        }}
        onSave={handleSavePrompt}
      />

      <PromptImportModal
        isOpen={isPromptImportOpen}
        defaultTool={activePromptTool}
        existingPresets={prompts}
        onClose={() => setIsPromptImportOpen(false)}
        onImportComplete={handlePromptImportComplete}
      />

      <CopyToAppsModal
        isOpen={Boolean(copyToAppsPreset)}
        preset={copyToAppsPreset}
        onClose={() => setCopyToAppsPreset(null)}
        onConfirmCopy={handleConfirmCopyToApps}
      />
    </div>
  );
}
