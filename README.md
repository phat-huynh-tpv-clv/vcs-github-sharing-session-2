# Version Control Sharing & Git — Session 2

Open **Git-Session-2.html** in Chrome, Edge, Safari, or Firefox. It is a self-contained file: no server, npm, Internet connection, or real repository is required. Share this single file with your team.

## Running the demo

1. Select a lesson in the left catalog. The 14 lessons follow the source document; item 15 is the playground.
2. Ask the team: “Where does HEAD point? Which branch will move? Will this create a new commit?”
3. Click **Run next step** to immediately execute the next demo command. Watch its output, HEAD, the graph, and **What just happened** update together. The console remains available for custom commands using **Run** or Enter. Failed commands stay on the same step, except for the intentional rejection in lesson 13.
4. Click **Back** to restore the state before the previous action. **↺** restarts the lesson.
5. **Just executed** marks the last command that ran; **Up next** names the next guided command. A compact output appears beside **What just happened**, while the complete console stays below. New commits have a yellow ring and NEW label; moved refs are orange. Click a commit to inspect its message, parents, and snapshot. **Fit graph** fits the history into the panel; **⛶** expands the graph. **Go to HEAD** returns to actual size and centers the current commit. Unreachable commits have dashed outlines to help explain recovery.
6. Click **Present** to hide the catalog and enlarge commands, graph labels, explanations, and state details. When an input or button is not focused, → runs the next demo step and ← goes back. Press Enter in the command input to execute. Escape closes the expanded graph or exits presentation mode.
7. For conflicts, run the prepared resolution or edit the result directly in the BASE / OURS / THEIRS editor. Save, run `git add`, and complete the operation.
8. In the playground, click an example to place it in the console, or enter a supported command. Type `help` for syntax and limits.

Selecting a different lesson creates a fresh repository for that lesson. Reloading the page discards simulated changes. The Back button is a teaching-tool feature, not a Git command.

## Presenter questions

Yellow **Quick question** cards appear inside **What just happened** at relevant demo steps. Ask the team before opening **Reveal answer / presenter note**. Lesson 6 introduces “What does git diff compare?” after staging a file, then demonstrates an empty diff and the differences between `git diff`, `git diff --staged`, and `git diff HEAD`.

When adding audience questions, place them at the most relevant point in the existing flow, keep the English wording, and use the same yellow question card with an optional concealed answer. Step data supports a `question` object with `prompt` and `answer` fields.

## Modern commands, familiar equivalents

Lesson 2, **Branch, switch & HEAD**, uses `switch`, `switch -c`, `switch --detach`, and `restore` in the guided demo. The comparison table and step explanations connect these commands to familiar `checkout` equivalents. Encourage the team to choose explicit commands after predicting their effects: `branch` creates a pointer, `switch` changes the checked-out position, and `restore` changes file contents. `checkout` remains valid and is supported in the playground.

## Suggested session flow (45–60 minutes)

- 5–10 minutes: recap and HEAD/branch/commit. Emphasize that a commit is a snapshot and a branch is a pointer.
- 15 minutes: fast-forward, three-way merge, conflicts, and rebase. Pause before commands and ask the team to predict the outcome.
- 10 minutes: restore/amend, reset/revert, stash, cherry-pick, and reflog.
- 10–15 minutes: the GitHub workflow and the two-developer router exercise.
- 5–10 minutes: common mistakes, key takeaways, and hands-on exploration in the playground.

In lesson 13, `merge --ff-only` intentionally fails to demonstrate diverged branches.

## How the model differs from real Git

- A, B, C… are illustrative commit IDs, not actual SHA hashes.
- The simulator supports the commands listed in `help`. It does not run a shell, read local files, call GitHub, or modify real repositories.
- `edit` simulates file editing. `lab teammate/pr/review/merge-pr` simulates teammate or GitHub actions; these are not Git commands.
- Merging performs a three-way comparison **per file**. Real Git can usually merge non-overlapping changes within the same file automatically. The lab does not simulate renames, binary files, authentication, hooks, garbage collection, multiple merge bases, or every Git option.
- `lab test` only checks for conflict markers. It does not execute Python, FastAPI, or pytest. Reviews and CI are demonstrations, not actual tests or approvals.
- The lab requires a clean working tree for switch/merge/rebase/cherry-pick. Real Git may allow some non-conflicting local changes.
- `git restore file` reads from the index by default. The source document describes this as the “current commit”; the demo clarifies what happens when the index differs from HEAD.
- Rebase supports linear commit sequences only. A conflicting operation pauses until you resolve it and use `--continue`, or cancel it with `--abort`.
- Stash application requires a clean working tree. A stash conflict reports an error and preserves the stash. `-u` and `--index` are not supported.
- The reflog is retained throughout the simulated session. In real Git, it is local, can expire, and cannot guarantee recovery of uncommitted data.
- In this lab, `pull` explicitly means fetch + merge. Real Git behavior depends on configuration and options.
- Force push is rejected by the simulator.

## Source and validation

- `dist/index.html`, `dist/style.css`, and `dist/app.js`: editable source files.
- `Git-Session-2.html`: the standalone sharing file. Rebuild it with `python3 build.py`.
- `node tests/simulator.cjs`: runs all guided scenarios and checks merge parentage, rebase/conflict/abort behavior, restore/reset, remote tracking, and detached HEAD.
- Preview the source with `python3 -m http.server 8765 --bind 127.0.0.1 --directory dist`.

Content source: `[ODS][Internal Sharing] - Version Control System(VCS) & GIT - Session 2 (1).md`, prepared by Noah (Phat) Huynh TPV. All interface text and teaching explanations are in English.

## Commit message convention

The demo uses `type(scope): describe the change`, with focused English subjects tied to the booking/customer examples. Types include `feat`, `fix`, `refactor`, `chore`, and `revert`. This is a team convention, not a Git requirement; custom playground messages remain unrestricted. The simulator uses typed merge/revert subjects for consistency, rather than the default messages generated by Git or GitHub. Rebase and cherry-pick preserve the original subject while creating new commit IDs.
