/* ============================================================
   Algorithm frame generators.

   Each generator runs a real algorithm and records a "frame" at
   every meaningful moment: a snapshot of the state, the line of
   Java source being executed, a plain-English message, and running
   counters (comparisons, swaps, ...). The visualizers in
   src/components/mdx/AlgoVisualizers.tsx only replay these frames,
   so all the logic lives here and is unit-tested directly.
   ============================================================ */

export type Frame<S> = {
  state: S;
  line: number; // 0-based index into the matching JAVA_* source
  message: string;
  stats: Record<string, number>;
};

/* ---------------------------- arrays ---------------------------- */

export type ArrayState = {
  array: number[];
  compare?: number[]; // indices being compared right now
  write?: number[]; // indices being swapped / shifted / written
  sorted?: number[]; // indices in their final position
  pivot?: number;
  range?: [number, number]; // active window; everything else is dimmed
  pointers?: Record<string, number>; // labels drawn under indices
  held?: { label: string; value: number; id?: number }; // a value held outside the array (insertion key)
  ids?: number[]; // stable identity per slot, so a view can animate elements moving between slots
  gap?: number; // a slot whose value has been lifted out (insertion sort's hole)
  split?: number; // indices < split form the sorted prefix (insertion sort's "hand")
  aux?: (number | null)[]; // merge sort's temporary buffer
  auxIds?: (number | null)[]; // identity of each element sitting in aux
  auxWrite?: number[]; // aux slots written this step
  holes?: number[]; // array slots whose element has moved down into aux
  cuts?: number[]; // split points b (between b - 1 and b) that have not been merged back yet
  stack?: [number, number][]; // active recursive calls as [lo, hi], outermost first
  marks?: { from: number; to: number; label: string }[]; // labelled spans under the array
  found?: number;
};

export type SortAlgorithm = "selection" | "bubble" | "insertion" | "merge" | "quick";
export type SearchAlgorithm = "linear" | "binary";

export const JAVA_SORT: Record<SortAlgorithm, string[]> = {
  selection: [
    "static void selectionSort(int[] a) {",
    "    for (int i = 0; i < a.length - 1; i++) {",
    "        int min = i;                      // assume a[i] is the smallest",
    "        for (int j = i + 1; j < a.length; j++) {",
    "            if (a[j] < a[min]) {",
    "                min = j;                  // found a smaller one",
    "            }",
    "        }",
    "        swap(a, i, min);                  // put it in position i",
    "    }",
    "}",
  ],
  bubble: [
    "static void bubbleSort(int[] a) {",
    "    for (int i = 0; i < a.length - 1; i++) {",
    "        boolean swapped = false;",
    "        for (int j = 0; j < a.length - 1 - i; j++) {",
    "            if (a[j + 1] < a[j]) {",
    "                swap(a, j, j + 1);        // neighbours out of order",
    "                swapped = true;",
    "            }",
    "        }",
    "        if (!swapped) break;              // no swaps = already sorted",
    "    }",
    "}",
  ],
  insertion: [
    "static void insertionSort(int[] a) {",
    "    for (int i = 1; i < a.length; i++) {",
    "        int key = a[i];                   // pick up the next card",
    "        int j = i - 1;",
    "        while (j >= 0 && a[j] > key) {",
    "            a[j + 1] = a[j];              // shift bigger one right",
    "            j--;",
    "        }",
    "        a[j + 1] = key;                   // drop the card in the gap",
    "    }",
    "}",
  ],
  merge: [
    "static void mergeSort(int[] a, int lo, int hi) {",
    "    if (hi - lo < 1) return;              // 0 or 1 element: sorted",
    "    int mid = (lo + hi) / 2;",
    "    mergeSort(a, lo, mid);                // divide: left half",
    "    mergeSort(a, mid + 1, hi);            // divide: right half",
    "    merge(a, lo, mid, hi);                // combine",
    "}",
    "",
    "static void merge(int[] a, int lo, int mid, int hi) {",
    "    int[] tmp = new int[hi - lo + 1];",
    "    int i = lo, j = mid + 1, k = 0;",
    "    while (i <= mid && j <= hi) {",
    "        if (a[i] <= a[j]) tmp[k++] = a[i++];",
    "        else              tmp[k++] = a[j++];",
    "    }",
    "    while (i <= mid) tmp[k++] = a[i++];   // leftovers",
    "    while (j <= hi)  tmp[k++] = a[j++];",
    "    for (k = 0; k < tmp.length; k++) a[lo + k] = tmp[k];",
    "}",
  ],
  quick: [
    "static void quickSort(int[] a, int lo, int hi) {",
    "    if (lo >= hi) return;                 // 0 or 1 element: sorted",
    "    int p = partition(a, lo, hi);",
    "    quickSort(a, lo, p - 1);",
    "    quickSort(a, p + 1, hi);",
    "}",
    "",
    "static int partition(int[] a, int lo, int hi) {",
    "    int pivot = a[hi];                    // last element is the pivot",
    "    int left = lo, right = hi;",
    "    while (left < right) {",
    "        while (a[left] <= pivot && left < right) left++;",
    "        while (a[right] >= pivot && left < right) right--;",
    "        swap(a, left, right);",
    "    }",
    "    swap(a, left, hi);                    // pivot lands in its final spot",
    "    return left;",
    "}",
  ],
};

