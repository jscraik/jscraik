#!/usr/bin/env node

/**
 * GitHub Profile README Generator for jscraik
 *
 * Fetches live data from GitHub API and regenerates README.md with:
 * - Dynamic "Now" timestamp
 * - Active repository list with star counts
 * - Social links (extracted from existing README or defaults)
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
  'coding-harness',
  'Agent-Skills',
  'ralph-gold',
  'trace-narrative',
  'diagram-cli',
  'rSearch',
  'wSearch',
  'mKit'
];

const CEMETERY_URL = 'https://jscraik.github.io/unfinished-cemetery';
const ARCHIVED_SECTION_TITLE = '## Learning In Public';

// REPO_DISPLAY_OVERRIDES provides custom descriptions for repositories.
// NOTE: All repos in FEATURED_REPOS should have a corresponding entry here to ensure
// they appear with consistent descriptions across the README. A startup assertion
// below validates this coupling.
const REPO_DISPLAY_OVERRIDES = {
  'coding-harness': {
    description: 'synAIpse AI Delivery Harness: a CLI control plane for agent-ready repos, runtime evidence, review gates, and safer PR handoff.'
  },
  'Agent-Skills': {
    description: 'Skills SDK for authoring, routing, validating, packaging, and syncing Codex skills and plugins.'
  },
  'ralph-gold': {
    description: 'Deterministic fresh-agent loop with file-based memory, gates, receipts, context snapshots, and review exit rules.'
  },
  'trace-narrative': {
    description: 'Local-first app that links AI sessions, intent, commits, and timelines so teams can recover the why behind code changes.'
  },
  'diagram-cli': {
    description: 'Architecture evidence CLI for PR review, repo orientation, agent handoff, policy validation, and Mermaid diagrams.'
  },
  'rSearch': {
    description: 'Search, fetch, and download arXiv papers from the terminal. CLI plus TypeScript client.'
  },
  'wSearch': {
    description: 'Script-friendly Wikidata REST, SPARQL, and Action API queries from the terminal.'
  },
  'mKit': {
    description: 'MCP server boilerplate for Cloudflare Workers.'
  },
  'Design-System': {
    description: 'Cross-platform UI workbench and component system for ChatGPT widgets and React apps.'
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
 * Generate "Now" timestamp in format "MMM DD, YYYY"
 */
function generateTimestamp() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * Generate ISO date for "Last updated" badge
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

function buildRepoBullet(repo, options = {}) {
  const { useCemetery, includeStars = true } = options;
  const display = REPO_DISPLAY_OVERRIDES[repo.name] || {};
  const stars = includeStars && repo.stargazers_count > 0 ? ` ⭐ ${formatStars(repo.stargazers_count)}` : '';
  const descriptionSource = display.description || repo.description;
  const description = descriptionSource ? ` - ${truncateDescription(descriptionSource)}` : '';
  const repoUrl = useCemetery ? CEMETERY_URL : `https://github.com/${USERNAME}/${repo.name}`;
  const githubLink = useCemetery
    ? `\n  - GitHub: [${USERNAME}/${repo.name}](https://github.com/${USERNAME}/${repo.name})`
    : '';

  return `* **[${repo.name}](${repoUrl})**${stars}${description}${githubLink}`;
}

function buildFeaturedProjectsTable(featuredRepos) {
  const rows = featuredRepos.map((repo) => {
    const display = REPO_DISPLAY_OVERRIDES[repo.name] || {};
    const stars = repo.stargazers_count > 0
      ? `${formatStars(repo.stargazers_count)} star${repo.stargazers_count === 1 ? '' : 's'}`
      : '';
    const signal = stars || 'active';
    const description = truncateDescription(display.description || repo.description || 'Active project.');
    return `| [${repo.name}](https://github.com/${USERNAME}/${repo.name}) | ${description} | ${signal} |`;
  });

  return [
    '| Project | Why it matters | Signal |',
    '|---|---|---|',
    ...rows
  ].join('\n');
}

