import { useMemo, useState } from "react";
import { Panel, Stepper, Toggle, btn, inputCls } from "@/components/mdx/vizKit";
import {
  append,
  appendFrames,
  bracketFrames,
  bstDelete,
  bstFrom,
  bstInsert,
  bstSearch,
  dequeue,
  enqueue,
  hashMapFrames,
  heapPopFrames,
  heapPushFrames,
  height,
  listFrom,
  pushFront,
  PY_APPEND,
  PY_BRACKETS,
  PY_HEAP,
  PY_PUT,
  removeValue,
  ringQueue,
  ringTail,
  TRAVERSAL_CODE,
  traversalFrames,
  trieComplete,
  trieFrom,
  trieInsert,
  ufFind,
  ufSets,
  ufStart,
  ufUnion,
  type BracketState,
  type DynArrayState,
  type HashMapState,
  type HeapState,
  type LinkedList,
  type TNode,
  type Traversal,
  type TravState,
  type Trie,
  type UFState,
} from "@/lib/dataStructures";

/* ============================================================
   Visualizers for the Data Structures course. Colours follow
   AlgoVisualizers: neon = looking at now, orange = writing or
   breaking a rule, mint = done / found, sky = the live region,
   violet = special.
   ============================================================ */

const chip = `${btn} !px-2 !py-1 !normal-case !tracking-normal`;

/* -------------------------------- dynamic array -------------------------------- */

export function DynamicArrayDemo({ n = 17 }: { n?: number }) {
  const [growth, setGrowth] = useState("2");
  const frames = useMemo(() => appendFrames(n, Number(growth)), [n, growth]);
  return (
    <Stepper
      title="Appending to a dynamic array"
      frames={frames}
      code={PY_APPEND.map((l) => l.replace("growth", growth === "1" ? "1 + 1" : growth))}
      codeLabel="Python"
      legend={[["bg-sky", "item"], ["bg-orange", "being copied"], ["bg-muted", "free slot"]]}
      inputs={<Toggle<string> value={growth} onChange={setGrowth} options={[["2", "Double"], ["1.5", "× 1.5"], ["1", "Grow by 1"]]} />}
      render={(s: DynArrayState) => (
        <div className="space-y-2">
          <div className="font-mono text-[11px] text-muted-foreground">
            size {s.items.length} · capacity {s.capacity}
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: s.capacity }, (_, i) => {
              const v = s.items[i];
              return (
                <div
                  key={i}
                  className={`w-8 h-8 flex items-center justify-center font-mono text-xs rounded-[2px] border transition-colors duration-300 ${
                    v === undefined ? "border-dashed border-border" : s.copying ? "border-orange bg-orange/30" : "border-sky bg-sky/30"
                  }`}
                >
                  {v ?? ""}
                </div>
              );
            })}
          </div>
        </div>
      )}
    />
  );
}

/* -------------------------------- linked list -------------------------------- */