export const JAVA_SEARCH: Record<SearchAlgorithm, string[]> = {
  linear: [
    "static int linearSearch(int[] a, int x) {",
    "    for (int i = 0; i < a.length; i++) {",
    "        if (a[i] == x) return i;          // found it",
    "    }",
    "    return -1;                            // checked everything",
    "}",
  ],
  binary: [
    "static int binarySearch(int[] a, int x) {",
    "    int low = 0, high = a.length - 1;",
    "    while (low <= high) {",
    "        int mid = low + (high - low) / 2;",
    "        if (a[mid] == x) return mid;",
    "        else if (a[mid] < x) low = mid + 1;   // go right",
    "        else high = mid - 1;                  // go left",
    "    }",
    "    return -1;",
    "}",
  ],
};

const range = (a: number, b: number) => {
  const out: number[] = [];
  for (let i = a; i <= b; i++) out.push(i);
  return out;
};

export function sortFrames(algorithm: SortAlgorithm, input: number[]): Frame<ArrayState>[] {
  const a = [...input];
  const n = a.length;
  const frames: Frame<ArrayState>[] = [];
  const stats = { comparisons: 0, writes: 0 };
  const writeLabel = algorithm === "insertion" || algorithm === "merge" ? "writes" : "swaps";
  const sorted = new Set<number>();

  // insertion and merge sort track which element sits in each slot so the view can slide them around
  const ids = algorithm === "insertion" || algorithm === "merge" || algorithm === "quick" ? range(0, n - 1) : undefined;

  const push = (line: number, message: string, s: Omit<ArrayState, "array" | "sorted"> = {}) => {
    frames.push({
      state: { ...s, array: [...a], sorted: [...sorted], ...(ids && { ids: [...ids] }) },
      line,
      message,
      stats: { comparisons: stats.comparisons, [writeLabel]: stats.writes },
    });
  };
  const swap = (i: number, j: number) => {
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
    if (ids) [ids[i], ids[j]] = [ids[j], ids[i]];
    stats.writes++;
  };

  push(0, `Start with ${n} unsorted numbers.`, algorithm === "insertion" ? { split: Math.min(1, n) } : {});

  if (algorithm === "selection") {
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      push(2, `Pass ${i + 1}: assume ${a[i]} (index ${i}) is the smallest of what's left.`, { pointers: { i, min }, range: [i, n - 1] });
      for (let j = i + 1; j < n; j++) {
        stats.comparisons++;
        const smaller = a[j] < a[min];
        push(4, `Is ${a[j]} smaller than the current minimum ${a[min]}? ${smaller ? "Yes." : "No."}`, { compare: [j, min], pointers: { i, j, min }, range: [i, n - 1] });
        if (smaller) {
          min = j;
          push(5, `New minimum: ${a[min]} at index ${min}.`, { pointers: { i, j, min }, range: [i, n - 1] });
        }
      }
      if (min !== i) {
        swap(i, min);
        push(8, `Swap the minimum into position ${i}.`, { write: [i, min], pointers: { i, min }, range: [i, n - 1] });
      } else {
        push(8, `${a[i]} is already the minimum — it stays put.`, { pointers: { i }, range: [i, n - 1] });
      }
      sorted.add(i);
    }
    sorted.add(n - 1);
  }

  if (algorithm === "bubble") {
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      push(2, `Pass ${i + 1}: walk left to right, swapping any neighbours that are out of order.`, { range: [0, n - 1 - i] });
      for (let j = 0; j < n - 1 - i; j++) {
        stats.comparisons++;
        const out = a[j + 1] < a[j];
        push(4, `Compare ${a[j]} and ${a[j + 1]}: ${out ? "out of order." : "fine."}`, { compare: [j, j + 1], pointers: { j }, range: [0, n - 1 - i] });
        if (out) {
          swap(j, j + 1);
          swapped = true;
          push(5, `Swap them — the bigger one bubbles right.`, { write: [j, j + 1], pointers: { j }, range: [0, n - 1 - i] });
        }
      }
      sorted.add(n - 1 - i);
      if (!swapped) {
        range(0, n - 1).forEach((k) => sorted.add(k));
        push(9, `No swaps in this pass, so the array is already sorted. Stop early.`);
        break;
      }
      push(1, `${a[n - 1 - i]} has bubbled to its final position.`, { range: [0, n - 1 - i] });
    }
    range(0, n - 1).forEach((k) => sorted.add(k));
  }

  if (algorithm === "insertion") {
    for (let i = 1; i < n; i++) {
      const key = a[i];
      const held = { label: "key", value: key, id: ids![i] };
      const split = i + 1;
      let j = i - 1;
      push(2, `Pick up ${key}. Everything to its left is already in order.`, { held, gap: i, split, pointers: { i } });
      while (j >= 0) {
        stats.comparisons++;
        const bigger = a[j] > key;
        push(4, `Is ${a[j]} bigger than ${key}? ${bigger ? "Yes — it has to move." : "No — the gap is here."}`, { compare: [j], held, gap: j + 1, split, pointers: { i, j } });
        if (!bigger) break;
        a[j + 1] = a[j];
        ids![j + 1] = ids![j];
        stats.writes++;
        push(5, `Shift ${a[j]} one step right.`, { write: [j + 1], held, gap: j, split, pointers: { i, j } });
        j--;
      }
      a[j + 1] = key;
      ids![j + 1] = held.id;
      stats.writes++;
      push(8, `Drop ${key} into index ${j + 1}.`, { write: [j + 1], split, pointers: { i } });
    }
    range(0, n - 1).forEach((k) => sorted.add(k));
  }

  if (algorithm === "merge") {
    const cuts = new Set<number>();
    const stack: [number, number][] = [];
    const rec = (lo: number, hi: number) => {
      stack.push([lo, hi]);
      const at = () => ({ range: [lo, hi] as [number, number], cuts: [...cuts].sort((x, y) => x - y), stack: stack.map(([l, h]) => [l, h] as [number, number]) });
      if (hi - lo < 1) {
        push(1, `[${a.slice(lo, hi + 1).join(", ")}] has one element — already sorted.`, at());
        stack.pop();
        return;
      }
      const mid = Math.floor((lo + hi) / 2);
      cuts.add(mid + 1);
      push(2, `Split [${a.slice(lo, hi + 1).join(", ")}] into [${a.slice(lo, mid + 1).join(", ")}] and [${a.slice(mid + 1, hi + 1).join(", ")}].`, { ...at(), pointers: { lo, mid, hi } });
      rec(lo, mid);
      rec(mid + 1, hi);
      const tmp: (number | null)[] = new Array(hi - lo + 1).fill(null);
      const tmpIds: (number | null)[] = new Array(hi - lo + 1).fill(null);
      const holes: number[] = [];
      let i = lo;
      let j = mid + 1;
      let k = 0;
      // i or j that has run off the end of its half points at nothing worth drawing
      const fronts = () => ({ ...(i <= mid && { i }), ...(j <= hi && { j }) });
      const merging = () => ({ ...at(), aux: [...tmp], auxIds: [...tmpIds], holes: [...holes] });
      const take = (from: number) => {
        tmp[k] = a[from];
        tmpIds[k] = ids![from];
        holes.push(from);
        k++;
        stats.writes++;
      };
      push(9, `Merge the two sorted halves [${a.slice(lo, mid + 1).join(", ")}] and [${a.slice(mid + 1, hi + 1).join(", ")}].`, { ...merging(), pointers: fronts() });
      while (i <= mid && j <= hi) {
        stats.comparisons++;
        const takeLeft = a[i] <= a[j];
        const v = takeLeft ? a[i] : a[j];
        push(takeLeft ? 12 : 13, `Compare the fronts: ${a[i]} vs ${a[j]}. Take ${v}.`, { ...merging(), compare: [i, j], pointers: fronts() });
        take(takeLeft ? i++ : j++);
        push(takeLeft ? 12 : 13, `${v} moves down into tmp[${k - 1}].`, { ...merging(), auxWrite: [k - 1], pointers: fronts() });
      }
      const left = k;
      while (i <= mid) take(i++);
      while (j <= hi) take(j++);
      push(15, `One side ran out — copy the leftovers straight across.`, { ...merging(), auxWrite: range(left, hi - lo) });
      for (let t = 0; t < tmp.length; t++) {
        a[lo + t] = tmp[t] as number;
        ids![lo + t] = tmpIds[t] as number;
      }
      cuts.delete(mid + 1);
      push(17, `Copy the merged run back: [${a.slice(lo, hi + 1).join(", ")}].`, { ...at(), write: range(lo, hi) });
      stack.pop();
    };
    rec(0, n - 1);
    range(0, n - 1).forEach((k) => sorted.add(k));
  }

  if (algorithm === "quick") {
    // a placed pivot is cut off from its neighbours: there is nothing to combine afterwards
    const cuts = new Set<number>();
    const stack: [number, number][] = [];
    const at = (lo: number, hi: number) => ({
      range: [lo, hi] as [number, number],
      cuts: [...cuts].sort((x, y) => x - y),
      stack: stack.map(([l, h]) => [l, h] as [number, number]),
    });
    const partition = (lo: number, hi: number) => {
      const pivot = a[hi];
      let left = lo;
      let right = hi;
      // what each pointer has already walked past and confirmed
      const sides = () => ({
        marks: [
          ...(left > lo ? [{ from: lo, to: left - 1, label: `≤ ${pivot}` }] : []),
          ...(right < hi - 1 ? [{ from: right + 1, to: hi - 1, label: `≥ ${pivot}` }] : []),
        ],
      });
      const st = () => ({ ...at(lo, hi), ...sides(), pivot: hi, pointers: { left, right } });
      push(8, `Partition [${a.slice(lo, hi + 1).join(", ")}] around pivot ${pivot}.`, st());
      while (left < right) {
        while (left < right) {
          stats.comparisons++;
          const ok = a[left] <= pivot;
          push(11, `${a[left]} ≤ ${pivot}? ${ok ? "Yes, it belongs on the left — move on." : "No, it's too big for the left side. Stop."}`, { ...st(), compare: [left] });
          if (!ok) break;
          left++;
        }
        while (left < right) {
          stats.comparisons++;
          const ok = a[right] >= pivot;
          push(12, `${a[right]} ≥ ${pivot}? ${ok ? "Yes, it belongs on the right — move on." : "No, it's too small for the right side. Stop."}`, { ...st(), compare: [right] });
          if (!ok) break;
          right--;
        }
        if (left !== right) {
          swap(left, right);
          push(13, `Swap ${a[right]} and ${a[left]} — each goes to the side it belongs on.`, { ...st(), write: [left, right] });
        }
      }
      if (left !== hi) swap(left, hi);
      sorted.add(left);
      if (left > 0) cuts.add(left);
      if (left < n - 1) cuts.add(left + 1);
      push(15, `Pointers met. Pivot ${pivot} goes to index ${left}: smaller on its left, bigger on its right. It never moves again.`, { ...at(lo, hi), write: [left, hi], pointers: { p: left } });
      return left;
    };
    const rec = (lo: number, hi: number) => {
      if (lo >= hi) {
        if (lo === hi) {
          sorted.add(lo);
          stack.push([lo, hi]);
          push(1, `[${a[lo]}] is a single element — done.`, at(lo, hi));
          stack.pop();
        }
        return;
      }
      stack.push([lo, hi]);
      const p = partition(lo, hi);
      rec(lo, p - 1);
      rec(p + 1, hi);
      stack.pop();
    };
    rec(0, n - 1);
    range(0, n - 1).forEach((k) => sorted.add(k));
  }

  push(JAVA_SORT[algorithm].length - 1, `Sorted. ${stats.comparisons} comparisons, ${stats.writes} ${writeLabel}.`);
  return frames;
}

