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
  async sendPasswordResetCode(account: {
    email: string;
    fullName: string;
    code: string;
  }): Promise<EmailDeliveryResult> {
    if (!appEnv.smtpHost || !appEnv.smtpUser || !appEnv.smtpPassword || !appEnv.smtpFrom) {
      return { sent: false, error: 'SMTP chưa được cấu hình' };
    }
    const transporter = this.createTransporter();
    try {
      await transporter.sendMail({
        from: appEnv.smtpFrom,
        replyTo: appEnv.smtpReplyTo || appEnv.smtpUser,
        to: account.email,
        subject: '[SAW Requests] Mã xác thực đổi mật khẩu',
        text: `Xin chào ${account.fullName},\n\nMã xác thực đổi mật khẩu của bạn là: ${account.code}\nMã có hiệu lực trong 10 phút. Không cung cấp mã này cho người khác.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Đổi mật khẩu SAW Requests</h2><p>Xin chào <strong>${this.escapeHtml(account.fullName)}</strong>,</p><p>Mã xác thực của bạn:</p><div style="font-size:30px;font-weight:700;letter-spacing:8px;background:#f1f5f9;padding:16px;text-align:center;border-radius:12px">${account.code}</div><p>Mã có hiệu lực trong 10 phút. Không cung cấp mã này cho người khác.</p></div>`,
      });
      return { sent: true };
    } catch (error) {
      return { sent: false, error: error instanceof Error ? error.message : 'Không gửi được email' };
    }
  }

  private createTransporter() {
    return nodemailer.createTransport({
      host: appEnv.smtpHost,
      port: appEnv.smtpPort,
      secure: appEnv.smtpSecure,
      requireTLS: !appEnv.smtpSecure,
      tls: { minVersion: 'TLSv1.2' },
      auth: { user: appEnv.smtpUser, pass: appEnv.smtpPassword },
    });
  }

  async sendWelcomeEmail(account: WelcomeAccount): Promise<EmailDeliveryResult> {
    if (
      !appEnv.smtpHost ||
      !appEnv.smtpUser ||
      !appEnv.smtpPassword ||
      !appEnv.smtpFrom
    ) {
      return { sent: false, error: 'SMTP chưa được cấu hình' };
    }

    const transporter = this.createTransporter();

    try {
      await transporter.sendMail({
        from: appEnv.smtpFrom,
        replyTo: appEnv.smtpReplyTo || appEnv.smtpUser,
        envelope: {
          from: appEnv.smtpUser,
          to: account.email,
        },
        to: account.email,
        subject: '[SAW Requests] Thông tin đăng nhập tài khoản',
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
      'Đây là email giao dịch được gửi vì quản trị viên đã tạo tài khoản cho bạn.',
      '',
      'TRẦN THANH TÚ',
      'SICOM INVESTMENT CONSTRUCTION JSC (SICOM)',
      '42/30 Hoàng Diệu, Phường Xóm Chiếu, Thành phố Hồ Chí Minh',
      'Mobile: 0968549276 | Email: tr.thanhtu.dev@gmail.com',
      'Website: https://www.sicom.com.vn',
    ].join('\n');
  }

  private html(account: WelcomeAccount) {
    const name = this.escapeHtml(account.fullName);
    const email = this.escapeHtml(account.email);
    const password = account.password ? this.escapeHtml(account.password) : undefined;
    const loginUrl = `${appEnv.frontendUrl.replace(/\/+$/, '')}/login`;

    return `
      <div style="font-family:'Google Sans',Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b">
        <div style="display:none;max-height:0;overflow:hidden;color:transparent">
          Thông tin đăng nhập tài khoản SAW Requests của bạn.
        </div>
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
        <div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:16px;color:#64748b;font-size:13px">
          <p>Email giao dịch này được gửi vì quản trị viên đã tạo tài khoản SAW Requests cho bạn.</p>
        </div>
        <div style="border-top:1px solid #94a3b8;margin-top:18px;padding-top:16px;color:#2f7028;font-family:'Google Sans',Arial,sans-serif;font-size:15px;line-height:1.55">
          <p style="margin:0;font-weight:700">TRẦN THANH TÚ</p>
          <p style="margin:0">SICOM INVESTMENT CONSTRUCTION JSC (SICOM)</p>
          <p style="margin:0">42/30 Hoàng Diệu, Phường Xóm Chiếu, Thành phố Hồ Chí Minh</p>
          <p style="margin:0">
            Mobile: 0968549276 |
            Email: <a href="mailto:tr.thanhtu.dev@gmail.com" style="color:#1457c5">tr.thanhtu.dev@gmail.com</a> |
          </p>
          <p style="margin:0">
            Website: <a href="https://www.sicom.com.vn" style="color:#1457c5">www.sicom.com.vn</a>
          </p>
        </div>
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
