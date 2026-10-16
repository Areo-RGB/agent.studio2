import assert from 'node:assert/strict';
import { parseSkillsAddCommand, SkillImportError } from '../src/services/skillsCliCommand';
import { discoverSkillsFromCommand, fetchSelectedGitHubSkills } from '../src/services/githubSkillImport';

const formats = [
  ['npx skills add https://github.com/vercel-labs/skills --skill find-skills', ['find-skills']],
  [`npx skills add 'https://github.com/vercel-labs/skills' --skill 'find-skills' -s second`, ['find-skills', 'second']],
  ['npx skills add vercel-labs/skills@find-skills -g -y', ['find-skills']],
  ['bunx skills add vercel-labs/skills --skill one two --agent claude-code codex', ['one', 'two']],
  ['pnpm dlx skills add vercel-labs/skills --skill=one,two', ['one', 'two']],
] as const;
for (const [command, expected] of formats) {
  const result = parseSkillsAddCommand(command);
  assert.equal(result.owner, 'vercel-labs');
  assert.equal(result.repo, 'skills');
  assert.deepEqual(result.requestedSkills, expected);
}
for (const malicious of [
  'npx skills add https://not-github.example.com/x/y --skill z',
  'npx skills add vercel-labs/skills; echo x',
  "npx skills add vercel-labs/skills --skill 'unmatched",
  'npx skills find something',
]) assert.throws(() => parseSkillsAddCommand(malicious), SkillImportError);

const md = '---\nname: find-skills\ndescription: Helps discover agent skills\n---\n\n# Find Skills\n';
const zip = Uint8Array.from([80, 75, 3, 4, 0, 255]);
const files: Record<string, Uint8Array> = {
  'skills/find-skills/SKILL.md': new TextEncoder().encode(md),
  'skills/find-skills/references/reference.md': new TextEncoder().encode('# Reference'),
  'skills/find-skills/assets/package.zip': zip,
};
const tree = Object.keys(files).map((path, i) => ({
  path, sha: String(i + 1).repeat(40), size: files[path].byteLength,
  mode: '100644', type: 'blob'
}));
const previousFetch = globalThis.fetch;
(globalThis as { fetch: typeof fetch }).fetch = async (input) => {
  const url = String(input);
  if (url === 'https://api.github.com/repos/vercel-labs/skills') {
    return Response.json({ default_branch: 'main' });
  }
  if (url.endsWith('/commits/main')) {
    return Response.json({ sha: 'a'.repeat(40), commit: { tree: { sha: 'b'.repeat(40) } } });
  }
  if (url.endsWith(`/git/trees/${'b'.repeat(40)}?recursive=1`)) {
    return Response.json({ tree, truncated: false });
  }
  const filePath = Object.keys(files).find(path => url.endsWith('/' + path));
  return filePath ? new Response(new Uint8Array(files[filePath])) : new Response('Not found', { status: 404 });
};
try {
  const discovered = await discoverSkillsFromCommand(formats[0][0]);
  assert.deepEqual(discovered.candidates.map(c => c.path), ['skills/find-skills']);
  const result = await fetchSelectedGitHubSkills(discovered, ['skills/find-skills']);
  assert.equal(result.length, 1);
  assert.equal(result[0].files.length, 3);
  assert.equal(result[0].skillMdContent, md);
  const asset = result[0].files.find(file => file.path === 'assets/package.zip');
  assert.equal(asset?.isBinary, true);
  assert.deepEqual(Buffer.from(asset!.content, 'base64'), Buffer.from(zip));
  assert.match(result[0].contentHash || '', /^[a-f0-9]{64}$/);
  console.log('PASS: command parsing, GitHub discovery, complete folder and binary assets');
} finally {
  globalThis.fetch = previousFetch;
}
