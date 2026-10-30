import { describe, it, expect } from "vitest";
import { exists, initialShell, promptPath, readFile, run, tokenize, type ShellState } from "@/lib/miniShell";

/** Run several lines in order and return the final state and every output. */
function session(lines: string[], st: ShellState = initialShell()) {
  const outputs: string[] = [];
  for (const l of lines) {
    const r = run(st, l);
    st = r.state;
    outputs.push(r.output);
  }
  return { st, outputs };
}

describe("mini shell", () => {
  it("lists the lab's home directory, hidden files only with -a", () => {
    const { outputs } = session(["ls", "ls -r", "ls -a"]);
    expect(outputs[0]).toBe("dir1  dir2  file1  file2.txt");
    expect(outputs[1]).toBe("file2.txt  file1  dir2  dir1");
    expect(outputs[2]).toContain(".bashrc");
  });

  it("moves around with cd and pwd", () => {
    const { st, outputs } = session(["pwd", "cd ..", "pwd", "cd user", "cd dir1"]);
    expect(outputs[0]).toBe("/home/user");
    expect(outputs[2]).toBe("/home");
    expect(promptPath(st.cwd)).toBe("~/dir1");
  });

  it("follows the lab's mkdir, rmdir, touch, cp, mv and rm examples", () => {
    const s = session(["mkdir new1", "mkdir dir1/x new1/z", "rmdir dir2", "rmdir new1", "touch new1/x.txt", "cp file1 file2.txt new1", "cp file1 file2.txt new1/x.txt"]);
    expect(exists(s.st, "dir1/x", "dir")).toBe(true);
    expect(exists(s.st, "dir2")).toBe(false);
    expect(s.outputs[3]).toBe("rmdir: failed to remove 'new1': Directory not empty");
    expect(exists(s.st, "new1/file1", "file")).toBe(true);
    expect(s.outputs[6]).toBe("cp: target 'new1/x.txt' is not a directory");

    const m = session(["mv file1 file2.txt dir1", "mv dir1 new1", "rm new1/z", "rm -r new1/z"], s.st);
    expect(exists(m.st, "file1")).toBe(false);
    expect(exists(m.st, "new1/dir1/file1", "file")).toBe(true);
    expect(m.outputs[2]).toBe("rm: cannot remove 'new1/z': Is a directory");
    expect(exists(m.st, "new1/z")).toBe(false);
  });

  it("concatenates files with cat", () => {
    expect(session(["cat file1 file2.txt"]).outputs[0]).toBe("Hello, in file 1\nNow, in file 2");
  });

  it("redirects with > and >> and pipes through sort, uniq and grep", () => {
    const { st, outputs } = session(["echo texttexttext > file3", "cat file3", "ls > file3", "ls >> file3", "sort file3 | uniq", "sort file3 | uniq | grep 3"]);
    expect(outputs[1]).toBe("texttexttext");
    expect(readFile(st, "file3")).toBe("dir1\ndir2\nfile1\nfile2.txt\nfile3\n".repeat(2));
    expect(outputs[4]).toBe("dir1\ndir2\nfile1\nfile2.txt\nfile3");
    expect(outputs[5]).toBe("file3");
  });

  it("reads input with < and reports unknown commands", () => {
    expect(session(["sort < file1"]).outputs[0]).toBe("Hello, in file 1");
    const r = run(initialShell(), "foo");
    expect(r.error).toBe(true);
    expect(r.output).toBe("foo: command not found");
  });

  it("keeps quoted words together", () => {
    expect(tokenize(`echo "hello world" > 'my file'`)).toEqual(["echo", "hello world", ">", "my file"]);
  });
});
