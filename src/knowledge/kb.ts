// Simple product knowledge base for demo purposes only.
// In production, replace with a CMS, search index, or RAG pipeline.

export type KBEntry = {
  id: string;
  product:
    | 'Checking'
    | 'Savings'
    | 'Credit Card'
    | 'Personal Loan'
    | 'Mortgage'
    | 'Support'
  | 'Hours'
    | 'Deposit'
    | 'Loan'
    | 'Smart Banking'
    | 'Investment'
    | 'Branch'
    | 'Contact';
  questionPatterns: RegExp[];
  answer: string;
};
let currentKB: KBEntry[] = [
  {
    id: 'checking-fees',
    product: 'Checking',
    questionPatterns: [/checking.*fee/i, /monthly.*fee/i, /account.*fee/i],
    answer:
      'Our Standard Checking has a $10 monthly service fee, waived with direct deposits totaling $500+/month or a $1,500+ daily balance. ATM withdrawals at our network are free; non-network ATMs may charge fees set by the operator.'
  },
  {
    id: 'savings-apr',
    product: 'Savings',
    questionPatterns: [
      /savings.*(interest|apy|rate)/i, 
      /savings.*rate/i, 
      /(interest|apy).*savings/i,
      /tell.*about.*savings/i,
      /savings.*account/i,
      /what.*savings/i
    ],
    answer:
      'Our Online Savings currently offers a variable APY that may change at any time. Rates vary by balance tier. For the latest APY, please see our rates page or contact us. Interest compounds daily and is credited monthly.'
  },
  {
    id: 'creditcard-rewards',
    product: 'Credit Card',
    questionPatterns: [/credit card.*reward|cash back|points/i],
    answer:
      'Our CashBack Card earns 1.5% on everyday purchases, plus rotating 3% categories. Rewards don’t expire while your account remains open and in good standing. Terms apply.'
  },
  {
    id: 'loan-eligibility',
    product: 'Personal Loan',
    questionPatterns: [/personal loan.*eligibility|qualify|requirements/i],
    answer:
      'Eligibility considers credit history, income, and existing obligations. We offer fixed-rate loans with terms from 12–60 months. Checking your rate online won’t impact your credit score. Approval is not guaranteed.'
  },
  {
    id: 'mortgage-preapproval',
    product: 'Mortgage',
    questionPatterns: [/mortgage.*pre.?approval/i],
    answer:
      'A pre-approval provides an estimate of how much you may be able to borrow. It typically requires income, assets, and credit review. Pre-approval letters are usually valid for 60–90 days.'
  },
  {
    id: 'support-contacts',
    product: 'Support',
    questionPatterns: [/contact|support|phone|chat|hours/i],
    answer:
      'You can reach our support 24/7 via secure chat in the mobile app or by phone at 1‑800‑000‑0000. For account-specific help, please log in to your online banking and use secure messaging.'
  }
  ,
  // — Bank-specific entries extracted from page.html —
  {
    id: 'contact-details',
    product: 'Contact',
    questionPatterns: [/contact|phone|call|email|reach/i],
    answer:
      'Contact us: phone 0202055171, email info@amankacombank.com. For account-specific help, please use secure channels.'
  },
  {
    id: 'business-hours',
  product: 'Hours',
    questionPatterns: [/hours|open|opening|closing|time/i],
    answer:
      'Branch business hours: Mon–Fri 8:00AM–4:00PM.'
  },
  {
    id: 'main-address',
    product: 'Contact',
    questionPatterns: [/address|location|gps|where.*located|locator/i],
    answer:
      'Head office location: AMANTIN, BONO EAST. GPS: BA-08182-6721.'
  },
  {
    id: 'branches-list',
    product: 'Branch',
    questionPatterns: [/branches|branch|locations|where.*branch|nearest.*branch/i],
    answer:
      'Branches: Amantin, Atebubu, Kajaji, Yeji, Ejura, Ahwiaa (Kumasi), Kwame Danso, Kejetia (Kumasi).'
  },
  {
    id: 'deposit-services',
    product: 'Deposit',
    questionPatterns: [/deposit services|types of accounts|account.*types|current account|salary account|susu account/i],
    answer:
      'Deposit services include: Current Account, Salary Account, Savings Account, and Susu Account.'
  },
  {
    id: 'loan-products',
    product: 'Loan',
    questionPatterns: [/loan|loans|credit.*(options|products)|agric|business loan|cottage loan|funeral loan|group loan/i],
    answer:
      'Loan options include: Agric Loan, Business Loans, Cottage Loans, Funeral Loans, and Group Loans.'
  },
  {
    id: 'smart-banking-services',
    product: 'Smart Banking',
  questionPatterns: [/smart banking|atm|gh-?link|e\W?zwich|ezwich|apex transfer|inter\s?bank|ach|interoperability/i],
    answer:
      'Smart Banking: GH‑Link ATM Services, Apex Transfers (Rural Bank ↔ Rural Bank), E‑zwich Services, Inter‑Bank Transfers (ACH), and Interoperability Services.'
  },
  {
    id: 'investment-products',
    product: 'Investment',
    questionPatterns: [/investment|fixed deposit|christmas account|sala account|woba daakye/i],
    answer:
      'Investment products include: Fixed Deposit, Christmas Account, Sala Account, and Woba Daakye.'
  }
];

