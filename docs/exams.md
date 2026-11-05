# Exams

How Decoded helps students prepare for exams, and the plan for building it. The scheduled runs build this one phase at a time (see `docs/autopilot.md`); this file is the design they follow. Edit it to change the plan.

## Why

Decoded started as one student's study notes, and more people now use it. Students come back to a study site for **practice**, especially in the weeks before an exam, more than for reading. Today each module ends with one quiz of 6 to 14 questions, taken once, and Operating Systems and Advanced Algorithms, two of the largest courses, have no quiz at all.

The design rests on four findings from learning research. The Exam Mind course already teaches them, so the site should practise what it teaches:

| Finding | What it means here |
| --- | --- |
| **Testing effect** (retrieval practice): recalling an answer strengthens memory more than re-reading it | Lots of questions, available whenever you want them |
| **Spacing effect**: reviews spread over days beat the same reviews crammed together | A review queue that brings questions back after growing gaps |
| **Interleaving**: mixing topics in one session beats practising one topic at a time | Exams and reviews mix questions across modules and courses |
| **Feedback**: an explanation right after a mistake corrects it | Every question has an explanation and links to the lesson section that teaches it |

## What students get

1. **Module quizzes**, as today, but drawing on a bigger bank.
2. **Course exams** at `/courses/<course>/exam`: questions from every module of the course, mixed, with an optional timer and no feedback until you submit, like a real exam. Afterwards you get a score per module, every wrong answer with its explanation, and a link to the lesson to re-read. Each attempt draws a fresh mix, and answer options are shuffled.
3. **A review queue** at `/review`, shown on the Dashboard as "N questions due". Every question you answer anywhere (quiz, exam or review) becomes a card. Getting it wrong brings it back tomorrow; getting it right pushes it further out.
4. **Generated questions** for topics with numbers in them (subnets, scheduling, Big-O, Lamport clocks, quorums...). The question is built from the same logic that drives the lesson's visualizer, with fresh numbers each time, so it can't be memorised.

## Design decisions

### Questions are data, not lesson text

Questions live in one typed bank per course, `src/content/<course>/questions.ts`, with the type in `src/lib/questions.ts`:

```ts
export type Question = {
  id: string;            // stable and unique site-wide: "<course>/<lesson-or-quiz>/<short-name>"; never reuse or rename one, review history is keyed by it
  quiz?: string;         // slug of the module quiz it appears in, if any
  lesson?: string;       // slug of the lesson that teaches it, for "re-read this"
  section?: string;      // heading id in that lesson, when one section teaches it
  prompt: string;        // markdown, with $math$ allowed
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;   // required: why the right answer is right
  difficulty?: 1 | 2 | 3;
};
```

A module quiz shows the questions whose `quiz` is its slug (`questionsForQuiz(questions, "<slug>")`), so a quiz file no longer holds questions.

The 259 questions that existed before the bank keep their wording and have ids `<course>/<quiz-slug>/q<n>` (for example `computer-networks/foundations-quiz/q1`). For them only the quiz is known, not the lesson that teaches each one, so their `lesson` is empty until it's filled in by hand (phase 4). New questions should always set `lesson`, and `section` where one heading teaches the idea. Tests check that ids are unique site-wide, that every `lesson` and `section` exists, and that every course with lessons has questions.

Generated questions implement the same shape from a function and a seed:

```ts
export type QuestionGenerator = { id: string; lesson: string; section?: string; generate: (seed: number) => Question };
```

The generator calls the course's `src/lib` logic for the right answer and builds the wrong options from typical mistakes (an off-by-one, the inverse formula), not random numbers. Its tests check, over many seeds, that options are distinct and exactly one is correct.

### Exams

- Length: 20 questions by default (or the whole bank if smaller), spread across modules in proportion to their lesson count, with at least one per module.
- Timer: off by default; "exam conditions" turns on 90 seconds per question. The timer is advice: when it runs out, the exam is submitted.
- An attempt is saved (score, time taken, date, whether exam conditions were on; the last 20 per course) so the exam and course pages can show "best" and "last".
- Questions without a `lesson` (the migrated ones) link "Review this module" and "Re-read" to the first lesson of their quiz's module, until phase 4 gives them a lesson.

### Review: a Leitner system

Each card sits in one of five boxes. Box 1 is due 1 day after an answer, box 2 after 2 days, then 4, 8 and 16. A right answer moves the card up a box (box 5 stays at 16 days); a wrong answer sends it back to box 1. Cards due today come first (most overdue first); a session is at most 20 cards, in a mixed order, with the answer shown right after each one.

Details settled while building it (`src/lib/review.ts`):
- A new card answered right goes straight to box 2; answered wrong, box 1.
- A wrong answer resets a card to box 1 whenever it happens, even before it's due.
- A right answer before the card is due changes nothing, so retaking a quiz the same day can't push cards out to 16 days.
- Every answer counts, from module quizzes, exams (unanswered counts as wrong) and review sessions. Cards whose question has been removed from the bank are dropped when a session starts.
- Due dates are the reader's local calendar days. The header shows "Review" with a count only when something is due; the Dashboard shows a review panel once there are any cards.
- The progress export/import (`src/lib/progressBackup.ts`) covers completed lessons only, not review cards or exam attempts; phase 6 (account sync) should decide whether backups carry them too. This is the classic Leitner system: simple to explain, simple to test, and close enough to the much more complex algorithms in apps like Anki for a study site.

### Storage and accounts

Review cards and exam attempts are stored in `localStorage` (`decoded:review:v1`, `decoded:exams:v1`), the same way progress works now, and announced with the same `decoded:progress` event. Syncing them to the account (the Worker in `worker/`) is the last phase, once the format has settled.

### Accessibility and phones

Exams must work at 390 px wide, in both themes, and with a keyboard only (number keys pick an option; Enter goes to the next question). The timer is announced to screen readers without interrupting them.

## Phases

Each phase is one scheduled run and one pull request. If the previous phase's PR isn't merged yet, the next phase branches from it and opens its PR against that branch (stacked PRs), so the owner can review them in order.

1. **Question bank.** Add the `Question` type and per-course `questions.ts`, move all 259 existing quiz questions into them (by script, unchanged wording, ids derived from the quiz and question), and change the quiz `.mdx` files to read from the bank. No visible change. Tests: ids unique, links valid, every old quiz still renders the same questions.
2. **Course exam page.** `/courses/<course>/exam`, exam conditions toggle, results with per-module scores and links back to lessons, attempt history; an "Exam" entry on each course page.
3. **Review queue.** Leitner storage, `/review` session page, "N due" on the Dashboard, and quizzes and exams feeding cards in.
4. **Fill the gaps.** (Operating Systems has no module quizzes, so its bank feeds exams and review only; adding quiz lessons that draw on it is a possible follow-up.) Question banks for Operating Systems and Advanced Algorithms (none today), then bring every course up to at least 4 questions per lesson it teaches, starting with the courses that have the most traffic.
5. **Generated questions.** Start with Computer Networks (subnets), Operating Systems (scheduling) and Algorithm Design (Big-O), reusing their `src/lib` logic.
6. **Account sync.** Review cards and exam attempts follow a signed-in user between devices, merged the same way progress is.

## Quality bar for questions

- One clearly right answer. Wrong options are mistakes a real student makes, not jokes.
- The explanation says why the right answer is right **and** why the tempting wrong one is wrong.
- Work every number again; run any code in a question.
- Test understanding, not wording: no "which of these is mentioned in the lesson".
- Mix the position of the right answer.
