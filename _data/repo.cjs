const { execSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { DateTime } = require("luxon");

function tryExec(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

function uniq(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function parseShortlogAuthors() {
  const out = tryExec("git shortlog -sne --all --no-merges");
  if (!out) return [];
  return uniq(
    out
      .split("\n")
      .map((line) => line.replace(/^\s*\d+\s+/, "").trim())
      .filter(Boolean),
  );
}

function parseCoAuthors() {
  const out = tryExec("git log --format=%B --no-merges");
  if (!out) return [];
  const matches = out.match(/^Co-authored-by:\s*(.+)$/gim) || [];
  return uniq(matches.map((m) => m.replace(/^Co-authored-by:\s*/i, "").trim()));
}

function parseGithubEventTimestamp() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return null;
  try {
    const data = JSON.parse(readFileSync(eventPath, "utf8"));
    const candidates = [];
    if (typeof data?.head_commit?.timestamp === "string") candidates.push(data.head_commit.timestamp);
    if (typeof data?.repository?.pushed_at === "number") candidates.push(DateTime.fromSeconds(data.repository.pushed_at, { zone: "utc" }).toISO());
    if (typeof data?.workflow_run?.updated_at === "string") candidates.push(data.workflow_run.updated_at);
    if (typeof data?.workflow_run?.run_started_at === "string") candidates.push(data.workflow_run.run_started_at);
    const best = candidates
      .map((c) => DateTime.fromISO(c, { zone: "utc" }))
      .filter((dt) => dt.isValid)
      .sort((a, b) => b.toMillis() - a.toMillis())[0];
    return best ? best.toISO() : null;
  } catch {
    return null;
  }
}

function maxIsoDate(isoDates) {
  const best = isoDates
    .filter(Boolean)
    .map((iso) => DateTime.fromISO(iso, { zone: "utc" }))
    .filter((dt) => dt.isValid)
    .sort((a, b) => b.toMillis() - a.toMillis())[0];
  return best ? best.toISO() : null;
}

module.exports = () => {
  // Ensure git commands run from this project root even if cwd differs.
  process.chdir(path.join(__dirname, ".."));

  const authors = parseShortlogAuthors();
  const coAuthors = parseCoAuthors();
  const contributors = uniq([...authors, ...coAuthors]);

  const lastCommitIso = tryExec("git log -1 --format=%cI");
  const githubEventIso = parseGithubEventTimestamp();
  const githubActionIso = process.env.GITHUB_ACTIONS ? DateTime.utc().toISO() : null;

  return {
    team: {
      authors,
      coAuthors,
      contributors,
    },
    lastUpdatedIso: maxIsoDate([githubActionIso, githubEventIso, lastCommitIso]),
  };
};

