# Ralph CLI - Development Context

## Project Overview

Ralph is an autonomous AI coding loop CLI that runs Claude Code repeatedly until a task is complete. Named after Ralph Wiggum's naive, relentless persistence.

**Package:** `@yazangineering/ralph` on npm
**Install:** `bun add -g @yazangineering/ralph`
**Run:** `ralph "Your prompt here"`

## Tech Stack

- **Runtime:** Bun (build & dev), Node.js (production)
- **UI Framework:** Ink (React for terminal)
- **Language:** TypeScript (strict mode)
- **CLI Parsing:** Commander.js
- **Build:** Bun bundler (single-file output to `dist/cli.js`)

## Architecture

```
src/
├── cli.tsx              # Entry point, argument parsing (Commander.js)
├── app.tsx              # Main Ink application, phase management
├── types/index.ts       # All TypeScript interfaces and types
├── components/          # React/Ink UI components
│   ├── Splash.tsx       # Startup splash screen
│   ├── Header.tsx       # Status bar with model/iteration info
│   ├── IterationPanel.tsx # Progress and iteration display
│   ├── OutputPreview.tsx   # 50-line rolling output preview
│   ├── TimingStats.tsx  # Performance metrics
│   ├── Spinner.tsx      # Loading indicator
│   └── Logger.tsx       # Notification boxes
├── hooks/               # React hooks
│   ├── useClaudeLoop.ts # Core loop orchestration (most important)
│   ├── useTiming.ts     # Performance tracking with deltas
│   ├── useOutputCapture.ts # Rolling output buffer
│   └── useExitHandler.ts   # Safe exit with double Ctrl+C
└── lib/                 # Utilities (non-React)
    ├── claude.ts        # Claude CLI process spawning
    ├── promiseParser.ts # Promise tag parsing + loop context injection
    ├── history.ts       # Save runs to ~/.ralph/history/
    ├── notifications.ts # Desktop notifications + sound
    ├── preflight.ts     # Pre-flight validation checks
    └── logger.ts        # Colored console logging
```

## Key Concepts

### Promise Tags

Claude signals its state using semantic XML tags:

```
<promise>COMPLETE</promise>     # Task finished successfully
<promise>BLOCKED: reason</promise>  # Needs human intervention
<promise>DECIDE: question</promise> # Needs user decision
```

Parsed by `src/lib/promiseParser.ts`.

### Loop Context Injection

Every prompt sent to Claude includes context about the autonomous loop:

```
=== RALPH AUTONOMOUS LOOP ===
ITERATION: 1 of 10
This is the FIRST iteration.
PROJECT_ROOT=/path/to/project
...instructions...
=== END RALPH CONTEXT ===
```

Injected by `preparePrompt()` in `src/lib/promiseParser.ts`.

### Application Phases

Managed in `src/app.tsx`:

- `splash` → `starting` → `running` → `complete`
- Can also transition to: `paused`, `error`

### Loop States

Defined in `src/types/index.ts` as `LoopStatus`:

- `idle`, `running`, `paused`
- `completed`, `blocked`, `decide`
- `max_reached`, `cancelled`, `error`

## Commands

```bash
# Development
bun run dev "test prompt"     # Run without building
bun run build                 # Bundle to dist/cli.js
bun run typecheck             # TypeScript validation
bun run lint                  # ESLint
bun run format                # Prettier

# Testing
bun test                      # Run all tests
bun test --watch              # Watch mode
```

## Important Files

| File | Purpose |
|------|---------|
| `src/hooks/useClaudeLoop.ts` | Core loop logic - start, pause, resume, stop |
| `src/lib/claude.ts` | Spawns `claude` CLI process, captures stdout/stderr |
| `src/lib/promiseParser.ts` | Parses completion tags, injects loop context |
| `src/app.tsx` | Main UI, phase transitions, keyboard handling |
| `src/types/index.ts` | All TypeScript interfaces |

## Code Patterns

### Helper Functions Over Ternaries

Extract complex conditionals into named functions:

```typescript
// Good
function getCompletionTitle(status: LoopStatus): string {
  switch (status) {
    case 'completed': return '✓ Task Complete!';
    case 'max_reached': return '! Max Iterations Reached';
    default: return '✕ Loop Stopped';
  }
}

// Avoid nested ternaries in JSX
```

### State Updates with Callbacks

Always use callback form for state that depends on previous value:

```typescript
setState((prev) => ({ ...prev, output: [...prev.output, chunk] }));
```

### Refs for Mutable Values in Hooks

Use refs for values that shouldn't trigger re-renders:

```typescript
const isRunningRef = useRef(false);
const isPausedRef = useRef(false);
```

## Publishing

Auto-publishes to npm on merge to master via GitHub Actions.

To release a new version:
1. Update `version` in `package.json`
2. Commit and push to master
3. GitHub Action builds and publishes if version is new

## Configuration

Default config in `src/types/index.ts`:

```typescript
export const DEFAULT_CONFIG = {
  maxIterations: 200,
  completionSignal: '<promise>COMPLETE</promise>',
  model: 'opus',
  dangerouslySkipPermissions: false,
  verbose: false,
  showSplash: true,
  enableNotifications: true,
  enableSound: true,
};
```

## History

Runs are saved to `~/.ralph/history/{id}.json` with full iteration records.

## Dependencies

**Runtime:**
- `ink` - React for CLI
- `react` - UI framework
- `commander` - CLI argument parsing
- `chalk` - Terminal colors
- `node-notifier` - Desktop notifications
- `beeper` - Sound alerts
- `nanoid` - ID generation

**Dev:**
- `typescript` - Type checking
- `eslint` - Linting
- `prettier` - Formatting
- `@types/*` - Type definitions

## Testing Approach

Tests are in `tests/` directory using Bun's test runner.

```bash
bun test                    # Run all
bun test promiseParser      # Run specific file
```

## Common Tasks

### Adding a New CLI Option

1. Add to `program.option()` in `src/cli.tsx`
2. Add to `RalphConfig` interface in `src/types/index.ts`
3. Add default to `DEFAULT_CONFIG`
4. Use in `src/app.tsx` or pass to hooks

### Adding a New Component

1. Create in `src/components/`
2. Export from `src/components/index.ts`
3. Import and use in `src/app.tsx`

### Modifying Loop Behavior

Edit `src/hooks/useClaudeLoop.ts`:
- `runIteration()` - Single iteration logic
- `executeLoop()` - Main loop control flow
- Promise tag handling in the completion checks

### Changing Prompt Context

Edit `preparePrompt()` in `src/lib/promiseParser.ts`.
