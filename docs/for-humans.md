# Agent Graph for humans

[← Back to README](../README.md)

**Who this is for:** anyone who wants to understand this project, even if you have never used an AI coding tool, a terminal, or read a software README before.

This guide starts from zero. Every important word is explained the first time it appears. By the end you should know what Agent Graph is, how the pieces talk to each other, and how to get it running on your computer.

---

## Start here: the world this project lives in

### What is a computer project / “codebase”?

A **codebase** (also called a **repository**, or **repo**) is a folder of files that make up a software project.

This folder on your computer *is* the Agent Graph project. Inside it you will see files with names like `README.md`, `package.json`, and folders like `src/` and `docs/`.

- A **file** is a named piece of stored information (like a Word document, but often plain text).
- A **folder** (also called a **directory**) holds files and other folders.
- **Source code** is text that tells a computer what to do. Programmers write it; tools run it.

### What is software?

**Software** is a set of instructions a computer can run. Your web browser is software. This project is also software. When we say “run a command,” we mean: ask the computer to start a small piece of software and do a job.

### What is a terminal?

A **terminal** (also called a **command line** or **shell**) is a text window where you type instructions instead of clicking buttons.

Examples:

- On a Mac: **Terminal** or **iTerm**
- On Windows: **PowerShell**, **Command Prompt**, or **Windows Terminal**
- Inside many coding apps: a panel labeled **Terminal**

You type a line, press Enter, and the computer prints a reply.

Example of a command:

```bash
npm install
```

That means: “use the `npm` tool to install this project’s helper packages.” You will use commands like this later.

### What is Node.js? What is npm?

**Node.js** (often just called **Node**) is a program that can run JavaScript (and related languages) on your computer, not only in a web browser.

**npm** is a tool that usually comes with Node. It:

- installs packages this project depends on
- runs short named tasks listed in `package.json` (like `test` or `check`)

Agent Graph needs **Node version 20 or newer**.

To check whether you already have them, open a terminal and type:

```bash
node -v
npm -v
```

If those print version numbers, you are ready for install steps later. If your computer says the command is not found, install Node from the official Node.js website first, then come back.

### What is Git? (optional but common)

**Git** is a tool that tracks changes to files over time. **GitHub** is a website where many Git projects are stored online.

People often say “clone the repo.” That means: download a copy of the project folder onto your computer. You can also get the folder another way (zip download). The important part is: you need the project files on your machine.

### What is an AI coding agent?

An **AI coding agent** is a program that uses an AI model to help write and change software. You describe a goal in normal language. The agent may:

- read files
- edit files
- run commands in the terminal
- explain what it did

Examples of coding agents / hosts you might hear about:

- **Claude Code**
- **Codex**
- **OpenCode**
- **Antigravity** (command name often `agy`)
- **Cursor** (an editor that can also talk to helper tools)

These tools are powerful. They are also messy about **process**. They may skip steps, forget what “finished” means, or claim tests passed without running them.

That is the problem Agent Graph is built to help with.

### What is a “ticket” or “assignment”?

In software teams, a **ticket** is a single job, like:

- “Fix the login button”
- “Add a search box”
- “Update the docs”

In Agent Graph, that job is called an **assignment**. It gets an **ID** (a short name), like `ENG-4521` or `DEMO-1`, so everyone can point at the same job.

### What does “done” mean?

“Done” should not mean “the AI said it was done.”

In careful work, **done** means:

1. We wrote down what success looks like (**acceptance criteria**)
2. We made the change
3. We ran checks (**verification**) and saved the results
4. Someone (or another pass) looked at the change (**review**)
5. We wrote a short handoff summary (**delivery**)

Agent Graph turns that into a tracked path with rules.

---

## What Agent Graph is (and is not)

### In one sentence

**Agent Graph is a checklist-and-memory system for software jobs done by humans and AI coding agents.**

### In everyday terms

Imagine a whiteboard for one job:

1. Understand the request
2. Say what kind of job it is
3. Look around the code
4. Write what “done” means
5. Plan
6. Do the work
7. Run checks and write down the results
8. Review the final change
9. Write a delivery note
10. Mark complete

Agent Graph is that whiteboard, plus **rules**:

- You cannot jump ahead when required notes are missing
- If checks fail, you go back to “do the work”
- Everything important is saved as files you can open later

### What it is not

Agent Graph is **not**:

