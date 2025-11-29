
export function isUnassigned(node: { tags: string[] }): boolean {
    return node.tags.length === 0;
}
