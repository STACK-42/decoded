import { renderLesson } from "./renderLesson";
import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { getCourse, flattenLessons } from "@/content/registry";
import { glossary } from "@/content/advanced-software-engineering/glossary";
import { accumulate, float32Spacing, featureCost, FRONT_CAMERA_METHODS, runInvoicePipeline, INVOICE_FILES, queueFrames, streamifyEstimate } from "@/lib/softwareEngineering";
import { Term, KeyTerms } from "@/components/mdx/SoftwareEngineeringVisualizers";
import { questions as bank } from "@/content/advanced-software-engineering/questions";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const dir = path.resolve(__dirname, "../content/advanced-software-engineering");
const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
const sources = Object.fromEntries(files.map((f) => [f, readFileSync(path.join(dir, f), "utf8")]));

describe("Advanced Software Engineering course", () => {
  const course = getCourse("advanced-software-engineering")!;

  it("is registered, available and organized by lecture", () => {
    expect(course).toBeDefined();
    expect(course.status).toBe("available");
    expect(course.modules.map((m) => m.label)).toEqual(["Lecture 1", "Lecture 2", "Lecture 3", "Lecture 4", "Lecture 5", "Lecture 6"]);
  });

  it("ends every lecture with a practice lesson that has a scored quiz and system/diagram questions", () => {
    course.modules.forEach((m, i) => {
      const last = m.lessons[m.lessons.length - 1];
      expect(last.kind).toBe("quiz");
      expect(last.slug).toBe(`lecture-${i + 1}-practice`);
      const src = sources[files.find((f) => f.includes(`lecture-${i + 1}-practice`))!];
      expect(src).toContain("## Practice quiz");
      expect(src).toContain("## System and diagram questions");
      expect(src).toContain("This course has no past exams");
      expect(src).toMatch(/figure: \(/);
    });
  });

  for (const lesson of flattenLessons(getCourse("advanced-software-engineering")!)) {
    it(`renders lesson "${lesson.slug}" without throwing`, async () => {
      const { container, unmount } = await renderLesson(lesson);
      expect(container.querySelector("h1")?.textContent).toBe(lesson.title);
      unmount();
    });
  }

  it("uses only glossary terms that exist, and gives every quiz answer an explanation", () => {
    for (const [file, src] of Object.entries(sources)) {
      for (const m of src.matchAll(/<Term id="([^"]+)"/g)) expect(glossary[m[1]], `${file}: unknown term "${m[1]}"`).toBeDefined();
      for (const m of src.matchAll(/<KeyTerms ids=\{\[([^\]]+)\]\}/g)) {
        for (const id of m[1].match(/"([^"]+)"/g)!.map((s) => s.slice(1, -1))) expect(glossary[id], `${file}: unknown key term "${id}"`).toBeDefined();
      }
      const correct = (src.match(/correctOptionId:/g) ?? []).length;
      const explained = (src.match(/explanation:/g) ?? []).length;
      expect(explained, `${file}: every question needs an explanation`).toBe(correct);
    }
  });

  it("highlights terms in every content lesson and lists its key terms", () => {
    for (const [file, src] of Object.entries(sources)) {
      if (file.includes("practice")) continue;
      expect(src, file).toMatch(/<Term id=/);
      expect(src, file).toContain("<KeyTerms");
      expect(src, file).toContain('label="Common mistake"');
    }
  });

  it("highlights each term once per lesson, highlights every key term, and uses every glossary entry", () => {
    const usedAnywhere = new Set<string>();
    for (const [file, src] of Object.entries(sources)) {
      const terms = [...src.matchAll(/<Term id="([^"]+)"/g)].map((m) => m[1]);
      terms.forEach((t) => usedAnywhere.add(t));
      const dups = terms.filter((t, i) => terms.indexOf(t) !== i);
      expect(dups, `${file}: term highlighted more than once`).toEqual([]);
      for (const m of src.matchAll(/<KeyTerms ids=\{\[([^\]]+)\]\}/g)) {
        for (const id of m[1].match(/"([^"]+)"/g)!.map((x) => x.slice(1, -1))) expect(terms, `${file}: key term "${id}" is never highlighted`).toContain(id);
      }
    }
    expect(Object.keys(glossary).filter((id) => !usedAnywhere.has(id))).toEqual([]);
  });

  it("gives every lecture a broad mix of labelled system and diagram questions", () => {
    const TYPES = ["System interpretation", "Diagram interpretation", "Missing component", "Error detection", "Sequence understanding", "Relationship identification", "Design decision", "Diagram construction"];
    for (const [file, src] of Object.entries(sources).filter(([f]) => f.includes("practice"))) {
      const practice = src.slice(src.indexOf("## System and diagram questions"));
      const prompts = [...practice.matchAll(/prompt: "([^"]+)"/g)].map((m) => m[1]);
      for (const p of prompts) expect(TYPES.some((t) => p.startsWith(`${t}:`)), `${file}: unlabelled "${p.slice(0, 40)}"`).toBe(true);
      const kinds = new Set(prompts.map((p) => p.split(":")[0]));
      expect(kinds.size, `${file} has only ${[...kinds].join(", ")}`).toBeGreaterThanOrEqual(5);
    }
  });

  it("covers every content lesson in its lecture's scored quiz, and points each question back to its lesson", () => {
    course.modules.forEach((m, i) => {
      const quiz = `lecture-${i + 1}-practice`;
      const qs = bank.filter((q) => q.quiz === quiz);
      expect(qs.length, quiz).toBeGreaterThanOrEqual(10);
      for (const q of qs) expect(m.lessons.map((l) => l.slug), q.id).toContain(q.lesson);
      for (const l of m.lessons.filter((x) => x.kind !== "quiz")) expect(qs.some((q) => q.lesson === l.slug), `${quiz} has no question on ${l.slug}`).toBe(true);
    });
  });

  it("keeps people, institutions and slide footers out of the lessons", () => {
    const all = Object.values(sources).join("\n").toLowerCase();
    expect(files.length).toBe(flattenLessons(course).length);
    for (const banned of ["desoky", "abdelqawy", "makady", "kamel", "cairo", "university", "faculty", "instructor", "lecturer", "ying shen", "tongji", "cs325", "cs352", "dr.", "prof.", "copyright", "©"]) {
      expect(all, `found "${banned}"`).not.toContain(banned);
    }
  });
});