- a new ChatGPT / Claude chat website
- a replacement for your code editor
- a replacement for GitHub Issues / Linear / Jira (unless you choose matching IDs)
- a magic button that writes all your code for you
- a cloud service you log into (in version 0.2 it runs on your computer)

Your coding agent still does the thinking and file editing. Agent Graph keeps the **process honest and visible**.

---

## The problem it solves (a story)

**Without Agent Graph**

1. You ask: “Make the settings page save correctly.”
2. An AI agent edits some files.
3. It says “All done!”
4. Later you discover it never ran tests, changed unrelated files, and forgot an error case.

**With Agent Graph**

1. You (or the agent) create assignment `FIX-77`.
2. You write acceptance criteria, such as: “Saving settings keeps values after reload.”
3. Work moves through stages.
4. Before review, the system requires recorded check results.
5. Before complete, it requires a review note and a delivery note.
6. Anyone can open `.agent/state/FIX-77.json` and see what happened.

Same AI. Better process. Shared memory.

---

## Words you will see a lot

| Word | Plain meaning |
| --- | --- |
| **Assignment** | One tracked job |
| **Batch** | A group of jobs worked in order |
| **Stage / node** | A step on the path (like `plan` or `verify`) |
| **Advance** | Move to the next allowed stage |
| **Guard** | A rule that blocks advancing until something is recorded |
| **Acceptance criterion** | One clear “this must be true when finished” statement |
| **Verification** | A named check result (passed / failed / skipped) |
| **Evidence** | The written proof (criteria, check results, review, delivery) |
| **CLI** | “Command line interface” — tools you run by typing |
| **`agentctl`** | Agent Graph’s own CLI tool |
| **MCP** | A standard way for AI tools to call helper toolboxes |
| **MCP server** | The helper program Agent Graph provides to AI hosts |
| **Worker / provider** | An optional outside AI CLI (Claude, Codex, …) Agent Graph can launch |
| **State** | Saved progress (JSON files on disk) |
| **JSON** | A simple text format for structured data (lists, names, values) |
| **Adapter** | Small code that knows how to talk to one worker CLI |

You do not need to memorize this table. Skim it once, then keep reading. Come back when a word feels fuzzy.

---

## Birds-eye view of the whole system

Here is the system as a picture in text:

```text
YOU
 │
 ├── type commands in a terminal ──► agentctl ──┐
 │                                              │
 └── chat with an AI coding app                 │
         │                                      │
         └── AI app uses MCP tools ─────────────┤
                                                ▼
                                      Agent Graph engine
                                      (TypeScript program)
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        ▼                       ▼                       ▼
                 Saves progress           Optional: starts         Reads rules from
                 as JSON files            worker AI CLIs           AGENTS.md + graph.yaml
                 under .agent/state/
```

### Four layers (remember these)

1. **Rules** — written instructions and stage definitions (`AGENTS.md`, `.agent/graph.yaml`, playbooks)
2. **Engine** — the TypeScript program that creates jobs, moves stages, and enforces rules (`src/`)
3. **Doors in** — two ways to use the engine:
   - terminal commands (`agentctl`)
   - MCP tools (for AI coding apps)
4. **Optional workers** — other AI CLIs that can be launched to help on a tracked job

### Who owns what?

| Owner | Responsibility |
| --- | --- |
| **You** | Goals, approvals for risky actions (push, delete, spend money), final judgment |
| **Coding agent / worker** | Reading code, editing files, running project commands |
| **Agent Graph** | Job stages, required evidence, history, “you can’t skip that” rules |

---

## Assignments: one job at a time

### What gets stored

Each assignment is one JSON file, for example:

```text
.agent/state/ENG-4521.json
```

That file can include:

- ID and short summary
- type (feature, bug fix, documentation, …)
- current stage
- acceptance criteria
- assumptions and notes
- verification results
- review summary
- delivery summary
- history of stage moves
- records of worker runs (if any)

JSON looks a bit like this:

```json
{
  "id": "ENG-4521",
  "summary": "Make the device picker resizable",
  "currentNode": "verify",
  "acceptanceCriteria": ["The picker can be resized"],
  "verification": {
    "tests": {
      "status": "passed",
      "details": "npm test"
    }
  }
}
```

You can open these files in any text editor. There is no secret database in version 0.2. **The files are the memory.**

### The assignment path (all stages)

Defined in `.agent/graph.yaml` and enforced by `src/workflow.ts`.

