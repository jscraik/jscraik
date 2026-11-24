# Plans


<!-- AGENT-FIRST-PLANS:START -->
## Plan Contract (Agent-first)

All significant implementation plans MUST use task graphs with explicit dependencies.

Validation command:

```bash
python3 /Users/jamiecraik/.codex/scripts/plan-graph-lint.py .agent/PLANS.md
```

Current documentation task (24 November 2026):

```yaml
tasks:
  - id: T1
    title: Inspect public sources and preserve the current repository contract
    depends_on: []
  - id: T2
    title: Refresh the generated profile and public project entry points
    depends_on: [T1]
  - id: T3
    title: Run focused validation and prepare the signed-delivery handoff
    depends_on: [T2]
```

Optional cross-plan reference:

```yaml
external_dep: "/absolute/repo/path#T12"
```
<!-- AGENT-FIRST-PLANS:END -->
