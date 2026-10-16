/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Search,
  Github,
  Download,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  FolderGit2,
  Filter,
} from 'lucide-react';
import { Skill } from '../../types';
import {
  PRESET_REPOSITORIES,
  CURATED_DISCOVERABLE_SKILLS,
  RemoteSkillMeta,
  fetchGitHubSkills,
  fetchRemoteSkillMd,
  parseRepoString,
} from '../../services/githubService';

interface SkillDiscoverViewProps {
  existingSkills: Skill[];
  onImportSkill: (skill: Partial<Skill>) => void;
  onOpenImportModal: () => void;
}

export const SkillDiscoverView: React.FC<SkillDiscoverViewProps> = ({
  existingSkills,
  onImportSkill,
  onOpenImportModal,
}) => {
  const [selectedRepo, setSelectedRepo] = useState(PRESET_REPOSITORIES[0].repo);
  const [customRepoInput, setCustomRepoInput] = useState('');
  const [customBranch, setCustomBranch] = useState('main');
  const [customPath, setCustomPath] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlyNotInLibrary, setOnlyNotInLibrary] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [liveSkills, setLiveSkills] = useState<RemoteSkillMeta[]>([]);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const existingIds = new Set(existingSkills.map((s) => s.id));

  // Determine active skills pool: live if fetched, otherwise curated collection
  const basePool = liveSkills.length > 0 ? liveSkills : CURATED_DISCOVERABLE_SKILLS;

  const categories = Array.from(
    new Set(basePool.map((s) => s.category).filter(Boolean) as string[])
  );

  const filteredSkills = basePool.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase()) ||
      skill.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'all' || skill.category === categoryFilter;

    const inLibrary = existingIds.has(skill.id);
    const matchesLibrary = !onlyNotInLibrary || !inLibrary;

    return matchesSearch && matchesCategory && matchesLibrary;
  });

  const handleFetchRepo = async (ownerRepo: string, branch = 'main', path = '') => {
    setIsLoading(true);
    setApiError(null);

    const parsed = parseRepoString(ownerRepo);
    if (!parsed) {
      setApiError('Invalid GitHub repository format. Use "owner/repo" or full URL.');
      setIsLoading(false);
      return;
    }

    const res = await fetchGitHubSkills(parsed.owner, parsed.repo, branch, path);
    setIsLoading(false);

    if (res.error) {
      setApiError(res.error);
    }

    if (res.skills.length > 0) {
      setLiveSkills(res.skills);
    }
  };

  const handleImportRemoteSkill = async (remote: RemoteSkillMeta) => {
    let content = remote.sampleContent || '';

    // If no sample content, attempt fetch SKILL.md from GitHub
    if (!content) {
      const fetched = await fetchRemoteSkillMd(remote.repo, remote.branch, remote.path);
      if (fetched) {
        content = fetched.content;
      } else {
        content = `---\nname: ${remote.id}\ndescription: ${remote.description}\n---\n\n# ${remote.name}\n\n${remote.description}\n`;
      }
    }

    const newSkill: Partial<Skill> = {
      id: remote.id,
      name: remote.name,
      description: remote.description,
      tags: remote.tags,
      category: remote.category || 'General',
      sourceType: 'github',
      sourceRepo: remote.repo,
      sourcePath: remote.path,
      version: '1.0.0',
      lastImportedAt: Date.now(),
      skillMdContent: content,
      files: [
        {
          path: 'SKILL.md',
          content,
        },
      ],
      enabledTools: {
        claude: true,
        codex: true,
        pi: true,
        opencode: true,
      },
    };

    onImportSkill(newSkill);
    setImportedIds((prev) => new Set([...prev, remote.id]));
  };

  return (
    <div className="space-y-6">
      {/* GitHub Source Selector Card */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Github className="w-5 h-5 text-neutral-200" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                Discover Agent Skills from GitHub
              </h3>
              <p className="text-xs text-neutral-400">
                Browse official and community skill repositories containing SKILL.md specifications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLiveSkills([]);
                setApiError(null);
              }}
              className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
            >
              Reset to Curated Catalog
            </button>
          </div>
        </div>

        {/* Preset Repositories buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_REPOSITORIES.map((repo) => (
            <button
              key={repo.repo}
              onClick={() => {
                setSelectedRepo(repo.repo);
                handleFetchRepo(repo.repo, repo.branch, repo.path);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-colors ${
                selectedRepo === repo.repo && liveSkills.length > 0
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>{repo.name}</span>
              <span className="text-[10px] text-neutral-500 font-mono">({repo.repo})</span>
            </button>
          ))}
        </div>

        {/* Custom repo query bar */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-neutral-800/60">
          <input
            type="text"
            value={customRepoInput}
            onChange={(e) => setCustomRepoInput(e.target.value)}
            placeholder="Custom repo (e.g. owner/repo or https://github.com/owner/repo)..."
            className="flex-1 h-8 px-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono focus:border-neutral-700"
          />
          <input
            type="text"
            value={customBranch}
            onChange={(e) => setCustomBranch(e.target.value)}
            placeholder="branch (main)"
            className="w-24 h-8 px-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono"
          />
          <input
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="folder path (optional)"
            className="w-36 h-8 px-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 font-mono"
          />
          <button
            onClick={() => handleFetchRepo(customRepoInput, customBranch, customPath)}
            disabled={isLoading || !customRepoInput.trim()}
            className="h-8 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>Browse Repo</span>
          </button>
        </div>

        {apiError && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span>{apiError}</span>
              <div className="mt-1 text-[11px] text-neutral-400">
                You can also import skills manually via ZIP or paste in the Installed Library tab.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Skills.sh integration guidance card */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-neutral-800 text-neutral-300">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="font-semibold text-neutral-200">Looking for skills.sh registry packages?</div>
            <p className="text-neutral-400 text-[11px] mt-0.5">
              Explore skills on skills.sh, then import them directly via ZIP or copy the SKILL.md markdown.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://skills.sh"
            target="_blank"
            rel="noreferrer"
            className="h-8 px-3 rounded-lg border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span>Visit skills.sh</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
          </a>
          <button
            onClick={onOpenImportModal}
            className="h-8 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium flex items-center gap-1.5 transition-colors"
          >
            <span>Import ZIP / File</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-sm relative">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search discoverable skills..."
            className="w-full h-8 pl-9 pr-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-neutral-700"
          />
        </div>

        <div className="flex items-center gap-3">
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyNotInLibrary}
              onChange={(e) => setOnlyNotInLibrary(e.target.checked)}
              className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
            />
            <span>Not in Library</span>
          </label>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((skill) => {
          const inLibrary = existingIds.has(skill.id) || importedIds.has(skill.id);

          return (
            <div
              key={skill.id}
              className="p-5 rounded-xl border border-neutral-800 bg-neutral-950/70 hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-sm text-neutral-100">
                    {skill.name}
                  </h4>
                  {skill.category && (
                    <span className="text-[10px] font-mono text-neutral-500 px-2 py-0.5 rounded bg-neutral-900">
                      {skill.category}
                    </span>
                  )}
                </div>

                <div className="font-mono text-[11px] text-neutral-500 mb-2 truncate">
                  {skill.repo}
                </div>

                <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed mb-4">
                  {skill.description}
                </p>

                <div className="flex flex-wrap gap-1 mb-4 text-[10px] text-neutral-500">
                  {skill.tags.map((tag) => (
                    <span key={tag} className="text-neutral-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                {skill.htmlUrl ? (
                  <a
                    href={skill.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-neutral-500">Curated skill</span>
                )}

                <button
                  onClick={() => handleImportRemoteSkill(skill)}
                  disabled={inLibrary}
                  className={`h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    inLibrary
                      ? 'bg-neutral-800 text-neutral-500 cursor-default'
                      : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold'
                  }`}
                >
                  {inLibrary ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>In Library</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3" />
                      <span>Import</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
