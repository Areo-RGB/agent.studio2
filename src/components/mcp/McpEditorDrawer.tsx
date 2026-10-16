/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Code,
  Sliders,
  Check,
  ExternalLink,
} from 'lucide-react';
import { McpServer, McpTransport, AIToolId, AI_TOOLS } from '../../types';
import { slugify } from '../../services/mcpParsers';

interface McpEditorDrawerProps {
  isOpen: boolean;
  serverToEdit?: McpServer | null;
  existingIds: string[];
  onClose: () => void;
  onSave: (server: McpServer) => void;
}

export const McpEditorDrawer: React.FC<McpEditorDrawerProps> = ({
  isOpen,
  serverToEdit,
  existingIds,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(serverToEdit);

  // Form states
  const [activeTab, setActiveTab] = useState<'form' | 'json'>('form');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [homepageUrl, setHomepageUrl] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');

  // Connection
  const [transport, setTransport] = useState<McpTransport>('stdio');
  const [command, setCommand] = useState('npx');
  const [argsList, setArgsList] = useState<string[]>(['-y']);
  const [newArg, setNewArg] = useState('');
  const [envPairs, setEnvPairs] = useState<{ key: string; value: string; isSecret: boolean }[]>([]);
  const [cwd, setCwd] = useState('');
  const [url, setUrl] = useState('');
  const [headerPairs, setHeaderPairs] = useState<{ key: string; value: string; isSecret: boolean }[]>([]);

  // Toggles
  const [enabledTools, setEnabledTools] = useState<Record<AIToolId, boolean>>({
    claude: true,
    codex: true,
    pi: true,
    opencode: true,
  });

  // Reveal secrets state
  const [revealedEnvIndices, setRevealedEnvIndices] = useState<Record<number, boolean>>({});
  const [revealedHeaderIndices, setRevealedHeaderIndices] = useState<Record<number, boolean>>({});

  // Raw JSON
  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize form
  useEffect(() => {
    if (serverToEdit) {
      setId(serverToEdit.id);
      setName(serverToEdit.name);
      setDescription(serverToEdit.description);
      setTagsInput(serverToEdit.tags.join(', '));
      setHomepageUrl(serverToEdit.homepageUrl || '');
      setDocumentationUrl(serverToEdit.documentationUrl || '');
      setTransport(serverToEdit.transport);
      setCommand(serverToEdit.command || 'npx');
      setArgsList(serverToEdit.args || []);
      setCwd(serverToEdit.cwd || '');
      setUrl(serverToEdit.url || '');
      setEnabledTools({ ...serverToEdit.enabledTools });

      // Env pairs
      const envs = Object.entries(serverToEdit.env || {}).map(([k, v]) => ({
        key: k,
        value: v,
        isSecret: k.toLowerCase().includes('key') || k.toLowerCase().includes('token') || k.toLowerCase().includes('secret'),
      }));
      setEnvPairs(envs);

      // Header pairs
      const headers = Object.entries(serverToEdit.headers || {}).map(([k, v]) => ({
        key: k,
        value: v,
        isSecret: k.toLowerCase().includes('auth') || k.toLowerCase().includes('token'),
      }));
      setHeaderPairs(headers);
    } else {
      // New Server
      const defaultId = `mcp-server-${Date.now().toString().slice(-4)}`;
      setId(defaultId);
      setName('');
      setDescription('');
      setTagsInput('');
      setHomepageUrl('');
      setDocumentationUrl('');
      setTransport('stdio');
      setCommand('npx');
      setArgsList(['-y']);
      setEnvPairs([]);
      setCwd('');
      setUrl('');
      setHeaderPairs([]);
      setEnabledTools({
        claude: true,
        codex: true,
        pi: true,
        opencode: true,
      });
    }
  }, [serverToEdit, isOpen]);

  // Sync to Raw JSON when switching to JSON tab
  const syncToJson = () => {
    const envObj: Record<string, string> = {};
    envPairs.forEach((p) => {
      if (p.key.trim()) envObj[p.key.trim()] = p.value;
    });

    const headerObj: Record<string, string> = {};
    headerPairs.forEach((p) => {
      if (p.key.trim()) headerObj[p.key.trim()] = p.value;
    });

    const obj: Partial<McpServer> = {
      id: id.trim(),
      name: name.trim(),
      description: description.trim(),
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      homepageUrl: homepageUrl.trim() || undefined,
      documentationUrl: documentationUrl.trim() || undefined,
      transport,
      command: transport === 'stdio' ? command.trim() : undefined,
      args: transport === 'stdio' ? argsList : undefined,
      env: transport === 'stdio' && Object.keys(envObj).length > 0 ? envObj : undefined,
      cwd: transport === 'stdio' && cwd.trim() ? cwd.trim() : undefined,
      url: transport !== 'stdio' ? url.trim() : undefined,
      headers: transport !== 'stdio' && Object.keys(headerObj).length > 0 ? headerObj : undefined,
      enabledTools,
    };

    setRawJson(JSON.stringify(obj, null, 2));
    setJsonError(null);
  };

  // Sync from Raw JSON back to form fields
  const syncFromJson = (jsonStr: string) => {
    setRawJson(jsonStr);
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.id) setId(parsed.id);
      if (parsed.name) setName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      if (Array.isArray(parsed.tags)) setTagsInput(parsed.tags.join(', '));
      if (parsed.homepageUrl) setHomepageUrl(parsed.homepageUrl);
      if (parsed.documentationUrl) setDocumentationUrl(parsed.documentationUrl);
      if (parsed.transport) setTransport(parsed.transport);
      if (parsed.command) setCommand(parsed.command);
      if (Array.isArray(parsed.args)) setArgsList(parsed.args);
      if (parsed.cwd) setCwd(parsed.cwd);
      if (parsed.url) setUrl(parsed.url);
      if (parsed.enabledTools) setEnabledTools(parsed.enabledTools);

      if (parsed.env && typeof parsed.env === 'object') {
        setEnvPairs(
          Object.entries(parsed.env).map(([k, v]) => ({
            key: k,
            value: String(v),
            isSecret: k.toLowerCase().includes('key') || k.toLowerCase().includes('secret'),
          }))
        );
      }

      if (parsed.headers && typeof parsed.headers === 'object') {
        setHeaderPairs(
          Object.entries(parsed.headers).map(([k, v]) => ({
            key: k,
            value: String(v),
            isSecret: k.toLowerCase().includes('auth'),
          }))
        );
      }

      setJsonError(null);
    } catch (e: any) {
      setJsonError(`JSON Syntax Error: ${e?.message || 'Invalid syntax'}`);
    }
  };

  const handleTabChange = (tab: 'form' | 'json') => {
    if (tab === 'json') {
      syncToJson();
    }
    setActiveTab(tab);
  };

  const handleAddArg = () => {
    if (newArg.trim()) {
      setArgsList([...argsList, newArg.trim()]);
      setNewArg('');
    }
  };

  const handleRemoveArg = (index: number) => {
    setArgsList(argsList.filter((_, i) => i !== index));
  };

  const handleAddEnv = () => {
    setEnvPairs([...envPairs, { key: '', value: '', isSecret: false }]);
  };

  const handleUpdateEnv = (index: number, key: string, value: string, isSecret: boolean) => {
    const updated = [...envPairs];
    updated[index] = { key, value, isSecret };
    setEnvPairs(updated);
  };

  const handleRemoveEnv = (index: number) => {
    setEnvPairs(envPairs.filter((_, i) => i !== index));
  };

  const handleAddHeader = () => {
    setHeaderPairs([...headerPairs, { key: '', value: '', isSecret: false }]);
  };

  const handleUpdateHeader = (index: number, key: string, value: string, isSecret: boolean) => {
    const updated = [...headerPairs];
    updated[index] = { key, value, isSecret };
    setHeaderPairs(updated);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaderPairs(headerPairs.filter((_, i) => i !== index));
  };

  const toggleToolEnablement = (toolId: AIToolId) => {
    setEnabledTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const handleSave = () => {
    const errors: string[] = [];

    const finalId = id.trim();
    if (!finalId) {
      errors.push('Identifier is required.');
    } else if (!isEditing && existingIds.includes(finalId)) {
      errors.push(`Identifier "${finalId}" already exists. Please choose a unique identifier.`);
    }

    if (!name.trim()) {
      errors.push('Display name is required.');
    }

    if (transport === 'stdio') {
      if (!command.trim()) {
        errors.push('Command is required for stdio transport.');
      }
    } else {
      if (!url.trim()) {
        errors.push('Target URL is required for HTTP / SSE transport.');
      }
    }

    // Specific validation warning check
    if (transport === 'sse' && enabledTools.pi) {
      // Per spec: Pi does not accept SSE
      // We will allow saving but alert user or auto-disable
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const envObj: Record<string, string> = {};
    envPairs.forEach((p) => {
      if (p.key.trim()) envObj[p.key.trim()] = p.value;
    });

    const headerObj: Record<string, string> = {};
    headerPairs.forEach((p) => {
      if (p.key.trim()) headerObj[p.key.trim()] = p.value;
    });

    const finalServer: McpServer = {
      id: finalId,
      name: name.trim(),
      description: description.trim(),
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      homepageUrl: homepageUrl.trim() || undefined,
      documentationUrl: documentationUrl.trim() || undefined,
      transport,
      command: transport === 'stdio' ? command.trim() : undefined,
      args: transport === 'stdio' ? argsList : undefined,
      env: transport === 'stdio' && Object.keys(envObj).length > 0 ? envObj : undefined,
      cwd: transport === 'stdio' && cwd.trim() ? cwd.trim() : undefined,
      url: transport !== 'stdio' ? url.trim() : undefined,
      headers: transport !== 'stdio' && Object.keys(headerObj).length > 0 ? headerObj : undefined,
      enabledTools,
      createdAt: serverToEdit?.createdAt || Date.now(),
      updatedAt: Date.now(),
      isCustom: true,
    };

    onSave(finalServer);
  };

  const isPiSseIncompatible = transport === 'sse' && enabledTools.pi;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="h-16 px-6 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
          <div>
            <h2 className="text-base font-semibold text-white">
              {isEditing ? `Edit Server: ${serverToEdit?.name}` : 'Add MCP Server'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Configure connection parameters and target export applications
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Form / JSON mode toggle */}
            <div className="flex items-center p-0.5 bg-neutral-800 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => handleTabChange('form')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'form' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3 h-3" />
                <span>Form</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('json')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'json' ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>Raw JSON</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Validation Errors banner */}
        {validationErrors.length > 0 && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-xs text-rose-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Please resolve these errors before saving:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-2 text-rose-400">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'json' ? (
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Direct JSON configuration editing with two-way sync.</span>
                {jsonError && <span className="text-rose-400 font-mono">{jsonError}</span>}
              </div>
              <textarea
                value={rawJson}
                onChange={(e) => syncFromJson(e.target.value)}
                className="w-full flex-1 min-h-[450px] p-4 bg-neutral-950 font-mono text-xs text-neutral-200 border border-neutral-800 rounded-lg focus:outline-hidden focus:border-amber-500/50 resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>
          ) : (
            <>
              {/* Section 1: General */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2">
                  General Info
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Identifier (Slug) *
                    </label>
                    <input
                      type="text"
                      value={id}
                      disabled={isEditing}
                      onChange={(e) => setId(slugify(e.target.value))}
                      placeholder="e.g. fetch"
                      className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:border-neutral-700 disabled:opacity-60"
                    />
                    <span className="text-[11px] text-neutral-500 mt-0.5 block">
                      Unique key in configuration objects.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Fetch Web MCP"
                      className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:border-neutral-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description of capabilities..."
                    className="w-full p-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:border-neutral-700 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="web, tools, data"
                      className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:border-neutral-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Documentation URL
                    </label>
                    <input
                      type="url"
                      value={documentationUrl}
                      onChange={(e) => setDocumentationUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:border-neutral-700"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Connection */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2">
                  Connection Configuration
                </h3>

                {/* Transport Selector */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-2">
                    Transport Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['stdio', 'http', 'sse'] as McpTransport[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTransport(t)}
                        className={`h-9 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                          transport === t
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 font-semibold'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span className="uppercase font-mono text-[11px]">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {transport === 'stdio' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          Command *
                        </label>
                        <input
                          type="text"
                          value={command}
                          onChange={(e) => setCommand(e.target.value)}
                          placeholder="npx, uvx, node, python3"
                          className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:border-neutral-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">
                          Working Directory (Optional)
                        </label>
                        <input
                          type="text"
                          value={cwd}
                          onChange={(e) => setCwd(e.target.value)}
                          placeholder="/path/to/project"
                          className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:border-neutral-700"
                        />
                      </div>
                    </div>

                    {/* Arguments List */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Arguments
                      </label>
                      <div className="space-y-1.5 mb-2">
                        {argsList.map((arg, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono"
                          >
                            <span className="text-neutral-500 select-none text-[11px] w-4">
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-neutral-200 break-all">{arg}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveArg(idx)}
                              className="text-neutral-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newArg}
                          onChange={(e) => setNewArg(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddArg();
                            }
                          }}
                          placeholder="Add an argument (e.g. -y or @modelcontextprotocol/server-fetch)..."
                          className="flex-1 h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:border-neutral-700"
                        />
                        <button
                          type="button"
                          onClick={handleAddArg}
                          className="h-8 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>

                    {/* Environment Variables */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-neutral-300">
                          Environment Variables
                        </label>
                        <button
                          type="button"
                          onClick={handleAddEnv}
                          className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Variable</span>
                        </button>
                      </div>

                      {envPairs.length === 0 ? (
                        <div className="p-3 text-center border border-dashed border-neutral-800 rounded-lg text-xs text-neutral-500">
                          No environment variables set.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {envPairs.map((pair, idx) => {
                            const isRevealed = revealedEnvIndices[idx];
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={pair.key}
                                  onChange={(e) =>
                                    handleUpdateEnv(idx, e.target.value, pair.value, pair.isSecret)
                                  }
                                  placeholder="KEY_NAME"
                                  className="w-1/3 h-8 px-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono"
                                />
                                <div className="flex-1 relative">
                                  <input
                                    type={pair.isSecret && !isRevealed ? 'password' : 'text'}
                                    value={pair.value}
                                    onChange={(e) =>
                                      handleUpdateEnv(idx, pair.key, e.target.value, pair.isSecret)
                                    }
                                    placeholder="value"
                                    className="w-full h-8 pl-2.5 pr-8 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedEnvIndices((prev) => ({
                                        ...prev,
                                        [idx]: !prev[idx],
                                      }))
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                                    title={isRevealed ? 'Mask secret' : 'Reveal secret'}
                                  >
                                    {isRevealed ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEnv(idx)}
                                  className="p-1.5 text-neutral-500 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* HTTP or SSE */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Server Endpoint URL *
                      </label>
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://api.example.com/v1/mcp"
                        className="w-full h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:border-neutral-700"
                      />
                    </div>

                    {/* Headers */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-neutral-300">
                          HTTP Headers
                        </label>
                        <button
                          type="button"
                          onClick={handleAddHeader}
                          className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Header</span>
                        </button>
                      </div>

                      {headerPairs.length === 0 ? (
                        <div className="p-3 text-center border border-dashed border-neutral-800 rounded-lg text-xs text-neutral-500">
                          No custom headers set.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {headerPairs.map((pair, idx) => {
                            const isRevealed = revealedHeaderIndices[idx];
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={pair.key}
                                  onChange={(e) =>
                                    handleUpdateHeader(idx, e.target.value, pair.value, pair.isSecret)
                                  }
                                  placeholder="Authorization"
                                  className="w-1/3 h-8 px-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono"
                                />
                                <div className="flex-1 relative">
                                  <input
                                    type={pair.isSecret && !isRevealed ? 'password' : 'text'}
                                    value={pair.value}
                                    onChange={(e) =>
                                      handleUpdateHeader(idx, pair.key, e.target.value, pair.isSecret)
                                    }
                                    placeholder="Bearer token"
                                    className="w-full h-8 pl-2.5 pr-8 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedHeaderIndices((prev) => ({
                                        ...prev,
                                        [idx]: !prev[idx],
                                      }))
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                                  >
                                    {isRevealed ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveHeader(idx)}
                                  className="p-1.5 text-neutral-500 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Section 3: Target Application Compatibility */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2">
                  Target Application Export Toggles
                </h3>
                <p className="text-xs text-neutral-400">
                  Select which AI coding tools will include this MCP server in their generated configuration exports.
                </p>

                {isPiSseIncompatible && (
                  <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <div>
                      <strong className="text-rose-200">Pi Transport Incompatibility:</strong> Pi Coding Agent does not accept SSE (Server-Sent Events) as a valid export target. If exported, this server will be omitted from Pi configurations with an explicit warning.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {(['claude', 'codex', 'pi', 'opencode'] as AIToolId[]).map((toolId) => {
                    const isEnabled = enabledTools[toolId];
                    const toolMeta = AI_TOOLS[toolId];
                    const isUnsupported = toolId === 'pi' && transport === 'sse';

                    return (
                      <div
                        key={toolId}
                        onClick={() => toggleToolEnablement(toolId)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isEnabled
                            ? 'border-neutral-700 bg-neutral-950 text-white'
                            : 'border-neutral-800/60 bg-neutral-950/40 text-neutral-500 hover:border-neutral-700'
                        } ${isUnsupported && isEnabled ? 'border-amber-500/40' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: toolMeta.accentColor }}
                          />
                          <div>
                            <div className="font-medium text-xs text-neutral-200">
                              {toolMeta.name}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono">
                              {toolMeta.mcpPath}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                            isEnabled ? 'bg-amber-500 text-neutral-950' : 'border border-neutral-700'
                          }`}
                        >
                          {isEnabled && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-950">
          <div className="text-xs text-neutral-500">
            Changes apply to local browser state only.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Save Changes' : 'Create Server'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
