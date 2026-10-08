import { prisma } from '../../config/prisma';

export class CompanyService {
  static async getCompany() {
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'NEXUS Technologies Pvt Ltd',
          tagline: 'Payroll, without the paperwork.',
          country: 'India',
        },
      });
    }
    return company;
  }

  static async updateCompany(data: any) {
    const existing = await this.getCompany();
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
