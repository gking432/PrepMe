# scripts

## `simulate-hm.ts` — Hiring Manager interview simulator

Drives the live HM interviewer prompt against four synthetic candidate
personas (poor / good / better / best), runs the production grader on the
transcript, and writes a markdown report per run plus a side-by-side
summary into `./simulations/`.

### Setup

`OPENAI_API_KEY` and `ANTHROPIC_API_KEY` must be in `.env.local`. `tsx` is
loaded as a Node import hook, so no separate build step.

```bash
npm install
```

### Run

```bash
# all four levels + summary
npm run simulate:hm

# one level
npm run simulate:hm -- best

# comma-separated subset
npm run simulate:hm -- poor,best

# 100 total simulated interviews: 25 runs x 4 levels
SIM_RUNS_PER_LEVEL=25 npm run simulate:hm

# cheap prompt-only pressure test: no Claude grading
SIM_MODEL=gpt-4o-mini SIM_GRADE=0 SIM_RUNS_PER_LEVEL=25 npm run simulate:hm

# other overrides
SIM_MODEL=gpt-4o-mini SIM_MAX_TURNS=8 npm run simulate:hm
```

Outputs land in `./simulations/` (gitignored):

- `hm-<level>-<ts>.md` — full transcript + scores + signals
- `hm-<level>-<ts>.json` — raw transcript, grade, grading error, and flags
- `summary-<ts>.md` — aggregate score table, warnings, and links
- `summary-<ts>.json` — machine-readable aggregate data

### What it does

For each level:

1. Build the HM system prompt via `lib/interview-prompts/hiring_manager.ts`
   with a hard-coded fixture resume + JD.
2. Loop turn-by-turn — interviewer LLM → candidate LLM (persona-conditioned)
   — until the interviewer's wrap-up phrase fires or `SIM_MAX_TURNS` hits.
3. Hand the transcript to `gradeHiringManagerWithRetry` from
   `lib/claude-client.ts` (same grader the live app uses).
4. Render markdown and JSON.

The summary flags common failure modes:

- `grading_failed` when Claude returned no usable rubric.
- `score_out_of_expected_band` when a persona scores outside its expected range.
- `no_interviewer_closing` when the simulation hit the turn cap before a wrap.
- `possible_over_validation` when the interviewer sounds too impressed or coach-like.
- `non_monotonic_average` at the suite level when better personas do not score higher.

To swap the fixture, edit the `FIXTURE` block at the top of
`simulate-hm.ts`.

### Costs

Roughly $0.10–$0.50 per level depending on model + turns. Use
`SIM_MODEL=gpt-4o-mini` to keep it cheap when iterating.
