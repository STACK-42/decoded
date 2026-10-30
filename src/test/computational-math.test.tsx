import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { render } from "@testing-library/react";
import { getCourse, flattenLessons } from "@/content/registry";
import { affineDecrypt, affineEncrypt, affineTable, bitsToText, flowFrames, keystream, shiftDecrypt, shiftEncrypt, textToBits, VALID_K1, xorBits, xorFrames } from "@/lib/ciphers";
import { discreteLog, dlogFrames, fastPowFrames, logTable, modPow, cycleFrames, extendedFrames, extendedRows, isPrimitiveRoot, order, powers, primitiveRoots, factorize, inverseMod, isPrime, phi, sieveFrames, wilsonFrames, euclidSteps, euclidTiles, gcd, mod, tileFrames } from "@/lib/numberTheory";
import { conv, convFrames, coverUpFrames, deconv, fitQuality, polyder, polyfit, polyFromRoots, polyText, polyval, polyvalm, realRoots, residue, roots, sumSquaredError } from "@/lib/polynomial";
import { adjoint, cofactors, det, fraction, inverseFrames, inverseText, minorMatrix, minors, diagOf, kron, kronFrames, MAGIC4, norm1, normFrames, normFro, normInf, trace, tril, triu, add, apply2, det2, dot, identity, matMulFrames, mul, elementwiseFrames, MAGIC3, pascal, sub, transpose, vectorProductFrames } from "@/lib/matrix";

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe("Computational Mathematics course", () => {
  const course = getCourse("computational-mathematics")!;

  for (const lesson of flattenLessons(course)) {
    it(`renders lesson "${lesson.slug}" with its title`, () => {
      const Lesson = lesson.Component;
      const { container, unmount } = render(<Lesson />);
      expect(container.querySelector("h1")?.textContent).toBe(lesson.title);
      unmount();
    });
  }

  it("registers every lesson file and names no source institution or teacher", () => {
    const dir = path.resolve(__dirname, "../content/computational-mathematics");
    const files = readdirSync(dir).filter((f) => f.endsWith(".mdx"));
    expect(files.length).toBe(flattenLessons(course).length);
    const all = files.map((f) => readFileSync(path.join(dir, f), "utf8")).join("\n").toLowerCase();
    for (const banned of ["lecturer", "lecture ", "instructor", "professor", "faculty of", "university of", "department of", "homework"]) {
      expect(all).not.toContain(banned);
    }
  });
});

describe("Python and machine learning sections", () => {
  const dir = path.resolve(__dirname, "../content/computational-mathematics");
  const lessons = readdirSync(dir).filter((f) => f.endsWith(".mdx") && !f.includes("quiz"));

  it.each(lessons)("%s keeps MATLAB as the main language", (file) => {
    const text = readFileSync(path.join(dir, file), "utf8");
    expect(text).toContain("## In Python");
    expect(text).toContain("```python");
    expect(text).toContain("## In machine learning");
    expect(text.indexOf("## In Python")).toBeGreaterThan(0);
  });
});

describe("matrix arithmetic", () => {
  const A = pascal(3);
  it("builds pascal(3) and recovers B after adding and subtracting A", () => {
    expect(A).toEqual([[1, 1, 1], [1, 2, 3], [1, 3, 6]]);
    expect(add(A, MAGIC3)).toEqual([[9, 2, 7], [4, 7, 10], [5, 12, 8]]);
    expect(sub(add(A, MAGIC3), A)).toEqual(MAGIC3);
  });

  it("transposes, and pascal is symmetric while magic is not", () => {
    expect(transpose(A)).toEqual(A);
    expect(transpose(MAGIC3)).toEqual([[8, 3, 4], [1, 5, 9], [6, 7, 2]]);
    expect(transpose([[1, 2, 3], [4, 5, 6]])).toEqual([[1, 4], [2, 5], [3, 6]]);
  });

  it("gets the dot product example right", () => {
    expect(dot([1, -2, 3, 4], [2, 3, -2, 1])).toBe(-6);
  });

  it("finishes each elementwise animation on the true result", () => {
    const last = elementwiseFrames("add", A, MAGIC3, -2).at(-1)!.state.c;
    expect(last).toEqual(add(A, MAGIC3));
    expect(elementwiseFrames("scalar", A, MAGIC3, -2).at(-1)!.state.c[2][2]).toBe(-12);
  });

  it("builds inner and outer vector products", () => {
    expect(vectorProductFrames("inner", [3, 1, 4], [2, 0, -1]).at(-1)!.state.terms.reduce((a, b) => a + b, 0)).toBe(2);
    expect(vectorProductFrames("outer", [3, 1, 4], [2, 0, -1]).at(-1)!.state.outer).toEqual([[6, 0, -3], [2, 0, -1], [8, 0, -4]]);
  });
});

