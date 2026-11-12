# Autopilot

Instructions and memory for the scheduled Claude Code runs that work on Decoded without a person watching. Each run starts in a fresh session with no memory of earlier runs, so **this file is the memory**. Read it first and update it last.

Owner: Ahmed Alghali ([a7med7x7](https://github.com/a7med7x7)). Edit this file to steer the runs: reorder the queues, add tasks, or change the rules below.

## Schedule

Times are Qatar time (UTC+3).

| Run | Time | Job |
| --- | --- | --- |
| A | 06:10 | **Exam work:** the next phase in the exam queue |
| B | 10:40 | **Exam work:** the next phase in the exam queue |
| C | 14:50 | **Quality work:** the top item in the quality queue |

If the job's queue is empty, take the top item in the other queue. If both are empty, log that and stop.

## Merge policy

- **2026-11-02 (day 1):** the run merges its own pull request once CI passes.
- **From 2026-11-03:** open the pull request and leave it for the owner to review and merge. Don't merge.
- **Exam phases stack.** If the previous phase's PR isn't merged yet, branch from its branch and open the new PR against it, saying so in the PR description, so the owner can review them in order.
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
   If CI fails in the "Setup Bun" step with a 403, that's issue #37 (fixed by PR #51 once merged) and not your code. Re-run the job once.
7. **Branches:** `autopilot/exams-<phase-number>-<short-name>` for an exam phase, and `autopilot/<short-task-name>` for anything else.
8. **Finish by updating this file** on your branch: tick off what you did, add anything new you noticed to the quality queue, and add a line to the run log.

## Exam queue

The owner's priority since 2026-11-03: proper exam practice. The design, decisions and phases are in [`docs/exams.md`](exams.md); follow it, and update it if a phase teaches you something that changes the plan. One phase per run.

- [x] 1. Question bank: move the 259 quiz questions into per-course `questions.ts`, quizzes read from it, no visible change. (PR #53)
- [x] 2. Course exam page at `/courses/<course>/exam`. (PR #58, stacked on #53)
- [x] 3. Review queue (Leitner) at `/review`, with "N due" on the Dashboard. (PR #59, stacked on #58)
- [ ] 4. Question banks for Operating Systems and Advanced Algorithms, then at least 4 questions per taught lesson everywhere. Also set `lesson` (and `section`) on the 259 migrated questions, which only know their quiz. Split into runs:
  - [x] 4a. Operating Systems bank: 67 questions, every one with `lesson` and `section`. (PR #62, stacked on #59)
  - [x] 4b. Advanced Algorithms bank: 80 questions across all 24 lessons, each with `lesson` and `section`. (PR #63, stacked on #62)
  - [ ] 4c. Bring other courses up to 4 questions per taught lesson. Gap measured 2026-11-06 (taught lessons × 4 − questions): Computational Mathematics 64, Logic Design 48, Computer Architecture 44, Computer Graphics 32, Theory of Computation 26, Computer Organization 26, Discrete Mathematics 26, Data Structures 20, Microprocessors 18, Computer Networks 9. **Algorithm Design (28) is left to the owner**, whose issue #60 round 6 ("Practice") covers it. One or two courses per run, biggest gap first:
    - [x] Computer Literacy (12) and The Exam Mind (20), which had none, so their exams were empty. (PR #66, stacked on #63)
    - [x] Computational Mathematics: +63 (28 → 91), every lesson including the Signals project, each with `lesson` and `section`. (PR #67, stacked on #66)
  - [ ] 4d. Set `lesson`/`section` on the 259 migrated questions.
- [ ] 5. Generated questions (subnets, scheduling, Big-O first).
- [ ] 6. Account sync for review cards and exam attempts.

## Parked

- **New courses** are on hold until the exam work is done.
- **Distributed Systems:** modules 1 and 2 (9 lessons) are complete on branch `autopilot/course-distributed-systems`; PR #49 is closed, not merged. The plan for modules 3 and 4 is in `docs/autopilot.md` on that branch. Reopen #49 to continue or to ship the two finished modules.

## Quality queue

Linking, broken visualizations, and rework of anything that isn't good enough. Top item first.

1. ~~**Issue #42, linking: Algorithm Design and Analysis ↔ Advanced Algorithms.** Five topics are taught in both with zero links between them. Link each pair both ways (pairs are listed in the issue).~~ Done before this queue was written; checked 2026-11-02: both directions linked, and every non-quiz lesson in these courses has links.
2. ~~**Issue #42, linking: Operating Systems ↔ Computer Architecture and Computer Organization** (virtual memory, paging, memory hierarchy).~~ Done before this queue was written; checked 2026-11-02: both directions linked, and every non-quiz lesson in these courses has links.
3. ~~**Issue #42, linking: Theory of Computation.** Zero links out across 14 lessons.~~ Done before this queue was written; checked 2026-11-02: 65 links out, in every lesson except the two quizzes.
4. ~~**Issue #42, linking: Operating Systems.** Zero links out across 17 lessons.~~ Done before this queue was written; checked 2026-11-02: 72 links out, in all 17 lessons.
5. ~~**Issue #38:** README course table.~~ Done 2026-11-02 (run C): Operating Systems row added, Advanced Algorithms count fixed (24, not 25); every other row matches `registry.ts`.
6. **Visualizer audit.** Open every visualizer at phone width in light and dark themes (Playwright is installed) and log anything broken, cramped or confusing as its own item here. Fix the worst one in the same run.
7. ~~**Issue #37:** pin the Bun version.~~ PR #51 (pinned to 1.4.4), waiting for review.
8. **Issue #42, the rest:** Advanced Algorithms, Algorithm Design and Analysis, Computer Literacy, The Exam Mind, then the generic-preview fixes (bold definitions) in the courses marked "previews only".

## Blocked

- **Exam phases (runs A and B), since 2026-11-06.** Main merged #68 (Asmaa): a `practice` mode for `Quiz` plus ~40 practice questions written inline in Advanced Algorithms lessons. Rebasing the exam stack onto it will conflict in `Quiz` (#59 records review answers there), fail #53's "no inline questions" test, and leave Advanced Algorithms with two disconnected question sets (her inline ones and #63's bank). The owner was asked to choose: (A) move practice questions into the bank with a `practice` flag, (B) keep both and exempt practice quizzes, or (C) agree a design with Asmaa first. Until then, exam runs record this and stop instead of stacking more phases on a base that will need reworking.

## Run log

Newest first. One line per run: date and run, what was done, PR link, merged or open.

- 2026-11-12 06:10 (run A): still blocked, nothing stacked. Asmaa's #77 (merged 2026-11-11) added exam practice to the Operating Systems lessons inline, one more course where quizzes now grow in the `.mdx` files and overlap this stack (#62's Operating Systems bank).
- 2026-11-11 10:40 (run B), also covering the 7 exam runs queued 2026-11-08 to 2026-11-11: still blocked on the owner's A/B/C choice for #68, nothing stacked. New since the block: the owner's Computational Mathematics rounds (#72, round 6) grew the four module quizzes inline from 6-8 to 20-22 questions each, and #75 is doing the same for Logic Design, so quizzes are being expanded in the `.mdx` files, not in banks. That overlaps #67's 63 new questions and makes the phase 1 migration (#53) larger each time it is rebased. The exam plan needs the owner's call before more phases: keep quizzes in the lessons (exam pages read them from there) or move them into banks.
- 2026-11-07 10:40 (run B): still blocked (see Blocked); no reply or merges since run A. No new phase.
- 2026-11-07 06:10 (run A): blocked, no new phase. Waiting for the owner's decision on integrating #68's practice questions with the exam stack (see Blocked). Nothing merged since 2026-11-02; main has moved on (#70).
- 2026-11-06 10:40 (run B): exam phase 4c, Computational Mathematics +63 questions (matrices, polynomials, number theory, cryptography and the Signals project; every number worked by script, answer positions balanced, 16 answers re-checked after balancing). PR #67 (stacked on #66), open.
- 2026-11-06 06:10 (run A): first rebased the whole exam stack (#53 → #63) onto main, which had changed the Algorithm Design sorting quiz; regenerated the 11 migrated banks from main's quiz files (only that quiz differed) and checked them equal. Then exam phase 4c, part 1: question banks for Computer Literacy (12) and The Exam Mind (20); every available course now has an exam. PR #66 (stacked on #63), open.
- 2026-11-05 10:40 (run B): exam phase 4b, Advanced Algorithms question bank (80 questions; master method, hashing and probing, red-black trees, DP, greedy and NP worked by script with fresh inputs, every claim checked against its lesson). Every course with quizzes or a bank now has an exam except Computer Literacy and The Exam Mind. PR #63 (stacked on #62), open.
- 2026-11-05 06:10 (run A): exam phase 4a, Operating Systems question bank (67 questions across all 17 lessons, calculation answers worked by script, every claim checked against its lesson; new test that every `section` is a real heading). The OS exam now works. PR #62 (stacked on #59), open.
- 2026-11-04 10:40 (run B): exam phase 3, the review queue (Leitner boxes 1/2/4/8/16 days in `src/lib/review.ts`, `/review` with instant feedback and interleaved courses, quizzes and exams feed it, header "Review" badge when due, Dashboard panel). Noted that main already gained three of the Algorithm Design animations proposed on 2026-11-04 (stability, greedy coins 1/3/4, linear search best/worst). PR #59 (stacked on #58), open.
- 2026-11-04 06:10 (run A): exam phase 2, the course exam page (20 mixed questions allocated by module size, shuffled options, optional 90 s/question timer, per-module results, missed questions with explanations and links back, attempts saved; "Take a course exam" on course pages). First rebased #53 onto main, where a graphics quiz option had been reworded, and re-checked the bank against main. PR #58 (stacked on #53), open.
- 2026-11-03 10:40 (run B): exam phase 1, question bank. 259 questions moved unchanged into 11 `questions.ts` banks (checked identical to the originals), 33 quizzes read from them, search index now includes quiz text from the banks, 6 new tests. PR #53, open.
- 2026-11-03 (owner request): new direction. Distributed Systems parked (#49 closed, branch kept; M2 had been added by run A that morning). Bun pinned (#51, open). Exam plan written in `docs/exams.md` and queued here (#52, open). Runs A and B switched from course work to exam work.
- 2026-11-02 14:50 (run C): quality items 1-4 were already done on main (issue #42's checklist is stale), so took item 5: README course table (#38). PR #50, merged.
- 2026-11-02 01:10 (setup): wrote this file. Baseline: 2,104 tests pass, lint 0 errors, CI green on `main` (82faa87).
