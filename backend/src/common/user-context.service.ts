import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class UserContextService {
  requireUserId(userId: string): string {
    if (!userId?.trim()) {
      throw new UnauthorizedException(
        'Chưa xác định người dùng. Gửi header X-User-Id hoặc đăng nhập.',
      );
    }
    return userId;
  }
}
