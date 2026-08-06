import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AccountEmailService } from './account-email.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AccountEmailService],
  exports: [UsersService, AccountEmailService],
})
export class UsersModule {}
