const { ParserService } = require('../dist/modules/parser/parser.service');
const parser = new ParserService();
const fs = require('fs');

const ddl = fs.readFileSync('/Volumes/FlexibleWorkplace/side-pr/TheAndbData/projects/flo_api/DEV/mysql/preflow_41/tables/mail_identifiers.sql', 'utf8');
const result = parser.parseTableDetailed(ddl);

console.log('Parsed Table Name:', result.tableName);
console.log('Parsed Columns:', result.columns.map(c => ({ name: c.name, type: c.type, rawDefinition: c.rawDefinition })));
console.log('Parsed Indexes:', result.indexes);
console.log('Parsed Foreign Keys:', result.foreignKeys);
console.log('Parsed Partitions:', result.partitions);
