import { DriverFactoryService } from '../driver/driver-factory.service';
import { ProjectConfigService } from '../config/project-config.service';
import { ParserService } from '../parser/parser.service';
export declare class ExporterService {
    private readonly driverFactory;
    private readonly configService;
    private readonly parser;
    private readonly storageService;
    private readonly logger;
    constructor(driverFactory: DriverFactoryService, configService: ProjectConfigService, parser: ParserService, storageService: any);
    exportSchema(envName: string, specificName?: string, typeFilter?: string, onProgress?: (progress: {
        type: string;
        current: number;
        total: number;
        objectName: string;
    }) => void): Promise<Record<string, number>>;
    private isSkipObject;
    private _ensureDir;
    private _listObjects;
    private _getDDL;
}
