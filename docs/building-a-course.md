# Building a Course

How Decoded courses get made, what you need before you start, and a prompt you can give a coding agent to do the work with you. You can follow the same steps by hand.

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
4. **Connect it to the rest of the site.** If another course already teaches a topic, link to that lesson instead of teaching it again. Put a topic in the course where it fits best, even if your class taught it elsewhere.
5. **Plan the modules and lessons.** For each idea that is hard to picture, decide what the reader will click, step through or change to understand it.
6. **Build the simulations.** Put the logic in `src/lib/` with its own tests, then the interface in `src/components/mdx/<Topic>Visualizers.tsx`. Reuse `Stepper` and `Panel` where they fit.
7. **Write the lessons.** Use plain language, start from something the reader already knows, and name the real tools each idea powers. End each module or the course with a `Quiz`.
8. **Check the facts.** Class notes contain mistakes. Work every example again and run every code sample instead of copying it.
9. **Register the course.** See the checklist below.
10. **Verify it and open a pull request.** Say what you tested, and list any source errors you corrected.

## Registration checklist

- [ ] One `lazy()` import per lesson in `src/content/registry.ts`, and a course entry with `slug`, `title`, `tagline`, `description`, `accent`, `status`, `number`, `authors` and `modules`
- [ ] Quiz and lab lessons marked with `kind: "quiz"` or `kind: "practical"`
- [ ] Each lesson's `#` heading matches its `title` in the registry
- [ ] Your entry in `src/content/authors.ts`
- [ ] A course icon in `src/components/brand/Glyphs.tsx`
- [ ] Learning paths and prerequisites in `src/content/paths.ts`, and any real tools in `src/content/tools.ts`
- [ ] A row in the README's course table
- [ ] A test that renders every lesson and checks its links, modeled on `src/test/hardware-courses.test.tsx`

## Before you open the pull request

- [ ] `npm run lint`, `npm run test` and `npm run build` all pass
- [ ] You opened every lesson in a browser at phone width and nothing overflows or crashes
- [ ] You used every simulation by hand, in light and dark themes
- [ ] You worked through the quizzes and agree with the answers
- [ ] No source files, teacher names or institution names are in the diff

## The prompt

Fill in the brackets, then paste this into a coding agent such as Claude Code, started from the root of the repository.

```text
Build a new Decoded course on [SUBJECT]. My source material is in
_sources/[COURSE-SLUG]/. The readers are [WHO THEY ARE AND WHAT THEY ALREADY
KNOW]. Credit the course to [NAME] (github.com/[USERNAME]).

Before planning, read CLAUDE.md, docs/brand.md and docs/building-a-course.md.
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
   instead of teaching them again.
4. Make visualizations the center of the course. Wherever a static slide would
   leave someone unable to picture what's happening, build something they can
   step through or change. Keep the logic in src/lib/ with tests.
5. Write in simple language and your own words. Introduce an idea in plain terms
   before its notation, and name the real tools it powers. Never copy passages
   from the sources.
6. Treat the sources as possibly wrong. Recalculate every example and check every
   code sample. Keep a list of the errors you find. Where the sources only
   outline a topic, use a standard textbook and tell me which lessons you wrote
   that way.
7. Never commit anything from _sources/, and don't name any institution or
   teacher in the lessons.
8. Complete the registration checklist. Then run lint, tests and the build, and
   open every lesson at phone width in a browser. Fix what you find.

When you finish, report what you built, what you decided and why, the source
errors you found, and anything you couldn't verify. Don't push or open a pull
request until I've reviewed the result and asked you to.
```