export function searchFrames(algorithm: SearchAlgorithm, input: number[], target: number): Frame<ArrayState>[] {
  const a = algorithm === "binary" ? [...input].sort((x, y) => x - y) : [...input];
  const frames: Frame<ArrayState>[] = [];
  let comparisons = 0;
  const push = (line: number, message: string, s: Omit<ArrayState, "array"> = {}) =>
    frames.push({ state: { ...s, array: a }, line, message, stats: { comparisons } });

  push(0, `Looking for ${target} in ${a.length} numbers${algorithm === "binary" ? " (sorted — binary search needs that)" : ""}.`);

  if (algorithm === "linear") {
    for (let i = 0; i < a.length; i++) {
      comparisons++;
      if (a[i] === target) {
        push(2, `a[${i}] = ${a[i]}. Found it at index ${i}.`, { compare: [i], found: i, pointers: { i } });
        return frames;
      }
      push(2, `a[${i}] = ${a[i]}. Not it, keep walking.`, { compare: [i], pointers: { i } });
    }
    push(4, `Reached the end. ${target} isn't here — return -1.`);
    return frames;
  }

  let low = 0;
  let high = a.length - 1;
  push(1, `The whole array is still possible: low = 0, high = ${high}.`, { range: [low, high], pointers: { low, high } });
  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    comparisons++;
    if (a[mid] === target) {
      push(4, `Middle is a[${mid}] = ${a[mid]}. Found it.`, { range: [low, high], compare: [mid], found: mid, pointers: { low, mid, high } });
      return frames;
    }
    if (a[mid] < target) {
      push(5, `Middle is a[${mid}] = ${a[mid]}, smaller than ${target}. Throw away the left half.`, { range: [low, high], compare: [mid], pointers: { low, mid, high } });
      low = mid + 1;
    } else {
      push(6, `Middle is a[${mid}] = ${a[mid]}, bigger than ${target}. Throw away the right half.`, { range: [low, high], compare: [mid], pointers: { low, mid, high } });
      high = mid - 1;
    }
  }
  push(8, `low passed high — nothing left to search. ${target} isn't here.`);
  return frames;
}

