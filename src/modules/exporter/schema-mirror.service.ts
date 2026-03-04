const { getLogger } = require('andb-logger');
import * as fs from 'fs';
import * as path from 'path';

export class SchemaMirrorService {
  private readonly logger = getLogger({ logName: 'SchemaMirrorService' });

  constructor(
    private readonly storageService: any,
  ) { }

  /**
   * Mirrors the SQLite state to the filesystem in the specified base directory.
   */
  async mirrorToFilesystem(envName: string, dbName: string, baseDir: string) {
    this.logger.info(`mirroring ${envName}/${dbName} to ${baseDir}`);

    const types = ['TABLES', 'VIEWS', 'PROCEDURES', 'FUNCTIONS', 'TRIGGERS', 'EVENTS'];

    for (const type of types) {
      const objects = await this.storageService.getDDLObjects(envName, dbName, type);
      const targetDir = path.join(baseDir, envName, dbName, type.toLowerCase());

      this._ensureDir(targetDir);

      // Track existing files to identify deletions
      const existingFiles = new Set(
        fs.existsSync(targetDir) ? fs.readdirSync(targetDir).filter(f => f.endsWith('.sql')) : []
      );

      for (const obj of objects) {
        const fileName = `${obj.name}.sql`;
        const filePath = path.join(targetDir, fileName);
        fs.writeFileSync(filePath, obj.content || '');
        existingFiles.delete(fileName);
      }

      // Cleanup deleted objects
      for (const deletedFile of existingFiles) {
        fs.unlinkSync(path.join(targetDir, deletedFile));
        this.logger.info(`🗑️ Deleted ${deletedFile} as it no longer exists in SQLite`);
      }
    }
  }

  private _ensureDir(p: string) {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }
}
