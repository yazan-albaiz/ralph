# Ralph CLI

> Autonomous AI Coding Loop using Claude Code

Named after Ralph Wiggum from The Simpsons - known for naive, relentless persistence.

```
           ╔═══════════════════════════╗
           ║   (chuckles)              ║
           ║      I'm in danger.       ║
           ╚═══════════════════════════╝
```

## What is Ralph?

Ralph is a CLI tool that runs Claude Code in an autonomous loop until your task is complete. You give it a prompt (or a PRD file), and Ralph keeps iterating until Claude outputs a completion signal.

**Key insight:** Instead of babysitting AI coding tools, you become the product designer. Ralph becomes your tireless engineering team that works while you sleep.

## Features

- **Autonomous Loop**: Runs Claude Code repeatedly until completion
- **Rich TUI**: Beautiful terminal interface built with Ink (React for CLI)
- **Performance Tracking**: Stock-style delta comparison for iteration timing
- **Live Output Streaming**: 50-line rolling preview with ANSI support
- **History**: Full iteration history saved to `~/.ralph/history`
- **Smart Exit Detection**: Semantic promise tags for completion, blocking, and decisions
- **Notifications**: Desktop notifications + sound alerts when attention needed
- **Safe Exit**: Double Ctrl+C required to prevent accidental exits

## Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ralph-cli.git
cd ralph-cli

# Install dependencies
bun install

# Run directly
bun run src/cli.tsx "Your prompt here"

# Or build and install globally
bun run build
npm link
ralph "Your prompt here"
```

## Usage

### Basic Usage

```bash
# With inline prompt
ralph "Build a REST API with user authentication"

# With a prompt file (PRD)
ralph ./my-prd.md

# Specify max iterations
ralph -m 50 "Implement feature X"
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --max <n>` | Maximum iterations | 200 |
| `-s, --signal <text>` | Completion signal | `<promise>COMPLETE</promise>` |
| `-M, --model <model>` | Claude model (opus, sonnet, haiku) | opus |
| `-d, --dangerously-skip` | Skip permission prompts | false |
| `-v, --verbose` | Show full Claude output | false |
| `--no-splash` | Skip splash screen | - |
| `--no-notify` | Disable desktop notifications | - |
| `--no-sound` | Disable sound alerts | - |
| `--debug` | Enable debug logging | false |
| `--preflight-only` | Only run pre-flight checks | - |

### Keyboard Controls

During execution:
- `p` - Pause/resume the loop
- `r` - Resume from blocked/decide state
- `q` - Quit
- `Ctrl+C` (twice) - Force exit

## Promise Tags

Ralph uses semantic promise tags to communicate with Claude:

### Completion
```
<promise>COMPLETE</promise>
```
Output this when all tasks are done. Ralph will stop and celebrate.

### Blocked
```
<promise>BLOCKED: reason here</promise>
```
Output this when you can't continue without human help. Ralph will pause and notify.

### Decision Needed
```
<promise>DECIDE: question here</promise>
```
Output this when you need a user decision. Ralph will pause and wait.

## Writing Good Prompts

The key to success with Ralph is writing clear, specific prompts:

1. **Be Specific**: "Add a login button" is vague. "Add a login button in the top-right of the header that opens a modal with email/password fields" is better.

2. **Include Success Criteria**: Tell Claude exactly how to verify the task is done.

3. **Break Down Complex Tasks**: Each task should be completable in one Claude session.

4. **Example Prompt**:
```markdown
## Task
Implement user authentication for the Express API.

## Requirements
- Add POST /auth/login endpoint
- Add POST /auth/register endpoint
- Use bcrypt for password hashing
- Use JWT for session tokens
- Add auth middleware for protected routes

## Success Criteria
- All endpoints return proper status codes
- Passwords are hashed before storage
- JWT tokens expire after 24 hours
- Protected routes return 401 without valid token

When complete, output: <promise>COMPLETE</promise>
```

## History

All runs are saved to `~/.ralph/history/` as JSON files:

```json
{
  "id": "abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "projectRoot": "/Users/you/project",
  "prompt": "...",
  "iterations": [
    {
      "number": 1,
      "duration": 45000,
      "output": "...",
      "promiseTag": null
    }
  ],
  "result": "completed",
  "totalDuration": 180000
}
```

## Pre-flight Checks

Ralph runs several checks before starting:

- Claude CLI installed and in PATH
- Prompt file exists (if file path provided)
- Model is valid
- `~/.ralph` directory exists
- No other Ralph process running
- Max iterations is reasonable

Run `ralph --preflight-only` to test without starting the loop.

## Development

```bash
# Install dependencies
bun install

# Run in development
bun run dev "Test prompt"

# Run tests
bun test

# Run tests in watch mode
bun test --watch

# Type check
bun run typecheck

# Lint
bun run lint

# Format
bun run format
```

## Architecture

```
src/
├── cli.tsx              # Entry point, argument parsing
├── app.tsx              # Main Ink application
├── components/          # React/Ink UI components
│   ├── Splash.tsx       # ASCII art splash screen
│   ├── Header.tsx       # Status header
│   ├── IterationPanel.tsx
│   ├── OutputPreview.tsx
│   ├── Spinner.tsx
│   ├── TimingStats.tsx
│   └── Logger.tsx
├── hooks/               # React hooks
│   ├── useClaudeLoop.ts # Main loop orchestration
│   ├── useTiming.ts     # Performance tracking
│   ├── useOutputCapture.ts
│   └── useExitHandler.ts
├── lib/                 # Utilities
│   ├── claude.ts        # Claude CLI wrapper
│   ├── history.ts       # History management
│   ├── notifications.ts
│   ├── preflight.ts
│   ├── promiseParser.ts
│   └── logger.ts
└── types/               # TypeScript definitions
```

## Why "Ralph"?

Ralph Wiggum is known for his cheerful persistence and optimistic outlook, no matter how many times things go wrong. That's exactly what this tool does - it keeps trying until it succeeds.

> "Me fail English? That's unpossible!" - Ralph Wiggum

## License

MIT

## Credits

- Inspired by [Geoffrey Huntley's Ralph technique](https://github.com/snarktank/ralph)
- Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLI)
- Uses [Claude Code](https://claude.ai/code) by Anthropic
