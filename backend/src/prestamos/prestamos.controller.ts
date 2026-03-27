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
  ParseIntPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrestamosService } from './prestamos.service';
import { CreatePrestamoDto } from './dto/create-prestamo.dto';
import { UpdatePrestamoDto } from './dto/update-prestamo.dto';
import { UpdateCuotaDto } from './dto/update-cuota.dto';
import { PagarCuotaDto } from './dto/pagar-cuota.dto';
import { UpdatePagoCuotaDto } from './dto/update-pago-cuota.dto';

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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosService.findOne(id);
  }

  @Get(':id/resumen')
  @ApiOperation({ summary: 'Resumen financiero de un préstamo' })
  getResumen(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosService.getResumenPrestamo(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar estado/datos de un préstamo' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrestamoDto,
  ) {
    return this.prestamosService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un préstamo' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosService.remove(id);
  }

  // --- Cuotas ---

  @Get(':id/cuotas')
  @ApiOperation({ summary: 'Listar cuotas de un préstamo' })
  findCuotas(@Param('id', ParseIntPipe) id: number) {
    return this.prestamosService.findCuotas(id);
  }

  @Post('cuotas/:cuotaId/pagar')
  @ApiOperation({ summary: 'Registrar pago (parcial o total) de una cuota con carry-over automático' })
  pagarCuota(
    @Param('cuotaId', ParseIntPipe) cuotaId: number,
    @Body() dto: PagarCuotaDto,
  ) {
    return this.prestamosService.pagarCuota(cuotaId, dto);
  }

  @Patch('cuotas/:cuotaId')
  @ApiOperation({ summary: 'Actualizar una cuota (tasa, pago, estado)' })
  updateCuota(
    @Param('cuotaId', ParseIntPipe) cuotaId: number,
    @Body() dto: UpdateCuotaDto,
  ) {
    return this.prestamosService.updateCuota(cuotaId, dto);
  }

  // --- Pagos individuales ---

  @Get('cuotas/:cuotaId/pagos')
  @ApiOperation({ summary: 'Listar pagos de una cuota' })
  findPagosByCuota(@Param('cuotaId', ParseIntPipe) cuotaId: number) {
    return this.prestamosService.findPagosByCuota(cuotaId);
  }

  @Patch('pagos/:pagoId')
  @ApiOperation({ summary: 'Editar un pago individual (recalcula la cuota)' })
  updatePago(
    @Param('pagoId', ParseIntPipe) pagoId: number,
    @Body() dto: UpdatePagoCuotaDto,
  ) {
    return this.prestamosService.updatePago(pagoId, dto);
  }

  @Delete('pagos/:pagoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un pago individual (recalcula la cuota)' })
  deletePago(@Param('pagoId', ParseIntPipe) pagoId: number) {
    return this.prestamosService.deletePago(pagoId);
  }
}
