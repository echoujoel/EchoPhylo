# EcoPhylo

An open-source workspace for evolutionary genetics and ecological data analysis,
developed in the **EchoPhylo** repository. Milestone 01 is a working, local Newick
tree viewer and exporter. Sequence alignment, tree inference and evolutionary
analysis remain on the roadmap.

## Run locally

Requires Node.js **22.12 or later** and npm (verified with Node 24.18.0).

```bash
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. The development server binds to loopback and uses a
strict port; stop another process on that port before starting a second instance.
In WSL, the same URL is normally accessible from the Windows browser through
localhost forwarding. No account, API key or backend is required.

## Main workflow

1. Explore the built-in illustrative plant tree, or choose **Open a Newick file**,
   drop a file onto that button, or paste text into **Newick source**.
2. Select **Visualize tree** (or Ctrl/Cmd+Enter). Invalid input shows an error code
   and line/column, while retaining the last valid visualization.
3. Click a node or use the inspector dropdown to inspect its complete label,
   incoming length, parent, children and descendant leaf count.
4. Drag the canvas to pan; use the wheel or +/− buttons to zoom; use **Fit tree to
   view** to reset framing. Switch between branch-length and topology layouts.
5. Choose current/all trees and whether to include lengths, then **Export Newick**.
   Reimport the download to continue working. Unapplied source edits disable export.

Keyboard: focus the canvas to pan with arrow keys, zoom with +/−, or fit with 0.
Node buttons support Enter/Space. The inspector provides a keyboard-accessible
alternative to canvas selection. Touch panning is supported; pinch zoom is not.

Data is processed in browser memory. There are no application upload endpoints,
analytics, external fonts or production runtime dependencies. Reloading the page
discards imported data; export anything you want to keep. Downloads use the
browser's save/overwrite/cancel handling and do not guarantee filesystem atomicity.

## Build and preview

```bash
npm run build      # produces dist/
npm run preview    # serves the production build
```

Production preview: **http://127.0.0.1:4173/**. Deploy `dist/` with a static web
server. `npm run preview` is a local verification server, not a production host.

## Tests

```bash
npm test                         # parser, serializer, layout and zoom tests
npm run check                    # core tests + production build
npx playwright install chromium  # one-time browser download
npm run test:e2e                  # real browser workflow tests
```

Playwright starts the development server when needed, or reuses a local server at
port 5173. Test downloads/traces are written under ignored `test-results/`.
Linux hosts need the system libraries required by Playwright's Chromium.

Core verification includes golden output, invalid grammar and error positions,
quoted/Unicode labels, missing/zero lengths, root stems, numeric extremes, UTF-8
errors, input limits, invalid graphs and **150 seeded generated round trips**.
Browser tests cover file/paste import, selection, pan/zoom, export/download/reimport,
multiple trees, invalid input, safe text rendering and a narrow viewport.

## Supported Newick profile

- UTF-8 files (`.nwk`, `.newick`, `.tre`, `.tree`, `.txt`) or pasted text; optional
  input BOM. Any extension may be dropped; actual contents are validated.
- One or multiple semicolon-terminated trees, including unary and multifurcating
  trees and a single named leaf. Input tree and sibling order are preserved.
- Quoted labels, doubled apostrophes and Unicode. Unquoted underscores mean spaces;
  quoted underscores remain literal. Internal numeric labels remain **labels**.
- Optional finite, nonnegative decimal/exponent lengths. Missing values stay
  missing; explicit zeros stay zero. A root stem length is preserved, inspected
  separately and excluded from the plotted edges.
- Branch-length view when every edge has a length; otherwise topology view avoids
  inventing distances. A complete all-zero tree initially uses topology spacing.
- Canonical export: UTF-8 without BOM, one tree per LF-terminated line, conservative
  single quoting, doubled apostrophes and locale-independent round-trip numbers.
- Up to **500 KB**, **2,000 nodes/document**, **100 trees**, **128 nesting levels**
  and **2,000 UTF-16 code units/label**. Export is bounded too, so it remains
  admissible for file reimport. Duplicate leaf names are warned about, not merged.

Example:

```newick
(('Quercus robur':0.12,'Betula pendula':0.18)Broadleaves:0.14,'Pinus sylvestris':0.2)Plants;
```

See the [behavior specification](docs/specifications/newick-milestone-01.md) for
precise validation, normalization, display and export policies.

## Limitations and independence

This is an **independent implementation**, not a MEGA12 port or compatibility layer.
Completed MEGA12 research informed the feature requirements; recovered pseudocode,
proprietary code, assets and binary layouts were not copied into the application.
See [research notes](docs/research/mega12-evidence.md) for the evidence boundary.

Bracket comments and annotations (including `[&R]`, `[&U]`, NHX, BEAST attributes and
bracketed support values) are explicitly rejected; metadata is never silently
discarded. NEXUS containers and binary tree sessions are unsupported. Negative,
nonfinite and underflowing nonzero lengths are rejected. Every leaf needs a name.

Biological rooting, bootstrap interpretation, annotation semantics, time units,
calibrations and divergence-time conversion are not inferred. MEGA12's exact
encoding, rooting and timetree behavior remain unresolved in the research. Our
explicit profile is tested independently; exact MEGA12 compatibility is not claimed.
Different Newick dialects may interpret numeric labels or extensions differently.

There is no editing, rerooting, sequence alignment, tree inference, dating, server
storage or session persistence yet. Large trees may require zooming and inspector
navigation. Canvas labels are shortened for readability; the inspector retains
the full label. Screen-reader, physical touch and cross-browser checks remain
manual verification items; see [verification notes](docs/research/verification.md).

## Roadmap

- **01 — Newick workspace:** import/validation, interactive visualization,
  inspection and round-trip export.
- **02 — Interoperability:** explicit annotation profiles, separate support values,
  cross-consumer fixtures, richer accessibility and larger-tree navigation.
- **03 — Tree tools:** editing, explicit rerooting, comparisons, SVG export and
  portable saved sessions, with documented numerical behavior.
- **04 — Scientific workflows:** sequence/alignment import, independently selected
  alignment and phylogenetic inference engines, followed by evolutionary/ecological
  analyses with reproducible parameters and scientific validation.

## Project structure

- `src/newick.js`: independent parser, validation and canonical serializer.
- `src/layout.js`: tree layout and zoom calculations.
- `src/main.js` and `src/style.css`: interactive workspace and styling.
- `tests/`: core tests and Playwright browser workflows.
- `docs/research/`: evidence boundaries and verification results.
- `docs/specifications/`: supported behavior and export contract.
- `public/`: original application assets; `dist/`: generated static build.

## License

[MIT](LICENSE), copyright © 2026 ECHOU JOEL. The repository's existing license is
preserved. No application licensing decision remains open for this milestone.
Vite (MIT) provides development/build tooling and Playwright (Apache-2.0) provides
browser testing. Their transitive dependencies retain their own licenses; see
the installed packages' license files. Neither tool is a production runtime
dependency. The parser, serializer, layout and interface are original project code.
