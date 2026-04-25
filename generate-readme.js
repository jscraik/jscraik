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
  'Agent-Skills',
  'ralph-gold',
  'rSearch',
  'wSearch',
  'mKit',
  'Design-System'
];

const CEMETERY_URL = 'https://jscraik.github.io/unfinished-cemetery';
const ARCHIVED_SECTION_TITLE = '## Learning In Public';

const REPO_DISPLAY_OVERRIDES = {
  'Agent-Skills': {
    description: 'Codex-first skill catalog for authoring, validating, and syncing AI coding skills across local agent workflows.'
  },
  'ralph-gold': {
    description: 'A Golden Ralph Loop orchestrator for running fresh Codex sessions in a deterministic implementation loop.'
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
    .filter((item) => activeRepoNames.has(item.repoName))
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

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=22&pause=1000&color=6B46C1&center=true&vCenter=true&width=760&lines=Grumpy+Old+Vet%2C+Solo+Harness+Builder;From+Demo+To+Duty;Codex-First+Engineering+That+Ships" alt="Grumpy Old Vet, Solo Harness Builder, From Demo to Duty, Codex-first engineering that ships" />

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](${SOCIAL_LINKS.linkedin})
[![GitHub followers](https://img.shields.io/github/followers/${USERNAME}?label=Follow&style=for-the-badge&logo=github)](https://github.com/${USERNAME})
[![Twitter Follow](https://img.shields.io/twitter/follow/${USERNAME}?style=for-the-badge&logo=x&logoColor=white&color=000000)](${SOCIAL_LINKS.twitter})

</div>

---

## Grumpy Old Vet, Solo Harness Builder

**British Army veteran | Founder, brAInwav | Codex-first toolmaker**

> **From Demo to Duty:** turning promising AI experiments into repeatable engineering workflows that a real project can trust.

**Now (${timestamp}):** building Codex-first CLI tooling, agent instructions, and governance systems for AI-assisted engineering.

By **harness**, I mean the operating layer around Codex: CLI tools, instructions, validation gates, repo workflows, and review loops that make AI-assisted coding repeatable.

**Last updated:** ${isoDate}

![Philosophy](https://img.shields.io/badge/Philosophy-From_Demo_To_Duty-6B46C1?style=flat-square&logo=rocket&logoColor=white)
![Mode](https://img.shields.io/badge/Mode-Codex--First-F39C12?style=flat-square&logo=terminal&logoColor=white)
![Focus](https://img.shields.io/badge/Focus-Solo_Harness_Builder-00ADD8?style=flat-square&logo=openai&logoColor=white)

---

## From Demo To Duty

I build the harness around Codex so AI coding can move from impressive demos to dependable project work:

* fresh implementation loops
* CLI research and knowledge tools
* MCP/server foundations
* instruction packs and validation gates
* repo governance that keeps human intent visible

## Working Stack

Codex, OpenAI, MCP, TypeScript, Node.js, React, Swift, SwiftUI, Python, Bash, macOS, GitHub Actions, CircleCI, CodeRabbit.

## TL;DR

**Problem:** OSS teams and founders need fast, reliable AI tooling they can trust.

**Solution:** I build pragmatic Codex-first harnesses: CLIs, instruction systems, validation gates, and governance tools that turn experiments into safe, repeatable workflows.

**Why it helps:** Clear defaults, fast setup, and tools that scale from solo dev to team.

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

* **Current focus** - Making \`ralph-gold\`, \`Agent-Skills\`, and the \`brainwav\` CLIs more reliable and production-ready
* **Engineering deterministic AI workflows** - Shipping [ralph-gold](https://github.com/jscraik/ralph-gold) to run fresh Codex sessions in a repeatable loop
* **Publishing practical AI tooling** - Maintaining [rSearch](https://github.com/jscraik/rSearch) and [wSearch](https://github.com/jscraik/wSearch) CLIs for research, search, and query workflows
* **Building agent infrastructure** - Evolving [mKit](https://github.com/jscraik/mKit) as a practical MCP/Cloudflare Workers foundation for AI tooling
* **Improving developer operations** - Building reusable tooling ecosystems like [Agent-Skills](https://github.com/jscraik/Agent-Skills), [code-archaeology-kit](https://github.com/jscraik/code-archaeology-kit), [trace-narrative](https://github.com/jscraik/trace-narrative), and [Design-System](https://github.com/jscraik/Design-System)

---

## Work With Me On

**Agentic developer workflows** - Codex, MCP, review loops, PR automation, and validation gates

**CLI tools** - research, knowledge, search, repo automation, and developer UX

**AI governance** - instructions, drift control, and repeatable workflows that keep human intent visible

**Grumpy Old Vet product thinking** - turning messy prototypes into dependable tools without losing the human intent

---

${ARCHIVED_SECTION_TITLE}

I keep an archive of retired experiments at [unfinished-cemetery](${CEMETERY_URL}): short post-mortems for software that taught something useful before it was retired.

${archivedProjectsList || `* No archived projects currently listed.`}

---

## 📬 Connect

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](${SOCIAL_LINKS.linkedin})
[![Twitter](https://img.shields.io/badge/Twitter-000000?style=for-the-badge&logo=x&logoColor=white)](${SOCIAL_LINKS.twitter})
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
// MAIN EXECUTION
// =============================================================================

async function main() {
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
