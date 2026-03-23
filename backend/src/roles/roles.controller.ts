import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol-usuario.enum';

@ApiTags('roles')
@ApiBearerAuth()
@Roles(RolUsuario.ADMIN)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  create(@Body() body: { nombre: string; descripcion?: string }) {
    return this.rolesService.create(body.nombre, body.descripcion);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nombre?: string; descripcion?: string },
  ) {
    return this.rolesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }
}
