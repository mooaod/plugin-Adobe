# Final Review Fix Report

## Scope

Resolved all Critical and Important findings from the final review of commit
`6cc456e`.

## TDD evidence

- RED: added regression coverage first and ran `npm test`; 29 tests passed and
  14 failed for the missing review requirements.
- GREEN: implemented each required behavior and ran the focused host, catalog,
  and panel suites as each boundary was completed.
- Additional RED/GREEN cycle: verified automatic update bookkeeping leaked
  merged custom presets into the catalog cache, then changed it to persist only
  the base catalog.
- Additional RED/GREEN cycle: verified a failed custom-store write left an
  unsaved preset visible, then made the UI roll the addition back.

## Implemented fixes

1. WebP compatibility
   - Host runtime-detects both `ExportType.WEBP` and `ExportOptionsWebP`.
   - The panel adds WebP only after Illustrator reports support.
   - Direct unsupported requests return `FORMAT_UNAVAILABLE` JSON.
   - PNG/JPG remain available when WebP globals are absent (Illustrator 19).
2. Existing-output preflight
   - Every selected output path is checked before any export begins.
   - All existing filenames are returned together as `OUTPUT_EXISTS` conflicts.
   - The panel lists all conflicts and retries with `overwriteExisting: true`
     only after explicit user confirmation; declining exports nothing.
3. Custom presets
   - Custom presets use a separate `social-presets-custom.json` local store.
   - They are validated and merged with bundled/cached/remote catalogs by unique
     ID, with local custom data taking precedence.
   - Remote/cache writes never write, replace, or delete the custom store.
   - The panel provides ID, label, width, and height inputs for adding presets.
4. Structured batch-create failures
   - Artboard add and naming failures return `CREATE_FAILED` JSON with all
     artboards created up to and including the point of failure where applicable.
5. JSON robustness
   - ExtendScript host quoting now escapes all JSON control characters plus
     U+2028 and U+2029.

## Documentation

The README now documents existing-file confirmation, separate durable custom
presets, and that WebP requires a compatible Illustrator version while PNG/JPG
remain supported in Illustrator 19.

## Verification note

Automated Node tests cover the host contract and simulated CEP panel workflow.
An interactive smoke test in an installed Illustrator/CEP runtime remains a
manual release check.
