<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document README for this repository.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Demo Video

Materials for the Contextrail launch demo video, built with
[Remotion](https://www.remotion.dev/) (programmatic React video).

## Setup

```bash
npx skills add remotion-dev/skills
```

This installs the Remotion Claude Code skill so scenes can be authored
via natural-language prompts.

## Planned scenes

| # | Scene | Duration | Visual |
|---|-------|----------|--------|
| 1 | Problem statement | 15s | Split screen: 2 agents editing the same file, merge conflict |
| 2 | COA intro | 10s | Hex grid appears, modules light up with metadata overlays |
| 3 | Parallel delivery | 20s | 3 agent trails moving through separate hex modules simultaneously |
| 4 | BBA in action | 15s | Agent adds new export behind seam — git merges cleanly |
| 5 | Claims protocol | 10s | Two trails approach shared file — claim filed, sequenced, resolved |
| 6 | Results | 10s | "One repo. Many agents. Zero collisions." + stats |
| 7 | CTA | 5s | GitHub link, star button, "Fork it. Break it. Tell us." |

Total target: ~90 seconds.

## File structure

```
docs/demo/
  README.md          — this file
  scenes/            — Remotion scene components (once created)
  assets/            — static images, logos, hex diagrams
  script.md          — full narration script
```

## Production workflow

1. Write narration script in `script.md`
2. Describe each scene to Claude with the Remotion skill active
3. Preview in Remotion Studio (`npx remotion studio`)
4. Iterate on timing, transitions, colors
5. Render to MP4 (`npx remotion render`)
6. Upload to YouTube, embed in README and landing page
