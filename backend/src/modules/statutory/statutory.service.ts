import { prisma } from '../../config/prisma';

export class StatutoryService {
  static async getAll() {
    return prisma.statutoryConfig.findMany({
      orderBy: [{ configType: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }

  static async getActiveByType(type: string, date: Date = new Date()) {
    const config = await prisma.statutoryConfig.findFirst({
      where: {
        configType: type,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (config) return config;

    // Fallback to latest available
    return prisma.statutoryConfig.findFirst({
      where: { configType: type },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  static async createOrUpdate(data: {
    configType: string;
    rulesJson: any;
    effectiveFrom: string | Date;
    effectiveTo?: string | Date | null;
    createdBy?: string;
  }) {
    const effectiveFromDate = new Date(data.effectiveFrom);

    // If an older active config exists without effectiveTo, set its effectiveTo to new effectiveFrom - 1 day
    const previous = await prisma.statutoryConfig.findFirst({
      where: {
        configType: data.configType,
        effectiveTo: null,
        effectiveFrom: { lt: effectiveFromDate },
      },
    });

    if (previous) {
      const prevEnd = new Date(effectiveFromDate.getTime() - 24 * 60 * 60 * 1000);
      await prisma.statutoryConfig.update({
        where: { id: previous.id },
        data: { effectiveTo: prevEnd },
      });
    }

    return prisma.statutoryConfig.create({
      data: {
        configType: data.configType,
        rulesJson: data.rulesJson,
        effectiveFrom: effectiveFromDate,
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        createdBy: data.createdBy,
      },
    });
  }
}
