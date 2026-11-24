#!/usr/bin/env node

/**
 * GitHub Profile README Generator for jscraik
 *
 * Fetches live data from GitHub API and regenerates README.md with:
 * - Six featured projects with concrete starting points
 * - Public repository inventory with current project names
 * - Separate editorial-review and inventory-refresh dates
 *
 * Run via: npm start
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =============================================================================
// CONFIGURATION
// =============================================================================

const USERNAME = 'jscraik';
const CONTENT_REVIEWED_ON = '2026-11-24';
const GITHUB_API_BASE = 'https://api.github.com';
const REPO_UPDATED_DAYS_THRESHOLD = 365; // Include repos updated within past year

// Social links (extracted from existing README, with fallbacks)
const SOCIAL_LINKS = {
  linkedin: 'https://linkedin.com/in/jamiescottcraik',
  twitter: 'https://twitter.com/jscraik',
  email: 'mailto:jscraik@brainwav.io'
};

// Manual featured projects (always included regardless of update time)
const FEATURED_REPOS = [
  'skills-sdk',
  'skillsproof',
  'diagram-cli',
  'rSearch',
  'ralph-gold'
];

const ARCHIVED_SECTION_TITLE = '## Learning In Public';

// REPO_DISPLAY_OVERRIDES provides custom descriptions for repositories.
// NOTE: All repos in FEATURED_REPOS should have a corresponding entry here to ensure
// they appear with consistent descriptions across the README. A startup assertion
// below validates this coupling.
const REPO_DISPLAY_OVERRIDES = {
  'skills-sdk': {
    label: 'Skills SDK',
    description: 'Python contracts and a local CLI for checking Agent Skills packages. Early contract-building work; validation limits are explicit.',
    entryLabel: 'Inspect the synthetic skill fixture',
    entryPath: 'tree/main/tests/fixtures/synthetic-skill'
  },
  'skillsproof': {
    label: 'SkillsProof',
    description: 'Native macOS menu-bar prototype for inspecting Skills SDK evidence. Includes a clearly labelled demo fixture.',
    entryLabel: 'Inspect the demo guide',
    entryPath: 'blob/main/DEMO.md'
  },
  'diagram-cli': {
    label: 'Archscope (diagram-cli)',
    description: 'Architecture evidence and reports for repository orientation, PR review and agent handoff.',
    entryLabel: 'Generate a first report',
    entryPath: 'blob/main/README.md#quick-start'
  },
  'rSearch': {
    label: 'rSearch',
    description: 'Search, fetch and download arXiv papers from the terminal, with a TypeScript client.',
    entryLabel: 'Run a first paper search',
    entryPath: 'blob/main/README.md#quickstart'
  },
  'ralph-gold': {
    label: 'ralph-gold',
    description: 'Agent-loop orchestration with durable task state, validation gates and receipts.',
    entryLabel: 'Read the setup and first-task guide',
    entryPath: 'blob/main/README.md'
  },
  'Agent-Skills': {
    label: 'Agent Skills Kit (Agent-Skills)',
    description: 'Transitional skills kit being separated from the independent Skills SDK and Skills Foundry. The README explains current ownership and migration limits.'
  },
  'mKit': {
    description: 'MCP server boilerplate for Cloudflare Workers.'
  },
  'dots': {
    description: 'Workstation configuration and Codex policy with a disposable-home preview and explicit activation boundaries.'
  },
  'websites': {
    description: 'Astro source for my portfolio, with project and evidence pages.'
  },
  'wSearch': {
    description: 'Script-friendly Wikidata REST, SPARQL, and Action API queries from the terminal.'
  },
  'Design-System': {
    label: 'aStudio (Design-System)',
    description: 'UI workbench and component system for ChatGPT widgets and React apps.'
  },
  'trace-narrative': {
    description: 'Local-first app that links AI sessions, intent, commits, and timelines so teams can recover the why behind code changes.'
  },
  'evals': {
    description: 'Shared local eval runner for artifact integrity, schema validity, evidence-backed claims, and deterministic scorer verdicts.'
  },
  'code-archaeology-kit': {
    description: 'Privacy-aware git-history intelligence for churn, temporal coupling, abandoned structures, and cleanup targets.'
  },
  'unfinished-cemetery': {
    description: 'A ritualised archive of abandoned projects — post-mortems for software that died so we could learn what lives.'
  }
};

// Repos to exclude from listing (test, demo, or template repos)
const EXCLUDED_REPOS = [
  's1ngularity-repository-1',
  'brainwav-governance-canary',
  'claude-code',
  'codex',
  'SkillsInspector',
  '.github',
  'jscraik'
];

// =============================================================================
// GITHUB API FUNCTIONS
// =============================================================================

/**
 * Fetch user profile data from GitHub API
 */