describe("matrix multiplication and linear maps", () => {
  const A = pascal(3);
  it("matches the worked products and is not commutative", () => {
    expect(mul(A, MAGIC3)).toEqual([[15, 15, 15], [26, 38, 26], [41, 70, 39]]);
    expect(mul(MAGIC3, A)).toEqual([[15, 28, 47], [15, 34, 60], [15, 28, 43]]);
    expect(mul(A, identity(3))).toEqual(A);
    expect(() => mul(A, [[1, 2]])).toThrow();
  });

  it("ends the animation on the product, counting n^3 multiplications", () => {
    const last = matMulFrames(A, MAGIC3).at(-1)!;
    expect(last.state.c).toEqual(mul(A, MAGIC3));
    expect(last.stats.multiplications).toBe(27);
  });

  it("applies 2-by-2 maps and reads their determinant", () => {
    expect(apply2([0, -1, 1, 0], 1, 0)).toEqual([0, 1]);
    expect(det2([1, 1, 0, 1])).toBe(1);
    expect(det2([-1, 0, 0, 1])).toBe(-1);
    expect(det2([1, 2, 0.5, 1])).toBe(0);
  });
});

describe("Kronecker products, norms and special matrices", () => {
  const B = [[5, -4, 2], [-1, 2, 3], [-2, 1, 0]];
  it("builds the block matrix", () => {
    expect(kron([[1, -2], [-1, 0]], [[4, -3], [2, 3]])).toEqual([[4, -3, -8, 6], [2, 3, -4, -6], [-4, 3, 0, 0], [-2, -3, 0, 0]]);
    expect(kron([[1, 2], [3, 4]], [[1, 0], [0, 1]])).toEqual([[1, 0, 2, 0], [0, 1, 0, 2], [3, 0, 4, 0], [0, 3, 0, 4]]);
    expect(kronFrames([[1, 2]], [[1]]).at(-1)!.state.done).toBe(2);
  });

  it("computes each norm and trace", () => {
    expect(norm1(B)).toBe(8);
    expect(normInf(B)).toBe(11);
    expect(normFro(B)).toBe(8);
    expect(norm1([[1, -7], [-2, -3]])).toBe(10);
    expect(normInf([[1, -7], [-2, -3]])).toBe(8);
    expect(normFro([[1, -7], [-2, -3]])).toBeCloseTo(7.937, 3);
    expect(trace(MAGIC4)).toBe(34);
    expect(normFrames("one", B).at(-1)!.state.best).toBe(0);
    expect(normFrames("inf", B).at(-1)!.state.best).toBe(0);
  });

  it("keeps the right triangle and diagonals", () => {
    expect(diagOf(MAGIC4)).toEqual([16, 11, 6, 1]);
    expect(triu([[1, 1], [1, 1]])).toEqual([[1, 1], [0, 1]]);
    expect(tril([[1, 1, 1], [1, 1, 1], [1, 1, 1]], -1)).toEqual([[0, 0, 0], [1, 0, 0], [1, 1, 0]]);
  });
});

