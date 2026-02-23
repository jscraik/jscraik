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
  'ralph-gold',
  'rSearch',
  'wSearch',
  'mKit',
  'sTools',
  'xKit'
];

const CEMETERY_URL = 'https://jscraik.github.io/unfinished-cemetery';
const ARCHIVED_SECTION_TITLE = '## 🧭 Archived Projects';

// Repos to exclude from listing (test, demo, or template repos)
const EXCLUDED_REPOS = [
  's1ngularity-repository-1',
  'brainwav-governance-canary',
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
 * Get emoji for repo based on name/description
 */
function getRepoEmoji(repoName) {
  const emojiMap = {
    'ralph-gold': '🧭',
    'rSearch': '📄',
    'wSearch': '📚',
    'zSearch': '🔍',
    'mKit': '🧰',
    'sTools': '🧪',
    'xKit': '🐦',
    'gKit': '⚙️',
    'zai-cli': '🤖',
    'zai-mcp-server': '🖼️',
    'zai-vscode': '💻'
  };
  return emojiMap[repoName] || '📦';
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
  const emoji = getRepoEmoji(repo.name);
  const stars = includeStars && repo.stargazers_count > 0 ? ` ⭐ ${formatStars(repo.stargazers_count)}` : '';
  const description = repo.description ? ` - ${truncateDescription(repo.description)}` : '';
  const repoUrl = useCemetery ? CEMETERY_URL : `https://github.com/${USERNAME}/${repo.name}`;
  const githubLink = useCemetery
    ? `\n  - GitHub: [${USERNAME}/${repo.name}](https://github.com/${USERNAME}/${repo.name})`
    : '';

  return `* ${emoji} **[${repo.name}](${repoUrl})**${stars}${description}${githubLink}`;
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

  // Generate featured projects list
  const featuredProjectsList = featuredRepos.map((repo) => buildRepoBullet(repo)).join('\n');

  // Generate more projects list
  const moreProjectsList = moreRepos.map((repo) => buildRepoBullet(repo)).join('\n');
  const archivedProjectsList = archivedRepos
    .map((repo) => buildRepoBullet(repo, { useCemetery: true, includeStars: false }))
    .join('\n');
  const quickStartCommands = buildQuickStartCommands(activeRepos);

  return `<div align="center">

# Jamie Scott Craik | AI Software Developer

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=22&pause=1000&color=6B46C1&center=true&vCenter=true&width=700&lines=AI-Powered+Developer+Tools+%7C+Vibe-Coding;From+Demo+To+Duty+%7C+British+Army+Veteran;Building+Tools+That+Amplify+Developer+Experience" alt="Typing SVG" />

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](${SOCIAL_LINKS.linkedin})
[![GitHub followers](https://img.shields.io/github/followers/${USERNAME}?label=Follow&style=for-the-badge&logo=github)](https://github.com/${USERNAME})
[![Twitter Follow](https://img.shields.io/twitter/follow/${USERNAME}?style=for-the-badge&logo=x&logoColor=white&color=000000)](${SOCIAL_LINKS.twitter})

</div>

---

## British Army Veteran | AI Software Developer

**Founder, brAInwav | AI-Powered Tools | Vibe-Coding Mode**

> **From Demo to Duty:** Transforming playful experiments into production tools. Building AI-powered developer tools that make coding more accessible, more fun, and more powerful.

**Now (${timestamp}):** Building CLI tooling for AI developer workflows.

**Last updated:** ${isoDate}

![Philosophy](https://img.shields.io/badge/Philosophy-From_Demo_To_Duty-6B46C1?style=flat-square&logo=rocket&logoColor=white)
![Mode](https://img.shields.io/badge/Mode-Vibe--Coding-F39C12?style=flat-square&logo=terminal&logoColor=white)
![Focus](https://img.shields.io/badge/Focus-AI_Powered_Tools-00ADD8?style=flat-square&logo=openai&logoColor=white)

---

## 💻 Vibe-Coding Stack

**AI Pair Programmers**

<a href="https://github.com/${USERNAME}"><img src="https://unpkg.com/@lobehub/icons-static-png@latest/dark/claude.png" alt="Claude" width="32" height="32" /></a>
<a href="https://github.com/${USERNAME}"><img src="https://unpkg.com/@lobehub/icons-static-png@latest/dark/openai.png" alt="OpenAI" width="32" height="32" /></a>
<a href="https://github.com/${USERNAME}"><img src="https://unpkg.com/@lobehub/icons-static-png@latest/dark/ollama.png" alt="Ollama" width="32" height="32" /></a>

**Languages & Frameworks**

<a href="https://github.com/${USERNAME}"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" alt="TypeScript" width="32" height="32" /></a>
<a href="https://github.com/${USERNAME}"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" alt="JavaScript" width="32" height="32" /></a>
<a href="https://github.com/${USERNAME}"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" alt="React" width="32" height="32" /></a>
<a href="https://github.com/${USERNAME}"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" alt="Node.js" width="32" height="32" /></a>
<a href="https://github.com/${USERNAME}"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg" alt="Swift" width="32" height="32" /></a>
<a href="https://github.com/${USERNAME}"><img src="https://developer.apple.com/assets/elements/icons/swiftui/swiftui-96x96_2x.png" alt="SwiftUI" width="32" height="32" /></a>

**Build Tools & Environment**

<a href="https://github.com/${USERNAME}"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" alt="Vite" width="32" height="32" /></a>
<a href="https://github.com/${USERNAME}"><img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" alt="Tailwind" width="32" height="32" /></a>
![macOS](https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple&logoColor=white)
![CLI](https://img.shields.io/badge/CLI-000000?style=flat-square&logo=gnu-bash&logoColor=white)
![Vibe Coding](https://img.shields.io/badge/Vibe--Coding-F39C12?style=flat-square&logo=rocket&logoColor=white)

## TL;DR

**Problem:** OSS teams and founders need fast, reliable AI tooling they can trust.

**Solution:** I build pragmatic CLIs and governance tools that turn experiments into safe, repeatable workflows.

**Why it helps:** Clear defaults, fast setup, and tools that scale from solo dev to team.

## Featured Projects (Community + Adoption)

${featuredProjectsList}

## Quick Start (Pick One)

${quickStartCommands || '```bash\n# Quick start commands will be updated as active projects change\n```'}

${ARCHIVED_SECTION_TITLE} (Moved to Cemetery)

${archivedProjectsList || `* No archived projects currently listed.`}

${moreRepos.length > 0 ? `## More Projects

${moreProjectsList}

` : ''}## The Search Family

All published under \`@brainwav\` on npm:

| CLI | What it does | Install |
|-----|--------------|---------|
| rSearch | arXiv paper search, fetch, download | \`npm i -g @brainwav/rsearch\` |
| wSearch | Wikidata REST/SPARQL queries | \`npm i -g @brainwav/wsearch-cli\` |

## What I'm Doing

* **Engineering deterministic AI workflows** - Shipping [ralph-gold](https://github.com/jscraik/ralph-gold) to run fresh Codex/Claude/Copilot sessions in a repeatable loop
* **Publishing practical AI tooling** - Maintaining [rSearch](https://github.com/jscraik/rSearch) and [wSearch](https://github.com/jscraik/wSearch) CLIs for research, search, and query workflows
* **Building agent infrastructure** - Evolving [mKit](https://github.com/jscraik/mKit) as a practical MCP/Cloudflare Workers foundation for AI tooling
* **Improving developer operations** - Building reusable tooling ecosystems like [Agent-Skills](https://github.com/jscraik/Agent-Skills), [SkillsInspector](https://github.com/jscraik/SkillsInspector), [code-archaeology-kit](https://github.com/jscraik/code-archaeology-kit), [firefly-narrative](https://github.com/jscraik/firefly-narrative), [Design-System](https://github.com/jscraik/Design-System), and [data-dashboard](https://github.com/jscraik/data-dashboard)
---

## 🤝 Let's Build Together

**🛠️ Tool Development** · AI-powered CLIs · Developer experience · Automation tools

**🤝 Collaboration** · Open source contribution · Veteran tech initiatives · Fun projects

**🚀 From Demo to Duty** · Turn experiments into products · Ship safely · Learn in public

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
