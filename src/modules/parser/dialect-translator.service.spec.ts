import { ParserService } from './parser.service';
import { DialectTranslatorService } from './dialect-translator.service';

describe('DialectTranslatorService', () => {
  let translator: DialectTranslatorService;

  beforeEach(() => {
    const parser = new ParserService();
    translator = new DialectTranslatorService(parser);
  });

  it('should translate MySQL CREATE TABLE to PostgreSQL syntax', () => {
    const mysqlDDL = `
      CREATE TABLE \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`username\` varchar(50) NOT NULL,
        \`email\` varchar(255) DEFAULT NULL,
        \`status\` enum('active', 'inactive', 'pending') DEFAULT 'pending',
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB;
    `;

    const pgDDL = translator.translateTable(mysqlDDL, 'mysql', 'postgres');

    expect(pgDDL).toContain('CREATE TABLE "users"');
    expect(pgDDL).toContain('"id" SERIAL NOT NULL');
    expect(pgDDL).toContain('"username" VARCHAR(50) NOT NULL');
    expect(pgDDL).toContain('"email" VARCHAR(255) DEFAULT NULL');
    expect(pgDDL).toContain('"status" VARCHAR(255) DEFAULT \'pending\' CHECK ("status" IN (\'active\',\'inactive\',\'pending\'))');
    expect(pgDDL).toContain('CONSTRAINT "users_pkey" PRIMARY KEY ("id")');
  });

  it('should translate MySQL CREATE TABLE to SQLite syntax', () => {
    const mysqlDDL = `
      CREATE TABLE \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`username\` varchar(50) NOT NULL,
        PRIMARY KEY (\`id\`)
      );
    `;

    const sqliteDDL = translator.translateTable(mysqlDDL, 'mysql', 'sqlite');

    expect(sqliteDDL).toContain('CREATE TABLE "users"');
    expect(sqliteDDL).toContain('"id" INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(sqliteDDL).toContain('"username" TEXT NOT NULL');
  });
});
