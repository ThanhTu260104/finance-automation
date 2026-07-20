import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsStreamService } from './notifications-stream.service';
import { WebPushService } from './web-push.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsScheduler,
    NotificationsStreamService,
    WebPushService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
