# Real Output Artifact Report

Date: 2026-04-27

## Summary

The agent suite now produces real, repo-local artifacts under:

`agent-outputs/hypothetical-local-agent-suite/`

The run uses local Ollama models only and performs no internet downloads. Internet references are recorded as source URLs in research outputs, but the artifact runner does not fetch those URLs.

## Final Outputs

| Agent | Output | Path |
| --- | --- | --- |
| PowerPoint Deck Builder | Real PowerPoint deck | `agent-outputs/hypothetical-local-agent-suite/final/powerpoint-deck-builder/board-update/deck.pptx` |
| PowerPoint Deck Builder | Slide plan JSON | `agent-outputs/hypothetical-local-agent-suite/final/powerpoint-deck-builder/board-update/slides.json` |
| PowerPoint Deck Builder | Speaker notes | `agent-outputs/hypothetical-local-agent-suite/final/powerpoint-deck-builder/board-update/speaker-notes.md` |
| Writing Agent | Real Word document | `agent-outputs/hypothetical-local-agent-suite/final/writing-agent/executive-brief/domain-learning-agent-brief.docx` |
| Chief of Staff Agent | Real Word operating plan | `agent-outputs/hypothetical-local-agent-suite/final/chief-of-staff-agent/weekly-ops/operating-plan.docx` |
| Data Analysis Agent | Real Excel workbook | `agent-outputs/hypothetical-local-agent-suite/final/data-analysis-agent/usage-review/metrics-workbook.xlsx` |
| Data Analysis Agent | CSV metrics export | `agent-outputs/hypothetical-local-agent-suite/final/data-analysis-agent/usage-review/metrics.csv` |
| App Builder Agent | Basic local HTML dashboard | `agent-outputs/hypothetical-local-agent-suite/final/app-builder-agent/html-dashboard/index.html` |
| Research Brief Agent | Research brief | `agent-outputs/hypothetical-local-agent-suite/final/research-brief-agent/security-research/research-brief.md` |
| Research Brief Agent | PDF security brief | `agent-outputs/hypothetical-local-agent-suite/final/research-brief-agent/security-research/security-brief.pdf` |
| Code Review Agent | Security review findings | `agent-outputs/hypothetical-local-agent-suite/final/code-review-agent/security-review/findings.md` |
| Artifact suite | Local artifact index dashboard | `agent-outputs/hypothetical-local-agent-suite/final/artifact-index.html` |

## Local Model Runs

Models called through local Ollama:

| Model | Status | Result |
| --- | --- | --- |
| `qwen3:8b-q4_K_M` | ok | Recommended strict input validation and output sanitization. |
| `gemma4:26b` | ok | Recommended file integrity monitoring and malware scanning inside the sandbox. |
| `tinyllama:latest` | ok | Returned a short, low-quality but successful local response. |

The model notes are stored in:

`agent-outputs/hypothetical-local-agent-suite/run-summary.json`

## DOE

Command:

```bash
python3 scripts/run-artifact-agents.py --root agent-outputs/hypothetical-local-agent-suite --doe --models qwen3:8b-q4_K_M,gemma4:26b,tinyllama:latest
```

Design: `2^3` full factorial with real outputs in every run.

Factors:

- `deckDepth`: 4 slides vs 7 slides.
- `docDepth`: 3 Word sections vs 6 Word sections.
- `dashboardDepth`: 3 dashboard widgets vs 5 dashboard widgets.

Best run:

`deckDepth-high-docDepth-high-dashboardDepth-high`

DOE outputs are under:

`agent-outputs/hypothetical-local-agent-suite/doe-runs/`

Summary files:

- `agent-outputs/hypothetical-local-agent-suite/doe-summary.md`
- `agent-outputs/hypothetical-local-agent-suite/doe-summary.json`

## Build-Loop Optimize Results

Target: `real-agent-artifact-output`

Metric command:

```bash
npm run agents:artifacts:score
```

Guard command:

```bash
npm test && npm run build
```

Results:

| Iteration | Change | Score | Delta | Status |
| ---: | --- | ---: | ---: | --- |
| 0 | Baseline real artifacts | 586 | 0 | baseline |
| 1 | Add PDF and CSV real artifacts with validation | 659 | +73 | keep |
| 2 | Add local artifact index dashboard | 731 | +72 | keep |

Total optimize improvement: `24.74%`.

## Security Constraints

The artifact runner enforces:

- Output root must be inside this repo and under `agent-outputs/`.
- No external downloads are performed.
- Generated Office files are macro-free OOXML packages.
- OOXML packages are scanned for forbidden macro, ActiveX, OLE, embedded, and external relationship parts.
- Generated artifacts cannot use executable-like extensions such as `.sh`, `.command`, `.app`, `.pkg`, `.dmg`, or `.exe`.
- HTML dashboards use local inline data and no external links.

## Validation Outputs

Commands run:

```bash
npm test
npm run build
npm run agents:artifacts:score
unzip -t agent-outputs/hypothetical-local-agent-suite/final/powerpoint-deck-builder/board-update/deck.pptx
unzip -t agent-outputs/hypothetical-local-agent-suite/final/writing-agent/executive-brief/domain-learning-agent-brief.docx
unzip -t agent-outputs/hypothetical-local-agent-suite/final/data-analysis-agent/usage-review/metrics-workbook.xlsx
```

Latest observed results:

- `npm test`: 7 tests passed.
- `npm run build`: passed.
- `npm run agents:artifacts:score`: `731`.
- PowerPoint package unzip validation: passed.
- Word package unzip validation: passed.
- Excel package unzip validation: passed.

## Findings

- The PowerPoint agent now produces a real `.pptx`, not just `slides.json`.
- The Writing and Chief of Staff agents produce real `.docx` outputs.
- The App Builder agent produces a basic local HTML dashboard with inline data and no external dependencies.
- The Data Analysis agent produces both `.xlsx` and `.csv` artifacts.
- The Research agent produces a Markdown brief and a PDF brief.
- DOE is now tied to real generated outputs; the high-depth deck, high-depth doc, and high-depth dashboard combination scored best.
- Local model calls were fast enough for short control prompts across qwen, gemma4, and tinyllama. Long-form generation should still be chunked.

## Source References

- Ollama generate API: https://docs.ollama.com/api/generate
- OpenAI Agents SDK guardrails: https://openai.github.io/openai-agents-js/guides/guardrails/
- OpenAI Agents SDK tracing: https://openai.github.io/openai-agents-js/guides/tracing/
- Anthropic Building Effective Agents: https://www.anthropic.com/research/building-effective-agents/
- Reflexion: https://arxiv.org/abs/2303.11366
- DSPy: https://arxiv.org/abs/2310.03714
