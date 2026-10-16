/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { parseSkillFrontmatter } from './zipService';

export interface RemoteSkillMeta {
  id: string;
  name: string;
  description: string;
  repo: string;
  branch: string;
  path: string;
  downloadUrl?: string;
  htmlUrl?: string;
  tags: string[];
  category?: string;
  sampleContent?: string;
}

export const PRESET_REPOSITORIES = [
  {
    name: 'Anthropic Official Skills',
    repo: 'anthropics/skills',
    branch: 'main',
    path: 'skills',
    description: 'Official production agent skills from Anthropic.',
  },
  {
    name: 'Awesome Claude Skills',
    repo: 'ComposioHQ/awesome-claude-skills',
    branch: 'master',
    path: '',
    description: 'Community-curated agent skill collection for software workflows.',
  },
];

// Rich fallback collection available immediately offline / without hitting GitHub rate limit
export const CURATED_DISCOVERABLE_SKILLS: RemoteSkillMeta[] = [
  {
    id: 'frontend-design',
    name: 'Frontend Design Craft',
    description: 'Universal design constitution for distinctive, production-grade web interfaces avoiding generic AI tropes.',
    repo: 'anthropics/skills',
    branch: 'main',
    path: 'skills/frontend-design',
    tags: ['ui', 'typography', 'tailwind', 'design-system'],
    category: 'Design',
    sampleContent: `---
name: frontend-design
description: Universal design constitution for building distinctive, production-grade frontend web applications without generic AI slop.
tags: [ui, typography, tailwind]
---

# Frontend Design Constitution

## Key Directives
- **Zero-Pill Metadata**: No pill capsules for informational labels. Use typographic separators (\`·\`, \`/\`).
- **60-30-10 Palette Discipline**: Allocate 60% dominant neutral canvas, 30% structural surfaces, 10% high-intent accent.
- **Tabular Figures**: Every numeric value in tables, meters, and metrics must use tabular-nums or monospace.
- **Real Interactive Affordances**: Every button, dropdown, and tab must be wired to working logic.
`,
  },
  {
    id: 'git-commit-helper',
    name: 'Conventional Git Commits',
    description: 'Enforces Semantic Versioning and Conventional Commit conventions across teams and branches.',
    repo: 'anthropics/skills',
    branch: 'main',
    path: 'skills/git-commit-helper',
    tags: ['git', 'workflow', 'vcs'],
    category: 'Workflow',
    sampleContent: `---
name: git-commit-helper
description: Structure git commit messages according to Conventional Commits 1.0.0.
tags: [git, commits, semver]
---

# Git Commit Helper

## Format
\`<type>[optional scope]: <description>\`

[optional body]

[optional footer(s)]

### Types
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- refactor: Code change that neither fixes a bug nor adds a feature
- test: Adding missing tests or correcting existing tests
- chore: Tooling or dependency updates
`,
  },
  {
    id: 'security-auditor',
    name: 'Security & Dependency Auditor',
    description: 'Scans for OWASP Top 10 vulnerabilities, secrets leakage, insecure cryptographic primitives, and risky package dependencies.',
    repo: 'ComposioHQ/awesome-claude-skills',
    branch: 'master',
    path: 'skills/security-auditor',
    tags: ['security', 'owasp', 'cve'],
    category: 'Security',
    sampleContent: `---
name: security-auditor
description: Systematic vulnerability assessment for web applications, APIs, and microservices.
tags: [security, vulnerabilities, audit]
---

# Security & Dependency Auditor

## Audit Invariants
1. Check for hardcoded API keys, JWT secrets, and certificates.
2. Verify all user-supplied inputs in SQL, shell, or DOM sinks are properly sanitized.
3. Validate authentication token expiration and role-based access checks.
`,
  },
  {
    id: 'api-doc-generator',
    name: 'OpenAPI & TypeDoc Generator',
    description: 'Generates interactive OpenAPI 3.1 specifications and typed Markdown documentation from source controllers.',
    repo: 'ComposioHQ/awesome-claude-skills',
    branch: 'master',
    path: 'skills/api-doc-generator',
    tags: ['api', 'openapi', 'documentation'],
    category: 'Documentation',
    sampleContent: `---
name: api-doc-generator
description: Generate comprehensive OpenAPI 3.1 and TypeScript SDK documentation.
tags: [api, openapi, sdk]
---

# API Documentation Specialist

## Objectives
- Extract endpoint paths, request bodies, query params, and HTTP status responses.
- Generate valid OpenAPI 3.1 YAML/JSON with accurate schemas.
- Document edge error states (400, 401, 403, 404, 429, 500).
`,
  },
  {
    id: 'test-generator',
    name: 'Comprehensive Test Suite Builder',
    description: 'Generates Vitest, Jest, and Playwright test fixtures covering edge cases and regression scenarios.',
    repo: 'anthropics/skills',
    branch: 'main',
    path: 'skills/test-generator',
    tags: ['testing', 'vitest', 'playwright', 'qa'],
    category: 'Testing',
    sampleContent: `---
name: test-generator
description: Create exhaustive unit, integration, and E2E test suites with high branch coverage.
tags: [tests, vitest, e2e]
---

# Test Suite Builder

## Testing Matrix
- Unit tests for pure state machines and domain utilities.
- Integration tests with mocked network responses.
- E2E journey tests verifying user interaction cycles.
`,
  },
];