/* ------------------------------ GCD ------------------------------ */

export type GcdState = { rows: { m: number; n: number; r: number | null }[]; m: number; n: number; result?: number };

export const JAVA_GCD = [
  "static int gcd(int m, int n) {",
  "    while (n != 0) {",
  "        int r = m % n;                    // remainder",
  "        m = n;",
  "        n = r;",
  "    }",
  "    return m;",
  "}",
];

export function gcdFrames(m0: number, n0: number): Frame<GcdState>[] {
  let m = m0;
  let n = n0;
  const rows: GcdState["rows"] = [];
  const frames: Frame<GcdState>[] = [];
  let steps = 0;
  const push = (line: number, message: string, result?: number) =>
    frames.push({ state: { rows: rows.map((r) => ({ ...r })), m, n, result }, line, message, stats: { divisions: steps } });

  push(0, `gcd(${m}, ${n}): find the largest number that divides both.`);
  while (n !== 0) {
    push(1, `n = ${n} is not 0, so keep going.`);
    const r = m % n;
    steps++;
    rows.push({ m, n, r });
    push(2, `${m} mod ${n} = ${r}  (${m} = ${Math.floor(m / n)} × ${n} + ${r}).`);
    m = n;
    n = r;
    push(4, `Slide left: the problem is now gcd(${m}, ${n}) — same answer, smaller numbers.`);
  }
  rows.push({ m, n, r: null });
  push(6, `n = 0, so gcd(${m0}, ${n0}) = ${m}. Took ${steps} division${steps === 1 ? "" : "s"}.`, m);
  return frames;
}

