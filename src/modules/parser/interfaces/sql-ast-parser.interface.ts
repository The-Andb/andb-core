import { ParsedTable } from './parsed-table.interface';

export interface ISqlAstParser {
  /**
   * Parse a CREATE TABLE statement into a highly structured AST object
   */
  parseTableDetailed(ddl: string): ParsedTable | null;

  /**
   * Safely clean up DEFINER statements from routines and triggers
   */
  cleanDefiner(ddl: string): string;
}
