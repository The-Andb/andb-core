import { IDatabaseDriver } from '../../common/interfaces/driver.interface';
import { IDependencyMatch } from './search.interface';
export declare class DependencySearchService {
    constructor();
    searchUsages(driver: IDatabaseDriver, dbName: string, targetName: string): Promise<IDependencyMatch[]>;
    private extractContext;
    private checkExistence;
}
