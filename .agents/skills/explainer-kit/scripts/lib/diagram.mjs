const HEADER_PATTERN = /^graph\s+(TD|LR)$/;
const ID_PATTERN = '[A-Za-z][A-Za-z0-9_-]*';
const OPERAND_PATTERN = `${ID_PATTERN}(?:\\[(?:[^\\]"]|"[^"]*")*\\]|\\((?:[^\\)"]|"[^"]*")*\\)|\\{(?:[^\\}"]|"[^"]*")*\\})?`;
const EDGE_PATTERN = new RegExp(
  `^(${OPERAND_PATTERN})\\s*(-->|---)(?:\\|([^|]*)\\|)?\\s*(${OPERAND_PATTERN})$`,
);
const DECLARATION_PATTERN = new RegExp(`^${OPERAND_PATTERN}$`);
const NODE_PATTERN = new RegExp(
  `^(${ID_PATTERN})(?:\\[((?:[^\\]"]|"[^"]*")*)\\]|\\(((?:[^\\)"]|"[^"]*")*)\\)|\\{((?:[^\\}"]|"[^"]*")*)\\})?$`,
);
const UNSUPPORTED_PATTERN =
  /^(?:subgraph|end\b|classDef\b|class\b|style\b|linkStyle\b|click\b|sequenceDiagram\b|stateDiagram(?:-v2)?\b|flowchart\b)/i;