| Stage name | What should happen |
| --- | --- |
| `intake` | Capture the request and give it an ID |
| `classify` | Say what kind of work it is |
| `context` | Look at the repo, issue, branch, and nearby code |
| `outcome` | Write acceptance criteria and assumptions |
| `plan` | Decide approach, files, risks, and how to verify |
| `implement` | Make the smallest change that meets the outcome |
| `verify` | Run checks and record results |
| `review` | Independently inspect the final change |
| `deliver` | Write a handoff / PR-ready summary |
| `complete` | Mark the job finished |

### Forward, and sometimes back

Most stages only move one step forward.

Two special loops exist on purpose:

- From **`verify`**, you can go to **`review`** (checks look good) or back to **`implement`** (checks failed).
- From **`review`**, you can go to **`deliver`** (no blockers) or back to **`implement`** (blocking issue found).

That is called a **repair loop**. Bad work should not pretend to be finished.

### Guards: the “not yet” rules

Before some moves, Agent Graph checks for required evidence:

| Trying to move | Blocked until… |
| --- | --- |
| `outcome` → `plan` | At least one acceptance criterion exists |
| `verify` → `review` | At least one check **passed**, and no check is still **failed** |
| `review` → `deliver` | A review summary has been written |
| `deliver` → `complete` | A delivery summary has been written |

If you try too early, the tool errors and the job stays put. That is a feature.

---

## Batches: many jobs, one after another

A **batch** is a list of assignment IDs plus a plan for working them.

Example idea: “This week finish auth fix, then picker resize, then docs polish.”

Batch stages:

| Stage | Meaning |
| --- | --- |
| `intake` | Create the batch and list ticket IDs |
| `plan` | Decide order, dependencies, risks (you can revise the plan several times) |
| `execute` | Work **only the current ticket** through the full assignment path |
| `complete` | Allowed only when every ticket is complete or explicitly skipped |

During `execute`, the batch remembers which assignment is current. The design goal is simple:

> Finish (or skip with a reason) the current ticket before starting the next one.

Batch data lives here:

```text
.agent/state/batches/<batch-id>.json
```

---

## MCP, explained from absolute zero

### Why AI apps need “tools”

An AI chat by itself can only produce text.

To help with real coding, an AI app needs **tools**: abilities like “read this file,” “run this command,” or “update this assignment.”

Different apps invent different tool systems. That gets messy.

### What MCP is

**MCP** stands for **Model Context Protocol**.

It is an **agreement** (a shared standard) for how an AI app can start a helper program and call its tools.

Think of it like USB for AI helpers:

- Many AI apps can speak MCP
- Many helper programs can speak MCP
- They plug together without each one needing a custom private cable

In MCP language:

- The **host** is the AI coding app (Claude Code, Codex, Cursor, …)
- The **server** is the helper program (here: Agent Graph)
- A **tool** is one action the server offers (like `start_assignment`)

### How the connection usually works on your machine

1. You open this project in an AI coding app.
2. The app reads a config file (for this repo: `.mcp.json` or `.codex/config.toml`).
3. The app starts Agent Graph’s MCP server, usually by running something like `npm run mcp`.
4. The app and the server talk through **stdio** — plain input/output pipes between two programs on the same computer. No website login is required for that local link.
5. When you ask the AI to start an assignment, it can call the `start_assignment` tool.
6. The server writes or updates a JSON file under `.agent/state/`.

### What tools Agent Graph offers over MCP

Same capabilities as the terminal tool, including:

- start / get / list assignments
- advance stages
- add acceptance criteria, assumptions, notes
- record verification, review, delivery
- list available worker CLIs
- run a worker on an assignment
- start / plan / execute batches and get the next ticket

### The key insight

**MCP and `agentctl` are two doors into the same house.**

If the AI uses MCP to create `DEMO-1`, and later you run:

```bash
npm run agentctl -- status DEMO-1
```

you should see the same job, because both read the same JSON files.

---

## The terminal tool: `agentctl`

`agentctl` is Agent Graph’s command-line front door.

Common pattern:

```bash
npm run agentctl -- <command> <arguments>
```

The `--` tells npm: “everything after this belongs to agentctl, not to npm.”

Examples:

```bash
npm run agentctl -- start DEMO-1 --type feature --summary "Try Agent Graph"
npm run agentctl -- criteria DEMO-1 "I can see the assignment status"
npm run agentctl -- status DEMO-1
npm run agentctl -- providers
```

`providers` means: “which optional worker CLIs can this computer find right now?”

---

## Optional workers (delegation)

