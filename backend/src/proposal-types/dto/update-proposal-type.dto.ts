import { PartialType } from '@nestjs/swagger';
import { CreateProposalTypeDto } from './create-proposal-type.dto';

export class UpdateProposalTypeDto extends PartialType(CreateProposalTypeDto) {}
