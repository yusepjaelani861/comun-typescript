declare module 'himalaya' {
    export interface Node {
        type: string;
        tagName?: string;
        attributes?: Attribute[];
        children?: Node[];
        content?: string;
    }
    
    export interface Attribute {
        key: string;
        value: string;
    }
    
    export function parse(html: string): Node[];
    export function stringify(nodes: Node[]): string;
}