export function parseDiagram(source) {
  if (typeof source !== 'string') {
    throw new TypeError('Diagram source must be a string.');
  }

  const lines = source
    .replaceAll('\r\n', '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('%%'));
  const header = lines.shift() ?? '';
  const headerMatch = header.match(HEADER_PATTERN);
  if (!headerMatch) {
    return degraded(
      /^(?:sequenceDiagram|stateDiagram|flowchart)/i.test(header)
        ? `Unsupported diagram type: ${header || 'missing header'}.`
        : 'Diagram must begin with “graph TD” or “graph LR”.',
    );
  }

  const nodes = new Map();
  const edges = [];
  for (const line of lines) {
    if (UNSUPPORTED_PATTERN.test(line)) {
      return degraded(`Unsupported diagram construct: ${line}.`);
    }

    const edge = line.match(EDGE_PATTERN);
    if (edge) {
      const from = parseNode(edge[1]);
      const to = parseNode(edge[4]);
      if (!from || !to) return degraded(`Unsupported diagram syntax: ${line}.`);
      registerNode(nodes, from);
      registerNode(nodes, to);
      edges.push({
        from: from.id,
        to: to.id,
        kind: edge[2] === '-->' ? 'arrow' : 'line',
        label: unquote(edge[3]?.trim() ?? ''),
      });
      continue;
    }

    if (DECLARATION_PATTERN.test(line)) {
      const node = parseNode(line);
      if (!node) return degraded(`Unsupported diagram syntax: ${line}.`);
      registerNode(nodes, node);
      continue;
    }

    return degraded(`Unsupported diagram syntax: ${line}.`);
  }

  if (nodes.size === 0) {
    return degraded('Diagram requires at least one node declaration or edge.');
  }

  const topology = analyzeTopology([...nodes.values()], edges);
  return {
    valid: true,
    direction: headerMatch[1],
    nodes: [...nodes.values()],
    edges,
    inlineSupported: topology.kind === 'linear',
    topology,
    warnings: [],
  };
}

export function renderDiagram(source, { theme } = {}) {
  const parsed = parseDiagram(source);
  if (!parsed.valid) {
    return {
      html: `<div class="diagram-fallback" role="note"><p class="diagram-warning">${escapeHtml(parsed.warnings[0].message)}</p><pre><code>${escapeHtml(source)}</code></pre></div>`,
      warnings: parsed.warnings,
      degraded: true,
    };
  }
  if (!parsed.inlineSupported) {
    const features = parsed.topology.features.join(', ');
    return {
      html: `<div class="diagram-fallback" role="note"><p class="diagram-warning">${escapeHtml(`Non-linear diagram topology (${features}) requires artistic composition.`)}</p><pre><code>${escapeHtml(source)}</code></pre></div>`,
      warnings: [
        {
          code: 'non-linear-diagram-reroute',
          message: `Non-linear diagram topology (${features}) requires artistic composition.`,
        },
      ],
      degraded: true,
      reroute: {
        target: 'artistic',
        source,
        graph: {
          direction: parsed.direction,
          nodes: structuredClone(parsed.nodes),
          edges: structuredClone(parsed.edges),
        },
        topology: structuredClone(parsed.topology),
      },
    };
  }

  const horizontal = parsed.direction === 'LR';
  const nodeWidth = 180;
  const nodeHeight = 72;
  const gap = 90;
  const margin = 50;
  const nodeById = new Map(parsed.nodes.map((node) => [node.id, node]));
  const orderedNodes = parsed.topology.order.map((id) => nodeById.get(id));
  const positions = new Map(
    orderedNodes.map((node, index) => [
      node.id,
      horizontal
        ? { x: margin + index * (nodeWidth + gap), y: margin }
        : { x: margin, y: margin + index * (nodeHeight + gap) },
    ]),
  );
  const width = horizontal
    ? margin * 2 +
      orderedNodes.length * nodeWidth +
      (orderedNodes.length - 1) * gap
    : margin * 2 + nodeWidth;
  const height = horizontal
    ? margin * 2 + nodeHeight
    : margin * 2 +
      orderedNodes.length * nodeHeight +
      (orderedNodes.length - 1) * gap;
  const markerId = `diagram-arrow-${stableHash(source)}`;
  const mode = theme?.modes?.[theme.defaultMode];
  const panel = mode?.surface?.panel ?? '#ffffff';
  const ink = mode?.ink?.primary ?? '#172033';
  const accent = mode?.accent?.primary ?? '#365270';
  const muted = mode?.ink?.muted ?? '#526071';
  const edges = parsed.edges
    .map((edge) =>
      renderEdge(edge, positions, {
        horizontal,
        nodeWidth,
        nodeHeight,
        markerId,
      }),
    )
    .join('');
  const nodes = orderedNodes
    .map((node) =>
      renderNode(node, positions.get(node.id), { nodeWidth, nodeHeight }),
    )
    .join('');

  return {
    html: `<svg class="narrative-diagram" data-direction="${parsed.direction}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Diagram"><style>
      .diagram-node-shape { fill: var(--panel, ${panel}); stroke: var(--accent, ${accent}); stroke-width: 2; }
      .diagram-node-label { fill: var(--ink, ${ink}); font: 14px var(--sans, system-ui, sans-serif); text-anchor: middle; dominant-baseline: middle; }
      .diagram-edge { fill: none; stroke: var(--muted, ${muted}); stroke-width: 2; }
      .diagram-edge-label { fill: var(--muted, ${muted}); font: 12px var(--mono, ui-monospace, monospace); text-anchor: middle; }
    </style><defs><marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted, ${muted})"></path></marker></defs>${edges}${nodes}</svg>`,
    warnings: [],
    degraded: false,
  };
}

function analyzeTopology(nodes, edges) {
  const nodeIds = nodes.map(({ id }) => id);
  const incoming = new Map(nodeIds.map((id) => [id, []]));
  const outgoing = new Map(nodeIds.map((id) => [id, []]));
  for (const edge of edges) {
    outgoing.get(edge.from).push(edge.to);
    incoming.get(edge.to).push(edge.from);
  }

  const branchNodes = nodeIds.filter((id) => outgoing.get(id).length > 1);
  const fanInNodes = nodeIds.filter((id) => incoming.get(id).length > 1);
  const cycle = hasDirectedCycle(nodeIds, outgoing);
  const connected = isWeaklyConnected(nodeIds, incoming, outgoing);
  const features = [
    ...(branchNodes.length > 0 ? ['branch'] : []),
    ...(fanInNodes.length > 0 ? ['fan-in'] : []),
    ...(cycle ? ['cycle'] : []),
    ...(!connected ? ['disconnected'] : []),
  ];
  const order =
    features.length === 0
      ? linearOrder(nodeIds, incoming, outgoing)
      : [];
  if (features.length === 0 && order.length !== nodeIds.length) {
    features.push('non-linear');
  }

  return {
    kind: features.length === 0 ? 'linear' : 'non-linear',
    features,
    branchNodes,
    fanInNodes,
    cycle,
    order: features.length === 0 ? order : [],
  };
}

function hasDirectedCycle(nodeIds, outgoing) {
  const visiting = new Set();
  const visited = new Set();
  const visit = (id) => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of outgoing.get(id)) {
      if (visit(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return nodeIds.some((id) => visit(id));
}

function isWeaklyConnected(nodeIds, incoming, outgoing) {
  if (nodeIds.length <= 1) return true;
  const seen = new Set();
  const pending = [nodeIds[0]];
  while (pending.length > 0) {
    const id = pending.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    pending.push(...incoming.get(id), ...outgoing.get(id));
  }
  return seen.size === nodeIds.length;
}

function linearOrder(nodeIds, incoming, outgoing) {
  if (nodeIds.length === 1 && incoming.get(nodeIds[0]).length === 0) {
    return [...nodeIds];
  }
  const starts = nodeIds.filter(
    (id) => incoming.get(id).length === 0 && outgoing.get(id).length === 1,
  );
  const ends = nodeIds.filter(
    (id) => incoming.get(id).length === 1 && outgoing.get(id).length === 0,
  );
  const middleIsLinear = nodeIds
    .filter((id) => !starts.includes(id) && !ends.includes(id))
    .every(
      (id) => incoming.get(id).length === 1 && outgoing.get(id).length === 1,
    );
  if (
    starts.length !== 1 ||
    ends.length !== 1 ||
    !middleIsLinear ||
    edgesFor(outgoing) !== nodeIds.length - 1
  ) {
    return [];
  }
  const order = [];
  let current = starts[0];
  while (current !== undefined && !order.includes(current)) {
    order.push(current);
    current = outgoing.get(current)[0];
  }
  return order;
}

function edgesFor(outgoing) {
  return [...outgoing.values()].reduce((total, targets) => total + targets.length, 0);
}

function parseNode(value) {
  const match = value.match(NODE_PATTERN);
  if (!match) return null;
  const [, id, rectangle, rounded, diamond] = match;
  const explicitLabel = rectangle ?? rounded ?? diamond;
  return {
    id,
    label: unquote(explicitLabel ?? id),
    shape:
      diamond !== undefined
        ? 'diamond'
        : rounded !== undefined
          ? 'rounded'
          : 'rectangle',
    explicit: explicitLabel !== undefined,
  };
}

function registerNode(nodes, candidate) {
  const current = nodes.get(candidate.id);
  if (!current || candidate.explicit) nodes.set(candidate.id, candidate);
}

function renderNode(node, position, { nodeWidth, nodeHeight }) {
  const centerX = position.x + nodeWidth / 2;
  const centerY = position.y + nodeHeight / 2;
  let shape;
  if (node.shape === 'diamond') {
    shape = `<polygon class="diagram-node-shape" points="${centerX},${position.y} ${position.x + nodeWidth},${centerY} ${centerX},${position.y + nodeHeight} ${position.x},${centerY}"></polygon>`;
  } else {
    shape = `<rect class="diagram-node-shape" x="${position.x}" y="${position.y}" width="${nodeWidth}" height="${nodeHeight}"${node.shape === 'rounded' ? ' rx="24"' : ''}></rect>`;
  }
  return `<g class="diagram-node" data-node="${escapeAttribute(node.id)}">${shape}<text class="diagram-node-label" x="${centerX}" y="${centerY}">${escapeHtml(node.label)}</text></g>`;
}

function renderEdge(
  edge,
  positions,
  { horizontal, nodeWidth, nodeHeight, markerId },
) {
  const from = positions.get(edge.from);
  const to = positions.get(edge.to);
  const start = horizontal
    ? { x: from.x + nodeWidth, y: from.y + nodeHeight / 2 }
    : { x: from.x + nodeWidth / 2, y: from.y + nodeHeight };
  const end = horizontal
    ? { x: to.x, y: to.y + nodeHeight / 2 }
    : { x: to.x + nodeWidth / 2, y: to.y };
  const label = edge.label
    ? `<text class="diagram-edge-label" x="${(start.x + end.x) / 2}" y="${(start.y + end.y) / 2 - 8}">${escapeHtml(edge.label)}</text>`
    : '';
  return `<g class="diagram-connection" data-from="${escapeAttribute(edge.from)}" data-to="${escapeAttribute(edge.to)}"><path class="diagram-edge" d="M ${start.x} ${start.y} L ${end.x} ${end.y}"${edge.kind === 'arrow' ? ` marker-end="url(#${markerId})"` : ''}></path>${label}</g>`;
}

function degraded(message) {
  return {
    valid: false,
    direction: null,
    nodes: [],
    edges: [],
    warnings: [{ code: 'unsupported-diagram', message }],
  };
}

function unquote(value) {
  return value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value;
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
