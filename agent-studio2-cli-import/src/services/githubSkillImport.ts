import type { Skill, SkillFile } from '../types';
import { parseSkillsAddCommand, SkillImportError, type SkillsAddCommand } from './skillsCliCommand';

const API = 'https://api.github.com';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SKILL_BYTES = 32 * 1024 * 1024;
const MAX_SKILL_FILES = 250;
const MAX_DISCOVERED_SKILLS = 3000;
const WORKERS = 4;

interface GitTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
}

export interface GitHubSkillCandidate {
  path: string;
  slug: string;
  fileCount: number;
  totalSize: number;
  requested: boolean;
}

export interface GitHubSkillDiscovery {
  command: SkillsAddCommand;
  owner: string;
  repo: string;
  branch: string;
  commitSha: string;
  tree: GitTreeItem[];
  candidates: GitHubSkillCandidate[];
}

function ensureOk(resp: Response, what: string): void {
  if (resp.ok) return;
  if (resp.status === 403 || resp.status === 429) {
    throw new SkillImportError(`${what}: GitHub rate limit or access restriction (HTTP ${resp.status}). Try again later or import a ZIP.`);
  }
  if (resp.status === 404) throw new SkillImportError(`${what} not found on GitHub (HTTP 404).`);
  throw new SkillImportError(`${what} failed (HTTP ${resp.status}).`);
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    });
  } catch (error) {
    if (signal?.aborted) throw new SkillImportError('Import cancelled.');
    throw new SkillImportError(`Could not connect to GitHub. Check your connection and browser restrictions. ${String(error)}`);
  }
  ensureOk(response, 'GitHub API request');
  return (await response.json()) as T;
}

function tidyPath(value: string): string {
  const segments = value.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (segments.some(segment => segment === '.' || segment === '..' || segment.includes('\\'))) {
    throw new SkillImportError('Unsafe repository folder path.');
  }
  return segments.join('/');
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, '-');
}

function startsInFolder(path: string, folder: string): boolean {
  return folder === '' || path.startsWith(`${folder}/`);
}