function buildQuickStartCommands(activeRepos) {
  const quickStarts = [
    {
      repoName: 'ralph-gold',
      snippet:
`\`\`\`bash
# ralph-gold
gh repo clone ${USERNAME}/ralph-gold
cd ralph-gold
uv tool install -e .
ralph --help
\`\`\``
    },
    {
      repoName: 'rSearch',
      snippet:
`\`\`\`bash
# rSearch
npm i -g @brainwav/rsearch
rsearch --help
\`\`\``
    },
    {
      repoName: 'wSearch',
      snippet:
`\`\`\`bash
# wSearch
npm i -g @brainwav/wsearch-cli
wsearch --help
\`\`\``
    },
  ];

  const activeRepoNames = new Set(activeRepos.map((repo) => repo.name));

  return quickStarts
    .filter((item) => item.alwaysInclude || activeRepoNames.has(item.repoName))
    .map((item) => item.snippet)
    .join('\n\n');
}

// =============================================================================
// README GENERATION
// =============================================================================

/**
 * Generate the complete README markdown content
 */
function generateReadmeContent(userProfile, activeRepos, allRepos = activeRepos) {
  const timestamp = generateTimestamp();
  const isoDate = generateISODate();
  const archivedRepos = allRepos.filter((repo) => repo.archived && !EXCLUDED_REPOS.includes(repo.name));

  // Split active repos into featured and more
  const featuredRepos = activeRepos.filter((r) => FEATURED_REPOS.includes(r.name));
  const moreRepos = activeRepos.filter((r) => !FEATURED_REPOS.includes(r.name));

  // Generate featured projects table
  const featuredProjectsTable = buildFeaturedProjectsTable(featuredRepos);

  // Generate more projects list
  const moreProjectsList = moreRepos.map((repo) => buildRepoBullet(repo)).join('\n');
  const archivedProjectsList = archivedRepos
    .map((repo) => buildRepoBullet(repo, { useCemetery: true, includeStars: false }))
    .join('\n');
  const quickStartCommands = buildQuickStartCommands(activeRepos);

  return `<div align="center">

# Jamie Scott Craik

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=22&pause=1000&color=6B46C1&center=true&vCenter=true&width=840&lines=AI+Delivery+Harness+Builder;Codex-First+Engineering+That+Ships;Evidence%2C+Review+Gates%2C+Agent+Workflows" alt="AI Delivery Harness Builder, Codex-first engineering that ships, Evidence, review gates, agent workflows" />

[![LinkedIn](https://img.shields.io/badge/LinkedIn-@${USERNAME}-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](${SOCIAL_LINKS.linkedin})
[![GitHub](https://img.shields.io/badge/GitHub-@${USERNAME}-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/${USERNAME})
[![X](https://img.shields.io/badge/X-@${USERNAME}-000000?style=for-the-badge&logo=x&logoColor=white)](${SOCIAL_LINKS.twitter})

</div>

---

## Harness Builder, "Grumpy Old Vet"

**British Army veteran | Founder, brAInwav | Codex-first toolmaker**

> Codex writes the code. I lead, inspect, and make the work accountable. The value is using both strengths properly.

**Now (${timestamp}):** building synAIpse, Skills SDK, deterministic agent loops, and evidence tooling for teams that want AI coding to ship without losing trust.

By **harness**, I mean the operating layer around Codex and other coding agents: CLI entrypoints, repo-local guardrails, runtime evidence, review policy, memory, and handoff artifacts that make AI-assisted engineering repeatable.

**Last updated:** ${isoDate}

![Philosophy](https://img.shields.io/badge/Philosophy-From_Demo_To_Duty-6B46C1?style=flat-square&logo=rocket&logoColor=white)
![Mode](https://img.shields.io/badge/Mode-Codex--First-F39C12?style=flat-square&logo=terminal&logoColor=white)
![Focus](https://img.shields.io/badge/Focus-AI_Delivery_Harness-00ADD8?style=flat-square&logo=openai&logoColor=white)

---

## What I Build

I build the layer that lets humans use coding agents with more confidence:

* **Agent-ready repos** with clear entrypoints, preflight checks, validation gates, and rollback-aware workflows
* **Runtime evidence** that separates local test truth from PR state, CI, review threads, tracker status, and merge readiness
* **Capability systems** for skills, plugins, prompts, hooks, and review agents that can be validated instead of merely trusted
* **CLI products** that make research, architecture, knowledge, and repo intelligence available to humans and agents
* **Local-first memory and narrative tools** that preserve intent, decisions, receipts, and context across long-running work

## Working Stack

Codex, OpenAI, MCP, TypeScript, Node.js, React, Tauri, Swift, SwiftUI, Python, Bash, macOS, GitHub Actions, CircleCI, CodeRabbit.

## TL;DR

**Problem:** AI coding is fast, but speed is not enough. Teams still need current context, bounded autonomy, repeatable validation, review evidence, and a clean handoff back to humans.

**Solution:** I build pragmatic Codex-first harnesses: CLIs, instruction systems, skills, evals, review gates, runtime cards, and workflow evidence that turn experiments into dependable engineering operations.

**Why it helps:** Shorter review loops, fewer vague agent claims, clearer operational defaults, and repos that are easier for both people and agents to pick up safely.

## Proof From My Local Repos

| Operating problem | What I built | Repo proof |
|---|---|---|
| Agents need a safe next step, not a wall of docs | Cockpit-style commands, runtime cards, repo-local gates, and evidence-backed handoff | synAIpse / coding-harness private work |
| Skills and plugins need lifecycle control | SDK-style authoring, routing, validation, evals, packaging, sync, and command-surface projections | [Skills SDK](https://github.com/${USERNAME}/Agent-Skills) |
| Long-running agent work needs deterministic state | Fresh session loops with file memory, receipts, context snapshots, gates, and review exits | [ralph-gold](https://github.com/${USERNAME}/ralph-gold) |
| AI-assisted code needs recoverable context | Local-first session-to-commit narrative, timelines, and search across the why behind changes | [trace-narrative](https://github.com/${USERNAME}/trace-narrative) |
| Reviewers and agents need architecture evidence | PR impact reports, repo orientation packs, policy validation, and agent handoff artifacts | [diagram-cli](https://github.com/${USERNAME}/diagram-cli) |
| Research and knowledge tools need agent-safe UX | Scriptable CLIs with structured output, explicit policy gates, diagnostics, and safe defaults | [rSearch](https://github.com/${USERNAME}/rSearch), [wSearch](https://github.com/${USERNAME}/wSearch) |

## Featured Work

${featuredProjectsTable}

## Quick Start (Pick One)

${quickStartCommands || '```bash\n# Quick start commands will be updated as active projects change\n```'}

${moreRepos.length > 0 ? `## More Projects

${moreProjectsList}

` : ''}## The Search Family

All published under \`@brainwav\` on npm:

| CLI | What it does | Install |
|-----|--------------|---------|
| rSearch | arXiv paper search, fetch, download | \`npm i -g @brainwav/rsearch\` |
| wSearch | Wikidata REST/SPARQL queries | \`npm i -g @brainwav/wsearch-cli\` |

## What I'm Doing

* **Shipping synAIpse / coding-harness** - a portable AI delivery harness for agent-ready repos, review gates, runtime evidence, and safer PR handoff
* **Building Skills SDK** - a governed SDK for Codex skills, plugins, evals, review closeout, and runtime projections
* **Building deterministic agent loops** - using ralph-gold to keep task selection, gates, receipts, and exit rules explicit
* **Making context durable** - connecting AI sessions, commits, project memory, architecture evidence, and review artifacts
* **Publishing practical CLIs** - research, Wikidata, architecture, and repo-intelligence tools with structured output and agent-friendly diagnostics

---

## Work With Me On

**AI delivery harnesses** - make a repo safer for Codex and other coding agents with entrypoints, gates, evidence, and handoff contracts

**Agentic developer workflows** - Codex, MCP, review loops, PR automation, runtime cards, and validation policy

**Developer tooling and CLIs** - research, knowledge, architecture evidence, repo automation, diagnostics, and machine-readable UX

**AI governance that actually runs** - instructions, drift control, evals, skill lifecycle, review gates, and repeatable workflows that keep human intent visible

**Founder/operator advisory** - turn messy prototypes into dependable AI-assisted product and engineering systems without losing the point of the work

---

${ARCHIVED_SECTION_TITLE}

I keep an archive of retired experiments at [unfinished-cemetery](${CEMETERY_URL}): short post-mortems for software that taught something useful before it was retired.

${archivedProjectsList || `* No archived projects currently listed.`}

---

## 📬 Connect

[![LinkedIn](https://img.shields.io/badge/LinkedIn-@${USERNAME}-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](${SOCIAL_LINKS.linkedin})
[![X](https://img.shields.io/badge/X-@${USERNAME}-000000?style=for-the-badge&logo=x&logoColor=white)](${SOCIAL_LINKS.twitter})
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](${SOCIAL_LINKS.email})
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
