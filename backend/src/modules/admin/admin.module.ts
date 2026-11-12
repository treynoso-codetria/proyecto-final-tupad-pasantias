import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

// Administration panel and moderation (M11). The catalog management of the
// panel (categories and tags) lives in CatalogModule.
@Module({
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
