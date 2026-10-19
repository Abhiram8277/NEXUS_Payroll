import { prisma } from '../../config/prisma';

export class CompanyService {
  static async getCompany() {
    return prisma.company.findFirst();
  }

  static async updateCompany(data: any) {
    let existing = await prisma.company.findFirst();
    if (!existing) {
      return prisma.company.create({
        data: {
          name: data.name || 'My Organization',
          tagline: data.tagline || 'Payroll, without the paperwork.',
          country: data.country || 'India',
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          pinCode: data.pinCode,
          pan: data.pan,
          tan: data.tan,
          financialYear: data.financialYear || '2026-2027',
          payrollFrequency: data.payrollFrequency || 'MONTHLY',
        },
      });
    }
    return prisma.company.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        tagline: data.tagline,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country || 'India',
        pinCode: data.pinCode,
        email: data.email,
        phone: data.phone,
        pan: data.pan,
        tan: data.tan,
        financialYear: data.financialYear,
        payrollFrequency: data.payrollFrequency,
      },
    });
  }
}