Sometimes you want Agent Graph to **hand a tracked job to another AI CLI**.

Flow:

1. An assignment already exists.
2. You (or an MCP tool) ask Agent Graph to run a provider, such as `opencode` or `codex`.
3. Agent Graph builds a prompt from the assignment (summary, stage, acceptance criteria).
4. It starts that CLI in a folder you choose (often your app’s repo, not only this repo).
5. When the run ends, Agent Graph stores a short record on the assignment (`agentRuns`).

Supported provider names in this project:

- `claude`
- `codex`
- `opencode`
- `antigravity`

**You do not need workers to use Agent Graph.** Tracking and MCP work without them. Workers are optional extra muscle, and useful when one agent implements and another reviews.

If a CLI is installed in an unusual place, you can point to it with environment variables (settings your terminal remembers for that session), for example:

```bash
export AGENT_GRAPH_OPENCODE_COMMAND=/custom/path/opencode
```

---

## Rules files (the written playbook)

These files are part of the product, even though they are not “running code” by themselves:

| File | What it is for |
| --- | --- |
| `AGENTS.md` | Main instructions AI agents should follow while working |
| `CLAUDE.md` | Short Claude-oriented pointer into those instructions |
| `.agent/graph.yaml` | Human-readable list of stages and required evidence |
| `.agent/playbooks/feature.md` | Extra guidance for feature work |
| `.agent/playbooks/bugfix.md` | Extra guidance for bug fixes |

When a worker is launched, it is told to follow `AGENTS.md` and to record evidence through MCP or `agentctl`.

---

## Tour of the folders and files

You do not need to read every file. This map is so the project stops feeling like a mystery box.

```text
agent-graph/                         ← the project root (main folder)
├── README.md                        ← short overview + links
├── AGENTS.md                        ← how agents should behave
├── CLAUDE.md                        ← Claude notes
├── package.json                     ← project name, scripts, dependencies
├── .mcp.json                        ← tells Claude-like apps how to start MCP
├── .codex/config.toml               ← tells Codex how to start MCP
├── .agent/
│   ├── graph.yaml                   ← stage definitions
│   ├── playbooks/                   ← feature / bugfix guidance
│   └── state/                       ← saved assignments and batches (created/used at runtime)
├── docs/
│   ├── for-humans.md                ← this guide
│   └── for-agents.md                ← setup checklist written for AI agents
├── src/                             ← the program source code
│   ├── types.ts                     ← shared shapes and stage names
│   ├── store.ts                     ← save/load JSON state
│   ├── workflow.ts                  ← assignment stage moves + guards
│   ├── batch.ts                     ← batch stage moves + current ticket
│   ├── runner.ts                    ← build prompt + run a worker
│   ├── cli.ts                       ← agentctl
│   ├── mcp.ts                       ← MCP server
│   └── agents/                      ← adapters for Claude/Codex/OpenCode/Antigravity
└── test/                            ← automated tests for the engine
```

### What the important source files do

- **`store.ts`** — creates folders if needed, checks that IDs are safe, writes JSON carefully (write a temp file, then rename) so a crash is less likely to leave a half-written file.
- **`workflow.ts`** — knows legal assignment moves and required evidence.
- **`batch.ts`** — knows legal batch moves and which ticket is current.
- **`runner.ts`** — connects assignment state to worker CLIs.
- **`mcp.ts` and `cli.ts`** — the two front doors.

Where state is stored can be changed with `AGENT_GRAPH_STATE_DIR`. By default it is `.agent/state` inside the folder where the command runs.

---

## A full walkthrough example

Goal: “Make the device picker resizable.”

### Using the terminal

```bash
# 1) Create the job
npm run agentctl -- start ENG-4521 --type feature --summary "Make the device picker resizable"

# 2) Write what done means
npm run agentctl -- criteria ENG-4521 "The picker can be resized"

# 3) Move through early stages (after doing the real thinking/looking)
npm run agentctl -- advance ENG-4521 classify
npm run agentctl -- advance ENG-4521 context
npm run agentctl -- advance ENG-4521 outcome
npm run agentctl -- advance ENG-4521 plan
npm run agentctl -- advance ENG-4521 implement

# 4) Do the actual coding in your editor / AI tool
# 5) Move to verify and record a real check
npm run agentctl -- advance ENG-4521 verify
npm run agentctl -- verify ENG-4521 tests passed --details "npm test"

# 6) Review, deliver, complete
npm run agentctl -- advance ENG-4521 review
npm run agentctl -- review ENG-4521 "Reviewed the final diff; no blocking issues"
npm run agentctl -- advance ENG-4521 deliver
npm run agentctl -- deliver ENG-4521 "PR ready with tests and summary"
npm run agentctl -- advance ENG-4521 complete
```