/**
 * Normalizes user input into owner and repo.
 */
export function parseRepoString(input: string): { owner: string; repo: string } | null {
  const clean = input.trim();
  // Check for https://github.com/owner/repo
  const urlMatch = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  }
  // Check for owner/repo
  const parts = clean.split('/');
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  }
  return null;
}

/**
 * Fetches skill folders from GitHub public API.
 */
export async function fetchGitHubSkills(
  owner: string,
  repo: string,
  branch = 'main',
  path = ''
): Promise<{ skills: RemoteSkillMeta[]; rateLimited?: boolean; error?: string }> {
  try {
    const apiPath = path ? `/${path}` : '';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents${apiPath}?ref=${branch}`;

    const res = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.status === 403) {
      return {
        skills: [],
        rateLimited: true,
        error: 'GitHub API rate limit exceeded (60 requests/hr). Curated catalog and manual imports remain fully available.',
      };
    }

    if (!res.ok) {
      return {
        skills: [],
        error: `GitHub repository or path not found (HTTP ${res.status}). Verify branch and folder name.`,
      };
    }

    const items = await res.json();
    if (!Array.isArray(items)) {
      return { skills: [], error: 'Unexpected response from GitHub (not a directory).' };
    }

    // Filter directories
    const directories = items.filter((i) => i.type === 'dir');
    const results: RemoteSkillMeta[] = [];

    for (const dir of directories) {
      results.push({
        id: dir.name,
        name: dir.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        description: `Agent skill from ${owner}/${repo} (${dir.path})`,
        repo: `${owner}/${repo}`,
        branch,
        path: dir.path,
        htmlUrl: dir.html_url,
        tags: [owner, 'remote-git'],
      });
    }

    return { skills: results };
  } catch (err: any) {
    return {
      skills: [],
      error: `Network error reaching GitHub: ${err?.message || 'Check connection or CORS restrictions'}.`,
    };
  }
}

/**
 * Fetches SKILL.md content from a GitHub skill directory
 */
export async function fetchRemoteSkillMd(
  repo: string,
  branch: string,
  dirPath: string
): Promise<{ content: string; frontmatter: { name: string; description: string; tags: string[] } } | null> {
  const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${dirPath}/SKILL.md`;

  try {
    const res = await fetch(rawUrl);
    if (!res.ok) {
      // Try lowercase
      const fallbackUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${dirPath}/skill.md`;
      const res2 = await fetch(fallbackUrl);
      if (!res2.ok) return null;
      const text = await res2.text();
      return { content: text, frontmatter: parseSkillFrontmatter(text, dirPath.split('/').pop()) };
    }
    const text = await res.text();
    return { content: text, frontmatter: parseSkillFrontmatter(text, dirPath.split('/').pop()) };
  } catch {
    return null;
  }
}
