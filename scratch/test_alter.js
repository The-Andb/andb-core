const { ParserService } = require('../dist/modules/parser/parser.service');
const { ComparatorService } = require('../dist/modules/comparator/comparator.service');
const parser = new ParserService();
const mockConfigService = {
  getDomainNormalization: () => []
};
const comparator = new ComparatorService(parser, null, mockConfigService);
const fs = require('fs');

const srcDdl = fs.readFileSync('/Volumes/FlexibleWorkplace/side-pr/TheAndbData/projects/flo_api/DEV/mysql/preflow_41/tables/mail_identifiers.sql', 'utf8');
// Dest DDL with no indexes
const destDdl = srcDdl.replace(/,\s*(UNIQUE\s+)?KEY\s+.*?(?=\r?\n\))/gs, '');

console.log('DEST DDL WITHOUT INDEXES:');
console.log(destDdl);

const diff = comparator.compareTables(srcDdl, destDdl);
console.log('ALTER STATEMENTS GENERATED:');
console.log(diff.operations);
console.log(comparator.migrator.generateTableAlterSQL(diff));
