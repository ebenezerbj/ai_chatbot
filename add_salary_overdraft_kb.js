const fs = require('fs');
const path = require('path');

const kbPath = path.join(__dirname, 'data', 'kb.json');

// New KB entries for salary overdraft
const newEntries = [
  {
    "id": "salary_overdraft_overview",
    "product": "Salary Overdraft",
    "patterns": [
      "salary.*overdraft",
      "overdraft.*salary",
      "what.*salary.*overdraft",
      "tell.*about.*salary.*overdraft",
      "salary.*based.*overdraft",
      "overdraft.*for.*salary.*workers"
    ],
    "answer": "Salary Overdraft Facility\n\nAmantin and Kasei Community Bank offers salary overdraft facilities exclusively for salary workers. This allows you to access funds up to 3 times your monthly net salary with flexible repayment terms.\n\nKey Features:\n- Maximum overdraft: 3x your monthly net salary\n- Repayment period: 1-6 months\n- Competitive interest rates\n- Quick approval process (24 hours)\n- Automatic salary deduction for repayment\n- Available to permanent and contract employees\n\nTo apply, you'll need:\n- Valid Ghana Card (national ID)\n- Active salary account with AKCB\n- Employment confirmation letter\n- Recent payslips (last 3 months)\n- Employer consent for salary deduction\n\nWould you like to apply for a salary overdraft now?"
  },
  {
    "id": "salary_overdraft_requirements",
    "product": "Salary Overdraft",
    "patterns": [
      "salary.*overdraft.*(require|document|need|eligib)",
      "(require|document|need|eligib).*salary.*overdraft",
      "what.*need.*salary.*overdraft",
      "how.*apply.*salary.*overdraft"
    ],
    "answer": "Salary Overdraft Requirements:\n\n1. **Personal Documents:**\n   - Valid Ghana Card (national ID)\n   - Recent passport-sized photographs\n\n2. **Employment Documents:**\n   - Employment confirmation letter from employer\n   - Recent payslips (last 3 months)\n   - Employer's consent for salary deduction\n\n3. **Banking Requirements:**\n   - Active salary account with AKCB\n   - Account must receive regular salary payments\n   - Good account standing (no overdues)\n\n4. **Eligibility:**\n   - Must be a salary worker (permanent or contract)\n   - Minimum 6 months employment with current employer\n   - Net monthly salary of at least GHS 500\n\nReady to apply? I can help you submit your application right now!"
  },
  {
    "id": "salary_overdraft_amount",
    "product": "Salary Overdraft",
    "patterns": [
      "how.*much.*salary.*overdraft",
      "maximum.*salary.*overdraft",
      "salary.*overdraft.*amount",
      "how.*much.*can.*borrow.*salary",
      "overdraft.*limit.*salary"
    ],
    "answer": "Salary Overdraft Amount:\n\nMaximum overdraft limit: **3 times your monthly net salary**\n\nFor example:\n- Monthly salary GHS 1,000 → Maximum overdraft GHS 3,000\n- Monthly salary GHS 2,000 → Maximum overdraft GHS 6,000\n- Monthly salary GHS 3,500 → Maximum overdraft GHS 10,500\n\nThe approved amount will be automatically calculated based on your net monthly salary and repayment capacity.\n\nRepayment is done through automatic monthly deductions from your salary account over 1-6 months, depending on your choice.\n\nWould you like to check how much you qualify for? I can help you apply now!"
  },
  {
    "id": "salary_overdraft_repayment",
    "product": "Salary Overdraft",
    "patterns": [
      "salary.*overdraft.*repay",
      "how.*repay.*salary.*overdraft",
      "salary.*overdraft.*payment",
      "salary.*overdraft.*tenor",
      "how.*long.*salary.*overdraft"
    ],
    "answer": "Salary Overdraft Repayment:\n\n**Repayment Period:** 1-6 months (you choose)\n\n**Repayment Method:** Automatic deduction from your salary account\n- Deductions are made automatically when your salary is credited\n- No need to remember payment dates\n- No additional charges for early repayment\n\n**Monthly Repayment Calculation:**\nMonthly payment = (Approved Amount ÷ Number of Months) + Interest\n\nExample:\n- Overdraft: GHS 3,000\n- Repayment period: 3 months\n- Monthly deduction: Approximately GHS 1,000 + interest\n\nThe exact monthly repayment amount will be calculated and shown when you apply.\n\nReady to apply? Let me help you get started!"
  },
  {
    "id": "salary_overdraft_vs_loan",
    "product": "Salary Overdraft",
    "patterns": [
      "difference.*salary.*overdraft.*loan",
      "salary.*overdraft.*vs.*loan",
      "overdraft.*or.*loan",
      "should.*overdraft.*or.*loan",
      "better.*overdraft.*loan"
    ],
    "answer": "Salary Overdraft vs. Regular Loan:\n\n**Salary Overdraft:**\n- Quick approval (24 hours)\n- Short term (1-6 months)\n- Maximum 3x monthly salary\n- Automatic salary deduction\n- Minimal documentation\n- Best for: Emergency needs, short-term expenses\n\n**Regular Salary Loan:**\n- Takes 3-5 days to process\n- Longer term (up to 36 months)\n- Higher loan amounts available\n- Manual repayment or standing order\n- More documentation required\n- Best for: Major purchases, long-term needs\n\nBoth options are available for salary workers. Choose based on your need:\n- Need cash quickly? → Salary Overdraft\n- Need larger amount/longer repayment? → Salary Loan\n\nWhich option interests you?"
  },
  {
    "id": "salary_overdraft_apply",
    "product": "Salary Overdraft",
    "patterns": [
      "apply.*salary.*overdraft",
      "request.*salary.*overdraft",
      "get.*salary.*overdraft",
      "i.*want.*salary.*overdraft",
      "need.*salary.*overdraft",
      "start.*salary.*overdraft.*application"
    ],
    "answer": "Great! I can help you apply for a salary overdraft right now.\n\nI'll need the following information:\n- Your full name and contact details\n- National ID number\n- Account number\n- Employer details and position\n- Net monthly salary\n- Requested overdraft amount\n- Preferred repayment period (1-6 months)\n\nThe system will automatically calculate your approved amount (maximum 3x your monthly salary) and monthly repayment.\n\nShall I open the application form for you?"
  },
  {
    "id": "salary_overdraft_processing_time",
    "product": "Salary Overdraft",
    "patterns": [
      "how.*long.*salary.*overdraft",
      "salary.*overdraft.*processing.*time",
      "when.*get.*salary.*overdraft",
      "salary.*overdraft.*approval.*time"
    ],
    "answer": "Salary Overdraft Processing Time:\n\n**Application to Approval:** 24 hours (1 business day)\n**Approval to Disbursement:** Within 24 hours\n\n**Total Time:** Most applications are completed within 48 hours\n\nOur team will:\n1. Review your application within 24 hours\n2. Verify employment details with your employer\n3. Credit the approved amount to your account\n4. Send you SMS confirmation with repayment schedule\n\nFor faster processing, ensure:\n- All required documents are provided\n- Your employer information is accurate\n- Your salary account is active and in good standing\n\nReady to apply? The process only takes a few minutes!"
  }
];

try {
  // Read existing KB
  const kbData = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
  
  // Check if entries already exist
  const existingIds = new Set(kbData.map(entry => entry.id));
  const entriesToAdd = newEntries.filter(entry => !existingIds.has(entry.id));
  
  if (entriesToAdd.length === 0) {
    console.log('✓ All salary overdraft entries already exist in knowledge base');
    process.exit(0);
  }
  
  // Add new entries
  kbData.push(...entriesToAdd);
  
  // Write back to file
  fs.writeFileSync(kbPath, JSON.stringify(kbData, null, 2), 'utf8');
  
  console.log(`✓ Added ${entriesToAdd.length} new salary overdraft entries to knowledge base`);
  console.log(`✓ Total KB entries: ${kbData.length}`);
  console.log('\nNew entries added:');
  entriesToAdd.forEach(entry => console.log(`  - ${entry.id}`));
  
} catch (error) {
  console.error('✗ Error updating knowledge base:', error.message);
  process.exit(1);
}
