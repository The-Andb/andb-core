import { Container } from './src/container';
import { DesktopStorageStrategy } from './src/modules/storage/strategy/desktop-storage.strategy';

async function run() {
  const strategy = new DesktopStorageStrategy();
  await strategy.initialize('memory', [], '/tmp/test-andb-storage');
  const proxy = strategy as any;
  proxy._writeSqlFile('map-migrate/test/table/alters/columns/test.sql', 'ALTER TABLE bla ADD COLUMN x INT;');
  console.log('Finished writing to /tmp/test-andb-storage/map-migrate');
}
run();
