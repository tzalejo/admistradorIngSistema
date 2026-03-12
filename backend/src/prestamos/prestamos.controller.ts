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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrestamosService } from './prestamos.service';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { UpdatePrestamoDto } from './dto/update-prestamo.dto';
import { UpdateCuotaDto } from './dto/update-cuota.dto';

@ApiTags('Prestamos')
@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly prestamosService: PrestamosService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar nuevo préstamo recibido' })
  create(@Body() dto: CreatePrestamoDto) {
    return this.prestamosService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los préstamos' })
  findAll() {
    return this.prestamosService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un préstamo con sus cuotas' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosService.findOne(id);
  }

  @Get(':id/resumen')
  @ApiOperation({ summary: 'Resumen financiero de un préstamo' })
  getResumen(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosService.getResumenPrestamo(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar estado/datos de un préstamo' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrestamoDto,
  ) {
    return this.prestamosService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un préstamo' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosService.remove(id);
  }

  // --- Cuotas ---

  @Get(':id/cuotas')
  @ApiOperation({ summary: 'Listar cuotas de un préstamo' })
  findCuotas(@Param('id', ParseUUIDPipe) id: string) {
    return this.prestamosService.findCuotas(id);
  }

  @Patch('cuotas/:cuotaId')
  @ApiOperation({ summary: 'Actualizar una cuota (tasa, pago, estado)' })
  updateCuota(
    @Param('cuotaId', ParseUUIDPipe) cuotaId: string,
    @Body() dto: UpdateCuotaDto,
  ) {
    return this.prestamosService.updateCuota(cuotaId, dto);
  }
}
