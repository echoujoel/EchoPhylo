# Research boundary and implementation decisions

2026-10-24 · EcoPhylo milestone 01. Repository identity remains EchoPhylo;
the application name is EcoPhylo. The existing MIT license is unchanged.

Reviewed the completed reports in `/home/joel/mega12-analysis` before development:

- `installation-overview.md`: native Pascal/Lazarus/CEF application and installed components.
- `feature-map.md`: alignment, tree inference, evolutionary analysis and formats documented by shipped resources.
- `newick-export-workflow.md`: evidence of optional lengths/labels and distinct export paths, with important unresolved details.
- `independent-newick-spec.md`: a proposal for a neutral tree model and export tests, not an observed compatibility contract.

These reports motivate capability requirements. They do not supply application
code. No decompiler output, binary layouts, proprietary assets, executables,
help archives or analysis scratch files were imported into this repository.
No repeat binary investigation was needed. The parser, serializer, layout and UI
were written independently against the documented profile and tests.

## Evidence versus EcoPhylo choices

| Question | Evidence limitation | Milestone choice |
|---|---|---|
| Encoding | MEGA's exact output encoding/BOM unresolved | Strict UTF-8 files, optional input BOM, UTF-8 output without BOM, LF |
| Rooting | Native root-mode semantics incomplete | Retain given order/anchor; no biological root inference or rerooting; root stem is preserved but not drawn |
| Annotations | Support scale, internal labels and dialect handling incomplete | Reject all bracket comments/annotations explicitly; numeric internal labels are ordinary labels |
| Timetrees | Relative/absolute time paths only partially traced | Generic lengths with unspecified units; no calibration, dating or time conversion |
| Labels | Native leaf/internal escaping differs | One conservative independent quote policy for all labels |
| Zero lengths | Native writer can omit lengths for zero total length | Preserve every explicit zero; distinguish missing from zero |

The previous proposed specification rejected root stems. This milestone instead
preserves them because the Newick grammar permits a length on the top expression.
Other deliberate scope reductions: no support-value model, annotation extension,
dating calculations or filesystem atomic-overwrite promise in a browser download.

## External reference

[Gary Olsen's Newick grammar, hosted by PHYLIP](https://phylipweb.github.io/phylip/newick_doc.html)
defines parenthesized descendants, labels, branch lengths and semicolon termination.
It describes doubled apostrophes in quoted labels and the unquoted-underscore
convention. EcoPhylo follows these label conventions and explicitly narrows the
accepted profile: no bracket comments or negative lengths, named leaves required.
Singleton and unary trees are supported as documented extensions for useful
degenerate data. Compatibility across every Newick dialect is not asserted.

[Vite's official guide](https://vite.dev/guide/) informed the local development,
static build and preview setup. There are no production runtime dependencies,
remote fonts, analytics or application upload endpoints. Dependency versions are
pinned in package.json and package-lock.json.
