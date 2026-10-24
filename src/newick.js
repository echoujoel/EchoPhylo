/** Independent Newick profile. No MEGA code or binary layout is used here. */
export const LIMITS = Object.freeze({ characters: 500_000, nodes: 2_000, trees: 100, depth: 128, label: 2_000 });

export class NewickError extends Error {
  constructor(code, message, text = '', offset = 0) {
    const before = text.slice(0, offset).split('\n');
    const line = before.length;
    const column = before.at(-1).length + 1;
    super(`${message} (line ${line}, column ${column})`);
    this.name = 'NewickError';
    Object.assign(this, { code, offset, line, column });
  }
}

/** @returns {{trees: Array, warnings: string[]}} */
export function parseNewick(text) {
  if (typeof text !== 'string') throw new TypeError('Newick input must be text.');
  let at = 0;
  let count = 0;
  const fail = (code, message, offset = at) => { throw new NewickError(code, message, text, offset); };
  if (text.length > LIMITS.characters) fail('INPUT_LIMIT', `Input exceeds ${LIMITS.characters.toLocaleString('en-US')} characters.`);
  if (!text.isWellFormed()) fail('INVALID_UNICODE', 'Text contains an invalid Unicode surrogate.');
  if (text.startsWith('\uFEFF')) at++;
  const space = () => { while (at < text.length && /[ \t\r\n]/.test(text[at])) at++; };
  const annotation = () => {
    if (text[at] === '[') fail('UNSUPPORTED_ANNOTATION', 'Square-bracket comments and annotations are not supported in this milestone. Remove them explicitly before importing.');
  };
  function label() {
    const start = at;
    let value = '';
    if (text[at] === "'") {
      at++;
      let closed = false;
      while (at < text.length) {
        const ch = text[at++];
        if (ch !== "'") value += ch;
        else if (text[at] === "'") { value += "'"; at++; }
        else { closed = true; break; }
        if (value.length > LIMITS.label) fail('LABEL_LIMIT', `Labels may contain at most ${LIMITS.label} characters.`, start);
      }
      if (!closed) fail('UNCLOSED_QUOTE', 'Quoted label has no closing apostrophe.', start);
    } else {
      while (at < text.length && !/[ \t\r\n(),:;\[\]']/.test(text[at])) value += text[at++];
      value = value.replaceAll('_', ' ');
    }
    if (value.length > LIMITS.label) fail('LABEL_LIMIT', `Labels may contain at most ${LIMITS.label} characters.`, start);
    if (/[\u0000-\u001f\u007f]/.test(value)) fail('INVALID_LABEL', 'Labels cannot contain control characters or line breaks.', start);
    return value;
  }
  function subtree(depth) {
    space(); annotation();
    if (depth > LIMITS.depth) fail('DEPTH_LIMIT', `Tree nesting exceeds ${LIMITS.depth} levels.`);
    if (++count > LIMITS.nodes) fail('NODE_LIMIT', `A document may contain at most ${LIMITS.nodes.toLocaleString('en-US')} nodes.`);
    const node = { id: `node-${count}`, label: '', length: null, children: [] };
    if (text[at] === '(') {
      at++;
      space();
      if (text[at] === ')') fail('EMPTY_GROUP', 'An internal node must have at least one child.');
      while (true) {
        node.children.push(subtree(depth + 1));
        space(); annotation();
        if (text[at] !== ',') break;
        at++;
      }
      if (text[at] !== ')') fail('EXPECTED_CLOSE', 'Expected a comma or closing parenthesis.');
      at++; space(); annotation();
      node.label = label();
    } else {
      node.label = label();
      if (!node.label.trim()) fail('MISSING_LABEL', 'Each leaf needs a nonempty label.');
    }
    space(); annotation();
    if (text[at] === ':') {
      at++; space(); annotation();
      const start = at;
      while (at < text.length && !/[ \t\r\n(),;\[\]]/.test(text[at])) at++;
      const token = text.slice(start, at);
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)) fail('INVALID_LENGTH', 'Expected a decimal branch length, such as 0.12 or 1e-3.', start);
      const value = Number(token);
      if (!Number.isFinite(value)) fail('NONFINITE_LENGTH', 'Branch lengths must be finite numbers.', start);
      if (value < 0) fail('NEGATIVE_LENGTH', 'Negative branch lengths are not supported.', start);
      if (value === 0 && /[1-9]/.test(token.split(/[eE]/)[0])) fail('LENGTH_UNDERFLOW', 'Branch length is too small to represent without becoming zero.', start);
      node.length = Object.is(value, -0) ? 0 : value;
    }
    space(); annotation();
    return node;
  }
  const trees = [];
  space(); annotation();
  if (at === text.length) fail('EMPTY_INPUT', 'Paste a Newick tree or choose a file to begin.');
  while (at < text.length) {
    if (trees.length === LIMITS.trees) fail('TREE_LIMIT', `A document may contain at most ${LIMITS.trees} trees.`);
    const tree = subtree(0);
    if (text[at] !== ';') fail('EXPECTED_SEMICOLON', 'Every tree must end with a semicolon (;).');
    at++; trees.push(tree); space(); annotation();
  }
  const warnings = [];
  trees.forEach((tree, index) => {
    const leaves = flattenTree(tree).filter(n => !n.children.length);
    if (new Set(leaves.map(n => n.label)).size !== leaves.length) warnings.push(`Tree ${index + 1} has duplicate leaf labels. Nodes remain distinct.`);
    const lengths = flattenTree(tree).filter(n => n !== tree).map(n => n.length);
    if (lengths.some(n => n === null) && lengths.some(n => n !== null)) warnings.push(`Tree ${index + 1} has missing branch lengths. Use topology view for equal edge spacing.`);
    if (tree.length !== null) warnings.push(`Tree ${index + 1} has a root stem length. It is preserved on export but is not drawn as an edge.`);
  });
  return { trees, warnings };
}

