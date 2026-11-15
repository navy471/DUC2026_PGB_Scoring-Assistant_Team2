import { Global, Module } from '@nestjs/common';
import { SharesController } from './shares.controller.js';
import { SharesService } from './shares.service.js';

@Global()
@Module({
  controllers: [SharesController],
  providers: [SharesService],
  exports: [SharesService],
})
export class SharesModule {}

