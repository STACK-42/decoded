import { flattenLessons, type Course } from "@/content/registry";
import type { ProgressMap } from "@/lib/progressBackup";
import type { QuizScores } from "@/lib/progressStore";

const PASS_FRACTION = 0.8;

export type QuizRow = { course: Course; lessonSlug: string; title: string; best: number; total: number; passed: boolean };

export type DashboardSummary = {
  activeCourses: Course[];
  finishedCourses: number;
  lessonsDone: number;
  quizzes: QuizRow[];
};

/** Everything the dashboard shows. Lessons and quizzes no longer on the site aren't counted. */
export function summarize(courses: Course[], progress: ProgressMap, enrollments: Record<string, number>, scores: QuizScores): DashboardSummary {
  const activeCourses: Course[] = [];
  const quizzes: QuizRow[] = [];
  let lessonsDone = 0;
  let finishedCourses = 0;

  for (const course of courses) {
    const lessons = flattenLessons(course);
    const done = lessons.filter((l) => progress[course.slug]?.includes(l.slug)).length;
    lessonsDone += done;
    if (lessons.length > 0 && done === lessons.length) finishedCourses++;
    if (done > 0 || enrollments[course.slug]) activeCourses.push(course);
    for (const lesson of lessons) {
      const score = scores[`${course.slug}/${lesson.slug}`];
      if (score) {
        quizzes.push({ course, lessonSlug: lesson.slug, title: lesson.title, ...score, passed: score.best / score.total >= PASS_FRACTION });
      }
    }
  }

  // Quizzes to revisit come first, weakest at the top.
  quizzes.sort((a, b) => a.best / a.total - b.best / b.total);
  return { activeCourses, finishedCourses, lessonsDone, quizzes };
}
