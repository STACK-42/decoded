import { describe, expect, it } from "vitest";
import { courses, flattenLessons } from "@/content/registry";
import { pickContinue } from "@/lib/continueLearning";

const available = courses.filter((c) => c.status === "available" && flattenLessons(c).length > 2);
const course = available[0];
const other = available[1];
const [one, two, three] = flattenLessons(course);
const slugs = (c: typeof course) => flattenLessons(c).map((l) => l.slug);

describe("pickContinue", () => {
  it("has nothing for a new visitor", () => {
    expect(pickContinue(courses, {}, null, {})).toBeNull();
  });

  it("returns to the unfinished lesson last opened", () => {
    const target = pickContinue(courses, {}, { course: course.slug, lesson: two.slug }, {});
    expect(target?.lesson.slug).toBe(two.slug);
    expect(target?.started).toBe(true);
  });

  it("moves on when the last lesson is finished", () => {
    const target = pickContinue(courses, { [course.slug]: [two.slug] }, { course: course.slug, lesson: two.slug }, {});
    expect(target?.lesson.slug).toBe(three.slug);
  });

  it("wraps round to an earlier gap at the end of the course", () => {
    const done = slugs(course).filter((s) => s !== one.slug);
    const lastSlug = done[done.length - 1];
    const target = pickContinue(courses, { [course.slug]: done }, { course: course.slug, lesson: lastSlug }, {});
    expect(target?.lesson.slug).toBe(one.slug);
  });

  it("moves to another started course when the last one is complete", () => {
    const progress = { [course.slug]: slugs(course), [other.slug]: [flattenLessons(other)[0].slug] };
    const target = pickContinue(courses, progress, { course: course.slug, lesson: one.slug }, {});
    expect(target?.course.slug).toBe(other.slug);
    expect(target?.lesson.slug).toBe(flattenLessons(other)[1].slug);
  });

  it("offers the first lesson of a registered course with no progress", () => {
    const target = pickContinue(courses, {}, null, { [course.slug]: 1 });
    expect(target?.lesson.slug).toBe(one.slug);
    expect(target?.started).toBe(false);
  });

  it("ignores a last lesson that no longer exists", () => {
    expect(pickContinue(courses, {}, { course: course.slug, lesson: "gone" }, {})).toBeNull();
    expect(pickContinue(courses, {}, { course: "gone", lesson: one.slug }, {})).toBeNull();
  });

  it("has nothing when everything started is complete", () => {
    expect(pickContinue(courses, { [course.slug]: slugs(course) }, { course: course.slug, lesson: one.slug }, {})).toBeNull();
  });
});
