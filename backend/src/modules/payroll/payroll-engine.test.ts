import { PayrollCalculationEngine, StatutoryRules, PayrollEmployeeInput } from './payroll-engine.service';

describe('NEXUS Payroll Calculation Engine Tests', () => {
  const sampleRules: StatutoryRules = {
    pf: {
      employeeRate: 12,
      employerRate: 12,
      wageCeiling: 15000,
      maxContribution: 1800,
    },
    esi: {
      employeeRate: 0.75,
      employerRate: 3.25,
      wageCeiling: 21000,
    },
    pt: {
      state: 'Telangana',
      slabs: [
        { minGross: 0, maxGross: 15000, tax: 0 },
        { minGross: 15001, maxGross: 20000, tax: 150 },
        { minGross: 20001, maxGross: 999999999, tax: 200 },
      ],
    },
    tds: {
      standardDeduction: 75000,
      slabs: [
        { minAnnual: 0, maxAnnual: 300000, rate: 0 },
        { minAnnual: 300001, maxAnnual: 700000, rate: 5 },
        { minAnnual: 700001, maxAnnual: 1000000, rate: 10 },
        { minAnnual: 1000001, maxAnnual: 1200000, rate: 15 },
        { minAnnual: 1200001, maxAnnual: 1500000, rate: 20 },
        { minAnnual: 1500001, maxAnnual: 999999999, rate: 30 },
      ],
    },
  };

  describe('Loss of Pay (LOP) Calculation', () => {
    it('calculates zero LOP when lopDays is 0', () => {
      const lop = PayrollCalculationEngine.calculateLOP(60000, 30, 0);
      expect(lop).toBe(0);
    });

    it('calculates exact pro-rata LOP for 3 days out of 30', () => {
      // 60,000 / 30 * 3 = 6,000
      const lop = PayrollCalculationEngine.calculateLOP(60000, 30, 3);
      expect(lop).toBe(6000);
    });
  });

  describe('Provident Fund (PF) Calculation', () => {
    it('caps PF contribution at 1800 when basic exceeds 15,000', () => {
      // 12% of 30,000 is 3,600, but cap is 1,800
      const pf = PayrollCalculationEngine.calculatePF(30000, sampleRules.pf);
      expect(pf.employee).toBe(1800);
      expect(pf.employer).toBe(1800);
    });

    it('calculates 12% when basic is below ceiling', () => {
      // 12% of 10,000 = 1,200
      const pf = PayrollCalculationEngine.calculatePF(10000, sampleRules.pf);
      expect(pf.employee).toBe(1200);
      expect(pf.employer).toBe(1200);
    });
  });

  describe('Employee State Insurance (ESI) Calculation', () => {
    it('returns 0 when gross salary exceeds wage ceiling of 21,000', () => {
      const esi = PayrollCalculationEngine.calculateESI(25000, sampleRules.esi);
      expect(esi.employee).toBe(0);
      expect(esi.employer).toBe(0);
    });

    it('calculates 0.75% and 3.25% when gross is within ceiling', () => {
      // Gross 20,000: 0.75% = 150, 3.25% = 650
      const esi = PayrollCalculationEngine.calculateESI(20000, sampleRules.esi);
      expect(esi.employee).toBe(150);
      expect(esi.employer).toBe(650);
    });
  });

  describe('Professional Tax (PT) Calculation', () => {
    it('returns 0 for gross <= 15,000', () => {
      expect(PayrollCalculationEngine.calculatePT(12000, sampleRules.pt)).toBe(0);
    });

    it('returns 150 for gross between 15,001 and 20,000', () => {
      expect(PayrollCalculationEngine.calculatePT(18000, sampleRules.pt)).toBe(150);
    });

    it('returns 200 for gross > 20,000', () => {
      expect(PayrollCalculationEngine.calculatePT(50000, sampleRules.pt)).toBe(200);
    });
  });

  describe('Complete Employee Payroll Computation', () => {
    it('computes full salary breakup with zero LOP accurately', () => {
      const input: PayrollEmployeeInput = {
        employeeId: 'EMP-101',
        name: 'Rahul Sharma',
        monthlyGross: 60000,
        components: [
          { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', amount: 30000 },
          { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING', amount: 12000 },
          { code: 'SPL_ALLOW', name: 'Special Allowance', type: 'EARNING', amount: 18000 },
        ],
        workingDays: 30,
        presentDays: 30,
        lopDays: 0,
        taxRegime: 'NEW',
      };

      const result = PayrollCalculationEngine.computeEmployeePayroll(input, sampleRules);

      expect(result.grossEarnings).toBe(60000);
      expect(result.workingDays).toBe(30);
      expect(result.lopDays).toBe(0);

      // Deductions: PF (1800) + PT (200) + TDS
      const pfComp = result.components.find((c) => c.code === 'PF_EE');
      expect(pfComp?.amount).toBe(1800);

      const ptComp = result.components.find((c) => c.code === 'PT');
      expect(ptComp?.amount).toBe(200);

      expect(result.totalDeductions).toBeGreaterThanOrEqual(2000);
      expect(result.netSalary).toBe(result.grossEarnings - result.totalDeductions);
    });

    it('pro-rates earnings when LOP occurs and adjusts net pay', () => {
      const input: PayrollEmployeeInput = {
        employeeId: 'EMP-102',
        name: 'Priya Patel',
        monthlyGross: 30000,
        components: [
          { code: 'BASIC', name: 'Basic Salary', type: 'EARNING', amount: 15000 },
          { code: 'HRA', name: 'House Rent Allowance', type: 'EARNING', amount: 6000 },
          { code: 'SPL_ALLOW', name: 'Special Allowance', type: 'EARNING', amount: 9000 },
        ],
        workingDays: 30,
        presentDays: 20,
        lopDays: 10, // 10 days LOP
        taxRegime: 'NEW',
      };

      const result = PayrollCalculationEngine.computeEmployeePayroll(input, sampleRules);

      // Factor = 20 / 30 = 2/3. Gross should be 20,000
      expect(result.grossEarnings).toBe(20000);
      expect(result.lopDays).toBe(10);
      expect(result.presentDays).toBe(20);

      // Under 21,000, ESI applies
      const esiComp = result.components.find((c) => c.code === 'ESI_EE');
      expect(esiComp).toBeDefined();
      expect(esiComp?.amount).toBe(150); // 0.75% of 20,000

      expect(result.netSalary).toBe(result.grossEarnings - result.totalDeductions);
    });
  });
});