export function LinkedListLab() {
  const [list, setList] = useState<LinkedList>(() => listFrom(["8", "3", "5"]));
  const [walked, setWalked] = useState<number[]>([]);
  const [changed, setChanged] = useState<number[]>([]);
  const [note, setNote] = useState("Three nodes. Each holds a value and a pointer to the next node; the last points to nothing (None / null / nullptr).");
  const [val, setVal] = useState("7");
  const run = (op: { list: LinkedList; walked: number[]; changed: number[]; note: string }) => {
    setList(op.list);
    setWalked(op.walked);
    setChanged(op.changed);
    setNote(op.note);
  };
  const order: number[] = [];
  for (let at = list.head; at !== null; at = list.nodes[at].next) order.push(at);
  return (
    <Panel title="A singly linked list" legend={[["bg-neon", "walked past"], ["bg-mint", "pointer just written"]]}>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Value" className={`${inputCls} w-16 !py-1`} value={val} maxLength={3} onChange={(e) => setVal(e.target.value.trim())} />
        <button type="button" className={chip} disabled={!val} onClick={() => run(pushFront(list, val))}>push front</button>
        <button type="button" className={chip} disabled={!val} onClick={() => run(append(list, val))}>append</button>
        <button type="button" className={chip} disabled={!val} onClick={() => run(removeValue(list, val))}>remove</button>
        <button type="button" className={chip} onClick={() => run({ list: listFrom(["8", "3", "5"]), walked: [], changed: [], note: "Back to three nodes." })}>⟲</button>
      </div>
      <div className="flex flex-wrap items-center gap-y-3 font-mono text-sm">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-2">head →</span>
        {order.length === 0 && <span className="text-muted-foreground">None</span>}
        {order.map((id, k) => {
          const hot = walked.includes(id);
          const fresh = changed.includes(id);
          return (
            <span key={id} className="inline-flex items-center">
              <span
                className={`inline-flex border-2 rounded-sm overflow-hidden transition-colors duration-300 animate-in fade-in ${fresh ? "border-mint" : hot ? "border-neon" : "border-border"}`}
                style={hot ? { transitionDelay: `${walked.indexOf(id) * 120}ms` } : undefined}
              >
                <span className={`px-2.5 py-1.5 font-bold ${fresh ? "bg-mint/25" : hot ? "bg-neon/25" : ""}`}>{list.nodes[id].value}</span>
                <span className="px-1.5 py-1.5 border-l border-border text-muted-foreground text-xs">next</span>
              </span>
              <span className="px-1 text-muted-foreground">{k === order.length - 1 ? "→ None" : "→"}</span>
            </span>
          );
        })}
      </div>
      <p aria-live="polite" className="text-sm leading-relaxed min-h-[3em]">{note}</p>
    </Panel>
  );
}

/* -------------------------------- stack: brackets -------------------------------- */

const BRACKET_SAMPLES = ["{[()()]}", "f(a[0], {b: 1})", "([)]", "(()"];

export function BracketStack() {
  const [text, setText] = useState(BRACKET_SAMPLES[0]);
  const frames = useMemo(() => bracketFrames(text), [text]);
  return (
    <Stepper
      title="A stack checks brackets"
      frames={frames}
      code={PY_BRACKETS}
      codeLabel="Python"
      legend={[["bg-neon", "reading"], ["bg-sky", "on the stack"], ["bg-orange", "the problem"]]}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Text to check" className={`${inputCls} w-44 !py-1`} value={text} maxLength={24} onChange={(e) => setText(e.target.value)} />
          {BRACKET_SAMPLES.map((t) => (
            <button key={t} type="button" className={chip} onClick={() => setText(t)}>{t}</button>
          ))}
        </div>
      }
      render={(s: BracketState) => (
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-wrap gap-0.5 font-mono text-base">
            {[...s.text].map((ch, i) => (
              <span key={i} className={`w-6 h-8 flex items-center justify-center rounded-[2px] transition-colors ${i === s.bad ? "bg-orange/50" : i === s.i ? "bg-neon/40" : i < s.i ? "text-muted-foreground" : ""}`}>
                {ch === " " ? "·" : ch}
              </span>
            ))}
          </div>
          <div className="flex flex-col-reverse items-center gap-1 min-h-[120px] w-16 border-x-2 border-b-2 border-border rounded-b-sm p-1">
            {s.stack.map((e, k) => (
              <div key={`${e.at}`} className={`w-full h-7 flex items-center justify-center font-mono font-bold rounded-[2px] animate-in slide-in-from-top-2 ${k === s.stack.length - 1 && s.verdict !== "running" && s.verdict !== "ok" ? "bg-orange/50" : "bg-sky/40"}`}>
                {e.ch}
              </div>
            ))}
          </div>
          <div className="font-mono text-xs">
            {s.verdict === "ok" && <span className="text-mint font-bold">balanced ✓</span>}
            {(s.verdict === "mismatch" || s.verdict === "extra" || s.verdict === "unclosed") && <span className="text-orange font-bold">unbalanced ✗</span>}
          </div>
        </div>
      )}
    />
  );
}

/* -------------------------------- ring-buffer queue -------------------------------- */

