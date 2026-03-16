# LYRA Visual Audit Suite v1.1

Systematic visual audit for app cohesion. Six agents read your code and produce a cohesion score with a prioritized cleanup plan. No rendering required -- agents work from source (Tailwind classes, CSS, component files).

## Agents

| Agent | Prompt | What It Covers |
|-------|--------|---------------|
| V1: Tokens | `visual-tokens.md` | Color palette, spacing scale, type scale, shadow scale, token governance |
| V2: Typography | `visual-typography.md` | Heading hierarchy, font sizes, weights, line heights, text color hierarchy |
| V3: Layout | `visual-layout.md` | Page structure, section spacing, grid, whitespace, responsive, containers |
| V4: Components | `visual-components.md` | Buttons, cards, forms, modals, nav, toasts, badges, tables, icons |
| V5: Color | `visual-color.md` | Palette usage, semantic color, contrast ratios, surface hierarchy, dark mode |
| V6: Polish | `visual-polish.md` | Hover/focus/active states, transitions, shadows, radii, loading, micro-interactions |
| Synthesizer | `visual-synthesizer.md` | Merges all, scores cohesion 1-5 on 5 dimensions, produces ranked cleanup plan |

## Cohesion Scoring

The synthesizer rates your app on 5 dimensions (1-5 each):

- **Systematic** -- is there a design system or is it ad-hoc?
- **Hierarchical** -- can users instantly tell what matters on each page?
- **Consistent** -- does the same component look the same everywhere?
- **Communicative** -- does color/contrast reliably convey meaning?
- **Polished** -- do interactions feel intentional and finished?

Overall score interpretation:
- 4.5-5.0 = Ship with confidence
- 3.5-4.4 = Targeted cleanup needed
- 2.5-3.4 = Visually fragmented, invest in system
- 1.5-2.4 = Significant design debt
- 1.0-1.4 = Rebuild visual layer

## How to Run

### Fast Lane (30-45 min): pick 2-3 agents

| What You're Worried About | Run These |
|---------------------------|-----------|
| "Does my app look cohesive?" | V4 (Components) + V5 (Color) |
| "Is my spacing all over the place?" | V1 (Tokens) + V3 (Layout) |
| "My headings feel random" | V2 (Typography) + V1 (Tokens) |
| "It doesn't feel polished" | V6 (Polish) + V4 (Components) |
| "I'm about to launch" | All 6 + Synthesizer |

### Deep Audit (2-3 hours): all agents

```
1. Run V1 (Tokens) first -- it maps the foundation everything else references
2. Run V2-V6 in any order (parallel if your tool supports it)
3. Run the Synthesizer last with all 6 outputs
4. Review the cohesion scores and ranked plan
5. Use session.py to triage and track fixes
```

### Saving Outputs

Same structure as the core audit suite:

```bash
mkdir -p audits/runs/$(date +%Y-%m-%d)
# Save each agent output:
#   audits/runs/YYYY-MM-DD/visual-tokens-YYYYMMDD-HHmmss.json
#   audits/runs/YYYY-MM-DD/visual-typography-YYYYMMDD-HHmmss.json
#   ...
#   audits/runs/YYYY-MM-DD/visual-synthesized-YYYYMMDD-HHmmss.json
```

## Integration with Core LYRA Suite

These prompts produce standard LYRA v1.1 schema JSON (`suite: "visual"`). They work with:
- `session.py` for triage and fix tracking
- `cleanup_open_findings.py` for enum normalization
- The existing `audits/open_findings.json` and `audits/findings/` case files
- The existing synthesizer (for cross-suite dedup if you run visual + core in the same cycle)

## What This Replaces

Instead of manually going through every page checking:
- [ ] Are my headings consistent? (V2 does this)
- [ ] Are my buttons the same everywhere? (V4 does this)
- [ ] Is my spacing from a scale? (V1 + V3 do this)
- [ ] Do my colors make sense? (V5 does this)
- [ ] Does everything have hover/focus states? (V6 does this)
- [ ] Does this feel like one product? (Synthesizer scores this)

You paste a prompt, get structured findings, fix the top items, re-audit the affected files.
