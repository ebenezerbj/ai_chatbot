import { describe, it, expect } from 'vitest';
import {
  computeMonthlyInstalment,
  shouldOpenLoanApplicationForm,
  validateLoanApplicationPayload
} from '../src/loanApplications';

describe('Loan application helpers', () => {
  it('detects loan application intent', () => {
    expect(shouldOpenLoanApplicationForm('I want to apply for a loan')).toBe(true);
    expect(shouldOpenLoanApplicationForm('loan application')).toBe(true);
    expect(shouldOpenLoanApplicationForm('hello there')).toBe(false);
  });

  it('computes monthly instalment (amount / tenor) to 2dp', () => {
    expect(computeMonthlyInstalment(1200, 12)).toBe(100);
    expect(computeMonthlyInstalment(1000, 3)).toBe(333.33);
  });

  it('validates required fields and consents', () => {
    const base = {
      fullName: 'Test User',
      phoneNumber: '+233201234567',
      nationalIdNumber: 'GHA-1234567',
      accountNumber: '00123456789',
      employerName: 'Test Employer',
      position: 'Officer',
      employmentType: 'Permanent',
      lengthOfService: '2 years',
      netMonthlySalary: 2500,
      loanAmount: 1200,
      loanPurpose: 'Personal',
      loanTenorMonths: 12,
      salaryDeductionConsent: true,
      employerConfirmation: true,
      borrowerDeclaration: true
    };

    const ok = validateLoanApplicationPayload(base);
    expect(ok.ok).toBe(true);

    const missingConsent = validateLoanApplicationPayload({ ...base, borrowerDeclaration: false });
    expect(missingConsent.ok).toBe(false);
  });
});
