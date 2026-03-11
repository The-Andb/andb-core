import { IDatabaseConfig } from './driver.interface';
export { IDatabaseConfig };
export declare enum ConnectionType {
    MYSQL = "mysql",
    MARIADB = "mariadb",
    POSTGRES = "postgres",
    SQLITE = "sqlite",
    DUMP = "dump",
    FILE = "file"
}
export interface IConnection {
    id: string;
    name: string;
    type: ConnectionType;
    config: IDatabaseConfig;
    sshConfig?: ISshConfig;
    isReadOnly?: boolean;
    color?: string;
}
export interface ISshConfig {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    passphrase?: string;
}
export interface IProject {
    id: string;
    name: string;
    connections: IConnection[];
    createdAt: string;
    updatedAt: string;
}
