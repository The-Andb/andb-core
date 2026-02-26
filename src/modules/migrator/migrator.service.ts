import { Injectable } from '@nestjs/common';
import { ITableDiff, ISchemaDiff, IObjectDiff } from '../../common/interfaces/diff.interface';
import { IMigrator } from '../../common/interfaces/driver.interface';

@Injectable()
export class MigratorService {
  generateAlterSQL(diff: ITableDiff, migrator: IMigrator): string[] {
    return migrator.generateTableAlterSQL(diff);
  }

  generateObjectSQL(obj: IObjectDiff, migrator: IMigrator): string[] {
    return migrator.generateObjectSQL(obj);
  }

  generateSchemaSQL(schemaDiff: ISchemaDiff, migrator: IMigrator): string[] {
    const allStatements: string[] = [];

    // 1. Drop Objects (Views, Procedures, etc.) - To avoid dependency issues if replaced
    // and Tables (Dropped)
    for (const tableName of schemaDiff.droppedTables) {
      // TODO: Dialect quoting should be handled by the Migrator as well eventually
      allStatements.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    }

    const dropOperations = schemaDiff.objects.filter((obj) => obj.operation === 'DROP');
    for (const obj of dropOperations) {
      allStatements.push(...migrator.generateObjectSQL(obj));
    }

    // 2. Table Alters
    for (const tableName in schemaDiff.tables) {
      const tableDiff = schemaDiff.tables[tableName];
      allStatements.push(...migrator.generateTableAlterSQL(tableDiff));
    }

    // 3. Create/Replace Objects
    const createReplaceOperations = schemaDiff.objects.filter((obj) => obj.operation !== 'DROP');
    for (const obj of createReplaceOperations) {
      allStatements.push(...migrator.generateObjectSQL(obj));
    }

    return allStatements;
  }
}
