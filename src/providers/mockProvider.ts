import { LLMProvider, LLMResponse } from '../core/types';
import { BRANCHES, mapsUrlFromLatLng } from '../geo/branches';

export class MockProvider implements LLMProvider {
  name = 'mock';

  async generate(opts: {
    systemPrompt: string;
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
    temperature?: number | undefined;
    maxTokens?: number | undefined;
  }): Promise<LLMResponse> {
    const userMessage = opts.messages.filter(m => m.role === 'user').pop();
    const userQuery = userMessage?.content ?? '';

    // Pull KB context from any system message appended by ChatService
    const kbSystemMsg = opts.messages.find(
      m => m.role === 'system' && typeof m.content === 'string' && m.content.includes('Institution product info')
    );
    const kbContext = kbSystemMsg?.content ?? '';

    // Latest assistant turn (for interpreting short replies like "yes")
    const lastAssistant = [...opts.messages].reverse().find(m => m.role === 'assistant')?.content ?? '';

  const lower = userQuery.toLowerCase();
  const isSavingsIntent = /(\bsavings?\b|\bsave\b|\bsaver\b)(?!.*loan)/i.test(lower) && !/loan/i.test(lower);
  const isLoanRateQuery = /loan.*(rate|interest|percentage|%)|interest.*rate.*loan|(rate|interest|percentage|%).*loan/i.test(lower);
  const isAffirmative = /^(yes|yeah|yep|sure|please|ok|okay)$/i.test(lower.trim());
  const followsChoice = /features|current rates/i.test(lastAssistant);

  console.log(`[DEBUG MOCK] User query: "${userQuery}"`);
  console.log(`[DEBUG MOCK] KB context present: ${Boolean(kbContext)}`);
  console.log(`[DEBUG MOCK] Savings intent: ${isSavingsIntent}`);
  console.log(`[DEBUG MOCK] Loan rate query: ${isLoanRateQuery}`);

    // If the user is asking for loan rates, find the specific KB entry for it.
    if (isLoanRateQuery && kbContext) {
      const loanRateItem = Array.from(kbContext.matchAll(/\((\d+)\) \[(.+?)\] ([\s\S]*?)(?=\n\(\d+\) \[|$)/g))
        .map(m => ({ product: m[2], answer: m[3] }))
        .find(item => item.product.toLowerCase() === 'loan_rates');

      if (loanRateItem) {
        const loanSubtypeMatch = lower.match(/\b(agric|business|funeral|group|salary|susu|staff|inventory)\b/);
        const loanSubtype = loanSubtypeMatch ? loanSubtypeMatch[0] : null;

        if (loanSubtype) {
          const lines = loanRateItem.answer.split('\\n');
          const rateLine = lines.find(line =>
            line.trim().startsWith('•') &&
            new RegExp(`\\b${loanSubtype}\\b`, 'i').test(line)
          );

          if (rateLine) {
            const cleanedLine = rateLine.trim().replace('• ', '');
            const parts = cleanedLine.split(':');
            if (parts.length >= 2) {
              const loanName = parts[0].trim();
              const rateValue = parts.slice(1).join(':').trim();
              const responseText = `The current interest rate for the ${loanName} is ${rateValue}. Rates are subject to change, so please visit a branch for a personalized quote.`;
              console.log(`[DEBUG MOCK] Returning specific loan rate for ${loanSubtype}`);
              return { text: responseText };
            }
          }
        }
        
        console.log(`[DEBUG MOCK] Returning KB-based response for all loan rates`);
        return { text: loanRateItem.answer };
      }
    }

    // If we have KB context and it looks like a savings-related query, respond using KB
    if (kbContext && isSavingsIntent) {
      const savingsRateItem = Array.from(kbContext.matchAll(/\((\d+)\) \[(.+?)\] ([\s\S]*?)(?=\n\(\d+\) \[|$)/g))
      .map(m => ({ product: m[2], answer: m[3] }))
      .find(item => item.product.toLowerCase() === 'savings_rates');

      if (savingsRateItem) {
        console.log(`[DEBUG MOCK] Returning KB-based response for savings rates`);
        return { text: savingsRateItem.answer };
      }

      // Fallback to generic savings response if specific rate info not found
      console.log(`[DEBUG MOCK] Returning generic KB-based savings response`);
      return {
        text: `We offer a variety of savings accounts to help you grow your money. Would you like details on features or current rates?`
      };
    }

    // Generic KB usage: if KB context is present, parse items and answer accordingly
    if (kbContext) {
  const items = Array.from(kbContext.matchAll(/\((\d+)\) \[(.+?)\] ([\s\S]*?)(?=\n\(\d+\) \[|$)/g)).map((m) => ({
        idx: Number(m[1]),
        product: m[2],
        answer: m[3]
      }));

  const intents = {
        greeting: /^(hi|hello|hey|good morning|good afternoon|good evening)$/i.test(lower.trim()),
  branch: /\b(branch|branches|location|locations)\b/i.test(lower),
  nearestBranch: /\b(nearest|near me|closest|nearby)\b/i.test(lower),
        contact: /\b(contact|phone|call|email|reach|address|gps)\b/i.test(lower),
        deposit: /\b(deposit|current account|salary account|susu|account|accounts)\b/i.test(lower),
  loan: /\b(loan|loans|laon|credit|agric|business loan|funeral loan|group loan|salary loan|susu loan|staff loan|inventory loan)\b/i.test(lower),
        smart: /\b(smart|atm|gh-?link|e\W?zwich|ezwich|apex|inter\s?bank|ach|interoperability)\b/i.test(lower),
        invest: /\b(invest|investment|fixed deposit|christmas account|sala account|woba)\b/i.test(lower),
        hours: /\b(hours|open|opening|closing|time)\b/i.test(lower),
        // Prefer explicit CEO detection so it can be answered concisely
        ceo: /(\bceo\b|chief\s+executive(\s+officer)?)/i.test(lower),
  // Bank history and governance
  history: /(\bhistory\b|\bbackground\b|\borigin\b|when\s+(was\s+)?(founded|established)|\bfounded\b|\bestablished\b|(our\s+story|bank\s+story|company\s+story))/i.test(lower),
  boardChairman: /(board\s*(chair|chairman)|chairman.*board|who.*board.*chair)/i.test(lower),
  // Branch manager queries (list and single)
  branchManagersList: /\b(branch\s*managers|managers\s*list|list\s*of\s*branch\s*managers)\b/i.test(lower) && !/\b(ejura|ahwiaa|kejetia|yeji|kwame\s*danso|amantin|atebubu|kajaji)\b/i.test(lower),
  branchManager: /\b(branch\s*manager|manageress|officer[-\s]?in[-\s]?charge)\b/i.test(lower),
  // Smart banking specific intents
  ussd: /(\*992#|ussd|short\s*code\s*992|code\s*992)/i.test(lower),
  ghanaPay: /(ghana\s*pay|\*707#|short\s*code\s*707|code\s*707)/i.test(lower),
  // Role-specific intents to prefer concise KB entries over generic management lists
  headAudit: /(\bhead\s+of\s+audit\b|\baudit\s+head\b)/i.test(lower),
  headCredit: /(\bhead\s+of\s+credit\b|\bcredit\s+head\b)/i.test(lower),
  headCompliance: /(anti-?money\s?laundering|\baml\b|head.*(risk|compliance)|risk.*compliance)/i.test(lower),
  headIT: /(head.*\bit\b|\bit\s+head\b|head.*information\s*technology)/i.test(lower),
  headAdminHR: /(head.*admin(istration)?|head.*\bhr\b|admin(istration)?\s*&?\s*hr)/i.test(lower),
  headOps: /(head.*operations|operations\s+head)/i.test(lower),
  headMarketing: /(head.*marketing|marketing\s+head|unit\s+head.*marketing)/i.test(lower),
  management: /\b(management|leadership|team|head of|director|who.*runs|senior.*team)\b/i.test(lower),
  fullManagement: /\bfull\s+management\s+team\b/i.test(lower),
        productsAndServices: /products?|services?|offerings?|what do you offer|list of services/i.test(lower),
        requirements: /(require|document|need|eligibil)/i.test(lower)
      } as const;

      console.log('[DEBUG MOCK] Intents:', {
        greeting: intents.greeting,
        branch: intents.branch,
        nearestBranch: intents.nearestBranch,
        branchManagersList: intents.branchManagersList,
        branchManager: intents.branchManager
      });

      // If the user asked about a specific branch location, prefer returning precise coordinates and a Maps link.
      const resolveBranchFromQuery = (): { name: string; lat: number; lng: number; phone?: string } | null => {
        const candidates: Array<{ re: RegExp; id: string }> = [
          { re: /\bejura\b/i, id: 'ejura' },
          { re: /\bahwiaa\b/i, id: 'ahwiaa' },
          { re: /\bkejetia\b/i, id: 'kejetia' },
          { re: /\byeji\b/i, id: 'yeji' },
          { re: /kwame\s*danso/i, id: 'kwame_danso' },
          { re: /\bamantin\b/i, id: 'amantin' },
          { re: /\batebubu\b/i, id: 'atebubu' },
          { re: /\bkajaji\b/i, id: 'kajaji' }
        ];
        const hit = candidates.find(c => c.re.test(lower));
        if (!hit) return null;
        const b = BRANCHES.find(x => x.id === hit.id);
        if (!b) return null;
        return { name: b.name, lat: b.lat, lng: b.lng, phone: b.phone };
      };

      // Handle greetings
      if (intents.greeting) {
        console.log(`[DEBUG MOCK] Returning greeting response`);
        return { text: "Hello! I'm your financial assistant. I can help with questions about our products, services, and more. How can I assist you today?" };
      }

      const pickAllByProduct = (name: string) => items.filter((i) => i.product.toLowerCase() === name.toLowerCase());
      const pickByProduct = (name: string) => pickAllByProduct(name)[0];

      // Special handling: if user asks for requirements/documents, prefer requirement-specific entries
      if (intents.requirements) {
        // Loan requirement subtypes
        const loanSubtype = (
          /agric/.test(lower) ? 'agric' :
          /business/.test(lower) ? 'business' :
          /funeral/.test(lower) ? 'funeral' :
          /group/.test(lower) ? 'group' :
          /salary/.test(lower) ? 'salary' :
          /susu/.test(lower) ? 'susu' :
          /staff/.test(lower) ? 'staff' :
          /inventory/.test(lower) ? 'inventory' :
          null
        );
        const loanItems = pickAllByProduct('Loan');
        const preferLoan = () => {
          if (!loanItems.length) return undefined;
          if (loanSubtype) {
            const sub = loanItems.find(i => i.answer.toLowerCase().startsWith(`${loanSubtype} loan`));
            if (sub) return sub;
          }
          // fallback: any loan item that looks like a requirements checklist
          return loanItems.find(i => /requirements|opening requirements|\n- /.test(i.answer)) || loanItems[0];
        };

        // Account opening requirement subtypes
        const acctSubtype = (
          /current/.test(lower) ? 'current' :
          /salary/.test(lower) ? 'salary' :
          /savings?/.test(lower) ? 'savings' :
          /susu/.test(lower) ? 'susu' :
          null
        );
        const depItems = pickAllByProduct('Deposit');
        const preferDeposit = () => {
          if (!depItems.length) return undefined;
          if (acctSubtype) {
            const label = acctSubtype === 'savings' ? 'Savings Account' : acctSubtype === 'susu' ? 'Susu Account' : acctSubtype === 'salary' ? 'Salary Account' : 'Current Account';
            const sub = depItems.find(i => i.answer.toLowerCase().startsWith(`${label.toLowerCase()} – opening requirements`));
            if (sub) return sub;
          }
          return depItems.find(i => /opening requirements|\n- /.test(i.answer)) || depItems[0];
        };

        const priority = intents.loan ? preferLoan() : intents.deposit ? preferDeposit() : preferLoan() || preferDeposit();
        if (priority) {
          console.log(`[DEBUG MOCK] Returning requirement-focused KB response for product: ${priority.product}`);
          return { text: priority.answer };
        }
      }

      // Generic selection fallback
      const pickUssd = () => items.find(i => /\*992#|\bussd\b/i.test(i.answer));
      const pickGhanaPay = () => items.find(i => /ghana\s*pay|\*707#/i.test(i.answer));
      const pickBranchManagersList = () => items.find(i => i.product === 'Branch Managers');
      const pickBranchManagerSingle = () => {
        // Prefer a branch-specific single entry over the aggregate list.
        const isAggregateList = (ans: string) => /^\s*Branch Managers by location:/i.test(ans);
        // Check if a specific branch is mentioned, prioritize specific manager entries
        const branchNames = ['ejura', 'ahwiaa', 'kejetia', 'yeji', 'kwame\\s*danso', 'amantin', 'atebubu', 'kajaji'];
        for (const branch of branchNames) {
          const branchRegex = new RegExp(`\\b${branch}\\b`, 'i');
          if (branchRegex.test(lower)) {
            // First, try to match a dedicated single-branch answer (e.g., "Yeji branch manager: ...")
            const dedicatedRegex = new RegExp(`(^|\n)\s*${branch}.*(branch.*manager|manageress|officer[-\s]?in[-\s]?charge)`, 'i');
            const specificEntry = items.find(i => 
              i.product === 'Branch Manager' &&
              !isAggregateList(i.answer) &&
              dedicatedRegex.test(i.answer)
            );
            if (specificEntry) return specificEntry;
            // As a secondary attempt, match any Branch Manager entry that mentions the branch but still avoid the aggregate list
            const mentionEntry = items.find(i => 
              i.product === 'Branch Manager' &&
              !isAggregateList(i.answer) &&
              branchRegex.test(i.answer)
            );
            if (mentionEntry) return mentionEntry;

            // As a robust fallback, extract the branch line from the aggregate list if present
            const aggregate = items.find(i => i.product === 'Branch Manager' && isAggregateList(i.answer));
            if (aggregate) {
              const lines = aggregate.answer.split('\n');
              const match = lines.find(l => branchRegex.test(l));
              if (match) {
                // Normalize and return a concise single-branch statement
                // Example line: "- Yeji — **BENJAMIN AYISI** (Branch Manager)"
                const cleaned = match.replace(/^[-\s]*\s*/, '').replace(/\*\*/g, '').trim();
                // If the line already contains the branch name and title, return it as-is; otherwise prefix
                const text = /branch\s*manager|officer[-\s]?in[-\s]?charge|manageress/i.test(cleaned)
                  ? cleaned
                  : `${cleaned}`;
                return { idx: -1, product: 'Branch Manager', answer: text } as any;
              }
            }
          }
        }
        // Fallbacks: if no branch specified or no specific found, return the aggregate single entry
        return items.find(i => i.product === 'Branch Manager');
      };

      const pickFullManagement = () => items.find(i => i.product === 'Management' && (/Senior Management.*Unit Heads/i.test(i.answer) || /\n- \*\*/.test(i.answer)));
  // Geo-first for specific branch location queries only (avoid manager/other intents)
  const isLocationStyle = /(where|locate|find|address|location|gps|map|directions)/i.test(lower);
  const geoBranch = isLocationStyle && !intents.branchManager && !intents.branchManagersList && resolveBranchFromQuery();
      if (geoBranch) {
        const { name, lat, lng, phone } = geoBranch;
        const url = mapsUrlFromLatLng(lat, lng);
        const ll = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const phoneTxt = phone ? ` Phone: ${phone}.` : '';
        const followUp = ' Need directions from your location?';
        return { text: `${name}: ${ll}. Directions: ${url}.${phoneTxt}${followUp}` };
      }

      const chosen =
        // Specific CEO question should prefer the CEO entry if available
        (intents.ceo && (pickByProduct('CEO') || pickByProduct('Management'))) ||
  // Bank history and board chairman
  (intents.history && pickByProduct('History')) ||
  (intents.boardChairman && pickByProduct('Board Chairman')) ||
        // Nearest branch stub should be preferred when asked
        (intents.nearestBranch && (items.find(i => i.product === 'Nearest Branch') || pickByProduct('Branch'))) ||
        // Branch managers (explicit list or single)
        (intents.branchManagersList && pickBranchManagersList()) ||
        (intents.branchManager && (console.log('[DEBUG MOCK] Trying single branch manager selection'), pickBranchManagerSingle())) ||
        // Explicit full management team request should return the full list
        (intents.fullManagement && pickFullManagement()) ||
  // Role-specific heads
  (intents.headAudit && pickByProduct('Head of Audit')) ||
  (intents.headCredit && pickByProduct('Head of Credit')) ||
  (intents.headCompliance && pickByProduct('Head of AML, Risk & Compliance')) ||
  (intents.headIT && pickByProduct('Head of IT')) ||
  (intents.headAdminHR && pickByProduct('Head of Administration & HR')) ||
  (intents.headOps && pickByProduct('Head of Operations')) ||
  (intents.headMarketing && pickByProduct('Unit Head (Marketing)')) ||
        (intents.branch && pickByProduct('Branch')) ||
        (intents.contact && pickByProduct('Contact')) ||
        (intents.deposit && pickByProduct('Deposit')) ||
        (intents.loan && pickByProduct('Loan')) ||
  // Smart banking priority: specific entries first
        (intents.ussd && pickUssd()) ||
        (intents.ghanaPay && pickGhanaPay()) ||
  (intents.smart && pickByProduct('Smart Banking')) ||
        (intents.invest && pickByProduct('Investment')) ||
        (intents.management && pickByProduct('Management')) ||
        (intents.productsAndServices && pickByProduct('Products & Services')) ||
        (intents.hours && (pickByProduct('Hours') || pickByProduct('Support')))
        // Final fallback: if KB items exist, return the first one (e.g., Checking fees)
        || items[0];

      if (chosen) {
        console.log(`[DEBUG MOCK] Returning generic KB-based response for product: ${chosen.product}`);
        let text = chosen.answer;

        if (chosen.product === 'Management') {
            const query = lower;
            // Extract role from query
            const roleQuery = 
                /ceo|chief executive officer/.test(query) ? "CHIEF EXECUTIVE OFFICER" :
                /head of audit/.test(query) ? "HEAD OF AUDIT" :
                /head of credit/.test(query) ? "HEAD OF CREDIT" :
                /head of anti-money laundering|risk|compliance/.test(query) ? "HEAD OF ANTI-MONEY LAUNDERING, RISK AND COMPLIANCE" :
                /head of it/.test(query) ? "HEAD OF IT" :
                /head of administration|hr/.test(query) ? "HEAD OF ADMINISTRATION & HR" :
                /head of operations/.test(query) ? "HEAD OF OPERATIONS" :
                /marketing/.test(query) ? "UNIT HEAD (MARKETING)" :
                null;

            if (roleQuery) {
                const lines = text.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim().toUpperCase() === roleQuery) {
                        const nameLine = lines[i-1];
                        if (nameLine) {
                            const name = nameLine.replace(/- \*\*/g, '').replace(/\*\*/g, '').trim();
                            const title = lines[i].trim();
                            text = `${name} is our ${title}.`;
                            break;
                        }
                    }
                }
            }
        }

  // For Branch answers, return the KB text as-is (no generic wrapper),
  // to keep single-branch queries concise, e.g., Kejetia/Ahwiaa location.
        if (chosen.product === 'Contact' && !/^contact/i.test(chosen.answer)) {
          text = `You can reach us here: ${chosen.answer}`;
        }
        return { text };
      }
    }

    // Handle short affirmation after an assistant prompt offering a choice
  if (isAffirmative && followsChoice) {
      return {
        text: `Happy to help — would you like a quick overview of features or today's rates? Reply 'features' or 'rates'.`
      };
    }

  // If user specifies 'features' after savings context or after assistant offered the choice
  if (/(^|\b)features?(\b|$)/i.test(lower) && (kbContext || followsChoice)) {
      return {
        text: `Key features of our savings accounts include competitive interest rates and easy access to your funds. Would you like to start an application or see current rates?`
      };
    }

  // If user asks for 'rates' after savings context or after assistant offered the choice
  if (/(^|\b)(rates?|apy|apr)(\b|$)/i.test(lower) && (kbContext || followsChoice)) {
      return {
        text: `Savings rates are updated periodically and may change. For the latest APY, check our rates page or I can send you a direct link. Would you like that?`
      };
    }

    // Fallback response for when no specific intent is matched
    console.log(`[DEBUG MOCK] Returning fallback response`);
    const fallbackText = `I can help with questions about our products, services, branch locations, and hours. For example, you can ask 'what are your loan options?' or 'where is the nearest branch?'. How can I assist you?`;
    return { text: fallbackText };
  }
}
