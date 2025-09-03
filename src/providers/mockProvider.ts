import { LLMProvider, LLMResponse } from '../core/types';

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
        branch: /\b(branch|branches|location|locations|nearest)\b/i.test(lower),
        contact: /\b(contact|phone|call|email|reach|address|gps)\b/i.test(lower),
        deposit: /\b(deposit|current account|salary account|susu|account|accounts)\b/i.test(lower),
        loan: /\b(loan|loans|credit|agric|business loan|funeral loan|group loan|salary loan|susu loan|staff loan|inventory loan)\b/i.test(lower),
        smart: /\b(smart|atm|gh-?link|e\W?zwich|ezwich|apex|inter\s?bank|ach|interoperability)\b/i.test(lower),
        invest: /\b(invest|investment|fixed deposit|christmas account|sala account|woba)\b/i.test(lower),
        hours: /\b(hours|open|opening|closing|time)\b/i.test(lower),
        management: /\b(management|leadership|team|ceo|head of|director|who.*runs|senior.*team)\b/i.test(lower),
        productsAndServices: /products?|services?|offerings?|what do you offer|list of services/i.test(lower),
        requirements: /(require|document|need|eligibil)/i.test(lower)
      } as const;

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
      const chosen =
        (intents.branch && pickByProduct('Branch')) ||
        (intents.contact && pickByProduct('Contact')) ||
        (intents.deposit && pickByProduct('Deposit')) ||
        (intents.loan && pickByProduct('Loan')) ||
        (intents.smart && pickByProduct('Smart Banking')) ||
        (intents.invest && pickByProduct('Investment')) ||
        (intents.management && pickByProduct('Management')) ||
        (intents.productsAndServices && pickByProduct('Products & Services')) ||
        (intents.hours && (pickByProduct('Hours') || pickByProduct('Support')));

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

        if (chosen.product === 'Branch' && !/^branches:/i.test(chosen.answer)) {
          text = `Branches: ${chosen.answer}`;
        }
        if (chosen.product === 'Contact' && !/^contact/i.test(chosen.answer)) {
          text = `Contact details: ${chosen.answer}`;
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
