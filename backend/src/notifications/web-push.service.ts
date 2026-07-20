import { Injectable, Logger } from '@nestjs/common';
import webPush, { PushSubscription as WebPushSubscription } from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private readonly enabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    this.enabled = Boolean(publicKey && privateKey);
    if (this.enabled) {
      webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@sicom.com.vn',
        publicKey!,
        privateKey!,
      );
    } else {
      this.logger.warn('Web Push disabled: missing VAPID keys');
    }
  }

  getPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || '' };
  }

  subscribe(userId: string, dto: PushSubscriptionDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: { userId, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
      update: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth },
    });
  }

  unsubscribe(userId: string, endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  async send(userId: string, payload: { title: string; message?: string | null; link?: string | null }) {
    if (!this.enabled) return;
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.allSettled(subscriptions.map(async (subscription) => {
      const target: WebPushSubscription = {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      };
      try {
        await webPush.sendNotification(target, JSON.stringify({
          title: payload.title,
          body: payload.message || 'Bạn có thông báo mới',
          url: payload.link || '/',
          icon: '/app-icon-192.png',
        }));
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await this.prisma.pushSubscription.delete({ where: { endpoint: subscription.endpoint } });
          return;
        }
        this.logger.warn(`Push failed: ${error?.message || error}`);
      }
    }));
  }
}
