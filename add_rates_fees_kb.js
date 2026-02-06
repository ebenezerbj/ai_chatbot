const fs = require('fs');
const path = require('path');

const kbPath = path.join(__dirname, 'data', 'kb.json');

// New KB entries for interest rates and fees
const newEntries = [
  {
    "id": "savings_interest_rates",
    "product": "Savings Interest",
    "patterns": [
      "savings.*interest",
      "interest.*savings",
      "interest.*rate.*savings",
      "ordinary.*savings.*interest",
      "how.*much.*interest.*savings",
      "savings.*account.*interest",
      "what.*interest.*savings"
    ],
    "answer": "Interest on Ordinary Savings Account\n\nACKB offers competitive interest rates on savings accounts:\n\n**Interest Rate:** 4% per annum\n**Minimum Balance Required:** GHS 500\n\nThis means you need to maintain a minimum balance of GHS 500 in your ordinary savings account to earn 4% annual interest.\n\nFor higher returns, consider our Fixed Deposit accounts with rates up to 10% per annum.\n\nWould you like to know more about our Fixed Deposit options or other savings products?"
  },
  {
    "id": "fixed_deposit_rates",
    "product": "Fixed Deposit",
    "patterns": [
      "fixed.*deposit",
      "fixed.*deposit.*rate",
      "fixed.*deposit.*interest",
      "fd.*rate",
      "time.*deposit",
      "fixed.*deposit.*terms",
      "how.*much.*fixed.*deposit"
    ],
    "answer": "Fixed Deposit Interest Rates\n\nACKB offers attractive Fixed Deposit rates with flexible terms:\n\n**Minimum Investment:** GHS 2,000\n\n**Interest Rates by Term:**\n• 3 months - 7% per annum\n• 6 months - 8% per annum\n• 9 months - 9% per annum\n• 12 months - 10% per annum\n\n**Special Rates:**\nFor deposits above GHS 100,000, interest rates are negotiable - contact us for personalized rates!\n\n**Benefits:**\n✓ Higher returns than regular savings\n✓ Safe and secure investment\n✓ Flexible terms to suit your needs\n✓ Interest paid at maturity or periodically\n\nVisit any branch or call +233 24 231 2059 to open your Fixed Deposit account today!"
  },
  {
    "id": "loan_interest_rates",
    "product": "Loan Interest Rates",
    "patterns": [
      "loan.*interest",
      "interest.*loan",
      "loan.*rate",
      "how.*much.*interest.*loan",
      "loan.*charges",
      "borrowing.*rate"
    ],
    "answer": "Loan Interest Rates at AKCB\n\nWe offer various loan products with competitive interest rates:\n\n**Interest Rates by Loan Type:**\n• Salaried Workers Loan - 27% per annum\n• Trade Loans/Overdraft - 28% per annum\n• Micro Finance - 34% per annum\n• Susu Loans - 34% per annum\n• Overdraft (Workers) - 10% per month\n• Funeral Loan - 12% per month\n• Agriculture & Inventory - 34% per annum\n\n**Additional Charges:**\n• Loan insurance: 0.40% on principal amount\n• Processing fees: 3.5% (up to GHS 200,000), 2.5% (above GHS 200,000)\n• Loan form fees vary by type\n\nFor more information or to apply, visit any branch or call +233 24 231 2059."
  },
  {
    "id": "bank_fees_charges",
    "product": "Banking Fees",
    "patterns": [
      "bank.*fees",
      "charges",
      "bank.*charges",
      "service.*charge",
      "ledger.*fee",
      "cot.*charge",
      "account.*maintenance",
      "how.*much.*charge"
    ],
    "answer": "AKCB Banking Fees and Charges\n\n**Account Fees:**\n• Ledger fees (COT) for salaried accounts - GHS 20 per month\n• Passbooks - GHS 20\n\n**Loan Forms:**\n• Salaried loan form - GHS 20\n• Normal loan form - GHS 20\n• Micro finance loan form - GHS 10 per member\n• Overdraft forms (salaried workers) - GHS 1\n\n**Transaction Fees:**\n• Counter cheque - GHS 5\n• Withdrawal form - GHS 3\n• Cheque clearing fee - Minimum GHS 20, Maximum GHS 50\n\n**Processing Fees:**\n• Up to GHS 200,000 - 3.5%\n• Above GHS 200,000 - 2.5%\n\n**Payment Orders:**\nMinimum amount is GHS 10 per leaflet\n\nFor detailed information on specific fees, visit any branch or contact us at +233 24 231 2059."
  },
  {
    "id": "special_savings_products",
    "product": "Special Savings",
    "patterns": [
      "sala.*savings",
      "christmas.*savings",
      "woba.*daakye",
      "special.*savings",
      "seasonal.*savings"
    ],
    "answer": "Special Savings Products at AKCB\n\nWe offer special savings accounts to help you plan for the future:\n\n**1. SALA/Christmas Savings**\n• Interest Rate: 4% per annum\n• Minimum Balance: GHS 200\n• Perfect for saving towards year-end expenses\n• Structured withdrawals for holiday spending\n\n**2. WOBA DAAKYE Savings**\n• Interest Rate: 4% per annum\n• Minimum Balance: GHS 200\n• Long-term savings plan\n• Build your future systematically\n\n**Benefits:**\n✓ Disciplined savings approach\n✓ Competitive interest rates\n✓ Flexible contribution options\n✓ Helps achieve specific financial goals\n\nVisit any branch to open your special savings account or call +233 24 231 2059 for more information!"
  },
  {
    "id": "salaried_worker_overdraft",
    "product": "Overdraft",
    "patterns": [
      "overdraft.*interest",
      "overdraft.*rate",
      "od.*charge",
      "overdraft.*fee",
      "worker.*overdraft"
    ],
    "answer": "Overdraft Facility for Salaried Workers\n\n**Interest Rate:** 10% per month\n**Application Fee:** GHS 1\n\n**Who Qualifies:**\nSalaried workers with accounts at AKCB\n\n**Benefits:**\n✓ Quick access to funds when needed\n✓ Pay only for what you use\n✓ Automatic repayment from salary\n✓ No collateral for salaried workers\n\n**How to Apply:**\n1. Complete overdraft form (GHS 1)\n2. Submit salary details\n3. Get approval within 48 hours\n4. Access funds immediately\n\nNote: Regular overdraft/trade loans have an interest rate of 28% per annum.\n\nVisit any branch or call +233 24 231 2059 to apply for your overdraft facility!"
  },
  {
    "id": "funeral_loan_details",
    "product": "Funeral Loan",
    "patterns": [
      "funeral.*loan",
      "burial.*loan",
      "funeral.*finance",
      "emergency.*funeral"
    ],
    "answer": "Funeral Loan at AKCB\n\n**Interest Rate:** 12% per month\n\n**Purpose:**\nQuick financial assistance for funeral and burial expenses during difficult times.\n\n**Features:**\n✓ Fast approval process\n✓ Minimal documentation\n✓ Emergency processing\n✓ Compassionate service\n\n**Requirements:**\n• Valid AKCB account\n• Proof of funeral/burial needs\n• Identification documents\n\n**Additional Information:**\n• Loan insurance: 0.40% on principal amount\n• Processing time: Within 24 hours for emergencies\n\nFor immediate assistance, visit any branch or call +233 24 231 2059. We're here to support you during difficult times."
  }
];

