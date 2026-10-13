import { prisma } from '../../config/prisma';

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: string;
  htmlBody: string;
  metadata?: Record<string, any>;
}

export class EmailService {
  private static getFrontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  /**
   * Sends a transactional email and records it in EmailLog.
   * Supports real webhook/SMTP relay when configured, and safe database outbox persistence.
   * If recipient ends with `.invalid` or starts with `fail-delivery@`, marks status as FAILED to support error & retry testing.
   */
  static async sendEmail(options: SendEmailOptions) {
    const { to, subject, template, htmlBody, metadata } = options;

    let status = 'SENT';
    let errorMsg: string | null = null;

    try {
      if (!to || !to.includes('@') || to.endsWith('.invalid') || to.startsWith('fail-delivery@')) {
        throw new Error(`Invalid or unreachable recipient address: ${to}`);
      }

      // Optional webhook/HTTP transactional email provider (e.g., Resend / SendGrid / custom relay)
      if (process.env.EMAIL_WEBHOOK_URL && process.env.NODE_ENV === 'production') {
        const response = await fetch(process.env.EMAIL_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.EMAIL_API_KEY ? { Authorization: `Bearer ${process.env.EMAIL_API_KEY}` } : {}),
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || 'NEXUS Payroll <no-reply@nexuspayroll.in>',
            to,
            subject,
            html: htmlBody,
          }),
        });
        if (!response.ok) {
          throw new Error(`Email provider returned HTTP ${response.status}`);
        }
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMsg = err.message || 'Email delivery failed';
    }

    const log = await prisma.emailLog.create({
      data: {
        to,
        subject,
        template,
        htmlBody,
        status,
        error: errorMsg,
        metadata: metadata || {},
      },
    });

    return log;
  }

  static async sendWelcomeActivationEmail(params: {
    to: string;
    name: string;
    role: string;
    activationToken: string;
    tempPassword?: string;
  }) {
    const activationLink = `${this.getFrontendUrl()}/login?mode=activate&token=${encodeURIComponent(params.activationToken)}&email=${encodeURIComponent(params.to)}`;
    const htmlBody = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Welcome to NEXUS Payroll</h2>
        <p style="color: #475569;">Hello <strong>${params.name}</strong>,</p>
        <p style="color: #475569;">Your <strong>${params.role}</strong> account has been provisioned on NEXUS — <em>Payroll, without the paperwork.</em></p>
        ${params.tempPassword ? `<p style="color: #475569;">Temporary Password: <code>${params.tempPassword}</code></p>` : ''}
        <p style="margin: 24px 0;">
          <a href="${activationLink}" style="background: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">Activate Account & Set Password</a>
        </p>
        <p style="color: #64748b; font-size: 12px;">This activation token expires in 48 hours.</p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: 'Welcome to NEXUS Payroll — Activate Your Account',
      template: 'WELCOME_ACTIVATION',
      htmlBody,
      metadata: { role: params.role, activationLink },
    });
  }

  static async sendPasswordResetEmail(params: {
    to: string;
    name: string;
    resetToken: string;
  }) {
    const resetLink = `${this.getFrontendUrl()}/login?mode=reset&token=${encodeURIComponent(params.resetToken)}&email=${encodeURIComponent(params.to)}`;
    const htmlBody = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">NEXUS Password Reset Request</h2>
        <p style="color: #475569;">Hello <strong>${params.name}</strong>,</p>
        <p style="color: #475569;">We received a request to reset your NEXUS account password. Use the button or token below to set a new password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}" style="background: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
        </p>
        <p style="color: #475569; font-size: 13px;">Reset Token: <code>${params.resetToken}</code></p>
        <p style="color: #64748b; font-size: 12px;">This single-use link expires in 30 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: 'NEXUS Payroll — Password Reset Instructions',
      template: 'PASSWORD_RESET',
      htmlBody,
      metadata: { resetLink, resetToken: params.resetToken },
    });
  }

  static async sendPasswordResetConfirmationEmail(params: { to: string; name: string }) {
    const htmlBody = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Your NEXUS Password Was Updated</h2>
        <p style="color: #475569;">Hello <strong>${params.name}</strong>,</p>
        <p style="color: #475569;">Your NEXUS account password has been successfully changed. If you did not perform this action, please contact your administrator immediately.</p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: 'NEXUS Payroll — Password Changed Confirmation',
      template: 'PASSWORD_RESET_CONFIRMATION',
      htmlBody,
    });
  }

  static async sendLeaveNotificationEmail(params: {
    to: string;
    employeeName: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    days: number;
    status: 'APPLIED' | 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  }) {
    const subjectMap = {
      APPLIED: `Leave Request Submitted: ${params.employeeName} (${params.days} days)`,
      APPROVED: `Your Leave Request (${params.leaveType}) Has Been Approved`,
      REJECTED: `Your Leave Request (${params.leaveType}) Was Rejected`,
    };
    const templateMap = {
      APPLIED: 'LEAVE_APPLIED',
      APPROVED: 'LEAVE_APPROVED',
      REJECTED: 'LEAVE_REJECTED',
    };

    const htmlBody = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a;">Leave Request — ${params.status}</h2>
        <p style="color: #475569;"><strong>Employee:</strong> ${params.employeeName}</p>
        <p style="color: #475569;"><strong>Leave Type:</strong> ${params.leaveType}</p>
        <p style="color: #475569;"><strong>Duration:</strong> ${params.fromDate} to ${params.toDate} (${params.days} day(s))</p>
        ${params.rejectionReason ? `<p style="color: #dc2626;"><strong>Reason:</strong> ${params.rejectionReason}</p>` : ''}
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: subjectMap[params.status],
      template: templateMap[params.status],
      htmlBody,
      metadata: params,
    });
  }

  static async sendPayrollWorkflowEmail(params: {
    to: string;
    month: number;
    year: number;
    action: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    totalEmployees: number;
    totalNet: number;
    reason?: string;
  }) {
    const period = `${new Date(2000, params.month - 1).toLocaleString('default', { month: 'long' })} ${params.year}`;
    const subjectMap = {
      SUBMITTED: `Action Required: Payroll Run for ${period} Submitted for Approval`,
      APPROVED: `Payroll Run for ${period} Approved by Admin`,
      REJECTED: `Payroll Run for ${period} Rejected — Action Required`,
    };
    const templateMap = {
      SUBMITTED: 'PAYROLL_SUBMITTED',
      APPROVED: 'PAYROLL_APPROVED',
      REJECTED: 'PAYROLL_REJECTED',
    };

    const htmlBody = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a;">Payroll Workflow Update (${period})</h2>
        <p style="color: #475569;">Status: <strong>${params.action}</strong></p>
        <p style="color: #475569;">Employees Processed: <strong>${params.totalEmployees}</strong></p>
        <p style="color: #475569;">Total Net Payout: <strong>INR ${params.totalNet.toLocaleString('en-IN')}</strong></p>
        ${params.reason ? `<p style="color: #dc2626;"><strong>Rejection Reason:</strong> ${params.reason}</p>` : ''}
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: subjectMap[params.action],
      template: templateMap[params.action],
      htmlBody,
      metadata: params,
    });
  }

  static async sendPayslipDeliveryEmail(params: {
    to: string;
    employeeName: string;
    employeeCode: string;
    month: number;
    year: number;
    payslipNumber: string;
    netSalary: number;
    payslipId: string;
  }) {
    const period = `${new Date(2000, params.month - 1).toLocaleString('default', { month: 'long' })} ${params.year}`;
    const portalLink = `${this.getFrontendUrl()}/employee/payslips`;
    const htmlBody = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a;">Your Payslip for ${period} is Ready</h2>
        <p style="color: #475569;">Hello <strong>${params.employeeName}</strong> (${params.employeeCode}),</p>
        <p style="color: #475569;">Your salary payslip (<code>${params.payslipNumber}</code>) for <strong>${period}</strong> has been generated and published.</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; color: #0f172a; font-size: 16px;"><strong>Net Take-Home Pay:</strong> INR ${params.netSalary.toLocaleString('en-IN')}</p>
        </div>
        <p style="margin: 24px 0;">
          <a href="${portalLink}" style="background: #2563eb; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">View & Download Payslip PDF</a>
        </p>
      </div>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `NEXUS Payslip for ${period} (${params.payslipNumber})`,
      template: 'PAYSLIP_DELIVERY',
      htmlBody,
      metadata: params,
    });
  }

  static async listLogs(limit = 50) {
    return prisma.emailLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
  }
}
