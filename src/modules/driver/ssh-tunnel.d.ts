import { ISshConfig } from '../../common/interfaces/connection.interface';
export declare class SshTunnel {
    private readonly config;
    private client;
    private logger;
    private connection;
    constructor(config: ISshConfig);
    forward(destHost: string, destPort: number): Promise<NodeJS.ReadWriteStream>;
    close(): void;
}
