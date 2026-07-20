import { Body, Controller, Get, Param, Post, Query, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';
import { NotificationsStreamService } from './notifications-stream.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';
import { WebPushService } from './web-push.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationStream: NotificationsStreamService,
    private readonly webPush: WebPushService,
  ) {}

  @Get('push/public-key')
  pushPublicKey() {
    return this.webPush.getPublicKey();
  }

  @Post('push/subscribe')
  subscribe(@CurrentUserId() userId: string, @Body() dto: PushSubscriptionDto) {
    return this.webPush.subscribe(userId, dto);
  }

  @Post('push/unsubscribe')
  unsubscribe(@CurrentUserId() userId: string, @Body('endpoint') endpoint: string) {
    return this.webPush.unsubscribe(userId, endpoint);
  }

  @Sse('stream')
  stream(@Query('userId') rawUserId: string) {
    const userId = rawUserId?.trim();
    if (!userId) {
      throw new Error('Thiếu userId cho kết nối thông báo realtime');
    }
    return this.notificationStream.eventsFor(userId);
  }

  @Get()
  async findAll(
    @CurrentUserId() userId: string,
    @Query('unread') unread?: string,
    @Query('type') type?: string,
  ) {
    const unreadOnly = unread === '1' || unread === 'true';
    const rows = await this.notificationsService.findAll(userId, unreadOnly, type);
    // normalize legacy admin links to public paths
    return rows.map((r) => ({
      ...r,
      link: typeof r.link === 'string' ? r.link.replace(/^\/admin\/proposals\//, '/proposals/') : r.link,
    }));
  }

  @Post()
  create(@CurrentUserId() userId: string | undefined, @Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(userId, dto);
  }

  @Post(':id/read')
  markRead(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(userId, id);
  }

  @Post('mark-all-read')
  markAllRead(@CurrentUserId() userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
