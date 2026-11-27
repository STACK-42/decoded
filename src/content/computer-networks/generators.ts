/* Generated questions for Computer Networks: fresh numbers every time, answers computed by
   the same functions the lessons' visualizers use. Format: docs/exams.md. */

import { buildOptions, randomInt, type QuestionGenerator } from "@/lib/questions";
import { intToIp, ipToInt, parseCidr } from "@/lib/networks";

const LESSON = "ip-addresses-and-subnets";

/** 2 to a power, written the way the lessons write it: 2⁵. */
const pow2 = (n: number) => "2" + [...String(n)].map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]).join("");
const SECTION = "network-part-and-host-part";

/** A private-range address whose host part is neither all zeros nor all ones for the given prefix. */
function randomAddress(random: () => number, prefix: number): string {
  const first = [10, 172, 192][randomInt(random, 0, 2)];
  const second = first === 10 ? randomInt(random, 0, 255) : first === 172 ? randomInt(random, 16, 31) : 168;
  const base = ipToInt(`${first}.${second}.${randomInt(random, 0, 255)}.0`);
  const size = 2 ** (32 - prefix);
  const network = Math.floor((base + randomInt(random, 0, 255)) / size) * size;
  const host = randomInt(random, 2, Math.min(size - 3, 2 ** 24));
  return intToIp(network + host);
}

/** A prefix that doesn't fall on an octet boundary, so the work happens inside one octet. */
const randomPrefix = (random: () => number) => [18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29][randomInt(random, 0, 10)];

/** The octet where the network/host boundary falls, and how many addresses one block spans in it. */
function boundary(prefix: number) {
  const octet = Math.floor(prefix / 8); // 0-based
  const block = 2 ** (8 - (prefix % 8));
  return { octet, block, name: ["first", "second", "third", "fourth"][octet] };
}

export const generators: QuestionGenerator[] = [
  {
    id: "computer-networks/ip-addresses-and-subnets/gen-usable-hosts",
    lesson: LESSON,
    section: SECTION,
    generate(random) {
      const prefix = randomInt(random, 20, 30);
      const h = 32 - prefix;
      const right = 2 ** h - 2;
      return {
        prompt: `How many usable host addresses does a /${prefix} subnet have?`,
        ...buildOptions(String(right), [String(2 ** h), String(2 ** h - 1), String(2 ** (h + 1) - 2)], random),
        explanation: `A /${prefix} leaves 32 − ${prefix} = ${h} host bits, so the block has ${pow2(h)} = ${2 ** h} addresses. Two are set aside: all host bits 0 is the network address and all host bits 1 is the broadcast address. That leaves ${2 ** h} − 2 = ${right}. ${2 ** h} forgets those two; ${2 ** (h + 1) - 2} is the answer for a /${prefix - 1}.`,
        difficulty: 1,
      };
    },
  },
  {
    id: "computer-networks/ip-addresses-and-subnets/gen-network-address",
    lesson: LESSON,
    section: SECTION,
    generate(random) {
      const prefix = randomPrefix(random);
      const ip = randomAddress(random, prefix);
      const s = parseCidr(`${ip}/${prefix}`);
      const { octet, block, name } = boundary(prefix);
      const value = Number(ip.split(".")[octet]);
      const right = intToIp(s.network);
      const lastOctetZeroed = intToIp(Math.floor(ipToInt(ip) / 256) * 256);
      return {
        prompt: `What is the network address of ${ip}/${prefix}?`,
        ...buildOptions(right, [intToIp(s.network + 1), intToIp(s.broadcast), lastOctetZeroed, ip], random),
        explanation: `A /${prefix} splits inside the ${name} octet, where blocks are ${block} wide (${pow2(8 - (prefix % 8))}). ${value} falls in the block starting at ${Math.floor(value / block) * block} (${value} ÷ ${block}, rounded down, × ${block}), and every octet after it becomes 0: ${right}. ${intToIp(s.network + 1)} is the first usable host, one past the network address, and ${intToIp(s.broadcast)} is the broadcast address at the other end of the block.`,
        difficulty: 2,
      };
    },
  },
  {
    id: "computer-networks/ip-addresses-and-subnets/gen-broadcast-address",
    lesson: LESSON,
    section: SECTION,
    generate(random) {
      const prefix = randomPrefix(random);
      const ip = randomAddress(random, prefix);
      const s = parseCidr(`${ip}/${prefix}`);
      const { octet, block, name } = boundary(prefix);
      const value = Number(ip.split(".")[octet]);
      const start = Math.floor(value / block) * block;
      const right = intToIp(s.broadcast);
      const lastOctet255 = intToIp(Math.floor(ipToInt(ip) / 256) * 256 + 255);
      return {
        prompt: `What is the broadcast address of ${ip}/${prefix}?`,
        ...buildOptions(right, [intToIp(s.broadcast - 1), intToIp(s.network), lastOctet255, intToIp(s.broadcast + 1)], random),
        explanation: `A /${prefix} splits inside the ${name} octet, where blocks are ${block} wide. ${value} is in the block ${start} to ${start + block - 1}, so the ${name} octet of the broadcast address is ${start + block - 1} and every octet after it is 255: ${right}. ${intToIp(s.broadcast - 1)} is the last usable host, one before it, and ${intToIp(s.network)} is the network address.`,
        difficulty: 2,
      };
    },
  },
];
