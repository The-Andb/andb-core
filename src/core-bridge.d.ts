import { Container } from './container';
export declare class CoreBridge {
    private static container;
    private static initPromise;
    static init(userDataPath?: string): Promise<any>;
    static getApp(): Container;
    static getOrchestrator(): import(".").OrchestrationService;
    static getStorage(): import(".").StorageService;
    static getConfig(): import(".").ProjectConfigService;
    static execute(operation: string, payload: any): Promise<any>;
    static getLegacyContainer(config: any): LegacyContainer;
}
export declare class LegacyContainer {
    private config;
    constructor(config: any);
    getServices(): {
        exporter: (type: string, name: string) => (env: string) => Promise<any>;
        comparator: (type: string, name: string) => (destEnv: string) => Promise<any>;
        migrator: (type: string, status: string, name: string) => (destEnv: string, options: any) => Promise<any>;
    };
}
