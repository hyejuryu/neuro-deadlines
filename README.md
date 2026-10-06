# Neuro Deadlines

A small, curated deadline tracker for conferences relevant to computational neuroscience, systems neuroscience, cognitive neuroscience, human neuroimaging, EEG/MEG, BCI, neurotechnology, and NeuroAI.

The project intentionally uses **no frontend framework and no build step**. The site is plain HTML/CSS/JavaScript. Published conference editions live in `data/conferences.json`, while the recurring series monitored for future updates live in `data/tracking_scope.json`.

## Design principles

1. **Official sources are authoritative.** Aggregators can help discover events, but every deadline record must link to an official conference or society page.
2. **Do not invent precision.** If the source publishes only a date, store only a date. Add `datetime` only when the source publishes an exact time and timezone/offset.
3. **Tracking and publication are separate.** `data/tracking_scope.json` defines the recurring series to monitor. `data/conferences.json` contains only specific editions supported by official event information.
4. **Data and presentation stay separate.** Routine maintenance should usually require editing data files rather than frontend code.
5. **Small taxonomy.** Add an area tag only when it helps users filter materially different research communities.
6. **Validation before publication.** `scripts/validate_data.py` checks both data files with Python's standard library, and GitHub Actions runs it on pushes and pull requests.

## Repository structure

```text
.
├── .github/workflows/validate.yml
├── assets/
│   ├── app.js
│   └── styles.css
├── data/
│   ├── conferences.json
│   └── tracking_scope.json
├── scripts/
│   └── validate_data.py
├── .nojekyll
├── index.html
├── LICENSE
└── README.md
```

## Tracking Scope v1

`data/tracking_scope.json` is the baseline monitoring universe for recurring conference series. It is intentionally broader than the set of conference cards currently published on the site.

The scope is grouped into:

- `core`: directly relevant recurring communities in computational neuroscience, human neuroimaging, cognitive neuroscience, EEG/MEG, BCI/neural engineering, and closely related methods.
- `adjacent`: useful neighboring communities such as biomedical engineering, medical image computing, neuroinformatics, broad European neuroscience, biomagnetism, and selected NeuroAI/methods venues.
- `regional_opportunity`: regional meetings with practical scientific, presentation, or networking value.

Tracking status has two values:

- `active`: an edition or current cycle is sufficiently concrete to monitor now.
- `watch`: retain the series in scope, but wait for a future edition or stronger current-cycle information before treating it as an active deadline source.

Scope membership does **not** automatically create a conference card. A specific edition belongs in `data/conferences.json` only when an official conference or society source confirms usable event information. If an edition is confirmed but deadlines are not yet announced, it may be published with an empty `deadlines` list and a `tba_note`.

The scope should be reconsidered conservatively. Additions or removals should be evidence-based; weakly related events should not be added merely to increase coverage.

## Add or update a conference

Edit `data/conferences.json`.

A minimal entry with a published deadline:

```json
{
  "id": "example-2027",
  "name": "EXAMPLE",
  "full_name": "Example Neuroscience Conference",
  "year": 2027,
  "website": "https://example.org/",
  "venue_type": "conference",
  "areas": ["computational"],
  "event": {
    "start": "2027-07-01",
    "end": "2027-07-03",
    "location": "City, Country"
  },
  "deadlines": [
    {
      "type": "abstract",
      "label": "Abstract submission",
      "date": "2027-03-01",
      "source_url": "https://example.org/call",
      "verified_on": "2026-10-02"
    }
  ]
}
```

If the official source gives an exact time, add an ISO 8601 timestamp with an explicit UTC offset:

```json
"datetime": "2027-03-01T23:59:00-05:00"
```

If deadlines are not yet announced, keep `deadlines` empty and record the verification state:

```json
"deadlines": [],
"tba_note": "2027 submission deadlines have not been posted yet.",
"verified_on": "2026-10-02"
```

## Maintain the tracking scope

Edit `data/tracking_scope.json` only when the monitored series, tier, status, official source, or rationale materially changes.

Do not move a series from `watch` to `active` merely because recurrence is expected. Use an official source showing a current or future edition, CFP cycle, or equivalent concrete activity.

## Validate locally

```bash
python scripts/validate_data.py
```

## Preview locally

Because the page fetches the JSON dataset, serve the folder over HTTP rather than opening `index.html` directly:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

For this no-build static site, use GitHub Pages' branch publishing:

1. Create a repository (recommended name: `neuro-deadlines`).
2. Put these files on the `main` branch.
3. In **Settings → Pages**, choose **Deploy from a branch**.
4. Choose branch **main** and folder **/(root)**, then save.

The site will be available at `https://<username>.github.io/neuro-deadlines/` unless the repository itself is named `<username>.github.io`.

## Current v0.1 scope

The published dataset remains deliberately small and evidence-driven. Tracking Scope v1 is broader, but conference cards should expand only when a specific edition can be verified from official sources.

## License

MIT. Conference names, dates, and source links remain factual information belonging to their respective organizers; this repository licenses only the original site code and documentation.
