export interface PayrollEmployeeInput {
  employeeId: string;
  name: string;
  monthlyGross: number;
  components: Array<{
    code: string;
    name: string;
    type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
    amount: number;
  }>;
  workingDays: number;
  presentDays: number;
  lopDays: number;
  taxRegime: 'OLD' | 'NEW';
}

export interface StatutoryRules {
  pf?: {
    employeeRate: number;      // e.g. 12%
    employerRate: number;      // e.g. 12%
    wageCeiling?: number;      // e.g. 15000
    maxContribution?: number;  // e.g. 1800
  };
  esi?: {
    employeeRate: number;      // e.g. 0.75%
    employerRate: number;      // e.g. 3.25%
    wageCeiling: number;       // e.g. 21000
  };
  pt?: {
    state?: string;
    slabs: Array<{
      minGross: number;
      maxGross: number;
      tax: number;
    }>;
  };
  tds?: {
    standardDeduction?: number;
    slabs: Array<{
      minAnnual: number;
      maxAnnual: number;
      rate: number;
    }>;
  };
}

export interface CalculatedPayrollResult {
  workingDays: number;
  presentDays: number;
  lopDays: number;
  lopDeduction: number;
  grossEarnings: number;
  totalDeductions: number;
  employerContributions: number;
  netSalary: number;
  components: Array<{
    code: string;
    name: string;
    type: 'EARNING' | 'DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
    amount: number;
    note?: string;
  }>;
}

export class PayrollCalculationEngine {
  /**
   * Calculates Loss of Pay deduction based on standard per-day pro-rata calculation
   */
  static calculateLOP(monthlyGross: number, workingDays: number, lopDays: number): number {
    if (workingDays <= 0 || lopDays <= 0) return 0;
    const perDayRate = monthlyGross / workingDays;
    return Math.round(perDayRate * lopDays);
  }

  /**
   * Calculates Employee PF contribution: 12% of Basic, typically capped at 1800
   */
  static calculatePF(basicPay: number, pfRules?: StatutoryRules['pf']): { employee: number; employer: number } {
    const rate = (pfRules?.employeeRate ?? 12) / 100;
    const erRate = (pfRules?.employerRate ?? 12) / 100;
    const maxCap = pfRules?.maxContribution ?? 1800;

    let eeContribution = Math.round(basicPay * rate);
    if (maxCap > 0 && eeContribution > maxCap) {
      eeContribution = maxCap;
    }

    let erContribution = Math.round(basicPay * erRate);
    if (maxCap > 0 && erContribution > maxCap) {
      erContribution = maxCap;
    }

    return { employee: eeContribution, employer: erContribution };
  }

  /**
   * Calculates ESI: 0.75% Employee, 3.25% Employer if gross <= 21,000
   */
  static calculateESI(grossSalary: number, esiRules?: StatutoryRules['esi']): { employee: number; employer: number } {
    const ceiling = esiRules?.wageCeiling ?? 21000;
    if (grossSalary > ceiling) {
      return { employee: 0, employer: 0 };
    }
    const eeRate = (esiRules?.employeeRate ?? 0.75) / 100;
    const erRate = (esiRules?.employerRate ?? 3.25) / 100;

    return {
      employee: Math.ceil(grossSalary * eeRate),
      employer: Math.ceil(grossSalary * erRate),
    };
  }

  /**
   * Calculates Professional Tax from slab rules
   */
  static calculatePT(grossSalary: number, ptRules?: StatutoryRules['pt']): number {
    const defaultSlabs = [
      { minGross: 0, maxGross: 15000, tax: 0 },
      { minGross: 15001, maxGross: 20000, tax: 150 },
      { minGross: 20001, maxGross: 999999999, tax: 200 },
    ];
    const slabs = ptRules?.slabs && ptRules.slabs.length > 0 ? ptRules.slabs : defaultSlabs;

    for (const slab of slabs) {
      if (grossSalary >= slab.minGross && grossSalary <= slab.maxGross) {
        return slab.tax;
      }
    }
    return 0;
  }

  /**
   * Calculates simplified monthly estimated TDS based on annual estimated taxable income
   */
  static calculateTDS(
    monthlyGross: number,
    taxRegime: 'OLD' | 'NEW' = 'NEW',
    tdsRules?: StatutoryRules['tds']
  ): number {
    const estimatedAnnual = monthlyGross * 12;
    const stdDeduction = tdsRules?.standardDeduction ?? 75000;
    const taxableIncome = Math.max(0, estimatedAnnual - stdDeduction);

    if (taxableIncome <= 300000) return 0;

    const slabs = tdsRules?.slabs || [
      { minAnnual: 0, maxAnnual: 300000, rate: 0 },
      { minAnnual: 300001, maxAnnual: 700000, rate: 5 },
      { minAnnual: 700001, maxAnnual: 1000000, rate: 10 },
      { minAnnual: 1000001, maxAnnual: 1200000, rate: 15 },
      { minAnnual: 1200001, maxAnnual: 1500000, rate: 20 },
      { minAnnual: 1500001, maxAnnual: 999999999, rate: 30 },
    ];

    let annualTax = 0;
    for (const s of slabs) {
      if (taxableIncome > s.minAnnual) {
        const taxableInSlab = Math.min(taxableIncome, s.maxAnnual) - s.minAnnual;
        annualTax += taxableInSlab * (s.rate / 100);
      }
    }

    // 87A rebate for income up to 7,00,000 under new regime
    if (taxableIncome <= 700000) {
      annualTax = 0;
    } else {
      annualTax = annualTax * 1.04; // 4% Health & Education cess
    }

    return Math.round(annualTax / 12);
  }

