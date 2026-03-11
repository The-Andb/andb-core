import { ISemanticReport } from '../../common/interfaces/schema.interface';
export declare class SemanticDiffService {
    private parser;
    compare(sourceDDL: string, targetDDL: string, dialect?: string): Promise<ISemanticReport>;
    private compareTableAst;
    private extractColumns;
    private diffColumns;
    private formatType;
    private getTableName;
}
