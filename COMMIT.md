# Commit instructions

This bundle is intended for `hyejuryu/neuro-deadlines`.

## Replace / add

- Replace `README.md`
- Replace `data/conferences.json`
- Add `data/tracking_scope.json`
- Replace `scripts/validate_data.py`

## Delete

Delete the unused duplicate file at repository root:

```bash
git rm conferences.json
```

The live site and validator use `data/conferences.json`; the root-level duplicate is not needed.

## Validate

```bash
python scripts/validate_data.py
```

Expected output:

```text
OK: 12 published conferences and 23 tracked series validated
```

## Suggested commit message

```text
Add tracking scope and refresh 2027 deadlines
```

## Changes included

- Establish Tracking Scope v1 with 23 recurring conference series.
- Separate monitoring scope from published edition data.
- Mark CJK Neuroscience Meeting active because the 2027 edition is officially announced.
- Keep Neuromatch Conference watch-only because no future edition is assumed.
- Correct EMBC 2027 workshop/full-paper deadlines to 2027-01-24 and poster deadline to 2027-04-23.
- Record the official 23:59 AoE deadline time for EMBC.
- Add NICE 2027 tutorial suggestion deadline (2026-12-02).
- Add ISMRM 2027 trainee stipend deadline (2026-10-28 23:59 UTC).
- Extend validation to cover both published conference data and tracking scope.
