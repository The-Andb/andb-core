
import { MysqlDriver } from '../src/modules/driver/mysql/mysql.driver';
import { ParserService } from '../src/modules/parser/parser.service';
import { ComparatorService } from '../src/modules/comparator/comparator.service';
import { MigratorService } from '../src/modules/migrator/migrator.service';
import { MysqlMigrator } from '../src/modules/migrator/mysql/mysql.migrator';
import { IDatabaseConfig } from '../src/common/interfaces/driver.interface';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

// Config for Docker mysql-dev
const config: IDatabaseConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: Number(process.env.TEST_DB_PORT) || 3306,
  user: process.env.TEST_DB_USER || 'root',
  password: process.env.TEST_DB_PASSWORD || 'root123',
  database: process.env.TEST_DB_NAME || 'dev_database'
};

/*
    E2E Test Flow:
    1. Connect to DB
    2. Read Schema (Introspection)
    3. Define a "Goal State" (Target DDL)
    4. Compare Current vs Goal
    5. Generate Migration SQL
*/

async function runE2E() {
  console.log('🚀 Starting Full E2E Integration Test');
  console.log('------------------------------------------------');

  // 1. Initialize Services
  const driver = new MysqlDriver(config);
  const parser = new ParserService();
  const comparator = new ComparatorService(parser);
  const migrator = new MigratorService();
  const defaultMigrator = new MysqlMigrator();

  try {
    // 2. Connect
    console.log('🔌 Connecting to Database...');
    await driver.connect();
    console.log('✅ Connected');

    // 3. Introspect 'users' table (assuming it exists from init-dev.sql or similar)
    const introspection = driver.getIntrospectionService();
    const currentDDL = await introspection.getTableDDL(config.database as string, 'users');

    if (!currentDDL) {
      console.error('❌ Table `users` not found in database. Please ensure seed data is loaded.');
      process.exit(1);
    }
    console.log('🔍 Read Current DDL for `users`');
    // console.log(currentDDL);

    // 4. Define Goal State (Target DDL)
    // We take the current DDL and ADD a column 'is_active' and DROP 'created_at' (if exists) or just ADD.
    // Let's just ADD a column to be safe and clear.

    // Parse current to object to manipulate safely?
    // No, let's just use string manipulation for simulation or just define a hardcoded target if we know the schema.
    // Better: Append the column string before the PRIMARY KEY or closing bracket.

    const targetDDL = currentDDL.replace(
      'PRIMARY KEY',
      '`is_active` tinyint(1) DEFAULT 1,\n  PRIMARY KEY'
    );

    console.log('🎯 Goal: Add `is_active` column to `users`');

    // 5. Compare
    console.log('⚔️  Comparing Current vs Goal...');
    const diff = comparator.compareTables(targetDDL, currentDDL);
    // Note: compareTables(src, dest). 
    // If we want to migrate Current -> Target.
    // Source = Target (Goal), Dest = Current (Actual DB)? 
    // Wait, Core Logic: compareTables(src, dest)
    // Usually: src = "Model/File", dest = "DB/Actual". 
    // If src has column, dest missing -> ADD.
    // So src should be TARGET, dest should be CURRENT.
    // Let's verify:
    // src has `is_active`, dest (current) does missing `is_active`.
    // logic: if (!dest.columns[col]) => ADD.
    // YES. src = Target, dest = Current.

    console.log(`   Found ${diff.operations.length} operations.`);
    diff.operations.forEach(op => console.log(`   - [${op.type}] ${op.target} ${op.name}`));

    if (diff.operations.length === 0) {
      console.log('⚠️  No difference found? Check if `is_active` already exists.');
    }

    // 6. Generate SQL
    console.log('🛠️  Generating Migration SQL...');
    const sqlStatements = migrator.generateAlterSQL(diff, defaultMigrator);

    if (sqlStatements.length > 0) {
      console.log('\n📜 Generated SQL:');
      console.log(sqlStatements.join('\n\n'));
      console.log('\n✅ E2E Test Passed: Logic Flow Verified.');
    } else {
      if (diff.operations.length > 0) {
        console.error('❌ Diff existed but no SQL generated? Bug in Migrator.');
        process.exit(1);
      }
    }

  } catch (err) {
    console.error('❌ E2E Failed:', err);
    process.exit(1);
  } finally {
    await driver.disconnect();
  }
}

runE2E().catch(err => console.error(err));
