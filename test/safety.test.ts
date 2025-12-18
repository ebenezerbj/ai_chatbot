import { describe, it, expect } from 'vitest';
import { validateLoanApplicationPayload } from '../src/loanApplications';

describe('Input validation (loan application)', () => {
  it('rejects non-positive amounts and tenor', () => {
    const payload: any = {
      fullName: 'Test User',
      phoneNumber: '+233201234567',
      nationalIdNumber: 'GHA-1234567',
      accountNumber: '00123456789',
      employerName: 'Test Employer',
      position: 'Officer',
      employmentType: 'Permanent',
      lengthOfService: '2 years',
      netMonthlySalary: 2500,
      loanAmount: 0,
      loanPurpose: 'Personal',
      loanTenorMonths: 0,
      salaryDeductionConsent: true,
      employerConfirmation: true,
      borrowerDeclaration: true
    };

    const res = validateLoanApplicationPayload(payload);
    expect(res.ok).toBe(false);
  });

  it('rejects missing required strings', () => {
    const payload: any = {
      fullName: '',
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

    const res = validateLoanApplicationPayload(payload);
    expect(res.ok).toBe(false);
  });
});
