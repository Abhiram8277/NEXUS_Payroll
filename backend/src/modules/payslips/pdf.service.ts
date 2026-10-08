import PDFDocument from 'pdfkit';
import { Company } from '@prisma/client';

export class PDFService {
  static generatePayslipPDF(data: {
    company: Company;
    employee: any;
    payrollEmployee: any;
    payslipNumber: string;
    month: number;
    year: number;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthStr = monthNames[data.month - 1] || `${data.month}`;

      // Colors
      const navy = '#0B132B';
      const slateDark = '#1E293B';
      const slateLight = '#64748B';
      const borderColor = '#CBD5E1';
      const cardBg = '#F8FAFC';

      // --- Header with NEXUS Branding ---
      doc.rect(40, 40, 515, 65).fill(navy);

      doc.fillColor('#06B6D4').fontSize(22).font('Helvetica-Bold').text('NEXUS', 55, 52);
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica').text('Payroll, without the paperwork.', 55, 78);

      doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('PAYSLIP', 400, 52, { align: 'right', width: 140 });
      doc.fillColor('#94A3B8').fontSize(9).font('Helvetica').text(`${monthStr} ${data.year}`, 400, 72, { align: 'right', width: 140 });
      doc.fillColor('#94A3B8').fontSize(8).text(`Ref: ${data.payslipNumber}`, 400, 85, { align: 'right', width: 140 });

      // --- Company Info ---
      doc.y = 115;
      doc.fillColor(slateDark).fontSize(11).font('Helvetica-Bold').text(data.company.name, 40, 115);
      doc.fillColor(slateLight).fontSize(8).font('Helvetica');
      if (data.company.address) doc.text(data.company.address, 40, 128);
      const companyTax = `PAN: ${data.company.pan || 'N/A'} | TAN: ${data.company.tan || 'N/A'}`;
      doc.text(companyTax, 40, 139);

      // --- Employee Details Grid ---
      const gridY = 160;
      doc.rect(40, gridY, 515, 80).fill(cardBg).stroke(borderColor);

      doc.fillColor(slateLight).fontSize(8).font('Helvetica-Bold');
      doc.text('EMPLOYEE NAME', 50, gridY + 10);
      doc.text('EMPLOYEE ID', 180, gridY + 10);
      doc.text('DEPARTMENT', 310, gridY + 10);
      doc.text('DESIGNATION', 420, gridY + 10);

      doc.fillColor(slateDark).fontSize(9).font('Helvetica');
      doc.text(`${data.employee.firstName} ${data.employee.lastName}`, 50, gridY + 22);
      doc.text(data.employee.employeeId, 180, gridY + 22);
      doc.text(data.employee.department?.name || 'N/A', 310, gridY + 22);
      doc.text(data.employee.designation?.name || 'N/A', 420, gridY + 22);

      doc.fillColor(slateLight).fontSize(8).font('Helvetica-Bold');
      doc.text('BANK ACCOUNT', 50, gridY + 45);
      doc.text('IFSC CODE', 180, gridY + 45);
      doc.text('PAN', 310, gridY + 45);
      doc.text('DAYS WORKED / LOP', 420, gridY + 45);

      doc.fillColor(slateDark).fontSize(9).font('Helvetica');
      doc.text(data.employee.accountNumber ? `••••${data.employee.accountNumber.slice(-4)}` : 'N/A', 50, gridY + 57);
      doc.text(data.employee.ifsc || 'N/A', 180, gridY + 57);
      doc.text(data.employee.pan || 'N/A', 310, gridY + 57);
      doc.text(`${data.payrollEmployee.presentDays} / ${data.payrollEmployee.lopDays} LOP`, 420, gridY + 57);

      // --- Salary Components Table ---
      const tableY = 255;
      const earnings = data.payrollEmployee.components.filter((c: any) => c.type === 'EARNING');
      const deductions = data.payrollEmployee.components.filter((c: any) => c.type === 'DEDUCTION');

      // Table Headers
      doc.rect(40, tableY, 250, 22).fill('#E2E8F0').stroke(borderColor);
      doc.rect(305, tableY, 250, 22).fill('#E2E8F0').stroke(borderColor);

      doc.fillColor(slateDark).fontSize(9).font('Helvetica-Bold');
      doc.text('EARNINGS', 50, tableY + 6);
      doc.text('AMOUNT (₹)', 220, tableY + 6);

      doc.text('DEDUCTIONS', 315, tableY + 6);
      doc.text('AMOUNT (₹)', 485, tableY + 6);

      let currentY = tableY + 25;
      const maxRows = Math.max(earnings.length, deductions.length);

      doc.font('Helvetica').fontSize(8.5).fillColor(slateDark);

      for (let i = 0; i < maxRows; i++) {
        const rowH = 18;
        const e = earnings[i];
        const d = deductions[i];

        if (e) {
          doc.text(e.name, 50, currentY + 4, { width: 160 });
          doc.text(`₹${Number(e.amount).toLocaleString('en-IN')}`, 210, currentY + 4, { align: 'right', width: 70 });
        }
        if (d) {
          doc.text(d.name, 315, currentY + 4, { width: 160 });
          doc.text(`₹${Number(d.amount).toLocaleString('en-IN')}`, 475, currentY + 4, { align: 'right', width: 70 });
        }

        currentY += rowH;
      }

      // Totals Box
      currentY += 10;
      doc.rect(40, currentY, 250, 24).fill(cardBg).stroke(borderColor);
      doc.rect(305, currentY, 250, 24).fill(cardBg).stroke(borderColor);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(slateDark);
      doc.text('GROSS EARNINGS', 50, currentY + 7);
      doc.text(`₹${Number(data.payrollEmployee.grossEarnings).toLocaleString('en-IN')}`, 210, currentY + 7, { align: 'right', width: 70 });

      doc.text('TOTAL DEDUCTIONS', 315, currentY + 7);
      doc.text(`₹${Number(data.payrollEmployee.totalDeductions).toLocaleString('en-IN')}`, 475, currentY + 7, { align: 'right', width: 70 });

      // --- Net Salary Banner ---
      const netY = currentY + 40;
      doc.rect(40, netY, 515, 50).fill('#0B132B').stroke('#0284C7');

      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text('NET TAKE-HOME SALARY', 55, netY + 12);
      doc.fillColor('#38BDF8').fontSize(18).font('Helvetica-Bold').text(`₹${Number(data.payrollEmployee.netSalary).toLocaleString('en-IN')}`, 350, netY + 12, { align: 'right', width: 190 });

      doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text('Paid via Direct Bank Transfer into registered employee account.', 55, netY + 30);

      // --- Footer ---
      doc.fillColor(slateLight).fontSize(7.5).font('Helvetica').text(
        'This is a system generated payslip generated by NEXUS — Payroll, without the paperwork. No signature is required.',
        40,
        760,
        { align: 'center', width: 515 }
      );

      doc.end();
    });
  }
}
