import { flattenLessons, type Course, type Lesson } from "@/content/registry";
import type { ProgressMap } from "@/lib/progressBackup";
import type { LastLesson } from "@/lib/progressStore";

export type ContinueTarget = { course: Course; lesson: Lesson; started: boolean };

/**
 * Where to send a returning student: the lesson they last opened if it's
 * unfinished, or the next unfinished one after it. With no usable last lesson,
 * the first course they've started or registered for that still has lessons left.
 */
export function pickContinue(
  courses: Course[],
  progress: ProgressMap,
  last: LastLesson | null,
  registered: Record<string, number>,
): ContinueTarget | null {
  const lastCourse = courses.find((c) => c.slug === last?.course && c.status === "available");
  if (lastCourse) {
    const lessons = flattenLessons(lastCourse);
    const done = new Set(progress[lastCourse.slug] ?? []);
    const from = lessons.findIndex((l) => l.slug === last.lesson);
    if (from !== -1) {
      const next = [...lessons.slice(from), ...lessons.slice(0, from)].find((l) => !done.has(l.slug));
      if (next) return { course: lastCourse, lesson: next, started: true };
    }
  }

  for (const course of courses) {
    if (course.status !== "available") continue;
    const done = new Set(progress[course.slug] ?? []);
    if (done.size === 0 && !registered[course.slug]) continue;
    const next = flattenLessons(course).find((l) => !done.has(l.slug));
    if (next) return { course, lesson: next, started: done.size > 0 };
  }
  return null;
}
