import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OperacionesService } from './operaciones.service';
import { CreateOperacionDto } from './dto/create-operacion.dto';
import { UpdateOperacionDto } from './dto/update-operacion.dto';

@ApiTags('Operaciones')
@Controller('operaciones')
export class OperacionesController {
  constructor(private readonly operacionesService: OperacionesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar operación de compra/venta' })
  create(@Body() dto: CreateOperacionDto) {
    return this.operacionesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar operaciones (opcionalmente filtrar por préstamo)' })
  @ApiQuery({ name: 'prestamoId', required: false, type: String })
  findAll(@Query('prestamoId') prestamoId?: string) {
    return this.operacionesService.findAll(prestamoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una operación' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.operacionesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una operación' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperacionDto,
  ) {
    return this.operacionesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una operación' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.operacionesService.remove(id);
  }
}
