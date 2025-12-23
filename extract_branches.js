// Extract branch names and codes from KB
const fs = require('fs');
const path = require('path');

const kbPath = path.join(__dirname, 'data', 'kb.json');
const kb = JSON.parse(fs.readFileSync(kbPath, 'utf8'));

const branchEntry = kb.find(entry => entry.id === 'branches');
if (!branchEntry) {
  console.log('Branch entry not found');
  process.exit(1);
}

// Parse branches from the answer text
const answer = branchEntry.answer;
const branchRegex = /\*\*(.+?)\*\*\s*\(([A-Z0-9]+)\)/g;
const branches = [];

let match;
while ((match = branchRegex.exec(answer)) !== null) {
  branches.push({
    name: match[1].trim(),
    code: match[2].trim()
  });
}

console.log('Branches found:', branches.length);
console.log(JSON.stringify(branches, null, 2));
