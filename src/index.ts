import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export * from './common/constants/tokens';
export * from './common/interfaces/connection.interface';
export * from './common/interfaces/driver.interface';
export * from './core-bridge';
export { Container } from './core-bridge';
export { AppModule } from './app.module';

export async function bootstrapCore() {
  const app = await NestFactory.createApplicationContext(AppModule);
  return app;
}

export * from './modules/storage/storage.service';
export * from './modules/storage/storage.module';
export * from './modules/config/project-config.service';
export * from './modules/config/project-config.module';
export * from './modules/driver/driver-factory.service';
export * from './modules/driver/driver.module';
export * from './modules/comparator/comparator.service';
export * from './modules/comparator/comparator.module';
export * from './modules/migrator/migrator.service';
export * from './modules/migrator/migrator.module';
export * from './modules/migrator/mysql/mysql.migrator';
export * from './modules/exporter/exporter.service';
export * from './modules/exporter/exporter.module';
export * from './modules/reporter/reporter.service';
export * from './modules/reporter/reporter.module';
export * from './modules/parser/parser.service';
export * from './modules/parser/parser.module';
export * from './modules/orchestration/orchestration.module';
export * from './modules/orchestration/orchestration.service';