describe("determinants and inverses", () => {
  const A = [[1, 2, 3], [0, 1, 4], [5, 6, 0]];
  it("computes determinants, including the 3-by-3 examples", () => {
    expect(det([[3, 4], [1, 2]])).toBe(2);
    expect(det(A)).toBe(1);
    expect(det(pascal(3))).toBe(1);
    expect(det(MAGIC3)).toBe(-360);
    expect(det(MAGIC4)).toBe(0);
    expect(det([[1, 2, 3], [4, 5, 6], [7, 8, 9]])).toBe(0);
  });

  it("finds the minor and cofactor from the lesson", () => {
    const B = [[-2, 4, 1], [4, 5, 7], [-6, 1, 0]];
    expect(minorMatrix(B, 1, 2)).toEqual([[-2, 4], [-6, 1]]);
    expect(minors(B)[1][2]).toBe(22);
    expect(cofactors(B)[1][2]).toBe(-22);
  });

  it("gets a true inverse from the adjoint", () => {
    expect(adjoint(A)).toEqual([[-24, 18, 5], [20, -15, -4], [-5, 4, 1]]);
    expect(mul(A, adjoint(A))).toEqual(identity(3));
    expect(fraction(6, -4)).toBe("-3/2");
    const F = [[2, 0, 1], [1, 3, 0], [0, 1, 2]];
    expect(det(F)).toBe(13);
    expect(inverseText(F)[0][0]).toBe("6/13");
  });

  it("stops early on a singular matrix", () => {
    const f = inverseFrames([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
    expect(f.at(-1)!.state.stage).toBe("singular");
    expect(inverseFrames(A).at(-1)!.state.stage).toBe("inverse");
  });
});

describe("polynomials", () => {
  const p = [1, -2, -1, 2];
  it("finds roots and rebuilds the polynomial", () => {
    expect(realRoots(p).map((x) => Number(x.toFixed(6)))).toEqual([-1, 1, 2]);
    expect(polyFromRoots([-1, 2, 1])).toEqual(p);
    const c = roots([1, 0, 1]);
    expect(c.every(([a]) => a === 0)).toBe(true);
    expect(c.map(([, b]) => Math.abs(Number(b.toFixed(6))))).toEqual([1, 1]);
  });

  it("evaluates at a number and at a matrix", () => {
    expect(polyval(p, 3)).toBe(8);
    expect(polyvalm([1, 0, -2, -5], [[2, 4, 5], [-1, 0, 3], [7, 1, 5]])).toEqual([[377, 179, 439], [111, 81, 136], [490, 253, 639]]);
  });

  it("multiplies and divides", () => {
    const c = conv([1, 2, 3], [4, 5, 6]);
    expect(c).toEqual([4, 13, 28, 27, 18]);
    expect(deconv(c, [1, 2, 3])).toEqual({ q: [4, 5, 6], r: [0, 0, 0, 0, 0] });
    expect(convFrames([1, 2, 3], [4, 5, 6]).at(-1)!.state.c).toEqual(c);
  });

  it("differentiates, including the worked product", () => {
    expect(polyder([1, 0, -2, -5])).toEqual([3, 0, -2]);
    expect(polyder(conv([1, 3, 5], [2, 4, 6]))).toEqual([8, 30, 56, 38]);
  });

  it("matches the worked least-squares fit, and degree 4 hits all five points", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5.5, 43.1, 128, 290.7, 498.4];
    const f = polyfit(x, y, 3);
    [-0.1917, 31.5821, -60.3262, 35.34].forEach((c, i) => expect(f[i]).toBeCloseTo(c, 3));
    expect(sumSquaredError(polyfit(x, y, 4), x, y)).toBeLessThan(1e-6);
  });

  it("describes each fit by how well it matches the data", () => {
    const x = [1, 2, 3, 4, 5];
    const y = [5.5, 43.1, 128, 290.7, 498.4];
    expect([1, 2, 3, 4].map((d) => fitQuality(polyfit(x, y, d), x, y))).toEqual(["poor", "close", "close", "exact"]);
  });

  it("splits the worked partial fraction", () => {
    expect(residue([-4, 8], [1, 6, 8])).toEqual([{ p: -4, r: -12 }, { p: -2, r: 8 }]);
    expect(coverUpFrames([-4, 8], [1, 6, 8]).at(-1)!.state.done).toHaveLength(2);
  });

  it("writes polynomials readably", () => {
    expect(polyText(p)).toBe("x³ - 2x² - x + 2");
    expect(polyText([4, 13, 28, 27, 18], "s")).toBe("4s⁴ + 13s³ + 28s² + 27s + 18");
    expect(polyText([0, 1, 0, 1])).toBe("x² + 1");
  });
});