describe("glossary popups", () => {
  it("every entry is short and names a lecture from 1 to 6", () => {
    for (const [id, e] of Object.entries(glossary)) {
      expect(e.definition.length, id).toBeLessThan(260);
      expect(e.lecture, id).toBeGreaterThanOrEqual(1);
      expect(e.lecture, id).toBeLessThanOrEqual(6);
    }
  });

  it("a Term shows its definition when clicked", async () => {
    render(<p>We use <Term id="dependency-injection">DI</Term> here.</p>);
    const trigger = screen.getByRole("button", { name: "DI" });
    await act(async () => {
      fireEvent.click(trigger);
    });
    expect(screen.getByText(glossary["dependency-injection"].definition)).toBeTruthy();
  });

  it("KeyTerms lists each definition", () => {
    render(<KeyTerms ids={["srp", "ocp"]} />);
    expect(screen.getByText(glossary.srp.definition)).toBeTruthy();
    expect(screen.getByText(glossary.ocp.definition)).toBeTruthy();
  });
});

describe("software engineering helpers", () => {
  it("loses 0.0000001 when added to 100000 in float32 but not in float64", () => {
    const rows = accumulate(100000, 0.0000001, 3);
    expect(rows.every((r) => r.sum32 === 100000 && r.added32 === 0)).toBe(true);
    expect(rows[2].sum64).toBeGreaterThan(100000);
    expect(float32Spacing(100000)).toBe(2 ** -7);
  });

  it("still registers the correction when the float32 sum is small", () => {
    expect(accumulate(1, 0.0000001, 1)[0].added32).toBeGreaterThan(0);
  });

  it("keeps the cost of a feature flat for good design and growing for bad", () => {
    expect(featureCost(100, "good")).toBe(featureCost(1, "good"));
    expect(featureCost(100, "bad")).toBeGreaterThan(featureCost(50, "bad"));
  });

  it("matches the lecture's itself-test table", () => {
    const moved = FRONT_CAMERA_METHODS.filter((m) => !m.belongs).map((m) => [m.method, m.movedTo]);
    expect(moved).toEqual([
      ["detectLanes()", "LaneDetector"],
      ["reportFault(dtc)", "DiagnosticEventManager"],
      ["renderOnHud(f)", "HudRenderer"],
      ["cleanLens()", "SensorCleaningSystem"],
    ]);
  });

  it("runs ls | grep -e August | sort", () => {
    const [ls, grep, sort] = runInvoicePipeline(INVOICE_FILES);
    expect(ls.output).toHaveLength(6);
    expect(grep.output.every((f) => f.includes("August"))).toBe(true);
    expect(sort.output).toEqual(["inv-102-August-2024.pdf", "inv-104-August-2024.pdf", "inv-117-August-2024.pdf"]);
  });

  it("reproduces Lecture 6's back-of-the-envelope numbers", () => {
    const e = streamifyEstimate();
    expect(e.peakStreams).toBe(15e6);
    expect(e.egressTbps).toBeCloseTo(2.4, 5);
    expect(e.storagePB).toBeCloseTo(2, 5);
    expect(Math.round(e.eventsPerSecAvg / 1e3)).toBe(231);
    expect(e.eventsPerSecPeak).toBeGreaterThan(690e3);
  });

  it("lets the client send without waiting and serves the queue in FIFO order", () => {
    const f = queueFrames([{ kind: "send", msg: "a" }, { kind: "send", msg: "b" }, { kind: "take" }, { kind: "take" }, { kind: "take" }]);
    expect(f[2].queue).toEqual(["a", "b"]);
    expect(f[3].serverHas).toBe("a");
    expect(f[4].serverHas).toBe("b");
    expect(f[5].serverHas).toBeUndefined();
  });
});
