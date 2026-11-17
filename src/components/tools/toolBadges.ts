import type { ComponentType } from "react";
import type { SimpleIcon } from "simple-icons";
import {
  siDocker,
  siKubernetes,
  siGit,
  siGithub,
  siRedis,
  siApachekafka,
  siRabbitmq,
  siWireshark,
  siLinux,
  siGnubash,
  siNpm,
  siCmake,
  siCondaforge,
  siPostgresql,
  siSqlite,
  siPython,
  siJavascript,
  siOpenjdk,
  siCplusplus,
  siRust,
  siNvidia,
  siPytorch,
  siIntel,
  siAmd,
  siArm,
  siGithubcopilot,
  siClaude,
  siCloudflare,
  siOpenstreetmap,
  siGooglemaps,
  si7zip,
  siLetsencrypt,
  siAudacity,
  siOpengl,
  siWebgl,
  siSvg,
  siElasticsearch,
  siAlgolia,
  siJson,
  siGnu,
  siLlvm,
  siBitwarden,
  siKeepassxc,
  siArduino,
  siRaspberrypi,
  siOpensourcehardware,
  siBroadcom,
  siGoogle,
  siDuckduckgo,
} from "simple-icons";
import { Usb, Cpu, Hash, KeyRound } from "lucide-react";

export type ToolBadge = {
  label: string;
  icon?: SimpleIcon;
  lucideIcon?: ComponentType<{ className?: string }>;
  color?: string;
};

/**
 * Maps each tool card to authentic icons representing the real software tools discussed.
 */