describe("Euclid and modular arithmetic", () => {
  it("follows the worked gcds", () => {
    expect(gcd(60, 24)).toBe(12);
    expect(gcd(60, -24)).toBe(12);
    expect(gcd(8, 15)).toBe(1);
    expect(gcd(65, 70)).toBe(5);
    expect(gcd(247, 143)).toBe(13);
    expect(euclidSteps(1281, 243).map((s) => [s.q, s.r])).toEqual([[5, 66], [3, 45], [1, 21], [2, 3], [7, 0]]);
    expect(tileFrames(1281, 243).at(-1)!.stats.gcd).toBe(3);
  });

  it.each([[60, 24], [247, 143], [1281, 243]])("tiles %i by %i exactly with squares", (a, b) => {
    const tiles = euclidTiles(a, b);
    expect(tiles.reduce((s, t) => s + t.size ** 2, 0)).toBe(a * b);
    expect(tiles.every((t) => t.x + t.size <= a && t.y + t.size <= b)).toBe(true);
    expect(tiles.at(-1)!.size).toBe(gcd(a, b));
  });

  it("keeps mod non-negative and matches the worked values", () => {
    expect(mod(-11, 7)).toBe(3);
    expect(mod(-28, 81)).toBe(53);
    expect(mod(7653, 915)).toBe(333);
    expect([-4, -1, 7, 9].map((x) => mod(x, 3))).toEqual([2, 2, 1, 0]);
    expect(mod(73 - 4, 23)).toBe(0);
    expect(mod(21 + 9, 10)).toBe(0);
    expect(mod(10 * 15 * 4, 17)).toBe(5);
    expect(mod(10 ** 7, 17)).toBe(5);
  });
});

describe("primes and primality", () => {
  it("factorizes the worked examples", () => {
    expect(factorize(91)).toEqual([[7, 1], [13, 1]]);
    expect(factorize(3600)).toEqual([[2, 4], [3, 2], [5, 2]]);
    expect(factorize(11011)).toEqual([[7, 1], [11, 2], [13, 1]]);
    expect(isPrime(3457)).toBe(true);
    expect(isPrime(3453)).toBe(false);
  });

  it("finds the 25 primes up to 100", () => {
    const last = sieveFrames(100).at(-1)!;
    const left = Array.from({ length: 99 }, (_, i) => i + 2).filter((v) => !last.state.crossed[v]);
    expect(left).toHaveLength(25);
    expect(left.every(isPrime)).toBe(true);
    expect(last.stats.primes).toBe(25);
  });

  it("computes the totients in the lesson", () => {
    expect([37, 35, 23, 81, 100, 1000, 10, 11].map(phi)).toEqual([36, 24, 22, 54, 40, 400, 4, 10]);
  });

  it("checks the divisibility tests and Fermat examples", () => {
    expect(17865843 % 3).toBe(0);
    expect(8132619 % 11).toBe(0);
    expect(7 ** 18 % 19).toBe(1);
    expect((5 ** 8) % 11).toBe(4);
    expect(2 ** 10 % 11).toBe(1);
    expect(3 ** 4 % 10).toBe(1);
  });

  it("pairs inverses for Wilson's theorem", () => {
    const f = wilsonFrames(13);
    expect(f.at(-1)!.state.pairs).toEqual([[2, 7], [3, 9], [4, 10], [5, 8], [6, 11]]);
    expect(f.at(-1)!.state.pairs.every(([a, b]) => (a * b) % 13 === 1)).toBe(true);
    expect(inverseMod(2, 4)).toBeNull();
  });
});

describe("order, primitive roots and inverses", () => {
  it("finds orders and primitive roots from the lessons", () => {
    expect(order(3, 16)).toBe(4);
    expect(order(7, 19)).toBe(3);
    expect(order(2, 7)).toBe(3);
    expect(isPrimitiveRoot(3, 7)).toBe(true);
    expect(primitiveRoots(7)).toEqual([3, 5]);
    expect(primitiveRoots(19)).toEqual([2, 3, 10, 13, 14, 15]);
    expect(isPrimitiveRoot(7, 45)).toBe(false);
    expect(powers(3, 7, 6)).toEqual([3, 2, 6, 4, 5, 1]);
    expect(powers(2, 9, 6)).toEqual([2, 4, 8, 7, 5, 1]);
    expect(cycleFrames(3, 7).at(-1)!.stats.k).toBe(6);
  });

  it.each([[130, 61, 23, -49], [61, 17, -5, 18]])("solves %i x + %i y = 1", (a, b, x, y) => {
    const top = extendedRows(a, b)[0];
    expect([top.x, top.y]).toEqual([x, y]);
    expect(a * x + b * y).toBe(1);
  });

  it("keeps ax + by = g on every row, and names the inverse", () => {
    for (const r of extendedRows(240, 46)) expect(r.x! * r.a + r.y! * r.b).toBe(2);
    expect(extendedFrames(61, 17).at(-1)!.message).toContain("inverse of 17 is 18");
    expect((17 * 18) % 61).toBe(1);
  });
});

