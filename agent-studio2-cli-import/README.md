# Skills CLI Command Importer for `Areo-RGB/agent.studio2`

A **browser-only** import feature for the existing Skills import modal. Users paste a `skills add` command, select matched SKILL.md folders from a public GitHub repo, review every file including binary assets, and save to the existing IndexedDB-backed Skill library. No shell commands run in the browser. It supports only Claude Code, Codex, Pi, and OpenCode export toggles.

## What is included

- `src/services/skillsCliCommand.ts`: safe lexer and command parser (quoted names, `--skill`, `-s`, repeated and multiple values, `owner/repo@skill`, GitHub URLs, `npx`, `bunx`, `pnpm dlx`, and installation flags).
- `src/services/githubSkillImport.ts`: GitHub metadata and recursive Tree API discovery, SHA-pinned complete file retrieval, Git Blobs fallback, binary detection/Base64 storage, content hashing, sanity limits, and explicit error handling.
- `src/components/skills/SkillsCliImportPanel.tsx`: in-modal discover → select → fetch → preview → resolve conflicts → save workflow.
- `apply_patch.py`: integrates the panel into the existing `SkillImportModal.tsx` and updates all ZIP import/export paths in `src/services/zipService.ts` to preserve binary files.
- `tests/skillsCliImport.test.ts`: mock-network parser and import tests.

## Apply to a local checkout

1. Clone or open the existing `agent.studio2` checkout.
2. Unzip this package separately.
3. Copy the package's three new files (under `src/`) into the corresponding `src/` directories of your checkout. Do not overwrite existing files.
4. Run:

   ```bash
   python3 /path/to/extracted/agent-studio2-cli-import/apply_patch.py /path/to/agent.studio2
   cd /path/to/agent.studio2
   npm install
   npm run lint
   npm run build
   ```

5. Open the web app → **Skills** → **Import Skill** → **Paste Skills CLI Command**.

Optional test:

```bash
# Copy the included tests/skillsCliImport.test.ts into your checkout's tests/ folder first.
npx tsx tests/skillsCliImport.test.ts
```

If using Google AI Studio's built-in editor rather than a local checkout, create the three new source files and ask the Studio assistant to apply the precise modifications in `apply_patch.py` to the two existing source files.

## Example commands

```sh
npx skills add https://github.com/vercel-labs/skills --skill find-skills
npx skills add vercel-labs/skills@find-skills -g -y
npx skills add 'https://github.com/vercel-labs/skills' --skill 'find-skills'
npx skills add owner/repo --skill skill-one skill-two
npx skills add https://github.com/owner/repo/tree/main/skills/skill-one
```

When `--skill` is absent, the UI offers discovered Skill folders for manual selection. When requested names are ambiguous or missing, it shows a clear error rather than picking an arbitrary folder.

## Data format and security

The importer produces objects already conforming to the repo's existing `Skill` and `SkillFile` types. Text files contain UTF-8 text; binary assets (including images and ZIPs) contain Base64 strings and `isBinary: true`, which the included ZIP patch reconstructs byte-for-byte. The existing `App.tsx` `handleSkillImportComplete` callback persists the Skill objects with Dexie/IndexedDB—no new database migration is needed.

- Public `github.com` HTTPS repositories only; no arbitrary URL fetching.
- A single parsed command only. Input is tokenized, never run in a shell.
- Repository resolved to a commit SHA; file downloads are pinned to that version.
- Rejects truncated GitHub file trees, unsafe paths, missing manifests, invalid frontmatter, oversized files, and failed downloads.
- UI abort button cancels active fetch requests.
- No fake content or placeholder SKILL.md created on network failures.
- No automatic installation of Skills into any local agent. Enabled tool checkboxes only affect subsequent exports.
- GitHub rate limits and browser CORS can block network imports; the existing ZIP/paste methods remain available.

### Limits

Maximum 10 MiB per file, 32 MiB per Skill, 60 MiB per batch, 250 files per Skill, 500 files per batch, 30 Skills per import. Large GitHub repositories that return a truncated recursive tree are intentionally rejected instead of producing partial imports.

### Scope note

This integration adds **the command importer and binary-safe ZIP handling**. It does not change `SkillDiscoverView`, whose existing GitHub discovery implementation may still only import SKILL.md. It also does not solve any other pre-existing issues in the base project.

## Verification

- Command parser: `tsc --strict` passes in a minimal type-check harness.
- Mocked GitHub API + raw fetch: path discovery, SHA-pinning, full folder and binary ZIP asset test passes.
- New React component transpiles without syntax diagnostics.
- Patch script was exercised against an anchor fixture and is idempotent.
- A full `npm run build` of the actual repository has **not** been run here because package installation/network access is unavailable in this environment. Run lint/build in your checkout after applying.