export const TOOL_BADGES: Record<string, ToolBadge[]> = {
  "Regex engines": [
    { label: "ripgrep", icon: siRust, color: "#DEA584" },
    { label: "grep", icon: siGnu, color: "#A42E2B" },
  ],
  "Compilers and parsers": [
    { label: "LLVM", icon: siLlvm, color: "#262D3A" },
    { label: "GCC", icon: siGnu, color: "#A42E2B" },
    { label: "JSON", icon: siJson, color: "#000000" },
  ],
  "Hash maps": [
    { label: "Python dict", icon: siPython, color: "#3776AB" },
    { label: "JavaScript Map", icon: siJavascript, color: "#F7DF1E" },
    { label: "Java HashMap", icon: siOpenjdk, color: "#EA2D2E" },
  ],
  "Database indexes": [
    { label: "PostgreSQL", icon: siPostgresql, color: "#4169E1" },
    { label: "SQLite", icon: siSqlite, color: "#003B57" },
  ],
  "Redis": [
    { label: "Redis", icon: siRedis, color: "#FF4438" },
  ],
  "File compression": [
    { label: "7-Zip", icon: si7zip, color: "#000000" },
    { label: "gzip", icon: siGnu, color: "#A42E2B" },
  ],
  "Standard library sorting": [
    { label: "Python sort()", icon: siPython, color: "#3776AB" },
    { label: "Java Arrays.sort", icon: siOpenjdk, color: "#EA2D2E" },
    { label: "C++ std::sort", icon: siCplusplus, color: "#00599C" },
  ],
  "Python lists, ArrayList and vector": [
    { label: "Python list", icon: siPython, color: "#3776AB" },
    { label: "Java ArrayList", icon: siOpenjdk, color: "#EA2D2E" },
    { label: "C++ std::vector", icon: siCplusplus, color: "#00599C" },
  ],
  "Autocomplete and search boxes": [
    { label: "Elasticsearch", icon: siElasticsearch, color: "#005571" },
    { label: "Algolia", icon: siAlgolia, color: "#003DFF" },
  ],
  "ping, traceroute and Wireshark": [
    { label: "Wireshark", icon: siWireshark, color: "#1679A7" },
    { label: "traceroute", icon: siGnubash, color: "#4EAA25" },
  ],
  "DNS and domains": [
    { label: "Cloudflare DNS", icon: siCloudflare, color: "#F38020" },
    { label: "dig", icon: siGnubash, color: "#4EAA25" },
  ],
  "Package managers and build tools": [
    { label: "npm", icon: siNpm, color: "#CB3837" },
    { label: "CMake", icon: siCmake, color: "#064F8C" },
    { label: "Conda", icon: siCondaforge, color: "#000000" },
  ],
  "Maps apps and internet routing": [
    { label: "OpenStreetMap", icon: siOpenstreetmap, color: "#7EBC6F" },
    { label: "Google Maps", icon: siGooglemaps, color: "#4285F4" },
  ],
  "diff and Git": [
    { label: "Git", icon: siGit, color: "#F05032" },
    { label: "GitHub", icon: siGithub, color: "#181717" },
  ],
  "Passwords and hashes": [
    { label: "Bitwarden", icon: siBitwarden, color: "#175DDC" },
    { label: "KeePassXC", icon: siKeepassxc, color: "#6CA434" },
    { label: "SHA-256", lucideIcon: Hash, color: "#38BDF8" },
  ],
  "Encryption": [
    { label: "Let's Encrypt", icon: siLetsencrypt, color: "#003A70" },
    { label: "OpenSSL", lucideIcon: KeyRound, color: "#721412" },
  ],
  "Digital audio and noise filters": [
    { label: "Audacity", icon: siAudacity, color: "#0000EB" },
  ],
  "Machine learning and GPUs": [
    { label: "NVIDIA CUDA", icon: siNvidia, color: "#76B900" },
    { label: "PyTorch", icon: siPytorch, color: "#EE4C2C" },
  ],
  "CPU caches": [
    { label: "Intel", icon: siIntel, color: "#0071C5" },
    { label: "AMD", icon: siAmd, color: "#ED1C24" },
  ],
  "Task Manager and top": [
    { label: "Linux top", icon: siLinux, color: "#FCC624" },
  ],
  "The Linux terminal": [
    { label: "Linux", icon: siLinux, color: "#FCC624" },
    { label: "GNU Bash", icon: siGnubash, color: "#4EAA25" },
  ],
  "Kafka, RabbitMQ and message queues": [
    { label: "Apache Kafka", icon: siApachekafka, color: "#231F20" },
    { label: "RabbitMQ", icon: siRabbitmq, color: "#FF6600" },
  ],
  "Docker, Kubernetes and microservices": [
    { label: "Docker", icon: siDocker, color: "#2496ED" },
    { label: "Kubernetes", icon: siKubernetes, color: "#326CE5" },
  ],
  "AI coding assistants": [
    { label: "GitHub Copilot", icon: siGithubcopilot, color: "#000000" },
    { label: "Claude", icon: siClaude, color: "#D97706" },
  ],
  "Search queries and error messages": [
    { label: "Google Search", icon: siGoogle, color: "#4285F4" },
    { label: "DuckDuckGo", icon: siDuckduckgo, color: "#DE5833" },
  ],
  "Threads and locks": [
    { label: "Java Threads", icon: siOpenjdk, color: "#EA2D2E" },
    { label: "C++ pthreads", icon: siCplusplus, color: "#00599C" },
  ],
  "Swap and running out of RAM": [
    { label: "Linux Swap", icon: siLinux, color: "#FCC624" },
    { label: "Memory Paging", lucideIcon: Cpu, color: "#A855F7" },
  ],
  "Assembly and debuggers": [
    { label: "GNU GDB", icon: siGnu, color: "#A42E2B" },
    { label: "ARM64", icon: siArm, color: "#0091BD" },
  ],
  "Images, screens and game graphics": [
    { label: "SVG", icon: siSvg, color: "#FFB13B" },
    { label: "OpenGL", icon: siOpengl, color: "#5586A4" },
    { label: "WebGL", icon: siWebgl, color: "#990000" },
  ],
  "USB and serial ports": [
    { label: "USB", lucideIcon: Usb, color: "#3B82F6" },
    { label: "Arduino UART", icon: siArduino, color: "#00878F" },
    { label: "Raspberry Pi", icon: siRaspberrypi, color: "#A22846" },
  ],
  "Digital logic and 7400-series ICs": [
    { label: "7400 DIP IC", lucideIcon: Cpu, color: "#EC4899" },
    { label: "OSHWA", icon: siOpensourcehardware, color: "#000000" },
  ],
  "Seven-segment displays and digital readouts": [
    { label: "Arduino", icon: siArduino, color: "#00878F" },
    { label: "Raspberry Pi", icon: siRaspberrypi, color: "#A22846" },
  ],
  "RAM chips and memory expansion": [
    { label: "Broadcom", icon: siBroadcom, color: "#CC092F" },
    { label: "Intel", icon: siIntel, color: "#0071C5" },
  ],
};