/* ----------------------------- graphs ----------------------------- */

export type GraphNode = { id: number; x: number; y: number };
export type GraphEdge = { from: number; to: number; weight?: number };

export type TraversalState = {
  visited: number[];
  current?: number;
  checking?: [number, number];
  frontier: number[]; // queue (BFS) or call stack (DFS)
  order: number[];
  treeEdges: [number, number][];
};

export const JAVA_TRAVERSAL = {
  bfs: [
    "static void bfs(List<List<Integer>> adj, int start) {",
    "    boolean[] visited = new boolean[adj.size()];",
    "    Queue<Integer> queue = new ArrayDeque<>();",
    "    visited[start] = true;",
    "    queue.add(start);",
    "    while (!queue.isEmpty()) {",
    "        int v = queue.poll();             // oldest in line goes first",
    "        System.out.print(v + \" \");",
    "        for (int w : adj.get(v)) {",
    "            if (!visited[w]) {",
    "                visited[w] = true;",
    "                queue.add(w);             // join the back of the line",
    "            }",
    "        }",
    "    }",
    "}",
  ],
  dfs: [
    "static void dfs(List<List<Integer>> adj, int v, boolean[] visited) {",
    "    visited[v] = true;",
    "    System.out.print(v + \" \");",
    "    for (int w : adj.get(v)) {",
    "        if (!visited[w]) {",
    "            dfs(adj, w, visited);         // go deeper first",
    "        }",
    "    }",
    "    // every neighbour handled: return = backtrack",
    "}",
  ],
};

