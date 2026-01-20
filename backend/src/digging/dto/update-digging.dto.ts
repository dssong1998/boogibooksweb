import { PartialType } from '@nestjs/mapped-types';
import { CreateDiggingDto } from './create-digging.dto';

export class UpdateDiggingDto extends PartialType(CreateDiggingDto) {}
