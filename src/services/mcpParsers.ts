/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parse as parseToml } from 'smol-toml';
import { McpServer, McpTransport } from '../types';

export interface ParsedMcpCandidate {
  id: string;
  name: string;
  description: string;
  transport: McpTransport;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  detectedSource: 'claude' | 'codex' | 'pi' | 'opencode' | 'generic';
  isValid: boolean;
  error?: string;
}

export function parseMcpContent(rawText: string, fileHint?: string): {
  candidates: ParsedMcpCandidate[];
  formatDetected: 'json' | 'toml' | 'unknown';
  error?: string;
} {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { candidates: [], formatDetected: 'unknown', error: 'Provided content is empty.' };
  }

  // Determine if JSON or TOML
  const isLikelyToml =
    fileHint?.endsWith('.toml') ||
    (trimmed.startsWith('[') && !trimmed.startsWith('[{') && !trimmed.startsWith('["')) ||
    trimmed.includes('[mcp_servers');

  if (isLikelyToml) {
    try {
      const parsedToml = parseToml(trimmed) as any;
      const candidates = extractFromCodexToml(parsedToml);
      if (candidates.length > 0) {
        return { candidates, formatDetected: 'toml' };
      }
    } catch (e: any) {
      // If TOML failed and not explicitly .toml, fallback to JSON check below
      if (fileHint?.endsWith('.toml')) {
        return { candidates: [], formatDetected: 'toml', error: `TOML Syntax Error: ${e?.message || 'Invalid syntax'}` };
      }
    }
  }

  // Try JSON
  try {
    const parsedJson = JSON.parse(trimmed);
    const candidates = extractFromJson(parsedJson);
    return { candidates, formatDetected: 'json' };
  } catch (jsonErr: any) {
    // If not JSON, try TOML as fallback if not tried
    if (!isLikelyToml) {
      try {
        const parsedToml = parseToml(trimmed) as any;
        const candidates = extractFromCodexToml(parsedToml);
        if (candidates.length > 0) {
          return { candidates, formatDetected: 'toml' };
        }
      } catch {
        // Both failed
      }
    }
    return {
      candidates: [],
      formatDetected: 'unknown',
      error: `Failed to parse content as JSON or TOML. Details: ${jsonErr?.message || 'Syntax error'}`,
    };
  }
}

function extractFromCodexToml(parsed: any): ParsedMcpCandidate[] {
  const candidates: ParsedMcpCandidate[] = [];
  const serversMap = parsed.mcp_servers || parsed.mcpServers || (typeof parsed === 'object' ? parsed : {});

  for (const [key, val] of Object.entries(serversMap)) {
    if (!val || typeof val !== 'object') continue;
    const item = val as any;

    const transport: McpTransport = item.url ? 'http' : 'stdio';
    const candidate: ParsedMcpCandidate = {
      id: slugify(key),
      name: item.name || key,
      description: item.description || `Imported MCP server from Codex config: ${key}`,
      transport,
      command: item.command,
      args: Array.isArray(item.args) ? item.args : undefined,
      env: item.env && typeof item.env === 'object' ? item.env : undefined,
      url: item.url,
      headers: item.headers && typeof item.headers === 'object' ? item.headers : undefined,
      detectedSource: 'codex',
      isValid: Boolean((transport === 'stdio' && item.command) || (transport !== 'stdio' && item.url)),
      error: !item.command && !item.url ? 'Missing required command or URL' : undefined,
    };
    candidates.push(candidate);
  }

  return candidates;
}

