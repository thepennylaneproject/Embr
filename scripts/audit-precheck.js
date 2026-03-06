#!/usr/bin/env node

const { execSync } = require('child_process');

function run(command) {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function getBaselineCommit() {
  const explicitBase = process.env.AUDIT_BASE_REF;
  if (explicitBase) {
    return explicitBase;
  }

  try {
    const commit = run('git log -n 1 --format=%H -- audits/runs');
    if (commit) {
      return commit;
    }
  } catch (_error) {
    // Fall through to default.
  }

  return 'HEAD~1';
}

function getChangedFiles(baseRef) {
  try {
    const output = run(`git diff --name-only ${baseRef}..HEAD`);
    if (!output) return [];
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch (error) {
    console.error(`Failed to diff against base ref "${baseRef}": ${error.message}`);
    process.exit(1);
  }
}

const QUALIFYING_PREFIXES = [
  'apps/',
  'docker/',
  '.github/workflows/',
];

const QUALIFYING_FILES = new Set([
  'README.md',
  'package.json',
  'apps/api/.env.example',
  'apps/web/.env.example',
  '.env.example',
]);

function isQualifyingChange(file) {
  if (QUALIFYING_FILES.has(file)) return true;
  return QUALIFYING_PREFIXES.some((prefix) => file.startsWith(prefix));
}

const baseline = getBaselineCommit();
const changedFiles = getChangedFiles(baseline);
const qualifyingChanges = changedFiles.filter(isQualifyingChange);
const nonAuditChanges = changedFiles.filter((file) => !file.startsWith('audits/'));

console.log(`Audit precheck baseline: ${baseline}`);
console.log(`Changed files: ${changedFiles.length}`);
console.log(`Qualifying files: ${qualifyingChanges.length}`);

if (changedFiles.length === 0) {
  console.log('No changes since baseline. Skip full audit.');
  process.exit(2);
}

if (qualifyingChanges.length === 0) {
  if (nonAuditChanges.length === 0) {
    console.log('Only audits/* artifacts changed. Skip full audit and record artifact-only delta.');
  } else {
    console.log('No qualifying runtime/deploy changes detected for full audit.');
    console.log('Non-audit changed files:');
    nonAuditChanges.forEach((file) => console.log(`- ${file}`));
  }
  process.exit(2);
}

console.log('Qualifying changes found. Full audit is allowed.');
qualifyingChanges.forEach((file) => console.log(`- ${file}`));
process.exit(0);
