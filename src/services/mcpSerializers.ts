/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { stringify as stringifyToml } from 'smol-toml';
import { AIToolId, McpServer, AI_TOOLS } from '../types';

export interface McpExportResult {
  toolId: AIToolId;
  toolName: string;
  filePath: string;
  content: string;
  serverCount: number;
  warnings: string[];
}

/**
 * Redacts potential secret values if redaction is enabled.
 */
function sanitizeEnv(
  env: Record<string, string> | undefined,
  redact: boolean
): Record<string, string> | undefined {
  if (!env || Object.keys(env).length === 0) return undefined;
  if (!redact) return env;

  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    if (
      k.toLowerCase().includes('key') ||
      k.toLowerCase().includes('token') ||
      k.toLowerCase().includes('secret') ||
      k.toLowerCase().includes('auth') ||
      k.toLowerCase().includes('pass')
    ) {
      result[k] = '***REDACTED_SECRET***';
    } else {
      result[k] = v;
    }
  }
  return result;
}

function sanitizeHeaders(
  headers: Record<string, string> | undefined,
  redact: boolean
): Record<string, string> | undefined {
  if (!headers || Object.keys(headers).length === 0) return undefined;
  if (!redact) return headers;

  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase().includes('auth') || k.toLowerCase().includes('cookie') || k.toLowerCase().includes('token')) {
      result[k] = '***REDACTED_HEADER***';
    } else {
      result[k] = v;
    }
  }
  return result;
}

/**
 * Generate Claude Code configuration (~/.claude.json)
 */
export function generateClaudeMcp(
  servers: McpServer[],
  options: { redactSecrets?: boolean; existingConfig?: string } = {}
): McpExportResult {
  const warnings: string[] = [];
  const enabledServers = servers.filter((s) => s.enabledTools.claude);

  const mcpServersObj: Record<string, any> = {};

  for (const s of enabledServers) {
    if (s.transport === 'stdio') {
      const entry: Record<string, any> = {
        command: s.command || 'npx',
        args: s.args || [],
      };
      const cleanEnv = sanitizeEnv(s.env, !!options.redactSecrets);
      if (cleanEnv && Object.keys(cleanEnv).length > 0) {
        entry.env = cleanEnv;
      }
      if (s.cwd) {
        entry.cwd = s.cwd;
      }
      mcpServersObj[s.id] = entry;
    } else {
      // http or sse
      const entry: Record<string, any> = {
        url: s.url || '',
        transport: s.transport,
      };
      const cleanHeaders = sanitizeHeaders(s.headers, !!options.redactSecrets);
      if (cleanHeaders && Object.keys(cleanHeaders).length > 0) {
        entry.headers = cleanHeaders;
      }
      mcpServersObj[s.id] = entry;
    }
  }

  let finalObj: any = { mcpServers: mcpServersObj };

  // Non-destructive merge with existing config if provided
  if (options.existingConfig) {
    try {
      const parsed = JSON.parse(options.existingConfig);
      finalObj = {
        ...parsed,
        mcpServers: {
          ...(parsed.mcpServers || {}),
          ...mcpServersObj,
        },
      };
    } catch {
      warnings.push('Could not parse existing ~/.claude.json file. Generated clean standalone configuration.');
    }
  }

  return {
    toolId: 'claude',
    toolName: AI_TOOLS.claude.name,
    filePath: AI_TOOLS.claude.mcpPath,
    content: JSON.stringify(finalObj, null, 2),
    serverCount: enabledServers.length,
    warnings,
  };
}

/**
 * Generate OpenAI Codex configuration (~/.codex/config.toml)
 */
export function generateCodexMcp(
  servers: McpServer[],
  options: { redactSecrets?: boolean; existingConfig?: string } = {}
): McpExportResult {
  const warnings: string[] = [];
  const enabledServers = servers.filter((s) => s.enabledTools.codex);

  const mcpServersMap: Record<string, any> = {};

  for (const s of enabledServers) {
    if (s.transport === 'stdio') {
      const entry: Record<string, any> = {
        command: s.command || 'npx',
        args: s.args || [],
      };
      const cleanEnv = sanitizeEnv(s.env, !!options.redactSecrets);
      if (cleanEnv && Object.keys(cleanEnv).length > 0) {
        entry.env = cleanEnv;
      }
      mcpServersMap[s.id] = entry;
    } else {
      const entry: Record<string, any> = {
        url: s.url || '',
      };
      const cleanHeaders = sanitizeHeaders(s.headers, !!options.redactSecrets);
      if (cleanHeaders && Object.keys(cleanHeaders).length > 0) {
        entry.headers = cleanHeaders;
      }
      mcpServersMap[s.id] = entry;
    }
  }

  const codexRoot: Record<string, any> = {
    mcp_servers: mcpServersMap,
  };

  let tomlContent = '';
  try {
    tomlContent = stringifyToml(codexRoot);
  } catch (e: any) {
    warnings.push(`TOML serialization error: ${e?.message || 'Unknown error'}`);
    tomlContent = `# TOML generation fallback\n[mcp_servers]\n`;
  }

  return {
    toolId: 'codex',
    toolName: AI_TOOLS.codex.name,
    filePath: AI_TOOLS.codex.mcpPath,
    content: tomlContent,
    serverCount: enabledServers.length,
    warnings,
  };
}

