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

# overrides
SIM_MODEL=gpt-4o-mini SIM_MAX_TURNS=8 npm run simulate:hm
```

Outputs land in `./simulations/` (gitignored):

- `hm-<level>-<ts>.md` — full transcript + scores + signals
- `summary-<ts>.md` — side-by-side score table linking to each run

### What it does

For each level:

1. Build the HM system prompt via `lib/interview-prompts/hiring_manager.ts`
   with a hard-coded fixture resume + JD.
2. Loop turn-by-turn — interviewer LLM → candidate LLM (persona-conditioned)
   — until the interviewer's wrap-up phrase fires or `SIM_MAX_TURNS` hits.
3. Hand the transcript to `gradeHiringManagerWithRetry` from
   `lib/claude-client.ts` (same grader the live app uses).
4. Render markdown.

To swap the fixture, edit the `FIXTURE` block at the top of
`simulate-hm.ts`.

### Costs

Roughly $0.10–$0.50 per level depending on model + turns. Use
`SIM_MODEL=gpt-4o-mini` to keep it cheap when iterating.
