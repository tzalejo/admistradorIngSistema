import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MonedasModule } from './monedas/monedas.module';
import { PrestamosModule } from './prestamos/prestamos.module';
import { OperacionesModule } from './operaciones/operaciones.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CierreCajaModule } from './cierre-caja/cierre-caja.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),
    AuthModule,
    UsersModule,
    MonedasModule,
    PrestamosModule,
    OperacionesModule,
    DashboardModule,
    CierreCajaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
