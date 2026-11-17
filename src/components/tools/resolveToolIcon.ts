import type { ComponentType } from "react";
import type { SimpleIcon } from "simple-icons";
import {
  siDocker,
  siKubernetes,
  siGit,
  siGithub,
  siWireshark,
  siLinux,
  siGnubash,
  siPython,
  siJavascript,
  siTypescript,
  siOpenjdk,
  siCplusplus,
  siC,
  siRust,
  siRedis,
  siPostgresql,
  siSqlite,
  siMysql,
  siApachekafka,
  siRabbitmq,
  siApacheairflow,
  siNvidia,
  siPytorch,
  siTensorflow,
  siOpenssl,
  siLetsencrypt,
  siCloudflare,
  siOpenstreetmap,
  siGooglemaps,
  siElasticsearch,
  siAlgolia,
  siNpm,
  siCmake,
  siCondaforge,
  siAudacity,
  si7zip,
  siGnu,
  siLlvm,
  siReact,
  siFigma,
  siOpengl,
  siWebgl,
  siSvg,
  siUnity,
  siUnrealengine,
  siWireguard,
  siYoutube,
  siNetflix,
  siGoogle,
  siDuckduckgo,
  siBitwarden,
  siKeepassxc,
  si1password,
  siArduino,
  siRaspberrypi,
  siIntel,
  siAmd,
  siArm,
  siGithubcopilot,
  siClaude,
  siJson,
  siWikipedia,
} from "simple-icons";
import {
  Cpu,
  Database,
  HardDrive,
  Network,
  Shield,
  FileCode,
  AudioWaveform,
  Cloud,
  BookOpen,
  Terminal,
  Video,
  Usb,
  ExternalLink,
} from "lucide-react";

export type ResolvedIcon = {
  simpleIcon?: SimpleIcon;
  lucideIcon?: ComponentType<{ className?: string }>;
  color?: string;
};

/**
 * Maps a tool tag or title to the most accurate authentic icon.
 */