describe("fast powers and discrete logs", () => {
  it("reproduces the worked square-and-multiply run", () => {
    const f = fastPowFrames(25, 193, 469);
    const last = f.at(-1)!.state;
    expect(last.value).toBe(263);
    expect(modPow(25, 193, 469)).toBe(263);
    expect(last.history.map((h) => h.value)).toEqual([25, 148, 330, 92, 22, 15, 225, 263]);
    expect(last.mults).toBe(9);
    expect((193).toString(2)).toBe("11000001");
    expect((100).toString(2)).toBe("1100100");
  });

  it("agrees with modPow on many inputs", () => {
    for (const [a, m, n] of [[3, 100, 7], [7, 18, 19], [2, 16, 17], [10, 7, 17], [5, 38, 11], [2, 90, 11]]) {
      expect(fastPowFrames(a, m, n).at(-1)!.state.value).toBe(modPow(a, m, n));
    }
    expect(modPow(5, 38, 11)).toBe(4);
    expect(modPow(10, 7, 17)).toBe(5);
    expect(modPow(2, 16, 17)).toBe(1);
  });

  it("finds discrete logs, including the modulo 9 table", () => {
    expect(logTable(2, 9)).toEqual({ 1: 0, 2: 1, 4: 2, 8: 3, 7: 4, 5: 5 });
    expect(discreteLog(11, 2, 19)).toBe(12);
    expect(modPow(2, 12, 19)).toBe(11);
    expect(discreteLog(37, 3, 101)).not.toBeNull();
    expect(dlogFrames(2, 11, 19).at(-1)!.state.found).toBe(true);
    expect(discreteLog(3, 2, 7)).toBeNull();
  });

  it("satisfies the log rules with a primitive root", () => {
    const t = logTable(2, 19);
    expect(t[(4 * 6) % 19]).toBe((t[4] + t[6]) % 18);
  });
});

describe("ciphers", () => {
  it("runs the worked shift ciphers", () => {
    expect(shiftEncrypt("IBM", 3)).toBe("LEP");
    expect(shiftEncrypt("NIST", 4)).toBe("RMWX");
    expect(shiftEncrypt("ENCRYPTION", 7)).toBe("LUJYFWAPVU");
    expect(shiftEncrypt("XYZ", 3)).toBe("ABC");
    expect(shiftDecrypt(shiftEncrypt("ATTACK AT DAWN", 11), 11)).toBe("ATTACK AT DAWN");
  });

  it("runs the worked affine cipher both ways", () => {
    expect(affineEncrypt("SECURITY", 7, 21)).toBe("RXJFKZYH");
    expect(affineDecrypt("VLXIJH", 7, 21)).toBe("AGENCY");
    expect(affineDecrypt(affineEncrypt("THE NATIONAL SECURITY AGENCY", 11, 23), 11, 23)).toBe("THE NATIONAL SECURITY AGENCY");
    expect((11 * 19) % 26).toBe(1);
    expect((7 * 15) % 26).toBe(1);
  });

  it("rejects bad multipliers and counts the keys", () => {
    expect(affineDecrypt("ABC", 13, 5)).toBeNull();
    expect(new Set(affineTable(13, 5)).size).toBe(2);
    expect(new Set(affineTable(2, 0)).size).toBe(13);
    expect(new Set(affineTable(7, 21)).size).toBe(26);
    expect(VALID_K1).toHaveLength(12);
  });

  it("encrypts and decrypts a bit stream with the same operation", () => {
    const m = textToBits("HI");
    const k = keystream(44257, m.length);
    const c = xorBits(m, k);
    expect(c).not.toEqual(m);
    expect(bitsToText(xorBits(c, k))).toBe("HI");
    expect(xorFrames(c, k, true).at(-1)!.state.output).toEqual(m);
    expect(new Set(k).size).toBe(2);
  });

  it("carries the message through the secret-key flow", () => {
    const f = flowFrames("HELLO", 3);
    expect(f).toHaveLength(5);
    expect(f[2].state.cipher).toBe("KHOOR");
  });
});