export function flattenTree(root) {
  const result = [];
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    result.push(node);
    for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
  }
  return result;
}

export function encodeLabel(value) {
  return /^[A-Za-z][A-Za-z0-9.-]*$/.test(value) ? value : `'${value.replaceAll("'", "''")}'`;
}

/** Expand JS's shortest round-trip decimal into non-exponent notation. */
export function encodeNumber(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error('Branch lengths must be finite and nonnegative.');
  const token = String(Object.is(value, -0) ? 0 : value);
  if (!/[eE]/.test(token)) return token;
  const [coefficient, exponent] = token.split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);
  if (point <= 0) return `0.${'0'.repeat(-point)}${digits}`;
  if (point >= digits.length) return digits + '0'.repeat(point - digits.length);
  return `${digits.slice(0, point)}.${digits.slice(point)}`;
}

/** Validate independent model boundaries too; never silently emit a malformed graph. */
export function serializeNewick(trees, { includeLengths = true } = {}) {
  if (!Array.isArray(trees) || !trees.length || trees.length > LIMITS.trees) throw new Error('Provide 1–100 trees for export.');
  const seen = new Set();
  function write(node, depth) {
    if (!node || typeof node !== 'object' || seen.has(node)) throw new Error('Tree contains a cycle or shared descendant.');
    seen.add(node);
    if (seen.size > LIMITS.nodes || depth > LIMITS.depth) throw new Error('Tree exceeds the export size or nesting limit.');
    if (!Array.isArray(node.children) || typeof node.label !== 'string' || !node.label.isWellFormed() || node.label.length > LIMITS.label || /[\u0000-\u001f\u007f]/.test(node.label)) throw new Error('Invalid node label or children.');
    if (!node.children.length && !node.label.trim()) throw new Error('Leaf labels must not be empty.');
    // Validate even an omitted length: disabling an option must not conceal bad model data.
    if (node.length !== null && (typeof node.length !== 'number' || !Number.isFinite(node.length) || node.length < 0)) throw new Error('Invalid branch length.');
    const children = node.children.length ? `(${node.children.map(child => write(child, depth + 1)).join(',')})` : '';
    return children + (node.label ? encodeLabel(node.label) : '') + (includeLengths && node.length !== null ? `:${encodeNumber(node.length)}` : '');
  }
  const output = trees.map(tree => `${write(tree, 0)};`).join('\n') + '\n';
  if (output.length > LIMITS.characters || new TextEncoder().encode(output).byteLength > LIMITS.characters) throw new Error('Export exceeds the 500 KB document limit.');
  return output;
}

export function decodeNewickFile(bytes) {
  if (bytes.byteLength > LIMITS.characters) throw new Error('File exceeds the 500 KB import limit.');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('This file is not valid UTF-8. Save it as UTF-8 text before importing.'); }
}

export const EXAMPLE = `(('Quercus robur':0.12,'Betula pendula':0.18)Broadleaves:0.14,('Pinus sylvestris':0.20,'Picea abies':0.17)Conifers:0.16,('Pteridium aquilinum':0.28,'Dryopteris filix-mas':0.24)Ferns:0.22)Plants;`;
