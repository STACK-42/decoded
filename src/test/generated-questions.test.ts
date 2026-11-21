import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { courses } from "@/content/registry";
import { instantiate, type Question, type QuestionGenerator } from "@/lib/questions";
import { parseSections } from "@/lib/lessonPreview";
import { loadBank } from "@/content/questionBanks";

const files = import.meta.glob<{ generators: QuestionGenerator[] }>("@/content/*/generators.ts", { eager: true });
const byCourse = Object.fromEntries(Object.entries(files).map(([f, m]) => [f.split("/").at(-2)!, m.generators]));
const all = Object.values(byCourse).flat();
const banks = import.meta.glob<{ questions: Question[] }>("@/content/*/questions.ts", { eager: true });
const bankIds = new Set(Object.values(banks).flatMap((m) => m.questions.map((q) => q.id)));

const registry = readFileSync("src/content/registry.ts", "utf8");
const importOf = Object.fromEntries([...registry.matchAll(/const (\w+) = lesson\(\(\) => import\("@\/content\/([^"]+)"\)\)/g)].map((m) => [m[1], m[2]]));
const fileOf: Record<string, string> = {};
for (const m of registry.matchAll(/slug: "([^"]+)"[^}]*?Component: (\w+)/g)) if (importOf[m[2]]) fileOf[`${importOf[m[2]].split("/")[0]}/${m[1]}`] = importOf[m[2]];

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 1);

// An independent check of the subnet answers, with 32-bit integer masks instead of the lesson's arithmetic.
const toInt = (ip: string) => ip.split(".").reduce((a, o) => ((a << 8) | Number(o)) >>> 0, 0);
const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const maskOf = (p: number) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);

describe("generated questions", () => {
  it("have well-formed, unique ids that don't clash with the fixed banks", () => {
    const seen = new Set<string>();
    for (const [course, gens] of Object.entries(byCourse)) {
      for (const g of gens) {
        expect(g.id).toMatch(new RegExp(`^${course}/[a-z0-9-]+/gen-[a-z0-9-]+$`));
        expect(seen.has(g.id), g.id).toBe(false);
        expect(bankIds.has(g.id), g.id).toBe(false);
        seen.add(g.id);
      }
    }
    expect(all.length).toBeGreaterThan(0);
  });

  it("point at a real lesson and heading", () => {
    for (const [course, gens] of Object.entries(byCourse)) {
      const c = courses.find((x) => x.slug === course)!;
      for (const g of gens) {
        expect(c.modules.some((m) => m.lessons.some((l) => l.slug === g.lesson)), g.id).toBe(true);
        if (g.section) {
          const file = fileOf[`${course}/${g.lesson}`];
          const ids = parseSections(readFileSync(`src/content/${file}`, "utf8")).map((s) => s.id);
          expect(ids, g.id).toContain(g.section);
        }
      }
    }
  });

  it("always give four distinct options with exactly one right answer", () => {
    for (const g of all) {
      for (const seed of SEEDS) {
        const q = instantiate(g, seed);
        const texts = q.options.map((o) => o.text);
        expect(new Set(texts).size, `${g.id} seed ${seed}: ${texts}`).toBe(4);
        expect(q.options.filter((o) => o.id === q.correctOptionId)).toHaveLength(1);
        expect(q.prompt.trim() && q.explanation.trim()).toBeTruthy();
      }
    }
  });

  it("are the same for the same seed and change between seeds", () => {
    for (const g of all) {
      expect(instantiate(g, 42)).toEqual(instantiate(g, 42));
      expect(new Set(SEEDS.slice(0, 50).map((s) => instantiate(g, s).prompt)).size, g.id).toBeGreaterThan(10);
    }
  });

  it("place the right answer in every position, not always the same one", () => {
    for (const g of all) expect(new Set(SEEDS.map((s) => instantiate(g, s).correctOptionId)).size, g.id).toBe(4);
  });

  it("compute subnet answers that match an independent bit-mask calculation", () => {
    const gen = (name: string) => byCourse["computer-networks"].find((g) => g.id.endsWith(name))!;
    for (const seed of SEEDS) {
      const answer = (q: Question) => q.options.find((o) => o.id === q.correctOptionId)!.text;
      const hosts = instantiate(gen("gen-usable-hosts"), seed);
      const p = Number(/\/(\d+)/.exec(hosts.prompt)![1]);
      expect(Number(answer(hosts))).toBe(2 ** (32 - p) - 2);

      for (const [name, pick] of [["gen-network-address", (ip: number, m: number) => ip & m], ["gen-broadcast-address", (ip: number, m: number) => ip | ~m]] as const) {
        const q = instantiate(gen(name), seed);
        const [, ip, prefix] = /of ([\d.]+)\/(\d+)\?/.exec(q.prompt)!;
        expect(answer(q), `${name} ${ip}/${prefix}`).toBe(toIp(pick(toInt(ip), maskOf(Number(prefix))) >>> 0));
        expect(ip, "the address itself isn't the answer").not.toBe(answer(q));
      }
    }
  });

  it("compute scheduling answers that match an independent simulation", () => {
    const gen = (name: string) => byCourse["operating-systems"].find((g) => g.id.endsWith(name))!;
    const answer = (q: Question) => q.options.find((o) => o.id === q.correctOptionId)!.text;
    const bursts = (prompt: string) => [...prompt.matchAll(/P\d+ = (\d+)/g)].map((m) => Number(m[1]));
    const avgWait = (order: number[]) => order.reduce((acc, b, i) => acc + order.slice(0, i).reduce((x, y) => x + y, 0), 0) / order.length;
    const round = (x: number) => String(Math.round(x * 100) / 100);
    for (const seed of SEEDS) {
      const f = instantiate(gen("gen-fcfs-waiting"), seed);
      expect(answer(f), f.prompt).toBe(round(avgWait(bursts(f.prompt))));
      const s = instantiate(gen("gen-sjf-waiting"), seed);
      expect(answer(s), s.prompt).toBe(round(avgWait([...bursts(s.prompt)].sort((a, b) => a - b))));
      const r = instantiate(gen("gen-rr-completion"), seed);
      const q = Number(/quantum (\d+)/.exec(r.prompt)![1]);
      const target = Number(/does P(\d+) finish/.exec(r.prompt)![1]) - 1;
      const left = bursts(r.prompt);
      const queue = left.map((_, i) => i);
      let t = 0;
      let finish = -1;
      while (queue.length) {
        const i = queue.shift()!;
        const run = Math.min(q, left[i]);
        t += run;
        left[i] -= run;
        if (left[i] > 0) queue.push(i);
        else if (i === target) finish = t;
      }
      expect(Number(answer(r)), r.prompt).toBe(finish);
    }
  });

  it("are added to a course's bank by loadBank, with numbers from the seed", async () => {
    const a = await loadBank("computer-networks", 1);
    const b = await loadBank("computer-networks", 2);
    const id = byCourse["computer-networks"][1].id;
    expect(a.filter((q) => q.id === id)).toHaveLength(1);
    expect(a.find((q) => q.id === id)!.prompt).not.toBe(b.find((q) => q.id === id)!.prompt);
  });
});
