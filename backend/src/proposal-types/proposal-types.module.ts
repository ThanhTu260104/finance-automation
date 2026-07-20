import { Module } from '@nestjs/common';
import { ProposalTypesController } from './proposal-types.controller';
import { ProposalTypesService } from './proposal-types.service';

@Module({
  controllers: [ProposalTypesController],
  providers: [ProposalTypesService],
  exports: [ProposalTypesService],
})
export class ProposalTypesModule {}