async function fetchUserProfile() {
  const url = `${GITHUB_API_BASE}/users/${USERNAME}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`🚨 Error fetching user profile: ${error.message}`);
    return null;
  }
}

/**
 * Fetch all public repositories for the user
 */
async function fetchAllRepos() {
  const url = `${GITHUB_API_BASE}/users/${USERNAME}/repos?per_page=100&type=public&sort=updated`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`🚨 Error fetching repos: ${error.message}`);
    return [];
  }
}

/**
 * Fetch detailed stats for a specific repository
 */
async function fetchRepoStats(repoName) {
  const url = `${GITHUB_API_BASE}/repos/${USERNAME}/${repoName}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`🚨 Error fetching repo stats for ${repoName}: ${error.message}`);
    return null;
  }
}

// =============================================================================
// FILTERING FUNCTIONS
// =============================================================================

/**
 * Filter repos to active ones (public + recently updated + not forked)
 */
function filterActiveRepos(repos) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - REPO_UPDATED_DAYS_THRESHOLD);

  return repos.filter(repo => {
    // Must be public
    if (repo.private) return false;

    // Skip archived repos from active listings
    if (repo.archived) return false;
    if (repo.name === 'coding-harness') return false;

    // Skip explicitly excluded repos
    if (EXCLUDED_REPOS.includes(repo.name)) return false;

    // Skip forks (unless it's a featured repo)
    if (repo.fork && !FEATURED_REPOS.includes(repo.name)) return false;

    // Check if updated within threshold (or is featured)
    const updatedAt = new Date(repo.updated_at);
    const isActive = updatedAt >= thresholdDate;
    const isFeatured = FEATURED_REPOS.includes(repo.name);

    return isActive || isFeatured;
  });
}

/**
 * Sort repos: featured first, then by stars, then by updated date
 */
