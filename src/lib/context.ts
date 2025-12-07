import { Node, Edge } from "@xyflow/react";

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
  edges.forEach((e) => {
    if (!incoming[e.target]) incoming[e.target] = [];
    incoming[e.target].push(e.source);
  });

  function traverse(currentId: string) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const parents = incoming[currentId] || [];
    for (const parentId of parents) {
      traverse(parentId);
      const parent = nodes.find((n) => n.id === parentId);
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

  // Return full message history from ancestors
  return ancestors.flatMap((node) => {
    if (node.type === "text" && node.data.messages) {
      return (node.data.messages as any[]).map((m: any) => ({
        role: m.role,
        content: m.content,
      }));
    }

    if (node.type === "scratchpad") {
      const hasImage = !!node.data.generatedImage;
      const description =
        node.data.label || (hasImage ? "Sketch attached" : "Empty scratchpad");
      return [
        {
          role: "system",
          content: `[Context from scratchpad node]: ${description}`,
        },
      ];
    }

    // For non-text nodes, maybe just include a system note
    return [
      {
        role: "system",
        content: `[Context from ${node.type} node]: ${
          node.data.label || "No content"
        }`,
      },
    ];
  });
}