export function RingQueueLab() {
  const [r, setR] = useState(() => ringQueue(8));
  const [note, setNote] = useState("An array of 8 slots, plus two numbers: head (the front) and size. The tail is where the next item goes.");
  const [out, setOut] = useState<string[]>([]);
  const tail = ringTail(r);
  return (
    <Panel title="A queue in a ring buffer" legend={[["bg-sky", "queued"], ["bg-mint", "head (front)"], ["bg-violet", "tail (next free)"]]}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={chip} onClick={() => { const e = enqueue(r); setR(e.ring); setNote(e.note); }}>enqueue</button>
        <button type="button" className={chip} onClick={() => { const d = dequeue(r); setR(d.ring); setNote(d.note); if (d.item) setOut((o) => [...o, d.item!].slice(-8)); }}>dequeue</button>
        <button type="button" className={chip} onClick={() => { setR(ringQueue(8)); setOut([]); setNote("Empty again."); }}>⟲</button>
        <span className="font-mono text-[11px] text-muted-foreground">head = {r.head} · size = {r.size} · tail = (head + size) mod 8 = {tail}</span>
      </div>
      <div className="grid grid-cols-8 gap-1 max-w-[420px]">
        {r.slots.map((v, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className={`w-full h-10 flex items-center justify-center font-mono text-[11px] rounded-[2px] border-2 transition-colors duration-300 ${i === r.head && r.size ? "border-mint" : i === tail && r.size < 8 ? "border-violet border-dashed" : "border-border"} ${v ? "bg-sky/35" : ""}`}>
              {v ?? ""}
            </div>
            <span className="font-mono text-[9px] text-muted-foreground">{i}</span>
            <span className="font-mono text-[9px] h-3 leading-3">{i === r.head && r.size ? <b className="text-mint">head</b> : i === tail && r.size < 8 ? <b className="text-violet">tail</b> : ""}</span>
          </div>
        ))}
      </div>
      <div className="font-mono text-xs text-muted-foreground">dequeued so far: {out.length ? out.join(", ") : "nothing"}</div>
      <p aria-live="polite" className="text-sm leading-relaxed min-h-[3em]">{note}</p>
    </Panel>
  );
}

/* -------------------------------- hash map -------------------------------- */

const HASH_KEYS = ["apple", "banana", "cherry", "date", "elder", "fig", "grape", "kiwi", "apple", "lemon"];

export function HashMapDemo() {
  const frames = useMemo(() => hashMapFrames(HASH_KEYS), []);
  return (
    <Stepper
      title="Inside a hash map"
      frames={frames}
      code={PY_PUT}
      codeLabel="Python (separate chaining)"
      legend={[["bg-neon", "just placed"], ["bg-sky", "stored"], ["bg-orange", "rehashing"]]}
      render={(s: HashMapState) => (
        <div className="flex flex-col gap-1 font-mono text-xs">
          {s.buckets.map((b, i) => (
            <div key={`${s.buckets.length}-${i}`} className="flex items-center gap-1.5 min-h-[28px]">
              <span className={`w-7 shrink-0 text-right ${s.probe?.bucket === i ? "text-foreground font-bold" : "text-muted-foreground"}`}>{i}</span>
              <span className={`w-2 h-6 rounded-[2px] ${s.resizing ? "bg-orange/50" : "bg-border"}`} />
              {b.map((k) => (
                <span key={k} className={`px-1.5 py-0.5 rounded-[2px] border animate-in fade-in ${s.probe?.key === k ? "border-neon bg-neon/30 font-bold" : s.resizing ? "border-orange bg-orange/15" : "border-sky bg-sky/20"}`}>
                  {k}
                </span>
              ))}
            </div>
          ))}
          <div className="text-[11px] text-muted-foreground pt-1">{s.size} keys in {s.buckets.length} buckets</div>
        </div>
      )}
    />
  );
}

/* -------------------------------- drawing trees -------------------------------- */

type Placed = { key: number; x: number; y: number; parent: number | null };

/** x = in-order position, y = depth: the simplest layout that never crosses edges. */
function placeTree(root: TNode | null): Placed[] {
  const out: Placed[] = [];
  let i = 0;
  const walk = (n: TNode | null, depth: number, parent: number | null) => {
    if (!n) return;
    walk(n.left, depth + 1, n.key);
    out.push({ key: n.key, x: i++, y: depth, parent });
    walk(n.right, depth + 1, n.key);
  };
  walk(root, 0, null);
  return out;
}