/** Metadata-only discovery; no Skill files are downloaded until the user previews selected results. */
export async function discoverSkillsFromCommand(input: string, signal?: AbortSignal): Promise<GitHubSkillDiscovery> {
  const command = parseSkillsAddCommand(input);
  const { owner, repo } = command;
  const repoPath = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const metadata = await getJson<{ default_branch: string }>(`${API}/repos/${repoPath}`, signal);
  if (!metadata.default_branch) throw new SkillImportError('GitHub did not return the default branch.');

  let branch = metadata.default_branch;
  let pathHint = '';
  const urlParts = command.urlRefSegments;
  if (urlParts?.length) {
    // A URL may include a branch with slashes. Prefer the known default branch,
    // otherwise try candidate ref prefixes from longest to shortest.
    const defaultParts = metadata.default_branch.split('/');
    if (urlParts.slice(0, defaultParts.length).join('/') === metadata.default_branch) {
      branch = metadata.default_branch;
      pathHint = urlParts.slice(defaultParts.length).join('/');
    } else {
      let found = false;
      for (let size = Math.min(urlParts.length, 6); size >= 1; size--) {
        const possibleRef = urlParts.slice(0, size).join('/');
        const res = await fetch(`${API}/repos/${repoPath}/commits/${encodeURIComponent(possibleRef)}`, {
          signal,
          headers: { Accept: 'application/vnd.github+json' }
        });
        if (res.ok) {
          branch = possibleRef;
          pathHint = urlParts.slice(size).join('/');
          found = true;
          break;
        }
        if (res.status !== 404) ensureOk(res, 'GitHub branch lookup');
      }
      if (!found) throw new SkillImportError('Could not resolve the branch in the GitHub URL.');
    }
  }

  const commit = await getJson<{ sha: string; commit: { tree: { sha: string } } }>(
    `${API}/repos/${repoPath}/commits/${encodeURIComponent(branch)}`,
    signal
  );
  const commitSha = commit.sha;
  const treeSha = commit.commit?.tree?.sha;
  if (!/^[a-f0-9]{40,64}$/i.test(commitSha) || !treeSha) {
    throw new SkillImportError('GitHub returned an invalid commit or tree SHA.');
  }
  const result = await getJson<{ tree: GitTreeItem[]; truncated?: boolean }>(
    `${API}/repos/${repoPath}/git/trees/${treeSha}?recursive=1`, signal
  );
  if (result.truncated) {
    throw new SkillImportError('Repository file tree was truncated by GitHub. Use a smaller repository or import a downloaded ZIP; no partial Skill will be imported.');
  }
  if (!Array.isArray(result.tree)) throw new SkillImportError('Invalid GitHub file tree response.');
  const tree = result.tree.filter(x => x.type === 'blob' && typeof x.path === 'string' && typeof x.sha === 'string');
  for (const file of tree) {
    if (file.path.split('/').some(part => !part || part === '.' || part === '..' || /[\\\x00-\x1f]/.test(part))) {
      throw new SkillImportError('Repository contains unsafe paths. Import refused.');
    }
  }
  if (pathHint.toLowerCase() === 'skill.md') pathHint = '';
  else if (pathHint.toLowerCase().endsWith('/skill.md')) pathHint = pathHint.slice(0, -9);
  pathHint = tidyPath(pathHint);

  const roots = tree.filter(x => x.path.split('/').at(-1)?.toLowerCase() === 'skill.md').map(x => x.path.slice(0, -'SKILL.md'.length).replace(/\/$/, ''));
  if (!roots.length) throw new SkillImportError('No SKILL.md files were found in this repository.');
  if (roots.length > MAX_DISCOVERED_SKILLS) throw new SkillImportError('Repository contains too many Skills for browser discovery.');
  const candidates: GitHubSkillCandidate[] = roots
    .filter(root => root === pathHint || startsInFolder(root, pathHint) || !pathHint)
    .map(root => {
      const childRoots = roots.filter(other => other !== root && startsInFolder(other, root));
      const assets = tree.filter(item => startsInFolder(item.path, root) &&
        !childRoots.some(child => startsInFolder(item.path, child)));
      return {
        path: root,
        slug: root.split('/').filter(Boolean).at(-1) || repo,
        fileCount: assets.length,
        totalSize: assets.reduce((sum, x) => sum + (x.size ?? 0), 0),
        requested: false
      };
    });
  if (!candidates.length) throw new SkillImportError(`No SKILL.md directory exists under ${pathHint || 'this repository'}.`);

  const missing: string[] = [];
  for (const requested of command.requestedSkills) {
    const matching = candidates.filter(c => normalizeName(c.slug) === normalizeName(requested) ||
      c.path.toLowerCase() === requested.replace(/^\/+/, '').toLowerCase());
    if (matching.length === 0) missing.push(requested);
    else if (matching.length > 1) {
      throw new SkillImportError(`"${requested}" matches multiple folders (${matching.map(m => m.path).join(', ')}). Specify a full relative Skill path.`);
    } else matching[0].requested = true;
  }
  if (missing.length) {
    throw new SkillImportError(`Skill(s) not found: ${missing.join(', ')}. Available: ${candidates.slice(0, 20).map(c => c.path).join(', ')}${candidates.length > 20 ? '…' : ''}`);
  }
  if (command.requestedSkills.length === 0 && candidates.length === 1) candidates[0].requested = true;
  return { command, owner, repo, branch, commitSha, tree, candidates };
}

function isBinary(bytes: Uint8Array, path: string): boolean {
  if (/\.(?:zip|png|jpe?g|gif|webp|ico|pdf|wasm|mp[34]|mov|webm|woff2?|ttf|otf|eot|gz|tar|7z|sqlite|db|jar|exe|bin|class|pyc|ico)$/i.test(path)) return true;
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  if (sample.includes(0)) return true;
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return false; }
  catch { return true; }
}