// Main execution
try {
  // Read existing KB
  let kbData;
  try {
    const data = fs.readFileSync(kbPath, 'utf8');
    kbData = JSON.parse(data);
  } catch (error) {
    console.error('✗ Error reading kb.json:', error.message);
    process.exit(1);
  }
  
  // Check which entries already exist
  const existingIds = new Set(kbData.map(entry => entry.id));
  const entriesToAdd = newEntries.filter(entry => !existingIds.has(entry.id));
  
  if (entriesToAdd.length === 0) {
    console.log('✓ All interest rates and fees entries already exist in knowledge base');
    console.log(`✓ Total KB entries: ${kbData.length}`);
    process.exit(0);
  }
  
  // Add new entries
  kbData.push(...entriesToAdd);
  
  // Write back to file
  fs.writeFileSync(kbPath, JSON.stringify(kbData, null, 2), 'utf8');
  
  console.log(`✓ Added ${entriesToAdd.length} new interest rates/fees entries to knowledge base`);
  console.log(`✓ Total KB entries: ${kbData.length}`);
  console.log('\nNew entries added:');
  entriesToAdd.forEach(entry => console.log(`  - ${entry.id} (${entry.product})`));
  console.log('\n✓ Knowledge base updated successfully!');
  
} catch (error) {
  console.error('✗ Error updating knowledge base:', error.message);
  process.exit(1);
}
