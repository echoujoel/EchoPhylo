import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNewick, serializeNewick, encodeNumber, decodeNewickFile, flattenTree, NewickError, LIMITS, EXAMPLE } from '../src/newick.js';
import { layoutTree, zoomAt } from '../src/layout.js';

const semantic = node => ({ label: node.label, length: node.length, children: node.children.map(semantic) });
const roundTrip = input => {
  const first = parseNewick(input);
  const output = serializeNewick(first.trees);
  assert.deepEqual(parseNewick(output).trees.map(semantic), first.trees.map(semantic));
  assert.equal(serializeNewick(parseNewick(output).trees), output);
  return output;
};

test('golden output preserves topology, order, labels and present/absent/zero lengths', () => {
  assert.equal(roundTrip('((A:.1,B:0)Clade:2,C);'), '((A:0.1,B:0)Clade:2,C);\n');
  assert.equal(roundTrip('(A:0,B:0);'), '(A:0,B:0);\n');
  assert.equal(roundTrip('(A,B,C);'), '(A,B,C);\n');
  assert.equal(roundTrip('(A);'), '(A);\n');
  assert.equal(roundTrip('A;'), 'A;\n');
  assert.equal(roundTrip('(A,B)Origin:0.5;'), '(A,B)Origin:0.5;\n');
  roundTrip(EXAMPLE);
});

test('quoted labels, apostrophes, Unicode and underscore convention', () => {
  const input = "('A B','A_B','O''Brien','a,b','β','[&R]','<script>'):0;";
  assert.equal(roundTrip(input), "('A B','A_B','O''Brien','a,b','β','[&R]','<script>'):0;\n");
  assert.equal(roundTrip('(A_B,\'A_B\');'), "('A B','A_B');\n");
  assert.equal(roundTrip("(A,B)'95';"), "(A,B)'95';\n");
  assert.equal(roundTrip('(A,B)95;'), "(A,B)'95';\n");
});

test('multiple trees, BOM and Windows whitespace; no tree discarded', () => {
  assert.equal(roundTrip('\uFEFF (A, B);\r\n(C,D);\t'), '(A,B);\n(C,D);\n');
  assert.equal(parseNewick('(A,A);').warnings.length, 1);
  assert.match(parseNewick('(A:0,B);').warnings[0], /missing branch lengths/);
  assert.match(parseNewick('A:0;').warnings[0], /root stem/);
});

test('topology-only export omits lengths without mutating model', () => {
  const forest = parseNewick('((A:0,B)X:2,C:3)R:1;').trees;
  const before = structuredClone(forest);
  assert.equal(serializeNewick(forest, { includeLengths: false }), '((A,B)X,C)R;\n');
  assert.deepEqual(forest, before);
});

test('decimal, exponent and IEEE-754 boundaries round-trip without display rounding', () => {
  for (const value of [0, -0, 0.1, 1.2345678901234567, Number.MIN_VALUE, Number.MAX_VALUE, 1e-8, 1e22]) {
    assert.equal(Number(encodeNumber(value)), Object.is(value, -0) ? 0 : value);
    assert.doesNotMatch(encodeNumber(value), /e|,/);
    roundTrip(`(A:${value},B:0);`);
  }
  assert.equal(roundTrip('(A:+1e-3,B:-0);'), '(A:0.001,B:0);\n');
});

test('invalid input has actionable typed errors and positions', () => {
  const cases = [
    ['', 'EMPTY_INPUT'], ['(A,B)', 'EXPECTED_SEMICOLON'], ['(A B);', 'EXPECTED_CLOSE'],
    ['(A,B;', 'EXPECTED_CLOSE'], ['();', 'EMPTY_GROUP'], ['(,A);', 'MISSING_LABEL'],
    ["('broken,B);", 'UNCLOSED_QUOTE'], ['(A:-1,B);', 'NEGATIVE_LENGTH'],
    ['(A:NaN,B);', 'INVALID_LENGTH'], ['(A:1e999,B);', 'NONFINITE_LENGTH'],
    ['(A:1e-999,B);', 'LENGTH_UNDERFLOW'], ['(A:1:2,B);', 'INVALID_LENGTH'],
    ['(A,B)[95];', 'UNSUPPORTED_ANNOTATION'], ['[&R](A,B);', 'UNSUPPORTED_ANNOTATION'],
    ["('a\nb',C);", 'INVALID_LABEL'], ['(A,\u0000);', 'INVALID_LABEL'],
    ['(A,\uD800);', 'INVALID_UNICODE'], ['(A,B);garbage', 'EXPECTED_SEMICOLON'],
  ];
  for (const [input, code] of cases) assert.throws(() => parseNewick(input), e => e instanceof NewickError && e.code === code, input);
  assert.throws(() => parseNewick('(A,\nB:-1);'), e => e.line === 2 && e.column === 3);
});

