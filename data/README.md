# Data sources for the matching step

`sources-nz.json` is a catalogue of independent, non-advocacy sources a research agent can trawl for
evidence of how New Zealand parties and candidates align with the ten value dimensions.

It exists because the matching prompt generated on the results page asks an agent to research party
positions and cite its evidence. Without a source list, an agent falls back on whatever it happens to
remember, which is unsourced, unauditable and impossible to check for bias. This file makes the
sourcing hierarchy explicit and checkable.

The catalogue is jurisdiction data, deliberately kept separate from the country-neutral instrument in
`js/data.js`. To support another country, add `sources-xx.json` alongside it; nothing in the
questionnaire needs to change.

## The neutrality standard

**Included:** official government, parliamentary, electoral-commission and national-statistics
records; peer-reviewed academic party-position datasets; and non-partisan civic tech that republishes
official records without editorialising.

**Excluded:** advocacy-group scorecards and ratings, mission-driven think tanks, commercial
aggregators, and opinion media.

Inclusion is judged on a source's relationship to the record, not on whether its findings are
congenial. A source that applies an editorial or simplifying layer is marked `editorialised: true`
and should be treated as a lead to the primary source, not as evidence in itself.

Every excluded source is listed in the `excluded` array with the reason, so the boundary can be
argued with rather than taken on trust. Where exclusion rests on something unconfirmed, `verified` is
`false`.

## Two things that constrain what is possible

**Individual candidate positions are hard to establish in New Zealand.** Since 1996 most divisions in
the House are *party votes*, recording only the party name and its vote count; individual MPs are
named only when they vote against their party. There is no official votes database and no
parliamentary votes API. Individual positions are therefore recoverable from voting records only on
conscience votes and split-party votes, and conscience votes cluster almost entirely on the
`tradition` and `liberty` dimensions. For the other eight, candidate-level evidence has to come from
members' bills submitted to the ballot, maiden and selection speeches, and select-committee
questioning. An agent that reports confident candidate scores across all ten dimensions from voting
records alone is fabricating.

**Some sources cannot be redistributed.** NZES and the Manifesto Project both forbid passing their
data on, though both permit derived analytical outputs with attribution. Each source carries a
`redistributable` flag. Publish derived scores and citations; never reproduce the datasets. New
Zealand legislation is at the opposite extreme and has no copyright at all (Copyright Act 1994 s 27).

## Access traps

The `accessTraps` array is the practically important part for anyone writing a scraper. The worst is
that `www.parliament.nz` and `hansard.parliament.nz` return **HTTP 200 with a bot-check page** rather
than an error, so a status-code check passes while ingesting nothing. Use `www3.parliament.nz` and
assert on content. Treasury and Budget HTML sit behind a Cloudflare challenge, but their static asset
paths bypass it entirely.

Note also that searching for a "New Zealand Hansard API" surfaces a result describing an XML API
covering 1991 onward under CC-BY. That is the New South Wales Parliament in Australia. There is no
New Zealand Hansard API.

## Coverage is uneven, and the gaps matter

`dimensionCoverage` maps each dimension to the sources bearing on it. The Global Party Survey is the
only ready-made, freely redistributable matrix of New Zealand party positions, but it is a 2019
snapshot of five parties and is **silent on `diplomacy`, `liberty`, `local` and `change`**. For those,
Manifesto Project per-category codes and Hansard are the recourse, both of which cost far more effort.

A related trap: Manifesto Project scores measure *salience* — how much of a manifesto is devoted to a
topic — not position. A party that talks about the environment constantly while proposing to weaken
protections scores high on emphasis. Salience is not direction.

## Status

Compiled 5 September 2026 from live checks. Individual claims carry a `confidence` field, and items
that could not be confirmed are marked `UNVERIFIED` inline — notably the Hansard permalink pattern
and its specific licensing, the `archive.electionresults.govt.nz` CSV URL patterns, the New Zealand
Web Archive snapshot pattern, and whether the 2026a Manifesto Project release includes the 2023 New
Zealand election. Treat this as a well-researched starting inventory to verify as you use it, not as
a validated reference.

Two dates matter for 2026: official candidate and party lists do not exist until **nominations close
at noon on 8 October 2026**, and the Pre-election Economic and Fiscal Update is due **29 September
2026**. Candidate-level research is not possible before the first of those.
