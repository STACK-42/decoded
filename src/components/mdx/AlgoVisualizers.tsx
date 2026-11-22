import { type CSSProperties, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FocusPanel, Stepper, Toggle, btn, btnPrimary, inputCls, vizCard, vizHeader } from "@/components/mdx/vizKit";
import {
  sortFrames,
  searchFrames,
  gcdFrames,
  traversalFrames,
  mstFrames,
  knapsackFrames,
  findMaxFrames,
  JAVA_FIND_MAX,
  loopGridInfo,
  type LoopGridMode,
  swapFrames,
  JAVA_SWAP,
  type SwapState,
  bubbleEarlyExitFrames,
  JAVA_BUBBLE_EARLY_EXIT,
  type BubbleEarlyExitState,
  insertionShiftFrames,
  JAVA_INSERTION_SHIFT,
  type InsertionShiftState,
  twoWayMergeFrames,
  JAVA_TWO_WAY_MERGE,
  type TwoWayMergeState,
  partitionFrames,
  JAVA_PARTITION,
  type PartitionState,
  type PartitionMode,
  binarySearchUnsortedFrames,
  JAVA_BINARY_SEARCH_UNSORTED,
  type BinarySearchUnsortedState,
  binarySearchBoundaryFrames,
  JAVA_BINARY_SEARCH_BOUNDARY,
  type BinarySearchBoundaryState,
  type BinarySearchBoundaryMode,
  euclidTilingFrames,
  JAVA_EUCLID_TILING,
  type EuclidTilingState,
  type EuclidTile,
  gcdComparisonSummary,
  GRAPH_PRESETS,
  getAdjacencySummary,
  bfsQueueExplosionFrames,
  JAVA_BFS_QUEUE_EXPLOSION,
  shortestPathSummary,
  JAVA_SORT,
  JAVA_SEARCH,
  JAVA_GCD,
  JAVA_GCD_BUGGY,
  JAVA_TRAVERSAL,
  JAVA_MST,
  JAVA_KNAPSACK,
  GROWTH,
  humanTime,
  formatOps,
  equalTags,
  keptEqualOrder,
  type Frame,
  type ArrayState,
  type SortAlgorithm,
  type SearchAlgorithm,
  type GraphNode,
  type GraphEdge,
  type KnapsackItem,
} from "@/lib/algorithms";

/* ============================================================
   Algorithm visualizers. Every one of them replays frames from
   src/lib/algorithms.ts through the same <Stepper>: picture on
   top, a plain-English caption, controls, and the Java source
   with the line that is running right now highlighted.

   Colour language (shared with AutomatonDiagram):
     neon   = looking at / comparing right now
     orange = writing / swapping / rejecting
     mint   = done / final / accepted
     violet = pivot or special element
     sky    = the active window the algorithm is working on
   ============================================================ */

/* ---------------------------- array views ---------------------------- */

function cellTone(i: number, s: ArrayState) {
  if (s.found === i) return "mint";
  if (s.write?.includes(i)) return "orange";
  if (s.compare?.includes(i)) return "neon";
  if (s.pivot === i) return "violet";
  if (s.sorted?.includes(i)) return "mint";
  return null;
}

const barBg: Record<string, string> = { mint: "bg-mint", orange: "bg-orange", neon: "bg-neon", violet: "bg-violet" };
const cellBorder: Record<string, string> = {
  mint: "bg-mint/20 ring-2 ring-mint/50",
  orange: "bg-orange/15 ring-2 ring-orange/45 motion-safe:scale-[1.06]",
  neon: "bg-neon/15 ring-2 ring-neon/50 motion-safe:scale-[1.06]",
  violet: "bg-violet/15 ring-2 ring-violet/45",
};

function inRange(i: number, s: ArrayState) {
  return !s.range || (i >= s.range[0] && i <= s.range[1]);
}

function PointerRow({ s, count }: { s: ArrayState; count: number }) {
  const labels: string[][] = Array.from({ length: count }, () => []);
  Object.entries(s.pointers ?? {}).forEach(([k, v]) => {
    if (v >= 0 && v < count) labels[v].push(k);
  });
  return (
    <>
      {labels.map((l, i) => (
        <div key={i} className="flex flex-col items-center font-mono text-[10px] text-sky leading-tight min-h-[14px]">
          {/* one name per line, never broken mid-word, even when the cell is narrower than the word */}
          {l.map((name) => (
            <span key={name} className="whitespace-nowrap">{name}</span>
          ))}
        </div>
      ))}
    </>
  );
}

