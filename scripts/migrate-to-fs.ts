import { DataSource, IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

// Require entities
import { DdlExportEntity } from '../src/modules/storage/entities/core/DdlExportEntity';
import { DdlSnapshotEntity } from '../src/modules/storage/entities/core/DdlSnapshotEntity';
import { ComparisonEntity } from '../src/modules/storage/entities/core/ComparisonEntity';
import { MigrationHistoryEntity } from '../src/modules/storage/entities/core/MigrationHistoryEntity';

async function migrate() {
    console.log('--- TheAndb FileSystem Migration Script ---');

    // Try different possible AppData folders for the Electron app
    const possibleFolders = ['TheAndb_v3_dev', 'TheAndb Dev_v3_dev', 'TheAndb'];
    const appDataRoot = path.join(homedir(), 'Library', 'Application Support');
    
    let dbConfigPath = '';
    let appDataPath = '';

    for (const folder of possibleFolders) {
        const testPath = path.join(appDataRoot, folder, 'db-config.yaml');
        if (fs.existsSync(testPath)) {
            dbConfigPath = testPath;
            appDataPath = path.join(appDataRoot, folder);
            break;
        }
    }

    if (!dbConfigPath && appDataPath === '') {
        appDataPath = path.join(appDataRoot, 'TheAndb_v3_dev');
        dbConfigPath = path.join(appDataPath, 'db-config.yaml');
    }
    
    let dbPath = path.join(appDataPath, 'andb-storage.db');
    let projectBaseDir = process.cwd();

    if (fs.existsSync(dbConfigPath)) {
        const yaml = require('js-yaml');
        const config = yaml.load(fs.readFileSync(dbConfigPath, 'utf8')) || {};
        if (config.dbPath) dbPath = config.dbPath;
        if (config.projectBaseDir) projectBaseDir = config.projectBaseDir;
    }

    console.log(`Connecting to database at: ${dbPath}`);
    console.log(`Using Project Base Dir: ${projectBaseDir}`);

    const dataSource = new DataSource({
        type: 'better-sqlite3',
        database: dbPath,
        entities: [DdlExportEntity, DdlSnapshotEntity, ComparisonEntity, MigrationHistoryEntity],
        synchronize: true,
    });

    await dataSource.initialize();
    console.log('Database connected.');

    // Helper to write file
    const writeSqlFile = (relPath: string, content: string | string[]) => {
        if (!projectBaseDir) return;
        const fullPath = path.join(projectBaseDir, relPath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const finalContent = Array.isArray(content) ? content.join('\n\n') : content;
        fs.writeFileSync(fullPath, finalContent, 'utf8');
    };

    // 1. Migrate DdlExport
    const exportRepo = dataSource.getRepository(DdlExportEntity);
    const exportsToMigrate = await exportRepo.find({ where: { file_path: IsNull() } });
    console.log(`Found ${exportsToMigrate.length} DdlExports to migrate.`);
    for (const exp of exportsToMigrate) {
        if (!exp.ddl_content) continue;
        const extType = (exp.export_type || 'unknown').toLowerCase();
        const relPath = `db/${exp.environment}/${exp.database_name}/${extType}/${exp.export_name}.sql`;
        
        writeSqlFile(relPath, exp.ddl_content);
        exp.file_path = relPath;
        exp.ddl_content = '';
        await exportRepo.save(exp);
    }

    // 2. Migrate DdlSnapshot
    const snapshotRepo = dataSource.getRepository(DdlSnapshotEntity);
    const snapshotsToMigrate = await snapshotRepo.find({ where: { file_path: IsNull() } });
    console.log(`Found ${snapshotsToMigrate.length} DdlSnapshots to migrate.`);
    for (const snap of snapshotsToMigrate) {
        if (!snap.ddl_content) continue;
        const extType = (snap.ddl_type || 'unknown').toLowerCase();
        const timestampDate = snap.created_at ? new Date(snap.created_at) : new Date();
        const dateFolder = timestampDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const relPath = `db/${snap.environment}/${snap.database_name}/.snapshots/${dateFolder}/${extType}/${snap.ddl_name}_${snap.hash.substring(0, 8)}.sql`;

        writeSqlFile(relPath, snap.ddl_content);
        snap.file_path = relPath;
        snap.ddl_content = '';
        await snapshotRepo.save(snap);
    }

    // 3. Migrate Comparisons (Legacy JSON string -> new 3 folders)
    const compRepo = dataSource.getRepository(ComparisonEntity);
    const comparisonsToMigrate = await compRepo.find({ where: { file_path: IsNull() } });
    console.log(`Found ${comparisonsToMigrate.length} Comparisons to migrate.`);
    for (const comp of comparisonsToMigrate) {
        if (!comp.alter_statements) continue;
        const extType = (comp.ddl_type || 'unknown').toLowerCase();
        
        let stmts: string[] = [];
        try {
            const parsed = JSON.parse(comp.alter_statements);
            if (Array.isArray(parsed)) stmts = parsed;
            else stmts = [comp.alter_statements];
        } catch {
            stmts = comp.alter_statements.split(';').map((s: string) => s.trim()).filter((s: string) => !!s).map((s: string) => s + ';');
        }

        if (stmts.length > 0) {
            let colAlters: string[] = [];
            let idxAlters: string[] = [];
            let rmvColAlters: string[] = [];

            stmts.forEach((s: string) => {
                const stmt = s.trim();
                if (!stmt) return;
                const normalizedStmt = stmt.endsWith(';') ? stmt : stmt + ';';

                const isDropCol = stmt.match(/ALTER TABLE\s+.*?DROP\s+(?:COLUMN\s+)?/i);
                const isAddIdx = stmt.match(/ALTER TABLE\s+.*?ADD\s+(?:CONSTRAINT\s+.*?|UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?INDEX/i) || stmt.match(/CREATE\s+(?:UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?INDEX/i) || stmt.match(/ALTER TABLE\s+.*?ADD\s+FOREIGN KEY/i) || stmt.match(/ALTER TABLE\s+.*?ADD\s+PRIMARY KEY/i);
                const isDropIdx = stmt.match(/ALTER TABLE\s+.*?DROP\s+INDEX/i) || stmt.match(/DROP\s+INDEX/i) || stmt.match(/ALTER TABLE\s+.*?DROP\s+FOREIGN KEY/i) || stmt.match(/ALTER TABLE\s+.*?DROP\s+PRIMARY KEY/i);

                if (isAddIdx || isDropIdx) {
                   idxAlters.push(normalizedStmt);
                } else if (isDropCol) {
                   rmvColAlters.push(normalizedStmt);
                } else {
                   colAlters.push(normalizedStmt);
                }
            });

            const basePath = `map-migrate/${comp.source_env}-to-${comp.target_env}/${comp.database_name}/${extType}/alters`;
            
            if (colAlters.length > 0) writeSqlFile(`${basePath}/columns/${comp.ddl_name}.sql`, colAlters.join('\n'));
            if (idxAlters.length > 0) writeSqlFile(`${basePath}/indexes/${comp.ddl_name}.sql`, idxAlters.join('\n'));
            if (rmvColAlters.length > 0) writeSqlFile(`${basePath}/rmv-columns/${comp.ddl_name}.sql`, rmvColAlters.join('\n'));

            comp.file_path = basePath;
            comp.alter_statements = '';
            await compRepo.save(comp);
        }
    }

    console.log('Migration completed successfully.');
    await dataSource.destroy();
}

migrate().catch(console.error);
