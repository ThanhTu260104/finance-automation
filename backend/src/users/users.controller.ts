import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { SetUserStatusDto } from './dto/set-user-status.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @CurrentUserId() currentUserId: string,
    @Body() dto: SetUserStatusDto,
  ) {
    return this.usersService.setStatus(id, currentUserId, dto.isActive);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUserId() currentUserId: string,
  ) {
    return this.usersService.remove(id, currentUserId);
  }
}
