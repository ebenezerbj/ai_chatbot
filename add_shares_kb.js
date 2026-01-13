const fs = require('fs');
const path = require('path');

const kbPath = path.join(__dirname, 'data', 'kb.json');

// New KB entries for shares
const newEntries = [
  {
    "id": "shares_requirements",
    "product": "Shares",
    "patterns": [
      "shares",
      "shareholder",
      "become.*shareholder",
      "buy.*shares",
      "purchase.*shares",
      "invest.*shares",
      "how.*become.*shareholder",
      "minimum.*shares",
      "share.*price",
      "price.*per.*share",
      "how.*much.*shares",
      "cost.*of.*shares"
    ],
    "answer": "Become a Shareholder at Amantin and Kasei Community Bank\n\nTo be a shareholder at AKCB, here are the key details:\n\n**Minimum Investment:**\n- Minimum shares required: GHS 100\n\n**Share Price:**\n- Price per share: GHS 0.50 (50 pesewas)\n\n**What This Means:**\n- With GHS 100, you can purchase 200 shares (GHS 100 ÷ GHS 0.50)\n- You become a part-owner of the bank\n- You receive dividends based on the bank's performance\n- You can participate in Annual General Meetings (AGM)\n- You have voting rights on key decisions\n\n**Benefits of Being a Shareholder:**\n- Earn annual dividends from bank profits\n- Capital appreciation as share value increases\n- Participate in bank governance\n- Support local community banking\n- Potential for share price growth\n\nWould you like to know more about how to purchase shares or start your investment journey with AKCB?"
  },
  {
    "id": "shares_how_to_buy",
    "product": "Shares",
    "patterns": [
      "how.*buy.*shares",
      "how.*purchase.*shares",
      "process.*buying.*shares",
      "steps.*buy.*shares",
      "how.*invest.*shares",
      "where.*buy.*shares"
    ],
    "answer": "How to Buy Shares at AKCB\n\nFollow these simple steps to become a shareholder:\n\n**Step 1: Visit Any AKCB Branch**\n- Bring your valid Ghana Card (national ID)\n- Bring passport-sized photographs\n\n**Step 2: Complete Share Application Form**\n- Fill out the shareholder registration form\n- Specify the number of shares you want to purchase\n\n**Step 3: Make Payment**\n- Minimum: GHS 100 (200 shares)\n- Pay via cash, cheque, or bank transfer\n- Collect your payment receipt\n\n**Step 4: Receive Share Certificate**\n- Your share certificate will be issued\n- You'll be registered in the bank's share register\n- You become an official shareholder!\n\n**Remember:**\n- Share price: GHS 0.50 per share\n- Minimum investment: GHS 100\n- Additional shares can be purchased anytime\n\nWould you like directions to the nearest branch or more information about shareholding benefits?"
  },
  {
    "id": "shares_dividends",
    "product": "Shares",
    "patterns": [
      "share.*dividend",
      "dividend.*share",
      "how.*much.*dividend",
      "when.*dividend",
      "dividend.*payment",
      "return.*on.*shares",
      "profit.*from.*shares"
    ],
    "answer": "Dividends for AKCB Shareholders\n\nAs a shareholder, you earn dividends based on the bank's annual performance:\n\n**Recent Dividend Information:**\n- For 2024: GHS 0.37 per share proposed\n- Total dividend pool: GHS 1,491,184.40\n- Subject to Bank of Ghana approval\n\n**How Dividends Work:**\n- Declared annually after financial year-end\n- Based on bank's profitability\n- Paid to all registered shareholders\n- Proportional to number of shares owned\n\n**Example Calculation:**\nIf you own 200 shares (minimum GHS 100 investment):\n- At GHS 0.37 per share\n- Your dividend = 200 × GHS 0.37 = GHS 74\n\n**Dividend Payment:**\n- Announced at Annual General Meeting (AGM)\n- Requires Bank of Ghana approval\n- Paid directly to shareholders\n- Option to reinvest dividends into more shares\n\nNote: Dividends vary based on annual bank performance and are not guaranteed.\n\nWould you like to know more about becoming a shareholder?"
  }
];

// Read existing KB
let kb;
try {
  const data = fs.readFileSync(kbPath, 'utf8');
  kb = JSON.parse(data);
} catch (error) {
  console.error('Error reading kb.json:', error);
  process.exit(1);
}

// Check if entries already exist
const existingIds = kb.map(entry => entry.id);
const entriesToAdd = newEntries.filter(entry => !existingIds.includes(entry.id));

if (entriesToAdd.length === 0) {
  console.log('All shares entries already exist in the knowledge base.');
  process.exit(0);
}

// Add new entries
kb.push(...entriesToAdd);

// Write back to kb.json
try {
  fs.writeFileSync(kbPath, JSON.stringify(kb, null, 2), 'utf8');
  console.log(`Successfully added ${entriesToAdd.length} new shares entries to the knowledge base!`);
  entriesToAdd.forEach(entry => {
    console.log(`- ${entry.id}`);
  });
} catch (error) {
  console.error('Error writing to kb.json:', error);
  process.exit(1);
}