export function ArrayBars({ s }: { s: ArrayState }) {
  const tags = equalTags(s); // 5ᵃ, 5ᵇ: shows whether equal values keep their order
  const max = Math.max(1, ...s.array);
  const n = s.array.length;
  const cols = { gridTemplateColumns: `repeat(${n}, minmax(26px, 1fr))` };
  return (
    <div className="min-w-fit">
      {s.held && (
        <div className="mb-3 inline-flex items-center gap-2 font-mono text-sm bg-violet/15 ring-1 ring-violet/40 px-3 py-1 rounded-full">
          <span className="text-muted-foreground text-xs">{s.held.label}</span>
          <span className="font-medium text-violet">{s.held.value}</span>
        </div>
      )}
      <div className="grid gap-1 items-end h-40" style={cols}>
        {s.array.map((v, i) => {
          const tone = cellTone(i, s);
          return (
            <div key={i} className={`flex flex-col justify-end h-full transition-opacity ${inRange(i, s) ? "" : "opacity-25"}`}>
              <div
                className={`w-full rounded-t-md transition-all duration-200 ${tone ? barBg[tone] : "bg-foreground/20"}`}
                style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="grid gap-0.5 sm:gap-1 mt-1" style={cols}>
        {s.array.map((v, i) => (
          <div key={i} className={`text-center font-mono text-[11px] ${inRange(i, s) ? "text-foreground" : "text-muted-foreground/50"}`}>
            {v}
            {tags[i] && <sup className="text-violet font-semibold">{tags[i]}</sup>}
          </div>
        ))}
        <PointerRow s={s} count={n} />
      </div>
      {s.aux && (
        <div className="mt-4">
          <div className="font-mono text-xs text-muted-foreground mb-1">tmp (merge buffer)</div>
          <div className="flex gap-1">
            {s.aux.map((v, i) => (
              <div key={i} className={`w-10 h-10 flex items-center justify-center font-mono text-sm border rounded-lg ${v === null ? "border-dashed border-border text-muted-foreground" : "border-orange/50 bg-orange/15"}`}>
                {v ?? "·"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ArrayCells({ s }: { s: ArrayState }) {
  const n = s.array.length;
  // Cells shrink on phones (to 18px, or more for wide values) so a 15-element
  // array fits a 390px screen instead of scrolling sideways; from the sm
  // breakpoint up they keep their full 2.75rem.
  const digits = Math.max(1, ...s.array.map((v) => String(v).length));
  const cols = { gridTemplateColumns: `repeat(${n}, minmax(var(--cell-min), 1fr))` };
  // --cell-narrow is set here, on the same element that defines --cell-min from it.
  const narrow = { ["--cell-narrow" as string]: `${Math.max(18, digits * 6 + 6)}px` } as CSSProperties;
  return (
    <div className="min-w-fit [--cell-min:var(--cell-narrow)] sm:[--cell-min:2.75rem]" style={narrow}>
      <div className="grid gap-0.5 sm:gap-2" style={cols}>
        {s.array.map((v, i) => {
          const tone = cellTone(i, s);
          return (
            <div
              key={i}
              className={`h-11 sm:h-14 flex items-center justify-center font-mono text-[11px] sm:text-base rounded-md sm:rounded-xl transition-all duration-300 motion-reduce:transition-none ${tone ? cellBorder[tone] : "bg-secondary"} ${inRange(i, s) ? "" : "opacity-25"}`}
            >
              {v}
            </div>
          );
        })}
      </div>
      <div className="grid gap-0.5 sm:gap-2 mt-1.5" style={cols}>
        {s.array.map((_, i) => (
          <div key={i} className="text-center font-mono text-[11px] text-muted-foreground">
            {i}
          </div>
        ))}
        <PointerRow s={s} count={n} />
      </div>
    </div>
  );
}

/* Insertion sort gets its own picture: the key lifts out of the row,
   bigger bars slide right underneath it, and it drops into the hole.
   Elements are keyed by s.ids so React moves them instead of repainting. */
const INS_BAR = 96; // tallest bar, px
const INS_LABEL = 18; // value label above each bar, px
const INS_ROW = INS_BAR + INS_LABEL;
const INS_LANE = INS_ROW + 22; // room above the row for the lifted key and its tag

function InsertionBars({ s }: { s: ArrayState }) {
  const n = Math.max(1, s.array.length);
  const max = Math.max(1, ...s.array, s.held?.value ?? 0);
  const split = s.split ?? 0;
  const h = (v: number) => Math.max(4, (v / max) * INS_BAR);
  const slotX = (i: number) => `${(i / n) * 100}%`;
  const width = `${100 / n}%`;
  const move = "transition-[left,bottom] duration-300 ease-out motion-reduce:transition-none";

  type Item = { id: number; slot: number; value: number; lifted: boolean };
  const items: Item[] = s.array.flatMap((v, i) => (i === s.gap ? [] : [{ id: s.ids?.[i] ?? i, slot: i, value: v, lifted: false }]));
  if (s.held && s.gap !== undefined) items.push({ id: s.held.id ?? -1, slot: s.gap, value: s.held.value, lifted: true });
  // Fixed DOM order: if React re-inserted the lifted key at the end, the browser would treat it
  // as a new element and skip the lift transition.
  items.sort((x, y) => x.id - y.id);

  const tone = (it: Item) => {
    if (it.lifted) return "bg-violet";
    if (s.write?.includes(it.slot)) return "bg-orange";
    if (s.compare?.includes(it.slot)) return "bg-neon";
    if (s.sorted?.includes(it.slot)) return "bg-mint";
    return it.slot < split ? "bg-foreground/45" : "bg-foreground/15";
  };

  const cols = { gridTemplateColumns: `repeat(${n}, minmax(36px, 1fr))` };
  const sortedAll = (s.sorted?.length ?? 0) >= s.array.length;

  return (
    <div className="min-w-fit">
      <div className="relative" style={{ height: INS_LANE + INS_ROW, minWidth: n * 36 }}>
        {/* the sorted "hand" */}
        {split > 0 && (
          <div
            className={`absolute bottom-0 left-0 rounded-lg bg-sky/10 border-r-2 border-dashed border-sky transition-[width] duration-300 ease-out motion-reduce:transition-none`}
            style={{ width: slotX(split), height: INS_ROW + 6 }}
          />
        )}

        {/* the hole the key will drop into */}
        {s.gap !== undefined && s.held && (
          <div className={`absolute bottom-0 px-[3px] ${move}`} style={{ left: slotX(s.gap), width }}>
            <div className="w-full rounded-t-[2px] border-2 border-b-0 border-dashed border-violet/70" style={{ height: h(s.held.value) }} />
          </div>
        )}

        {items.map((it) => (
          <div
            key={it.id}
            className={`absolute flex flex-col items-center justify-end px-[3px] ${move}`}
            style={{ left: slotX(it.slot), width, bottom: it.lifted ? INS_ROW + 14 : 0 }}
          >
            {it.lifted && (
              <span className="mb-0.5 font-mono text-[10px] text-violet">{s.held?.label}</span>
            )}
            <span className={`font-mono text-[11px] leading-[18px] ${it.lifted || it.slot < split || sortedAll ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
              {it.value}
            </span>
            <div className={`w-full rounded-t-[2px] transition-colors duration-200 ${tone(it)}`} style={{ height: h(it.value) }} />
          </div>
        ))}
      </div>

      <div className="grid mt-1" style={cols}>
        {s.array.map((_, i) => (
          <div key={i} className="text-center font-mono text-[10px] text-muted-foreground">
            {i}
          </div>
        ))}
        <PointerRow s={s} count={s.array.length} />
      </div>

      {!sortedAll && split > 0 && (
        <div className="grid mt-2 font-mono text-xs" style={cols}>
          <div className="text-sky border-t border-sky pt-1 text-center" style={{ gridColumn: `span ${Math.min(split, n)}` }}>
            sorted
          </div>
          {split < s.array.length && (
            <div className="text-muted-foreground border-t border-border pt-1 text-center" style={{ gridColumn: `span ${s.array.length - split}` }}>
              not yet looked at
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Divide-and-conquer picture for merge and quick sort: cut points open
   real gaps in the row (divide) and the call stack shows how deep the
   recursion is. Merge sort also gets a tmp lane under its piece that bars
   move down into and back up from (combine); quick sort gets a pivot line
   and spans for what each pointer has confirmed. Bars are keyed by
   s.ids / s.auxIds so they slide instead of repainting. */
const MS_SLOT = 10; // width units per array slot (positions are % of the row)
const MS_GAP = 4; // width units a cut opens between two pieces
const MS_BAR = 96;
const MS_LABEL = 18;
const MS_ROW = MS_BAR + MS_LABEL;
const MS_PTR = 20; // pointer labels under the row
const MS_TMP_TOP = MS_ROW + MS_PTR + 30;

function PieceBars({ s, call, buffer }: { s: ArrayState; call: string; buffer: boolean }) {
  const n = s.array.length;
  const aux = s.aux ?? [];
  const max = Math.max(1, ...s.array, ...aux.map((v) => v ?? 0));
  const h = (v: number) => Math.max(4, (v / max) * MS_BAR);
  const cuts = s.cuts ?? [];
  // unused gap space is split evenly on both sides so the row stays centred
  const lead = ((Math.max(0, n - 1) - cuts.length) * MS_GAP) / 2;
  const total = n * MS_SLOT + Math.max(0, n - 1) * MS_GAP;
  const pct = (u: number) => `${(u / total) * 100}%`;
  const x = (slot: number) => pct(lead + slot * MS_SLOT + cuts.filter((c) => c <= slot).length * MS_GAP);
  const xu = (slot: number) => lead + slot * MS_SLOT + cuts.filter((c) => c <= slot).length * MS_GAP;
  const slotW = pct(MS_SLOT);
  const [lo, hi] = s.range ?? [0, n - 1];
  const holes = new Set(s.holes ?? []);
  const sortedAll = (s.sorted?.length ?? 0) >= n;
  const baseCase = lo === hi && !s.aux;
  const move = "transition-[left,top,width] duration-300 ease-out motion-reduce:transition-none";

  type Item = { id: number; slot: number; value: number; inTmp: boolean; tone: string };
  const items: Item[] = [];
  s.array.forEach((v, i) => {
    if (holes.has(i)) return;
    const inRange = i >= lo && i <= hi;
    const tone = s.write?.includes(i)
      ? "bg-orange"
      : s.compare?.includes(i)
        ? "bg-neon"
        : s.pivot === i
          ? "bg-violet"
          : baseCase && inRange
            ? "bg-sky"
            : sortedAll || s.sorted?.includes(i)
              ? "bg-mint"
              : inRange
                ? "bg-foreground/45"
                : "bg-foreground/15";
    items.push({ id: s.ids?.[i] ?? i, slot: i, value: v, inTmp: false, tone });
  });
  aux.forEach((v, t) => {
    if (v === null) return;
    items.push({ id: s.auxIds?.[t] ?? n + t, slot: lo + t, value: v, inTmp: true, tone: s.auxWrite?.includes(t) ? "bg-orange" : "bg-foreground/45" });
  });
  // fixed DOM order, so React never re-inserts a node (that would skip its transition)
  items.sort((p, q) => p.id - q.id);

  const pointers: Record<number, string[]> = {};
  Object.entries(s.pointers ?? {}).forEach(([k, v]) => (pointers[v] ??= []).push(k));

  return (
    <div className="min-w-fit">
      <div className="mb-4 flex flex-wrap items-center gap-1.5 font-mono text-[11px] min-h-[24px]">
        <span className="text-xs text-muted-foreground mr-1">call stack</span>
        {(s.stack ?? []).length === 0 && <span className="text-muted-foreground">(empty)</span>}
        {(s.stack ?? []).map(([l, r], d, all) => (
          <span key={d} className="inline-flex items-center gap-1.5">
            {d > 0 && <span className="text-muted-foreground">›</span>}
            <span
              className={`px-1.5 py-0.5 rounded-lg border ${d === all.length - 1 ? "border-sky bg-sky/15 text-foreground" : "border-border text-muted-foreground"}`}
            >
              {call}({l}, {r})
            </span>
          </span>
        ))}
      </div>

      <div className="relative" style={{ minWidth: n * 40, height: buffer ? MS_TMP_TOP + MS_ROW : MS_ROW + 48 }}>
        {/* the tmp lane, always drawn so the layout never jumps */}
        {buffer && (
          <>
            <div className="absolute inset-x-0 rounded-lg bg-orange/[0.04] border border-dashed border-orange/25" style={{ top: MS_TMP_TOP - 22, bottom: -4 }} />
            <div className={`absolute left-2 font-mono text-xs ${s.aux ? "text-orange" : "text-muted-foreground"}`} style={{ top: MS_TMP_TOP - 18 }}>
              tmp {s.aux ? `[${s.aux.length}]` : "(empty until a merge)"}
            </div>
          </>
        )}

        {/* quick sort: everything under the line belongs left of the pivot, everything over it right */}
        {s.pivot !== undefined && (
          <div
            className={`absolute z-10 border-t border-dashed border-violet pointer-events-none ${move}`}
            style={{ left: x(lo), width: pct(xu(hi) + MS_SLOT - xu(lo)), top: MS_ROW - h(s.array[s.pivot]) }}
          />
        )}

        {(s.marks ?? []).map((m) => (
          <div
            key={m.label}
            className={`absolute border-t-2 border-violet/60 text-center font-mono text-[10px] text-violet ${move}`}
            style={{ left: x(m.from), width: pct(xu(m.to) + MS_SLOT - xu(m.from)), top: MS_ROW + 24 }}
          >
            {m.label}
          </div>
        ))}

        {/* the piece the current call owns */}
        {!sortedAll && (
          <div className={`absolute h-[2px] bg-sky ${move}`} style={{ left: x(lo), width: pct(xu(hi) + MS_SLOT - xu(lo)), top: MS_ROW + 1 }} />
        )}

        {/* slots whose bar has gone down into tmp */}
        {[...holes].map((i) => (
          <div key={`hole-${i}`} className="absolute px-[3px]" style={{ left: x(i), width: slotW, top: MS_ROW - h(s.array[i]) }}>
            <div className="w-full rounded-t-[2px] border border-b-0 border-dashed border-foreground/30" style={{ height: h(s.array[i]) }} />
          </div>
        ))}

        {/* the tmp buffer, one slot under each slot of the piece */}
        {aux.map((v, t) => (
          <div key={`tmp-${t}`} className="absolute px-[3px]" style={{ left: x(lo + t), width: slotW, top: MS_TMP_TOP + MS_ROW - 2 }}>
            <div className={`w-full h-[2px] ${v === null ? "bg-orange/40" : "bg-orange"}`} />
          </div>
        ))}

        {items.map((it) => (
          <div
            key={it.id}
            className={`absolute flex flex-col items-center justify-end px-[3px] ${move}`}
            style={{ left: x(it.slot), width: slotW, top: (it.inTmp ? MS_TMP_TOP : 0) + MS_ROW - h(it.value) - MS_LABEL }}
          >
            <span className="font-mono text-[11px] leading-[18px] text-foreground">{it.value}</span>
            <div className={`w-full rounded-t-[2px] transition-colors duration-200 ${it.tone}`} style={{ height: h(it.value) }} />
          </div>
        ))}

        {Object.entries(pointers).map(([slot, names]) => (
          <div
            key={names.join(",")}
            className={`absolute text-center font-mono text-[10px] text-sky ${move}`}
            style={{ left: x(Number(slot)), width: slotW, top: MS_ROW + 5 }}
          >
            {names.join(",")}
          </div>
        ))}
      </div>
    </div>
  );
}

function parseNumbers(text: string, maxLen = 14) {
  const nums = text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((t) => Number(t))
    .filter((x) => Number.isInteger(x) && x >= 0 && x <= 999);
  return nums.slice(0, maxLen);
}

function randomNumbers(len: number) {
  return Array.from({ length: len }, () => 1 + Math.floor(Math.random() * 98));
}

const SORT_TITLES: Record<SortAlgorithm, string> = {
  selection: "Selection sort",
  bubble: "Bubble sort",
  insertion: "Insertion sort",
  merge: "Merge sort",
  quick: "Quick sort",
};

export function SortVisualizer({ algorithm, initial = [38, 27, 43, 3, 9, 82, 10] }: { algorithm: SortAlgorithm; initial?: number[] }) {
  const [data, setData] = useState(initial);
  const [text, setText] = useState(initial.join(", "));
  const frames = useMemo(() => sortFrames(algorithm, data), [algorithm, data]);

  const apply = () => {
    const nums = parseNumbers(text);
    if (nums.length >= 2) setData(nums);
  };

  const legend: [string, string][] = algorithm === "merge" ? [
    ["bg-sky", "base case"],
    ["bg-neon", "comparing fronts"],
    ["bg-orange", "just moved"],
    ["bg-mint", "final position"],
  ] : algorithm === "quick" ? [
    ["bg-violet", "pivot"],
    ["bg-neon", "checking"],
    ["bg-orange", "swapped"],
    ["bg-sky", "base case"],
    ["bg-mint", "final position"],
  ] : algorithm === "insertion" ? [
    ["bg-violet", "key (in hand)"],
    ["bg-neon", "comparing with key"],
    ["bg-orange", "shifted right"],
    ["bg-mint", "final position"],
  ] : [
    ["bg-neon", "comparing"],
    ["bg-orange", "swapping"],
    ["bg-mint", "final position"],
  ];

  return (
    <Stepper
      title={SORT_TITLES[algorithm]}
      frames={frames}
      code={JAVA_SORT[algorithm]}
      legend={legend}
      render={(s) =>
        algorithm === "insertion" ? <InsertionBars s={s} /> : algorithm === "merge" ? (
          <PieceBars s={s} call="mergeSort" buffer />
        ) : algorithm === "quick" ? (
          <PieceBars s={s} call="quickSort" buffer={false} />
        ) : <ArrayBars s={s} />
      }
      inputs={
        <div className="flex flex-wrap items-stretch gap-2">
          <input
            aria-label="Numbers to sort"
            className={`${inputCls} flex-1 min-w-[180px]`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            spellCheck={false}
          />
          <button type="button" className={btn} onClick={apply}>
            Use these
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              const r = randomNumbers(data.length);
              setData(r);
              setText(r.join(", "));
            }}
          >
            Shuffle
          </button>
        </div>
      }
    />
  );
}

/** One input, sorted by selection and by bubble sort: did equal values keep their order? */
export function StabilityCompare({ initial = [3, 7, 8, 5, 2, 1, 9, 5, 4] }: { initial?: number[] }) {
  const start = sortFrames("bubble", initial)[0].state;
  const rows: [string, ArrayState][] = [["start", start]];
  for (const algo of ["selection", "bubble"] as const) {
    const frames = sortFrames(algo, initial);
    rows.push([SORT_TITLES[algo].toLowerCase(), frames[frames.length - 1].state]);
  }
  return (
    <FocusPanel title="Stable or not?" eyebrowTone="text-sky" cardClass={vizCard} headerClass={vizHeader}>
      {rows.map(([label, s], r) => {
        const tags = equalTags(s);
        const kept = keptEqualOrder(s);
        const cols = { gridTemplateColumns: `repeat(${s.array.length}, minmax(34px, 1fr))` };
        return (
          <div key={label} className="min-w-fit">
            <div className="mb-1 flex flex-wrap items-baseline gap-x-3 font-mono text-xs text-muted-foreground">
              {label}
              {r > 0 && kept !== null && (
                <span className={kept ? "text-mint" : "text-orange"}>{kept ? "equal values kept their order: stable" : "equal values swapped order: not stable"}</span>
              )}
            </div>
            <div className="grid gap-1" style={cols}>
              {s.array.map((v, i) => (
                <div key={i} className={`h-12 flex items-center justify-center font-mono text-base rounded-xl ${tags[i] ? cellBorder.violet : "bg-secondary"}`}>
                  {v}
                  {tags[i] && <sup className="text-violet font-semibold">{tags[i]}</sup>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </FocusPanel>
  );
}

export function SearchVisualizer({
  algorithm,
  array = [3, 8, 12, 17, 21, 29, 34, 40, 46, 51, 58, 63, 70, 77, 85],
  target = 58,
  cases = false,
}: {
  algorithm: SearchAlgorithm;
  array?: number[];
  target?: number;
  /** linear search only: buttons for the best and worst case, and the comparison count of each */
  cases?: boolean;
}) {
  const [t, setT] = useState(target);
  const [text, setText] = useState(String(target));
  const frames = useMemo(() => searchFrames(algorithm, array, t), [algorithm, array, t]);
  const pick = (v: number) => {
    setT(v);
    setText(String(v));
  };
  const n = array.length;
  const presets: [string, number][] = [
    ["best: first", array[0]],
    ["worst: last", array[n - 1]],
    ["worst: missing", Math.max(...array) + 1],
  ];
  return (
    <Stepper
      title={algorithm === "binary" ? "Binary search" : "Linear search"}
      frames={frames}
      code={JAVA_SEARCH[algorithm]}
      legend={[
        ["bg-neon", "checking"],
        ["bg-sky", "still possible"],
        ["bg-mint", "found"],
      ]}
      render={(s) => <ArrayCells s={s} />}
      inputs={
        <div className="flex flex-wrap items-center gap-2">
          <label className="font-mono text-xs text-muted-foreground" htmlFor={`target-${algorithm}`}>
            target
          </label>
          <input
            id={`target-${algorithm}`}
            className={`${inputCls} w-24`}
            value={text}
            inputMode="numeric"
            onChange={(e) => {
              setText(e.target.value);
              const v = Number(e.target.value);
              if (e.target.value !== "" && Number.isInteger(v)) setT(v);
            }}
          />
          <span className="text-xs text-muted-foreground">Try a number that isn't in the array, too.</span>
          {cases && (
            <>
              <div className="basis-full flex flex-wrap gap-2">
                {presets.map(([label, v]) => (
                  <button key={label} type="button" className={`${btn} ${t === v ? "border-foreground" : ""}`} onClick={() => pick(v)}>
                    {label} ({v})
                  </button>
                ))}
              </div>
              <div className="basis-full font-mono text-xs text-muted-foreground">
                n = <span className="text-foreground">{n}</span> · best <span className="text-foreground">1</span> · worst{" "}
                <span className="text-foreground">{n}</span> · average <span className="text-foreground">{+((n * (n + 1) / 2 + n) / (n + 1)).toFixed(1)}</span> comparisons
              </div>
            </>
          )}
        </div>
      }
    />
  );
}

/* ------------------------------- GCD ------------------------------- */

export function EuclidVisualizer({ m = 210, n = 45 }: { m?: number; n?: number }) {
  const [vals, setVals] = useState({ m, n });
  const [text, setText] = useState({ m: String(m), n: String(n) });
  const [order, setOrder] = useState<"correct" | "buggy">("correct");
  const frames = useMemo(() => gcdFrames(vals.m, vals.n, order), [vals, order]);
  const apply = () => {
    const a = Number(text.m);
    const b = Number(text.n);
    if (Number.isInteger(a) && Number.isInteger(b) && a > 0 && b >= 0 && a < 1e9 && b < 1e9) setVals({ m: a, n: b });
  };
  const setPreset = (pm: number, pn: number) => {
    setVals({ m: pm, n: pn });
    setText({ m: String(pm), n: String(pn) });
  };
  return (
    <Stepper
      title="Euclid's algorithm"
      frames={frames}
      code={order === "buggy" ? JAVA_GCD_BUGGY : JAVA_GCD}
      render={(s) => (
        <div className="flex flex-col gap-4">
          <div className="font-display text-2xl md:text-3xl font-semibold">
            gcd(<span className="text-sky">{s.m}</span>, <span className="text-orange">{s.n}</span>)
            {s.result !== undefined && (
              <span className={s.buggy ? "text-orange" : "text-mint"}>
                {" "}
                = {s.result} {s.buggy && "(Incorrect — assignment order bug)"}
              </span>
            )}
          </div>
          {s.buggy && (
            <div className="text-xs font-mono p-2.5 rounded-lg border border-orange/40 bg-orange/10 text-orange">
              <strong>Assignment bug active:</strong> n was overwritten with r before m received n, so m received r instead!
            </div>
          )}
          <table className="font-mono text-sm border-collapse w-full max-w-md">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-1.5 pr-4">m</th>
                <th className="text-left py-1.5 pr-4">n</th>
                <th className="text-left py-1.5">r = m mod n</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r, i) => {
                const latest = i === s.rows.length - 1;
                return (
                  <tr
                    key={i}
                    className={`border-b border-border/50 ${
                      latest ? (s.buggy ? "bg-orange/15" : "bg-neon/10") : ""
                    }`}
                  >
                    <td className="py-1.5 pr-4">{r.m}</td>
                    <td className="py-1.5 pr-4">{r.n}</td>
                    <td className="py-1.5">
                      {r.r === null ? (
                        <span className={s.buggy ? "text-orange" : "text-mint"}>stop — n is 0</span>
                      ) : (
                        r.r
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      inputs={
        <div className="flex flex-col gap-2 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Sequence:</span>
            <button
              type="button"
              className={`${btn} ${order === "correct" ? "border-mint text-mint bg-mint/10 font-semibold" : ""}`}
              onClick={() => setOrder("correct")}
            >
              m = n; n = r; (Correct)
            </button>
            <button
              type="button"
              className={`${btn} ${order === "buggy" ? "border-orange text-orange bg-orange/10 font-semibold" : ""}`}
              onClick={() => setOrder("buggy")}
            >
              n = r; m = n; (Overwrite bug)
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="m"
              className={`${inputCls} w-24`}
              value={text.m}
              inputMode="numeric"
              onChange={(e) => setText((t) => ({ ...t, m: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && apply()}
            />
            <input
              aria-label="n"
              className={`${inputCls} w-24`}
              value={text.n}
              inputMode="numeric"
              onChange={(e) => setText((t) => ({ ...t, n: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && apply()}
            />
            <button type="button" className={btn} onClick={apply}>
              Run gcd
            </button>
            <span className="text-muted-foreground ml-1">Presets:</span>
            <button type="button" className={btn} onClick={() => setPreset(210, 45)}>
              (210, 45)
            </button>
            <button type="button" className={btn} onClick={() => setPreset(60, 24)}>
              Bug demo: (60, 24)
            </button>
          </div>
        </div>
      }
    />
  );
}

/* ------------------------------ graphs ------------------------------ */

const DEFAULT_NODES: GraphNode[] = [
  { id: 0, x: 60, y: 120 },
  { id: 1, x: 170, y: 50 },
  { id: 2, x: 170, y: 190 },
  { id: 3, x: 290, y: 30 },
  { id: 4, x: 290, y: 130 },
  { id: 5, x: 290, y: 220 },
  { id: 6, x: 400, y: 90 },
];
const DEFAULT_EDGES: GraphEdge[] = [
  { from: 0, to: 1 },
  { from: 0, to: 2 },
  { from: 1, to: 3 },
  { from: 1, to: 4 },
  { from: 2, to: 4 },
  { from: 2, to: 5 },
  { from: 3, to: 6 },
  { from: 4, to: 6 },
];

const sameEdge = (e: GraphEdge, pair?: [number, number]) =>
  !!pair && ((e.from === pair[0] && e.to === pair[1]) || (e.from === pair[1] && e.to === pair[0]));

/** A small triangle just outside the target node's circle (r = 18), pointing along the edge. */
function Arrowhead({ from, to, className }: { from: { x: number; y: number }; to: { x: number; y: number }; className: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const tipX = to.x - ux * 19;
  const tipY = to.y - uy * 19;
  const bx = tipX - ux * 10;
  const by = tipY - uy * 10;
  const pts = `${tipX},${tipY} ${bx - uy * 5},${by + ux * 5} ${bx + uy * 5},${by - ux * 5}`;
  return <polygon points={pts} className={`${className} transition-colors`} />;
}

export function GraphSvg({
  nodes,
  edges,
  edgeClass,
  nodeClass,
  showWeights,
  directed,
  onNodeClick,
  onNodeHover,
  onEdgeHover,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  edgeClass: (e: GraphEdge, i: number) => { stroke: string; width: number; dash?: string };
  nodeClass: (id: number) => string;
  showWeights?: boolean;
  directed?: boolean; // draw an arrowhead where each edge meets its "to" node
  onNodeClick?: (id: number) => void;
  onNodeHover?: (id: number | null) => void;
  onEdgeHover?: (edge: [number, number] | null) => void;
}) {
  const w = Math.max(...nodes.map((n) => n.x)) + 50;
  const h = Math.max(...nodes.map((n) => n.y)) + 40;
  const pos = new Map(nodes.map((n) => [n.id, n]));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block mx-auto max-w-full h-auto text-foreground" role="img" aria-label="Graph">
      {edges.map((e, i) => {
        const a = pos.get(e.from)!;
        const b = pos.get(e.to)!;
        const st = edgeClass(e, i);
        return (
          <g
            key={i}
            onMouseEnter={() => onEdgeHover?.([e.from, e.to])}
            onMouseLeave={() => onEdgeHover?.(null)}
            className={onEdgeHover ? "cursor-pointer" : ""}
          >
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`${st.stroke} transition-all`} strokeWidth={st.width} strokeDasharray={st.dash} strokeLinecap="round" />
            {directed && <Arrowhead from={a} to={b} className={st.stroke.replace("stroke-", "fill-")} />}
            {showWeights && e.weight !== undefined && (
              <g>
                <rect x={(a.x + b.x) / 2 - 12} y={(a.y + b.y) / 2 - 9} width={24} height={18} rx={9} className="fill-card stroke-border" strokeWidth={1} />
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} className="font-mono fill-current">
                  {e.weight}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {nodes.map((n) => (
        <g
          key={n.id}
          onClick={() => onNodeClick?.(n.id)}
          onMouseEnter={() => onNodeHover?.(n.id)}
          onMouseLeave={() => onNodeHover?.(null)}
          className={onNodeClick || onNodeHover ? "cursor-pointer" : ""}
        >
          <circle cx={n.x} cy={n.y} r={19} strokeWidth={2} className={`transition-colors duration-300 ${nodeClass(n.id)}`} />
          <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" fontSize={14} className="font-mono fill-current font-medium select-none">
            {n.label ?? n.id}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Chips({ label, items, tone, hint }: { label: string; items: (number | string)[]; tone: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
      <span className="w-14 text-xs text-muted-foreground">{label}</span>
      {items.length === 0 ? (
        <span className="text-muted-foreground italic">empty</span>
      ) : (
        items.map((v, i) => (
          <span key={`${v}-${i}`} className={`px-2.5 py-1 border rounded-full ${tone}`}>
            {v}
          </span>
        ))
      )}
      {hint && items.length > 0 && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function GraphTraversal({
  algorithm = "bfs",
  nodes: customNodes,
  edges: customEdges,
  start: customStart,
  directed = false,
  preset: initialPreset,
  allowPresetChange = true,
}: {
  algorithm?: "bfs" | "dfs";
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  start?: number;
  directed?: boolean;
  preset?: string;
  allowPresetChange?: boolean;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string>(initialPreset ?? "default");
  const [kind, setKind] = useState(algorithm);

  const activePreset = GRAPH_PRESETS[selectedPreset] ?? GRAPH_PRESETS.default;
  const nodes = customNodes ?? (initialPreset || selectedPreset !== "default" ? activePreset.nodes : DEFAULT_NODES);
  const edges = customEdges ?? (initialPreset || selectedPreset !== "default" ? activePreset.edges : DEFAULT_EDGES);
  const start = customStart ?? activePreset.start ?? 0;

  const names = useMemo(() => {
    const out: string[] = [];
    for (const n of nodes) out[n.id] = n.label ?? String(n.id);
    return out;
  }, [nodes]);
  const frames = useMemo(() => traversalFrames(kind, nodes.length, edges, start, directed, names), [kind, nodes, edges, start, directed, names]);
  return (
    <Stepper
      title={kind === "bfs" ? "Breadth-first search" : "Depth-first search"}
      frames={frames}
      code={JAVA_TRAVERSAL[kind]}
      legend={[
        ["bg-neon", "current / checking"],
        ["bg-sky", "seen, waiting"],
        ["bg-mint", "visited / tree edge"],
      ]}
      render={(s) => (
        <div className="flex flex-col gap-4">
          <GraphSvg
            nodes={nodes}
            edges={edges}
            directed={directed}
            edgeClass={(e) =>
              sameEdge(e, s.checking)
                ? { stroke: "stroke-neon", width: 4 }
                : s.treeEdges.some((t) => sameEdge(e, t))
                  ? { stroke: "stroke-mint", width: 3.5 }
                  : { stroke: "stroke-border", width: 2 }
            }
            nodeClass={(id) =>
              id === s.current
                ? "fill-neon/40 stroke-neon"
                : s.order.includes(id)
                  ? "fill-mint/25 stroke-mint"
                  : s.visited.includes(id)
                    ? "fill-sky/15 stroke-sky"
                    : "fill-card stroke-current"
            }
          />
          <div className="flex flex-col gap-2">
            <Chips label={kind === "bfs" ? "queue" : "stack"} items={s.frontier.map((v) => names[v])} tone="border-sky bg-sky/10" hint={kind === "bfs" ? "← front … back" : "bottom … top →"} />
            <Chips label="order" items={s.order.map((v) => names[v])} tone="border-mint bg-mint/10" />
          </div>
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          <Toggle<"bfs" | "dfs">
            value={kind}
            onChange={setKind}
            options={[
              ["bfs", "BFS (queue)"],
              ["dfs", "DFS (stack)"],
            ]}
          />
          {allowPresetChange && !customNodes && (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-muted-foreground hidden sm:inline">Graph:</span>
              <select
                aria-label="Select graph preset"
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="px-2.5 py-1 rounded-full border border-border bg-card text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-sky"
              >
                <option value="default">Default 7-node</option>
                <option value="lecture-bfs">Lecture 10-node (BFS)</option>
                <option value="lecture-dfs">Lecture 7-node A–G (DFS)</option>
                <option value="spanning-as">Lecture 9-node A–S Spanning</option>
              </select>
            </div>
          )}
        </div>
      }
    />
  );
}

/* ------------------------------- MST ------------------------------- */

const MST_NODES: GraphNode[] = [
  { id: 0, x: 50, y: 120 },
  { id: 1, x: 170, y: 40 },
  { id: 2, x: 170, y: 200 },
  { id: 3, x: 300, y: 120 },
  { id: 4, x: 420, y: 40 },
  { id: 5, x: 420, y: 200 },
];
const MST_EDGES: GraphEdge[] = [
  { from: 0, to: 1, weight: 4 },
  { from: 0, to: 2, weight: 3 },
  { from: 1, to: 2, weight: 1 },
  { from: 1, to: 3, weight: 2 },
  { from: 2, to: 3, weight: 4 },
  { from: 3, to: 4, weight: 2 },
  { from: 4, to: 5, weight: 6 },
  { from: 3, to: 5, weight: 5 },
  { from: 2, to: 5, weight: 7 },
];

export function MstVisualizer({
  algorithm = "prim",
  nodes = MST_NODES,
  edges = MST_EDGES,
}: {
  algorithm?: "prim" | "kruskal";
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}) {
  const [kind, setKind] = useState(algorithm);
  const frames = useMemo(() => {
    const names: string[] = [];
    for (const n of nodes) names[n.id] = n.label ?? String(n.id);
    return mstFrames(kind, nodes.length, edges, names);
  }, [kind, nodes, edges]);
  return (
    <Stepper
      title={kind === "prim" ? "Prim's algorithm" : "Kruskal's algorithm"}
      frames={frames}
      code={JAVA_MST[kind]}
      legend={[
        ["bg-neon", "candidate / considering"],
        ["bg-mint", "in the tree"],
        ["bg-orange", "rejected (cycle)"],
      ]}
      render={(s) => (
        <GraphSvg
          nodes={nodes}
          edges={edges}
          showWeights
          edgeClass={(_, i) =>
            i === s.considering && !s.accepted.includes(i) && !s.rejected.includes(i)
              ? { stroke: "stroke-neon", width: 5 }
              : s.accepted.includes(i)
                ? { stroke: "stroke-mint", width: 4.5 }
                : s.rejected.includes(i)
                  ? { stroke: "stroke-orange", width: 2, dash: "5 4" }
                  : s.candidates.includes(i)
                    ? { stroke: "stroke-neon", width: 2.5, dash: "2 3" }
                    : { stroke: "stroke-border", width: 2 }
          }
          nodeClass={(id) => (s.inTree.includes(id) ? "fill-mint/25 stroke-mint" : "fill-card stroke-current")}
        />
      )}
      inputs={
        <Toggle<"prim" | "kruskal">
          value={kind}
          onChange={setKind}
          options={[
            ["prim", "Prim"],
            ["kruskal", "Kruskal"],
          ]}
        />
      }
    />
  );
}

/* ----------------------------- knapsack ----------------------------- */

const DEFAULT_ITEMS: KnapsackItem[] = [
  { name: "item 1", weight: 2, value: 12 },
  { name: "item 2", weight: 1, value: 10 },
  { name: "item 3", weight: 3, value: 20 },
  { name: "item 4", weight: 2, value: 15 },
];

export function KnapsackTable({ items = DEFAULT_ITEMS, capacity = 5 }: { items?: KnapsackItem[]; capacity?: number }) {
  const frames = useMemo(() => knapsackFrames(items, capacity), [items, capacity]);
  const eq = (a?: [number, number], i?: number, w?: number) => !!a && a[0] === i && a[1] === w;
  return (
    <Stepper
      title="0/1 knapsack: filling the table"
      frames={frames}
      code={JAVA_KNAPSACK}
      legend={[
        ["bg-neon", "cell being filled"],
        ["bg-sky", "cells it reads"],
        ["bg-violet", "walking back"],
        ["bg-mint", "item taken"],
      ]}
      render={(s) => (
        <table className="font-mono text-xs border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-xs text-muted-foreground font-normal">item (w, v) \ capacity</th>
              {Array.from({ length: capacity + 1 }, (_, w) => (
                <th key={w} className="px-2 py-1.5 w-10 text-center text-muted-foreground font-normal">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.table.map((row, i) => (
              <tr key={i}>
                <td className={`px-2 py-1.5 whitespace-nowrap ${i > 0 && s.chosen.includes(i - 1) ? "text-mint font-semibold" : "text-muted-foreground"}`}>
                  {i === 0 ? "none" : `${items[i - 1].name} (${items[i - 1].weight}, ${items[i - 1].value})`}
                </td>
                {row.map((v, w) => {
                  const cls = eq(s.cell, i, w)
                    ? "bg-neon/30 border-neon"
                    : s.deps?.some((d) => d[0] === i && d[1] === w)
                      ? "bg-sky/20 border-sky"
                      : eq(s.trace, i, w)
                        ? "bg-violet/25 border-violet"
                        : "border-border";
                  return (
                    <td key={w} className={`w-10 h-8 text-center border transition-colors ${cls}`}>
                      {v ?? ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    />
  );
}

/* ------------------------------ growth ------------------------------ */

const GROWTH_NS = [10, 20, 30, 50, 100, 1_000, 10_000, 100_000, 1_000_000];

export function GrowthTable({ initialN = 100 }: { initialN?: number }) {
  const [i, setI] = useState(Math.max(0, GROWTH_NS.indexOf(initialN)));
  const n = GROWTH_NS[i];
  return (
    <FocusPanel title="How the work grows with n" eyebrowTone="text-sky" cardClass={vizCard} headerClass={vizHeader}>
      <label className="flex flex-wrap items-center gap-4 font-mono text-xs">
        <span className="text-muted-foreground">input size</span>
        <input type="range" min={0} max={GROWTH_NS.length - 1} value={i} onChange={(e) => setI(Number(e.target.value))} className="flex-1 min-w-[160px] accent-current" aria-label="Input size n" />
        <span className="font-display text-xl font-semibold text-violet w-28">n = {n.toLocaleString("en-US")}</span>
      </label>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs border-collapse">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left py-2 pr-4 font-normal">growth</th>
              <th className="text-right py-2 pr-4 font-normal">basic operations</th>
              <th className="text-right py-2 font-normal">time at ~10⁸ ops/sec</th>
            </tr>
          </thead>
          <tbody>
            {GROWTH.map((g) => {
              const ops = g.f(n);
              const bad = ops / 1e8 > 1;
              return (
                <tr key={g.label} className="border-b border-border/50">
                  <td className="py-2 pr-4">
                    <span className="font-semibold">{g.label}</span> <span className="text-muted-foreground">{g.name}</span>
                  </td>
                  <td className="py-2 pr-4 text-right">{formatOps(ops)}</td>
                  <td className={`py-2 text-right ${bad ? "text-orange" : "text-mint"}`}>{humanTime(ops)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Drag the slider. Up to n = 30 every row looks harmless. At a million, the slow rows take hours or longer, and avoiding them is what this course is about.
      </p>
    </FocusPanel>
  );
}

/* ----------------------------- foundations ----------------------------- */

export function FindMaxVisualizer({
  initial = [8, 1, 4, 9, 3, 7],
}: {
  initial?: number[];
}) {
  const [array, setArray] = useState<number[]>(initial);
  const [text, setText] = useState(initial.join(", "));
  const frames = useMemo(() => findMaxFrames(array), [array]);

  const presets: [string, number[]][] = [
    ["Lesson instance", [8, 1, 4, 9, 3, 7]],
    ["All negative", [-5, -2, -9, -1, -8]],
    ["Descending", [9, 7, 5, 3, 1]],
    ["Ascending", [2, 4, 6, 8, 10]],
  ];

  const pick = (arr: number[]) => {
    setArray(arr);
    setText(arr.join(", "));
  };

  const applyCustom = () => {
    const nums = text
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s !== "" && !isNaN(Number(s)))
      .map(Number);
    if (nums.length > 0 && nums.length <= 16) {
      setArray(nums);
    }
  };

  return (
    <Stepper
      title="Finding the maximum: findMax"
      frames={frames}
      code={JAVA_FIND_MAX}
      legend={[
        ["bg-neon", "comparing / checking"],
        ["bg-mint", "current max"],
        ["bg-orange", "new max recorded"],
      ]}
      render={(s) => <ArrayCells s={s} />}
      inputs={
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">Presets:</span>
            {presets.map(([label, arr]) => (
              <button
                key={label}
                type="button"
                className={`${btn} ${JSON.stringify(array) === JSON.stringify(arr) ? "border-foreground" : ""}`}
                onClick={() => pick(arr)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="font-mono text-xs text-muted-foreground" htmlFor="findmax-custom">
              Custom array:
            </label>
            <input
              id="findmax-custom"
              className={`${inputCls} min-w-[200px] flex-1`}
              value={text}
              placeholder="e.g. 12, 4, 19, 7"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCustom();
              }}
            />
            <button type="button" className={`${btn} ${btnPrimary}`} onClick={applyCustom}>
              Load
            </button>
            <span className="text-xs text-muted-foreground">Up to 16 numbers.</span>
          </div>
        </div>
      }
    />
  );
}

export function NestedLoopGrid({ initialN = 4 }: { initialN?: number }) {
  const [n, setN] = useState(initialN);
  const [mode, setMode] = useState<LoopGridMode>("dependent");
  const [activeStep, setActiveStep] = useState<number>(-1);

  const info = useMemo(() => loopGridInfo(n, mode), [n, mode]);

  useEffect(() => {
    setActiveStep(-1);
  }, [n, mode]);

  const currentCell = activeStep >= 0 && activeStep < info.activeCells.length ? info.activeCells[activeStep] : null;

  return (
    <FocusPanel
      title="Nested loop execution geometry"
      eyebrowTone="text-sky"
      cardClass={vizCard}
      headerClass={vizHeader}
      extraHeader={
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            type="button"
            className={`${btn} ${mode === "dependent" ? "border-foreground bg-secondary font-semibold" : ""}`}
            onClick={() => setMode("dependent")}
          >
            Dependent (j ≤ i)
          </button>
          <button
            type="button"
            className={`${btn} ${mode === "independent" ? "border-foreground bg-secondary font-semibold" : ""}`}
            onClick={() => setMode("independent")}
          >
            Independent (j ≤ n)
          </button>
          <button
            type="button"
            className={`${btn} ${mode === "fixed" ? "border-foreground bg-secondary font-semibold" : ""}`}
            onClick={() => setMode("fixed")}
          >
            Fixed inner (j ≤ 3)
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <label className="flex items-center gap-3">
          <span className="text-muted-foreground">Outer loop size (n):</span>
          <input
            type="range"
            min={2}
            max={8}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-28 sm:w-36 accent-sky"
            aria-label="Outer loop size n"
          />
          <span className="font-display text-lg font-semibold text-sky w-10">n = {n}</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={btn}
            disabled={activeStep <= -1}
            onClick={() => setActiveStep((s) => Math.max(-1, s - 1))}
          >
            ← Prev
          </button>
          <button
            type="button"
            className={`${btn} ${btnPrimary}`}
            disabled={activeStep >= info.activeCells.length - 1}
            onClick={() => setActiveStep((s) => Math.min(info.activeCells.length - 1, s + 1))}
          >
            Step ({activeStep + 1}/{info.activeCells.length})
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => setActiveStep(activeStep === -1 ? info.activeCells.length - 1 : -1)}
          >
            {activeStep === -1 ? "Show all" : "Reset"}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 py-2">
        <div className="text-xs font-mono text-muted-foreground text-center">
          Columns: inner loop <span className="text-foreground">j = 1 … {n}</span> · Rows: outer loop <span className="text-foreground">i = 1 … {n}</span>
        </div>
        <div className="overflow-x-auto p-2 w-full flex justify-center">
          <div className="flex flex-col gap-1.5 min-w-fit">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <span className="w-8 text-right pr-2">i \ j</span>
              {Array.from({ length: n }, (_, idx) => (
                <span key={idx} className="w-8 sm:w-10 text-center">
                  {idx + 1}
                </span>
              ))}
              <span className="w-16 pl-2 text-left">passes</span>
            </div>

            {Array.from({ length: n }, (_, rowIdx) => {
              const iVal = rowIdx + 1;
              const limit = info.rowCounts[rowIdx];
              return (
                <div key={rowIdx} className="flex items-center gap-1.5">
                  <span className="w-8 font-mono text-xs text-muted-foreground text-right pr-2">
                    i={iVal}
                  </span>
                  {Array.from({ length: n }, (_, colIdx) => {
                    const jVal = colIdx + 1;
                    const isActive = jVal <= limit;
                    const isCurrent = currentCell && currentCell[0] === iVal && currentCell[1] === jVal;
                    const stepIdx = info.activeCells.findIndex((c) => c[0] === iVal && c[1] === jVal);
                    const isExecuted = activeStep === -1 || stepIdx <= activeStep;

                    return (
                      <div
                        key={colIdx}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-mono text-xs transition-all duration-200 motion-reduce:transition-none border ${
                          !isActive
                            ? "bg-secondary/20 border-dashed border-border/40 text-muted-foreground/30 select-none"
                            : isCurrent
                            ? "bg-neon border-neon text-black font-bold ring-2 ring-neon/50 scale-105"
                            : isExecuted
                            ? "bg-sky/20 border-sky/50 text-foreground font-semibold"
                            : "bg-secondary/60 border-border text-muted-foreground"
                        }`}
                        title={isActive ? `Pass i=${iVal}, j=${jVal}` : `j=${jVal} > limit, does not run`}
                      >
                        {isActive ? `${iVal},${jVal}` : "·"}
                      </div>
                    );
                  })}
                  <span className="w-16 pl-2 font-mono text-xs text-muted-foreground">
                    {limit} {limit === 1 ? "step" : "steps"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/60">
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3.5 font-mono text-xs">
          <div className="text-muted-foreground mb-1">Total operations:</div>
          <div className="text-sm font-semibold text-foreground mb-1">{info.formula}</div>
          <div className="text-sky font-semibold text-base">{info.bigO} time complexity</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3.5 text-xs text-muted-foreground leading-relaxed">
          {mode === "dependent" && (
            <>
              The active cells form a <strong className="text-foreground">triangle</strong>. The sum is{" "}
              <code className="text-foreground">n(n+1)/2 = ½n² + ½n</code>. Dropping lower-order terms and the constant factor{" "}
              <code className="text-foreground">½</code> yields <strong className="text-foreground">O(n²)</strong>.
            </>
          )}
          {mode === "independent" && (
            <>
              Every row runs all <strong className="text-foreground">n</strong> iterations, forming a full{" "}
              <code className="text-foreground">n × n</code> square. Total operations: <code className="text-foreground">n²</code>, which is{" "}
              <strong className="text-foreground">O(n²)</strong>.
            </>
          )}
          {mode === "fixed" && (
            <>
              The inner loop runs a fixed <strong className="text-foreground">3 times</strong> regardless of n. Total operations:{" "}
              <code className="text-foreground">3n</code>. Dropping constant factor 3 yields <strong className="text-foreground">O(n)</strong> (linear).
            </>
          )}
        </div>
      </div>
    </FocusPanel>
  );
}

export function ArraySwapVisualizer({
  initial = [5, 9, 14, 2],
  x = 0,
  y = 1,
}: {
  initial?: number[];
  x?: number;
  y?: number;
}) {
  const [mode, setMode] = useState<"correct" | "buggy">("correct");
  const frames = useMemo(() => swapFrames(initial, x, y, mode), [initial, x, y, mode]);
  const code = mode === "correct" ? JAVA_SWAP.correct : JAVA_SWAP.buggy;

  return (
    <Stepper
      title="The swap method: temporary variable vs the overwrite bug"
      frames={frames}
      code={code}
      legend={[
        ["bg-violet", "temporary variable (temp)"],
        ["bg-neon", "indices to swap"],
        ["bg-orange", "written / modified slot"],
      ]}
      render={(s: SwapState) => (
        <div className="flex flex-col gap-5 items-center py-2">
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-muted-foreground font-semibold">temp:</span>
            <div
              className={`w-14 h-12 rounded-xl flex items-center justify-center font-mono text-base border-2 transition-all duration-300 motion-reduce:transition-none ${
                s.temp !== null
                  ? "border-violet bg-violet/20 text-foreground font-bold shadow-sm ring-2 ring-violet/40"
                  : "border-dashed border-border bg-secondary/30 text-muted-foreground/40"
              }`}
            >
              {s.temp !== null ? s.temp : "empty"}
            </div>
            {s.buggy && <span className="text-orange font-semibold">(omitted in buggy version)</span>}
          </div>

          <div className="flex flex-col items-center gap-1.5 w-full max-w-sm">
            <div className="text-xs font-mono text-muted-foreground">array slots</div>
            <div className="grid grid-cols-4 gap-2.5 w-full">
              {s.array.map((val, idx) => {
                const isTarget = idx === s.x || idx === s.y;
                const isWritten = s.write?.includes(idx);
                const isComparing = s.compare?.includes(idx);
                return (
                  <div
                    key={idx}
                    className={`h-14 flex flex-col items-center justify-center font-mono rounded-xl border-2 transition-all duration-300 motion-reduce:transition-none ${
                      isWritten
                        ? "border-orange bg-orange/20 text-foreground font-bold ring-2 ring-orange/40 scale-105"
                        : isComparing
                        ? "border-neon bg-neon/15 text-foreground font-bold ring-2 ring-neon/40"
                        : isTarget
                        ? "border-border/80 bg-secondary/50 text-foreground"
                        : "border-border/40 bg-secondary/20 text-muted-foreground opacity-60"
                    }`}
                  >
                    <span className="text-base font-semibold">{val}</span>
                    <span className="text-[10px] text-muted-foreground">[{idx}]</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Mode:</span>
            <button
              type="button"
              className={`${btn} ${mode === "correct" ? "border-foreground bg-secondary font-semibold" : ""}`}
              onClick={() => setMode("correct")}
            >
              Correct (with temp)
            </button>
            <button
              type="button"
              className={`${btn} ${mode === "buggy" ? "border-orange text-orange bg-orange/10 font-semibold" : ""}`}
              onClick={() => setMode("buggy")}
            >
              The bug (without temp)
            </button>
          </div>
          <span className="text-muted-foreground">
            Swapping indices <span className="text-foreground">{x}</span> and <span className="text-foreground">{y}</span>
          </span>
        </div>
      }
    />
  );
}

export function ArrayReferenceVisualizer() {
  const [mode, setMode] = useState<"alias" | "clone">("alias");
  const [mutated, setMutated] = useState(false);

  const heapA = mutated && mode === "alias" ? [99, 24, 16] : [12, 24, 16];
  const heapB = mutated && mode === "clone" ? [99, 24, 16] : [12, 24, 16];

  const handleModeChange = (newMode: "alias" | "clone") => {
    setMode(newMode);
    setMutated(false);
  };

  return (
    <FocusPanel
      title="The reference trap: int[] copy = original vs .clone()"
      eyebrowTone="text-orange"
      cardClass={vizCard}
      headerClass={vizHeader}
      extraHeader={
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <button
            type="button"
            className={`${btn} ${mode === "alias" ? "border-orange bg-orange/10 text-orange font-semibold" : ""}`}
            onClick={() => handleModeChange("alias")}
          >
            copy = original (alias)
          </button>
          <button
            type="button"
            className={`${btn} ${mode === "clone" ? "border-mint bg-mint/10 text-mint font-semibold" : ""}`}
            onClick={() => handleModeChange("clone")}
          >
            copy = original.clone() (independent)
          </button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-2 items-start py-2">
        <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 flex flex-col gap-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="font-semibold text-foreground tracking-wide uppercase">Stack (Variables)</span>
            <span className="text-[11px] text-muted-foreground">stores memory addresses</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
              <span className="font-semibold text-foreground">original</span>
              <div className="flex items-center gap-1.5 text-sky font-semibold">
                <span>→ ref @0x100</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card">
              <span className="font-semibold text-foreground">copy</span>
              <div className="flex items-center gap-1.5 font-semibold">
                {mode === "alias" ? (
                  <span className="text-orange">→ ref @0x100 (same!)</span>
                ) : (
                  <span className="text-mint">→ ref @0x200 (new!)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-secondary/20 p-4 flex flex-col gap-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="font-semibold text-foreground tracking-wide uppercase">Heap (Array Objects)</span>
            <span className="text-[11px] text-muted-foreground">stores actual element values</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="p-3 rounded-lg border border-border bg-card flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-semibold text-sky">Object @0x100</span>
                <span>{mode === "alias" ? "referenced by original & copy" : "referenced by original"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {heapA.map((val, idx) => (
                  <div
                    key={idx}
                    className={`py-2 rounded-md font-mono text-sm border ${
                      idx === 0 && mutated && mode === "alias"
                        ? "bg-orange/20 border-orange text-foreground font-bold ring-2 ring-orange/40"
                        : "bg-secondary/40 border-border/60 text-foreground"
                    }`}
                  >
                    <div>{val}</div>
                    <div className="text-[10px] text-muted-foreground">[{idx}]</div>
                  </div>
                ))}
              </div>
            </div>

            {mode === "clone" && (
              <div className="p-3 rounded-lg border border-mint/40 bg-card flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold text-mint">Object @0x200 (clone)</span>
                  <span>referenced by copy</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {heapB.map((val, idx) => (
                    <div
                      key={idx}
                      className={`py-2 rounded-md font-mono text-sm border ${
                        idx === 0 && mutated
                          ? "bg-mint/20 border-mint text-foreground font-bold ring-2 ring-mint/40"
                          : "bg-secondary/40 border-border/60 text-foreground"
                      }`}
                    >
                      <div>{val}</div>
                      <div className="text-[10px] text-muted-foreground">[{idx}]</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`${btn} ${mutated ? "border-border" : btnPrimary}`}
            onClick={() => setMutated(true)}
            disabled={mutated}
          >
            Execute: copy[0] = 99
          </button>
          {mutated && (
            <button type="button" className={btn} onClick={() => setMutated(false)}>
              Reset
            </button>
          )}
        </div>

        <div className="text-xs font-mono">
          {!mutated ? (
            <span className="text-muted-foreground">Click "Execute" to mutate copy[0] and observe the side effect.</span>
          ) : mode === "alias" ? (
            <span className="text-orange font-semibold">
              ⚠️ Trap triggered: original[0] also changed to 99! Both variables share one array in the heap.
            </span>
          ) : (
            <span className="text-mint font-semibold">
              ✓ Independent: original[0] remained 12! .clone() allocated a separate heap array.
            </span>
          )}
        </div>
      </div>
    </FocusPanel>
  );
}

/* ----------------------------- practice ----------------------------- */

export type LeetCodeProblem = {
  id: number;
  title: string;
  slug: string;
  why: string;
  difficulty?: "Easy" | "Medium" | "Hard";
};

export function LeetCodeProblems({ problems, note = "solve them in Java" }: { problems: LeetCodeProblem[]; note?: string }) {
  return (
    <section className="not-prose my-10 rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-baseline justify-between gap-3 flex-wrap">
        <div className="eyebrow text-orange">Practice on LeetCode</div>
        <span className="font-mono text-xs text-muted-foreground">{note}</span>
      </div>
      <ul className="divide-y divide-border">
        {problems.map((p) => {
          const diff = p.difficulty ?? "Easy";
          return (
            <li key={p.id}>
              <a
                href={`https://leetcode.com/problems/${p.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-4 px-5 py-3.5 hover:bg-foreground/5 transition-colors"
              >
                <span className="font-mono text-xs text-muted-foreground w-12 shrink-0 pt-0.5">#{p.id}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-display font-semibold group-hover:underline underline-offset-4">{p.title}</span>
                    <span className={`font-mono text-xs ${diff === "Easy" ? "text-mint" : "text-orange"}`}>
                      {diff === "Easy" ? "easy" : `stretch · ${diff.toLowerCase()}`}
                    </span>
                  </span>
                  <span className="block text-sm text-muted-foreground leading-relaxed mt-0.5">{p.why}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors pt-0.5">↗</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* -------------------------- merge sort tree -------------------------- */

type Piece = { lo: number; hi: number; carried: boolean };

/** Pieces at every depth of the recursion, using the same mid as the Java code. */
function splitLevels(n: number) {
  const levels: Piece[][] = [[{ lo: 0, hi: n - 1, carried: false }]];
  while (levels[levels.length - 1].some((p) => p.hi > p.lo)) {
    const next: Piece[] = [];
    for (const p of levels[levels.length - 1]) {
      if (p.hi === p.lo) {
        next.push({ ...p, carried: true });
      } else {
        const mid = Math.floor((p.lo + p.hi) / 2);
        next.push({ lo: p.lo, hi: mid, carried: false }, { lo: mid + 1, hi: p.hi, carried: false });
      }
    }
    levels.push(next);
  }
  return levels;
}

export function MergeSortTree({ input = [38, 27, 43, 3, 9, 82, 10] }: { input?: number[] }) {
  const n = input.length;
  const levels = useMemo(() => splitLevels(n), [n]);
  const depth = levels.length - 1;

  // Split rows go down to single elements; merge rows replay the same ranges back up, sorted.
  const rows = [
    ...levels.map((pieces, d) => ({
      pieces,
      sorted: d === depth,
      label: d === 0 ? "input" : d === depth ? "size 1" : "split",
      kind: d === 0 ? "input" : d === depth ? "base" : "split",
    })),
    ...levels
      .slice(0, depth)
      .reverse()
      .map((pieces, i) => ({
        pieces: pieces.map((p) => ({ ...p, carried: p.carried || p.hi === p.lo })),
        sorted: true,
        label: i === depth - 1 ? "sorted" : "merge",
        kind: i === depth - 1 ? "output" : "merge",
      })),
  ];

  const boxTone: Record<string, string> = {
    input: "border-neon bg-neon/10",
    split: "border-foreground/30",
    base: "border-sky/70 bg-sky/10",
    merge: "border-orange/70 bg-orange/10",
    output: "border-mint bg-mint/15",
  };

  return (
    <FocusPanel
      title="Merge sort, level by level"
      eyebrowTone="text-sky"
      legend={[["bg-sky", "base case"], ["bg-orange", "merged"], ["bg-mint", "done"]]}
      cardClass={vizCard}
      headerClass={vizHeader}
    >
      {/* Narrower cells, gaps and labels on phones so all seven columns fit at 360 px */}
      <div className="grid gap-y-2 gap-x-2 sm:gap-x-3 min-w-fit" style={{ gridTemplateColumns: "auto 1fr" }}>
        {rows.map((row, r) => (
          <div key={r} className="contents">
            <div
              className={`font-mono text-[10px] sm:text-xs self-center text-right ${
                r === depth ? "text-sky" : r > depth ? "text-orange" : "text-muted-foreground"
              } ${row.kind === "output" ? "!text-mint" : ""}`}
            >
              {row.label}
            </div>
            <div className="grid gap-1 sm:gap-1.5 [--ms-cell:22px] sm:[--ms-cell:34px]" style={{ gridTemplateColumns: `repeat(${n}, minmax(var(--ms-cell), 1fr))` }}>
              {row.pieces.map((p) => {
                const vals = input.slice(p.lo, p.hi + 1);
                if (row.sorted) vals.sort((a, b) => a - b);
                const dim = p.carried && row.kind !== "base";
                return (
                  <div
                    key={`${p.lo}-${p.hi}`}
                    style={{ gridColumn: `${p.lo + 1} / ${p.hi + 2}` }}
                    className={`h-8 sm:h-9 flex items-center justify-around px-0.5 sm:px-1 font-mono text-xs sm:text-[13px] border rounded-md sm:rounded-lg transition-opacity ${
                      dim ? "border-dashed border-border text-muted-foreground opacity-60" : boxTone[row.kind]
                    }`}
                  >
                    {vals.map((v, i) => (
                      <span key={i}>{v}</span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Each box sits under the slice of the array it came from. Dashed boxes are pieces that were already size 1 and are just waiting for the others.
      </p>
    </FocusPanel>
  );
}

/* -------------------- BubbleEarlyExitVisualizer -------------------- */

export function BubbleEarlyExitVisualizer({
  initial = [1, 2, 3, 4, 5, 6],
}: {
  initial?: number[];
}) {
  const [data, setData] = useState<number[]>(initial);
  const [mode, setMode] = useState<"with_flag" | "without_flag">("with_flag");
  const frames = useMemo(() => bubbleEarlyExitFrames(data, mode), [data, mode]);
  const code = mode === "with_flag" ? JAVA_BUBBLE_EARLY_EXIT.with_flag : JAVA_BUBBLE_EARLY_EXIT.without_flag;

  return (
    <Stepper
      title="Bubble sort: early exit flag vs full quadratic passes"
      frames={frames}
      code={code}
      legend={[
        ["bg-neon", "comparing adjacent pair"],
        ["bg-orange", "swapping out-of-order pair"],
        ["bg-mint", "settled / sorted suffix"],
      ]}
      render={(s: BubbleEarlyExitState) => (
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">swapped flag:</span>
              <span
                className={`px-2 py-0.5 rounded-full font-semibold border ${
                  s.swappedThisPass
                    ? "border-orange bg-orange/20 text-orange"
                    : "border-border bg-secondary text-muted-foreground"
                }`}
              >
                {s.swappedThisPass ? "true (swaps occurred)" : "false (no swaps yet)"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>Pass <strong className="text-foreground">{s.passCount}</strong></span>
              <span>Comparisons: <strong className="text-foreground">{s.totalComparisons}</strong></span>
              <span>Swaps: <strong className="text-foreground">{s.totalSwaps}</strong></span>
            </div>
          </div>

          <div className="flex justify-center overflow-x-auto py-2">
            <div className="flex gap-2 min-w-fit">
              {s.array.map((val, idx) => {
                const isComparing = s.compare?.includes(idx);
                const isSwapped = s.write?.includes(idx);
                const isSorted = s.sorted.includes(idx);

                return (
                  <div
                    key={idx}
                    className={`w-12 h-14 sm:w-14 sm:h-16 flex flex-col items-center justify-center font-mono rounded-xl border-2 transition-all duration-200 motion-reduce:transition-none ${
                      isSwapped
                        ? "border-orange bg-orange/25 text-foreground font-bold ring-2 ring-orange/50 scale-105"
                        : isComparing
                        ? "border-neon bg-neon/20 text-foreground font-bold ring-2 ring-neon/50"
                        : isSorted
                        ? "border-mint/60 bg-mint/15 text-foreground font-semibold"
                        : "border-border/60 bg-secondary/40 text-foreground"
                    }`}
                  >
                    <span className="text-base sm:text-lg font-bold">{val}</span>
                    <span className="text-[10px] text-muted-foreground">[{idx}]</span>
                  </div>
                );
              })}
            </div>
          </div>

          {s.stoppedEarly && (
            <div className="rounded-lg border border-mint/40 bg-mint/10 px-3 py-2 text-xs font-mono text-mint flex items-center justify-between">
              <span>Early exit triggered! Pass ended with zero swaps, proving order in linear time.</span>
              <span className="font-bold">O(n) best-case reached</span>
            </div>
          )}
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Mode:</span>
            <button
              type="button"
              className={`${btn} ${mode === "with_flag" ? "border-mint text-mint bg-mint/10 font-semibold" : ""}`}
              onClick={() => setMode("with_flag")}
            >
              With swapped flag (Optimized)
            </button>
            <button
              type="button"
              className={`${btn} ${mode === "without_flag" ? "border-orange text-orange bg-orange/10 font-semibold" : ""}`}
              onClick={() => setMode("without_flag")}
            >
              Without flag (Standard nested loop)
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Presets:</span>
            <button
              type="button"
              className={btn}
              onClick={() => setData([1, 2, 3, 4, 5, 6])}
            >
              Sorted
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setData([2, 1, 3, 4, 5, 6])}
            >
              Nearly sorted
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setData([6, 5, 4, 3, 2, 1])}
            >
              Reversed
            </button>
          </div>
        </div>
      }
    />
  );
}

/* -------------------- InsertionShiftVisualizer -------------------- */

export function InsertionShiftVisualizer({
  initial = [6, 2, 11, 7, 5],
}: {
  initial?: number[];
}) {
  const [data, setData] = useState<number[]>(initial);
  const [mode, setMode] = useState<"shift" | "swap">("shift");
  const frames = useMemo(() => insertionShiftFrames(data, mode), [data, mode]);
  const code = mode === "shift" ? JAVA_INSERTION_SHIFT.shift : JAVA_INSERTION_SHIFT.swap;

  return (
    <Stepper
      title="Insertion sort: shifting into open gap vs adjacent swapping"
      frames={frames}
      code={code}
      legend={[
        ["bg-violet", "key variable (in hand)"],
        ["bg-neon", "comparing with key / left element"],
        ["bg-orange", "element shifted or swapped"],
        ["bg-mint", "sorted prefix boundary"],
      ]}
      render={(s: InsertionShiftState) => (
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            {s.mode === "shift" ? (
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground font-semibold">key variable:</span>
                <div
                  className={`w-14 h-12 rounded-xl flex items-center justify-center font-mono text-base border-2 transition-all duration-200 motion-reduce:transition-none ${
                    s.key !== null
                      ? "border-violet bg-violet/20 text-foreground font-bold shadow-sm ring-2 ring-violet/40"
                      : "border-dashed border-border bg-secondary/30 text-muted-foreground/40"
                  }`}
                >
                  {s.key !== null ? s.key : "empty"}
                </div>
              </div>
            ) : (
              <span className="text-orange font-semibold">(No key register: repeatedly invokes 3-write swap)</span>
            )}

            <div className="flex items-center gap-4 text-muted-foreground">
              <span>Comparisons: <strong className="text-foreground">{s.comparisons}</strong></span>
              <span>Memory writes: <strong className={s.mode === "shift" ? "text-mint font-bold" : "text-orange font-bold"}>{s.writes}</strong></span>
            </div>
          </div>

          <div className="flex justify-center overflow-x-auto py-2">
            <div className="flex gap-2 min-w-fit">
              {s.array.map((val, idx) => {
                const isGap = val === null;
                const isComparing = s.compare?.includes(idx);
                const isWritten = s.write?.includes(idx);
                const isSortedPrefix = s.sorted.includes(idx);

                return (
                  <div
                    key={idx}
                    className={`w-12 h-14 sm:w-14 sm:h-16 flex flex-col items-center justify-center font-mono rounded-xl border-2 transition-all duration-200 motion-reduce:transition-none ${
                      isGap
                        ? "border-dashed border-violet/70 bg-violet/10 text-violet font-semibold ring-2 ring-violet/30"
                        : isWritten
                        ? "border-orange bg-orange/25 text-foreground font-bold ring-2 ring-orange/50 scale-105"
                        : isComparing
                        ? "border-neon bg-neon/20 text-foreground font-bold ring-2 ring-neon/50"
                        : isSortedPrefix
                        ? "border-mint/50 bg-mint/10 text-foreground"
                        : "border-border/60 bg-secondary/40 text-muted-foreground opacity-80"
                    }`}
                  >
                    <span className="text-base sm:text-lg font-bold">{isGap ? "gap" : val}</span>
                    <span className="text-[10px] text-muted-foreground">[{idx}]</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Strategy:</span>
            <button
              type="button"
              className={`${btn} ${mode === "shift" ? "border-violet text-violet bg-violet/10 font-semibold" : ""}`}
              onClick={() => setMode("shift")}
            >
              Shifting (1 write/shift)
            </button>
            <button
              type="button"
              className={`${btn} ${mode === "swap" ? "border-orange text-orange bg-orange/10 font-semibold" : ""}`}
              onClick={() => setMode("swap")}
            >
              Adjacent Swapping (3 writes/shift)
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Presets:</span>
            <button
              type="button"
              className={btn}
              onClick={() => setData([6, 2, 11, 7, 5])}
            >
              Notes example
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setData([1, 12, 46, 6, 37, 5, 3])}
            >
              Exam trace
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setData([7, 6, 5, 4, 3, 2, 1])}
            >
              Reversed
            </button>
          </div>
        </div>
      }
    />
  );
}

/* -------------------- TwoWayMergeVisualizer -------------------- */

export function TwoWayMergeVisualizer({
  initialLeft = [2, 6, 11],
  initialRight = [4, 5, 7],
}: {
  initialLeft?: number[];
  initialRight?: number[];
}) {
  const [leftArr, setLeftArr] = useState<number[]>(initialLeft);
  const [rightArr, setRightArr] = useState<number[]>(initialRight);
  const [condition, setCondition] = useState<"lte" | "lt">("lte");
  const frames = useMemo(() => twoWayMergeFrames(leftArr, rightArr, condition), [leftArr, rightArr, condition]);
  const code = condition === "lte" ? JAVA_TWO_WAY_MERGE.lte : JAVA_TWO_WAY_MERGE.lt;

  return (
    <Stepper
      title="The merge step: two sorted inputs combined in Θ(n) time"
      frames={frames}
      code={code}
      legend={[
        ["bg-neon", "active pointer (i or j) compared"],
        ["bg-orange", "element taken into output A"],
        ["bg-sky", "cleanup drain (no comparisons)"],
      ]}
      render={(s: TwoWayMergeState) => (
        <div className="flex flex-col gap-4 py-2">
          {s.stabilityBroken && (
            <div className="rounded-lg border border-orange/50 bg-orange/10 px-3 py-2 text-xs font-mono text-orange">
              Stability bug detected! The duplicate from Right crossed ahead of Left because strict &lt; was used.
            </div>
          )}
          {(s.phase === "drain_left" || s.phase === "drain_right") && (
            <div className="rounded-lg border border-sky/50 bg-sky/10 px-3 py-2 text-xs font-mono text-sky">
              Cleanup phase: One array is exhausted. Copying remaining elements directly with zero comparisons!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left list */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border/60 bg-secondary/20">
              <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
                <span className="font-semibold text-foreground">Left subarray L</span>
                <span>pointer i = <strong className="text-foreground">{s.i}</strong></span>
              </div>
              <div className="flex gap-2 overflow-x-auto py-1">
                {s.left.map((item, idx) => {
                  const isCurrent = idx === s.i;
                  const isDrained = item === null;
                  return (
                    <div
                      key={idx}
                      className={`w-12 h-14 flex flex-col items-center justify-center font-mono rounded-xl border-2 transition-all duration-200 motion-reduce:transition-none ${
                        isDrained
                          ? "border-dashed border-border/40 bg-secondary/10 text-muted-foreground/30"
                          : isCurrent
                          ? "border-neon bg-neon/20 text-foreground font-bold ring-2 ring-neon/40 scale-105"
                          : "border-border/60 bg-card text-foreground"
                      }`}
                    >
                      <span className="text-base font-bold">
                        {item ? item.value : "—"}
                        {item?.tag && <sup className="text-violet font-semibold">{item.tag}</sup>}
                      </span>
                      <span className="text-[10px] text-muted-foreground">L[{idx}]</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right list */}
            <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border/60 bg-secondary/20">
              <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
                <span className="font-semibold text-foreground">Right subarray R</span>
                <span>pointer j = <strong className="text-foreground">{s.j}</strong></span>
              </div>
              <div className="flex gap-2 overflow-x-auto py-1">
                {s.right.map((item, idx) => {
                  const isCurrent = idx === s.j;
                  const isDrained = item === null;
                  return (
                    <div
                      key={idx}
                      className={`w-12 h-14 flex flex-col items-center justify-center font-mono rounded-xl border-2 transition-all duration-200 motion-reduce:transition-none ${
                        isDrained
                          ? "border-dashed border-border/40 bg-secondary/10 text-muted-foreground/30"
                          : isCurrent
                          ? "border-neon bg-neon/20 text-foreground font-bold ring-2 ring-neon/40 scale-105"
                          : "border-border/60 bg-card text-foreground"
                      }`}
                    >
                      <span className="text-base font-bold">
                        {item ? item.value : "—"}
                        {item?.tag && <sup className="text-violet font-semibold">{item.tag}</sup>}
                      </span>
                      <span className="text-[10px] text-muted-foreground">R[{idx}]</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Merged output */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border/60 bg-secondary/30">
            <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
              <span className="font-semibold text-foreground">Merged output A</span>
              <span>pointer k = <strong className="text-foreground">{s.k}</strong></span>
            </div>
            <div className="flex gap-2 overflow-x-auto py-1">
              {s.output.map((item, idx) => {
                const isJustWritten = idx === s.k - 1 && s.phase !== "complete";
                return (
                  <div
                    key={idx}
                    className={`w-12 h-14 flex flex-col items-center justify-center font-mono rounded-xl border-2 transition-all duration-200 motion-reduce:transition-none ${
                      item === null
                        ? "border-dashed border-border/50 bg-secondary/20 text-muted-foreground/40"
                        : isJustWritten
                        ? "border-orange bg-orange/20 text-foreground font-bold ring-2 ring-orange/40 scale-105"
                        : "border-mint/60 bg-mint/15 text-foreground font-semibold"
                    }`}
                  >
                    <span className="text-base font-bold">
                      {item ? item.value : "—"}
                      {item?.tag && <sup className="text-violet font-semibold">{item.tag}</sup>}
                    </span>
                    <span className="text-[10px] text-muted-foreground">A[{idx}]</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Condition:</span>
            <button
              type="button"
              className={`${btn} ${condition === "lte" ? "border-mint text-mint bg-mint/10 font-semibold" : ""}`}
              onClick={() => setCondition("lte")}
            >
              L[i] &lt;= R[j] (Stable)
            </button>
            <button
              type="button"
              className={`${btn} ${condition === "lt" ? "border-orange text-orange bg-orange/10 font-semibold" : ""}`}
              onClick={() => setCondition("lt")}
            >
              L[i] &lt; R[j] (Unstable bug)
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Presets:</span>
            <button
              type="button"
              className={btn}
              onClick={() => {
                setLeftArr([2, 6, 11]);
                setRightArr([4, 5, 7]);
              }}
            >
              Notes: [2,6,11] & [4,5,7]
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                setLeftArr([1, 5, 8]);
                setRightArr([3, 5, 9]);
              }}
            >
              Duplicates: 5ᵃ & 5ᵇ
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                setLeftArr([2, 3]);
                setRightArr([1, 4, 5, 6]);
              }}
            >
              Left drains first
            </button>
          </div>
        </div>
      }
    />
  );
}

/* -------------------- PartitionVisualizer -------------------- */

export function PartitionVisualizer({
  initial = [25, 10, 30, 15, 20, 28],
}: {
  initial?: number[];
}) {
  const [data, setData] = useState<number[]>(initial);
  const [mode, setMode] = useState<PartitionMode>("right_first");
  const frames = useMemo(() => partitionFrames(data, mode), [data, mode]);
  const code = mode === "right_first" ? JAVA_PARTITION.right_first : JAVA_PARTITION.left_first;

  return (
    <Stepper
      title="Two-pointer partition: pivot placement & why right pointer moves first"
      frames={frames}
      code={code}
      legend={[
        ["bg-violet", "pivot value"],
        ["bg-neon", "active pointer comparison"],
        ["bg-orange", "swapped pointers"],
        ["bg-mint", "pivot locked in final spot"],
      ]}
      render={(s: PartitionState) => (
        <div className="flex flex-col gap-4 py-2">
          {s.corrupted && (
            <div className="rounded-lg border border-orange/50 bg-orange/10 px-3 py-2 text-xs font-mono text-orange">
              {s.corruptedReason ?? "Partition corrupted! Elements greater than pivot ended up to its left."}
            </div>
          )}
          {s.done && !s.corrupted && (
            <div className="rounded-lg border border-mint/50 bg-mint/10 px-3 py-2 text-xs font-mono text-mint">
              Partition successful! Pivot {s.pivot} locked at index {s.meetingIdx}. Left partition &le; {s.pivot}, Right partition &ge; {s.pivot}.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">Pivot:</span>
              <span className="px-2 py-0.5 rounded-md border border-violet bg-violet/20 font-bold text-violet">
                {s.pivot} (from index {s.low})
              </span>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>left = <strong className="text-foreground">{s.left}</strong></span>
              <span>right = <strong className="text-foreground">{s.right}</strong></span>
              <span>Swaps: <strong className="text-foreground">{s.swaps}</strong></span>
            </div>
          </div>

          <div className="flex justify-center overflow-x-auto py-2">
            <div className="flex gap-2 min-w-fit">
              {s.array.map((val, idx) => {
                const isPivot = s.done ? idx === s.meetingIdx : idx === s.low;
                const isLeft = idx === s.left;
                const isRight = idx === s.right;
                const isMeeting = isLeft && isRight;
                const isComparing = s.compare?.includes(idx);
                const isSwapped = s.write?.includes(idx);

                let tone = "border-border/60 bg-secondary/40 text-foreground";
                if (s.done && isPivot) {
                  tone = "border-mint bg-mint/20 text-foreground font-bold ring-2 ring-mint/40";
                } else if (isSwapped) {
                  tone = "border-orange bg-orange/25 text-foreground font-bold ring-2 ring-orange/50 scale-105";
                } else if (isComparing) {
                  tone = "border-neon bg-neon/20 text-foreground font-bold ring-2 ring-neon/50";
                } else if (isPivot) {
                  tone = "border-violet bg-violet/20 text-foreground font-bold";
                } else if (s.done) {
                  tone = idx < s.meetingIdx!
                    ? "border-sky/40 bg-sky/10 text-foreground"
                    : "border-violet/40 bg-violet/10 text-foreground";
                }

                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-12 h-14 sm:w-14 sm:h-16 flex flex-col items-center justify-center font-mono rounded-xl border-2 transition-all duration-200 motion-reduce:transition-none ${tone}`}
                    >
                      <span className="text-base sm:text-lg font-bold">{val}</span>
                      <span className="text-[10px] text-muted-foreground">[{idx}]</span>
                    </div>
                    <div className="h-4 flex items-center justify-center font-mono text-[10px]">
                      {isMeeting ? (
                        <span className="text-orange font-bold">meet</span>
                      ) : isLeft && isRight ? (
                        <span className="text-orange font-bold">L,R</span>
                      ) : isLeft ? (
                        <span className="text-neon font-bold">L→</span>
                      ) : isRight ? (
                        <span className="text-neon font-bold">←R</span>
                      ) : isPivot ? (
                        <span className="text-violet font-semibold">p</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      inputs={
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Mode:</span>
            <button
              type="button"
              className={`${btn} ${mode === "right_first" ? "border-mint text-mint bg-mint/10 font-semibold" : ""}`}
              onClick={() => setMode("right_first")}
            >
              Right pointer first (Correct)
            </button>
            <button
              type="button"
              className={`${btn} ${mode === "left_first" ? "border-orange text-orange bg-orange/10 font-semibold" : ""}`}
              onClick={() => setMode("left_first")}
            >
              Left pointer first (The bug)
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Presets:</span>
            <button
              type="button"
              className={btn}
              onClick={() => setData([25, 10, 30, 15, 20, 28])}
            >
              Notes: [25, 10, 30...]
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setData([25, 10, 30])}
            >
              Bug demo: [25, 10, 30]
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => setData([10, 20, 30, 40, 50])}
            >
              Pre-sorted
            </button>
          </div>
        </div>
      }
    />
  );
}

/* ------------------ binary search on unsorted data ------------------ */

export function BinarySearchUnsortedVisualizer() {
  const [mode, setMode] = useState<"unsorted" | "sorted">("unsorted");
  const [array, setArray] = useState<number[]>([4, 9, 1, 7, 3]);
  const [target, setTarget] = useState<number>(9);
  const [targetText, setTargetText] = useState<string>("9");

  const frames = useMemo(
    () => binarySearchUnsortedFrames(array, target, mode === "sorted"),
    [array, target, mode]
  );

  const applyTarget = () => {
    const val = Number(targetText);
    if (Number.isInteger(val)) setTarget(val);
  };

  const setPreset = (arr: number[], tgt: number) => {
    setArray(arr);
    setTarget(tgt);
    setTargetText(String(tgt));
  };

  return (
    <Stepper
      title="Binary search: sorted vs unsorted"
      frames={frames}
      code={JAVA_BINARY_SEARCH_UNSORTED}
      legend={[
        ["bg-sky", "active range"],
        ["bg-neon", "middle element"],
        ["bg-orange", "wrongly discarded target"],
        ["bg-mint", "found"],
      ]}
      render={(s) => {
        const {
          array: a,
          low,
          high,
          mid,
          target: tgt,
          discarded,
          discardedContainsTarget,
          foundIndex,
          returnedValue,
          isSorted,
        } = s;

        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="text-muted-foreground">Status:</span>
              {isSorted ? (
                <span className="px-2 py-0.5 rounded border border-mint/40 bg-mint/10 text-mint font-semibold">
                  Sorted array (binary search invariants hold)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded border border-orange/40 bg-orange/10 text-orange font-semibold">
                  Unsorted array (binary search invariant violated)
                </span>
              )}
              <span className="text-muted-foreground ml-auto">
                Target: <strong className="text-foreground">{tgt}</strong>
              </span>
            </div>

            {discardedContainsTarget && (
              <div className="text-xs font-mono p-2.5 rounded-lg border border-orange/50 bg-orange/15 text-orange flex items-start gap-2">
                <span className="font-bold text-sm">⚠️</span>
                <div>
                  <strong>Silent Bug Struck:</strong> Discarded subarray contained target {tgt}! Because the array is
                  not sorted, assuming elements before mid are &le; {a[mid ?? 0]} threw away the correct answer.
                </div>
              </div>
            )}

            {returnedValue === -1 && a.includes(tgt) && (
              <div className="text-xs font-mono p-2.5 rounded-lg border border-orange/50 bg-orange/15 text-orange flex items-start gap-2">
                <span className="font-bold text-sm">❌</span>
                <div>
                  <strong>Silent Failure:</strong> Returned -1 (&ldquo;Not Found&rdquo;) even though {tgt} is at index{" "}
                  {a.indexOf(tgt)}! No crash occurred, but the return value is wrong.
                </div>
              </div>
            )}

            {returnedValue !== undefined && returnedValue >= 0 && (
              <div className="text-xs font-mono p-2.5 rounded-lg border border-mint/50 bg-mint/15 text-mint flex items-start gap-2">
                <span className="font-bold text-sm">✓</span>
                <div>
                  <strong>Found:</strong> Successfully located target {tgt} at index {returnedValue}.
                </div>
              </div>
            )}

            <div className="overflow-x-auto py-2">
              <div className="flex items-center gap-2 min-w-max mx-auto justify-center">
                {a.map((val, idx) => {
                  const isMid = idx === mid;
                  const isFound = idx === foundIndex;
                  const inActiveRange = idx >= low && idx <= high;
                  const isDiscarded = discarded && idx >= discarded[0] && idx <= discarded[1];
                  const isTargetInDiscarded = isDiscarded && val === tgt;

                  let cellStyle = "border-border/40 bg-secondary/30 text-muted-foreground opacity-50";
                  if (isFound) {
                    cellStyle = "border-mint bg-mint/20 text-mint font-bold ring-2 ring-mint/40";
                  } else if (isTargetInDiscarded) {
                    cellStyle = "border-orange bg-orange/20 text-orange font-bold ring-2 ring-orange/60 animate-pulse";
                  } else if (isMid) {
                    cellStyle = "border-neon bg-neon/20 text-neon font-bold";
                  } else if (inActiveRange) {
                    cellStyle = "border-sky/50 bg-sky/10 text-foreground font-semibold";
                  } else if (isDiscarded) {
                    cellStyle = "border-border/30 bg-secondary/20 text-muted-foreground/60 line-through";
                  }

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-12 h-14 sm:w-14 sm:h-16 flex flex-col items-center justify-center font-mono rounded-xl border-2 transition-all duration-200 motion-reduce:transition-none ${cellStyle}`}
                      >
                        <span className="text-base sm:text-lg font-bold">{val}</span>
                        <span className="text-[10px] text-muted-foreground">[{idx}]</span>
                      </div>
                      <div className="h-4 flex items-center justify-center font-mono text-[10px]">
                        {idx === low && idx === high ? (
                          <span className="text-sky font-bold">L,H</span>
                        ) : idx === low ? (
                          <span className="text-sky font-semibold">low</span>
                        ) : idx === high ? (
                          <span className="text-sky font-semibold">high</span>
                        ) : idx === mid ? (
                          <span className="text-neon font-semibold">mid</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }}
      inputs={
        <div className="flex flex-col gap-2.5 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Mode:</span>
            <button
              type="button"
              className={`${btn} ${mode === "unsorted" ? "border-orange text-orange bg-orange/10 font-semibold" : ""}`}
              onClick={() => setMode("unsorted")}
            >
              Unsorted array (Silent failure bug)
            </button>
            <button
              type="button"
              className={`${btn} ${mode === "sorted" ? "border-mint text-mint bg-mint/10 font-semibold" : ""}`}
              onClick={() => setMode("sorted")}
            >
              Sorted array (Correct)
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Target:</span>
            <input
              aria-label="Target"
              className={`${inputCls} w-20`}
              value={targetText}
              inputMode="numeric"
              onChange={(e) => setTargetText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyTarget()}
            />
            <button type="button" className={btn} onClick={applyTarget}>
              Set target
            </button>
            <span className="text-muted-foreground">Presets:</span>
            <button type="button" className={btn} onClick={() => setPreset([4, 9, 1, 7, 3], 9)}>
              Notes: [4, 9, 1, 7, 3] (target 9)
            </button>
            <button type="button" className={btn} onClick={() => setPreset([20, 5, 80, 42, 12], 20)}>
              [20, 5, 80, 42, 12] (target 20)
            </button>
          </div>
        </div>
      }
    />
  );
}

/* ------------------ binary search boundary bugs ------------------ */

export function BinarySearchBoundaryVisualizer() {
  const [mode, setMode] = useState<BinarySearchBoundaryMode>("correct");
  const [array, setArray] = useState<number[]>([10, 25, 40, 70, 85]);
  const [target, setTarget] = useState<number>(85);
  const [targetText, setTargetText] = useState<string>("85");

  const frames = useMemo(
    () => binarySearchBoundaryFrames(mode, array, target),
    [mode, array, target]
  );

  const applyTarget = () => {
    const val = Number(targetText);
    if (Number.isInteger(val)) setTarget(val);
  };

  const setPreset = (arr: number[], tgt: number, m?: BinarySearchBoundaryMode) => {
    setArray(arr);
    setTarget(tgt);
    setTargetText(String(tgt));
    if (m) setMode(m);
  };

  return (
    <Stepper
      title="Binary search: boundary conditions & loop bugs"
      frames={frames}
      code={JAVA_BINARY_SEARCH_BOUNDARY[mode]}
      legend={[
        ["bg-sky", "search window"],
        ["bg-neon", "mid pointer"],
        ["bg-orange", "bug alert"],
        ["bg-mint", "found"],
      ]}
      render={(s) => {
        const { array: a, low, high, mid, target: tgt, foundIndex, returnedValue, infiniteLoop, bugTriggered } = s;

        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Active mode:</span>
                <span className="px-2 py-0.5 rounded border border-border bg-secondary font-semibold">
                  {mode === "correct"
                    ? "while (low <= high) & mid ± 1"
                    : mode === "strict_less"
                    ? "while (low < high) [BUG]"
                    : "low = mid [BUG]"}
                </span>
              </div>
              <div>
                Target: <strong className="text-foreground">{tgt}</strong>
              </div>
            </div>

            {infiniteLoop && (
              <div className="text-xs font-mono p-3 rounded-lg border border-orange/50 bg-orange/15 text-orange flex items-start gap-2">
                <span className="font-bold text-base">⚠️</span>
                <div>
                  <strong>Infinite Loop Trap:</strong> Pointers low={low} and high={high} stopped moving! Because low =
                  mid did not advance past mid, the search window never shrinks. The while loop runs forever.
                </div>
              </div>
            )}

            {bugTriggered && !infiniteLoop && (
              <div className="text-xs font-mono p-3 rounded-lg border border-orange/50 bg-orange/15 text-orange flex items-start gap-2">
                <span className="font-bold text-base">❌</span>
                <div>
                  <strong>Boundary Bug:</strong> {bugTriggered}
                </div>
              </div>
            )}

            {returnedValue !== undefined && returnedValue >= 0 && (
              <div className="text-xs font-mono p-2.5 rounded-lg border border-mint/50 bg-mint/15 text-mint flex items-start gap-2">
                <span className="font-bold text-base">✓</span>
                <div>
                  <strong>Target Found:</strong> Located key {tgt} at array index {returnedValue}.
                </div>
              </div>
            )}

            <div className="overflow-x-auto py-2">
              <div className="flex items-center gap-2 min-w-max mx-auto justify-center">
                {a.map((val, idx) => {
                  const isMid = idx === mid;
                  const isFound = idx === foundIndex;
                  const inActiveRange = idx >= low && idx <= high;

                  let cellStyle = "border-border/40 bg-secondary/30 text-muted-foreground opacity-50";
                  if (isFound) {
                    cellStyle = "border-mint bg-mint/20 text-mint font-bold ring-2 ring-mint/40";
                  } else if (isMid) {
                    cellStyle = "border-neon bg-neon/20 text-neon font-bold";
                  } else if (inActiveRange) {
                    cellStyle = "border-sky/50 bg-sky/10 text-foreground font-semibold";
                  }

                  return (
                    <div key={idx} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-12 h-14 sm:w-14 sm:h-16 flex flex-col items-center justify-center font-mono rounded-xl border-2 transition-all duration-200 motion-reduce:transition-none ${cellStyle}`}
                      >
                        <span className="text-base sm:text-lg font-bold">{val}</span>
                        <span className="text-[10px] text-muted-foreground">[{idx}]</span>
                      </div>
                      <div className="h-4 flex items-center justify-center font-mono text-[10px]">
                        {idx === low && idx === high && idx === mid ? (
                          <span className="text-orange font-bold">L,M,H</span>
                        ) : idx === low && idx === high ? (
                          <span className="text-sky font-bold">L,H</span>
                        ) : idx === low && idx === mid ? (
                          <span className="text-sky font-bold">L,M</span>
                        ) : idx === high && idx === mid ? (
                          <span className="text-sky font-bold">M,H</span>
                        ) : idx === low ? (
                          <span className="text-sky font-semibold">low</span>
                        ) : idx === high ? (
                          <span className="text-sky font-semibold">high</span>
                        ) : idx === mid ? (
                          <span className="text-neon font-semibold">mid</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }}
      inputs={
        <div className="flex flex-col gap-2.5 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Mode:</span>
            <button
              type="button"
              className={`${btn} ${mode === "correct" ? "border-mint text-mint bg-mint/10 font-semibold" : ""}`}
              onClick={() => setMode("correct")}
            >
              low &le; high (Correct)
            </button>
            <button
              type="button"
              className={`${btn} ${mode === "strict_less" ? "border-orange text-orange bg-orange/10 font-semibold" : ""}`}
              onClick={() => setMode("strict_less")}
            >
              low &lt; high (Bug 1: misses boundary)
            </button>
            <button
              type="button"
              className={`${btn} ${mode === "low_assign_mid" ? "border-orange text-orange bg-orange/10 font-semibold" : ""}`}
              onClick={() => setMode("low_assign_mid")}
            >
              low = mid (Bug 2: infinite loop)
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Target:</span>
            <input
              aria-label="Target"
              className={`${inputCls} w-20`}
              value={targetText}
              inputMode="numeric"
              onChange={(e) => setTargetText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyTarget()}
            />
            <button type="button" className={btn} onClick={applyTarget}>
              Set target
            </button>
            <span className="text-muted-foreground">Presets:</span>
            <button type="button" className={btn} onClick={() => setPreset([10, 25, 40, 70, 85], 85, "strict_less")}>
              Boundary bug: [10..85] (target 85)
            </button>
            <button type="button" className={btn} onClick={() => setPreset([10, 20], 20, "low_assign_mid")}>
              Loop bug: [10, 20] (target 20)
            </button>
            <button type="button" className={btn} onClick={() => setPreset([10, 25, 40, 70, 85], 85, "correct")}>
              Normal: [10..85] (target 85)
            </button>
          </div>
        </div>
      }
    />
  );
}

/* ------------------ Euclid rectangle square tiling ------------------ */

export function EuclidTilingVisualizer({ m = 60, n = 24 }: { m?: number; n?: number }) {
  const [vals, setVals] = useState({ m, n });
  const [text, setText] = useState({ m: String(m), n: String(n) });

  const frames = useMemo(() => euclidTilingFrames(vals.m, vals.n), [vals]);

  const apply = () => {
    const a = Number(text.m);
    const b = Number(text.n);
    if (Number.isInteger(a) && Number.isInteger(b) && a > 0 && b > 0 && a <= 2000 && b <= 2000) {
      setVals({ m: a, n: b });
    }
  };

  const setPreset = (pm: number, pn: number) => {
    setVals({ m: pm, n: pn });
    setText({ m: String(pm), n: String(pn) });
  };

  const stepColors = [
    { fill: "rgba(56, 189, 248, 0.2)", stroke: "rgba(56, 189, 248, 0.9)" },
    { fill: "rgba(168, 85, 247, 0.2)", stroke: "rgba(168, 85, 247, 0.9)" },
    { fill: "rgba(234, 179, 8, 0.2)", stroke: "rgba(234, 179, 8, 0.9)" },
    { fill: "rgba(52, 211, 153, 0.2)", stroke: "rgba(52, 211, 153, 0.9)" },
    { fill: "rgba(251, 146, 60, 0.2)", stroke: "rgba(251, 146, 60, 0.9)" },
  ];

  return (
    <Stepper
      title="Euclid's algorithm: geometric square tiling"
      frames={frames}
      code={JAVA_EUCLID_TILING}
      render={(s) => {
        const { totalWidth, totalHeight, tiles, remaining, equation, gcd, done } = s;

        return (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <div className="text-muted-foreground">
                Floor: <span className="text-foreground font-bold">{totalWidth}</span> ×{" "}
                <span className="text-foreground font-bold">{totalHeight}</span>
              </div>
              {gcd !== undefined && (
                <div className="px-2 py-0.5 rounded border border-mint/40 bg-mint/10 text-mint font-semibold">
                  gcd({s.m}, {s.n}) = {gcd} (largest square tile)
                </div>
              )}
            </div>

            <div className="w-full flex items-center justify-center p-2 rounded-xl border border-border bg-card/60 overflow-hidden">
              <svg
                viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                className="w-full max-h-64 sm:max-h-72 object-contain transition-all duration-200 motion-reduce:transition-none"
              >
                {/* Background floor */}
                <rect
                  x={0}
                  y={0}
                  width={totalWidth}
                  height={totalHeight}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={Math.max(1, totalWidth / 200)}
                  className="text-border"
                />

                {/* Placed square tiles */}
                {tiles.map((tile, i) => {
                  const color = stepColors[(tile.step - 1) % stepColors.length];
                  const strokeW = Math.max(0.5, totalWidth / 250);
                  const fontSize = Math.max(totalWidth / 35, Math.min(tile.size * 0.28, totalWidth / 12));

                  return (
                    <g key={i}>
                      <rect
                        x={tile.x}
                        y={tile.y}
                        width={tile.size}
                        height={tile.size}
                        fill={color.fill}
                        stroke={color.stroke}
                        strokeWidth={strokeW}
                        className="transition-all duration-200 motion-reduce:transition-none"
                      />
                      {tile.size > totalWidth * 0.05 && (
                        <text
                          x={tile.x + tile.size / 2}
                          y={tile.y + tile.size / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="currentColor"
                          fontSize={fontSize}
                          className="font-mono font-bold text-foreground opacity-90 select-none pointer-events-none"
                        >
                          {tile.size}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Remaining un-tiled strip */}
                {remaining && remaining.w > 0 && remaining.h > 0 && (
                  <rect
                    x={remaining.x}
                    y={remaining.y}
                    width={remaining.w}
                    height={remaining.h}
                    fill="rgba(251, 146, 60, 0.12)"
                    stroke="rgba(251, 146, 60, 0.85)"
                    strokeWidth={Math.max(1, totalWidth / 200)}
                    strokeDasharray={`${Math.max(2, totalWidth / 50)} ${Math.max(2, totalWidth / 50)}`}
                    className="transition-all duration-200 motion-reduce:transition-none"
                  />
                )}
              </svg>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border bg-secondary/50 font-mono text-xs">
              <div>
                <span className="text-muted-foreground mr-1">Division:</span>
                <span className="text-foreground font-semibold">{equation}</span>
              </div>
              {done && (
                <span className="text-mint font-semibold">Floor fully tiled with {tiles.length} squares!</span>
              )}
            </div>
          </div>
        );
      }}
      inputs={
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <input
            aria-label="m"
            className={`${inputCls} w-20`}
            value={text.m}
            inputMode="numeric"
            onChange={(e) => setText((t) => ({ ...t, m: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
          <span className="text-muted-foreground">×</span>
          <input
            aria-label="n"
            className={`${inputCls} w-20`}
            value={text.n}
            inputMode="numeric"
            onChange={(e) => setText((t) => ({ ...t, n: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
          <button type="button" className={btn} onClick={apply}>
            Tile floor
          </button>
          <span className="text-muted-foreground ml-1">Presets:</span>
          <button type="button" className={btn} onClick={() => setPreset(60, 24)}>
            60 × 24
          </button>
          <button type="button" className={btn} onClick={() => setPreset(210, 45)}>
            210 × 45
          </button>
          <button type="button" className={btn} onClick={() => setPreset(24, 9)}>
            24 × 9
          </button>
          <button type="button" className={btn} onClick={() => setPreset(55, 34)}>
            55 × 34
          </button>
        </div>
      }
    />
  );
}

/* -------------------- GCD comparison: Brute Force vs Euclid -------------------- */

export function GcdComparisonVisualizer({ m = 210, n = 45 }: { m?: number; n?: number }) {
  const [vals, setVals] = useState({ m, n });
  const [text, setText] = useState({ m: String(m), n: String(n) });

  const summary = useMemo(() => gcdComparisonSummary(vals.m, vals.n), [vals]);

  const apply = () => {
    const a = Number(text.m);
    const b = Number(text.n);
    if (Number.isInteger(a) && Number.isInteger(b) && a > 0 && b > 0 && a <= 1e9 && b <= 1e9) {
      setVals({ m: a, n: b });
    }
  };

  const setPreset = (pm: number, pn: number) => {
    setVals({ m: pm, n: pn });
    setText({ m: String(pm), n: String(pn) });
  };

  return (
    <div className="my-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 mb-4 font-mono text-xs">
        <div>
          <span className="font-display text-base font-semibold text-foreground">
            GCD Comparison: Brute Force vs Euclid
          </span>
          <span className="text-muted-foreground ml-2">
            gcd({vals.m}, {vals.n}) = <strong className="text-mint">{summary.gcd}</strong>
          </span>
        </div>
        <div className="px-2.5 py-1 rounded-full border border-sky/40 bg-sky/10 text-sky font-semibold">
          {summary.speedupRatio}&times; fewer operations with Euclid
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Brute force card */}
        <div className="flex flex-col gap-2.5 p-4 rounded-xl border border-border bg-secondary/30">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground">Brute force approach</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
              O(min(m, n))
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tests candidate divisors starting at min({vals.m}, {vals.n}) = {Math.min(vals.m, vals.n)} counting downward until finding one that divides both.
          </p>
          <div className="mt-auto pt-2 border-t border-border/50 flex flex-col gap-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Divisors tested:</span>
              <strong className="text-orange">{summary.bruteForceTests.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Checked range:</span>
              <span>
                {Math.min(vals.m, vals.n)} &rarr; {summary.gcd}
              </span>
            </div>
          </div>
        </div>

        {/* Euclid's algorithm card */}
        <div className="flex flex-col gap-2.5 p-4 rounded-xl border border-sky/30 bg-sky/5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground">Euclid&apos;s algorithm</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky/20 text-sky font-semibold">
              O(log(min(m, n)))
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Replaces (m, n) with (n, m mod n) each step. Cuts problem size at least in half every two steps.
          </p>
          <div className="mt-auto pt-2 border-t border-sky/20 flex flex-col gap-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Division steps:</span>
              <strong className="text-mint">{summary.euclidDivisions.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Halving rate:</span>
              <span className="text-sky font-semibold">Exponential reduction</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2 font-mono text-xs">
        <span className="text-muted-foreground">Inputs:</span>
        <input
          aria-label="m"
          className={`${inputCls} w-24`}
          value={text.m}
          inputMode="numeric"
          onChange={(e) => setText((t) => ({ ...t, m: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && apply()}
        />
        <input
          aria-label="n"
          className={`${inputCls} w-24`}
          value={text.n}
          inputMode="numeric"
          onChange={(e) => setText((t) => ({ ...t, n: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && apply()}
        />
        <button type="button" className={btn} onClick={apply}>
          Compare
        </button>
        <span className="text-muted-foreground ml-1">Presets:</span>
        <button type="button" className={btn} onClick={() => setPreset(210, 45)}>
          (210, 45)
        </button>
        <button type="button" className={btn} onClick={() => setPreset(97, 20)}>
          Coprime: (97, 20)
        </button>
        <button type="button" className={btn} onClick={() => setPreset(89, 55)}>
          Fibonacci: (89, 55)
        </button>
        <button type="button" className={btn} onClick={() => setPreset(31415, 14142)}>
          Large: (31415, 14142)
        </button>
      </div>
    </div>
  );
}

/* ------------------ Adjacency Visualizer ------------------ */

export function AdjacencyVisualizer({
  initialPreset = "triangle",
}: {
  initialPreset?: "triangle" | "house" | "sparse" | "dag";
}) {
  const [preset, setPreset] = useState<"triangle" | "house" | "sparse" | "dag">(initialPreset);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const [queryU, setQueryU] = useState<number>(0);
  const [queryV, setQueryV] = useState<number>(1);

  const presetConfig = useMemo(() => {
    switch (preset) {
      case "triangle":
        return {
          nodes: [
            { id: 0, label: "0", x: 70, y: 150 },
            { id: 1, label: "1", x: 190, y: 50 },
            { id: 2, label: "2", x: 190, y: 220 },
          ],
          edges: [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 0 },
          ],
          directed: false,
          label: "Triangle (3 nodes)",
        };
      case "house":
        return {
          nodes: [
            { id: 0, label: "0", x: 60, y: 130 },
            { id: 1, label: "1", x: 160, y: 50 },
            { id: 2, label: "2", x: 160, y: 210 },
            { id: 3, label: "3", x: 270, y: 50 },
            { id: 4, label: "4", x: 270, y: 210 },
          ],
          edges: [
            { from: 0, to: 1 },
            { from: 0, to: 2 },
            { from: 1, to: 2 },
            { from: 1, to: 3 },
            { from: 2, to: 4 },
            { from: 3, to: 4 },
          ],
          directed: false,
          label: "House (5 nodes)",
        };
      case "dag":
        return {
          nodes: [
            { id: 0, label: "0", x: 60, y: 120 },
            { id: 1, label: "1", x: 160, y: 50 },
            { id: 2, label: "2", x: 160, y: 190 },
            { id: 3, label: "3", x: 280, y: 120 },
          ],
          edges: [
            { from: 0, to: 1 },
            { from: 0, to: 2 },
            { from: 1, to: 3 },
            { from: 2, to: 3 },
            { from: 0, to: 3 },
          ],
          directed: true,
          label: "Directed DAG (4 nodes)",
        };
      case "sparse":
      default:
        return {
          nodes: GRAPH_PRESETS.default.nodes,
          edges: GRAPH_PRESETS.default.edges,
          directed: false,
          label: "Sparse Graph (7 nodes)",
        };
    }
  }, [preset]);

  const summary = useMemo(
    () => getAdjacencySummary(presetConfig.nodes.length, presetConfig.edges, presetConfig.directed),
    [presetConfig]
  );

  const activeNode = selectedNode ?? hoveredNode;
  const activeEdge = hoveredCell;

  const isEdgeHighlighted = (e: GraphEdge) => {
    if (activeEdge) {
      if (presetConfig.directed) {
        return e.from === activeEdge[0] && e.to === activeEdge[1];
      }
      return (
        (e.from === activeEdge[0] && e.to === activeEdge[1]) ||
        (e.from === activeEdge[1] && e.to === activeEdge[0])
      );
    }
    if (activeNode !== null) {
      return e.from === activeNode || (!presetConfig.directed && e.to === activeNode);
    }
    return false;
  };

  const isNodeHighlighted = (id: number) => {
    if (activeNode !== null) return id === activeNode;
    if (activeEdge !== null) return id === activeEdge[0] || id === activeEdge[1];
    return false;
  };

  const isEdgeQueryConnected = summary.matrix[queryU]?.[queryV] === 1;
  const listNeighborsForQuery = summary.list[queryU] ?? [];

  return (
    <div className="my-6 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-display text-foreground">
            Graph Storage: Adjacency Matrix vs Adjacency List
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click nodes, cells, or neighbors to trace connections across both representations.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 font-mono text-xs">
          {(["triangle", "house", "sparse", "dag"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPreset(p);
                setSelectedNode(null);
                setHoveredCell(null);
                setQueryU(0);
                setQueryV(1);
              }}
              className={`px-3 py-1 rounded-full border transition-colors ${
                preset === p
                  ? "bg-sky text-slate-950 font-bold border-sky shadow-xs"
                  : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
              }`}
            >
              {p === "triangle" ? "Triangle (3)" : p === "house" ? "House (5)" : p === "sparse" ? "Sparse (7)" : "Directed DAG (4)"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-secondary/30">
          <div className="text-xs font-mono text-muted-foreground mb-2 flex items-center justify-between w-full">
            <span>Graph Diagram ({presetConfig.directed ? "Directed" : "Undirected"})</span>
            {activeNode !== null && (
              <span className="text-sky font-bold">Node {activeNode} focused</span>
            )}
          </div>
          <GraphSvg
            nodes={presetConfig.nodes}
            edges={presetConfig.edges}
            directed={presetConfig.directed}
            onNodeClick={(id) => setSelectedNode((prev) => (prev === id ? null : id))}
            onNodeHover={(id) => setHoveredNode(id)}
            edgeClass={(e) =>
              isEdgeHighlighted(e)
                ? { stroke: "stroke-sky", width: 3.5 }
                : { stroke: "stroke-border", width: 2 }
            }
            nodeClass={(id) =>
              isNodeHighlighted(id)
                ? "fill-sky/25 stroke-sky font-bold"
                : "fill-card stroke-muted-foreground/60"
            }
          />
          <div className="text-[11px] text-muted-foreground mt-2 text-center">
            {selectedNode !== null ? (
              <span>Node {selectedNode} selected. Click it again to unpin.</span>
            ) : (
              <span>Hover or click any node to trace its row &amp; adjacency list.</span>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col rounded-xl border border-border bg-secondary/20 p-3">
              <div className="flex items-center justify-between text-xs font-mono text-foreground font-semibold mb-2">
                <span>Adjacency Matrix</span>
                <span className="text-[11px] text-muted-foreground">
                  {summary.isSymmetric ? "Symmetric (M = Mᵀ)" : "Asymmetric"}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-center font-mono text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1 text-muted-foreground text-[10px] border-b border-border">u \ v</th>
                      {Array.from({ length: summary.nodeCount }, (_, i) => (
                        <th
                          key={i}
                          className={`p-1 text-[11px] border-b border-border ${
                            activeNode === i ? "text-sky font-bold bg-sky/10 rounded-t" : "text-muted-foreground"
                          }`}
                        >
                          {presetConfig.nodes[i]?.label ?? i}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.matrix.map((row, r) => (
                      <tr
                        key={r}
                        className={activeNode === r ? "bg-sky/10" : ""}
                        onMouseEnter={() => setHoveredNode(r)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <td className={`p-1 font-bold text-[11px] border-r border-border ${activeNode === r ? "text-sky" : "text-muted-foreground"}`}>
                          {presetConfig.nodes[r]?.label ?? r}
                        </td>
                        {row.map((val, c) => {
                          const isHoveredCell = hoveredCell && hoveredCell[0] === r && hoveredCell[1] === c;
                          const isConnected = val === 1;
                          return (
                            <td
                              key={c}
                              onMouseEnter={() => setHoveredCell([r, c])}
                              onMouseLeave={() => setHoveredCell(null)}
                              className={`p-1 cursor-pointer transition-colors border border-border/40 text-[11px] ${
                                isHoveredCell
                                  ? "bg-neon/30 text-neon font-bold ring-1 ring-neon"
                                  : isConnected
                                    ? "bg-sky/20 text-sky font-bold"
                                    : "text-muted-foreground/60 hover:bg-muted/40"
                              }`}
                              title={`matrix[${r}][${c}] = ${val}`}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                Allocates <span className="font-mono text-foreground">{summary.nodeCount} × {summary.nodeCount} = {summary.matrixMemoryBytes}</span> entries (Θ(V²) space).
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-border bg-secondary/20 p-3">
              <div className="flex items-center justify-between text-xs font-mono text-foreground font-semibold mb-2">
                <span>Adjacency List</span>
                <span className="text-[11px] text-muted-foreground">List&lt;List&lt;Integer&gt;&gt;</span>
              </div>
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto font-mono text-xs">
                {summary.list.map((neighbors, u) => {
                  const isNodeActive = activeNode === u;
                  return (
                    <div
                      key={u}
                      onMouseEnter={() => setHoveredNode(u)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className={`flex items-center gap-2 p-1.5 rounded-lg border transition-colors ${
                        isNodeActive
                          ? "border-sky bg-sky/15 text-foreground"
                          : "border-border/60 bg-card/60 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <span className={`w-14 font-bold text-[11px] ${isNodeActive ? "text-sky" : "text-foreground"}`}>
                        adj[{presetConfig.nodes[u]?.label ?? u}]:
                      </span>
                      <div className="flex flex-wrap gap-1 items-center">
                        {neighbors.length === 0 ? (
                          <span className="text-[11px] italic text-muted-foreground">empty</span>
                        ) : (
                          neighbors.map((v, idx) => {
                            const isCellMatch = hoveredCell && hoveredCell[0] === u && hoveredCell[1] === v;
                            return (
                              <span
                                key={idx}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  setHoveredCell([u, v]);
                                }}
                                onMouseLeave={() => setHoveredCell(null)}
                                className={`px-2 py-0.5 rounded text-[11px] border cursor-pointer transition-all ${
                                  isCellMatch
                                    ? "bg-neon text-slate-950 font-bold border-neon"
                                    : "bg-secondary text-foreground border-border hover:border-sky"
                                }`}
                              >
                                {presetConfig.nodes[v]?.label ?? v}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                Allocates <span className="font-mono text-foreground">{summary.nodeCount}</span> list headers + <span className="font-mono text-foreground">{presetConfig.directed ? summary.edgeCount : 2 * summary.edgeCount}</span> elements (O(V + E) space).
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-3 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="font-semibold text-foreground">Interactive Query Benchmark:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Check edge:</span>
                <select
                  value={queryU}
                  onChange={(e) => setQueryU(Number(e.target.value))}
                  aria-label="Source vertex u"
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground"
                >
                  {presetConfig.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label ?? n.id}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">→</span>
                <select
                  value={queryV}
                  onChange={(e) => setQueryV(Number(e.target.value))}
                  aria-label="Target vertex v"
                  className="rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground"
                >
                  {presetConfig.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label ?? n.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded border border-border bg-card">
                <div className="font-semibold text-sky mb-1">Matrix: matrix[{queryU}][{queryV}]</div>
                <div className="text-muted-foreground">
                  Result: <span className="font-bold text-foreground">{isEdgeQueryConnected ? "Connected (1)" : "Not connected (0)"}</span>
                </div>
                <div className="text-muted-foreground">
                  Cost: <span className="text-mint font-bold">1 operation (O(1) direct cell index)</span>
                </div>
              </div>
              <div className="p-2 rounded border border-border bg-card">
                <div className="font-semibold text-sky mb-1">List: scan adj[{queryU}]</div>
                <div className="text-muted-foreground">
                  Elements scanned: <span className="font-bold text-foreground">{listNeighborsForQuery.length}</span> (deg({queryU}))
                </div>
                <div className="text-muted-foreground">
                  Cost: <span className="text-foreground font-bold">O(deg({queryU})) list traversal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ BFS Queue Explosion Bug ------------------ */

export function BfsQueueExplosionVisualizer() {
  const [mode, setMode] = useState<"enqueue" | "dequeue">("enqueue");
  const frames = useMemo(() => bfsQueueExplosionFrames(mode), [mode]);

  const nodes: GraphNode[] = [
    { id: 0, x: 50, y: 130 },
    { id: 1, x: 170, y: 50 },
    { id: 2, x: 170, y: 130 },
    { id: 3, x: 170, y: 210 },
    { id: 4, x: 300, y: 90 },
    { id: 5, x: 300, y: 170 },
  ];
  const edges: GraphEdge[] = [
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 0, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },
    { from: 2, to: 4 },
    { from: 2, to: 5 },
    { from: 3, to: 4 },
    { from: 3, to: 5 },
  ];

  return (
    <Stepper
      title="BFS trap: Mark on enqueue vs mark on dequeue"
      frames={frames}
      code={JAVA_BFS_QUEUE_EXPLOSION[mode]}
      legend={[
        ["bg-neon", "current / checking"],
        ["bg-sky", "in queue"],
        ["bg-mint", "visited & finished"],
        ["bg-orange", "duplicate copy in queue"],
      ]}
      render={(s) => {
        const { queue, visited, current, checking, duplicateValuesInQueue, totalEnqueues, maxQueueLength, duplicateEnqueues } = s;

        return (
          <div className="flex flex-col gap-4">
            <GraphSvg
              nodes={nodes}
              edges={edges}
              edgeClass={(e) =>
                sameEdge(e, checking)
                  ? { stroke: "stroke-neon", width: 4 }
                  : { stroke: "stroke-border", width: 2 }
              }
              nodeClass={(id) =>
                id === current
                  ? "fill-neon/40 stroke-neon font-bold"
                  : duplicateValuesInQueue.includes(id)
                    ? "fill-orange/30 stroke-orange font-bold animate-pulse"
                    : visited.includes(id)
                      ? "fill-mint/25 stroke-mint"
                      : queue.includes(id)
                        ? "fill-sky/20 stroke-sky"
                        : "fill-card stroke-muted-foreground/60"
              }
            />

            <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-secondary/30">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="font-semibold text-foreground">Queue contents (front → back):</span>
                {duplicateValuesInQueue.length > 0 && (
                  <span className="px-2 py-0.5 rounded border border-orange/40 bg-orange/15 text-orange font-bold text-[11px] animate-pulse">
                    ⚠️ {duplicateValuesInQueue.length} duplicate node(s) detected in queue!
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 min-h-8 font-mono text-xs">
                {queue.length === 0 ? (
                  <span className="text-muted-foreground italic text-xs">queue is empty</span>
                ) : (
                  queue.map((nodeId, idx) => {
                    const isDup = queue.slice(0, idx).includes(nodeId);
                    return (
                      <span
                        key={idx}
                        className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                          isDup
                            ? "border-orange bg-orange/20 text-orange font-bold shadow-xs ring-1 ring-orange/50"
                            : "border-sky bg-sky/15 text-sky"
                        }`}
                      >
                        {nodeId} {isDup && <span className="text-[10px] ml-1 opacity-90">(dup)</span>}
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <div className="text-muted-foreground text-[10px]">Queue Size</div>
                <div className="text-base font-bold text-foreground">{queue.length}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <div className="text-muted-foreground text-[10px]">Peak Queue Size</div>
                <div className="text-base font-bold text-sky">{maxQueueLength}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <div className="text-muted-foreground text-[10px]">Total Enqueued</div>
                <div className={`text-base font-bold ${totalEnqueues > 6 ? "text-orange" : "text-mint"}`}>
                  {totalEnqueues}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card">
                <div className="text-muted-foreground text-[10px]">Duplicate Enqueues</div>
                <div className={`text-base font-bold ${duplicateEnqueues > 0 ? "text-orange" : "text-mint"}`}>
                  {duplicateEnqueues}
                </div>
              </div>
            </div>
          </div>
        );
      }}
      inputs={
        <Toggle<"enqueue" | "dequeue">
          value={mode}
          onChange={setMode}
          options={[
            ["enqueue", "Mark on enqueue (Correct: O(V) queue)"],
            ["dequeue", "Mark on dequeue (Buggy: queue explodes)"],
          ]}
        />
      }
    />
  );
}

/* ------------------ Shortest Path Comparison Visualizer ------------------ */

export function ShortestPathCompareVisualizer() {
  const [start, setStart] = useState<number>(0);
  const [target, setTarget] = useState<number>(6);
  const [viewMode, setViewMode] = useState<"both" | "bfs" | "dfs">("both");

  const nodes = GRAPH_PRESETS.default.nodes;
  const edges = GRAPH_PRESETS.default.edges;

  const summary = useMemo(
    () => shortestPathSummary(nodes.length, edges, start, target, false),
    [nodes, edges, start, target]
  );

  const isBfsPathEdge = (e: GraphEdge) => {
    for (let i = 0; i < summary.bfsPath.length - 1; i++) {
      const u = summary.bfsPath[i];
      const v = summary.bfsPath[i + 1];
      if ((e.from === u && e.to === v) || (e.from === v && e.to === u)) return true;
    }
    return false;
  };

  const isDfsPathEdge = (e: GraphEdge) => {
    for (let i = 0; i < summary.dfsPath.length - 1; i++) {
      const u = summary.dfsPath[i];
      const v = summary.dfsPath[i + 1];
      if ((e.from === u && e.to === v) || (e.from === v && e.to === u)) return true;
    }
    return false;
  };

  const layerColors: Record<number, string> = {
    0: "fill-neon/30 stroke-neon text-neon",
    1: "fill-sky/20 stroke-sky text-sky",
    2: "fill-violet/20 stroke-violet text-violet",
    3: "fill-mint/20 stroke-mint text-mint",
  };

  return (
    <div className="my-6 rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold font-display text-foreground">
            Unweighted Shortest Path: BFS vs DFS
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            BFS guarantees the minimum number of edges by expanding concentric layers. DFS dives deep and can take many unnecessary hops.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Start:</span>
            <select
              value={start}
              onChange={(e) => setStart(Number(e.target.value))}
              aria-label="Start node"
              className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground font-mono"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  Node {n.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Target:</span>
            <select
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              aria-label="Target node"
              className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground font-mono"
            >
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  Node {n.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-secondary/30">
          <div className="flex items-center justify-between w-full text-xs font-mono text-muted-foreground mb-2">
            <span>Graph Layers from Node {start}</span>
            <Toggle<"both" | "bfs" | "dfs">
              value={viewMode}
              onChange={setViewMode}
              options={[
                ["both", "Both paths"],
                ["bfs", "BFS only"],
                ["dfs", "DFS only"],
              ]}
            />
          </div>
          <GraphSvg
            nodes={nodes}
            edges={edges}
            edgeClass={(e) => {
              const onBfs = isBfsPathEdge(e);
              const onDfs = isDfsPathEdge(e);
              if (viewMode === "bfs") {
                return onBfs
                  ? { stroke: "stroke-mint", width: 4 }
                  : { stroke: "stroke-border", width: 2 };
              }
              if (viewMode === "dfs") {
                return onDfs
                  ? { stroke: "stroke-orange", width: 4 }
                  : { stroke: "stroke-border", width: 2 };
              }
              if (onBfs && onDfs) {
                return { stroke: "stroke-mint", width: 4 };
              }
              if (onBfs) return { stroke: "stroke-mint", width: 4 };
              if (onDfs) return { stroke: "stroke-orange", width: 3, dash: "5 4" };
              return { stroke: "stroke-border", width: 2 };
            }}
            nodeClass={(id) => {
              if (id === start) return "fill-neon/30 stroke-neon font-bold";
              if (id === target) return "fill-mint/30 stroke-mint font-bold ring-2 ring-mint";
              const layer = summary.bfsLayers[id] ?? 0;
              return layerColors[layer] ?? "fill-card stroke-muted-foreground";
            }}
          />
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-neon/80" /> Start (d=0)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky/80" /> Layer 1 (d=1)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-violet/80" /> Layer 2 (d=2)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-mint/80" /> Layer 3 (d=3)
            </span>
          </div>
        </div>

        <div className="lg:col-span-6 flex flex-col gap-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl border border-mint/40 bg-mint/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-mint text-sm">Breadth-First Search (BFS)</span>
              <span className="px-2 py-0.5 rounded-full bg-mint/15 text-mint font-semibold text-[11px]">
                Guaranteed Shortest Path
              </span>
            </div>
            <div className="text-foreground font-semibold text-sm mb-1">
              Path: {summary.bfsPath.join(" → ")}
            </div>
            <div className="text-muted-foreground text-[11px] mb-2">
              Length: <span className="text-foreground font-bold">{summary.bfsHops} edge{summary.bfsHops === 1 ? "" : "s"}</span> ({summary.bfsPath.length} vertices)
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              BFS explores all vertices at distance <em>k</em> before distance <em>k+1</em>. The very first time target node {target} is reached, no path with fewer edges can exist.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-orange/40 bg-orange/5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-orange text-sm">Depth-First Search (DFS)</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                summary.extraHops > 0 ? "bg-orange/15 text-orange" : "bg-secondary text-muted-foreground"
              }`}>
                {summary.extraHops > 0 ? `Suboptimal (+${summary.extraHops} extra hops)` : "Same length on this path"}
              </span>
            </div>
            <div className="text-foreground font-semibold text-sm mb-1">
              Path: {summary.dfsPath.join(" → ")}
            </div>
            <div className="text-muted-foreground text-[11px] mb-2">
              Length: <span className="text-foreground font-bold">{summary.dfsHops} edge{summary.dfsHops === 1 ? "" : "s"}</span> ({summary.dfsPath.length} vertices)
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              DFS dives deeply along the first available branch. If that branch happens to twist through other vertices before reaching {target}, DFS commits to it and returns a much longer path.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
