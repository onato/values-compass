# Values Compass

A self-assessment questionnaire, in the style of a psychological inventory, that maps a person's political values onto ten bipolar dimensions. The output is a profile (JSON plus an editable plain-language summary) intended as the input to a later step that matches political parties and candidates for voting.

This repository covers step one only: establishing the values. The matching prompt is generated as a ready-to-paste template, but the matching itself is not done here.

## Run it

It is a static page with no build step and no dependencies. Either open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

Everything stays in the browser. Progress and results are saved to `localStorage` so a closed tab can resume.

## Tests

```sh
node --test
```

Tests cover reverse keying, the score range, strength thresholds, the mixed-views flag, priority ordering, the shuffle invariant, and the prompt export.

## How it works

- **Model.** Ten dimensions, each with two poles (for example Solidarity vs. Self-reliance). Five statements per dimension, at least two of them reverse-keyed. See `js/data.js`.
- **Scale.** Five-point Likert from *strongly disagree* (1) to *strongly agree* (5).
- **Scoring.** Reverse-keyed responses are flipped, the five keyed values are averaged, and the mean is mapped to −100 (fully the second pole) to +100 (fully the first pole). Strength labels: balanced (< 15), leans (15–44), clearly (45–74), strongly (≥ 75). A within-dimension standard deviation above 1.2 marks the dimension as *mixed*, meaning the person agreed with both poles. See `js/scoring.js`.
- **Order.** Statements are shuffled per session with a seeded generator so no two consecutive statements belong to the same dimension.
- **Output.** A JSON profile with per-dimension score, strength, leaning and consistency, a priority list ordered by how strongly the person leans, and a summary paragraph the person can edit before export.

## Editing the model

- **Change or translate wording:** edit `js/data.js`. All user-facing item and pole text lives there. To add a language, copy the file, translate the strings, and load the right file in `index.html`.
- **Add a dimension:** add an entry to `DIMENSIONS` and five items to `ITEMS` with the same `dim` id and a mix of `key: 1` and `key: -1`. The tests check that every dimension has five items and at least two reverse-keyed ones.
- **Tune thresholds:** `STRENGTH` and `MIXED_SD` at the top of `js/scoring.js`.

## Files

```
index.html          screens: intro, questionnaire, results
css/style.css       layout and result bars, light and dark
js/data.js          dimensions and items
js/scoring.js       pure scoring, summary, shuffle and prompt functions
js/app.js           UI state, localStorage, copy and download
test/scoring.test.js
```
