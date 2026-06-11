<div align="center">

# Jamie Scott Craik

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&size=22&pause=1000&color=6B46C1&center=true&vCenter=true&width=840&lines=AI+Delivery+Harness+Builder;Codex-First+Engineering+That+Ships;Evidence%2C+Review+Gates%2C+Agent+Workflows" alt="AI Delivery Harness Builder, Codex-first engineering that ships, Evidence, review gates, agent workflows" />

[![LinkedIn](https://img.shields.io/badge/LinkedIn-@jscraik-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/jamiescottcraik)
[![GitHub](https://img.shields.io/badge/GitHub-@jscraik-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/jscraik)
[![X](https://img.shields.io/badge/X-@jscraik-000000?style=for-the-badge&logo=x&logoColor=white)](https://twitter.com/jscraik)

</div>

---

## Harness Builder, "Grumpy Old Vet"

**British Army veteran | Founder, brAInwav | Codex-first toolmaker**

> Codex writes the code. I lead, inspect, and make the work accountable. The value is using both strengths properly.

**Now (Jun 11, 2026):** building synAIpse, Skills SDK, deterministic agent loops, and evidence tooling for teams that want AI coding to ship without losing trust.

By **harness**, I mean the operating layer around Codex and other coding agents: CLI entrypoints, repo-local guardrails, runtime evidence, review policy, memory, and handoff artifacts that make AI-assisted engineering repeatable.

**Last updated:** 2026-06-11

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
| Skills and plugins need lifecycle control | SDK-style authoring, routing, validation, evals, packaging, sync, and command-surface projections | [Skills SDK](https://github.com/jscraik/Agent-Skills) |
| Long-running agent work needs deterministic state | Fresh session loops with file memory, receipts, context snapshots, gates, and review exits | [ralph-gold](https://github.com/jscraik/ralph-gold) |
| AI-assisted code needs recoverable context | Local-first session-to-commit narrative, timelines, and search across the why behind changes | [trace-narrative](https://github.com/jscraik/trace-narrative) |
| Reviewers and agents need architecture evidence | PR impact reports, repo orientation packs, policy validation, and agent handoff artifacts | [diagram-cli](https://github.com/jscraik/diagram-cli) |
| Research and knowledge tools need agent-safe UX | Scriptable CLIs with structured output, explicit policy gates, diagnostics, and safe defaults | [rSearch](https://github.com/jscraik/rSearch), [wSearch](https://github.com/jscraik/wSearch) |

## Featured Work

| Project | Why it matters | Signal |
|---|---|---|
| [Agent-Skills](https://github.com/jscraik/Agent-Skills) | Skills SDK for authoring, routing, validating, packaging, and syncing Codex skills and plugins. | 5 stars |
| [ralph-gold](https://github.com/jscraik/ralph-gold) | Deterministic fresh-agent loop with file-based memory, gates, receipts, context snapshots, and review exit rules. | 2 stars |
| [trace-narrative](https://github.com/jscraik/trace-narrative) | Local-first app that links AI sessions, intent, commits, and timelines so teams can recover the why behind code changes. | active |
| [diagram-cli](https://github.com/jscraik/diagram-cli) | Architecture evidence CLI for PR review, repo orientation, agent handoff, policy validation, and Mermaid diagrams. | active |
| [rSearch](https://github.com/jscraik/rSearch) | Search, fetch, and download arXiv papers from the terminal. CLI plus TypeScript client. | active |
| [wSearch](https://github.com/jscraik/wSearch) | Script-friendly Wikidata REST, SPARQL, and Action API queries from the terminal. | active |
| [mKit](https://github.com/jscraik/mKit) | MCP server boilerplate for Cloudflare Workers. | 1 star |

## Quick Start (Pick One)

```bash
# ralph-gold
gh repo clone jscraik/ralph-gold
cd ralph-gold
uv tool install -e .
ralph --help
```

```bash
# rSearch
npm i -g @brainwav/rsearch
rsearch --help
```

```bash
# wSearch
npm i -g @brainwav/wsearch-cli
wsearch --help
```

## More Projects

* **[evals](https://github.com/jscraik/evals)** - Shared local eval runner for artifact integrity, schema validity, evidence-backed claims, and deterministic scorer verdicts.
* **[Design-System](https://github.com/jscraik/Design-System)** - Cross-platform UI workbench and component system for ChatGPT widgets and React apps.
* **[unfinished-cemetery](https://github.com/jscraik/unfinished-cemetery)** - A ritualised archive of abandoned projects — post-mortems for software that died so we could learn what lives.
* **[code-archaeology-kit](https://github.com/jscraik/code-archaeology-kit)** - Privacy-aware git-history intelligence for churn, temporal coupling, abandoned structures, and cleanup targets.

## The Search Family

All published under `@brainwav` on npm:

| CLI | What it does | Install |
|-----|--------------|---------|
| rSearch | arXiv paper search, fetch, download | `npm i -g @brainwav/rsearch` |
| wSearch | Wikidata REST/SPARQL queries | `npm i -g @brainwav/wsearch-cli` |

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

## Learning In Public

I keep an archive of retired experiments at [unfinished-cemetery](https://jscraik.github.io/unfinished-cemetery): short post-mortems for software that taught something useful before it was retired.

* **[xKit](https://jscraik.github.io/unfinished-cemetery)** - Unofficial X Web API Toolkit
  - GitHub: [jscraik/xKit](https://github.com/jscraik/xKit)
* **[zSearch](https://jscraik.github.io/unfinished-cemetery)** - Z.AI capabilities CLI and MCP server for agents and automation
  - GitHub: [jscraik/zSearch](https://github.com/jscraik/zSearch)
* **[data-dashboard](https://jscraik.github.io/unfinished-cemetery)**
  - GitHub: [jscraik/data-dashboard](https://github.com/jscraik/data-dashboard)
* **[jules-companion](https://jscraik.github.io/unfinished-cemetery)**
  - GitHub: [jscraik/jules-companion](https://github.com/jscraik/jules-companion)

---

## 📬 Connect

[![LinkedIn](https://img.shields.io/badge/LinkedIn-@jscraik-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/jamiescottcraik)
[![X](https://img.shields.io/badge/X-@jscraik-000000?style=for-the-badge&logo=x&logoColor=white)](https://twitter.com/jscraik)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:jscraik@brainwav.io)
