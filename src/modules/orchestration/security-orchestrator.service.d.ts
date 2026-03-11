import { ProjectConfigService } from '../config/project-config.service';
export declare class SecurityOrchestrator {
    private readonly configService;
    private driverFactory;
    private readonly logger;
    constructor(configService: ProjectConfigService, driverFactory: any);
    probeRestrictedUser(payload: any): Promise<{
        baseConn: string;
        schemaRead: string;
        sandboxTest: string;
    }>;
    setupRestrictedUser(payload: any): Promise<{
        success: boolean;
    }>;
    generateUserSetupScript(payload: any): Promise<any>;
    testConnection(payload: any): Promise<{
        success: boolean;
        message: any;
    }>;
    getDriverFromConnection(connection: any): Promise<any>;
}
