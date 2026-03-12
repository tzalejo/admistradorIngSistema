import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonedasService } from './monedas.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Monedas')
@Controller('monedas')
export class MonedasController {
  constructor(private readonly monedasService: MonedasService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar monedas disponibles' })
  findAll() {
    return this.monedasService.findAll();
  }
}
