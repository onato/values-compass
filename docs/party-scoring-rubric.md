# Party scoring rubric, version 1.0

How a party's published positions and record are turned into a score on each of the ten value dimensions used by the questionnaire. Published so every score can be checked and disputed.

## What is being scored

Each dimension is a scale from −100 (fully the second pole) to +100 (fully the first pole), the same scale the questionnaire gives a person. A party's score answers one question: **if this party governed alone, which way would it pull on this dimension, and how hard?**

- Programme first, record second. Score what the party currently proposes. Where its governing record contradicts its programme, keep the programme score and say so in the rationale.
- Values, not competence. Whether a party can deliver is reported separately, never folded into the score.
- Direction and strength, not salience. A party that says little about a dimension but is clear when it does gets a score with lower confidence. A party that talks a lot but points both ways gets a score near 0 with low confidence.
- Coalition compromises count for the party that demanded them, not the party that conceded them, where the coalition agreements make that clear.

## Anchors

| Score | Meaning |
|---|---|
| ±100 | The pole is a defining purpose of the party. Flagship policies push this way and the party accepts large costs on other values to do it. |
| ±60 | Clear, consistent direction across programme and record, with some pragmatic limits. |
| ±30 | Leans this way. The direction is visible but modest, hedged, or mainly rhetorical. |
| 0 | Genuinely balanced or silent, or points both ways with no net direction. |

Intermediate values are allowed. Use the anchors to keep parties comparable: two parties with the same score should be roughly as far from the centre on that dimension.

### Per-dimension anchors

**Solidarity (+) vs. Self-reliance (−).** +100: redistribution and universal provision are the party's central purpose; new taxes on wealth or high incomes to fund it. +60: expands transfers and public services, progressive tax, accepts higher spending. 0: keeps current settings. −60: cuts taxes ahead of services, tightens benefit conditions, emphasises work incentives and personal responsibility. −100: minimal state, flat or very low tax, welfare as a last resort.

**Regulation (+) vs. Market (−).** +100: public ownership of essential services, strong price and conduct regulation, active industrial policy. +60: willing to regulate markets and intervene where outcomes are unfair; keeps essential services public. 0: pragmatic case by case. −60: deregulation as a programme, competition preferred to intervention, privatisation or contracting out acceptable. −100: minimal regulation, regulatory-burden tests on all law, markets for nearly everything.

**Liberty (+) vs. Security (−).** +100: civil liberties, privacy and personal choice override public-order goals; opposes surveillance expansion and rights-limiting bills on principle. +60: usually sides with rights when they conflict with order; opposes bills reported inconsistent with the Bill of Rights. 0: balances case by case. −60: expands police powers, sentencing and enforcement; accepts rights limits for safety. −100: order and safety first; willing to limit protest, speech, association or franchise for it.

**Tradition (+) vs. Progress (−).** +100: preserving established moral norms, family structures and national customs is a stated purpose; opposes liberalising conscience measures. +60: socially conservative on most conscience votes and cultural questions. 0: no consistent direction, or leaves members free with no party line. −60: supports liberalising conscience measures and changing exclusionary traditions. −100: social change and inclusion are a defining purpose.

**Institutions (+) vs. Popular will (−).** +100: defers to courts, expert bodies and established process; supports independent institutions constraining the government of the day. +60: works through institutions, accepts judicial and expert checks, sceptical of referendums on rights. 0: mixed. −60: anti-elite framing; prefers referendums and direct mandates; willing to override or restructure independent bodies. −100: popular will and the elected government should not be constrained by unelected institutions.

**Cosmopolitan (+) vs. National (−).** +100: obligations to people everywhere; open immigration; international commitments override domestic interest; Treaty partnership as a constitutional relationship. +60: pro-immigration, keeps international commitments, aid and refugee quota expansion. 0: balanced. −60: citizens first, tighter immigration, sceptical of international obligations, expects assimilation. −100: national interest and cohesion override external obligations; withdrawal from international agreements.

