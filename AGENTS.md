# Ireland voting simulation

The goal of this project is to provide a web page that visualises the Irish electoral system and allows users to experience it (specifically the single transferable vote). It must be built as a static web application with a full client-side implementation using JavaScript, requiring no separate server.

## Management of election-related objects.

It should effectively represent the objects typically found in an election. This would include voters, candidates, ballot papers, and election rounds.

The current implementation already models these through code-level objects and JSDoc types such as:

- `Candidate`
- `Preference`
- `BallotPaper`
- `CandidateTally`
- `StvCountAction`
- `StvCountResult`
- `StvElectionResult`

When extending the system, prefer preserving these concepts and naming rather than inventing parallel terminology.

### Reference

Just for your information.

* https://www.electoralcommission.ie/irelands-voting-system/?utm_source=chatgpt.com

## Current project structure

The repository is no longer a single-file prototype. It is currently organised as follows.

### Core pages

- `index.html`
  - Main simulator page
  - Candidate management, ballot creation, bulk scenario upload, STV execution, and experimental visualisation
- `docs.html`
  - Documentation page
  - Renders `README.md` in-browser through a markdown library

### JavaScript modules

- `js/app.js`
  - Main UI entry point
  - Handles forms, in-memory managers, scenario import, result rendering
- `js/stv-engine.js`
  - Core STV counting engine
  - Handles quota calculation, count loop, surplus transfer, exclusion, finalisation
- `js/stv-visualization.js`
  - Experimental count visualisation module
  - Handles count explorer, lane-based visualisation, SVG transfer arrows, ballot trace details
- `js/readme-renderer.js`
  - Documentation page renderer
  - Loads `README.md` and renders it with an external markdown library

### Scenario and test assets

- `scenarios/*.json`
  - Bulk import samples and regression test fixtures
- `tests/run-stv-tests.js`
  - Node-based scenario regression runner

### Documentation

- `README.md`
  - User-facing documentation
  - Contains scenario paths, STV formula summary, glossary, test commands

## Scenario format

Bulk upload and automated tests intentionally share the same scenario JSON format.

Required high-level fields:

- `name`
- `seatCount`
- `candidates`
- `ballots`

Optional test-only field:

- `expected`

When adding scenarios, keep them browser-usable from `/scenarios/<file>.json` and compatible with `tests/run-stv-tests.js`.

## Counting engine expectations

The project currently supports more than first-round counting. The engine already includes:

- Droop quota calculation
- repeated count execution until election is resolved
- surplus transfer handling
- lowest-candidate exclusion handling
- continuing/elected/excluded candidate states
- exhausted ballot handling
- deterministic tie-breaking for the simulator
- transfer trace data for visualisation

When changing engine behavior:

- update JSDoc in Korean
- preserve compatibility with current result object structure unless there is a strong reason not to
- keep the scenario regression tests passing, or update scenarios intentionally

## Visualisation expectations

There is now an experimental visualisation layer. It is acceptable to iterate on it aggressively, but:

- do not break the basic table-based results view
- keep complex visualisation logic in `js/stv-visualization.js`, not `js/app.js`
- if you expose more ballot-level detail, prefer progressive disclosure such as `<details>` to avoid overwhelming the main screen

## Documentation expectations

If behavior, structure, sample scenarios, or user-visible workflows change, update:

- `README.md`
- `docs.html` or `js/readme-renderer.js` if documentation rendering is affected
- `AGENTS.md` if the repository structure or working conventions materially change

The documentation page currently depends on a browser-loaded markdown library, so avoid reintroducing a hand-written markdown parser unless explicitly required.

## Agreement of code

### Javascript

When writing JavaScript code, priority must be given to stability.
While constant refactoring is not strictly mandatory, care should be taken to identify whether duplicate or similar functions already exist. Every function must have documentation(JSDoc) in Korean.

Additional working rules for this repository:

- Prefer extending existing STV types and data structures instead of creating ad hoc parallel objects.
- Keep DOM/UI concerns in `js/app.js` or `js/stv-visualization.js`; keep counting rules in `js/stv-engine.js`.
- If you add new result fields needed by the UI, make them explicit in the engine JSDoc.
- Node-based scripts in `tests/` must stay runnable without a browser.

### HTML & CSS

Try to avoid writing CSS from scratch if you can. Let's use the Bootstrap 5 library instead.

```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB" crossorigin="anonymous">
<script defer="" src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI" crossorigin="anonymous"></script>
```

Small amounts of targeted custom CSS are already in use for the experimental visualisation and documentation page. This is acceptable when Bootstrap alone is insufficient, but:

- keep custom CSS local and purposeful
- prefer visualisation-specific classes over broad global overrides
- do not replace Bootstrap structure unless needed

## Testing

Before finalising substantial changes, run the relevant checks when possible:

```bash
node --check js/app.js
node --check js/stv-engine.js
node --check js/stv-visualization.js
node --check js/readme-renderer.js
node tests/run-stv-tests.js
```

If a change affects scenarios, update or add scenario fixtures and expected outputs deliberately.

## Version control

You must manage your code using git. If possible, avoid committing directly to the main branch. Instead, it's recommended to create a branch for your work. Furthermore, all commit messages must be written in Korean, and don't be afraid to include detailed information.

Current branching practice in this repository:

- use feature branches for experimental UI/visualisation work
- merge experiments back into `feature/ballot-foundation` when stable
- only merge to `main` after code, scenarios, and documentation are aligned