/**
 * Generate Pi Coding Agent configuration (~/.pi/agent/mcp.json)
 */
export function generatePiMcp(
  servers: McpServer[],
  options: { redactSecrets?: boolean; existingConfig?: string } = {}
): McpExportResult {
  const warnings: string[] = [];
  const enabledServers = servers.filter((s) => s.enabledTools.pi);

  const mcpServersObj: Record<string, any> = {};

  for (const s of enabledServers) {
    // Explicit spec constraint: Pi does NOT support SSE transport
    if (s.transport === 'sse') {
      warnings.push(`Server "${s.name}" (${s.id}) uses SSE transport, which is unsupported by Pi Coding Agent and was omitted from export.`);
      continue;
    }

    if (s.transport === 'stdio') {
      const entry: Record<string, any> = {
        command: s.command || 'npx',
        args: s.args || [],
      };
      const cleanEnv = sanitizeEnv(s.env, !!options.redactSecrets);
      if (cleanEnv && Object.keys(cleanEnv).length > 0) {
        entry.env = cleanEnv;
      }
      mcpServersObj[s.id] = entry;
    } else if (s.transport === 'http') {
      const entry: Record<string, any> = {
        url: s.url || '',
      };
      const cleanHeaders = sanitizeHeaders(s.headers, !!options.redactSecrets);
      if (cleanHeaders && Object.keys(cleanHeaders).length > 0) {
        entry.headers = cleanHeaders;
      }
      mcpServersObj[s.id] = entry;
    }
  }

  let finalObj: any = { mcpServers: mcpServersObj };

  if (options.existingConfig) {
    try {
      const parsed = JSON.parse(options.existingConfig);
      finalObj = {
        ...parsed,
        mcpServers: {
          ...(parsed.mcpServers || {}),
          ...mcpServersObj,
        },
      };
    } catch {
      warnings.push('Could not parse existing ~/.pi/agent/mcp.json file. Generated clean standalone configuration.');
    }
  }

  return {
    toolId: 'pi',
    toolName: AI_TOOLS.pi.name,
    filePath: AI_TOOLS.pi.mcpPath,
    content: JSON.stringify(finalObj, null, 2),
    serverCount: Object.keys(mcpServersObj).length,
    warnings,
  };
}

/**
 * Generate OpenCode configuration (~/.config/opencode/opencode.json)
 */
export function generateOpenCodeMcp(
  servers: McpServer[],
  options: { redactSecrets?: boolean; existingConfig?: string } = {}
): McpExportResult {
  const warnings: string[] = [];
  const enabledServers = servers.filter((s) => s.enabledTools.opencode);

  const mcpMap: Record<string, any> = {};

  for (const s of enabledServers) {
    if (s.transport === 'stdio') {
      const combinedCommand = [s.command || 'npx', ...(s.args || [])];
      const entry: Record<string, any> = {
        type: 'local',
        command: combinedCommand,
      };
      const cleanEnv = sanitizeEnv(s.env, !!options.redactSecrets);
      if (cleanEnv && Object.keys(cleanEnv).length > 0) {
        entry.environment = cleanEnv;
      }
      mcpMap[s.id] = entry;
    } else {
      // Remote (http / sse)
      const entry: Record<string, any> = {
        type: 'remote',
        url: s.url || '',
      };
      mcpMap[s.id] = entry;
    }
  }

  let finalObj: any = { mcp: mcpMap };

  if (options.existingConfig) {
    try {
      const parsed = JSON.parse(options.existingConfig);
      finalObj = {
        ...parsed,
        mcp: {
          ...(parsed.mcp || {}),
          ...mcpMap,
        },
      };
    } catch {
      warnings.push('Could not parse existing OpenCode configuration. Generated clean standalone configuration.');
    }
  }

  return {
    toolId: 'opencode',
    toolName: AI_TOOLS.opencode.name,
    filePath: AI_TOOLS.opencode.mcpPath,
    content: JSON.stringify(finalObj, null, 2),
    serverCount: enabledServers.length,
    warnings,
  };
}

/**
 * Universal dispatcher for all tools
 */
export function generateToolMcpConfig(
  toolId: AIToolId,
  servers: McpServer[],
  options: { redactSecrets?: boolean; existingConfig?: string } = {}
): McpExportResult {
  switch (toolId) {
    case 'claude':
      return generateClaudeMcp(servers, options);
    case 'codex':
      return generateCodexMcp(servers, options);
    case 'pi':
      return generatePiMcp(servers, options);
    case 'opencode':
      return generateOpenCodeMcp(servers, options);
  }
}
