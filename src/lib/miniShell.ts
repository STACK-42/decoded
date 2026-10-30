/* ============================================================
   A tiny in-memory Linux shell for the Lab 1 terminal.
   Supports the lab's commands, > >> < redirection and | pipes.
   Pure: run() takes a shell state and returns a new one.
   ============================================================ */

export type FsNode = { type: "dir"; children: Record<string, FsNode> } | { type: "file"; content: string };

export type ShellState = { root: FsNode; cwd: string[] };

export type RunResult = { state: ShellState; output: string; error: boolean; clear?: boolean };

const HOME = ["home", "user"];

const dir = (children: Record<string, FsNode> = {}): FsNode => ({ type: "dir", children });
const file = (content = ""): FsNode => ({ type: "file", content });

/** The lab's starting home directory: dir1, dir2, file1 and file2.txt. */
export function initialShell(): ShellState {
  return {
    root: dir({
      home: dir({
        user: dir({
          dir1: dir(),
          dir2: dir(),
          file1: file("Hello, in file 1\n"),
          "file2.txt": file("Now, in file 2\n"),
          ".bashrc": file("# hidden file: ls only shows it with -a\n"),
        }),
      }),
    }),
    cwd: [...HOME],
  };
}

export function promptPath(cwd: string[]) {
  const isHome = cwd.length >= 2 && cwd[0] === "home" && cwd[1] === "user";
  if (isHome) return "~" + (cwd.length > 2 ? "/" + cwd.slice(2).join("/") : "");
  return "/" + cwd.join("/");
}

