import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type CmdResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number;
};

function run(cmd: string, args: string[], inherit = false): CmdResult {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    code: result.status ?? 1,
  };
}

function fail(message: string): never {
  console.error(`ship failed: ${message}`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const skipHealth = args.includes("--skip-health");
  const filtered = args.filter((arg) => arg !== "--skip-health");
  const message = filtered.join(" ").trim();

  if (!message) {
    fail('missing commit message. Usage: npm run ship -- "your message"');
  }

  return { message, skipHealth };
}

function getChangedFiles(): string[] {
  const status = run("git", ["status", "--porcelain"]);
  if (!status.ok) fail("unable to read git status");

  const files = status.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const withoutCodes = line.replace(/^[MADRCU?!\s]{2}/, "").trim();
      if (withoutCodes.includes(" -> ")) {
        return withoutCodes.split(" -> ").pop() ?? withoutCodes;
      }
      return withoutCodes;
    });

  return [...new Set(files)];
}

function getCurrentBranch(): string {
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!branch.ok) fail("unable to determine current branch");
  return branch.stdout.trim();
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function updateDevelopmentLog(message: string, branch: string, files: string[]) {
  const logPath = path.resolve(process.cwd(), "docs", "DEVELOPMENT_LOG.md");
  const dateHeader = `## ${getTodayDate()}`;
  const fileList = files.length > 0 ? files.join(", ") : "none";
  const entry = `- ${message} (branch: \`${branch}\`, files: ${fileList})`;

  let content = fs.existsSync(logPath)
    ? fs.readFileSync(logPath, "utf8")
    : "# Development Log\n\nChronological delivery notes for shipped development work.\n";

  if (!content.includes(dateHeader)) {
    content = `${content.trimEnd()}\n\n${dateHeader}\n\n${entry}\n`;
    fs.writeFileSync(logPath, content, "utf8");
    return;
  }

  const headerIndex = content.indexOf(dateHeader);
  const afterHeader = content.slice(headerIndex);
  const lineBreakAfterHeader = afterHeader.indexOf("\n");
  const insertAt = headerIndex + lineBreakAfterHeader + 1;

  const needsExtraNewline = content[insertAt] !== "\n";
  const prefix = needsExtraNewline ? "\n" : "";
  const updated = `${content.slice(0, insertAt)}${prefix}${entry}\n${content.slice(insertAt)}`;
  fs.writeFileSync(logPath, updated, "utf8");
}

function main() {
  const { message, skipHealth } = parseArgs();
  const initialChanges = getChangedFiles();

  if (initialChanges.length === 0) {
    console.log("ship: no changes to commit.");
    return;
  }

  const branch = getCurrentBranch();

  if (!skipHealth) {
    console.log("ship: running health check...");
    const health = run("npm", ["run", "health:check"], true);
    if (!health.ok) fail("health check failed");
  } else {
    console.log("ship: skipping health check (--skip-health).");
  }

  updateDevelopmentLog(message, branch, initialChanges);

  if (!run("git", ["add", "-A"], true).ok) fail("git add failed");
  if (!run("git", ["commit", "-m", message], true).ok) fail("git commit failed");
  if (!run("git", ["push", "origin", branch], true).ok) fail("git push failed");

  console.log("ship: success.");
}

main();

