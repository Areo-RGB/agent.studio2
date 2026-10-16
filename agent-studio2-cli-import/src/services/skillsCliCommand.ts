/** Pure, non-executing parser for common `skills add` CLI command forms. */
export interface SkillsAddCommand {
  owner: string;
  repo: string;
  requestedSkills: string[];
  /** Optional branch/ref from a GitHub /tree/ or /blob/ URL. */
  urlRefSegments?: string[];
  /** Optional path after the branch/ref in the GitHub URL. */
  urlPathSegments?: string[];
  source: string;
}

export class SkillImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillImportError';
  }
}

/** Minimal shell-like lexer: handles quote groups, escaped spaces, and multi-line paste. Never executes input. */
export function tokenizeCommand(input: string): string[] {
  if (!input.trim()) throw new SkillImportError('Paste a Skills CLI install command.');
  if (/[\r\n]/.test(input.trim().replace(/\\\r?\n/g, ''))) {
    throw new SkillImportError('Provide one command at a time.');
  }
  const words: string[] = [];
  let buffer = '';
  let quote: 'single' | 'double' | null = null;
  let active = false;

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '\\' && quote !== 'single' && i + 1 < input.length) {
      const next = input[i + 1];
      // Inside double quotes, only a subset of escapes is meaningful.
      if (quote === null || ['\\', '"', '$', '`'].includes(next)) {
        buffer += next;
        active = true;
        i++;
        continue;
      }
    }
    if (c === "'" && quote !== 'double') {
      quote = quote === 'single' ? null : 'single';
      active = true;
      continue;
    }
    if (c === '"' && quote !== 'single') {
      quote = quote === 'double' ? null : 'double';
      active = true;
      continue;
    }
    if (quote === null && /\s/.test(c)) {
      if (active) words.push(buffer);
      buffer = '';
      active = false;
      continue;
    }
    // Disallow compound shell commands rather than treating their fragments as skills.
    if (quote === null && /[;&|<>`]/.test(c)) {
      throw new SkillImportError('Only a single skills add command is accepted (no shell operators).');
    }
    if (c === '`' || (c === '$' && input[i + 1] === '(')) {
      throw new SkillImportError('Command substitution is not supported.');
    }
    buffer += c;
    active = true;
  }
  if (quote) throw new SkillImportError('An opening quote has no matching closing quote.');
  if (active) words.push(buffer);
  return words[0] === '$' ? words.slice(1) : words;
}

function validateSegment(value: string, label: string): string {
  if (!/^[A-Za-z0-9_.-]+$/.test(value) || value === '.' || value === '..') {
    throw new SkillImportError(`Invalid ${label}: ${value || '(empty)'}`);
  }
  return value;
}

function parseSource(source: string): {
  owner: string; repo: string; shorthandSkill?: string;
  urlRefSegments?: string[]; urlPathSegments?: string[];
} {
  let owner = '';
  let repo = '';
  let shorthandSkill: string | undefined;
  let urlRefSegments: string[] | undefined;
  let urlPathSegments: string[] | undefined;

  if (/^https?:\/\//i.test(source)) {
    let parsed: URL;
    try { parsed = new URL(source); }
    catch { throw new SkillImportError('Invalid GitHub URL.'); }
    if (parsed.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(parsed.hostname.toLowerCase())) {
      throw new SkillImportError('Only HTTPS github.com repository URLs are supported.');
    }
    const segments = parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (segments.length < 2) throw new SkillImportError('GitHub URL must contain owner/repository.');
    [owner, repo] = segments;
    if (segments.length > 2) {
      if (!['tree', 'blob'].includes(segments[2])) {
        throw new SkillImportError('Use the repository URL or a /tree/branch/path GitHub URL.');
      }
      urlRefSegments = segments.slice(3);
      urlPathSegments = segments.slice(3);
      if (!urlRefSegments.length) throw new SkillImportError('GitHub tree URL is missing a branch.');
    }
  } else {
    const match = source.match(/^([^/\s]+)\/([^/\s@]+?)(?:@(.+))?$/);
    if (!match) throw new SkillImportError('Use a GitHub URL or owner/repo@skill shorthand.');
    owner = match[1];
    repo = match[2];
    shorthandSkill = match[3];
  }
  if (repo.endsWith('.git')) repo = repo.slice(0, -4);
  validateSegment(owner, 'repository owner');
  validateSegment(repo, 'repository name');
  if (shorthandSkill && !shorthandSkill.trim()) throw new SkillImportError('Skill name is empty.');
  return { owner, repo, shorthandSkill, urlRefSegments, urlPathSegments };
}

