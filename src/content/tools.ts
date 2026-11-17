/* Real tools mapped to the lessons that explain them. Each `mentions` is checked against the lesson's text
   by src/test/paths-and-tools.test.ts, so a link can't claim something the lesson doesn't cover. */

export type ToolLesson = { course: string; lesson: string; mentions: string };
export type Tool = { name: string; what: string; lessons: ToolLesson[] };

export const tools: Tool[] = [
  {
    name: "Regex engines",
    what: "grep, your editor's find box and form validators all run the machines from this theory.",
    lessons: [
      { course: "theory-of-computation", lesson: "nfa", mentions: "regex" },
      { course: "theory-of-computation", lesson: "regular-expressions", mentions: "grep" },
      { course: "theory-of-computation", lesson: "transition-graphs", mentions: "ripgrep" },
      { course: "theory-of-computation", lesson: "regex-playground", mentions: "regex" },
    ],
  },
  {
    name: "Compilers and parsers",
    what: "How a program turns source code or JSON into a structure it can work with.",
    lessons: [
      { course: "theory-of-computation", lesson: "grammars", mentions: "yacc" },
      { course: "theory-of-computation", lesson: "context-free-grammars", mentions: "parser" },
      { course: "theory-of-computation", lesson: "pushdown-automata", mentions: "JSON" },
      { course: "theory-of-computation", lesson: "cfg-equals-pda", mentions: "parser" },
      { course: "microprocessors", lesson: "stack-and-procedures", mentions: "compiler" },
    ],
  },
  {
    name: "Hash maps",
    what: "Python dicts, JavaScript objects and Java HashMaps, and why they're usually so fast.",
    lessons: [
      { course: "advanced-algorithms", lesson: "hashing", mentions: "hash" },
      { course: "advanced-algorithms", lesson: "collision-resolution", mentions: "hash" },
      { course: "advanced-algorithms", lesson: "lab-hashing", mentions: "hash" },
      { course: "discrete-mathematics", lesson: "pigeonhole-principle", mentions: "hash table" },
      { course: "discrete-mathematics", lesson: "birthday-problem", mentions: "hash table" },
      { course: "data-structures", lesson: "hash-maps", mentions: "load factor" },
    ],
  },
  {
    name: "Database indexes",
    what: "Why looking up one row among millions doesn't mean reading them all.",
    lessons: [
      { course: "algorithm-design-and-analysis", lesson: "linear-and-binary-search", mentions: "index" },
      { course: "advanced-algorithms", lesson: "balanced-search-trees", mentions: "B-tree" },
      { course: "data-structures", lesson: "binary-search-trees", mentions: "B-tree" },
    ],
  },
  {
    name: "Redis",
    what: "The data structure behind its sorted sets.",
    lessons: [{ course: "advanced-algorithms", lesson: "skip-lists", mentions: "Redis" }],
  },
  {
    name: "File compression",
    what: "How zip-style formats make common data take fewer bits.",
    lessons: [
      { course: "advanced-algorithms", lesson: "huffman-and-activity-selection", mentions: "Huffman" },
      { course: "algorithm-design-and-analysis", lesson: "greedy-and-mst", mentions: "Huffman" },
      { course: "discrete-mathematics", lesson: "pigeonhole-principle", mentions: "gzip" },
    ],
  },
  {
    name: "Standard library sorting",
    what: "Why Python, Java, V8 and C++ choose quicksort, mergesort or Timsort to power .sort().",
    lessons: [
      { course: "algorithm-design-and-analysis", lesson: "quick-sort", mentions: "Arrays.sort" },
      { course: "algorithm-design-and-analysis", lesson: "merge-sort", mentions: "Timsort" },
      { course: "algorithm-design-and-analysis", lesson: "insertion-sort", mentions: "sort" },
    ],
  },
  {
    name: "Python lists, ArrayList and vector",
    what: "Why appending is fast, inserting at the front is slow, and what happens when the list fills up.",
    lessons: [
      { course: "data-structures", lesson: "arrays-and-memory", mentions: "cache" },
      { course: "data-structures", lesson: "dynamic-arrays", mentions: "ArrayList" },
      { course: "advanced-algorithms", lesson: "hashing", mentions: "push_back" },
    ],
  },
  {
    name: "Autocomplete and search boxes",
    what: "How suggestions appear as you type, one step per letter.",
    lessons: [{ course: "data-structures", lesson: "tries", mentions: "autocomplete" }],
  },
  {
    name: "ping, traceroute and Wireshark",
    what: "Seeing where a slow or broken connection goes wrong.",
    lessons: [
      { course: "computer-networks", lesson: "layers-and-packets", mentions: "Wireshark" },
      { course: "computer-networks", lesson: "delay-and-throughput", mentions: "ping" },
      { course: "computer-networks", lesson: "routing", mentions: "traceroute" },
    ],
  },
  {
    name: "DNS and domains",
    what: "How a name becomes an address, and why changes take time to spread.",
    lessons: [{ course: "computer-networks", lesson: "dns", mentions: "dig" }],
  },
  {
    name: "Package managers and build tools",
    what: "How npm, make and Airflow decide what runs first, and why they reject circular dependencies.",
    lessons: [
      { course: "discrete-mathematics", lesson: "relations", mentions: "partial order" },
      { course: "discrete-mathematics", lesson: "paths-and-dags", mentions: "npm" },
      { course: "advanced-algorithms", lesson: "p-and-np", mentions: "conda" },
    ],
  },
  {
    name: "Maps apps and internet routing",
    what: "How a route planner or a router finds the cheapest way from here to there.",
    lessons: [
      { course: "advanced-algorithms", lesson: "shortest-paths", mentions: "OSPF" },
      { course: "computer-networks", lesson: "routing", mentions: "Dijkstra" },
    ],
  },
  {
    name: "diff and Git",
    what: "How a tool spots exactly which lines changed between two versions of a file.",
    lessons: [
      { course: "advanced-algorithms", lesson: "dynamic-programming", mentions: "git diff" },
      { course: "algorithm-design-and-analysis", lesson: "dynamic-programming", mentions: "diff" },
    ],
  },
  {
    name: "Passwords and hashes",
    what: "Why length beats complexity, and how many bits a hash or random ID really needs.",
    lessons: [
      { course: "discrete-mathematics", lesson: "sum-and-product-rules", mentions: "password" },
      { course: "discrete-mathematics", lesson: "birthday-problem", mentions: "SHA-256" },
    ],
  },
  {
    name: "Encryption",
    what: "The number theory that secures HTTPS and RSA.",
    lessons: [
      { course: "computational-mathematics", lesson: "primality-and-the-totient", mentions: "RSA" },
      { course: "computational-mathematics", lesson: "order-and-primitive-roots", mentions: "Diffie" },
      { course: "computational-mathematics", lesson: "modular-inverses", mentions: "RSA" },
      { course: "computational-mathematics", lesson: "fast-exponentiation", mentions: "RSA" },
      { course: "computational-mathematics", lesson: "discrete-logarithms", mentions: "Diffie" },
      { course: "computer-networks", lesson: "http-and-https", mentions: "TLS" },
      { course: "advanced-algorithms", lesson: "divide-and-conquer", mentions: "RSA" },
      { course: "algorithm-design-and-analysis", lesson: "euclid-gcd", mentions: "RSA" },
    ],
  },
  {
    name: "Digital audio and noise filters",
    what: "How audio software samples continuous sound, removes noise with moving averages, and measures speech quality.",
    lessons: [
      { course: "computational-mathematics", lesson: "sound-and-sampling", mentions: "sampling" },
      { course: "computational-mathematics", lesson: "averaging-is-convolution", mentions: "convolution" },
      { course: "computational-mathematics", lesson: "measuring-the-trade-off", mentions: "decibel" },
    ],
  },
  {
    name: "Machine learning and GPUs",
    what: "The matrix maths and parallel hardware that training a model comes down to.",
    lessons: [
      { course: "computational-mathematics", lesson: "multiplying-matrices", mentions: "GPU" },
      { course: "computational-mathematics", lesson: "derivatives-and-curve-fitting", mentions: "neural" },
      { course: "computer-architecture", lesson: "parallel-processing", mentions: "GPU" },
      { course: "advanced-algorithms", lesson: "sorting-lower-bounds", mentions: "GPU" },
    ],
  },
  {
    name: "CPU caches",
    what: "Why the same code can run far faster depending on how it touches memory.",
    lessons: [
      { course: "computer-organization", lesson: "memory-hierarchy", mentions: "cache" },
      { course: "computer-architecture", lesson: "cache-mapping", mentions: "cache" },
      { course: "computer-architecture", lesson: "cache-policies", mentions: "cache" },
    ],
  },
  {
    name: "Task Manager and top",
    what: "The list of everything your computer is running, and how it decides which one gets the CPU.",
    lessons: [
      { course: "operating-systems", lesson: "processes", mentions: "Task Manager" },
      { course: "operating-systems", lesson: "cpu-scheduling-basics", mentions: "Task Manager" },
      { course: "operating-systems", lesson: "os-design-and-structure", mentions: "`top`" },
      { course: "advanced-algorithms", lesson: "balanced-search-trees", mentions: "scheduler" },
    ],
  },
  {
    name: "The Linux terminal",
    what: "Typing commands instead of clicking, and what the shell asks the OS to do for you.",
    lessons: [
      { course: "operating-systems", lesson: "lab-linux-commands", mentions: "bash" },
      { course: "operating-systems", lesson: "services-and-system-calls", mentions: "bash" },
      { course: "operating-systems", lesson: "interprocess-communication", mentions: "pipe" },
    ],
  },
  {
    name: "Kafka, RabbitMQ and message queues",
    what: "How services hand work to each other without waiting, and why a queue keeps orders from getting lost.",
    lessons: [
      { course: "advanced-software-engineering", lesson: "pipe-and-filter-and-messaging", mentions: "Kafka" },
      { course: "advanced-software-engineering", lesson: "ten-styles-at-a-glance", mentions: "Pub/Sub" },
      { course: "data-structures", lesson: "queues-and-deques", mentions: "queue" },
    ],
  },
  {
    name: "Docker, Kubernetes and microservices",
    what: "Why splitting an app into many small services became cheap, and what it costs you.",
    lessons: [
      { course: "advanced-software-engineering", lesson: "the-architects-role", mentions: "Docker" },
      { course: "advanced-software-engineering", lesson: "ten-styles-at-a-glance", mentions: "Netflix" },
    ],
  },
  {
    name: "AI coding assistants",
    what: "Why an AI agent needs tests, memory files and limits around it, and two ways AI-written code went wrong.",
    lessons: [
      { course: "advanced-software-engineering", lesson: "engineering-in-the-age-of-ai", mentions: "harness" },
      { course: "advanced-software-engineering", lesson: "case-study-ai-generated-pid", mentions: "pip" },
    ],
  },
  {
    name: "Threads and locks",
    what: "Why two threads adding to the same number can lose updates, and the locks that stop it.",
    lessons: [
      { course: "operating-systems", lesson: "lab-java-threads", mentions: "Thread" },
      { course: "operating-systems", lesson: "critical-section-problem", mentions: "mutex" },
      { course: "operating-systems", lesson: "semaphores-and-classic-problems", mentions: "semaphore" },
      { course: "operating-systems", lesson: "lab-java-synchronization", mentions: "synchronized" },
    ],
  },
  {
    name: "Swap and running out of RAM",
    what: "How your computer keeps going with more programs open than fit in memory, and why it slows to a crawl.",
    lessons: [
      { course: "operating-systems", lesson: "memory-allocation", mentions: "swap" },
      { course: "operating-systems", lesson: "virtual-memory", mentions: "swap space" },
      { course: "operating-systems", lesson: "page-replacement-and-thrashing", mentions: "thrashing" },
    ],
  },
  {
    name: "Assembly and debuggers",
    what: "What's left of your program by the time the processor runs it.",
    lessons: [
      { course: "microprocessors", lesson: "first-program", mentions: "assembl" },
      { course: "microprocessors", lesson: "registers", mentions: "register" },
      { course: "microprocessors", lesson: "stack-and-procedures", mentions: "stack" },
    ],
  },
  {
    name: "Images, screens and game graphics",
    what: "Why a photo takes megabytes, what 1080p and PPI mean, why SVG logos stay sharp and what MSAA does.",
    lessons: [
      { course: "computer-graphics", lesson: "image-size", mentions: "JPEG" },
      { course: "computer-graphics", lesson: "screen-resolution", mentions: "1080p" },
      { course: "computer-graphics", lesson: "raster-and-vector-images", mentions: "SVG" },
      { course: "computer-graphics", lesson: "aliasing", mentions: "MSAA" },
    ],
  },
  {
    name: "USB and serial ports",
    what: "How single-wire hardware interfaces turn streams of bits into bytes of data.",
    lessons: [
      { course: "computer-architecture", lesson: "registers-and-shift-registers", mentions: "UART" },
      { course: "logic-design", lesson: "signals", mentions: "serial" },
      { course: "logic-design", lesson: "registers", mentions: "shift register" },
    ],
  },
  {
    name: "Digital logic and 7400-series ICs",
    what: "The standard TTL and CMOS chips that implement gates, decoders and arithmetic circuits on circuit boards.",
    lessons: [
      { course: "logic-design", lesson: "logic-gates", mentions: "7400" },
      { course: "logic-design", lesson: "multiplexers", mentions: "7400" },
      { course: "logic-design", lesson: "signals", mentions: "TTL" },
      { course: "computer-architecture", lesson: "demystifying-circuit-schematics", mentions: "7400" },
    ],
  },
  {
    name: "Seven-segment displays and digital readouts",
    what: "How calculators, digital clocks and instruments convert 4-bit binary codes into decimal digits.",
    lessons: [
      { course: "logic-design", lesson: "codes-and-floating-point", mentions: "seven-segment" },
      { course: "logic-design", lesson: "comparators-decoders-encoders", mentions: "BCD" },
    ],
  },
  {
    name: "RAM chips and memory expansion",
    what: "How memory systems use address decoders, chip select lines and tri-state buses to expand word length and capacity.",
    lessons: [
      { course: "logic-design", lesson: "memory-unit", mentions: "SRAM" },
      { course: "computer-organization", lesson: "ram-and-rom", mentions: "DRAM" },
    ],
  },
];
