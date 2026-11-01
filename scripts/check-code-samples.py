"""Run the code samples in lessons that use <CodeTabs>.

    python3 scripts/check-code-samples.py src/content/computational-mathematics/*.mdx

Python: each block runs on its own. A line `print(x)  # value` must print exactly
`value`, so keep those comments to the expected output alone. A block whose
comments name an error (e.g. `# ValueError: ...`) must raise one.
Needs numpy, pandas and scipy.

MATLAB: if Octave is installed, each lesson's blocks run in one session, in
order, like a reader's MATLAB session, with the displayed output (an `x =` or
`error:` line and the indented rows after it) cut off. Octave's output is
printed so you can compare it with what the lesson shows; only errors fail.
Octave lacks two MATLAB functions the lessons use, so this script supplies
stand-ins for `round(x, n)` and `powermod`.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

CHECK = '''
def __check(expected, *args, **kw):
    import io
    buf = io.StringIO(); print(*args, file=buf, **kw)
    got = buf.getvalue().rstrip("\\n")
    if got != expected:
        raise AssertionError(f"printed {got!r}, comment says {expected!r}")
'''
PRINT = re.compile(r"^(\s*)print\((.*)\)\s*#\s*(.+?)\s*$")

SHIMS = {
    "round.m": """function y = round(x, n)
  if nargin < 2, y = builtin('round', x); else, y = builtin('round', x .* 10.^n) ./ 10.^n; end
end
""",
    "powermod.m": """function r = powermod(a, m, n)
  r = 1; a = mod(a, n);
  while m > 0
    if mod(m, 2) == 1, r = mod(r * a, n); end
    a = mod(a * a, n); m = floor(m / 2);
  end
end
""",
}


def blocks(text):
    for tabs in re.findall(r"<CodeTabs>(.*?)</CodeTabs>", text, re.S):
        yield dict(re.findall(r"```(\w+)\n(.*?)```", tabs, re.S))


def run_python(code):
    lines = []
    for line in code.split("\n"):
        m = PRINT.match(line)
        lines.append(f"{m[1]}__check({m[3]!r}, {m[2]})" if m else line)
    r = subprocess.run([sys.executable, "-I", "-c", CHECK + "\n".join(lines)], capture_output=True, text=True, timeout=60)
    if re.search(r"#.*\w+Error", code):
        return None if r.returncode != 0 else "expected an error, but it ran cleanly"
    return None if r.returncode == 0 else r.stderr.strip().splitlines()[-1]


def matlab_code(code):
    """Keep the code, drop the displayed output."""
    out, in_output = [], False
    for line in code.split("\n"):
        if re.match(r"^\s*(\w+ =\s*($|\s{3,}\w+ =)|error:)", line) or re.match(r"^\s+[-\d.\s]+$", line):
            in_output = True
            continue
        if in_output and (not line.strip() or re.match(r"^\s", line)):
            continue
        in_output = False
        # side-by-side displays such as "A = pascal(3)          B = magic(3)"
        out.extend(re.split(r"(?<=\S)\s{4,}(?=\w+(?: = |\())", line))
    return "\n".join(out).strip()


def run_octave(name, mat, shim_dir):
    script = [f"warning('off', 'all'); addpath('{shim_dir}');"]
    for i, code, _ in mat:
        script.append(f"printf('@@{i}\\n'); try\n{code}\ncatch e\nprintf('error: %s\\n', e.message); end")
    r = subprocess.run(["octave", "--no-gui", "--quiet", "--eval", "\n".join(script)], capture_output=True, text=True, timeout=300)
    parts = re.split(r"^@@(\d+)$", r.stdout + r.stderr, flags=re.M)
    outs = {int(parts[k]): parts[k + 1].strip() for k in range(1, len(parts) - 1, 2)}
    failed = 0
    print(f"--- {name} (Octave)")
    for i, code, wants_error in mat:
        out = outs.get(i, "(no output: the session stopped early)")
        bad = ("error:" in out) != wants_error
        failed += bad
        print(f"[{i}] {'FAIL' if bad else 'ok'}\n    " + re.sub(r"\n\s*\n", "\n", out).replace("\n", "\n    "))
    return failed


def main(paths):
    octave = shutil.which("octave")
    if not octave:
        print("Octave not found: checking Python only.")
    failed = 0
    with tempfile.TemporaryDirectory() as shim_dir:
        for file, body in SHIMS.items():
            with open(os.path.join(shim_dir, file), "w") as f:
                f.write(body)
        for path in paths:
            name = os.path.basename(path)
            mat = []
            for i, b in enumerate(blocks(open(path).read()), 1):
                if "python" in b and (err := run_python(b["python"])):
                    failed += 1
                    print(f"PYTHON FAIL {name} block {i}: {err}")
                if "matlab" in b:
                    mat.append((i, matlab_code(b["matlab"]), "error:" in b["matlab"]))
            if octave and mat:
                failed += run_octave(name, mat, shim_dir)
    print(f"{failed} failure(s)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
