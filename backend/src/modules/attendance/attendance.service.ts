import { prisma } from '../../config/prisma';
import { AttendanceStatus } from '@prisma/client';
import xlsx from 'xlsx';

export class AttendanceService {
  static async markAttendance(data: {
    employeeId: string;
    date: string | Date;
    status: AttendanceStatus;
    remarks?: string;
  }) {
    const dateObj = new Date(data.date);
    // Standardize to YYYY-MM-DD
    const isoDate = new Date(dateObj.toISOString().split('T')[0]);

    return prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: isoDate,
        },
      },
      update: {
        status: data.status,
        remarks: data.remarks,
      },
      create: {
        employeeId: data.employeeId,
        date: isoDate,
        status: data.status,
        remarks: data.remarks,
      },
    });
  }

  static async getMonthlySummary(month: number, year: number, departmentId?: string) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0)); // last day of month
    const totalDaysInMonth = endDate.getUTCDate();

    const employees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        department: { select: { name: true } },
        attendances: {
          where: {
            date: { gte: startDate, lte: endDate },
          },
        },
      },
      orderBy: { employeeId: 'asc' },
    });

    return employees.map((emp) => {
      let present = 0;
      let absent = 0;
      let halfDay = 0;
      let lop = 0;

      for (const att of emp.attendances) {
        if (att.status === AttendanceStatus.PRESENT) present++;
        else if (att.status === AttendanceStatus.ABSENT) absent++;
        else if (att.status === AttendanceStatus.HALF_DAY) halfDay++;
        else if (att.status === AttendanceStatus.LOP) lop++;
      }

      // Half days contribute 0.5 to present and 0.5 to LOP if unpaid
      const effectivePresent = present + halfDay * 0.5;
      const totalLop = lop + absent; // Standard policy: unexcused absence treated as LOP unless on approved paid leave

      return {
        id: emp.id,
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department?.name || 'N/A',
        totalDays: totalDaysInMonth,
        present,
        absent,
        halfDay,
        lop,
        effectivePresent,
        totalLop,
      };
    });
  }

  static async getEmployeeAttendance(employeeId: string, month?: number, year?: number) {
    const where: any = { employeeId };
    if (month && year) {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0));
      where.date = { gte: startDate, lte: endDate };
    }

    return prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  static async importBulkAttendance(fileBuffer: Buffer) {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = xlsx.utils.sheet_to_json(sheet);

    let successful = 0;
    let failed = 0;
    const errors: Array<{ row: number; error: string; data?: any }> = [];

    // Preload employees for fast ID resolution
    const allEmployees = await prisma.employee.findMany({
      select: { id: true, employeeId: true },
    });
    const empMap = new Map<string, string>(); // code/id -> internal id
    allEmployees.forEach((e) => {
      empMap.set(e.id, e.id);
      empMap.set(e.employeeId.toLowerCase(), e.id);
    });

    const validStatuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LOP'];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // considering 1-indexed sheet + header

      const rawEmpId = String(row.employeeId || row.EmployeeId || row['Employee ID'] || '').trim();
      const rawDate = row.date || row.Date;
      const rawStatus = String(row.status || row.Status || '').trim().toUpperCase();
      const remarks = row.remarks || row.Remarks || null;

      if (!rawEmpId) {
        failed++;
        errors.push({ row: rowNum, error: 'Missing employeeId' });
        continue;
      }

      const internalEmpId = empMap.get(rawEmpId.toLowerCase());
      if (!internalEmpId) {
        failed++;
        errors.push({ row: rowNum, error: `Employee '${rawEmpId}' not found` });
        continue;
      }

      if (!rawDate) {
        failed++;
        errors.push({ row: rowNum, error: 'Missing date' });
        continue;
      }

      let parsedDate: Date;
      if (typeof rawDate === 'number') {
        // Excel serial date number
        parsedDate = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
      } else {
        parsedDate = new Date(rawDate);
      }

      if (isNaN(parsedDate.getTime())) {
        failed++;
        errors.push({ row: rowNum, error: `Invalid date format: ${rawDate}` });
        continue;
      }

      if (!validStatuses.includes(rawStatus)) {
        failed++;
        errors.push({
          row: rowNum,
          error: `Invalid status '${rawStatus}'. Allowed: PRESENT, ABSENT, HALF_DAY, LOP`,
        });
        continue;
      }

      const isoDate = new Date(parsedDate.toISOString().split('T')[0]);

      try {
        await prisma.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: internalEmpId,
              date: isoDate,
            },
          },
          update: {
            status: rawStatus as AttendanceStatus,
            remarks: remarks ? String(remarks) : undefined,
          },
          create: {
            employeeId: internalEmpId,
            date: isoDate,
            status: rawStatus as AttendanceStatus,
            remarks: remarks ? String(remarks) : undefined,
          },
        });
        successful++;
      } catch (err: any) {
        failed++;
        errors.push({ row: rowNum, error: err.message });
      }
    }

    return {
      totalRows: rows.length,
      successfulRows: successful,
      failedRows: failed,
      errors,
    };
  }
}
