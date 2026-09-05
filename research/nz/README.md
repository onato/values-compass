# Research archive: New Zealand, 2026 general election

Source documents used to score parties on the ten value dimensions, kept here so every score in
`data/nz/parties/` can be re-checked against the document it rests on, and so the assessment can be
re-run when parties publish new material.

## Layout

```
research/nz/shared/        documents that bear on several parties: coalition agreements 2023,
                           party self-placements, statutory assessments, section 7 reports
research/nz/<party-id>/    that party's manifesto, policy pages, costed plan, key speeches and votes
research/nz/*/manifest.json  one entry per file: filename, title, sourceUrl, fetchedAt, notes
```

Party ids match `data/nz/parties/<id>.json`: `national`, `labour`, `green`, `act`, `nzfirst`,
`maori`, `top`.

## Rules

- Nothing is scored from a source that is not archived here or linked with a stable official URL.
- Every file is listed in its folder's `manifest.json` with the URL it came from and the fetch date.
- Web pages are saved as the text or HTML actually retrieved, not re-typed. PDFs are stored as fetched.
- Sources with redistribution limits (see `data/sources-nz.json`) are summarised in notes, not copied.
- The scoring rule is `docs/party-scoring-rubric.md`.

## Copyright note

Coalition agreements, Hansard, legislation, statutory reports and Cabinet material are Crown or
parliamentary material that may be reproduced. Party manifestos are the parties' copyright; they are
archived here for analysis and verification of the published scores. This repository is deployed
publicly by the Pages workflow, so anything placed here is served publicly.
