/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AIToolId = 'claude' | 'codex' | 'pi' | 'opencode';

export interface AIToolMeta {
  id: AIToolId;
  name: string;
  shortName: string;
  company: string;
  mcpPath: string;
  mcpFormat: 'json' | 'toml';
  promptPath: string;
  promptFilename: string;
  skillsPath: string;
  supportsSSE: boolean;
  accentColor: string;
  badgeBg: string;
  description: string;
}

export const AI_TOOLS: Record<AIToolId, AIToolMeta> = {
  claude: {
    id: 'claude',
    name: 'Claude Code',
    shortName: 'Claude',
    company: 'Anthropic',
    mcpPath: '~/.claude.json',
    mcpFormat: 'json',
    promptPath: '~/.claude/CLAUDE.md',
    promptFilename: 'CLAUDE.md',
    skillsPath: '~/.claude/skills',
    supportsSSE: true,
    accentColor: '#D97706',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    description: "Anthropic's agentic CLI tool for software engineering.",
  },
  codex: {
    id: 'codex',
    name: 'OpenAI Codex',
    shortName: 'Codex',
    company: 'OpenAI',
    mcpPath: '~/.codex/config.toml',
    mcpFormat: 'toml',
    promptPath: '~/.codex/AGENTS.md',
    promptFilename: 'AGENTS.md',
    skillsPath: '~/.codex/skills',
    supportsSSE: true,
    accentColor: '#10B981',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: "OpenAI's terminal and agent coding environment.",
  },
  pi: {
    id: 'pi',
    name: 'Pi Coding Agent',
    shortName: 'Pi',
    company: 'Inflection / Pi',
    mcpPath: '~/.pi/agent/mcp.json',
    mcpFormat: 'json',
    promptPath: '~/.pi/agent/AGENTS.md',
    promptFilename: 'AGENTS.md',
    skillsPath: '~/.pi/agent/skills',
    supportsSSE: false, // Explicitly rejected per spec
    accentColor: '#6366F1',
    badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    description: 'Personal intelligence coding agent with strict transport constraints.',
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode',
    shortName: 'OpenCode',
    company: 'OpenCode OSS',
    mcpPath: '~/.config/opencode/opencode.json',
    mcpFormat: 'json',
    promptPath: '~/.config/opencode/AGENTS.md',
    promptFilename: 'AGENTS.md',
    skillsPath: '~/.config/opencode/skills',
    supportsSSE: true,
    accentColor: '#EC4899',
    badgeBg: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    description: 'Open source terminal AI coding assistant with unified JSON format.',
  },
};

export type McpTransport = 'stdio' | 'http' | 'sse';

export interface McpServer {
  id: string; // unique slug / identifier
  name: string;
  description: string;
  tags: string[];
  homepageUrl?: string;
  documentationUrl?: string;
  transport: McpTransport;
  // stdio fields
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  // http / sse fields
  url?: string;
  headers?: Record<string, string>;
  // Enabled export targets
  enabledTools: Record<AIToolId, boolean>;
  createdAt: number;
  updatedAt: number;
  isCustom?: boolean;
}

export interface SkillFile {
  path: string; // e.g. "SKILL.md", "references/guide.md", "scripts/helper.py"
  content: string; // text content or base64
  isBinary?: boolean;
}

export interface Skill {
  id: string; // unique slug
  name: string;
  description: string;
  tags: string[];
  category?: string;
  sourceType: 'local' | 'github';
  sourceRepo?: string; // e.g. "anthropics/skills" or URL
  sourcePath?: string;
  version?: string;
  lastImportedAt: number;
  contentHash?: string;
  skillMdContent: string;
  files: SkillFile[];
  enabledTools: Record<AIToolId, boolean>;
  createdAt: number;
  updatedAt: number;
  backupContent?: string; // previous version for rollback
}

export type PiPromptType = 'AGENTS' | 'SYSTEM' | 'APPEND_SYSTEM';

export interface PromptPreset {
  id: string;
  name: string;
  description: string;
  toolId: AIToolId;
  piPromptType?: PiPromptType; // Special for Pi
  tags: string[];
  content: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  visibleTools: Record<AIToolId, boolean>;
  redactSecretsInExport: boolean;
  activeNav: 'overview' | 'mcp' | 'skills' | 'prompts' | 'export' | 'settings';
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}