function extractFromJson(parsed: any): ParsedMcpCandidate[] {
  const candidates: ParsedMcpCandidate[] = [];

  // Case 1: OpenCode { "mcp": { ... } }
  if (parsed.mcp && typeof parsed.mcp === 'object' && !Array.isArray(parsed.mcp)) {
    for (const [key, val] of Object.entries(parsed.mcp)) {
      if (!val || typeof val !== 'object') continue;
      const item = val as any;
      let transport: McpTransport = 'stdio';
      let command: string | undefined;
      let args: string[] | undefined;

      if (item.type === 'local' && Array.isArray(item.command) && item.command.length > 0) {
        command = item.command[0];
        args = item.command.slice(1);
        transport = 'stdio';
      } else if (item.type === 'remote' || item.url) {
        transport = 'http';
      }

      candidates.push({
        id: slugify(key),
        name: key,
        description: `Imported MCP server from OpenCode config`,
        transport,
        command,
        args,
        env: item.environment || item.env,
        url: item.url,
        detectedSource: 'opencode',
        isValid: Boolean((transport === 'stdio' && command) || (transport !== 'stdio' && item.url)),
        error: !command && !item.url ? 'Missing command array or URL' : undefined,
      });
    }
    if (candidates.length > 0) return candidates;
  }

  // Case 2: Claude Code or Pi { "mcpServers": { ... } }
  const rootServers = parsed.mcpServers || parsed.servers;
  if (rootServers && typeof rootServers === 'object' && !Array.isArray(rootServers)) {
    for (const [key, val] of Object.entries(rootServers)) {
      if (!val || typeof val !== 'object') continue;
      const item = val as any;
      let transport: McpTransport = item.transport || (item.url ? 'http' : 'stdio');
      if (item.transport === 'sse') transport = 'sse';

      candidates.push({
        id: slugify(key),
        name: item.name || key,
        description: item.description || `Imported MCP server: ${key}`,
        transport,
        command: item.command,
        args: Array.isArray(item.args) ? item.args : undefined,
        env: item.env && typeof item.env === 'object' ? item.env : undefined,
        url: item.url,
        headers: item.headers,
        detectedSource: 'claude',
        isValid: Boolean((transport === 'stdio' && item.command) || (transport !== 'stdio' && item.url)),
        error: !item.command && !item.url ? 'Missing required command or URL' : undefined,
      });
    }
    if (candidates.length > 0) return candidates;
  }

  // Case 3: Array of server objects [ { id, command, ... }, ... ]
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const id = item.id || item.name ? slugify(item.id || item.name) : `server-${Date.now()}`;
      const transport: McpTransport = item.transport || (item.url ? 'http' : 'stdio');
      candidates.push({
        id,
        name: item.name || id,
        description: item.description || 'Imported MCP server',
        transport,
        command: item.command,
        args: Array.isArray(item.args) ? item.args : undefined,
        env: item.env,
        url: item.url,
        headers: item.headers,
        detectedSource: 'generic',
        isValid: Boolean((transport === 'stdio' && item.command) || (transport !== 'stdio' && item.url)),
        error: !item.command && !item.url ? 'Missing required command or URL' : undefined,
      });
    }
    if (candidates.length > 0) return candidates;
  }

  // Case 4: Single server object { id: "...", command: "...", ... }
  if (parsed.command || parsed.url) {
    const id = slugify(parsed.id || parsed.name || 'imported-server');
    const transport: McpTransport = parsed.transport || (parsed.url ? 'http' : 'stdio');
    candidates.push({
      id,
      name: parsed.name || id,
      description: parsed.description || 'Imported MCP server',
      transport,
      command: parsed.command,
      args: Array.isArray(parsed.args) ? parsed.args : undefined,
      env: parsed.env,
      url: parsed.url,
      headers: parsed.headers,
      detectedSource: 'generic',
      isValid: true,
    });
    return candidates;
  }

  // Case 5: Direct map { "server1": { command: ... }, "server2": { ... } }
  if (typeof parsed === 'object') {
    for (const [key, val] of Object.entries(parsed)) {
      if (val && typeof val === 'object' && ((val as any).command || (val as any).url)) {
        const item = val as any;
        const transport: McpTransport = item.transport || (item.url ? 'http' : 'stdio');
        candidates.push({
          id: slugify(key),
          name: item.name || key,
          description: item.description || `Imported MCP server: ${key}`,
          transport,
          command: item.command,
          args: Array.isArray(item.args) ? item.args : undefined,
          env: item.env,
          url: item.url,
          headers: item.headers,
          detectedSource: 'generic',
          isValid: true,
        });
      }
    }
  }

  return candidates;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'server';
}
