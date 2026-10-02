# Neuro Deadlines

A small, curated deadline tracker for conferences relevant to computational neuroscience, systems neuroscience, cognitive neuroscience, human neuroimaging, EEG/MEG, BCI, neurotechnology, and NeuroAI.

The project intentionally uses **no frontend framework and no build step**. The site is plain HTML/CSS/JavaScript, and conference records live in one JSON file.

## Design principles

1. **Official sources are authoritative.** Aggregators can help discover events, but every deadline record must link to an official conference or society page.
2. **Do not invent precision.** If the source publishes only a date, store only a date. Add `datetime` only when the source publishes an exact time and timezone/offset.
3. **Data and presentation stay separate.** Routine maintenance should usually require editing only `data/conferences.json`.
4. **Small taxonomy.** Add an area tag only when it helps users filter materially different research communities.
5. **Validation before publication.** `scripts/validate_data.py` checks the dataset with Python's standard library, and GitHub Actions runs it on pushes and pull requests.

## Repository structure

```text
.
├── .github/workflows/validate.yml
├── assets/
│   ├── app.js
│   └── styles.css
├── data/
│   └── conferences.json
├── scripts/
│   └── validate_data.py
├── .nojekyll
├── index.html
├── LICENSE
└── README.md
```

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

The initial dataset is deliberately small. It seeds conferences that are directly relevant to the target communities and whose 2027 information could be verified from official sources as of 2026-10-02. Coverage should expand conservatively rather than by copying unverified aggregator entries.

## License

MIT. Conference names, dates, and source links remain factual information belonging to their respective organizers; this repository licenses only the original site code and documentation.