  /**
   * Main calculation function for a single employee in a payroll period
   */
  static computeEmployeePayroll(
    input: PayrollEmployeeInput,
    rules: StatutoryRules
  ): CalculatedPayrollResult {
    const workingDays = Math.max(1, input.workingDays);
    const lopDays = Math.max(0, input.lopDays);
    const presentDays = Math.max(0, Math.min(workingDays, workingDays - lopDays));

    // Attendance factor for pro-rata calculation
    const attendanceFactor = (workingDays - lopDays) / workingDays;

    const resultComponents: CalculatedPayrollResult['components'] = [];
    let grossEarnings = 0;
    let basicPay = 0;

    // 1. Calculate Earnings (pro-rata adjusted if LOP occurs)
    for (const comp of input.components) {
      if (comp.type === 'EARNING') {
        const adjustedAmount = Math.round(comp.amount * attendanceFactor);
        resultComponents.push({
          code: comp.code,
          name: comp.name,
          type: 'EARNING',
          amount: adjustedAmount,
          note: lopDays > 0 ? `Pro-rata for ${presentDays}/${workingDays} days` : undefined,
        });
        grossEarnings += adjustedAmount;
        if (comp.code === 'BASIC') {
          basicPay = adjustedAmount;
        }
      }
    }

    // If no basic component found, assume 50% of gross
    if (basicPay === 0) {
      basicPay = Math.round(grossEarnings * 0.5);
    }

    // 2. Statutory Calculations
    const pf = this.calculatePF(basicPay, rules.pf);
    const esi = this.calculateESI(grossEarnings, rules.esi);
    const pt = this.calculatePT(grossEarnings, rules.pt);
    const tds = this.calculateTDS(grossEarnings, input.taxRegime, rules.tds);

    let totalDeductions = 0;

    // Add deductions
    if (pf.employee > 0) {
      resultComponents.push({
        code: 'PF_EE',
        name: 'Provident Fund (Employee)',
        type: 'DEDUCTION',
        amount: pf.employee,
      });
      totalDeductions += pf.employee;
    }

    if (esi.employee > 0) {
      resultComponents.push({
        code: 'ESI_EE',
        name: 'ESI (Employee)',
        type: 'DEDUCTION',
        amount: esi.employee,
      });
      totalDeductions += esi.employee;
    }

    if (pt > 0) {
      resultComponents.push({
        code: 'PT',
        name: 'Professional Tax',
        type: 'DEDUCTION',
        amount: pt,
      });
      totalDeductions += pt;
    }

    if (tds > 0) {
      resultComponents.push({
        code: 'TDS',
        name: 'Income Tax (TDS)',
        type: 'DEDUCTION',
        amount: tds,
      });
      totalDeductions += tds;
    }

    // Any other custom deductions from salary structure
    for (const comp of input.components) {
      if (comp.type === 'DEDUCTION' && !['PF_EE', 'ESI_EE', 'PT', 'TDS'].includes(comp.code)) {
        resultComponents.push({
          code: comp.code,
          name: comp.name,
          type: 'DEDUCTION',
          amount: comp.amount,
        });
        totalDeductions += comp.amount;
      }
    }

    // 3. Employer Contributions
    let employerContributions = 0;
    if (pf.employer > 0) {
      resultComponents.push({
        code: 'PF_ER',
        name: 'Provident Fund (Employer)',
        type: 'EMPLOYER_CONTRIBUTION',
        amount: pf.employer,
      });
      employerContributions += pf.employer;
    }

    if (esi.employer > 0) {
      resultComponents.push({
        code: 'ESI_ER',
        name: 'ESI (Employer)',
        type: 'EMPLOYER_CONTRIBUTION',
        amount: esi.employer,
      });
      employerContributions += esi.employer;
    }

    // 4. Net Salary
    const netSalary = Math.max(0, grossEarnings - totalDeductions);
    const lopDeduction = this.calculateLOP(input.monthlyGross, workingDays, lopDays);

    return {
      workingDays,
      presentDays,
      lopDays,
      lopDeduction,
      grossEarnings,
      totalDeductions,
      employerContributions,
      netSalary,
      components: resultComponents,
    };
  }
}
