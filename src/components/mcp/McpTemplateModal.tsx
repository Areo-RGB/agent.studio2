/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { McpServer, McpTransport } from '../../types';

export interface McpTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  homepageUrl: string;
  documentationUrl?: string;
  transport: McpTransport;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export const POPULAR_MCP_TEMPLATES: McpTemplate[] = [
  {
    id: 'fetch',
    name: 'Fetch MCP',
    description: 'Fetch web content and HTML documents, converting them into clean Markdown for the agent.',
    tags: ['web', 'scraping', 'http'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    documentationUrl: 'https://modelcontextprotocol.io/examples',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-fetch'],
  },
  {
    id: 'time',
    name: 'Time MCP',
    description: 'Provides local time, ISO 8601 timestamps, UTC conversions, and time zone calculations.',
    tags: ['utility', 'time', 'datetime'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/time',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-time', '--local-timezone=UTC'],
  },
  {
    id: 'memory',
    name: 'Memory Graph',
    description: 'Open-source graph memory server enabling persistent entities and relationship tracking.',
    tags: ['memory', 'knowledge-graph', 'state'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
    documentationUrl: 'https://modelcontextprotocol.io/docs/concepts/resources',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Dynamic structured reasoning tool for breaking complex problems into iterative steps.',
    tags: ['reasoning', 'planning', 'thought-chain'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
  },
  {
    id: 'context7',
    name: 'Context7 Docs Search',
    description: 'Semantic framework documentation search server by Upstash with vector indexing.',
    tags: ['search', 'documentation', 'remote'],
    homepageUrl: 'https://context7.com',
    documentationUrl: 'https://context7.com/docs/mcp',
    transport: 'http',
    url: 'https://api.context7.com/v1/mcp',
    headers: {
      Authorization: 'Bearer c7_your_api_key_here',
    },
  },
  {
    id: 'filesystem',
    name: 'Filesystem Access',
    description: 'Secure local filesystem access with restricted folder permissions and file inspection.',
    tags: ['filesystem', 'files', 'local'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/directory'],
  },
  {
    id: 'github',
    name: 'GitHub MCP',
    description: 'Search repositories, read code files, inspect pull requests, and manage issues.',
    tags: ['github', 'git', 'vcs'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_your_github_token_here',
    },
  },
  {
    id: 'postgres',
    name: 'PostgreSQL MCP',
    description: 'Read-only or schema inspection access to relational PostgreSQL databases.',
    tags: ['database', 'sql', 'postgres'],
    homepageUrl: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
  },
];

interface McpTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: McpTemplate) => void;
}

export const McpTemplateModal: React.FC<McpTemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-3xl w-full shadow-2xl p-6 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Popular MCP Server Templates</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Select a pre-configured template as a starting point. Templates are not automatically installed on your machine.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {POPULAR_MCP_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                onClick={() => {
                  onSelectTemplate(tmpl);
                  onClose();
                }}
                className="p-4 rounded-lg border border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-800/40 cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-neutral-200 group-hover:text-amber-300 transition-colors">
                      {tmpl.name}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                      {tmpl.transport}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed mb-3">
                    {tmpl.description}
                  </p>

                  <div className="text-[11px] font-mono text-neutral-500 bg-neutral-900/90 p-2 rounded border border-neutral-800/80 truncate mb-2">
                    {tmpl.transport === 'stdio'
                      ? `${tmpl.command} ${(tmpl.args || []).join(' ')}`
                      : tmpl.url}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-500">
                    {tmpl.tags.map((tag) => (
                      <span key={tag} className="text-[10px] text-neutral-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-amber-400 font-medium flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <span>Use Template</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
