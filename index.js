#!/usr/bin/env node
import { execSync } from "child_process";
import chalk from "chalk";
import { readdirSync, statSync, existsSync } from "fs";
import { join, resolve, basename } from "path";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const DIM = "\x1b[38;5;102m";
const TEXT = "\x1b[38;5;145m";

const LOGO_LINES = [
  "  ██████╗ ███████╗██╗  ██╗ █████╗ ██████╗ ",
  "  ██╔══██╗██╔════╝██║ ██╔╝██╔══██╗██╔══██╗",
  "  ██████╔╝█████╗  █████╔╝ ███████║██████╔╝",
  "  ██╔══██╗██╔══╝  ██╔═██╗ ██╔══██║██╔═══╝ ",
  "  ██║  ██║███████╗██║  ██╗██║  ██║██║     ",
  "  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ",
];

const GRAYS = [
  "\x1b[38;5;250m",
  "\x1b[38;5;248m",
  "\x1b[38;5;245m",
  "\x1b[38;5;243m",
  "\x1b[38;5;240m",
  "\x1b[38;5;238m",
];

const LOGO = LOGO_LINES.map((line, i) => `${GRAYS[i]}${line}${RESET}`).join(
  "\n",
);

const args = process.argv.slice(2);
const FLAGS = {
  all: args.includes("--all"),
  open: args.includes("--open"),
  watch: args.includes("--watch"),
  json: args.includes("--json"),
  help: args.includes("--help") || args.includes("-h"),
  path: args.find((a) => !a.startsWith("-")) ?? ".",
};