function resolve(cwd: string[], p: string): string[] {
  let parts: string[];
  if (p.startsWith("/")) parts = [];
  else if (p === "~" || p.startsWith("~/")) {
    parts = [...HOME];
    p = p.slice(1);
  } else parts = [...cwd];
  for (const seg of p.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts;
}

function getNode(root: FsNode, path: string[]): FsNode | null {
  let n: FsNode = root;
  for (const seg of path) {
    if (n.type !== "dir" || !(seg in n.children)) return null;
    n = n.children[seg];
  }
  return n;
}

function parentAndName(root: FsNode, path: string[]) {
  const parent = getNode(root, path.slice(0, -1));
  return { parent: parent && parent.type === "dir" ? parent : null, name: path[path.length - 1] };
}

const clone = (n: FsNode): FsNode => (n.type === "file" ? { ...n } : { type: "dir", children: Object.fromEntries(Object.entries(n.children).map(([k, v]) => [k, clone(v)])) });

/** Split a line into words, keeping "quoted strings" together. */
export function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

const MAN: Record<string, string> = {
  clear: "clear - clear the terminal screen",
  date: "date - print or set the system date and time",
  echo: "echo - display a line of text",
  uname: "uname - print system information (the OS name)",
  users: "users - print the user names of users currently logged in",
  who: "who - show who is logged on",
  pwd: "pwd - print name of current/working directory",
  cd: "cd - change the working directory",
  ls: "ls - list directory contents, sorted alphabetically\n  -a   do not ignore entries starting with .\n  -r   reverse order while sorting",
  man: "man - an interface to the system reference manuals (press q to exit)",
  mkdir: "mkdir - make directories",
  rmdir: "rmdir - remove empty directories",
  touch: "touch - create an empty file (or update its time)",
  cp: "cp - copy files: cp SOURCE DEST, or cp SOURCE... DIRECTORY",
  mv: "mv - move (rename) files: mv SOURCE DEST, or mv SOURCE... DIRECTORY",
  rm: "rm - remove files\n  -r   remove directories and their contents recursively",
  cat: "cat - concatenate files and print on the standard output",
  more: "more - page through text one screen at a time, forward only",
  less: "less - like more, but scrolls backward too",
  sort: "sort - sort lines of text",
  uniq: "uniq - drop repeated adjacent lines",
  grep: "grep - print lines that match a pattern",
};

type Cmd = (args: string[], stdin: string | null, st: ShellState, now: Date) => { out: string; err?: string; clear?: boolean };

const lines = (s: string) => s.split("\n").filter((l, i, a) => !(l === "" && i === a.length - 1));

const COMMANDS: Record<string, Cmd> = {
  clear: () => ({ out: "", clear: true }),
  date: (_a, _i, _s, now) => ({ out: now.toString().replace(/ GMT.*$/, "") + "\n" }),
  echo: (a) => ({ out: a.join(" ") + "\n" }),
  uname: () => ({ out: "Linux\n" }),
  users: () => ({ out: "user\n" }),
  who: () => ({ out: "user     pts/0\n" }),
  pwd: (_a, _i, s) => ({ out: "/" + s.cwd.join("/") + "\n" }),
  man: (a) => (a[0] ? (MAN[a[0]] ? { out: MAN[a[0]] + "\n" } : { out: "", err: `No manual entry for ${a[0]}` }) : { out: "", err: "What manual page do you want?" }),
  ls: (a, _i, s) => {
    const flags = a.filter((x) => x.startsWith("-")).join("");
    const targets = a.filter((x) => !x.startsWith("-"));
    const n = getNode(s.root, resolve(s.cwd, targets[0] ?? "."));
    if (!n) return { out: "", err: `ls: cannot access '${targets[0]}': No such file or directory` };
    if (n.type === "file") return { out: targets[0] + "\n" };
    let names = Object.keys(n.children).sort((x, y) => x.replace(/^\./, "").localeCompare(y.replace(/^\./, "")));
    if (flags.includes("a")) names = [".", "..", ...names];
    else names = names.filter((x) => !x.startsWith("."));
    if (flags.includes("r")) names.reverse();
    return { out: names.length ? names.join("  ") + "\n" : "" };
  },
  cat: (a, stdin, s) => {
    if (!a.length) return { out: stdin ?? "" };
    let out = "";
    for (const p of a) {
      const n = getNode(s.root, resolve(s.cwd, p));
      if (!n) return { out, err: `cat: ${p}: No such file or directory` };
      if (n.type === "dir") return { out, err: `cat: ${p}: Is a directory` };
      out += n.content;
    }
    return { out };
  },
  sort: (a, stdin, s) => {
    const src = a[0] ? getNode(s.root, resolve(s.cwd, a[0])) : null;
    if (a[0] && (!src || src.type !== "file")) return { out: "", err: `sort: cannot read: ${a[0]}: No such file or directory` };
    const text = src && src.type === "file" ? src.content : stdin ?? "";
    const ls = lines(text).sort();
    return { out: ls.length ? ls.join("\n") + "\n" : "" };
  },
  uniq: (_a, stdin) => {
    const ls = lines(stdin ?? "").filter((l, i, arr) => i === 0 || l !== arr[i - 1]);
    return { out: ls.length ? ls.join("\n") + "\n" : "" };
  },
  grep: (a, stdin, s) => {
    if (!a[0]) return { out: "", err: "Usage: grep PATTERN [FILE]" };
    const src = a[1] ? getNode(s.root, resolve(s.cwd, a[1])) : null;
    if (a[1] && (!src || src.type !== "file")) return { out: "", err: `grep: ${a[1]}: No such file or directory` };
    const text = src && src.type === "file" ? src.content : stdin ?? "";
    const ls = lines(text).filter((l) => l.includes(a[0]));
    return { out: ls.length ? ls.join("\n") + "\n" : "" };
  },
};
COMMANDS.more = COMMANDS.cat;
COMMANDS.less = COMMANDS.cat;

/** Commands that change the file system work on a cloned root and return it. */
function mutate(name: string, a: string[], st: ShellState): { st: ShellState; err?: string } {
  const root = clone(st.root);
  const at = (p: string) => resolve(st.cwd, p);
  const errs: string[] = [];
  switch (name) {
    case "cd": {
      const target = at(a[0] ?? "~");
      const n = getNode(root, target);
      if (!n) return { st, err: `cd: ${a[0]}: No such file or directory` };
      if (n.type !== "dir") return { st, err: `cd: ${a[0]}: Not a directory` };
      return { st: { root: st.root, cwd: target } };
    }
    case "mkdir":
      if (!a.length) return { st, err: "mkdir: missing operand" };
      for (const p of a) {
        const { parent, name: nm } = parentAndName(root, at(p));
        if (!parent) errs.push(`mkdir: cannot create directory '${p}': No such file or directory`);
        else if (nm in parent.children) errs.push(`mkdir: cannot create directory '${p}': File exists`);
        else parent.children[nm] = dir();
      }
      break;
    case "rmdir":
      if (!a.length) return { st, err: "rmdir: missing operand" };
      for (const p of a) {
        const { parent, name: nm } = parentAndName(root, at(p));
        const n = parent?.children[nm];
        if (!parent || !n) errs.push(`rmdir: failed to remove '${p}': No such file or directory`);
        else if (n.type !== "dir") errs.push(`rmdir: failed to remove '${p}': Not a directory`);
        else if (Object.keys(n.children).length) errs.push(`rmdir: failed to remove '${p}': Directory not empty`);
        else delete parent.children[nm];
      }
      break;
    case "touch":
      if (!a.length) return { st, err: "touch: missing file operand" };
      for (const p of a) {
        const { parent, name: nm } = parentAndName(root, at(p));
        if (!parent) errs.push(`touch: cannot touch '${p}': No such file or directory`);
        else if (!(nm in parent.children)) parent.children[nm] = file();
      }
      break;
    case "rm": {
      const recursive = a.some((x) => /^-\w*r/.test(x));
      const targets = a.filter((x) => !x.startsWith("-"));
      if (!targets.length) return { st, err: "rm: missing operand" };
      for (const p of targets) {
        const { parent, name: nm } = parentAndName(root, at(p));
        const n = parent?.children[nm];
        if (!parent || !n) errs.push(`rm: cannot remove '${p}': No such file or directory`);
        else if (n.type === "dir" && !recursive) errs.push(`rm: cannot remove '${p}': Is a directory`);
        else delete parent.children[nm];
      }
      break;
    }
    case "cp":
    case "mv": {
      if (a.length < 2) return { st, err: `${name}: missing destination file operand after '${a[0] ?? ""}'` };
      const srcs = a.slice(0, -1);
      const dest = a[a.length - 1];
      const destNode = getNode(root, at(dest));
      const destIsDir = destNode?.type === "dir";
      if (srcs.length > 1 && !destIsDir) return { st, err: `${name}: target '${dest}' is not a directory` };
      for (const p of srcs) {
        const { parent, name: nm } = parentAndName(root, at(p));
        const n = parent?.children[nm];
        if (!parent || !n) {
          errs.push(`${name}: cannot stat '${p}': No such file or directory`);
          continue;
        }
        if (name === "cp" && n.type === "dir") {
          errs.push(`cp: -r not specified; omitting directory '${p}'`);
          continue;
        }
        let target: { parent: Extract<FsNode, { type: "dir" }> | null; name: string };
        if (destIsDir) target = { parent: destNode as Extract<FsNode, { type: "dir" }>, name: nm };
        else target = parentAndName(root, at(dest));
        if (!target.parent) {
          errs.push(`${name}: cannot create '${dest}': No such file or directory`);
          continue;
        }
        target.parent.children[target.name] = clone(n);
        if (name === "mv") delete parent.children[nm];
      }
      break;
    }
  }
  return { st: { root, cwd: st.cwd }, err: errs.length ? errs.join("\n") : undefined };
}

const MUTATING = new Set(["cd", "mkdir", "rmdir", "touch", "rm", "cp", "mv"]);

/** Run one command line: commands joined by |, with optional < input and > or >> output. */
export function run(st: ShellState, line: string, now = new Date()): RunResult {
  const trimmed = line.trim();
  if (!trimmed) return { state: st, output: "", error: false };
  const stages = trimmed.split("|").map((s) => s.trim());
  let state = st;
  let pipe: string | null = null;
  const errors: string[] = [];
  let clear = false;
  for (let i = 0; i < stages.length; i++) {
    let words = tokenize(stages[i]);
    let outFile: string | null = null;
    let append = false;
    let inFile: string | null = null;
    const redir = words.findIndex((w) => w === ">" || w === ">>");
    if (redir >= 0) {
      append = words[redir] === ">>";
      outFile = words[redir + 1] ?? null;
      words = [...words.slice(0, redir), ...words.slice(redir + 2)];
      if (!outFile) return { state, output: "", error: true };
    }
    const inIdx = words.indexOf("<");
    if (inIdx >= 0) {
      inFile = words[inIdx + 1] ?? null;
      words = [...words.slice(0, inIdx), ...words.slice(inIdx + 2)];
    }
    const [cmd, ...args] = words;
    if (!cmd) {
      errors.push("syntax error near unexpected token '|'");
      break;
    }
    let stdin = pipe;
    if (inFile) {
      const n = getNode(state.root, resolve(state.cwd, inFile));
      if (!n || n.type !== "file") {
        errors.push(`${inFile}: No such file or directory`);
        break;
      }
      stdin = n.content;
    }
    let out = "";
    if (MUTATING.has(cmd)) {
      const r = mutate(cmd, args, state);
      state = r.st;
      if (r.err) errors.push(r.err);
    } else if (COMMANDS[cmd]) {
      const r = COMMANDS[cmd](args, stdin, state, now);
      out = r.out;
      // like real ls: one name per line when the output goes to a file or another command
      if (cmd === "ls" && (outFile || i < stages.length - 1)) out = out.split("  ").join("\n");
      if (r.err) errors.push(r.err);
      if (r.clear) clear = true;
    } else {
      errors.push(`${cmd}: command not found`);
      break;
    }
    if (outFile) {
      const root = clone(state.root);
      const { parent, name } = parentAndName(root, resolve(state.cwd, outFile));
      const existing = parent?.children[name];
      if (!parent || existing?.type === "dir") {
        errors.push(`${outFile}: ${existing ? "Is a directory" : "No such file or directory"}`);
      } else {
        parent.children[name] = file((append && existing?.type === "file" ? existing.content : "") + out);
        state = { root, cwd: state.cwd };
      }
      out = "";
    }
    pipe = out;
  }
  const output = (pipe ?? "") + errors.join("\n");
  return { state, output: output.replace(/\n$/, ""), error: errors.length > 0, clear };
}

/** True when the path exists in the given shell state (used by the lab missions). */
export function exists(st: ShellState, path: string, type?: "dir" | "file") {
  const n = getNode(st.root, resolve(st.cwd, path));
  return !!n && (!type || n.type === type);
}

export function readFile(st: ShellState, path: string) {
  const n = getNode(st.root, resolve(st.cwd, path));
  return n && n.type === "file" ? n.content : null;
}
