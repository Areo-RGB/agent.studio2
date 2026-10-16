/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import { McpServer, Skill, PromptPreset, AppSettings } from '../types';
import { DEFAULT_MCP_SERVERS, DEFAULT_SKILLS, DEFAULT_PROMPTS } from './defaultData';

export class AgentStudioDatabase extends Dexie {
  mcpServers!: Table<McpServer, string>;
  skills!: Table<Skill, string>;
  prompts!: Table<PromptPreset, string>;

  constructor() {
    super('AgentConfigStudioDB');
    this.version(1).stores({
      mcpServers: 'id, name, transport, createdAt, updatedAt',
      skills: 'id, name, sourceType, lastImportedAt, createdAt, updatedAt',
      prompts: 'id, toolId, name, isActive, createdAt, updatedAt',
    });
  }
}

export const db = new AgentStudioDatabase();

const SETTINGS_KEY = 'agent_config_studio_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  visibleTools: {
    claude: true,
    codex: true,
    pi: true,
    opencode: true,
  },
  redactSecretsInExport: true,
  activeNav: 'overview',
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

/**
 * Initializes the database with sample data if tables are empty.
 */
export async function initializeDatabase(): Promise<void> {
  const mcpCount = await db.mcpServers.count();
  if (mcpCount === 0) {
    await db.mcpServers.bulkAdd(DEFAULT_MCP_SERVERS);
  }

  const skillCount = await db.skills.count();
  if (skillCount === 0) {
    await db.skills.bulkAdd(DEFAULT_SKILLS);
  }

  const promptCount = await db.prompts.count();
  if (promptCount === 0) {
    await db.prompts.bulkAdd(DEFAULT_PROMPTS);
  }
}

/**
 * Resets database back to default sample state.
 */
export async function resetDatabaseToDefault(): Promise<void> {
  await db.transaction('rw', db.mcpServers, db.skills, db.prompts, async () => {
    await db.mcpServers.clear();
    await db.skills.clear();
    await db.prompts.clear();

    await db.mcpServers.bulkAdd(DEFAULT_MCP_SERVERS);
    await db.skills.bulkAdd(DEFAULT_SKILLS);
    await db.prompts.bulkAdd(DEFAULT_PROMPTS);
  });
}

/**
 * Completely clears all user data.
 */
export async function clearAllDatabaseData(): Promise<void> {
  await db.transaction('rw', db.mcpServers, db.skills, db.prompts, async () => {
    await db.mcpServers.clear();
    await db.skills.clear();
    await db.prompts.clear();
  });
}