function sortRepos(repos) {
  return repos.sort((a, b) => {
    const aFeatured = FEATURED_REPOS.indexOf(a.name);
    const bFeatured = FEATURED_REPOS.indexOf(b.name);

    // Both featured: sort by feature list order
    if (aFeatured >= 0 && bFeatured >= 0) {
      return aFeatured - bFeatured;
    }

    // Featured repos come first
    if (aFeatured >= 0) return -1;
    if (bFeatured >= 0) return 1;

    // Then by stars (descending)
    if (b.stargazers_count !== a.stargazers_count) {
      return b.stargazers_count - a.stargazers_count;
    }

    // Then by updated date (descending)
    return new Date(b.updated_at) - new Date(a.updated_at);
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate ISO date for the public inventory refresh
 */
function generateISODate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Format star count with suffixes
 */
function formatStars(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

/**
 * Truncate description to fit on one line
 */
function truncateDescription(description, maxLength = 220) {
  if (!description) return '';
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength - 3) + '...';
}

function buildRepoBullet(repo) {
  const display = REPO_DISPLAY_OVERRIDES[repo.name] || {};
  const label = display.label || repo.name;
  const descriptionSource = display.description || repo.description;
  const description = descriptionSource ? ` - ${truncateDescription(descriptionSource)}` : '';
  return `* **[${label}](https://github.com/${USERNAME}/${repo.name})**${description}`;
}

function buildFeaturedProjectsTable(featuredRepos) {
  const rows = featuredRepos.map((repo) => {
    const display = REPO_DISPLAY_OVERRIDES[repo.name];
    const repoUrl = `https://github.com/${USERNAME}/${repo.name}`;
    return `| [${display.label || repo.name}](${repoUrl}) | ${display.description} | [${display.entryLabel}](${repoUrl}/${display.entryPath}) |`;
  });
  return [
    '| Project | What you can inspect or try | Start here |',
    '|---|---|---|',
    ...rows
  ].join('\n');
}

// =============================================================================
// README GENERATION
// =============================================================================

/**
 * Generate the complete README markdown content
 */
function generateReadmeContent(userProfile, activeRepos, allRepos = activeRepos) {
  const isoDate = generateISODate();
  const archivedRepos = allRepos.filter((repo) => repo.archived && repo.name !== 'coding-harness' && !EXCLUDED_REPOS.includes(repo.name));
  const featuredRepos = activeRepos.filter((repo) => FEATURED_REPOS.includes(repo.name));
  const moreRepos = activeRepos.filter((repo) => !FEATURED_REPOS.includes(repo.name));
  const featuredProjectsTable = buildFeaturedProjectsTable(featuredRepos);
  const moreProjectsList = moreRepos.map(buildRepoBullet).join('\n');
  const archivedProjectsList = archivedRepos.map(buildRepoBullet).join('\n');

  return `# Jamie Scott Craik

**British Army veteran | Founder, brAInwav | Software development student**

I build tools for AI-assisted engineering: checking Agent Skills, making coding-agent work easier to inspect, and turning research and repository information into useful CLI output.

> Codex writes the code. I lead, inspect, and make the work accountable. The value is using both strengths properly.

[LinkedIn](${SOCIAL_LINKS.linkedin}) · [X](${SOCIAL_LINKS.twitter}) · [Email](${SOCIAL_LINKS.email})

## Featured Work

Choose a task or inspect a concrete example. Each repository explains its current status, prerequisites and evidence limits.

${featuredProjectsTable}

## How the Skills Projects Fit Together

- **[Skills SDK](https://github.com/${USERNAME}/skills-sdk):** the independent Python SDK and local CLI for package contracts and validation.
- **[Agent Skills Kit](https://github.com/${USERNAME}/Agent-Skills):** the transitional kit being separated from SDK and Foundry responsibilities. Its README records what has and has not moved.
- **[SkillsProof](https://github.com/${USERNAME}/skillsproof):** a native macOS evidence-viewer prototype, previously called SkillsBar. Its demo fixture is labelled separately from live evidence.

The migration is still in progress. A source example, local check, hosted CI result and public release establish different things; I keep those boundaries explicit.

## What I Bring to the Work

Twenty-two years in Army logistics, leadership and instruction shaped how I approach software: understand the problem, clarify ownership, build a bounded solution, test it honestly and explain the result.

I'm developing practical experience in developer tooling, AI-assisted workflows and technical education. I set direction, question assumptions, inspect the implementation and remain accountable for what ships.

By **harness**, I mean the operating layer around coding agents: entrypoints, repository checks, evidence, review policy and handoffs.

**Working stack:** Python, TypeScript, Node.js, React, Swift/SwiftUI, macOS, Codex, MCP, GitHub Actions and CircleCI.

${moreRepos.length ? `## More Projects

${moreProjectsList}

` : ''}## Work With Me On

- Practical developer tools and CLI workflows.
- Agent Skills, evaluations and evidence-backed AI-assisted engineering.
- Developer experience, technical education and clear project documentation.

[Get in touch](${SOCIAL_LINKS.email}) or [connect on LinkedIn](${SOCIAL_LINKS.linkedin}).

${ARCHIVED_SECTION_TITLE}

Archived experiments remain available as historical source. Their archive status does not imply current support or compatibility.

- [SynAIpse (Coding Harness)](https://github.com/${USERNAME}/coding-harness) is retired. The repository records my earlier work on evidence-backed delivery.

${archivedProjectsList || '* No archived projects currently listed.'}

---

**Content reviewed:** ${CONTENT_REVIEWED_ON} · **Public repository inventory refreshed:** ${isoDate}

This profile is generated from [generate-readme.js](generate-readme.js). The inventory refresh date records generation, not a new test run or editorial review.
`;
}

/**
 * Write README.md atomically (write to temp, then rename)
 */
async function writeReadme(content) {
  const readmePath = path.join(__dirname, 'README.md');
  const tempPath = path.join(__dirname, 'README.md.tmp');

  try {
    // Write to temp file first
    await fs.writeFile(tempPath, content, 'utf8');

    // Atomic rename
    await fs.rename(tempPath, readmePath);

    console.log('✅ README.md updated successfully');
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore
    }
    throw error;
  }
}

// =============================================================================
// STARTUP VALIDATION
// =============================================================================

/**
 * Validate that all featured repos have display overrides
 * This ensures featured repos appear with consistent descriptions
 */
function validateFeaturedReposHaveOverrides() {
  const invalidFeaturedOverrides = FEATURED_REPOS.filter((repoName) => {
    const override = REPO_DISPLAY_OVERRIDES[repoName];
    return (
      !override ||
      typeof override.description !== 'string' ||
      override.description.trim().length === 0
    );
  });

  const featuredExcludedOverlap = FEATURED_REPOS.filter((repoName) =>
    EXCLUDED_REPOS.includes(repoName)
  );

  if (invalidFeaturedOverrides.length > 0) {
    console.error(
      `🚨 ERROR: FEATURED_REPOS missing non-empty REPO_DISPLAY_OVERRIDES.description entries: ${invalidFeaturedOverrides.join(', ')}`
    );
  }

  if (featuredExcludedOverlap.length > 0) {
    console.error(
      `🚨 ERROR: FEATURED_REPOS and EXCLUDED_REPOS overlap: ${featuredExcludedOverlap.join(', ')}`
    );
  }

  if (invalidFeaturedOverrides.length > 0 || featuredExcludedOverlap.length > 0) {
    throw new Error('Invalid featured repo configuration');
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  // Validate configuration before proceeding
  validateFeaturedReposHaveOverrides();

  console.log('🚀 Starting README generation...');

  // Fetch user profile
  console.log('📊 Fetching user profile...');
  const userProfile = await fetchUserProfile();

  if (userProfile) {
    console.log(`   ✅ Found ${userProfile.public_repos} public repos, ${userProfile.followers} followers`);
  }

  // Fetch all repos
  console.log('📦 Fetching repositories...');
  const allRepos = await fetchAllRepos();
  console.log(`   ✅ Found ${allRepos.length} public repos`);

  // Filter and sort active repos
  const activeRepos = filterActiveRepos(allRepos);
  console.log(`   ✅ ${activeRepos.length} active repos (updated within ${REPO_UPDATED_DAYS_THRESHOLD} days or featured)`);

  const sortedActiveRepos = sortRepos(activeRepos);

  // Generate README content
  console.log('✍️  Generating README content...');
  const readmeContent = generateReadmeContent(userProfile, sortedActiveRepos, allRepos);

  // Write README
  await writeReadme(readmeContent);

  console.log('✨ Done!');
}

// Run main function
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
