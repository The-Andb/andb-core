import { Module } from '@nestjs/common';
import { ComparatorService } from './comparator.service';
import { ParserModule } from '../parser/parser.module';
import { StorageModule } from '../storage/storage.module';
import { ProjectConfigModule } from '../config/project-config.module';
import { COMPARATOR_SERVICE } from '../../common/constants/tokens';

@Module({
  imports: [ParserModule, StorageModule, ProjectConfigModule],
  providers: [
    ComparatorService,
    {
      provide: COMPARATOR_SERVICE,
      useExisting: ComparatorService,
    },
  ],
  exports: [ComparatorService, COMPARATOR_SERVICE],
})
export class ComparatorModule { }
