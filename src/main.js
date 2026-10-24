import './style.css';
import { parseNewick, serializeNewick, decodeNewickFile, flattenTree, EXAMPLE, LIMITS } from './newick.js';
import { layoutTree, zoomAt } from './layout.js';

const icons = {
  tree: '<path d="M6 20V5h7m-7 8h13M13 2v6m6 2v6"/><circle cx="13" cy="2" r="1.5"/><circle cx="19" cy="10" r="1.5"/><circle cx="19" cy="16" r="1.5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  leaf: '<path d="M20 3C7 2 2 7 5 15c8 4 14-1 15-12ZM5 20 16 8"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;

document.querySelector('#app').innerHTML = `
  <header class="app-header">
    <a class="brand" href="/" aria-label="EcoPhylo home"><span class="brand-symbol">${icon('tree')}</span><span>Eco<span class="brand-light">Phylo</span></span></a>
    <div class="header-divider"></div><span class="workspace-label">TREE WORKSPACE</span>
    <span class="local-badge"><span class="status-dot"></span>Local to your browser</span>
    <span class="version-badge">MILESTONE 01</span>
  </header>
  <main class="workspace">
    <aside class="source-panel" aria-label="Import tree">
      <div class="section-kicker">01 / YOUR DATA</div>
      <h1>Start with a tree.</h1>
      <p class="muted intro">Bring your branching histories into focus. Open a Newick file or paste one below.</p>
      <button class="dropzone" id="choose-file">${icon('upload')}<strong>Open a Newick file</strong><span>.nwk, .newick, .tre or plain text · UTF-8</span><span class="drop-hint">or drop a file here</span></button>
      <input id="file-input" type="file" accept=".nwk,.newick,.tre,.tree,.txt,text/plain" hidden />
      <div class="or-divider"><span>OR PASTE TEXT</span></div>
      <div class="editor-heading"><label for="newick-input">Newick source</label><span id="source-state">Ready</span></div>
      <textarea id="newick-input" spellcheck="false" autocomplete="off" aria-describedby="source-help" placeholder="((Oak:0.12,Birch:0.18):0.14,Pine:0.2);"></textarea>
      <p id="source-help" class="small muted">End each tree with a semicolon. <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to import.</p>
      <button class="primary full" id="draw-tree">Visualize tree ${icon('arrow')}</button>
      <button class="example-button" id="load-example">${icon('leaf')} Load example tree</button>
      <div id="validation" class="validation" role="status" aria-live="polite"></div>
      <details class="format-help"><summary>What can I import?</summary><p>Quoted labels, Unicode, multiple trees, optional nonnegative branch lengths, unary nodes and polytomies. Unquoted underscores mean spaces.</p><p>Bracket comments and annotations are rejected. Rooting is unspecified; lengths carry no assumed time units.</p><p>Up to 2,000 nodes, 100 trees and 128 nesting levels. Files must be UTF-8 and at most 500 KB.</p></details>
      <div class="source-footer">A small window into a much bigger history.</div>
    </aside>
    <section class="explorer" aria-label="Tree workspace">
      <div class="workspace-heading"><div><div class="section-kicker">EXPLORE / INSPECT / EXPORT</div><h2>Tree workspace</h2><p class="muted" id="document-name">Illustrative plant tree</p></div><div class="export-actions"><label class="sr-only" for="export-scope">Export scope</label><select id="export-scope"><option value="current">Current tree</option><option value="all">All trees</option></select><button id="export-tree" class="primary">${icon('download')} Export Newick</button></div></div>
      <div class="metrics" aria-label="Tree summary"><div><strong id="leaf-count">—</strong><span>LEAF TAXA</span></div><div><strong id="node-count">—</strong><span>TOTAL NODES</span></div><div><strong id="tree-count">—</strong><span>TREES IN FILE</span></div><div class="rooting-metric"><span class="status-dot"></span><span>Rooting unspecified</span></div></div>
      <div class="viewer-layout">
        <section class="tree-card" aria-label="Interactive tree viewer">
          <div class="tree-toolbar"><div class="view-switch" role="group" aria-label="Tree layout"><button id="length-layout" aria-pressed="true">Branch lengths</button><button id="topology-layout" aria-pressed="false">Topology</button></div><label class="tree-picker-label" for="tree-picker">Tree <select id="tree-picker" aria-label="Select tree"></select></label></div>
          <div class="canvas" id="canvas">
            <div class="canvas-caption"><span class="canvas-dot"></span><span id="canvas-caption">PHYLOGRAM</span></div>
            <div class="zoom-controls"><button id="zoom-in" aria-label="Zoom in" title="Zoom in">+</button><output id="zoom-level" aria-label="Zoom level">100%</output><button id="zoom-out" aria-label="Zoom out" title="Zoom out">−</button><button id="fit-view" aria-label="Fit tree to view" title="Fit tree to view">${icon('fit')}</button></div>
            <svg id="tree-svg" role="group" aria-label="Phylogenetic tree; select a node to inspect it" tabindex="0"><g id="tree-scene"></g></svg>
            <div class="canvas-instruction">Drag to pan <span>·</span> Scroll to zoom <span>·</span> Select a node to inspect</div>
          </div>
          <div class="tree-options"><label><input id="show-lengths" type="checkbox" /> Show branch lengths</label><label><input id="export-lengths" type="checkbox" checked /> Include lengths on export</label><span id="layout-note">Lengths shown to scale</span></div>
        </section>
        <aside class="inspector" aria-label="Node inspector">
          <div class="inspector-heading">${icon('tree')}<h3>Node inspector</h3></div>
          <label class="small muted" for="node-picker">Select a node in the tree or here</label><select id="node-picker" aria-label="Inspect a node"></select>
          <div class="node-type" id="node-type">ROOT NODE</div><h4 id="node-label">Plants</h4>
          <dl><div><dt id="length-term">Root stem length</dt><dd id="node-length">Not specified</dd></div><div><dt>Direct children</dt><dd id="node-children">—</dd></div><div><dt>Descendant leaves</dt><dd id="node-leaves">—</dd></div><div><dt>Parent label</dt><dd id="node-parent">—</dd></div></dl>
          <p class="inspector-note" id="node-note">The top node is a display anchor. It does not establish biological rooting.</p>
          <div class="inspector-legend"><span><i class="legend-leaf"></i>Leaf taxon</span><span><i class="legend-internal"></i>Internal node</span><span><i class="legend-selected"></i>Selected node</span></div>
        </aside>
      </div>
      <div class="workspace-bottom"><p>${icon('check')} Your data stays in this browser. No account or upload required.</p><span id="document-status" role="status" aria-live="polite">Example loaded · illustrative data</span></div>
      <details class="about"><summary>About this milestone</summary><p>EcoPhylo 0.1 is an independent Newick viewer and exporter. It does not infer trees, biological rooting, bootstrap support or divergence times. Internal numeric labels remain labels. MEGA12 compatibility is not claimed.</p></details>
    </section>
  </main>`;

const $ = selector => document.querySelector(selector);
const input = $('#newick-input');
const svg = $('#tree-svg');
const scene = $('#tree-scene');
const NS = 'http://www.w3.org/2000/svg';
let forest = [];
let treeIndex = 0;
let layout;
let selected;
let mode = 'lengths';
let sourceName = 'example.nwk';
let validatedText = '';
let fileRequest = 0;
let view = { scale: 1, x: 0, y: 0 };
let pan = null;
let didDrag = false;

function svgElement(tag, attrs = {}, text) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  if (text !== undefined) el.textContent = text;
  return el;
}
function setStatus(message) { $('#document-status').textContent = message; }
function dirtyState() {
  const dirty = input.value !== validatedText;
  $('#source-state').textContent = dirty ? 'Unapplied edits' : 'Validated';
  $('#export-tree').disabled = dirty || !forest.length;
  input.setAttribute('aria-invalid', 'false');
  if (dirty) setStatus('Unapplied edits · viewer shows the last valid import');
}
function validation(message, isError = false, warnings = []) {
  const panel = $('#validation');
  panel.className = `validation ${isError ? 'error' : 'success'}`;
  panel.setAttribute('role', isError ? 'alert' : 'status');
  panel.replaceChildren();
  const title = document.createElement('strong'); title.textContent = message; panel.append(title);
  for (const warning of warnings) { const p = document.createElement('p'); p.textContent = warning; panel.append(p); }
}
function fail(error) {
  input.setAttribute('aria-invalid', 'true');
  $('#export-tree').disabled = true;
  const details = error.code ? [`${error.code} · offset ${error.offset}`, 'Your last valid tree is still shown.'] : ['Your last valid tree is still shown.'];
  validation(error.message, true, details);
  setStatus('Import failed · correct the source and try again');
}
function importText(name, example = false) {
  try {
    const result = parseNewick(input.value);
    forest = result.trees; treeIndex = 0; sourceName = name; validatedText = input.value;
    $('#tree-picker').replaceChildren(...forest.map((tree, i) => new Option(`${i + 1}${tree.label ? ` · ${tree.label.slice(0, 35)}` : ''}`, String(i))));
    $('#tree-picker').disabled = forest.length === 1;
    $('#export-scope').disabled = forest.length === 1;
    $('#document-name').textContent = example ? 'Illustrative plant tree · example.nwk' : name;
    $('#tree-count').textContent = forest.length;
    validation(`${forest.length === 1 ? 'Tree' : `${forest.length} trees`} validated`, false, result.warnings);
    dirtyState();
    const edges = flattenTree(forest[0]).slice(1);
    mode = edges.length && edges.every(n => n.length !== null) && edges.some(n => n.length > 0) ? 'lengths' : 'topology';
    renderTree();
    setStatus(example ? 'Example loaded · illustrative data' : `${forest.length} ${forest.length === 1 ? 'tree' : 'trees'} imported successfully`);
  } catch (error) { fail(error); }
}
function applyView() {
  scene.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.scale})`);
  $('#zoom-level').textContent = `${Math.round(view.scale * 100)}%`;
}
function fitView() {
  if (!layout) return;
  const { width, height } = svg.getBoundingClientRect();
  if (!width || !height) return;
  const scale = Math.min((width - 32) / layout.width, (height - 100) / layout.height, 1.4);
  view = { scale: Math.max(0.001, scale), x: (width - layout.width * scale) / 2, y: (height - layout.height * scale) / 2 };
  applyView();
}
function inspect(id) {
  const position = layout.positions.get(id);
  if (!position) return;
  selected = id;
  const { node, parent } = position;
  $('#node-picker').value = id;
  $('#node-type').textContent = !parent ? 'DISPLAY ANCHOR' : node.children.length ? 'INTERNAL NODE' : 'LEAF TAXON';
  $('#node-label').textContent = node.label || 'Unlabeled node';
  $('#length-term').textContent = parent ? 'Branch length' : 'Root stem length';
  $('#node-length').textContent = node.length === null ? 'Not specified' : String(node.length);
  $('#node-children').textContent = node.children.length;
  $('#node-leaves').textContent = flattenTree(node).filter(n => !n.children.length).length;
  $('#node-parent').textContent = parent ? parent.label || 'Unlabeled node' : 'None · display anchor';
  $('#node-note').textContent = !parent ? 'This node anchors the display; biological rooting is unspecified. A root stem, if present, is preserved but not drawn.' : 'Length refers to this node’s incoming edge. Units are unspecified; no dating or support values are inferred.';
  for (const el of scene.querySelectorAll('[data-node]')) {
    const active = el.dataset.node === id;
    el.classList.toggle('selected', active);
    el.setAttribute('aria-pressed', String(active));
  }
  for (const edge of scene.querySelectorAll('[data-child]')) edge.classList.toggle('selected-edge', edge.dataset.child === id);
}
function renderTree() {
  const root = forest[treeIndex];
  if (!root) return;
  layout = layoutTree(root, mode);
  if (!layout.complete && mode === 'lengths') { mode = 'topology'; layout = layoutTree(root, mode); }
  $('#length-layout').disabled = !layout.complete;
  $('#length-layout').setAttribute('aria-pressed', String(mode === 'lengths'));
  $('#topology-layout').setAttribute('aria-pressed', String(mode === 'topology'));
  $('#canvas-caption').textContent = mode === 'lengths' ? 'PHYLOGRAM · UNSPECIFIED UNITS' : 'TOPOLOGY · EQUAL EDGE SPACING';
  $('#layout-note').textContent = !layout.complete ? 'Some lengths missing · topology view' : mode === 'lengths' ? 'Lengths shown to scale' : 'Spacing shows topology only';
  $('#leaf-count').textContent = layout.leaves;
  $('#node-count').textContent = layout.nodes.length;
  $('#node-picker').replaceChildren(...layout.nodes.map(({ node, parent }, i) => new Option(`${node.label || `Unlabeled node ${i + 1}`}${!parent ? ' · anchor' : ''}`, node.id)));
  scene.replaceChildren();
  const edges = svgElement('g', { class: 'tree-edges', 'aria-hidden': 'true' });
  const labels = svgElement('g', { class: 'length-labels', 'aria-hidden': 'true' });
  for (const p of layout.nodes) {
    if (!p.parent) continue;
    const parent = layout.positions.get(p.parent.id);
    edges.append(svgElement('path', { d: `M${parent.x},${parent.y} V${p.y} H${p.x}`, 'data-child': p.node.id }));
    if ($('#show-lengths').checked && p.node.length !== null) {
      const text = svgElement('text', { x: (parent.x + p.x) / 2, y: p.y - 8, 'text-anchor': 'middle' }, new Intl.NumberFormat('en', { maximumSignificantDigits: 5 }).format(p.node.length));
      text.append(svgElement('title', {}, String(p.node.length))); labels.append(text);
    }
  }
  scene.append(edges, labels);
  for (const p of layout.nodes) {
    const group = svgElement('g', { transform: `translate(${p.x} ${p.y})`, class: `tree-node ${p.node.children.length ? 'internal' : 'leaf'}`, 'data-node': p.node.id, role: 'button', tabindex: 0, 'aria-label': `Inspect ${p.node.label || 'unlabeled node'}`, 'aria-pressed': 'false' });
    group.append(svgElement('circle', { r: 13, class: 'node-hit' }), svgElement('circle', { r: p.node.children.length ? 4.5 : 5, class: 'node-dot' }));
    if (p.node.label) group.append(svgElement('text', { x: 14, y: p.node.children.length ? -11 : 5, class: p.node.children.length ? 'internal-label' : 'taxon-label' }, p.node.label.length > 44 ? `${p.node.label.slice(0, 41)}…` : p.node.label));
    group.append(svgElement('title', {}, `${p.node.label || 'Unlabeled node'} · ${p.node.length === null ? 'length not specified' : `length ${p.node.length}`}`));
    group.addEventListener('click', () => { if (!didDrag) inspect(p.node.id); });
    group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inspect(p.node.id); } });
    scene.append(group);
  }
  inspect(root.id);
  requestAnimationFrame(fitView);
}
function point(event) {
  const rect = svg.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
svg.addEventListener('wheel', event => { event.preventDefault(); view = zoomAt(view, Math.exp(-event.deltaY * 0.002), point(event)); applyView(); }, { passive: false });
svg.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('[data-node]')) return;
  didDrag = false; pan = { point: point(event), view: { ...view } };
  svg.setPointerCapture(event.pointerId); svg.classList.add('panning');
});
svg.addEventListener('pointermove', event => {
  if (!pan) return;
  const p = point(event); const dx = p.x - pan.point.x; const dy = p.y - pan.point.y;
  if (Math.hypot(dx, dy) > 3) didDrag = true;
  view = { ...view, x: pan.view.x + dx, y: pan.view.y + dy }; applyView();
});
const stopPan = () => { pan = null; svg.classList.remove('panning'); didDrag = false; };
svg.addEventListener('pointerup', stopPan); svg.addEventListener('pointercancel', stopPan);
function zoom(factor) { const { width, height } = svg.getBoundingClientRect(); view = zoomAt(view, factor, { x: width / 2, y: height / 2 }); applyView(); }
$('#zoom-in').addEventListener('click', () => zoom(1.25));
$('#zoom-out').addEventListener('click', () => zoom(0.8));
$('#fit-view').addEventListener('click', fitView);
svg.addEventListener('keydown', event => {
  if (event.target !== svg) return;
  const shifts = { ArrowLeft: [30, 0], ArrowRight: [-30, 0], ArrowUp: [0, 30], ArrowDown: [0, -30] };
  if (shifts[event.key]) { event.preventDefault(); view.x += shifts[event.key][0]; view.y += shifts[event.key][1]; applyView(); }
  if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1.25); }
  if (event.key === '-') { event.preventDefault(); zoom(0.8); }
  if (event.key === '0') fitView();
});
new ResizeObserver(fitView).observe($('#canvas'));
$('#length-layout').addEventListener('click', () => { mode = 'lengths'; renderTree(); });
$('#topology-layout').addEventListener('click', () => { mode = 'topology'; renderTree(); });
$('#show-lengths').addEventListener('change', () => { const id = selected; renderTree(); inspect(id); });
$('#node-picker').addEventListener('change', event => inspect(event.target.value));
$('#tree-picker').addEventListener('change', event => { treeIndex = Number(event.target.value); renderTree(); });
input.addEventListener('input', () => { fileRequest++; dirtyState(); $('#validation').replaceChildren(); });
input.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); fileRequest++; importText('Pasted Newick'); } });
$('#draw-tree').addEventListener('click', () => { fileRequest++; importText('Pasted Newick'); });
$('#load-example').addEventListener('click', () => { fileRequest++; input.value = EXAMPLE; importText('example.nwk', true); });
$('#choose-file').addEventListener('click', () => $('#file-input').click());
async function openFile(file) {
  if (!file) return;
  const request = ++fileRequest;
  try {
    if (file.size > LIMITS.characters) throw new Error('File exceeds the 500 KB import limit.');
    const bytes = await file.arrayBuffer();
    if (request !== fileRequest) return;
    input.value = decodeNewickFile(bytes);
    importText(file.name);
  } catch (error) { if (request === fileRequest) fail(error); }
}
$('#file-input').addEventListener('change', event => { openFile(event.target.files[0]); event.target.value = ''; });
$('#choose-file').addEventListener('dragover', event => { event.preventDefault(); $('#choose-file').classList.add('dragging'); });
$('#choose-file').addEventListener('dragleave', () => $('#choose-file').classList.remove('dragging'));
$('#choose-file').addEventListener('drop', event => { event.preventDefault(); $('#choose-file').classList.remove('dragging'); openFile(event.dataTransfer.files[0]); });
$('#export-tree').addEventListener('click', () => {
  try {
    if (input.value !== validatedText) throw new Error('Import your edited source before exporting.');
    const trees = $('#export-scope').value === 'all' ? forest : [forest[treeIndex]];
    const output = serializeNewick(trees, { includeLengths: $('#export-lengths').checked });
    // Validate the entire document before requesting any download.
    parseNewick(output);
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url;
    link.download = `${sourceName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 70) || 'ecophylo'}${forest.length > 1 && trees.length === 1 ? `-tree-${treeIndex + 1}` : ''}.nwk`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
    setStatus(`Download requested · ${trees.length} ${trees.length === 1 ? 'tree' : 'trees'} · UTF-8 Newick`);
  } catch (error) { validation(error.message, true); }
});
input.value = EXAMPLE;
importText('example.nwk', true);