export function adjacency(nodeCount: number, edges: GraphEdge[], directed = false): number[][] {
  const adj: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const e of edges) {
    adj[e.from].push(e.to);
    if (!directed) adj[e.to].push(e.from);
  }
  adj.forEach((l) => l.sort((x, y) => x - y));
  return adj;
}

export function traversalFrames(kind: "bfs" | "dfs", nodeCount: number, edges: GraphEdge[], start = 0, directed = false): Frame<TraversalState>[] {
  const adj = adjacency(nodeCount, edges, directed);
  const frames: Frame<TraversalState>[] = [];
  const visited = new Set<number>();
  const order: number[] = [];
  const treeEdges: [number, number][] = [];
  let edgeChecks = 0;
  const push = (line: number, message: string, frontier: number[], current?: number, checking?: [number, number]) =>
    frames.push({
      state: { visited: [...visited], current, checking, frontier: [...frontier], order: [...order], treeEdges: treeEdges.map((e) => [...e] as [number, number]) },
      line,
      message,
      stats: { visited: order.length, "edge checks": edgeChecks },
    });

  if (kind === "bfs") {
    const queue: number[] = [];
    visited.add(start);
    queue.push(start);
    push(4, `Mark ${start} as seen and put it in the queue.`, queue);
    while (queue.length) {
      const v = queue.shift()!;
      order.push(v);
      push(7, `Take ${v} from the front of the queue and visit it.`, queue, v);
      for (const w of adj[v]) {
        edgeChecks++;
        if (!visited.has(w)) {
          visited.add(w);
          queue.push(w);
          treeEdges.push([v, w]);
          push(11, `${w} is new — mark it and add it to the back of the queue.`, queue, v, [v, w]);
        } else {
          push(9, `${w} was already seen — skip it.`, queue, v, [v, w]);
        }
      }
    }
    push(15, `Queue is empty. Visit order: ${order.join(" → ")}. Notice it went level by level.`, queue);
  } else {
    const stack: number[] = [];
    const rec = (v: number) => {
      visited.add(v);
      stack.push(v);
      order.push(v);
      push(2, `Visit ${v} and push it on the call stack.`, stack, v);
      for (const w of adj[v]) {
        edgeChecks++;
        if (!visited.has(w)) {
          treeEdges.push([v, w]);
          push(5, `${w} is unvisited — go deeper into ${w} before looking at anything else.`, stack, v, [v, w]);
          rec(w);
          push(3, `Back at ${v}. Check its next neighbour.`, stack, v);
        } else {
          push(4, `${w} is already visited — skip it.`, stack, v, [v, w]);
        }
      }
      stack.pop();
      push(8, `${v} has nothing new left. Pop it — backtrack${stack.length ? ` to ${stack[stack.length - 1]}` : ""}.`, stack, stack[stack.length - 1]);
    };
    rec(start);
    push(9, `Call stack is empty. Visit order: ${order.join(" → ")}. Notice it ran deep down one path first.`, stack);
  }
  return frames;
}

/* ------------------------------ MST ------------------------------ */

export type MstState = {
  accepted: number[]; // edge indices in the tree
  rejected: number[];
  candidates: number[];
  considering?: number;
  inTree: number[]; // nodes reached (Prim) / touched (Kruskal)
  total: number;
};

export const JAVA_MST = {
  prim: [
    "static int prim(int[][] w) {             // w[u][v] = weight, 0 = no edge",
    "    int n = w.length;",
    "    boolean[] inTree = new boolean[n];",
    "    inTree[0] = true;                     // start anywhere",
    "    int total = 0;",
    "    for (int added = 1; added < n; added++) {",
    "        int bu = -1, bv = -1;             // best crossing edge so far",
    "        for (int u = 0; u < n; u++)",
    "            for (int v = 0; v < n; v++)",
    "                if (inTree[u] && !inTree[v] && w[u][v] > 0",
    "                        && (bu == -1 || w[u][v] < w[bu][bv])) { bu = u; bv = v; }",
    "        inTree[bv] = true;                // greedy: take the cheapest one",
    "        total += w[bu][bv];",
    "    }",
    "    return total;",
    "}",
  ],
  kruskal: [
    "static int kruskal(int n, int[][] edges) {   // each edge = {u, v, w}",
    "    Arrays.sort(edges, (x, y) -> x[2] - y[2]); // cheapest first",
    "    int[] parent = new int[n];",
    "    for (int i = 0; i < n; i++) parent[i] = i; // everyone alone",
    "    int total = 0;",
    "    for (int[] e : edges) {",
    "        int ru = find(parent, e[0]), rv = find(parent, e[1]);",
    "        if (ru == rv) continue;              // same tree: cycle, reject",
    "        parent[ru] = rv;                     // join the two trees",
    "        total += e[2];",
    "    }",
    "    return total;",
    "}",
    "",
    "static int find(int[] parent, int x) {",
    "    while (parent[x] != x) x = parent[x];",
    "    return x;",
    "}",
  ],
};

