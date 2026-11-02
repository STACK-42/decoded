# Autopilot

Instructions and memory for the scheduled Claude Code runs that work on Decoded without a person watching. Each run starts in a fresh session with no memory of earlier runs, so **this file is the memory**. Read it first and update it last.

Owner: Ahmed Alghali ([a7med7x7](https://github.com/a7med7x7)). Edit this file to steer the runs: reorder the queues, add tasks, or change the rules below.

## Schedule

Times are Qatar time (UTC+3).

| Run | Time | Job |
| --- | --- | --- |
| A | 06:10 | **Course work:** the next step in the course queue |
| B | 10:40 | **Course work:** the next step in the course queue |
| C | 14:50 | **Quality work:** the top item in the quality queue |

If the job's queue is empty, take the top item in the other queue. If both are empty, log that and stop.

## Merge policy

- **2026-11-02 (day 1):** the run merges its own pull request once CI passes.
- **From 2026-11-03:** open the pull request and leave it for the owner to review and merge. Don't merge.
- A **course** pull request is merged only when the course is complete (every planned module is done). Until then, it stays a draft and each course run adds to the same branch.
- Never push straight to `main`. Never force-push a branch someone else has pushed to.

## Rules for every run

1. **One task per run.** Finish it, ship it, stop. Don't start a second task to fill time.
2. **Stop rule.** If the task is unclear, or tests still fail after two real attempts at a fix, stop. Commit any useful work to the branch, log what blocked you under "Blocked", and end the run.
3. **Follow the repo's own rules:** `CLAUDE.md`, `docs/building-a-course.md` (including "Linking between lessons") and `docs/brand.md`.
4. **Before opening or updating a pull request:** `npm run lint` (0 errors), `npm run test` and `npm run build` all pass.
5. **Facts must be right.** Work every example again and run every code sample. No source material is provided, so write from standard textbooks and recognized curricula (ACM/IEEE CS2023) in your own words.
6. **GitHub:** `gh pr ...` and `gh issue ...` fail in these sessions (GraphQL is blocked). Use the REST API through `gh api`, for example:
   - open: `gh api repos/STACK-42/decoded/pulls -f title=... -f head=<branch> -f base=main -f body=... -F draft=true`
   - merge: `gh api -X PUT repos/STACK-42/decoded/pulls/<n>/merge -f merge_method=merge`
   - CI: `gh api repos/STACK-42/decoded/commits/<sha>/check-runs`
   If CI fails in the "Setup Bun" step with a 403, that's issue #37 and not your code. Re-run the job once.
7. **Branches:** `autopilot/course-<slug>` for a course, and `autopilot/<short-task-name>` for anything else.
8. **Finish by updating this file** on your branch: tick off what you did, add anything new you noticed to the quality queue, and add a line to the run log.

## Course queue

Adding courses is the top priority. Build one course at a time, **one module per run**, on one branch with one draft pull request. The first run on a new course writes its module and lesson plan into this file (under the course) before writing lessons, then builds module 1. Credit new courses to Ahmed Alghali (`ahmedAlghali` in `src/content/authors.ts`) unless this file says otherwise.

1. **Distributed Systems** (`distributed-systems`), on branch `autopilot/course-distributed-systems`, draft PR #49. Logic in `src/lib/distributed.ts`, visualizers in `src/components/mdx/DistributedVisualizers.tsx`. Plan:
   - [x] **M1 Failure and Time:** `why-distributed-systems-are-hard` (partial failure, timeouts, idempotency keys, system models), `lamport-clocks` (clock skew, happened-before, Lamport clocks, total order), `vector-clocks` (vector clocks, comparison, conflict detection), `foundations-quiz`.
   - [ ] **M2 Replication and Consistency:** replication (leader/follower, sync vs async, replication lag), quorums (N, R, W and R + W > N; read repair), consistency models (linearizable, sequential, causal, eventual; read-your-writes), CAP and PACELC with a network partition you can cut and heal, quiz.
   - [ ] **M3 Consensus:** the consensus problem (agreement, majorities, FLP in plain words), Raft leader election (step-through election with terms and votes), Raft log replication (commit index, a follower catching up), Paxos in brief (how it maps to Raft), quiz.
   - [ ] **M4 Systems in Practice:** partitioning and consistent hashing (a hash ring you add nodes to), distributed transactions (two-phase commit and its blocking problem, sagas), microservices trade-offs (timeouts, retries with backoff, circuit breakers, linking back to idempotency in M1), final quiz.
   - When M4 is done: change the README row from "In progress" to "Available" with the final lesson count, add the course to a learning path in `src/content/paths.ts` and any tools to `src/content/tools.ts`, then mark the PR ready and merge per the merge policy.
2. **Compilers.** Lexing, parsing, ASTs, semantic analysis, intermediate code, optimization, code generation. Builds directly on Theory of Computation (regex → lexers, CFGs and PDAs → parsers), so link heavily.
3. **Databases.** Relational model, SQL, normalization, indexing (B-trees, hashing), transactions and isolation, query planning.
4. **Computer Security.** Threat models, memory safety, web security, authentication, applied cryptography. Link to the cryptography module in Computational Mathematics instead of re-teaching it.

## Quality queue

Linking, broken visualizations, and rework of anything that isn't good enough. Top item first.

1. ~~**Issue #42, linking: Algorithm Design and Analysis ↔ Advanced Algorithms.** Five topics are taught in both with zero links between them. Link each pair both ways (pairs are listed in the issue).~~ Done before this queue was written; checked 2026-11-02: both directions linked, and every non-quiz lesson in these courses has links.
2. ~~**Issue #42, linking: Operating Systems ↔ Computer Architecture and Computer Organization** (virtual memory, paging, memory hierarchy).~~ Done before this queue was written; checked 2026-11-02: both directions linked, and every non-quiz lesson in these courses has links.
3. ~~**Issue #42, linking: Theory of Computation.** Zero links out across 14 lessons.~~ Done before this queue was written; checked 2026-11-02: 65 links out, in every lesson except the two quizzes.
4. ~~**Issue #42, linking: Operating Systems.** Zero links out across 17 lessons.~~ Done before this queue was written; checked 2026-11-02: 72 links out, in all 17 lessons.
5. ~~**Issue #38:** README course table.~~ Done 2026-11-02 (run C): Operating Systems row added, Advanced Algorithms count fixed (24, not 25); every other row matches `registry.ts`.
6. **Visualizer audit.** Open every visualizer at phone width in light and dark themes (Playwright is installed) and log anything broken, cramped or confusing as its own item here. Fix the worst one in the same run.
7. **Issue #37:** pin the Bun version in `.github/workflows/ci.yml` and `deploy.yml` so a 403 on the "latest" download stops failing CI.
8. **Issue #42, the rest:** Advanced Algorithms, Algorithm Design and Analysis, Computer Literacy, The Exam Mind, then the generic-preview fixes (bold definitions) in the courses marked "previews only".

## Blocked

Nothing yet.

## Run log

Newest first. One line per run: date and run, what was done, PR link, merged or open.

- 2026-11-02 14:50 (run C): quality items 1-4 were already done on main (issue #42's checklist is stale), so took item 5: README course table (#38). PR #50, merged.
- 2026-11-02 10:40 (run B): Distributed Systems plan + M1 "Failure and Time" (3 lessons, 1 quiz, 4 visualizers, 14 logic tests; backlink from OS RPC section). Draft PR #49, open (course PRs merge when the course is complete). Run A at 06:10 did nothing: the scheduled sessions had no push access; rescheduled to run in the owner's session.
- 2026-11-02 01:10 (setup): wrote this file. Baseline: 2,104 tests pass, lint 0 errors, CI green on `main` (82faa87).