export function parseSkillsAddCommand(input: string): SkillsAddCommand {
  const tokens = tokenizeCommand(input);
  let i = 0;
  if (tokens[i] === 'npx' || tokens[i] === 'bunx') {
    i++;
    while (['-y', '--yes'].includes(tokens[i])) i++;
    if (!/^skills(?:@[^\s]+)?$/.test(tokens[i] || '')) {
      throw new SkillImportError('Expected "npx skills add …".');
    }
    i++;
  } else if (tokens[i] === 'pnpm' && tokens[i + 1] === 'dlx') {
    i += 2;
    if (!/^skills(?:@[^\s]+)?$/.test(tokens[i] || '')) throw new SkillImportError('Expected pnpm dlx skills add …');
    i++;
  } else if (tokens[i] === 'skills') {
    i++;
  } else {
    throw new SkillImportError('Supported commands start with "npx skills add", "bunx skills add", "pnpm dlx skills add", or "skills add".');
  }
  if (tokens[i++] !== 'add') throw new SkillImportError('This importer only supports the "skills add" command.');
  const source = tokens[i++];
  if (!source || source.startsWith('-')) throw new SkillImportError('Missing GitHub repository URL or owner/repo.');
  const parsed = parseSource(source);
  const names: string[] = parsed.shorthandSkill ? [parsed.shorthandSkill] : [];
  let collectingSkills = false;
  while (i < tokens.length) {
    const token = tokens[i++];
    if (token === '--skill' || token === '-s') {
      collectingSkills = true;
      if (!tokens[i] || tokens[i].startsWith('-')) throw new SkillImportError(`${token} needs a skill name.`);
      continue;
    }
    if (token.startsWith('--skill=') || token.startsWith('-s=')) {
      collectingSkills = false;
      names.push(...token.slice(token.indexOf('=') + 1).split(',').map(x => x.trim()).filter(Boolean));
      continue;
    }
    if (['-g', '--global', '-y', '--yes', '-c', '--copy', '--all', '--full-depth'].includes(token)) {
      collectingSkills = false;
      continue;
    }
    if (token === '--agent' || token === '-a') {
      collectingSkills = false;
      if (!tokens[i] || tokens[i].startsWith('-')) throw new SkillImportError(`${token} needs a value.`);
      // CLI can accept multiple agent names, but browser ignores installation destinations.
      while (i < tokens.length && !tokens[i].startsWith('-')) i++;
      continue;
    }
    if (token.startsWith('--agent=')) {
      collectingSkills = false;
      continue;
    }
    if (token.startsWith('-')) throw new SkillImportError(`Unsupported CLI flag: ${token}`);
    if (!collectingSkills) throw new SkillImportError(`Unexpected argument: ${token}. Use --skill <name>.`);
    names.push(...token.split(',').map(x => x.trim()).filter(Boolean));
  }
  const requestedSkills = [...new Set(names.map(name => name.trim()).filter(Boolean))];
  for (const name of requestedSkills) {
    if (/^[./\\]|\.\.|[\\\0]/.test(name)) throw new SkillImportError(`Invalid skill selector: ${name}`);
  }
  return { owner: parsed.owner, repo: parsed.repo, requestedSkills, urlRefSegments: parsed.urlRefSegments, urlPathSegments: parsed.urlPathSegments, source };
}
