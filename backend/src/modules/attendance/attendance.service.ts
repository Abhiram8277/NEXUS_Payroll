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
    if (isNaN(dateObj.getTime())) {
      const err: any = new Error('Invalid attendance date.');
      err.statusCode = 400;
      throw err;
    }
    // Standardize to YYYY-MM-DD UTC
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

  static async getDailyAttendance(dateStr: string) {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      const err: any = new Error('Invalid date parameter.');
      err.statusCode = 400;
      throw err;
    }
    const isoDate = new Date(parsed.toISOString().split('T')[0]);

    return prisma.attendance.findMany({
      where: { date: isoDate },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { employee: { employeeId: 'asc' } },
    });
  }

  static async deleteAttendance(id: string) {
    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      const err: any = new Error('Attendance record not found.');
      err.statusCode = 404;
      throw err;
    }
    await prisma.attendance.delete({ where: { id } });
    return { message: 'Attendance record deleted successfully.' };
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
      const totalLop = lop + absent + halfDay * 0.5;

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

  static generateSampleTemplateBuffer(): Buffer {
    const sampleRows = [
      {
        employeeId: 'EMP-101',
        date: '2026-04-01',
        status: 'PRESENT',
        remarks: 'Regular shift',
      },
      {
        employeeId: 'EMP-102',
        date: '2026-04-01',
        status: 'HALF_DAY',
        remarks: 'Half day afternoon leave',
      },
      {
        employeeId: 'EMP-103',
        date: '2026-04-01',
        status: 'LOP',
        remarks: 'Unapproved absence',
      },
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'AttendanceTemplate');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  static async importBulkAttendance(
    fileBuffer: Buffer,
    options: { previewOnly?: boolean } = {}
  ) {
    let workbook: xlsx.WorkBook;
    try {
      workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    } catch {
      const err: any = new Error('Invalid or corrupted Excel file.');
      err.statusCode = 400;
      throw err;
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      const err: any = new Error('The uploaded Excel file contains no sheets.');
      err.statusCode = 400;
      throw err;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows || rows.length === 0) {
      const err: any = new Error('The uploaded Excel file is empty or contains no data rows.');
      err.statusCode = 400;
      throw err;
    }

    // Verify required columns exist in header
    const firstRowKeys = Object.keys(rows[0]).map((k) => k.trim().toLowerCase());
    const hasEmpCol = firstRowKeys.some((k) => ['employeeid', 'employee_id', 'employee id', 'empid', 'employee code'].includes(k));
    const hasDateCol = firstRowKeys.some((k) => ['date', 'attendance_date', 'attendance date'].includes(k));
    const hasStatusCol = firstRowKeys.some((k) => ['status', 'attendance_status', 'attendance status'].includes(k));

    if (!hasEmpCol || !hasDateCol || !hasStatusCol) {
      const err: any = new Error(
        'Missing required columns in Excel sheet. Required columns: employeeId, date, status.'
      );
      err.statusCode = 400;
      throw err;
    }

    // Preload employees for fast ID resolution
    const allEmployees = await prisma.employee.findMany({
      select: { id: true, employeeId: true, firstName: true, lastName: true },
    });
    const empMap = new Map<string, { id: string; employeeId: string; name: string }>();
    allEmployees.forEach((e) => {
      const info = { id: e.id, employeeId: e.employeeId, name: `${e.firstName} ${e.lastName}` };
      empMap.set(e.id.toLowerCase(), info);
      empMap.set(e.employeeId.toLowerCase(), info);
    });

    const validStatuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LOP'];
    const seenInFile = new Set<string>();

    let successful = 0;
    let failed = 0;
    let duplicateRows = 0;
    let updatedRows = 0;

    const errors: Array<{
      row: number;
      employeeId?: string;
      date?: string;
      status?: string;
      error: string;
    }> = [];

    const validRecords: Array<{
      row: number;
      employeeId: string;
      employeeCode: string;
      employeeName: string;
      date: string;
      status: AttendanceStatus;
      remarks: string | null;
      isExisting: boolean;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed sheet + header row

      const rawEmpId = String(
        row.employeeId ??
          row.EmployeeId ??
          row['Employee ID'] ??
          row.employee_id ??
          row['Employee Code'] ??
          ''
      ).trim();

      const rawDate =
        row.date ??
        row.Date ??
        row.attendance_date ??
        row['Attendance Date'] ??
        '';

      const rawStatus = String(
        row.status ??
          row.Status ??
          row.attendance_status ??
          row['Attendance Status'] ??
          ''
      )
        .trim()
        .toUpperCase();

      const remarksVal = row.remarks ?? row.Remarks ?? '';
      const remarks = String(remarksVal).trim() ? String(remarksVal).trim() : null;

      if (!rawEmpId) {
        failed++;
        errors.push({ row: rowNum, employeeId: '', date: String(rawDate), status: rawStatus, error: 'Missing employeeId' });
        continue;
      }

      const empInfo = empMap.get(rawEmpId.toLowerCase());
      if (!empInfo) {
        failed++;
        errors.push({
          row: rowNum,
          employeeId: rawEmpId,
          date: String(rawDate),
          status: rawStatus,
          error: `Employee '${rawEmpId}' not found`,
        });
        continue;
      }

      if (rawDate === '' || rawDate === null || rawDate === undefined) {
        failed++;
        errors.push({
          row: rowNum,
          employeeId: rawEmpId,
          date: '',
          status: rawStatus,
          error: 'Missing date',
        });
        continue;
      }

      let parsedDate: Date;
      if (typeof rawDate === 'number') {
        parsedDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
      } else {
        const dateStr = String(rawDate).trim();
        // Enforce strict YYYY-MM-DD or valid ISO date check
        const timestamp = Date.parse(dateStr);
        parsedDate = isNaN(timestamp) ? new Date(NaN) : new Date(timestamp);
      }

      if (isNaN(parsedDate.getTime())) {
        failed++;
        errors.push({
          row: rowNum,
          employeeId: rawEmpId,
          date: String(rawDate),
          status: rawStatus,
          error: `Invalid date format: '${rawDate}'`,
        });
        continue;
      }

      if (!rawStatus) {
        failed++;
        errors.push({
          row: rowNum,
          employeeId: rawEmpId,
          date: parsedDate.toISOString().split('T')[0],
          status: '',
          error: 'Missing attendance status',
        });
        continue;
      }

      if (!validStatuses.includes(rawStatus)) {
        failed++;
        errors.push({
          row: rowNum,
          employeeId: rawEmpId,
          date: parsedDate.toISOString().split('T')[0],
          status: rawStatus,
          error: `Invalid status '${rawStatus}'. Allowed: PRESENT, ABSENT, HALF_DAY, LOP`,
        });
        continue;
      }

      const isoDateStr = parsedDate.toISOString().split('T')[0];
      const isoDate = new Date(isoDateStr);
      const fileKey = `${empInfo.id}_${isoDateStr}`;

      // Check in-file duplicate (same employee + date appearing multiple times in the file)
      if (seenInFile.has(fileKey)) {
        failed++;
        duplicateRows++;
        errors.push({
          row: rowNum,
          employeeId: empInfo.employeeId,
          date: isoDateStr,
          status: rawStatus,
          error: `Duplicate row in file for employee ${empInfo.employeeId} on ${isoDateStr}`,
        });
        continue;
      }
      seenInFile.add(fileKey);

      const existingRecord = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: empInfo.id,
            date: isoDate,
          },
        },
      });

      const isExisting = Boolean(existingRecord);

      validRecords.push({
        row: rowNum,
        employeeId: empInfo.id,
        employeeCode: empInfo.employeeId,
        employeeName: empInfo.name,
        date: isoDateStr,
        status: rawStatus as AttendanceStatus,
        remarks,
        isExisting,
      });

      if (!options.previewOnly) {
        try {
          await prisma.attendance.upsert({
            where: {
              employeeId_date: {
                employeeId: empInfo.id,
                date: isoDate,
              },
            },
            update: {
              status: rawStatus as AttendanceStatus,
              remarks: remarks ?? undefined,
            },
            create: {
              employeeId: empInfo.id,
              date: isoDate,
              status: rawStatus as AttendanceStatus,
              remarks: remarks ?? undefined,
            },
          });
          successful++;
          if (isExisting) {
            updatedRows++;
          }
        } catch (err: any) {
          failed++;
          errors.push({
            row: rowNum,
            employeeId: empInfo.employeeId,
            date: isoDateStr,
            status: rawStatus,
            error: err.message,
          });
        }
      } else {
        successful++;
        if (isExisting) {
          updatedRows++;
        }
      }
    }

    return {
      previewOnly: Boolean(options.previewOnly),
      totalRows: rows.length,
      validRows: validRecords.length,
      validCount: validRecords.length,
      successfulRows: successful,
      importedRows: successful,
      totalImported: successful,
      imported: successful,
      failedRows: failed,
      failed,
      duplicateRows,
      duplicateRowsInFile: duplicateRows,
      updatedRows,
      existingDatabaseMatches: updatedRows,
      validRecords,
      errors,
    };
  }
}
