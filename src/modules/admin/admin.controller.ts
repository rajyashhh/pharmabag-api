import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users/pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get pending KYC approval users' })
  @ApiResponse({ status: 200, description: 'Pending users list returned' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  async getPendingUsers() {
    const data = await this.adminService.getPendingUsers();
    return { message: 'Pending users retrieved successfully', data };
  }

  @Patch('users/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a user KYC' })
  @ApiResponse({ status: 200, description: 'User approved' })
  async approveUser(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminService.approveUser(id);
    return { message: 'User approved successfully', data };
  }

  @Patch('users/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a user KYC' })
  @ApiResponse({ status: 200, description: 'User rejected' })
  async rejectUser(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.adminService.rejectUser(id);
    return { message: 'User rejected successfully', data };
  }

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get admin dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics returned' })
  async getDashboard() {
    const data = await this.adminService.getDashboard();
    return { message: 'Dashboard metrics retrieved', data };
  }
}
