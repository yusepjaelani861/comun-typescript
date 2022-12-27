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
    export function find(nodes: Node[], predicate: (node: Node) => boolean): Node[];
    export function filter(nodes: Node[], predicate: (node: Node) => boolean): Node[];
}