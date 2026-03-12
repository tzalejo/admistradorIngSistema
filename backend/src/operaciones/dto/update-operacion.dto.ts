import { PartialType } from '@nestjs/swagger';
import { CreateOperacionDto } from './create-operacion.dto';

export class UpdateOperacionDto extends PartialType(CreateOperacionDto) {}