export function resolveToolIcon(tool?: string, title?: string): ResolvedIcon | null {
  const text = `${tool || ""} ${title || ""}`.toLowerCase();

  // Exact Brand matches
  if (text.includes("docker") || text.includes("container")) {
    return { simpleIcon: siDocker, color: "#2496ED" };
  }
  if (text.includes("kubernetes") || text.includes("k8s")) {
    return { simpleIcon: siKubernetes, color: "#326CE5" };
  }
  if (text.includes("wireshark")) {
    return { simpleIcon: siWireshark, color: "#1679A7" };
  }
  if (text.includes("wireguard")) {
    return { simpleIcon: siWireguard, color: "#88171A" };
  }
  if (text.includes("github copilot") || text.includes("copilot")) {
    return { simpleIcon: siGithubcopilot, color: "currentColor" };
  }
  if (text.includes("claude") || text.includes("anthropic")) {
    return { simpleIcon: siClaude, color: "#D97706" };
  }
  if (text.includes("git bisect") || text.includes("git diff") || text.includes("git,") || text.includes("git ") || text.includes(" git")) {
    return { simpleIcon: siGit, color: "#F05032" };
  }
  if (text.includes("github")) {
    return { simpleIcon: siGithub, color: "currentColor" };
  }
  if (text.includes("youtube") || text.includes("watch video") || text.includes("watch →") || text.includes("virtusan")) {
    return { simpleIcon: siYoutube, color: "#FF0000" };
  }
  if (text.includes("netflix")) {
    return { simpleIcon: siNetflix, color: "#E50914" };
  }
  if (text.includes("redis") || text.includes("memcached")) {
    return { simpleIcon: siRedis, color: "#FF4438" };
  }
  if (text.includes("kafka")) {
    return { simpleIcon: siApachekafka, color: "currentColor" };
  }
  if (text.includes("rabbitmq")) {
    return { simpleIcon: siRabbitmq, color: "#FF6600" };
  }
  if (text.includes("airflow")) {
    return { simpleIcon: siApacheairflow, color: "#017CEE" };
  }
  if (text.includes("nvidia") || text.includes("cuda")) {
    return { simpleIcon: siNvidia, color: "#76B900" };
  }
  if (text.includes("pytorch")) {
    return { simpleIcon: siPytorch, color: "#EE4C2C" };
  }
  if (text.includes("tensorflow")) {
    return { simpleIcon: siTensorflow, color: "#FF6F00" };
  }
  if (text.includes("letsencrypt") || text.includes("let's encrypt")) {
    return { simpleIcon: siLetsencrypt, color: "#003A70" };
  }
  if (text.includes("openssl")) {
    return { simpleIcon: siOpenssl, color: "#721412" };
  }
  if (text.includes("cloudflare") || text.includes("1.1.1.1")) {
    return { simpleIcon: siCloudflare, color: "#F38020" };
  }
  if (text.includes("google maps")) {
    return { simpleIcon: siGooglemaps, color: "#4285F4" };
  }
  if (text.includes("openstreetmap") || text.includes("osrm")) {
    return { simpleIcon: siOpenstreetmap, color: "#7EBC6F" };
  }
  if (text.includes("elasticsearch")) {
    return { simpleIcon: siElasticsearch, color: "#005571" };
  }
  if (text.includes("algolia")) {
    return { simpleIcon: siAlgolia, color: "#003DFF" };
  }
  if (text.includes("npm")) {
    return { simpleIcon: siNpm, color: "#CB3837" };
  }
  if (text.includes("cmake")) {
    return { simpleIcon: siCmake, color: "#064F8C" };
  }
  if (text.includes("conda")) {
    return { simpleIcon: siCondaforge, color: "currentColor" };
  }
  if (text.includes("7-zip") || text.includes("7zip")) {
    return { simpleIcon: si7zip, color: "currentColor" };
  }
  if (text.includes("gzip") || text.includes("deflate")) {
    return { simpleIcon: siGnu, color: "#A42E2B" };
  }
  if (text.includes("audacity")) {
    return { simpleIcon: siAudacity, color: "#0000EB" };
  }
  if (text.includes("postgres")) {
    return { simpleIcon: siPostgresql, color: "#4169E1" };
  }
  if (text.includes("sqlite")) {
    return { simpleIcon: siSqlite, color: "#003B57" };
  }
  if (text.includes("mysql")) {
    return { simpleIcon: siMysql, color: "#4479A1" };
  }
  if (text.includes("python") || text.includes("scikit-learn") || text.includes("numpy") || text.includes("pandas")) {
    return { simpleIcon: siPython, color: "#3776AB" };
  }
  if (text.includes("rust") || text.includes("ripgrep")) {
    return { simpleIcon: siRust, color: "currentColor" };
  }
  if (text.includes("java") || text.includes("jdk") || text.includes("treemap") || text.includes("hashmap") || text.includes("arraylist") || text.includes("jvm")) {
    return { simpleIcon: siOpenjdk, color: "#EA2D2E" };
  }
  if (text.includes("c++") || text.includes("std::vector") || text.includes("std::sort") || text.includes("std::map")) {
    return { simpleIcon: siCplusplus, color: "#00599C" };
  }
  if (text.includes("gcc") || text.includes("gdb") || text.includes("gnu") || text.includes("bash") || text.includes("grep")) {
    return { simpleIcon: siGnu, color: "#A42E2B" };
  }
  if (text.includes("llvm") || text.includes("clang")) {
    return { simpleIcon: siLlvm, color: "#262D3A" };
  }
  if (text.includes("json")) {
    return { simpleIcon: siJson, color: "currentColor" };
  }
  if (text.includes("linux") || text.includes("ubuntu") || text.includes("sysctl") || text.includes("chmod") || text.includes("iptables")) {
    return { simpleIcon: siLinux, color: "#FCC624" };
  }
  if (text.includes("react")) {
    return { simpleIcon: siReact, color: "#61DAFB" };
  }
  if (text.includes("figma")) {
    return { simpleIcon: siFigma, color: "#F24E1E" };
  }
  if (text.includes("opengl") || text.includes("glsl")) {
    return { simpleIcon: siOpengl, color: "#5586A4" };
  }
  if (text.includes("webgl")) {
    return { simpleIcon: siWebgl, color: "#990000" };
  }
  if (text.includes("svg")) {
    return { simpleIcon: siSvg, color: "#FFB13B" };
  }
  if (text.includes("unity")) {
    return { simpleIcon: siUnity, color: "currentColor" };
  }
  if (text.includes("unreal")) {
    return { simpleIcon: siUnrealengine, color: "currentColor" };
  }
  if (text.includes("arduino")) {
    return { simpleIcon: siArduino, color: "#00878F" };
  }
  if (text.includes("raspberry pi") || text.includes("raspberry")) {
    return { simpleIcon: siRaspberrypi, color: "#A22846" };
  }
  if (text.includes("intel")) {
    return { simpleIcon: siIntel, color: "#0071C5" };
  }
  if (text.includes("amd")) {
    return { simpleIcon: siAmd, color: "#ED1C24" };
  }
  if (text.includes("arm")) {
    return { simpleIcon: siArm, color: "#0091BD" };
  }
  if (text.includes("bitwarden")) {
    return { simpleIcon: siBitwarden, color: "#175DDC" };
  }
  if (text.includes("keepass")) {
    return { simpleIcon: siKeepassxc, color: "#6CA434" };
  }
  if (text.includes("1password")) {
    return { simpleIcon: si1password, color: "#0A85EA" };
  }
  if (text.includes("google") || text.includes("gmail") || text.includes("8.8.8.8")) {
    return { simpleIcon: siGoogle, color: "#4285F4" };
  }
  if (text.includes("duckduckgo")) {
    return { simpleIcon: siDuckduckgo, color: "#DE5833" };
  }

  // Hardware / Systems Fallbacks
  if (text.includes("usb") || text.includes("serial") || text.includes("uart")) {
    return { lucideIcon: Usb, color: "#3B82F6" };
  }
  if (text.includes("cpu") || text.includes("chip") || text.includes("processor") || text.includes("thread") || text.includes("mutex") || text.includes("semaphore")) {
    return { lucideIcon: Cpu, color: "#A855F7" };
  }
  if (text.includes("database") || text.includes("b-tree") || text.includes("sql") || text.includes("storage")) {
    return { lucideIcon: Database, color: "#38BDF8" };
  }
  if (text.includes("disk") || text.includes("drive") || text.includes("paging") || text.includes("ram") || text.includes("memory") || text.includes("swap")) {
    return { lucideIcon: HardDrive, color: "#64748B" };
  }
  if (text.includes("network") || text.includes("socket") || text.includes("router") || text.includes("packet") || text.includes("tcp") || text.includes("udp") || text.includes("ip ") || text.includes("http") || text.includes("dns")) {
    return { lucideIcon: Network, color: "#0284C7" };
  }
  if (text.includes("tls") || text.includes("ssh") || text.includes("rsa") || text.includes("crypto") || text.includes("cipher") || text.includes("aes") || text.includes("security") || text.includes("hash")) {
    return { lucideIcon: Shield, color: "#10B981" };
  }
  if (text.includes("compiler") || text.includes("parser") || text.includes("linter") || text.includes("code") || text.includes("yacc") || text.includes("bison") || text.includes("antlr")) {
    return { lucideIcon: FileCode, color: "#8B5CF6" };
  }
  if (text.includes("audio") || text.includes("sound") || text.includes("noise") || text.includes("signal")) {
    return { lucideIcon: AudioWaveform, color: "#06B6D4" };
  }
  if (text.includes("cloud") || text.includes("aws") || text.includes("azure") || text.includes("gcp") || text.includes("server")) {
    return { lucideIcon: Cloud, color: "#6366F1" };
  }
  if (text.includes("terminal") || text.includes("shell") || text.includes("prompt") || text.includes("command")) {
    return { lucideIcon: Terminal, color: "#10B981" };
  }
  if (text.includes("read more") || text.includes("read →") || text.includes("reading") || text.includes("paper") || text.includes("book") || text.includes("article") || text.includes("tutorial") || text.includes("docs")) {
    return { lucideIcon: BookOpen, color: "#F59E0B" };
  }
  if (text.includes("watch") || text.includes("video") || text.includes("youtube")) {
    return { simpleIcon: siYoutube, color: "#FF0000" };
  }
  if (text.includes("wikipedia")) {
    return { simpleIcon: siWikipedia, color: "#636466" };
  }
  if (text.includes("http") || text.includes("www") || text.includes("link") || text.includes("→")) {
    return { lucideIcon: ExternalLink, color: "#64748B" };
  }

  return null;
}
