import nodemailer, { Transporter } from 'nodemailer';
import { prisma } from '../../config/prisma';
import { config } from '../../config';

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: string;
  htmlBody: string;
  metadata?: Record<string, any>;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  private static getFrontendUrl(): string {
    return config.frontendUrl || 'http://localhost:5173';
  }

  /**
   * Initializes or returns the nodemailer transporter.
   * If SMTP host/user or service is configured in config.email, creates a real transport.
   */
  private static getTransporter(): Transporter | null {
    const { host, port, secure, user, pass, service } = config.email;

    if (user && pass && (host || service)) {
      if (!this.transporter) {
        if (service) {
          this.transporter = nodemailer.createTransport({
            service,
            auth: { user, pass },
          });
        } else {
          this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
            tls: {
              rejectUnauthorized: false,
            },
          });
        }
      }
      return this.transporter;
    }

    return null;
  }

  /**
   * Resets cached transporter (useful after editing credentials)
   */
  static resetTransporter() {
    this.transporter = null;
  }

  /**
   * Check connection status of SMTP
   */
  static async verifyConnection(): Promise<{
    configured: boolean;
    valid: boolean;
    host?: string;
    user?: string;
    message: string;
    details?: string;
  }> {
    const { host, user, pass, service } = config.email;
    const isConfigured = Boolean(user && pass && (host || service));

    if (!isConfigured) {
      return {
        configured: false,
        valid: false,
        message: 'SMTP credentials are not configured in .env',
        details: 'To send real emails, set SMTP_HOST (or SMTP_SERVICE=gmail), SMTP_PORT, SMTP_USER, and SMTP_PASS in your .env file.',
      };
    }

    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        return {
          configured: false,
          valid: false,
          message: 'Transporter could not be created from configuration.',
        };
      }

      await transporter.verify();
      return {
        configured: true,
        valid: true,
        host: host || service,
        user,
        message: 'SMTP server is reachable and credentials are verified successfully.',
      };
    } catch (err: any) {
      let advice = '';
      if (err.message?.includes('Username and Password not accepted') || err.code === 'EAUTH') {
        advice = 'Authentication failed. If using Gmail, you must use a 16-character App Password (Google Account > Security > 2-Step Verification > App Passwords), NOT your normal email password.';
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        advice = 'Could not connect to SMTP server. Please verify SMTP_HOST and SMTP_PORT, and check your network/firewall.';
      }

      return {
        configured: true,
        valid: false,
        host: host || service,
        user,
        message: err.message || 'SMTP connection verification failed.',
        details: advice || err.toString(),
      };
    }
  }

  /**
   * Sends a transactional email and records it in EmailLog.
   * Uses real SMTP relay when configured, or logs to database outbox in development.
   */
  static async sendEmail(options: SendEmailOptions) {
    const { to, subject, template, htmlBody, metadata } = options;

    let status = 'SENT';
    let errorMsg: string | null = null;
    let deliveryInfo: any = {};

    try {
      if (!to || !to.includes('@') || to.endsWith('.invalid') || to.startsWith('fail-delivery@')) {
        throw new Error(`Invalid or unreachable recipient address: ${to}`);
      }

      const transporter = this.getTransporter();

      if (transporter) {
        // Real SMTP Delivery
        const fromAddress = config.email.from;
        const info = await transporter.sendMail({
          from: fromAddress,
          to,
          subject,
          html: htmlBody,
          text: htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        });

        deliveryInfo = {
          mode: 'SMTP',
          messageId: info.messageId,
          response: info.response,
        };

        console.log(`[NEXUS EMAIL] Successfully sent email to ${to} via SMTP (Message-ID: ${info.messageId})`);
      } else if (config.email.webhookUrl && config.nodeEnv === 'production') {
        // Optional webhook/HTTP transactional email provider
        const response = await fetch(config.email.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.email.apiKey ? { Authorization: `Bearer ${config.email.apiKey}` } : {}),
          },
          body: JSON.stringify({
            from: config.email.from,
            to,
            subject,
            html: htmlBody,
          }),
        });
        if (!response.ok) {
          throw new Error(`Email provider returned HTTP ${response.status}`);
        }
        deliveryInfo = { mode: 'WEBHOOK', status: response.status };
      } else {
        // Safe outbox simulation when SMTP is not configured
        deliveryInfo = {
          mode: 'SIMULATED',
          notice: 'SMTP credentials not configured in .env. Logged to database outbox.',
        };

        console.log(`\n================== [NEXUS EMAIL OUTBOX] ==================`);
        console.log(`📨 Recipient: ${to}`);
        console.log(`📋 Subject:   ${subject}`);
        console.log(`🏷️  Template:  ${template}`);
        console.log(`⚠️  Status:    SMTP not configured in .env (SIMULATED OUTBOX)`);
        if (metadata && (metadata.activationLink || metadata.resetLink || metadata.resetToken)) {
          console.log(`🔗 Link/Token: ${metadata.activationLink || metadata.resetLink || metadata.resetToken}`);
        }
        console.log(`💡 To deliver real emails to inboxes, set SMTP_HOST & SMTP_PASS in .env`);
        console.log(`==========================================================\n`);
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMsg = err.message || 'Email delivery failed';
      console.error(`[NEXUS EMAIL ERROR] Failed to send email to ${to}:`, err.message);
    }

    const log = await prisma.emailLog.create({
      data: {
        to,
        subject,
        template,
        htmlBody,
        status,
        error: errorMsg,
        metadata: {
          ...(metadata || {}),
          delivery: deliveryInfo,
        },
      },
    });

    return log;
  }

  static async sendTestEmail(targetEmail: string) {
    const timestamp = new Date().toLocaleString();
    const htmlBody = `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #2563eb; margin-bottom: 8px;">NEXUS SMTP Test Email</h2>
        <p style="color: #475569;">Hello,</p>
        <p style="color: #475569;">If you are reading this email, your NEXUS SMTP configuration is working perfectly!</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #cbd5e1;">
          <p style="margin: 0; color: #0f172a; font-size: 14px;"><strong>Sent At:</strong> ${timestamp}</p>
          <p style="margin: 4px 0 0 0; color: #0f172a; font-size: 14px;"><strong>Sender:</strong> ${config.email.from}</p>
        </div>
        <p style="color: #64748b; font-size: 12px;">NEXUS — Payroll, without the paperwork.</p>
      </div>
    `;

    return this.sendEmail({
      to: targetEmail,
      subject: `NEXUS SMTP Test — ${timestamp}`,
      template: 'TEST_EMAIL',
      htmlBody,
      metadata: { test: true },
    });
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