export function retrieveKB(query: string): KBEntry[] {
  const matches: KBEntry[] = [];
  for (const entry of currentKB) {
    if (entry.questionPatterns.some((re) => re.test(query))) {
      matches.push(entry);
    }
  }
  if (matches.length > 0) {
    return matches.slice(0, 6);
  }

  // Fuzzy fallback: conservative approximate matching for common misspellings
  // Goals:
  // - Recover near-misses like "laon"->loan, "maneger"->manager, "ahwia"->ahwiaa
  // - Avoid matching unrelated queries (e.g., jokes), so keep thresholds strict
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-z0-9\s]/g, ' ') // keep alphanum
      .replace(/\s+/g, ' ') // collapse spaces
      .trim();

  const qNorm = norm(query);
  if (!qNorm) return [];
  const qTokens = qNorm.split(' ').filter(Boolean);

  // Simple Levenshtein distance (placed early for use by anchors gate)
  const lev = (a: string, b: string) => {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = i - 1;
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(
          dp[j] + 1,
          dp[j - 1] + 1,
          prev + cost
        );
        prev = temp;
      }
    }
    return dp[n];
  };

  // Require at least one domain anchor approximately present in the query to enable fuzzy
  const anchorList = [
    'loan','loans','credit','rate','rates','interest',
    'account','accounts','current','savings','saving','salary','susu','deposit',
    'branch','branches','manager','manageress','officer','charge',
    'contact','phone','email','address','gps','hours','time',
    'investment','invest','smart','atm','ezwich','gh-link','apex','transfer','interbank','ach','ussd','ghana','pay',
    'ceo','management','head','audit','risk','compliance','it','operations','marketing','credit'
  ];
  const hasAnchor = (() => {
    for (const qt of qTokens) {
      for (const a of anchorList) {
        const d = lev(qt, a);
        if ((a.length <= 6 && d <= 1) || (a.length > 6 && d <= 2) || qt === a) return true;
      }
    }
    return false;
  })();
  if (!hasAnchor) return [];

  // (lev definition moved above)

  const cleanupPattern = (src: string) =>
    norm(
      src
        .replace(/\\b/g, ' ')
        .replace(/\(\?:|\(\?=|\(\?!/g, '(')
        .replace(/[\^$.*+?()[\]{}|\\]/g, ' ') // drop regex meta
    );

  type Scored = { entry: KBEntry; score: number };
  const scored: Scored[] = [];

  for (const entry of currentKB) {
    // Candidates: product name and simplified regex sources
    const candStrings: string[] = [entry.product];
    for (const re of entry.questionPatterns) {
      const c = cleanupPattern(re.source);
      if (c && !candStrings.includes(c)) candStrings.push(c);
    }

    // Tokenize candidates
    const candTokens = new Set<string>();
    for (const s of candStrings) {
      for (const t of s.split(' ')) if (t) candTokens.add(t);
    }

    if (candTokens.size === 0) continue;

    // Compute overlap and near-miss counts
    let overlap = 0;
    let near = 0;
    for (const qt of qTokens) {
      if (candTokens.has(qt)) {
        overlap++;
        continue;
      }
      // consider near if within edit distance <=1 for short tokens (<=6), <=2 for longer
      let tokenNear = false;
      for (const ct of candTokens) {
        const d = lev(qt, ct);
        if ((ct.length <= 6 && d <= 1) || (ct.length > 6 && d <= 2)) {
          tokenNear = true;
          break;
        }
      }
      if (tokenNear) near++;
    }

    // Conservative scoring: require at least some anchor tokens
    const score = overlap * 3 + near; // exact matches weigh more
    if (score >= 3) {
      scored.push({ entry, score });
    }
  }

  if (scored.length === 0) return [];
  scored.sort((a, b) => b.score - a.score);
  // Be conservative with fuzzy: cap to top 2 to avoid over-broad matches
  return scored.slice(0, 2).map(s => s.entry);
}

export function getKB(): KBEntry[] {
  return currentKB;
}

export function setKB(entries: KBEntry[]) {
  currentKB = entries;
}

export async function loadKBFromFile(filePath: string) {
  const { readFile } = await import('fs/promises');
  const raw = await readFile(filePath, 'utf-8');
  const data = JSON.parse(raw) as Array<{ id: string; product: KBEntry['product']; patterns: string[]; answer: string }>;
  const loaded: KBEntry[] = data.map((d) => ({
    id: d.id,
    product: d.product,
    questionPatterns: d.patterns.map((p) => new RegExp(p, 'i')),
    answer: d.answer
  }));
  setKB(loaded);
}
