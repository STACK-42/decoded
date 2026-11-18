# Building a Course

How Decoded courses get made, what you need before you start, how to improve a course in rounds, and prompts you can give a coding agent to do the work with you. You can follow the same steps by hand.

## What you need

- **A subject that is missing from the site.** Check the [course list](../README.md#courses) and the [open issues](https://github.com/STACK-42/decoded/issues) first.
- **Source material:** lecture notes, slides, a syllabus or a textbook chapter list. Put it in `_sources/<course-slug>/`, which git ignores.
- **Time to check the result.** You are responsible for the content being correct, whoever or whatever drafted it.
- **The project running locally.** [Fork the repository](https://github.com/STACK-42/decoded/fork) and clone your fork, then follow [development.md](development.md) for setup.
- **A public GitHub profile,** so the course page can credit you.

> [!WARNING]
> Never commit source files. They often contain teachers' names and emails, and the slides belong to whoever wrote them. Lessons should be written in your own words and name no institution or teacher.

## The steps

1. **Read all the source material.** Note what it teaches, and where it only lists a topic without explaining it.
2. **Set the scope.** Decide how many courses the material makes, and compare the topics with a recognized curriculum such as [ACM/IEEE CS2023](https://csed.acm.org/). Fill the gaps the curriculum expects.
3. **Cut what doesn't help someone learn.** History, product model numbers, prices and long reference lists usually go.
4. **Connect it to the rest of the site.** If another course already teaches a topic, link to that lesson instead of teaching it again. Put a topic in the course where it fits best, even if your class taught it elsewhere. Then follow [Linking between lessons](writing-lessons.md#linking-between-lessons) as you write.
5. **Plan the modules and lessons.** For each idea that is hard to picture, decide what the reader will click, step through or change to understand it.
6. **Build the simulations.** Put the logic in `src/lib/` with its own tests, then the interface in `src/components/mdx/<Topic>Visualizers.tsx`. Reuse `Stepper` and `Panel` where they fit.
7. **Write the lessons** by [writing-lessons.md](writing-lessons.md). End each module or the course with a `Quiz`.
8. **Check the facts.** Class notes contain mistakes. Work every example again and run every code sample instead of copying it. If a course shows code in more than one language, put each example in one `<CodeTabs>` with a block per language, and run them with `python3 scripts/check-code-samples.py`.
   Applications, such as where an idea shows up in machine learning or AI, belong in the explanation of the idea itself, not in a separate section at the end.
9. **Register the course.** See the checklist below.
10. **Verify it and open a pull request.** Say what you tested, and list any source errors you corrected.

## Writing the lessons

Every rule for the words inside a lesson (voice, plain language, lesson shape, callouts, visuals, code and linking between lessons) is in [writing-lessons.md](writing-lessons.md). Read it before step 7.

## Registration checklist

- [ ] One `lazy()` import per lesson in `src/content/registry.ts`, and a course entry with `slug`, `title`, `tagline`, `description`, `accent`, `status`, `authors` and `modules`
- [ ] Quiz and lab lessons marked with `kind: "quiz"` or `kind: "practical"`
- [ ] Each lesson's `#` heading matches its `title` in the registry
- [ ] Your entry in `src/content/authors.ts`, with an `email` if you want a public contact address. Ask the maintainer for a `you@csdecod.ing` address that forwards to your own inbox, so you never publish a personal one (it is an Email Routing rule in the Cloudflare dashboard, nothing in the code)
- [ ] A course icon in `src/components/brand/Glyphs.tsx`
- [ ] Learning paths and prerequisites in `src/content/paths.ts`, and any real tools in `src/content/tools.ts`
- [ ] A row in the README's course table
- [ ] A test that renders every lesson, modeled on `src/test/hardware-courses.test.tsx`. Links are checked site-wide by `src/test/lesson-links.test.ts`.

## Before you open the pull request

- [ ] `npm run lint`, `npm run test` and `npm run build` all pass
- [ ] You opened every lesson in a browser at phone width and nothing overflows or crashes
- [ ] You used every simulation by hand, in light and dark themes
- [ ] You worked through the quizzes and agree with the answers
- [ ] Every idea a lesson uses but doesn't explain links to the lesson that does, and older lessons that use your new ideas link to them
- [ ] No source files, teacher names or institution names are in the diff

## Build in iterations

A course is never finished in one pass. Treat the first build as a skeleton and improve it in rounds, each with one job.

This matters most when an agent does the writing. An agent is trained to finish the task it was given, and a whole course is a big task. It spreads its attention over twenty lessons, and the result is complete but thin. Every lesson exists and the tests pass, but details a student needs get flattened: terms the notes use differently, examples that weren't worked through, ideas that were only named. Those checks measure "the course exists", not "a student understands it", and an agent aiming for the checks stops there. Machine learning calls this specification gaming, or Goodhart's law: once a measure becomes the target, it stops being a good measure.

Three rules keep the rounds honest:

- **One iteration per session, on a small scope.** Run each round on one module, or even one lesson, not the whole course. A smaller task gets more attention per lesson.
- **Review in a fresh session.** The session that built something is invested in it being done. Start a new one for every review round, and tell it to look for problems, not to confirm the work is good.
- **Name the bar before the round starts.** Each iteration below has its own definition of done. Hold the agent to that, not to "the tests pass".

> [!IMPORTANT]
> Every iteration ends with a report: what changed, what it found but didn't fix, and what it couldn't check. Read it before starting the next round. The things that slip through usually show up as one line in that report.

### The iterations

| # | Iteration | Scope | Done when |
| --- | --- | --- | --- |
| 1 | **Skeleton** | whole course | Every lesson exists, the course is registered, every hard idea has one visualization, and lint, tests and build pass. It is allowed to be thin. |
| 2 | **Source fidelity** | one module | Every topic, term, worked example and exercise in the notes is covered. Where the notes use a different name for something, the lesson gives both names. Source errors are listed and corrected. |
| 3 | **Depth** | one module | Every term is defined in plain words before it's used, every example is worked step by step, and each lesson names the mistake students usually make. |
| 4 | **Plain language** | one module | The lessons meet [Plain language](writing-lessons.md#plain-language) and [Never](writing-lessons.md#never) in writing-lessons.md, and the text has been through the humanizer. |
| 5 | **Visualizations** | one module | Every idea that's still only text has been judged: does a reader need something to drag or step through? Every visualization works at phone width, in light and dark themes, and with reduced motion. |
| 6 | **Practice** | one module | The quiz covers every lesson and asks the kinds of questions the source's exams ask. Hand calculations have answers to check against. |
| 7 | **Connections** | whole course | Every idea used but not taught links to the lesson that teaches it, older lessons link back, and paths, prerequisites and tools are set. |
| 8 | **Student read-through** | one module | A fresh session reads each lesson as a student meeting the subject for the first time and lists every place it got confused, stuck or bored. A separate session then fixes that list. |
| 9 | **Real readers** | whole course | People studying the subject use the course and report what didn't work. This is the round that can't be gamed, so it outranks all the others. |

Run them in order the first time. After that, run whichever round the latest feedback points at.

### Tracking the rounds

Each course has one GitHub issue that tracks its rounds, labelled [`course-iteration`](https://github.com/STACK-42/decoded/issues?q=label%3Acourse-iteration), with a checklist of every round and, for the per-module rounds, every module. [#56](https://github.com/STACK-42/decoded/issues/56) is the one for Computer Graphics; copy it for a new course.

- **Open it right after the skeleton,** with round 1 ticked.
- **Post each round's report as a comment** on the issue, so what was found but not fixed isn't lost in a chat.
- **Say `Part of #N` in each round's commits or pull request,** and tick the box when the round's bar is met. The change that finishes the last round says `Fixes #N`.
- **See where every course stands** with `gh issue list --label course-iteration`.
- **Update the course's `rounds` in `src/content/registry.ts`** when a round is finished for every module. It counts rounds in order, so a round done for only some modules doesn't count yet. Readers see it as a maturity badge on the course card and page: First draft (rounds 1–2), Checked (3–5), Polished (6–7), Refined (8) and Student-tested (9). The wording they see, in `src/lib/maturity.ts`, describes what the course has been through without the round names.

Some rounds a course may also need:

- **Exam preparation:** practice problems in the style of past exams, with full worked solutions.
- **Projects:** a practical lesson where the reader builds something real with the course's ideas, like the [Signals From Zero project](https://csdecod.ing/courses/computational-mathematics/sound-and-sampling).
- **Real-world material:** real images, real recordings or real data in place of drawn examples.
- **Accessibility:** keyboard use, screen-reader labels and color contrast for every visualization.

## Prompts

Fill in the brackets, then paste a prompt into a coding agent such as Claude Code, started from the root of the repository. Start a new session for each one.

### Iteration 1: the skeleton

```text
This is iteration 1 of building a course, the skeleton, as described in
"Build in iterations" in docs/building-a-course.md. Later iterations will deepen
it, so aim for complete and correct, not polished.

Build a new Decoded course on [SUBJECT]. My source material is in
_sources/[COURSE-SLUG]/. The readers are [WHO THEY ARE AND WHAT THEY ALREADY
KNOW]. Credit the course to [NAME] (github.com/[USERNAME]).

Before planning, read CLAUDE.md, docs/building-a-course.md and
docs/writing-lessons.md.
Then read these as the standard to match:
- src/content/logic-design/m4-01-sr-latch.mdx
- src/components/mdx/CircuitVisualizers.tsx
- src/lib/logic.ts and src/test/logic.test.ts

Follow the steps in docs/building-a-course.md, and:

1. Read all of my source material, then tell me how many courses it should
   become and how they map to a recognized curriculum such as ACM/IEEE CS2023.
   Show me the module and lesson plan, and wait for my approval before writing
   lessons.
2. Remove anything that doesn't help someone learn the subject, such as history
   and product trivia. Tell me what you cut.
3. Search src/content/ for topics the site already covers. Link to those lessons
   instead of teaching them again. Whenever a lesson uses an idea it doesn't
   explain, link its first use to the lesson (and #section) that does, in this
   course or another, following "Linking between lessons" in
   docs/writing-lessons.md. Also link older lessons to the new ones where
   they use these ideas.
4. Make visualizations the center of the course. Wherever a static slide would
   leave someone unable to picture what's happening, build something they can
   step through or change. Keep the logic in src/lib/ with tests.
5. Write every lesson by docs/writing-lessons.md: simple language, your own
   words, plain terms before notation, and the real tools each idea powers.
6. Treat the sources as possibly wrong. Recalculate every example and check every
   code sample. Keep a list of the errors you find. Where the sources only
   outline a topic, use a standard textbook and tell me which lessons you wrote
   that way.
7. Never commit anything from _sources/, and don't name any institution or
   teacher in the lessons.
8. Complete the registration checklist. Then run lint, tests and the build, and
   open every lesson at phone width in a browser. Fix what you find.

When you finish, report what you built, what you decided and why, the source
errors you found, and anything you couldn't verify. Then suggest which later
iteration each module needs most, and why. Push directly when done.
```

### Iterations 2 to 8

Use this frame for every later round, with the round's own instructions in the middle.

```text
This is iteration [NUMBER], [NAME], of the [COURSE] course, as described in
"Build in iterations" in docs/building-a-course.md. Read that section first.
Work only on [MODULE OR LESSONS]. The source material is in _sources/[SLUG]/.

You did not build this course. Your job is to find what is missing or wrong,
not to confirm it is good. Assume there are problems until you have looked.

[THE ROUND'S INSTRUCTIONS, BELOW]

Fix what you find, following docs/writing-lessons.md and CLAUDE.md. Run
lint, tests and the build. End with a report: what you changed, what you found
but didn't fix, what you couldn't check, and which iteration this module
needs next. Commit and push directly.
```

The middle part for each round:

- **2, Source fidelity:** "Go through the source section by section. For each topic, term, worked example and exercise, say where the course covers it. Where the source calls something by a different name than the course does, give both names in the lesson. Rework every example the source works, and list each source error you find."
- **3, Depth:** "Read each lesson as if you'd never met the subject. Find every term used before it's defined, every step skipped in an example and every claim with no reason given. Add the missing definitions, steps and reasons, and add the mistake students usually make on each idea."
- **4, Plain language:** "Find jargon, long sentences and words a non-native English speaker would struggle with. Use the simplest word that is still accurate, and keep a technical term only when it is the right name, explained the first time. Check every rule under Plain language and Never in docs/writing-lessons.md. Then run the prose through the humanizer skill."
- **5, Visualizations:** "List every idea that is still only explained in text, and decide for each whether a reader needs something to drag, click or step through. Build the ones that do, with logic and tests in src/lib/. Then check every visualization in a browser at phone width, in light and dark themes, and with reduced motion."
- **6, Practice:** "Check the quiz covers every lesson. Add questions in the style of the source's exams and exercises, including hand calculations, and make sure each explanation says why the wrong answers are wrong."
- **7, Connections:** "Find every idea a lesson uses but doesn't teach, and link it to the lesson that does, in this course or another. Search the other courses for places that should link to this one. Check the learning paths, prerequisites and tools entries."
- **8, Student read-through:** "Don't fix anything. Read each lesson in order as a student meeting the subject for the first time, who has only the earlier lessons. List every place you were confused, stuck, bored or unsure what to do, quoting the sentence. A separate session will fix the list."
