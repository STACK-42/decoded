/** A GitHub "new issue" link, filled in with the lesson being read. */
export function reportMistakeUrl(courseTitle: string, lessonTitle: string, lessonUrl: string) {
  const params = new URLSearchParams({
    title: `Mistake in ${courseTitle}: ${lessonTitle}`,
    body: `Lesson: ${lessonUrl}\n\nWhat's wrong:\n\n\nWhat it should say:\n`,
  });
  return `https://github.com/STACK-42/decoded/issues/new?${params}`;
}
