import { flattenTree } from './newick.js';

/** Rectangular ordered tree layout; presentation never changes biological data. */
export function layoutTree(root, mode = 'topology') {
  const nodes = flattenTree(root);
  const positions = new Map();
  let leaf = 0;
  function visit(node, parent, depth, distance) {
    const position = { node, parent, depth, distance, x: 0, y: 0 };
    positions.set(node.id, position);
    if (!node.children.length) position.y = leaf++ * 56;
    else {
      for (const child of node.children) visit(child, node, depth + 1, distance + (child.length ?? 0));
      position.y = node.children.reduce((sum, child) => sum + positions.get(child.id).y, 0) / node.children.length;
    }
  }
  visit(root, null, 0, 0);
  const complete = nodes.filter(n => n !== root).every(n => n.length !== null);
  // Normalize by the longest edge first to avoid overflow of a long path sum.
  if (mode === 'lengths' && complete) {
    const maxEdge = Math.max(0, ...nodes.filter(n => n !== root).map(n => n.length));
    function distances(node, distance) {
      positions.get(node.id).distance = distance;
      for (const child of node.children) distances(child, distance + (maxEdge ? child.length / maxEdge : 0));
    }
    distances(root, 0);
  }
  const metric = mode === 'lengths' && complete ? 'distance' : 'depth';
  const max = Math.max(0, ...[...positions.values()].map(p => p[metric]));
  for (const p of positions.values()) { p.x = 64 + (max ? p[metric] / max * 520 : 0); p.y += 55; }
  const longestLabel = Math.max(12, ...nodes.map(n => n.label.length));
  return { nodes: [...positions.values()], positions, complete, width: 660 + Math.min(longestLabel * 8, 560), height: Math.max(240, leaf * 56 + 54), leaves: leaf };
}

export function zoomAt(view, factor, point) {
  const scale = Math.min(8, Math.max(0.001, view.scale * factor));
  const ratio = scale / view.scale;
  return { scale, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio };
}
