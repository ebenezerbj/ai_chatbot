const fs = require('fs');
const csv = require('csv-parser');

const branches = new Set();

fs.createReadStream('Accounts.csv')
  .pipe(csv())
  .on('data', (row) => {
    const branch = row['Account Branch'];
    if (branch && branch.trim()) {
      branches.add(branch.trim());
    }
  })
  .on('end', () => {
    console.log('Unique Branches:');
    console.log('================');
    Array.from(branches).sort().forEach(b => console.log(b));
    console.log(`\nTotal: ${branches.size} branches`);
  });
