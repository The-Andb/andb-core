import { Module } from '@nestjs/common';
import { ExporterService } from './exporter.service';
import { DriverModule } from '../driver/driver.module';
import { ProjectConfigModule } from '../config/project-config.module';
import { ParserModule } from '../parser/parser.module';
import { EXPORTER_SERVICE } from '../../common/constants/tokens';

@Module({
  imports: [DriverModule, ProjectConfigModule, ParserModule],
  providers: [
    ExporterService,
    {
      provide: EXPORTER_SERVICE,
      useExisting: ExporterService,
    },
  ],
  exports: [ExporterService, EXPORTER_SERVICE],
})
export class ExporterModule { }