function TreeSvg({ root, tone, label }: { root: TNode | null; tone: (key: number) => string; label: string }) {
  const nodes = placeTree(root);
  if (!nodes.length) return <div className="font-mono text-xs text-muted-foreground py-6">empty tree</div>;
  const n = nodes.length;
  const depth = Math.max(...nodes.map((p) => p.y));
  const W = Math.max(300, n * 42 + 20);
  const H = depth * 58 + 48;
  const X = (x: number) => 26 + (n === 1 ? (W - 52) / 2 : (x / (n - 1)) * (W - 52));
  const Y = (y: number) => 24 + y * 58;
  const at = new Map(nodes.map((p) => [p.key, p]));
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="block mx-auto h-auto" style={{ width: "100%", maxWidth: W * 1.2, minWidth: Math.min(W * 0.7, 560) }} role="img" aria-label={label}>
        {nodes.map((p) => {
          if (p.parent === null) return null;
          const q = at.get(p.parent)!;
          return <line key={`e${p.key}`} x1={X(q.x)} y1={Y(q.y)} x2={X(p.x)} y2={Y(p.y)} className="stroke-border" strokeWidth={1.6} />;
        })}
        {nodes.map((p) => (
          <g key={p.key}>
            <circle cx={X(p.x)} cy={Y(p.y)} r={17} className="fill-card" />
            <circle cx={X(p.x)} cy={Y(p.y)} r={17} strokeWidth={2} className={`transition-colors duration-300 ${tone(p.key)}`} />
            <text x={X(p.x)} y={Y(p.y) + 4.5} textAnchor="middle" className="fill-foreground font-mono text-[13px] font-bold">{p.key}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* -------------------------------- traversals -------------------------------- */

const TRAV_TREE = bstFrom([4, 2, 6, 1, 3, 5, 7])!;

export function TraversalDemo() {
  const [kind, setKind] = useState<Traversal>("in");
  const frames = useMemo(() => traversalFrames(TRAV_TREE, kind), [kind]);
  return (
    <Stepper
      title="Four ways to walk a tree"
      frames={frames}
      code={TRAVERSAL_CODE[kind]}
      codeLabel="Python"
      legend={[["bg-neon", "visiting"], ["bg-mint", "visited"], ["bg-violet", "waiting in the queue"]]}
      inputs={<Toggle<Traversal> value={kind} onChange={setKind} options={[["pre", "Pre"], ["in", "In"], ["post", "Post"], ["level", "Level"]]} />}
      render={(s: TravState) => (
        <div className="space-y-2">
          <TreeSvg
            root={TRAV_TREE}
            label="binary tree"
            tone={(k) => (k === s.current ? "fill-neon/30 stroke-neon stroke-[3px]" : s.visited.includes(k) ? "fill-mint/40 stroke-mint" : s.queue.includes(k) ? "fill-violet/30 stroke-violet" : "fill-card stroke-border")}
          />
          <div className="font-mono text-sm">
            order: <b>{s.visited.join(", ") || "…"}</b>
          </div>
        </div>
      )}
    />
  );
}

/* -------------------------------- binary search tree -------------------------------- */

const BST_START = [50, 30, 70, 20, 40, 60, 80, 35, 45];

export function BstLab() {
  const [root, setRoot] = useState<TNode | null>(() => bstFrom(BST_START));
  const [val, setVal] = useState("45");
  const [path, setPath] = useState<number[]>([]);
  const [hit, setHit] = useState<number | null>(null);
  const [note, setNote] = useState("Every key in a node's left subtree is smaller than it, and every key in its right subtree is bigger.");
  const k = Number(val);
  const ok = val !== "" && Number.isInteger(k) && k >= 0 && k < 1000;
  const count = (n: TNode | null): number => (n ? 1 + count(n.left) + count(n.right) : 0);
  return (
    <Panel title="A binary search tree" legend={[["bg-neon", "compared on the way down"], ["bg-mint", "found / inserted"]]}>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Key" className={`${inputCls} w-20 !py-1`} value={val} inputMode="numeric" onChange={(e) => setVal(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        <button type="button" className={chip} disabled={!ok} onClick={() => { const r = bstSearch(root, k); setPath(r.path); setHit(r.found ? k : null); setNote(r.found ? `Found ${k} after ${r.path.length} comparison${r.path.length === 1 ? "" : "s"}: ${r.path.join(" → ")}.` : `Not here. ${r.path.length} comparisons (${r.path.join(" → ")}) led to an empty spot, which is exactly where ${k} would be inserted.`); }}>search</button>
        <button type="button" className={chip} disabled={!ok} onClick={() => { const r = bstInsert(root, k); setRoot(r.root); setPath(r.path); setHit(k); setNote(r.existed ? `${k} is already in the tree.` : `Insert ${k}: go left when smaller, right when bigger (${r.path.join(" → ") || "empty tree"}), and hang it where you fall off.`); }}>insert</button>
        <button type="button" className={chip} disabled={!ok} onClick={() => { const r = bstDelete(root, k); setRoot(r.root); setPath([]); setHit(r.successor); setNote(r.kind === "missing" ? `${k} isn't in the tree.` : r.kind === "leaf" ? `${k} was a leaf: just remove it.` : r.kind === "one child" ? `${k} had one child: that child takes its place.` : `${k} had two children. Its in-order successor, ${r.successor} (the smallest key in its right subtree), moves into its spot, then the successor's old node is removed. The ordering still holds.`); }}>delete</button>
        <button type="button" className={chip} onClick={() => { setRoot(bstFrom(BST_START)); setPath([]); setHit(null); setNote("A fairly balanced tree."); }}>balanced</button>
        <button type="button" className={chip} onClick={() => { setRoot(bstFrom([10, 20, 30, 40, 50, 60, 70])); setPath([]); setHit(null); setNote("Inserted in sorted order: every key goes right. The tree is a linked list in disguise, and search is O(n). Balanced trees such as red-black trees stop this."); }}>sorted input</button>
      </div>
      <TreeSvg root={root} label="binary search tree" tone={(key) => (key === hit ? "fill-mint/50 stroke-mint" : path.includes(key) ? "fill-neon/25 stroke-neon" : "fill-card stroke-border")} />
      <div className="font-mono text-[11px] text-muted-foreground">
        {count(root)} keys · height {height(root)} · a perfectly balanced tree this size would have height {Math.max(0, Math.floor(Math.log2(Math.max(1, count(root)))))}
      </div>
      <p aria-live="polite" className="text-sm leading-relaxed min-h-[3em]">{note}</p>
    </Panel>
  );
}

/* -------------------------------- heap -------------------------------- */

function heapTree(a: number[]): TNode | null {
  const build = (i: number): TNode | null => (i < a.length ? { key: i, left: build(2 * i + 1), right: build(2 * i + 2) } : null);
  return build(0);
}

export function HeapLab() {
  const [base, setBase] = useState<number[]>([3, 8, 5, 12, 9, 7, 6]);
  const [op, setOp] = useState<{ kind: "push" | "pop"; x: number }>({ kind: "push", x: 2 });
  const [nextVal, setNextVal] = useState("2");
  const frames = useMemo(() => (op.kind === "push" ? heapPushFrames(base, op.x) : heapPopFrames(base)), [base, op]);
  const finish = () => frames[frames.length - 1].state.a;
  return (
    <Stepper
      title="A binary min-heap"
      frames={frames}
      code={PY_HEAP}
      codeLabel="Python (heapq does this for you)"
      legend={[["bg-neon", "being compared"], ["bg-mint", "settled"]]}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <input aria-label="Value to push" className={`${inputCls} w-16 !py-1`} value={nextVal} inputMode="numeric" onChange={(e) => setNextVal(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          <button type="button" className={chip} disabled={!nextVal || finish().length >= 15} onClick={() => { setBase(finish()); setOp({ kind: "push", x: Number(nextVal) }); }}>push</button>
          <button type="button" className={chip} disabled={!finish().length} onClick={() => { setBase(finish()); setOp({ kind: "pop", x: 0 }); }}>pop min</button>
          <span className="font-mono text-[11px] text-muted-foreground">each button starts from the end of the last operation</span>
        </div>
      }
      render={(s: HeapState) => {
        const tree = heapTree(s.a);
        return (
          <div className="space-y-3">
            <div className="relative">
              <TreeSvgLabels root={tree} values={s.a} active={s.active} done={s.done} />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">the same heap, as the array it really is</div>
              <div className="flex flex-wrap gap-1">
                {s.a.map((v, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={`w-8 h-8 flex items-center justify-center font-mono text-xs rounded-[2px] border transition-colors duration-300 ${s.active.includes(i) ? (s.done ? "border-mint bg-mint/30" : "border-neon bg-neon/30") : "border-border"}`}>{v}</div>
                    <span className="font-mono text-[9px] text-muted-foreground">{i}</span>
                  </div>
                ))}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground mt-1">children of i are at 2i + 1 and 2i + 2; the parent is at (i − 1) // 2</div>
            </div>
          </div>
        );
      }}
    />
  );
}

/** A heap's tree drawn by index, labelled with values. */
function TreeSvgLabels({ root, values, active, done }: { root: TNode | null; values: number[]; active: number[]; done: boolean }) {
  if (!root) return <div className="font-mono text-xs text-muted-foreground py-6">empty heap</div>;
  const levels = Math.floor(Math.log2(values.length)) + 1;
  const W = 420;
  const H = levels * 54 + 10;
  const pos = (i: number) => {
    const d = Math.floor(Math.log2(i + 1));
    const first = 2 ** d - 1;
    return { x: ((i - first + 0.5) / 2 ** d) * W, y: 24 + d * 54 };
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[460px] h-auto block mx-auto" role="img" aria-label="heap drawn as a tree">
      {values.map((_, i) => {
        if (!i) return null;
        const a = pos(Math.floor((i - 1) / 2));
        const b = pos(i);
        return <line key={`e${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-border" strokeWidth={1.6} />;
      })}
      {values.map((v, i) => {
        const p = pos(i);
        const on = active.includes(i);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={17} className="fill-card" />
            <circle cx={p.x} cy={p.y} r={17} strokeWidth={2} className={`transition-colors duration-300 ${on ? (done ? "fill-mint/30 stroke-mint" : "fill-neon/25 stroke-neon") : "fill-card stroke-border"}`} />
            <text x={p.x} y={p.y + 4.5} textAnchor="middle" className="fill-foreground font-mono text-[13px] font-bold">{v}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* -------------------------------- trie -------------------------------- */

const TRIE_WORDS = ["car", "card", "care", "cart", "cat", "dog", "dot"];

type TPlaced = { id: string; ch: string; x: number; y: number; parent: string | null; end: boolean };

function placeTrie(t: Trie): { nodes: TPlaced[]; leaves: number } {
  const nodes: TPlaced[] = [];
  let leaf = 0;
  const walk = (n: Trie, id: string, ch: string, depth: number, parent: string | null): number => {
    const keys = Object.keys(n.children).sort();
    const xs = keys.map((k) => walk(n.children[k], id + k, k, depth + 1, id));
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : leaf++;
    nodes.push({ id, ch, x, y: depth, parent, end: n.end });
    return x;
  };
  walk(t, "", "", 0, null);
  return { nodes, leaves: Math.max(1, leaf) };
}

export function TrieLab() {
  const [words, setWords] = useState(TRIE_WORDS);
  const [prefix, setPrefix] = useState("car");
  const [add, setAdd] = useState("");
  const trie = useMemo(() => trieFrom(words), [words]);
  const res = trieComplete(trie, prefix);
  const { nodes, leaves } = placeTrie(trie);
  const depth = Math.max(...nodes.map((n) => n.y));
  const W = Math.max(300, leaves * 40 + 20);
  const H = depth * 52 + 44;
  const X = (x: number) => 20 + (leaves === 1 ? (W - 40) / 2 : (x / (leaves - 1)) * (W - 40));
  const Y = (y: number) => 22 + y * 52;
  const at = new Map(nodes.map((n) => [n.id, n]));
  const onPath = (id: string) => res.found && prefix.startsWith(id);
  const inResult = (id: string) => res.found && id.startsWith(prefix) && id.length > prefix.length;
  return (
    <Panel title="A trie autocompletes" legend={[["bg-neon", "path to the prefix"], ["bg-sky", "below it: the completions"], ["bg-mint", "end of a word"]]}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">prefix</span>
        <input aria-label="Prefix" className={`${inputCls} w-28 !py-1`} value={prefix} onChange={(e) => setPrefix(e.target.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 8))} />
        <input aria-label="Word to add" placeholder="add a word" className={`${inputCls} w-28 !py-1`} value={add} onChange={(e) => setAdd(e.target.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 7))} />
        <button type="button" className={chip} disabled={!add || words.includes(add) || words.length >= 12} onClick={() => { setWords((w) => [...w, add]); setAdd(""); }}>insert</button>
        <button type="button" className={chip} onClick={() => setWords(TRIE_WORDS)}>⟲</button>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="block mx-auto h-auto" style={{ width: "100%", maxWidth: W * 1.3, minWidth: Math.min(W * 0.7, 520) }} role="img" aria-label="trie">
          {nodes.map((n) => {
            if (n.parent === null) return null;
            const p = at.get(n.parent)!;
            return <line key={`e${n.id}`} x1={X(p.x)} y1={Y(p.y)} x2={X(n.x)} y2={Y(n.y)} className={onPath(n.id) ? "stroke-neon" : inResult(n.id) ? "stroke-sky" : "stroke-border"} strokeWidth={onPath(n.id) || inResult(n.id) ? 2.5 : 1.5} />;
          })}
          {nodes.map((n) => (
            <g key={n.id || "root"}>
              <circle cx={X(n.x)} cy={Y(n.y)} r={14} className="fill-card" />
              <circle cx={X(n.x)} cy={Y(n.y)} r={14} strokeWidth={n.end ? 3 : 1.5} className={`transition-colors ${onPath(n.id) ? "fill-neon/20" : inResult(n.id) ? "fill-sky/25" : "fill-card"} ${n.end ? "stroke-mint" : onPath(n.id) ? "stroke-neon" : "stroke-border"}`} />
              <text x={X(n.x)} y={Y(n.y) + 4.5} textAnchor="middle" className="fill-foreground font-mono text-[13px] font-bold">{n.ch || "·"}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="font-mono text-sm">
        {res.found ? (
          <>
            {res.steps} step{res.steps === 1 ? "" : "s"} down to "{prefix}", then: <b className="text-sky">{res.words.join(", ") || "no words below"}</b>
          </>
        ) : (
          <span className="text-orange">no word starts with "{prefix}": the walk falls off after {res.steps} step{res.steps === 1 ? "" : "s"}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">Finding the prefix takes one step per letter, however many words are stored. Words that share a beginning share the nodes for it.</p>
    </Panel>
  );
}

/* -------------------------------- union-find -------------------------------- */

const UF_N = 8;

export function UnionFindLab() {
  const [s, setS] = useState<UFState>(() => ufStart(UF_N));
  const [pick, setPick] = useState<number | null>(null);
  const [mode, setMode] = useState<"union" | "find">("union");
  const [path, setPath] = useState<number[]>([]);
  const click = (v: number) => {
    if (mode === "find") {
      const f = ufFind(s, v);
      setPath(f.path);
      setS({ ...f.state, touched: [v], note: `find(${v}): follow parents ${f.path.join(" → ")}. The root ${f.root} names the set.${f.path.length > 2 ? ` Path compression now points ${f.path.slice(0, -2).join(", ")} straight at ${f.root}, so next time it's one step.` : ""}` });
      return;
    }
    if (pick === null) {
      setPick(v);
      setPath([]);
      return;
    }
    setS(ufUnion(s, pick, v));
    setPick(null);
    setPath([]);
  };
  // draw each set as a tree: roots along the top, children below their parent
  const kids = (v: number) => s.parent.map((p, c) => (p === v && c !== v ? c : -1)).filter((c) => c >= 0);
  const roots = s.parent.map((p, v) => (p === v ? v : -1)).filter((v) => v >= 0);
  const placed: { v: number; x: number; y: number; parent: number | null }[] = [];
  let col = 0;
  const lay = (v: number, d: number, parent: number | null): number => {
    const cs = kids(v);
    const xs = cs.map((c) => lay(c, d + 1, v));
    const x = xs.length ? (xs[0] + xs[xs.length - 1]) / 2 : col++;
    placed.push({ v, x, y: d, parent });
    return x;
  };
  // a set of one needs less room than a tree, so the eight starting singletons fit a phone
  let lastGap = 0.4;
  roots.forEach((r) => {
    lay(r, 0, null);
    lastGap = kids(r).length ? 0.4 : 0.15;
    col += lastGap;
  });
  const maxD = Math.max(...placed.map((p) => p.y));
  const W = Math.max(300, col * 44 + 20);
  const X = (x: number) => 26 + (x / Math.max(1, col - lastGap - 1)) * (W - 52);
  const Y = (y: number) => 24 + y * 54;
  const pos = new Map(placed.map((p) => [p.v, p]));
  return (
    <Panel title="Union-find (disjoint sets)" legend={[["bg-neon", "selected"], ["bg-mint", "path just followed"], ["bg-violet", "root"]]}>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle<"union" | "find"> value={mode} onChange={(m) => { setMode(m); setPick(null); }} options={[["union", "Union: click two"], ["find", "Find: click one"]]} />
        <button type="button" className={chip} onClick={() => { setS(ufStart(UF_N)); setPick(null); setPath([]); }}>⟲</button>
        <button type="button" className={chip} onClick={() => { let t = ufStart(UF_N); for (const [a, b] of [[0, 1], [2, 3], [0, 2], [4, 5], [6, 7], [4, 6], [0, 4]] as const) t = ufUnion(t, a, b); setS({ ...t, note: "Seven unions: everything is one set. Click Find on 7 or 3 to see path compression flatten the tree." }); setPick(null); setPath([]); }}>join everything</button>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${maxD * 54 + 48}`} className="block mx-auto h-auto sm:min-w-[var(--uf-min)]" style={{ width: "100%", maxWidth: W * 1.3, "--uf-min": `${Math.min(W, 520) * 0.8}px` } as React.CSSProperties} role="img" aria-label="disjoint-set forest">
          {placed.map((p) => {
            if (p.parent === null) return null;
            const q = pos.get(p.parent)!;
            return <line key={`e${p.v}`} x1={X(p.x)} y1={Y(p.y)} x2={X(q.x)} y2={Y(q.y)} className={path.includes(p.v) && path.includes(p.parent) ? "stroke-mint" : "stroke-border"} strokeWidth={2} markerEnd="" />;
          })}
          {placed.map((p) => (
            <g key={p.v} className="cursor-pointer" onClick={() => click(p.v)}>
              <circle cx={X(p.x)} cy={Y(p.y)} r={17} className="fill-card" />
              <circle cx={X(p.x)} cy={Y(p.y)} r={17} strokeWidth={2} className={`transition-colors ${p.v === pick ? "fill-neon/30 stroke-neon" : path.includes(p.v) ? "fill-mint/40 stroke-mint" : p.parent === null ? "fill-violet/25 stroke-violet" : "fill-card stroke-border"} hover:stroke-foreground`} />
              <text x={X(p.x)} y={Y(p.y) + 4.5} textAnchor="middle" className="fill-foreground font-mono [font-size:16px] sm:[font-size:13px] font-bold pointer-events-none">{p.v}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        parent = [{s.parent.join(", ")}] · sets: {ufSets(s).map((g) => `{${g.join(",")}}`).join(" ")}
      </div>
      <p aria-live="polite" className="text-sm leading-relaxed min-h-[3em]">{pick !== null ? `Picked ${pick}. Click a second element to union their sets.` : s.note}</p>
    </Panel>
  );
}
