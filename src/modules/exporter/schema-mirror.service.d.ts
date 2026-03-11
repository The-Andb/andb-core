export declare class SchemaMirrorService {
    private readonly storageService;
    private readonly logger;
    constructor(storageService: any);
    mirrorToFilesystem(envName: string, dbName: string, baseDir: string): Promise<void>;
    private _ensureDir;
}