test('strict UTF-8 decoding and bounded input reject corrupt or excessive files', () => {
  assert.equal(decodeNewickFile(new TextEncoder().encode('(β,A);')), '(β,A);');
  assert.throws(() => decodeNewickFile(new Uint8Array([0xc3, 0x28])), /UTF-8/);
  assert.throws(() => decodeNewickFile(new Uint8Array(LIMITS.characters + 1)), /500 KB/);
  assert.throws(() => parseNewick(' '.repeat(LIMITS.characters + 1)), /exceeds/);
  assert.throws(() => parseNewick('('.repeat(130) + 'A' + ')'.repeat(130) + ';'), /nesting/);
  assert.throws(() => parseNewick(`(${'A,'.repeat(2000)}B);`), /nodes/);
  assert.throws(() => parseNewick('A;'.repeat(101)), /100 trees/);
  assert.throws(() => parseNewick(`${'A'.repeat(2001)};`), /Labels/);
});

test('export rejects malformed graphs and invalid models even if lengths are omitted', () => {
  const leaf = { label: 'A', length: null, children: [] };
  const root = { label: '', length: null, children: [leaf, leaf] };
  assert.throws(() => serializeNewick([root]), /shared descendant/);
  root.children = [root];
  assert.throws(() => serializeNewick([root]), /cycle/);
  assert.throws(() => serializeNewick([]), /Provide/);
  assert.throws(() => serializeNewick([{ ...leaf, label: '' }]), /empty/);
  for (const length of [-1, NaN, Infinity, undefined, '0.2']) assert.throws(() => serializeNewick([{ ...leaf, length }], { includeLengths: false }), /length/);
  const wideUnicode = { ...leaf, children: Array.from({ length: 500 }, () => ({ ...leaf, label: 'β'.repeat(600), children: [] })) };
  assert.throws(() => serializeNewick([wideUnicode]), /500 KB/);
});

test('deterministic generated forest round-trips 150 varied trees', () => {
  let seed = 53;
  const next = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; };
  const names = ['A_B', 'a,b', "O'Brien", 'β', 'space name', '<svg onload=evil()>', '95'];
  function make(depth) {
    const internal = depth < 4 && next() > 0.45;
    return { label: internal && next() > 0.5 ? '' : names[Math.floor(next() * names.length)], length: next() > 0.3 ? next() : null, children: internal ? Array.from({ length: 1 + Math.floor(next() * 4) }, () => make(depth + 1)) : [] };
  }
  for (let i = 0; i < 150; i++) {
    const tree = make(0);
    const output = serializeNewick([tree]);
    assert.deepEqual(parseNewick(output).trees.map(semantic), [semantic(tree)]);
  }
});

test('layout preserves order/data; partial lengths fall back; large lengths stay finite', () => {
  const root = parseNewick('((A:1,B:2):1,C:4);').trees[0];
  const before = structuredClone(root);
  const layout = layoutTree(root, 'lengths');
  assert.equal(layout.leaves, 3);
  assert.deepEqual(layout.nodes.filter(p => !p.node.children.length).map(p => p.node.label), ['A', 'B', 'C']);
  assert.ok(layout.positions.get(flattenTree(root).find(n => n.label === 'C').id).x > layout.positions.get(flattenTree(root).find(n => n.label === 'A').id).x);
  assert.deepEqual(root, before);
  const partial = parseNewick('(A:0,B);').trees[0];
  assert.equal(layoutTree(partial, 'lengths').complete, false);
  const huge = parseNewick('((A:1.7e308,B:1.7e308):1.7e308,C:0);').trees[0];
  assert.ok(layoutTree(huge, 'lengths').nodes.every(p => Number.isFinite(p.x)));
});

test('zoom anchors the pointer and clamps scale', () => {
  assert.deepEqual(zoomAt({ x: 0, y: 0, scale: 1 }, 2, { x: 50, y: 40 }), { x: -50, y: -40, scale: 2 });
  assert.equal(zoomAt({ x: 0, y: 0, scale: 1 }, 100, { x: 0, y: 0 }).scale, 8);
});
