import { ISchemaDiff } from '../../common/interfaces/schema.interface';
export declare class ReporterService {
    private readonly logger;
    generateHtmlReport(env: string, dbName: string, diff: ISchemaDiff, outputPath: string): Promise<string>;
    private _getCategoryIndex;
    private _addListReplacements;
}
