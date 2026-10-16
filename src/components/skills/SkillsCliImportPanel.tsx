import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, ClipboardPaste, Download, ExternalLink, Loader2, Search, X } from 'lucide-react';
import type { AIToolId, Skill } from '../../types';
import { discoverSkillsFromCommand, fetchSelectedGitHubSkills, type GitHubSkillDiscovery } from '../../services/githubSkillImport';

const EXAMPLE = 'npx skills add https://github.com/vercel-labs/skills --skill find-skills';
type ConflictAction = 'skip' | 'replace' | 'rename';
const TOOL_LABELS: Record<AIToolId, string> = {
  claude: 'Claude Code', codex: 'Codex', pi: 'Pi', opencode: 'OpenCode'
};
const TOOLS: AIToolId[] = ['claude', 'codex', 'pi', 'opencode'];

export interface SkillsCliImportPanelProps {
  existingSkills: Skill[];
  onImportComplete: (skills: Skill[], replacedCount: number) => void | Promise<void>;
}

/** Runs entirely in-browser. The parent SkillImportModal already persists to IndexedDB. */
export function SkillsCliImportPanel({ existingSkills, onImportComplete }: SkillsCliImportPanelProps) {
  const [command, setCommand] = useState(EXAMPLE);
  const [discovery, setDiscovery] = useState<GitHubSkillDiscovery | null>(null);
  const [chosenPaths, setChosenPaths] = useState<string[]>([]);
  const [downloaded, setDownloaded] = useState<Skill[] | null>(null);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<'discover' | 'download' | 'save' | null>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<Record<string, ConflictAction>>({});
  const [enabledTools, setEnabledTools] = useState<Record<AIToolId, boolean>>({
    claude: true, codex: true, pi: true, opencode: true
  });
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const existingMap = useMemo(() => new Map(existingSkills.map(skill => [skill.id, skill])), [existingSkills]);
  const candidateList = useMemo(() => discovery?.candidates.filter(item =>
    item.path.toLowerCase().includes(filter.toLowerCase()) ||
    item.slug.toLowerCase().includes(filter.toLowerCase())) ?? [], [discovery, filter]);

  async function analyze() {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy('discover'); setError(''); setProgress('Reading repository metadata and Git tree…');
    setDiscovery(null); setDownloaded(null); setChosenPaths([]);
    try {
      const result = await discoverSkillsFromCommand(command, controller.signal);
      setDiscovery(result);
      setChosenPaths(result.candidates.filter(candidate => candidate.requested).map(candidate => candidate.path));
      setProgress(`${result.candidates.length} Skill folder(s) found at commit ${result.commitSha.slice(0, 12)}.`);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  async function preview() {
    if (!discovery || chosenPaths.length === 0) {
      setError('Select at least one discovered Skill.'); return;
    }
    const controller = new AbortController();
    abort.current = controller;
    setBusy('download'); setError(''); setDownloaded(null); setProgress('Downloading complete Skill folders…');
    try {
      const skills = await fetchSelectedGitHubSkills(discovery, chosenPaths, {
        signal: controller.signal,
        onProgress: (done, total, file) => setProgress(`${done}/${total} files • ${file}`)
      });
      setDownloaded(skills);
      setConflicts(Object.fromEntries(skills.filter(skill => existingMap.has(skill.id)).map(skill => [skill.id, 'skip'])));
      setProgress(`Downloaded ${skills.length} complete Skill folder(s). Preview before saving.`);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  function togglePath(path: string) {
    setChosenPaths(prev => prev.includes(path) ? prev.filter(x => x !== path) : [...prev, path]);
  }

  async function saveToLibrary() {
    if (!downloaded?.length) return;
    setBusy('save'); setError('');
    try {
      const seen = new Set(existingSkills.map(skill => skill.id));
      const seenInBatch = new Set<string>();
      const toSave: Skill[] = [];
      let replacedCount = 0;
      for (const skill of downloaded) {
        const existing = existingMap.get(skill.id);
        const action: ConflictAction = existing ? (conflicts[skill.id] ?? 'skip') : 'replace';
        if (existing && action === 'skip') continue;
        let id = skill.id;
        let name = skill.name;
        if ((existing && action === 'rename') || seenInBatch.has(id) || (seen.has(id) && !existing)) {
          const suffix = (skill.sourceRepo || 'github').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
          const root = `${skill.id}-${suffix}`;
          id = root;
          let n = 2;
          while (seen.has(id)) id = `${root}-${n++}`;
          name = `${skill.name} (Imported)`;
        }
        if (existing && action === 'replace' && id === skill.id) replacedCount++;
        seen.add(id);
        seenInBatch.add(id);
        toSave.push({
          ...skill, id, name, enabledTools: { ...enabledTools },
          createdAt: existing && action === 'replace' && id === skill.id ? existing.createdAt : skill.createdAt,
          backupContent: existing && action === 'replace' && id === skill.id ? existing.skillMdContent : undefined,
          updatedAt: Date.now()
        });
      }
      if (!toSave.length) throw new Error('Every selected Skill was skipped. Choose Replace or Rename to import.');
      await onImportComplete(toSave, replacedCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  }

  const isBusy = busy !== null;
  return (
    <section className="space-y-4 text-sm text-neutral-200">
      <div className="space-y-2">
        <label htmlFor="skills-cli-command" className="block text-xs font-semibold text-neutral-300">
          Paste a Skills CLI install command (never executed)
        </label>
        <textarea
          id="skills-cli-command" rows={3} spellCheck={false} value={command}
          disabled={isBusy}
          onChange={e => { setCommand(e.target.value); setDiscovery(null); setDownloaded(null); setError(''); }}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 p-3 font-mono text-xs text-neutral-100 focus:border-amber-500 focus:outline-none"
          placeholder={EXAMPLE}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <span>Supports quoted arguments, multiple --skill/-s values, owner/repo@skill, and GitHub tree URLs.</span>
          <button
            type="button" onClick={() => { setCommand(EXAMPLE); setDiscovery(null); setDownloaded(null); }}
            className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200"
          ><ClipboardPaste size={13}/> Example</button>
        </div>
        <button
          type="button" onClick={analyze} disabled={isBusy || !command.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
        >{busy === 'discover' ? <Loader2 size={15} className="animate-spin"/> : <Search size={15}/>} Discover repository Skills</button>
      </div>

      {busy && busy !== 'save' && (
        <button type="button" className="ml-2 text-xs text-neutral-400 hover:text-white" onClick={() => abort.current?.abort()}>
          <X size={12} className="inline"/> Cancel fetch
        </button>
      )}
      {progress && <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-2 font-mono text-[11px] text-neutral-400 break-all" aria-live="polite">{progress}</div>}
      {error && <div role="alert" className="flex gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertCircle size={16} className="shrink-0"/>{error}</div>}

      {discovery && !downloaded && (
        <div className="space-y-3 rounded-lg border border-neutral-800 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold">{discovery.owner}/{discovery.repo}</div>
              <div className="font-mono text-[11px] text-neutral-500">{discovery.branch} • {discovery.commitSha.slice(0, 12)} • {discovery.candidates.length} available</div>
            </div>
            <a className="flex items-center gap-1 text-xs text-amber-300" href={`https://github.com/${discovery.owner}/${discovery.repo}/tree/${discovery.commitSha}`} target="_blank" rel="noopener noreferrer">GitHub <ExternalLink size={13}/></a>
          </div>
          <input
            aria-label="Filter Skill folders" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Filter Skill folder paths…"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs outline-none focus:border-amber-500"
          />
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {candidateList.slice(0, 250).map(candidate => (
              <label key={candidate.path} className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-neutral-800">
                <input type="checkbox" checked={chosenPaths.includes(candidate.path)} onChange={() => togglePath(candidate.path)} className="mt-1"/>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{candidate.slug}</span>
                  <span className="block break-all font-mono text-[10px] text-neutral-500">{candidate.path || '(repo root)'} • {candidate.fileCount} files • {(candidate.totalSize / 1024).toFixed(1)} KiB</span>
                </span>
              </label>
            ))}
            {candidateList.length > 250 && <p className="p-2 text-xs text-neutral-500">Showing first 250. Narrow the filter to find more.</p>}
          </div>
          <button
            type="button" onClick={preview} disabled={isBusy || chosenPaths.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-50"
          ><Download size={15}/> Fetch {chosenPaths.length} selected Skill folder(s)</button>
        </div>
      )}

      {downloaded && (
        <div className="space-y-3 rounded-lg border border-neutral-800 p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Import preview: {downloaded.length} complete Skill(s)</h3>
            <button type="button" className="text-xs text-amber-300" onClick={() => setDownloaded(null)}>Change selection</button>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {downloaded.map((skill, i) => {
              const exists = existingMap.has(skill.id);
              return <div key={`${skill.sourcePath}-${i}`} className="rounded-lg border border-neutral-700 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{skill.name}</span>
                  <span className="text-[10px] text-neutral-500">{skill.files.length} files</span>
                </div>
                <p className="my-1 text-xs text-neutral-400">{skill.description}</p>
                <div className="font-mono text-[10px] text-neutral-500">{skill.sourceRepo}/{skill.sourcePath}</div>
                <details className="mt-2"><summary className="cursor-pointer text-xs text-amber-300">Inspect imported files</summary>
                  <ul className="mt-1 max-h-28 overflow-y-auto space-y-1 font-mono text-[10px] text-neutral-400">
                    {skill.files.map(file => <li key={file.path} className="break-all">{file.path}{file.isBinary ? ' (binary / Base64)' : ''}</li>)}
                  </ul>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-neutral-950 p-2 text-[10px]">{skill.skillMdContent.slice(0, 2500)}{skill.skillMdContent.length > 2500 ? '\n…' : ''}</pre>
                </details>
                {exists && <label className="mt-2 flex items-center gap-2 text-xs text-amber-300">
                  Existing Skill ID {skill.id}:
                  <select
                    value={conflicts[skill.id] ?? 'skip'} onChange={e => setConflicts(prev => ({ ...prev, [skill.id]: e.target.value as ConflictAction }))}
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-neutral-100"
                  >
                    <option value="skip">Skip (default)</option>
                    <option value="replace">Replace (backup manifest)</option>
                    <option value="rename">Keep both (rename)</option>
                  </select>
                </label>}
              </div>;
            })}
          </div>
          <div className="space-y-2 border-t border-neutral-800 pt-3">
            <div className="text-xs font-medium text-neutral-300">Include exported Skills for:</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TOOLS.map(tool => <label key={tool} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={enabledTools[tool]} onChange={e => setEnabledTools(prev => ({...prev, [tool]: e.target.checked}))}/>
                {TOOL_LABELS[tool]}
              </label>)}
            </div>
          </div>
          <button
            type="button" disabled={isBusy} onClick={saveToLibrary}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
          >{busy === 'save' ? <Loader2 size={15} className="animate-spin"/> : <Check size={15}/>} Save to browser Skill library</button>
          <p className="text-[11px] text-neutral-500">Files are stored in IndexedDB, not installed into local agent directories. ZIP exports restore binary files.</p>
        </div>
      )}
    </section>
  );
}
