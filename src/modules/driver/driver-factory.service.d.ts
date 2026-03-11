import { IDatabaseConfig, ConnectionType } from '../../common/interfaces/connection.interface';
import { IDatabaseDriver } from '../../common/interfaces/driver.interface';
import { ParserService } from '../parser/parser.service';
export declare class DriverFactoryService {
    private readonly parser;
    constructor(parser: ParserService);
    create(type: ConnectionType, config: IDatabaseConfig): Promise<IDatabaseDriver>;
}
