import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { DdlExportEntity } from './modules/storage/entities/core/DdlExportEntity';

async function main() {
  const ds = new DataSource({
    type: 'better-sqlite3',
    database: '/Volumes/FlexibleWorkplace/side-pr/TheAndbData/andb-storage.db',
    entities: [DdlExportEntity],
    synchronize: false
  });

  await ds.initialize();
  console.log('Datasource initialized.');

  const env = 'DEV';
  const dbName = 'flo_helper';
  const type = 'TABLES';
  const databaseType = 'mysql';

  const query = ds.getRepository(DdlExportEntity).createQueryBuilder('e');
  
  query.where('LOWER(e.environment) = LOWER(:env)', { env })
       .andWhere('LOWER(e.database_name) = LOWER(:dbName)', { dbName });
       
  if (type) {
    query.andWhere('LOWER(e.export_type) = LOWER(:type)', { type });
  }
  if (databaseType) {
    query.andWhere('LOWER(e.database_type) = LOWER(:databaseType)', { databaseType });
  }

  console.log('SQL generated:', query.getSql());
  console.log('Parameters:', query.getParameters());

  const results = await query.getMany();
  console.log(`Results count (without exportName): ${results.length}`);
  if (results.length > 0) {
    console.log('Sample result:', JSON.stringify(results[0], null, 2));
  }

  await ds.destroy();
}

main().catch(err => {
  console.error('Error:', err);
});
