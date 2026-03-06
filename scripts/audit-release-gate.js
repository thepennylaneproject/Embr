#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const findingsPath = path.join(root, 'audits', 'open_findings.json');
const indexPath = path.join(root, 'audits', 'index.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function toMillis(value) {
  const millis = Date.parse(value);
  return Number.isNaN(millis) ? null : millis;
}

function latestRunId(index) {
  const runs = Array.isArray(index.runs) ? index.runs : [];
  if (runs.length === 0) return null;
  return runs[runs.length - 1].run_id || null;
}

const findings = readJson(findingsPath);
const index = readJson(indexPath);

const activeRunId = findings.last_run_id;
const latestRun = latestRunId(index);

if (!activeRunId || !latestRun) {
  console.error('Release gate failed: missing run metadata.');
  process.exit(1);
}

if (activeRunId !== latestRun) {
  console.error(
    `Release gate failed: open_findings last_run_id (${activeRunId}) does not match latest index run (${latestRun}).`
  );
  process.exit(1);
}

const cycleStartRaw = process.env.AUDIT_CYCLE_START || findings.last_updated;
const cycleStart = toMillis(cycleStartRaw);
if (cycleStart === null) {
  console.error(`Release gate failed: invalid AUDIT_CYCLE_START timestamp "${cycleStartRaw}".`);
  process.exit(1);
}

const newlyOpenBlockers = (findings.findings || []).filter((finding) => {
  if (finding.severity !== 'blocker' || finding.status !== 'open') return false;
  const history = Array.isArray(finding.history) ? finding.history : [];
  return history.some((entry) => {
    if (!entry || !entry.timestamp) return false;
    const ts = toMillis(entry.timestamp);
    return ts !== null && ts >= cycleStart && entry.event === 'created';
  });
});

if (newlyOpenBlockers.length > 0) {
  console.error('Release gate failed: newly introduced open blockers in this cycle:');
  newlyOpenBlockers.forEach((finding) => {
    console.error(`- ${finding.finding_id}: ${finding.title}`);
  });
  process.exit(1);
}

console.log('Release gate passed.');
console.log(`last_run_id: ${activeRunId}`);
console.log(`cycle_start: ${cycleStartRaw}`);
console.log(`newly_open_blockers: ${newlyOpenBlockers.length}`);