### Using an AI coding app with MCP

You might say:

> Start assignment ENG-4521 as a feature. Add acceptance criteria. Advance through the workflow. Record verification after tests. Use Codex for an independent review.

The AI should call MCP tools instead of only chatting. You should still see `.agent/state/ENG-4521.json` update on disk.

### Using an optional worker

```bash
npm run agentctl -- run ENG-4521 opencode --cwd ../my-app
```

Meaning:

- keep Agent Graph tracking in this project
- ask OpenCode to work in the `../my-app` folder
- store a run record on the assignment when finished

---

## What version 0.2 does not do yet

This version is meant to be **local** and **auditable** (you can inspect every saved file).

It does **not** yet:

- host a website dashboard for you
- automatically open GitHub pull requests
- run as a remote always-on cloud workflow service

Those may come later. Today’s value is a clear process + shared state + MCP/CLI access on your machine.

---

## Set it up on your computer (step by step)

### Before you begin

1. Install **Node.js 20+** if needed.
2. Confirm:

```bash
node -v
npm -v
```

3. Get a copy of this project folder on your machine and open a terminal **inside that folder** (the folder that contains `package.json`).

Tip: in many terminals you can drag the folder onto the terminal window, or use `cd` (change directory) to move into it.

### Step 1 — Install project packages

```bash
npm install
```

This downloads the libraries listed in `package.json` into a local `node_modules` folder. It may take a minute. You usually commit `package-lock.json`, not `node_modules`.

### Step 2 — Make sure the project itself is healthy

```bash
npm run check
npm test
```

- `check` asks TypeScript to look for type mistakes
- `test` runs automated tests for the workflow engine

Both should finish without failing. If they fail, stop and fix that before trusting setup.

### Step 3 — See optional workers

```bash
npm run agentctl -- providers
```

Missing workers are okay. You can still track assignments.

### Step 4 — Create a practice assignment

```bash
npm run agentctl -- start DEMO-1 --type feature --summary "Try Agent Graph"
npm run agentctl -- criteria DEMO-1 "I can see the assignment status"
npm run agentctl -- status DEMO-1
```

Then look for:

```text
.agent/state/DEMO-1.json
```

If that file exists, the engine is writing state correctly.

### Step 5 — Connect an AI coding app (MCP)

1. Open **this** project in Claude Code, Codex, or another MCP-capable app.
2. When asked, approve / enable the server named `agent-graph`.
3. Ask the app to list assignments or show `DEMO-1`.
4. If it can see the same job, MCP is wired.

If tools do not appear:

1. In this project folder, run `npm run mcp` and check that it starts (it may look quiet; that can be normal for stdio servers).
2. Reload or re-approve MCP in the app.
3. Confirm you opened the Agent Graph folder itself, not only some other app folder.

### Useful scripts

| You type | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run check` | Typecheck the code |
| `npm test` | Run tests |
| `npm run agentctl -- …` | Use the Agent Graph CLI |
| `npm run mcp` | Start the MCP server |

---

## How to know you succeeded

Check these off:

1. `node -v` shows 20 or higher  
2. `npm install` finished  
3. `npm run check` passed  
4. `npm test` passed  
5. `DEMO-1.json` exists under `.agent/state/`  
6. Trying to advance past `outcome` without criteria fails (guards work)  
7. (Optional) Your AI app shows `agent-graph` tools and can read the same assignment  

---

## If you only remember five things

1. **Agent Graph tracks process; AI tools still write code.**  
2. **Assignments are JSON files under `.agent/state/`.**  
3. **Stages have rules; missing evidence blocks progress.**  
4. **`agentctl` and MCP are two ways to use the same engine.**  
5. **Batches exist so many tickets get planned, then finished one at a time.**  

---

## Where to go next

- Short technical overview and command cookbook: [README](../README.md)
- Setup checklist written for AI agents: [for-agents.md](./for-agents.md)
- Behavior rules for agents: [AGENTS.md](../AGENTS.md)
- Stage definitions: [`.agent/graph.yaml`](../.agent/graph.yaml)

If a sentence in this guide is still confusing, that is useful feedback: the docs should assume less, not more.