**Environment (+) vs. Growth (−).** +100: ecological limits set the frame for the economy; accepts large economic costs to cut emissions and protect nature. +60: strong climate and conservation policy, prepared to constrain industry. 0: balances. −60: growth and jobs first, loosens environmental rules, expands extraction. −100: environmental rules treated as obstacles; exit from climate commitments.

**Diplomacy (+) vs. Strength (−).** +100: negotiation and disarmament; keeps defence spending minimal; avoids alliances that commit to force. +60: prefers diplomacy and multilateral process, modest defence spending. 0: balanced. −60: raises defence spending, deepens security alliances, prepared to deploy force with partners. −100: military strength is a primary guarantee of security; willing to use force to defend interests abroad.

**Local (+) vs. Central (−).** +100: subsidiarity as a principle; devolves powers and revenue to regions and communities; accepts regional variation. +60: strengthens local government and local decision-making. 0: no net direction. −60: centralises services and standards for consistency and equal treatment; overrides councils when needed. −100: strong central government as a principle; local bodies as delivery agents.

**Bold change (+) vs. Caution (−).** +100: fundamental, system-level change is the party's purpose; accepts disruption. +60: large reforms pursued quickly. 0: no consistent pace. −60: incremental, cautious reform; emphasises stability and continuity. −100: preserving the current settlement is the purpose; resists structural change. This dimension is about pace and scale, not direction: a party can be radical in either direction.

## Evidence hierarchy

Use in this order. Score from the highest available level and cross-check with the lower ones.

1. The party's current manifesto, policy pages and any costed fiscal plan, archived under `research/nz/<party>/`.
2. Coalition agreement commitments (2023 National–ACT and National–NZ First), attributed to the party that demanded them where the text makes that clear.
3. Recorded party votes and second-reading speeches on the marker bills listed below, from Hansard.
4. Governing record: legislation passed, Budget and Treasury documents, Government Targets, Climate Change Commission and other statutory assessments.
5. On the Fence 2026 party self-placements, where available.
6. Expert datasets (Global Party Survey 2019, Manifesto Project) as a cross-check only; they predate the current term.

Full source notes, access traps and licences are in `data/sources-nz.json`.

## Confidence

- **high**: programme and record agree, and at least two source types support the score.
- **medium**: one strong source, or several sources that point the same way with gaps.
- **low**: thin, vague or contradictory evidence. Say why in the rationale.
- **null score, low confidence**: the party has no discernible position. Do not force a number.

## Marker evidence for the 2023–2026 term

Candidates to verify during research; a party's position on these is the quickest cross-party comparison for each dimension.

| Dimension | Markers |
|---|---|
| solidarity | 2024 tax package; benefit indexation change; child poverty targets and results; wealth, inheritance and capital gains tax proposals |
| regulation | Regulatory Standards Act 2025; RMA replacement bills; supermarket and banking competition measures; public ownership proposals |
| liberty | Electoral Amendment Act 2025 and its section 7 report; gang legislation; Three Strikes reinstatement; surveillance and hate speech positions |
| tradition | conscience votes (End of Life Choice, abortion, conversion practices); family, gender and sex-education policy |
| institutions | Treaty Principles Bill; Regulatory Standards Act; fast-track ministerial powers; referendum proposals; citizens' assemblies |
| cosmopolitan | immigration settings; Paris Agreement; foreign aid; refugee quota; Treaty stance |
| environment | oil and gas exploration ban reversal; agriculture and the ETS; Fast-track Approvals; Climate Change Commission monitoring findings |
| diplomacy | Defence Capability Plan 2025 and spending targets; AUKUS pillar 2; positions on Ukraine and Gaza |
| local | Three Waters and Local Water Done Well; Māori wards referenda; regional deals; devolution proposals |
| change | fast-track approvals; wealth tax; land value tax and universal income; 100-day plans; pace of RMA and health restructures |

## Writing a cell

Each cell has a score, a confidence, a rationale of two to four sentences, and at least one dated source that is archived in the repo. The rationale says what the programme proposes, what the record shows, and why that lands on this number. Quote a short phrase where a phrase settles the matter.
