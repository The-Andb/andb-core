export interface ISearchResult {
    objectType: 'TABLE' | 'VIEW' | 'PROCEDURE' | 'FUNCTION' | 'TRIGGER' | 'EVENT';
    objectName: string;
    line: number;
    content: string;
    contextSnippet: string;
}
export interface ISymbolLocation {
    name: string;
    type: string;
    startOffset: number;
    endOffset: number;
}
export interface IDependencyMatch {
    sourceObject: {
        type: string;
        name: string;
    };
    matches: ISearchResult[];
}
