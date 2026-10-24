# Milestone 01: independent Newick workspace

## Model and accepted input

A document is an ordered forest. Each node has a generated session ID, string
label, nullable nonnegative finite binary64 length, and an ordered children array.
Length belongs to the incoming edge; a root's length is an optional external stem.
Missing length is distinct from zero. Rooting and units are always unspecified.

- UTF-8 files, optionally beginning with a BOM; pasted Unicode text.
- One or more semicolon-terminated trees, preserving document/sibling order.
- Binary, unary and multifurcating trees, or a single named leaf.
- Optional internal labels and branch lengths; every leaf needs a nonblank label.
- Single-quoted labels with doubled apostrophes. Unquoted underscores become
  spaces; quoted underscores remain literal. Labels are not trimmed or normalized.
- Decimal lengths with optional sign/exponent. Reject negative/nonfinite lengths,
  invalid tokens and nonzero values that underflow to zero. Normalize signed zero.
- Preserve numeric internal labels as strings; never infer bootstrap support.
- Reject bracket comments, rootedness markers, NHX/BEAST attributes, NEXUS blocks,
  calibration data and other dialects explicitly. No silent metadata dropping.

Bounds: 500,000 source characters, 500,000 file bytes, 2,000 nodes per document,
100 trees, nesting depth 128 (root depth 0), 2,000 UTF-16 code units per label.
Invalid Unicode surrogates and ASCII controls in labels are rejected. Duplicate
leaf labels are accepted with warnings, without merging identities.

## Validation and state

Typed parse errors include a stable code, zero-based character offset and one-based
line/column. Input errors never replace the last valid forest. Changed source
disables export until a successful import; failures also disable export. The view
clearly states that it retains the last valid tree. File read/decode errors are
reported without overwriting the old model. A request counter prevents slow file
reads from superseding a later paste or file selection.

## Visualization and inspection

SVG rectangular tree, preserving sibling order. Topology mode spaces each edge
equally; length mode uses cumulative edge length and is available only when all
non-root edges have lengths. Missing lengths are never manufactured. For a
complete all-zero tree the initial view uses topology; length mode may co-locate
nodes faithfully. Root stems do not affect layout. Layout never mutates the model.

Drag empty canvas to pan; wheel or buttons zoom; Fit resets framing. Pointer
events support touch panning. Keyboard users can focus the canvas and use arrows,
plus/minus and 0 (Fit), or select/focus a node with the inspector dropdown. Node
buttons support Enter/Space. Wheel zoom is cursor-centered, bounded to 0.001–8x.
Fit accounts for large trees. No pinch-zoom gesture is implemented.

Inspect complete label, raw numeric length/missing state, parent, child count and
descendant leaf count. Long labels are shortened only on the canvas; full labels
remain in the inspector/tooltips. Branch-length captions are display-rounded;
export uses the stored number. Tree IDs identify nodes, even with duplicate names.

## Export contract

Export current tree or all trees, retaining order. Optional topology-only export
omits all lengths, including the root stem, without changing the stored model.

- Quote all labels except `[A-Za-z][A-Za-z0-9.-]*`; double internal apostrophes.
  Spaces, literal underscores, numeric labels, Unicode and punctuation are quoted.
- Encode shortest round-trip binary64 decimals using a dot and no grouping;
  expand exponent notation; preserve explicit zero and missing lengths.
- One tree per LF-terminated line, UTF-8 without BOM, at most 500,000 bytes and
  characters so output remains admissible for file import. No annotations or rootedness
  declarations are synthesized. Validate models against cycles/shared descendants,
  invalid labels/lengths and bounds; parse the generated document before downloading.
- Browser Blob download, sanitized `.nwk` filename, delayed object-URL revocation.
  Browser/OS handles destination, overwrite and cancellation. A requested download
  is not confirmation that bytes were saved; atomic filesystem writes are not promised.

## Verification

Core tests cover grammar, errors/positions, UTF-8, limits, label/number boundaries,
root stems, zero/missing lengths, multi-tree output, model validation, 150 seeded
generated round trips, immutable layout and zoom math. Browser tests exercise
paste/file import, invalid input, selection, zoom/pan, download/reimport, export
options, multiple trees, keyboard controls and narrow-screen layout.

MEGA12 differential tests are out of scope. Independent behavior is tested against
the profile above; no exact MEGA12 compatibility, support interpretation or dating
behavior is claimed.
