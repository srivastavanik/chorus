import { Node, Edge } from '@xyflow/react';

export function getAncestorContext(
  nodeId: string,
  nodes: Node[],
  edges: Edge[]
) {
  const ancestors: Node[] = [];
  const visited = new Set<string>();
  const stack = [nodeId];
  
  // We want to find all upstream nodes.
  // This is a reverse BFS/DFS.
  
  // Map target -> sources
  const incoming: Record<string, string[]> = {};
  edges.forEach(e => {
    if (!incoming[e.target]) incoming[e.target] = [];
    incoming[e.target].push(e.source);
  });
  
  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);
    
    const parents = incoming[currentId] || [];
    for (const parentId of parents) {
      traverse(parentId);
      const parent = nodes.find(n => n.id === parentId);
      if (parent) {
        ancestors.push(parent);
      }
    }
  }
  
  traverse(nodeId);
  
  // Sort ancestors? The traversal order (post-orderish) might be okay but
  // ideally we want chronological or topological.
  // With the recursive traverse above, we are adding parents after visiting their parents.
  // So it should be roughly in order.
  
  return ancestors.map(node => ({
    role: 'system' as const, // Using system/user mix might be confusing, let's tag them
    content: `Context from Node (${node.type}): ${node.data.label || ''}`
  }));
}

