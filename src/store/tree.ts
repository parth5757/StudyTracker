import {NodeItem} from '../types';

export function childrenOf(nodes: NodeItem[], parentId: string | null): NodeItem[] {
  return nodes
    .filter(n => n.parentId === parentId)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export function descendantIds(nodes: NodeItem[], id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop() as string;
    for (const n of nodes) {
      if (n.parentId === cur) {
        out.push(n.id);
        stack.push(n.id);
      }
    }
  }
  return out;
}

export function pathOf(nodes: NodeItem[], id: string | null): NodeItem[] {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const path: NodeItem[] = [];
  let cur = id ? byId.get(id) : undefined;
  let guard = 0;
  while (cur && guard++ < 50) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

export function pathString(nodes: NodeItem[], id: string | null): string {
  return pathOf(nodes, id)
    .map(n => n.name)
    .join(' › ');
}

export function depthOf(nodes: NodeItem[], id: string): number {
  return pathOf(nodes, id).length;
}

export function levelName(depth: number): string {
  if (depth <= 1) {
    return 'Section';
  }
  if (depth === 2) {
    return 'Topic';
  }
  if (depth === 3) {
    return 'Sub-topic';
  }
  return 'Sub-sub-topic';
}

export function childLevelName(parentDepth: number): string {
  return levelName(parentDepth + 1);
}

export type Progress = {total: number; learned: number};

// Progress counts leaf nodes (items with no children). A leaf is "learned" once learnedOn is set.
export function progressOf(nodes: NodeItem[], id: string): Progress {
  const kids = new Map<string, NodeItem[]>();
  for (const n of nodes) {
    if (n.parentId) {
      const arr = kids.get(n.parentId) || [];
      arr.push(n);
      kids.set(n.parentId, arr);
    }
  }
  let total = 0;
  let learned = 0;
  const byId = new Map(nodes.map(n => [n.id, n]));
  const walk = (nid: string) => {
    const children = kids.get(nid);
    if (!children || children.length === 0) {
      total += 1;
      if (byId.get(nid)?.learnedOn) {
        learned += 1;
      }
      return;
    }
    children.forEach(c => walk(c.id));
  };
  walk(id);
  return {total, learned};
}

export function parentOf(nodes: NodeItem[], id: string): string | null {
  return nodes.find(n => n.id === id)?.parentId ?? null;
}