function git(cmd, cwd = process.cwd()) {
  try {
    return execSync(`git ${cmd}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      cwd,
    }).trim();
  } catch {
    return null;
  }
}

function sanitize(url) {
  return (
    url?.replace(/https?:\/\/[^@]+@/, "https://").replace(/\.git$/, "") ?? null
  );
}

function repoName(raw, cwd) {
  const m = raw?.match(/[:/]([^/:]+\/[^/:]+?)(?:\.git)?$/);
  return m ? m[1] : basename(resolve(cwd));
}

function grade(changed, behind, stashes) {
  const s =
    100 -
    Math.min(changed * 4, 40) -
    Math.min(behind * 8, 32) -
    Math.min(stashes * 6, 18);
  if (s >= 90) return { g: "A", label: "healthy" };
  if (s >= 75) return { g: "B", label: "good" };
  if (s >= 55) return { g: "C", label: "stale" };
  if (s >= 35) return { g: "D", label: "messy" };
  return { g: "F", label: "overdue" };
}

function timeLabel(t) {
  if (!t || t === "never") return `${DIM}never${RESET}`;
  if (/second|minute|hour|^[1-3] day/.test(t)) return `${TEXT}${t}${RESET}`;
  return `${DIM}${t}${RESET}`;
}

const CC = {
  feat: "feat",
  fix: "fix",
  refactor: "refactor",
  chore: "chore",
  docs: "docs",
  style: "style",
  test: "test",
  perf: "perf",
  ci: "ci",
  build: "build",
  revert: "revert",
};

function colorCommit(msg) {
  return msg.replace(
    /^(feat|fix|refactor|chore|docs|style|test|perf|ci|build|revert)(\([^)]+\))?:/,
    (m, t) => (CC[t] ? chalk.white(m) : m),
  );
}

const EXT_LANG = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  rs: "Rust",
  go: "Go",
  java: "Java",
  cs: "C#",
  cpp: "C++",
  cc: "C++",
  c: "C",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  dart: "Dart",
  vue: "Vue",
  svelte: "Svelte",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  less: "CSS",
  md: "Markdown",
  mdx: "Markdown",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  fish: "Shell",
  lua: "Lua",
  tf: "Terraform",
  hcl: "HCL",
  sol: "Solidity",
  ex: "Elixir",
  exs: "Elixir",
};

function getLangs(cwd) {
  try {
    const files = execSync("git ls-files", {
      encoding: "utf8",
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    const counts = {};
    for (const f of files) {
      const lang = EXT_LANG[f.split(".").pop()?.toLowerCase()];
      if (lang) counts[lang] = (counts[lang] ?? 0) + 1;
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (!total) return null;

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, n]) => ({ lang, pct: Math.round((n / total) * 100) }));
  } catch {
    return null;
  }
}

function row(label, value) {
  console.log(`  ${DIM}${label.padEnd(12)}${RESET}${TEXT}${value}${RESET}`);
}

function langLine(lang, pct, w = 20) {
  const f = Math.max(1, Math.round((pct / 100) * w));
  return (
    `  ${chalk.dim("\u2192")} ${lang.padEnd(14)}` +
    chalk.white("\u2588".repeat(f)) +
    chalk.dim("\u2591".repeat(w - f)) +
    chalk.dim(` ${String(pct).padStart(3)}%`)
  );
}

function showAbout() {
  console.log(chalk.dim("  See exactly where you left off in any git repo\n"));
  const line = (cmd, desc) =>
    console.log(
      `  ${chalk.dim("$")} rekap ${chalk.white(cmd.padEnd(20))} ${chalk.dim(desc)}`,
    );
  line("", "summarize current repo");
  line("[path]", "summarize a specific repo");
  line("--all [dir]", "scan all repos in a directory");
  line("--open", "open current branch in browser");
  line("--watch", "live-refresh every 3s");
  line("--json", "machine-readable output");
  line("--help", "show this screen");
  console.log("");
  console.log(`  ${chalk.dim("try:")} npx rekap\n`);
  console.log(chalk.dim("  Install globally: npm install -g rekap\n"));
}

function showRepo(cwd = process.cwd()) {
  if (!git("rev-parse --is-inside-work-tree", cwd)) return false;

  const branch = git("branch --show-current", cwd) ?? "detached HEAD";
  const rawRemote = git("remote get-url origin", cwd);
  const remote = sanitize(rawRemote);
  const name = repoName(rawRemote, cwd);
  const lastDate = git("log -1 --format=%cr", cwd) ?? "never";
  const tag = git("describe --tags --abbrev=0", cwd);

  const commits = (git("log --oneline -5", cwd) ?? "")
    .split("\n")
    .filter(Boolean);
  const changed = (git("status --porcelain", cwd) ?? "")
    .split("\n")
    .filter(Boolean);
  const stashes = (git("stash list", cwd) ?? "")
    .split("\n")
    .filter(Boolean).length;

  let ahead = 0,
    behind = 0;
  const ab = git("rev-list --left-right --count @{u}...HEAD", cwd);
  if (ab) [behind, ahead] = ab.split(/\s+/).map(Number);

  const langs = getLangs(cwd);
  const { g, label } = grade(changed.length, behind, stashes);

  if (FLAGS.json) {
    process.stdout.write(
      JSON.stringify(
        {
          name,
          branch,
          remote,
          lastCommit: lastDate,
          tag: tag ?? null,
          ahead,
          behind,
          changed: changed.length,
          stashes,
          grade: g,
          languages: langs,
        },
        null,
        2,
      ) + "\n",
    );
    return true;
  }

  console.log(`\n${LOGO}\n`);

  const owner = name.includes("/") ? chalk.dim(name.split("/")[0] + "/") : "";
  const repo = chalk.bold.white(name.includes("/") ? name.split("/")[1] : name);

  console.log(
    `  ${TEXT}${owner}${BOLD}${repo}${RESET}  ${TEXT}[${g}]${RESET} ${DIM}${label}${RESET}\n`,
  );

  let branchVal = chalk.white(branch);
  if (ahead > 0) branchVal += chalk.white(`  ↑${ahead}`);
  if (behind > 0) branchVal += chalk.dim(`  ↓${behind}`);

  row("branch", branchVal);

  if (remote)
    row(
      "remote",
      chalk.dim(
        remote
          .replace("https://github.com/", "gh/")
          .replace("https://gitlab.com/", "gl/"),
      ),
    );

  row("last", timeLabel(lastDate));

  if (tag) row("version", chalk.dim(tag));

  console.log(`\n  ${chalk.white("recent commits")}`);

  if (!commits.length) {
    console.log(chalk.dim("    no commits yet"));
  } else {
    for (const line of commits) {
      const i = line.indexOf(" ");
      console.log(
        `  ${chalk.dim(line.slice(0, i))}  ${colorCommit(line.slice(i + 1))}`,
      );
    }
  }

  console.log("");

  if (!changed.length) {
    console.log(`  ${chalk.white("uncommitted")}  ${chalk.dim("clean ✓")}`);
  } else {
    console.log(
      `  ${chalk.white("uncommitted")}  ${chalk.white(changed.length + " file" + (changed.length > 1 ? "s" : ""))}`,
    );
    for (const l of changed.slice(0, 6)) {
      const m = l.match(/^(.{2})\s(.+)$/);
      if (!m) continue;

      const sc =
        m[1].trim() === "??"
          ? chalk.dim("??")
          : m[1].includes("M")
            ? chalk.white(" M")
            : m[1].includes("A")
              ? chalk.white(" A")
              : m[1].includes("D")
                ? chalk.dim(" D")
                : chalk.dim(m[1].padStart(2));

      console.log(`  ${sc}  ${chalk.dim(m[2])}`);
    }

    if (changed.length > 6)
      console.log(chalk.dim(`     …and ${changed.length - 6} more`));
  }

  if (stashes > 0) {
    console.log("");
    row("stashes", chalk.white(stashes + " stashed"));
  }

  if (langs?.length) {
    console.log(`\n  ${chalk.white("languages")}`);
    langs.forEach((l) => console.log(langLine(l.lang, l.pct)));
  }

  console.log("");
  return true;
}

function showAll(dir) {
  let repos = [];
  try {
    repos = readdirSync(dir).filter((e) => {
      try {
        return (
          statSync(join(dir, e)).isDirectory() &&
          existsSync(join(dir, e, ".git"))
        );
      } catch {
        return false;
      }
    });
  } catch {
    console.log(chalk.dim(`\n  cannot read: ${dir}\n`));
    return;
  }

  if (!repos.length) {
    console.log(chalk.dim(`\n  no git repos found in ${dir}\n`));
    return;
  }

  console.log(
    chalk.dim(
      `\n  scanning ${dir} — ${repos.length} repo${repos.length > 1 ? "s" : ""}\n`,
    ),
  );

  for (const r of repos) showRepo(join(dir, r));
}

function openRepo(cwd) {
  const raw = git("remote get-url origin", cwd);

  if (!raw) {
    console.log(chalk.dim("\n  no remote found\n"));
    process.exit(1);
  }

  let url = sanitize(raw);

  if (!url.startsWith("http"))
    url = url.replace(/^git@([^:]+):/, "https://$1/");

  const branch = git("branch --show-current", cwd);

  if (branch && branch !== "main" && branch !== "master")
    url += `/tree/${branch}`;

  const opener =
    process.platform === "win32"
      ? "cmd /c start"
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";

  try {
    execSync(`${opener} "${url}"`, { stdio: "ignore", shell: true });
  } catch {}

  console.log(chalk.dim(`\n  → ${url}\n`));
}

function watchRepo(cwd) {
  const clear =
    process.platform === "win32"
      ? () => execSync("cls", { stdio: "inherit", shell: true })
      : () => process.stdout.write("\x1B[2J\x1B[H");

  const run = () => {
    try {
      clear();
    } catch {}

    showRepo(cwd);
    console.log(chalk.dim("  watching… ctrl+c to stop\n"));
  };

  run();
  setInterval(run, 3000);
}

function main() {
  const cwd = resolve(FLAGS.path);

  if (FLAGS.help) {
    console.log(`\n${LOGO}\n`);
    showAbout();
    return;
  }

  if (FLAGS.open) return openRepo(cwd);
  if (FLAGS.watch) return watchRepo(cwd);
  if (FLAGS.all) return showAll(cwd);

  if (!showRepo(cwd)) {
    console.log(`\n${LOGO}\n`);
    console.log(chalk.dim("  not a git repository\n"));
    showAbout();
    process.exit(1);
  }
}

main();
