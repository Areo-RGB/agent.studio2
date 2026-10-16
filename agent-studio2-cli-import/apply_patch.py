#!/usr/bin/env python3
"""Small, repeatable source patch: add the CLI import tab and binary-safe ZIP handling.
Run from a checkout root after copying src/ from this bundle into that checkout:
  python3 apply_patch.py
Or: python3 apply_patch.py /path/to/agent.studio2
"""
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
modal_file = root / 'src/components/skills/SkillImportModal.tsx'
zip_file = root / 'src/services/zipService.ts'
required = [
    root / 'src/services/skillsCliCommand.ts',
    root / 'src/services/githubSkillImport.ts',
    root / 'src/components/skills/SkillsCliImportPanel.tsx',
]
if not modal_file.exists() or not zip_file.exists() or not all(p.exists() for p in required):
    raise SystemExit('Missing target files: copy the included src/ files into your agent.studio2 checkout first.')

modal = modal_file.read_text()
zip_src = zip_file.read_text()

def once(text: str, old: str, new: str, title: str) -> str:
    found = text.count(old)
    if found != 1:
        raise RuntimeError(f'Patch anchor for {title} expected once, found {found}; checkout may differ.')
    return text.replace(old, new, 1)

if "SkillsCliImportPanel" not in modal:
    modal = once(modal,
        "import { slugify } from '../../services/mcpParsers';",
        "import { slugify } from '../../services/mcpParsers';\nimport { SkillsCliImportPanel } from './SkillsCliImportPanel';",
        'CLI panel import')
    modal = once(modal,
        "  if (!isOpen) return null;\n\n  const [inputMode, setInputMode] = useState<'zip' | 'file' | 'paste'>('zip');",
        "  const [inputMode, setInputMode] = useState<'zip' | 'file' | 'paste' | 'cli'>('zip');",
        'CLI input mode + hooks')
    modal = once(modal,
        '  return (\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">',
        '  if (!isOpen) return null;\n\n  return (\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">',
        'move conditional return after hooks')
    modal = once(modal,
        "              </div>\n\n              {inputMode === 'zip' && (",
        '''                <button
                  type="button"
                  onClick={() => setInputMode('cli')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                    inputMode === 'cli'
                      ? 'bg-neutral-800 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paste Skills CLI Command</span>
                </button>
              </div>

              {inputMode === 'zip' && (''',
        'CLI mode tab')
    modal = once(modal,
        "              {error && (",
        "              {inputMode === 'cli' && (\n                <SkillsCliImportPanel\n                  existingSkills={existingSkills}\n                  onImportComplete={onImportComplete}\n                />\n              )}\n\n              {error && (",
        'CLI mode panel')
    modal = once(modal,
        "<div className=\"flex items-center gap-2 border-b border-neutral-800 pb-3\">",
        "<div className=\"flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3\">",
        'responsive tabs')
    modal = once(modal,
        "{analyzed ? 'Ready to add to local browser library.' : 'Select or upload a skill to proceed.'}",
        "{analyzed ? 'Ready to add to local browser library.' : inputMode === 'cli' ? 'Fetch and preview the real GitHub files above.' : 'Select or upload a skill to proceed.'}",
        'CLI mode footer')

if "Binary files use base64" not in zip_src:
    count = zip_src.count('.file(file.path, file.content);')
    if count != 5:
        raise RuntimeError(f'Expected five Skill file export call sites; found {count}.')
    zip_src = zip_src.replace('.file(file.path, file.content);',
        '.file(file.path, file.content, file.isBinary ? { base64: true } : undefined);')
    zip_src = once(zip_src,
        '  files: { path: string; content: string }[];',
        '  files: { path: string; content: string; isBinary?: boolean }[];',
        'ImportedSkillData accepts binary')
    zip_src = once(zip_src,
        "      const text = await entry.async('string');\n\n      if (subPath.toLowerCase() === 'skill.md') {\n        skillMdContent = text;\n      }\n      skillFiles.push({ path: subPath, content: text });",
        """      const bytes = await entry.async('uint8array');
      if (bytes.byteLength > 10 * 1024 * 1024) {
        throw new Error(`Skill file exceeds 10 MiB: ${subPath}`);
      }
      // Binary files use base64 in IndexedDB, and are decoded in every ZIP export.
      const isBinary = isBinarySkillAsset(bytes, subPath);
      if (subPath.toLowerCase() === 'skill.md' && isBinary) {
        throw new Error('SKILL.md must contain UTF-8 Markdown.');
      }
      const content = isBinary
        ? skillBytesToBase64(bytes)
        : new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (subPath.toLowerCase() === 'skill.md') skillMdContent = content;
      skillFiles.push({ path: subPath, content, isBinary: isBinary || undefined });""",
        'binary-safe ZIP imports')
    zip_src += '''

/** Imported binary assets are stored as base64 strings; preserve bytes on ZIP export. */
function isBinarySkillAsset(bytes: Uint8Array, path: string): boolean {
  if (/\\.(?:zip|png|jpe?g|gif|webp|ico|pdf|wasm|mp[34]|mov|webm|woff2?|ttf|otf|eot|gz|tar|7z|sqlite|db|jar|exe|bin|class|pyc)$/i.test(path)) return true;
  if (bytes.subarray(0, Math.min(bytes.length, 4096)).includes(0)) return true;
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return false; }
  catch { return true; }
}
function skillBytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(binary);
}
'''

# Read/validate all modifications before mutating either file.
modal_file.write_text(modal)
zip_file.write_text(zip_src)
print('Applied: CLI import panel integrated; binary-safe ZIP exports/imports enabled.')