export function mstFrames(kind: "prim" | "kruskal", nodeCount: number, edges: GraphEdge[]): Frame<MstState>[] {
  const frames: Frame<MstState>[] = [];
  const accepted: number[] = [];
  const rejected: number[] = [];
  const inTree = new Set<number>();
  let total = 0;
  let looked = 0;
  const w = (i: number) => edges[i].weight ?? 1;
  const push = (line: number, message: string, candidates: number[] = [], considering?: number) =>
    frames.push({
      state: { accepted: [...accepted], rejected: [...rejected], candidates, considering, inTree: [...inTree], total },
      line,
      message,
      stats: { "edges in tree": accepted.length, "total weight": total, "edges looked at": looked },
    });

  if (kind === "prim") {
    inTree.add(0);
    push(3, `Start the tree at node 0.`);
    while (inTree.size < nodeCount) {
      const crossing = edges.map((_, i) => i).filter((i) => inTree.has(edges[i].from) !== inTree.has(edges[i].to));
      if (!crossing.length) break;
      looked += crossing.length;
      push(9, `Edges leaving the tree: ${crossing.map((i) => `${edges[i].from}–${edges[i].to} (${w(i)})`).join(", ")}.`, crossing);
      const best = crossing.reduce((b, i) => (w(i) < w(b) ? i : b), crossing[0]);
      const e = edges[best];
      const newNode = inTree.has(e.from) ? e.to : e.from;
      accepted.push(best);
      inTree.add(newNode);
      total += w(best);
      push(11, `Cheapest is ${e.from}–${e.to} with weight ${w(best)}. Take it; node ${newNode} joins the tree.`, [], best);
    }
    push(14, `Every node is connected. Minimum spanning tree weight = ${total}.`);
  } else {
    const order = edges.map((_, i) => i).sort((x, y) => w(x) - w(y) || x - y);
    const parent = Array.from({ length: nodeCount }, (_, i) => i);
    const find = (x: number) => {
      while (parent[x] !== x) x = parent[x];
      return x;
    };
    push(1, `Sort all edges by weight: ${order.map((i) => w(i)).join(", ")}.`, order);
    for (const i of order) {
      if (accepted.length === nodeCount - 1) break;
      const e = edges[i];
      looked++;
      push(6, `Next cheapest: ${e.from}–${e.to} (${w(i)}). Are ${e.from} and ${e.to} already connected?`, [], i);
      const ru = find(e.from);
      const rv = find(e.to);
      if (ru === rv) {
        rejected.push(i);
        push(7, `Yes — adding it would close a loop. Reject.`, [], i);
      } else {
        parent[ru] = rv;
        accepted.push(i);
        inTree.add(e.from);
        inTree.add(e.to);
        total += w(i);
        push(8, `No — it joins two separate pieces. Accept.`, [], i);
      }
    }
    push(11, `${nodeCount - 1} edges accepted, so the tree is complete. Total weight = ${total}.`);
  }
  return frames;
}

/* ---------------------------- knapsack ---------------------------- */

export type KnapsackItem = { name: string; weight: number; value: number };

export type KnapsackState = {
  table: (number | null)[][]; // (n+1) x (W+1)
  cell?: [number, number];
  deps?: [number, number][];
  chosen: number[]; // item indices (0-based) picked during backtracking
  trace?: [number, number];
};

export const JAVA_KNAPSACK = [
  "static int knapsack(int[] wt, int[] val, int W) {",
  "    int n = wt.length;",
  "    int[][] V = new int[n + 1][W + 1];        // row 0 and column 0 stay 0",
  "    for (int i = 1; i <= n; i++) {",
  "        for (int w = 1; w <= W; w++) {",
  "            if (wt[i - 1] > w)",
  "                V[i][w] = V[i - 1][w];                    // doesn't fit",
  "            else",
  "                V[i][w] = Math.max(V[i - 1][w],           // skip it",
  "                        val[i - 1] + V[i - 1][w - wt[i - 1]]); // take it",
  "        }",
  "    }",
  "    return V[n][W];",
  "}",
];

