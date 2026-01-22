# Ralph CLI

![Ralph Wiggum saying: I'm in danger](https://i.kym-cdn.com/entries/icons/mobile/000/025/817/Screen_Shot_2018-03-30_at_11.34.27_AM.jpg)

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
| `-u, --unlimited` | Run indefinitely until completion | false |
| `-s, --signal <text>` | Completion signal | `<promise>COMPLETE</promise>` |
| `-M, --model <model>` | Claude model (opus, sonnet, haiku) | opus |
| `-d, --dangerously-skip` | Skip permission prompts | false |
| `-v, --verbose` | Show full Claude output | false |
| `--headless` | Run without TUI (for AFK/background) | false |
| `--no-splash` | Skip splash screen | - |
| `--no-notify` | Disable desktop notifications | - |
| `--no-sound` | Disable sound alerts | - |
| `--debug` | Enable debug logging | false |
| `--preflight-only` | Only run pre-flight checks | - |
| `--sandbox` | Run Claude in Docker sandbox | false |
| `--no-sandbox` | Disable Docker sandbox (default) | - |
| `--auto-commit` | Commit after each iteration | true |
| `--no-auto-commit` | Disable automatic commits | - |

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

## The Canonical Ralph Workflow

Ralph is most effective when used with the canonical pattern, which keeps AI operating in its smartest mode by wiping context completely after every iteration.

### Why No Context Injection?

Previous versions of Ralph injected iteration numbers and instructions into the prompt. This is **removed** because:

1. **Context pollution**: Every token injected is a token not available for the actual task
2. **LLMs get worse as context grows**: Old code, previous attempts, and failed approaches create noise
3. **Unnecessary**: Claude can read iteration state from files (PRD, progress.txt)
4. **Anti-pattern**: The canonical ralph keeps prompts **static**

The TUI still shows iteration progress for YOUR visibility - it's just not sent to Claude.

### How It Works

1. **Static Prompt**: Your prompt file contains instructions AND task definitions
2. **Fresh Context**: Each iteration starts with a completely clean context
3. **Progress via Files**: Claude reads/writes project files (not injected context)
4. **External Loop**: Ralph controls iteration, not Claude

### Recommended Prompt Structure

Your prompt file (e.g., `task.md`) should include:

1. **Instructions** - Tell Claude how to work:
   - Read the task list below
   - Pick the highest priority incomplete task
   - Implement it fully
   - Mark it as complete
   - Run tests/checks
   - Commit if passing

2. **Task List** - Concrete, verifiable tasks:
   ```markdown
   ## Tasks

   ### US-001: Add user authentication [passes: false]
   - Add POST /auth/login endpoint
   - Add POST /auth/register endpoint
   - Use bcrypt for password hashing
   - Tests pass

   ### US-002: Add password reset [passes: false]
   - Add POST /auth/forgot-password endpoint
   - Send reset email
   - Tests pass
   ```

3. **Completion Signal**:
   ```markdown
   When ALL tasks show [passes: true], output:
   <promise>COMPLETE</promise>
   ```

### progress.txt Convention

Instruct Claude to append learnings to `progress.txt` after each iteration:

```markdown
After completing work, append a brief summary to progress.txt:
- What was implemented
- Any issues encountered
- Patterns discovered for future iterations
```

This creates a log that:
- Gives you visibility into what happened
- Can be read by future iterations (Claude reads it fresh each time)
- Doesn't bloat context (it's a file, not injected)

### Example Runs

```bash
# Unlimited iterations until all tasks complete
ralph ./my-feature.md --unlimited

# With iteration limit (safety)
ralph ./my-feature.md -m 50

# Headless for AFK/overnight runs
ralph ./my-feature.md --unlimited --headless

# Combine with verbose output
ralph ./my-feature.md -u --headless -v
```

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

## Automatic Commits

By default, Ralph commits changes after each successful iteration. This provides:
- Safety against interrupted runs
- Clear history of what each iteration accomplished
- Easy rollback if something goes wrong

Claude provides commit messages via the `<commit_message>` tag. If not provided, Ralph generates a default message based on the git diff.

```bash
# Disable automatic commits
ralph ./task.md --no-auto-commit

# Re-enable (default)
ralph ./task.md --auto-commit
```

### Commit Message Tag

In your prompt, instruct Claude to provide commit messages:

```markdown
When you make code changes, provide a commit message:
<commit_message>Brief description of changes</commit_message>
```

## Known Limitations

### Permission Prompts in Sub-agents

Claude Code has a known bug ([#12261](https://github.com/anthropics/claude-code/issues/12261)) where sub-agents (like Plan mode, ultrathink) may still prompt for permissions even with `--dangerously-skip-permissions`.

**Workaround:** Avoid using `/plan` or complex sub-agent features in AFK ralph loops. Keep prompts focused on direct implementation tasks.

## Pre-flight Checks

Ralph runs several checks before starting:

- Claude CLI installed and in PATH
- Prompt file exists (if file path provided)
- Model is valid
- `~/.ralph` directory exists
- No other Ralph process running
- Max iterations is reasonable

Run `ralph --preflight-only` to test without starting the loop.

## Docker Sandbox Mode

For enhanced security during AFK or overnight runs, Ralph supports running Claude inside a Docker sandbox container.

### Prerequisites

- Docker Desktop 4.50+ installed and running
- Docker sandbox plugin enabled

### Usage

```bash
# Run with Docker sandbox
ralph --sandbox "Your prompt here"

# Combine with other options
ralph --sandbox -m 100 -M sonnet ./my-prd.md
```

### How It Works

When sandbox mode is enabled, Ralph runs Claude via Docker's sandbox feature:
```bash
docker sandbox run --credentials host claude [args]
```

This provides:
- **Isolated execution**: Claude runs in a container, not directly on your host
- **Controlled access**: Uses `--credentials host` to pass through your Claude credentials
- **Same functionality**: All Claude features work normally inside the sandbox

### Fallback Behavior

If Docker sandbox is not available (Docker not installed, not running, or missing the sandbox plugin), Ralph will prompt you to:
- Continue without sandbox (runs Claude directly)
- Exit and fix Docker setup

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
