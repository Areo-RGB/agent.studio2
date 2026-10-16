/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plus,
  Upload,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  Trash2,
  Edit2,
  CopyPlus,
  Eye,
  Sparkles,
  Info,
  CheckSquare,
  Square,
  Power,
  PowerOff,
  AlertTriangle,
} from 'lucide-react';
import { McpServer, McpTransport, AIToolId, AI_TOOLS } from '../../types';

interface McpListViewProps {
  servers: McpServer[];
  onAddServer: () => void;
  onOpenTemplates: () => void;
  onOpenImport: () => void;
  onOpenExport: (toolId?: AIToolId) => void;
  onEditServer: (server: McpServer) => void;
  onDuplicateServer: (server: McpServer) => void;
  onDeleteServer: (id: string) => void;
  onToggleTool: (serverId: string, toolId: AIToolId) => void;
  onBulkToggle: (serverIds: string[], toolId: AIToolId, enable: boolean) => void;
  onBulkDelete: (serverIds: string[]) => void;
  onCopyServerConfig: (server: McpServer) => void;
}

export const McpListView: React.FC<McpListViewProps> = ({
  servers,
  onAddServer,
  onOpenTemplates,
  onOpenImport,
  onOpenExport,
  onEditServer,
  onDuplicateServer,
  onDeleteServer,
  onToggleTool,
  onBulkToggle,
  onBulkDelete,
  onCopyServerConfig,
}) => {
  const [search, setSearch] = useState('');
  const [transportFilter, setTransportFilter] = useState<'all' | McpTransport>('all');
  const [toolFilter, setToolFilter] = useState<'all' | AIToolId>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const tools: AIToolId[] = ['claude', 'codex', 'pi', 'opencode'];

  // Filtered servers
  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesTransport = transportFilter === 'all' || s.transport === transportFilter;
    const matchesTool = toolFilter === 'all' || s.enabledTools[toolFilter];

    return matchesSearch && matchesTransport && matchesTool;
  });

  const allFilteredSelected =
    filteredServers.length > 0 &&
    filteredServers.every((s) => selectedIds.includes(s.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredServers.map((s) => s.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCopyAllJson = async () => {
    const exportMap: Record<string, any> = {};
    servers.forEach((s) => {
      exportMap[s.id] = {
        transport: s.transport,
        command: s.command,
        args: s.args,
        env: s.env,
        url: s.url,
        headers: s.headers,
        enabledTools: s.enabledTools,
      };
    });
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportMap, null, 2));
      alert('All MCP server definitions copied to clipboard as JSON.');
    } catch {
      // Fallback
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Banner Clarification */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 text-xs text-neutral-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-neutral-200 font-medium">Export Inclusion Matrix:</span>
          <p>
            Toggling an AI tool switch marks the server for inclusion in that tool's generated export file. This is client-side configuration management—it does not modify your installed tools or launch local processes.
          </p>
        </div>
      </div>

      {/* Header and Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">MCP Server Registry</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Model Context Protocol servers mapped to target coding agents ({filteredServers.length} of {servers.length})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenTemplates}
            className="h-8 px-3 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Templates</span>
          </button>

          <button
            onClick={onOpenImport}
            className="h-8 px-3 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-neutral-400" />
            <span>Import Config</span>
          </button>

          <button
            onClick={handleCopyAllJson}
            className="h-8 px-3 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Copy all server configurations as JSON"
          >
            <Copy className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Copy All JSON</span>
          </button>

          <button
            onClick={() => onOpenExport()}
            className="h-8 px-3 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" />
            <span>Export Configs</span>
          </button>

          <button
            onClick={onAddServer}
            className="h-8 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add MCP Server</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-neutral-800 bg-neutral-900/30">
        <div className="flex-1 max-w-sm relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, command, tag..."
            className="w-full h-8 pl-9 pr-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-neutral-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Transport Filter */}
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <span className="text-[11px] text-neutral-500">Transport:</span>
            <select
              value={transportFilter}
              onChange={(e) => setTransportFilter(e.target.value as any)}
              className="h-8 px-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300"
            >
              <option value="all">All Transports</option>
              <option value="stdio">stdio</option>
              <option value="http">http</option>
              <option value="sse">sse</option>
            </select>
          </div>

          {/* Tool Filter */}
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <span className="text-[11px] text-neutral-500">Tool Target:</span>
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
            <span className="font-semibold">{selectedIds.length}</span> servers selected
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

      {/* Management Table Matrix */}
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
                <th className="py-3 px-4 font-medium text-neutral-300 min-w-[200px]">
                  Server / Slug
                </th>
                <th className="py-3 px-4 font-medium text-neutral-300 min-w-[240px]">
                  Description & Command
                </th>
                <th className="py-3 px-3 font-medium text-neutral-300 w-24 text-center">
                  Transport
                </th>

                {/* AI Tools columns */}
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
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {meta.mcpFormat.toUpperCase()}
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
              {filteredServers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    <p className="text-sm">No MCP servers match your criteria.</p>
                    <p className="text-xs mt-1 text-neutral-600">
                      Add a new server or use a template to get started.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredServers.map((server) => {
                  const isSelected = selectedIds.includes(server.id);
                  const isMenuOpen = activeMenuId === server.id;

                  return (
                    <tr
                      key={server.id}
                      className={`hover:bg-neutral-900/40 transition-colors ${
                        isSelected ? 'bg-neutral-900/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelectRow(server.id)}
                          className="text-neutral-400 hover:text-neutral-200"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Server name and ID */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-200">{server.name}</div>
                        <div className="font-mono text-[11px] text-neutral-500">
                          {server.id}
                        </div>
                        {server.tags && server.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-500">
                            {server.tags.slice(0, 3).map((tag) => (
                              <span key={tag}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Description & Command */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-xs text-neutral-400 line-clamp-1">
                          {server.description || 'No description'}
                        </div>
                        <div className="font-mono text-[11px] text-neutral-500 truncate mt-1 bg-neutral-900/60 px-2 py-0.5 rounded border border-neutral-800/60">
                          {server.transport === 'stdio'
                            ? `${server.command} ${(server.args || []).join(' ')}`
                            : server.url}
                        </div>
                      </td>

                      {/* Transport */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800 font-mono text-[10px] uppercase">
                          {server.transport}
                        </span>
                      </td>

                      {/* AI Tool Toggles */}
                      {tools.map((toolId) => {
                        const isIncluded = server.enabledTools[toolId];
                        const isSsePiWarning = toolId === 'pi' && server.transport === 'sse';

                        return (
                          <td key={toolId} className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <button
                                type="button"
                                onClick={() => onToggleTool(server.id, toolId)}
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

                              {isSsePiWarning && isIncluded && (
                                <span
                                  className="text-[9px] text-rose-400 flex items-center gap-0.5 mt-0.5"
                                  title="Pi does not support SSE transport."
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>SSE Unsup</span>
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Actions */}
                      <td className="py-3 px-4 text-right relative">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditServer(server)}
                            className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-neutral-800 transition-colors"
                            title="Edit server"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMenuId(isMenuOpen ? null : server.id)
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
                                      onCopyServerConfig(server);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Copy Config Snippet</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onDuplicateServer(server);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                  >
                                    <CopyPlus className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Duplicate Server</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onOpenExport('claude');
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Preview Generated Config</span>
                                  </button>

                                  {server.documentationUrl && (
                                    <a
                                      href={server.documentationUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={() => setActiveMenuId(null)}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                                      <span>Open Documentation</span>
                                    </a>
                                  )}

                                  <div className="my-1 border-t border-neutral-800" />

                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onBulkToggle([server.id], 'claude', true);
                                      onBulkToggle([server.id], 'codex', true);
                                      onBulkToggle([server.id], 'pi', server.transport !== 'sse');
                                      onBulkToggle([server.id], 'opencode', true);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                  >
                                    <Power className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Enable Everywhere</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      tools.forEach((t) => onBulkToggle([server.id], t, false));
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                                  >
                                    <PowerOff className="w-3.5 h-3.5 text-neutral-400" />
                                    <span>Disable Everywhere</span>
                                  </button>

                                  <div className="my-1 border-t border-neutral-800" />

                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      onDeleteServer(server.id);
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
  );
};