export function knapsackFrames(items: KnapsackItem[], W: number): Frame<KnapsackState>[] {
  const n = items.length;
  const V: (number | null)[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: W + 1 }, (_, w) => (i === 0 || w === 0 ? 0 : null)));
  const frames: Frame<KnapsackState>[] = [];
  const chosen: number[] = [];
  let cells = 0;
  const push = (line: number, message: string, extra: Partial<KnapsackState> = {}) =>
    frames.push({ state: { table: V.map((r) => [...r]), chosen: [...chosen], ...extra }, line, message, stats: { "cells filled": cells } });

  push(2, `Row 0 (no items) and column 0 (no capacity) are all 0 — nothing fits, nothing earned.`);
  for (let i = 1; i <= n; i++) {
    const it = items[i - 1];
    for (let w = 1; w <= W; w++) {
      cells++;
      const skip = V[i - 1][w] as number;
      if (it.weight > w) {
        V[i][w] = skip;
        push(6, `${it.name} weighs ${it.weight} > capacity ${w}. It can't fit, so copy the value above: ${skip}.`, { cell: [i, w], deps: [[i - 1, w]] });
      } else {
        const take = it.value + (V[i - 1][w - it.weight] as number);
        V[i][w] = Math.max(skip, take);
        push(8, `Capacity ${w}: skip ${it.name} → ${skip}, or take it → ${it.value} + V[${i - 1}][${w - it.weight}] = ${take}. Best: ${V[i][w]}.`, { cell: [i, w], deps: [[i - 1, w], [i - 1, w - it.weight]] });
      }
    }
  }
  push(12, `The answer is in the bottom-right corner: ${V[n][W]}. Now walk back up to see which items made it.`, { cell: [n, W] });
  let w = W;
  for (let i = n; i >= 1; i--) {
    if (V[i][w] !== V[i - 1][w]) {
      chosen.push(i - 1);
      push(12, `V[${i}][${w}] ≠ V[${i - 1}][${w}], so ${items[i - 1].name} was taken. Move left by its weight (${items[i - 1].weight}).`, { trace: [i, w] });
      w -= items[i - 1].weight;
    } else {
      push(12, `V[${i}][${w}] = V[${i - 1}][${w}], so ${items[i - 1].name} was skipped. Go straight up.`, { trace: [i, w] });
    }
  }
  push(12, `Knapsack holds: ${chosen.map((c) => items[c].name).reverse().join(", ") || "nothing"}. Total value ${V[n][W]}.`);
  return frames;
}

/* ----------------------------- growth ----------------------------- */

export const GROWTH = [
  { label: "O(1)", name: "constant", f: () => 1 },
  { label: "O(log n)", name: "logarithmic", f: (n: number) => Math.max(1, Math.log2(n)) },
  { label: "O(n)", name: "linear", f: (n: number) => n },
  { label: "O(n log n)", name: "linearithmic", f: (n: number) => n * Math.max(1, Math.log2(n)) },
  { label: "O(n²)", name: "quadratic", f: (n: number) => n * n },
  { label: "O(2ⁿ)", name: "exponential", f: (n: number) => Math.pow(2, n) },
] as const;

/** Human-readable duration for `ops` simple operations at ~10^8 ops/second. */
export function humanTime(ops: number): string {
  const s = ops / 1e8;
  if (!isFinite(s) || s > 3.15e7 * 1e10) return "longer than the age of the universe";
  if (s < 1e-6) return "under a microsecond";
  if (s < 1e-3) return `${(s * 1e6).toFixed(0)} µs`;
  if (s < 1) return `${(s * 1e3).toFixed(0)} ms`;
  if (s < 60) return `${s.toFixed(1)} s`;
  if (s < 3600) return `${(s / 60).toFixed(0)} min`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} hours`;
  if (s < 3.15e7) return `${(s / 86400).toFixed(0)} days`;
  return `${(s / 3.15e7).toExponential(1).replace("e+", " × 10^")} years`;
}

export function formatOps(ops: number): string {
  if (!isFinite(ops) || ops > 1e300) return "∞ (effectively)";
  if (ops < 1e6) return Math.round(ops).toLocaleString("en-US");
  return ops.toExponential(1).replace("e+", " × 10^");
}
