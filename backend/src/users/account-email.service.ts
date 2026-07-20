import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { appEnv } from '../config/app-env';

type WelcomeAccount = {
  email: string;
  fullName: string;
  password?: string;
};

export type EmailDeliveryResult =
  | { sent: true }
  | { sent: false; error: string };

@Injectable()
export class AccountEmailService {
  async sendWelcomeEmail(account: WelcomeAccount): Promise<EmailDeliveryResult> {
    if (
      !appEnv.smtpHost ||
      !appEnv.smtpUser ||
      !appEnv.smtpPassword ||
      !appEnv.smtpFrom
    ) {
      return { sent: false, error: 'SMTP chưa được cấu hình' };
    }

    const transporter = nodemailer.createTransport({
      host: appEnv.smtpHost,
      port: appEnv.smtpPort,
      secure: appEnv.smtpSecure,
      auth: {
        user: appEnv.smtpUser,
        pass: appEnv.smtpPassword,
      },
    });

    try {
      await transporter.sendMail({
        from: appEnv.smtpFrom,
        to: account.email,
        subject: 'Tài khoản SAW - REQUESTS của bạn',
        text: this.plainText(account),
        html: this.html(account),
      });
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không gửi được email';
      return { sent: false, error: message };
    }
  }

  private plainText(account: WelcomeAccount) {
    return [
      `Xin chào ${account.fullName},`,
      '',
      'Tài khoản SAW - REQUESTS của bạn đã được tạo.',
      `Email đăng nhập: ${account.email}`,
      ...(account.password ? [`Mật khẩu tạm thời: ${account.password}`] : []),
      `Đăng nhập tại: ${appEnv.frontendUrl}/login`,
      '',
      'Vui lòng đổi mật khẩu sau khi đăng nhập.',
      'Hỗ trợ: 0968549276',
    ].join('\n');
  }

  private html(account: WelcomeAccount) {
    const name = this.escapeHtml(account.fullName);
    const email = this.escapeHtml(account.email);
    const password = account.password ? this.escapeHtml(account.password) : undefined;
    const loginUrl = `${appEnv.frontendUrl.replace(/\/+$/, '')}/login`;

    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b">
        <h2 style="color:#059669">Tài khoản SAW - REQUESTS</h2>
        <p>Xin chào <strong>${name}</strong>,</p>
        <p>Tài khoản của bạn đã được tạo thành công.</p>
        <div style="background:#f1f5f9;border-radius:12px;padding:16px">
          <p style="margin:0 0 8px"><strong>Email:</strong> ${email}</p>
          ${password ? `<p style="margin:0"><strong>Mật khẩu tạm thời:</strong> ${password}</p>` : ''}
        </div>
        <p style="margin:24px 0">
          <a href="${loginUrl}" style="background:#059669;color:white;text-decoration:none;padding:12px 18px;border-radius:8px">Đăng nhập hệ thống</a>
        </p>
        <p>Vui lòng đổi mật khẩu sau khi đăng nhập.</p>
        <p style="color:#64748b">Hỗ trợ: 0968549276</p>
      </div>`;
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      };
      return entities[character];
    });
  }
}