function toBase64(bytes: Uint8Array): string {
  let output = '';
  for (let i = 0; i < bytes.length; i += 32768) {
    output += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(output);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value.replace(/\s/g, ''));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function downloadBlobBytes(
  owner: string, repo: string, commit: string, item: GitTreeItem, signal?: AbortSignal
): Promise<Uint8Array> {
  const raw = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${commit}/${item.path.split('/').map(encodeURIComponent).join('/')}`;
  try {
    const response = await fetch(raw, { signal });
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_FILE_BYTES) throw new SkillImportError(`File exceeds 10 MiB: ${item.path}`);
      return new Uint8Array(buffer);
    }
  } catch (err) {
    if (signal?.aborted) throw new SkillImportError('Import cancelled.');
    if (err instanceof SkillImportError) throw err;
    // Some browsers restrict raw.githubusercontent.com. Fall back to the Git Blobs API.
  }
  const blob = await getJson<{ encoding: string; content: string; size: number }>(
    `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/blobs/${item.sha}`, signal
  );
  if (blob.encoding !== 'base64' || !blob.content) throw new SkillImportError(`Could not read complete binary contents of ${item.path}.`);
  if (blob.size > MAX_FILE_BYTES) throw new SkillImportError(`File exceeds 10 MiB: ${item.path}`);
  return fromBase64(blob.content);
}

function frontmatterField(text: string, field: string): string | undefined {
  const block = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!block) return undefined;
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`^${escapedField}:\\s*(.*)$`, 'm'));
  if (!match) return undefined;
  let result = match[1].trim();
  if (result === '>' || result === '|') {
    result = block.slice(block.indexOf(match[0]) + match[0].length).split('\n').slice(1)
      .filter(line => /^\s+\S/.test(line)).map(line => line.trim()).join(' ');
  }
  return result.replace(/^(["'])([\s\S]*)\1$/, '$2').trim();
}

/** Downloads the complete tracked folder at a pinned commit; never generates fictitious files. */
export async function fetchSelectedGitHubSkills(
  discovery: GitHubSkillDiscovery,
  chosenPaths: string[],
  options: { signal?: AbortSignal; onProgress?: (done: number, total: number, file: string) => void } = {}
): Promise<Skill[]> {
  const selected = [...new Set(chosenPaths)];
  if (!selected.length) throw new SkillImportError('Select at least one Skill.');
  if (selected.length > 30) throw new SkillImportError('Import at most 30 Skills at a time.');
  const roots = discovery.candidates.map(c => c.path);
  for (const path of selected) if (!roots.includes(path)) throw new SkillImportError(`Invalid selected Skill path: ${path}`);

  const grouped = selected.map(root => {
    const childRoots = roots.filter(other => other !== root && startsInFolder(other, root));
    const files = discovery.tree.filter(item => startsInFolder(item.path, root) &&
      !childRoots.some(child => startsInFolder(item.path, child)));
    if (files.length > MAX_SKILL_FILES) throw new SkillImportError(`${root} has too many files (${files.length}).`);
    const bytes = files.reduce((sum, file) => sum + (file.size ?? 0), 0);
    if (bytes > MAX_SKILL_BYTES) throw new SkillImportError(`${root} is larger than 32 MiB.`);
    for (const f of files) {
      if ((f.size ?? 0) > MAX_FILE_BYTES) throw new SkillImportError(`File exceeds 10 MiB: ${f.path}`);
    }
    return { root, files };
  });
  const entries = grouped.flatMap(group => group.files.map(file => ({ root: group.root, file })));
  if (entries.length > 500) throw new SkillImportError('Too many files in a single import (max 500).');
  if (entries.reduce((sum, f) => sum + (f.file.size ?? 0), 0) > 60 * 1024 * 1024) {
    throw new SkillImportError('Combined import is larger than 60 MiB.');
  }

  let done = 0;
  let index = 0;
  const resultMap = new Map<string, SkillFile[]>(selected.map(x => [x, []]));
  await Promise.all(Array.from({ length: Math.min(WORKERS, entries.length) }, async () => {
    while (index < entries.length) {
      const entry = entries[index++];
      if (options.signal?.aborted) throw new SkillImportError('Import cancelled.');
      const bytes = await downloadBlobBytes(discovery.owner, discovery.repo, discovery.commitSha, entry.file, options.signal);
      const relative = entry.root ? entry.file.path.slice(entry.root.length + 1) : entry.file.path;
      const binary = isBinary(bytes, relative);
      const file: SkillFile = binary
        ? { path: relative, content: toBase64(bytes), isBinary: true }
        : { path: relative, content: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
      resultMap.get(entry.root)!.push(file);
      options.onProgress?.(++done, entries.length, entry.file.path);
    }
  }));

  const now = Date.now();
  const skills: Skill[] = [];
  for (const group of grouped) {
    const files = resultMap.get(group.root)!.sort((a, b) => a.path.localeCompare(b.path));
    const manifest = files.find(file => file.path === 'SKILL.md');
    if (!manifest || manifest.isBinary || !manifest.content.trim().startsWith('---')) {
      throw new SkillImportError(`${group.root || '(root)'} does not contain a valid text SKILL.md manifest.`);
    }
    const name = frontmatterField(manifest.content, 'name');
    const description = frontmatterField(manifest.content, 'description');
    if (!name || !description) throw new SkillImportError(`${group.root} SKILL.md is missing required name or description frontmatter.`);
    const slug = group.root.split('/').filter(Boolean).at(-1) || discovery.repo;
    // SHA-256 over the tracked files' Git blob IDs, paths and sizes. Stable until files change.
    const shaInput = group.files.sort((a,b) => a.path.localeCompare(b.path))
      .map(file => `${file.path}\0${file.sha}\0${file.size ?? 0}`).join('\n');
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(shaInput));
    const contentHash = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join('');
    skills.push({
      id: slug, name, description, tags: ['github', 'skills-cli'], category: 'Imported',
      sourceType: 'github', sourceRepo: `${discovery.owner}/${discovery.repo}`, sourcePath: group.root,
      version: discovery.commitSha.slice(0, 12), contentHash,
      lastImportedAt: now, skillMdContent: manifest.content, files,
      enabledTools: { claude: true, codex: true, pi: true, opencode: true },
      createdAt: now, updatedAt: now
    });
  }
  return skills;
}
