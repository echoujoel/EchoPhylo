# Milestone 01 verification

Verified on 2026-10-24 in WSL Linux with Node.js 24.18.0, npm 11.16.0,
Vite 8.3.5 and Playwright 1.64.1 using its installed Chromium.

## Automated results

- `npm run check`: all 11 core tests passed and the static production build
  completed. Tests include 150 seeded generated tree round trips, golden output,
  Unicode/quoting, numerical extremes, invalid input and graph rejection, limits,
  layout immutability and zoom calculations.
- `npm run test:e2e`: all 5 browser workflows passed. The browser loaded
  `http://127.0.0.1:5173/` and exercised the built-in example, node inspection,
  pan/zoom, keyboard interaction, pasted and file input, actual download and file
  reimport, multi-tree selection and export scope, optional length omission,
  validation failures, safe rendering of hostile labels and a 390px viewport.
  Uncaught page errors fail the browser tests.
- `git diff --check`: passed before the milestone commit.

The first browser run exposed an ambiguous test selection: the string `1` matched
the first tree's visible label as well as the second tree's option value. The test
now selects the explicit value `{ value: '1' }`; the full suite passes. No
application change was needed for that failure.

The managed sandbox prevents starting the browser test server. Browser verification
therefore ran with approved execution outside the sandbox. An existing preview
server on port 5173 was reused; a second server correctly refused the occupied port.
No new dependencies were installed during this verification.

## Remaining manual checks

- Open the preview from the Windows host to check WSL localhost forwarding.
- Check screen-reader announcements and navigation with assistive technology.
- Check physical touch panning and browser download save/cancel behavior.
- Check Firefox, Safari and other browser engines; automated coverage is Chromium.
- Check representative scientific datasets and other Newick consumers before
  extending compatibility claims. No MEGA12 differential comparison was performed.

The built-in plant tree is illustrative, not an inferred scientific result.
Annotations, support interpretation, biological rooting and dating remain outside
this milestone. See the supported profile in the behavior specification.
