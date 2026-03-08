const fs = require('fs');
const content = fs.readFileSync('apps/api/src/modules/monetization/services/stripe-connect.service.ts', 'utf8');
const lines = content.split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Simple brace counting (ignoring comments/strings for now as a rough check)
  // Ideally should handle strings, but file doesn't have "{" or "}" in strings except simple ones
  // It has `Account updated: ${accountId}` which has { } but balanced.
  // It has `{ requested: true }` etc.
  for (const char of line) {
    if (char === '{') count++;
    if (char === '}') count--;
  }
  if (count < 0) {
    console.log(`Error at line ${i + 1}: count dropped below 0`);
    // continue to find all?
    count = 0; // reset to find next
  }
}
console.log(`Final count: ${count}`);
