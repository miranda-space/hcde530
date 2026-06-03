# Week 6 — Competency 6: Visualization for tabular analysis

---

## What C6 means here

Turning the cleaned Open Library book table into **readable charts**: choosing encodings that match the question (counts over categories, trends over time, skewed distributions), using **pandas** to aggregate and reshape, and exporting **static PNG files** with titles and labeled axes so the Analysis section of MP1b can stand on its own.

---

## MP1a analytical questions (what the charts answer)

In MP1a I declared three questions about this dataset:

1. **What themes show up** in recent AI-related works in Open Library?
2. **Is publishing activity growing or shifting** across AI subtopics over time?
3. **How much is the sample dominated by English** (who might be included or left out)?

The three committed charts below map directly to those questions. A fourth PNG (`chart4_publications_full_range.png`) is an alternate time view from the same notebook, A6 requires at least two charts—three are submitted here.

---

## Committed chart files

All files live in **`week6_MP1_visualization/`** and are generated from **`visualization.ipynb`** on **`miniproject_dataset_cleaned.csv`**.

| File | MP1a question | Chart type |
|------|---------------|------------|
| **`chart1_subjects.png`** | What themes show up in recent AI-related books? | Horizontal bar (Plotly Express → static PNG) |
| **`chart2_publications_2020.png`** | Is activity growing or shifting by subtopic since 2020? | Line chart, log-scaled **y** (matplotlib) |
| **`chart3_top_languages.png`** | How English-dominated is the language mix? | Horizontal bar (matplotlib) |
| **`chart4_publications_full_range.png`** | *(optional)* Same time question, full 1950–2026 window | Line chart, log-scaled **y** (matplotlib) |

---

## Chart justifications

### Chart 1 — `chart1_subjects.png`

**Question:** What subject tags appear most often among recent AI-related works?

**Why this chart type:** Subject labels are **long categorical text**, a **horizontal bar chart** reads top-to-bottom like a ranked list and leaves room for multi-word tags. Counts are **independent categories**, not a time series.

**How it was built:** Explode **`subjects`** (semicolon-separated in the CSV), keep rows with **`first_publish_year ≥ 2023`**, aggregate with **`value_counts`**, take the top 25, plot with **`px.bar(..., orientation="h")`**, export with **`fig.write_image("chart1_subjects.png")`** (requires **kaleido**).

**Axes:** **x** = number of works (count), **y** = subject tag (no extra unit—Open Library subject strings).

**What it shows:** **Artificial intelligence** is the single most frequent tag (~135 works), with **Technology**, **Education**, and **Science** next. **Education** ranking third is a substantive finding: many recent AI-tagged works tie to **learning and computer-assisted instruction**, not only core CS labels. Duplicate casing variants of “Artificial intelligence” in the raw tags are a data-quality limit, not separate themes.

---

### Chart 2 — `chart2_publications_2020.png`

**Question:** Are AI subtopics publishing more actively in recent years, and which lines are rising fastest?

**Why this chart type:** **`first_publish_year`** is **ordered time**, a **line chart** shows trend and lets me compare **multiple `search_topic` series** on the same axis. Counts span orders of magnitude (1 to ~100 in a year), so **log y** keeps early sparse years visible alongside the 2025 spike.

**How it was built:** Group cleaned rows by **`first_publish_year`** and **`search_topic`**, exclude the broad **`artificial intelligence`** query so narrower subtopics are readable, filter **`first_publish_year ≥ 2020`**, plot one line per topic with **`matplotlib`**, save with **`plt.savefig("chart2_publications_2020.png", bbox_inches="tight")`** before **`show()`**.

**Axes:** **x** = first publish year, **y** = number of publications (**log scale**).

**What it shows:** Activity is **low and flat before ~2024**, then **jumps sharply in 2025** for every subtopic—**machine learning** and **generative AI** peak highest. The 2026 drop likely reflects **incomplete future-dated catalog years**, not a real collapse. This supports MP1a question 2: growth is recent and uneven across subtopics.

---

### Chart 3 — `chart3_top_languages.png`

**Question:** How strongly is this Open Library sample dominated by English?

**Why this chart type:** Language codes are **unordered categories** with one **heavily skewed** leader—same rationale as Chart 1: **horizontal bars** compare **`eng`** vs a long tail without squashing small values.

**How it was built:** Split **`languages`** on **`"; "`**, **`explode`**, **`value_counts`**, top 15 codes, **`plt.barh`**, save as **`chart3_top_languages.png`**.

**Axes:** **x** = number of publications, **y** = language code (ISO-style tags from Open Library, e.g. **`eng`**, **`ita`**).

**What it shows:** **`eng`** accounts for **~920** works, **Italian, German, French, and Spanish** each appear only a handful of times, many other codes register **1–2** rows. That answers MP1a question 3 directly: the sample is **English-heavy**, so conclusions about “global AI publishing” would **over-represent English catalog coverage** and under-represent other languages—not a null result, but a **limit to state honestly** in MP1b.

---

### Optional — `chart4_publications_full_range.png`

Same aggregation as Chart 2 but **`first_publish_year`** from **1950–2026**. Useful to see how sparse pre-2020 data are, Chart 2 is the primary MP1b figure because it matches the “recent surge” question more clearly.

---

## Evidence (notebook and data)

**Notebook:** **`visualization.ipynb`** — download (revised equal per-topic rules), Week 5–style cleaning, aggregations, and chart code.

**Data:** **`miniproject_dataset_cleaned.csv`** — Open Library Search API, nine AI-related query strings, recent-year filter, dedupe by work key.

**Collection note:** Per-topic time limits and pagination caps mean row counts are **not equal across `search_topic`**, time-series charts exclude the broad **“artificial intelligence”** search string so subtopic lines are comparable.

---

## claim

I use **pandas**, **Plotly Express**, and **matplotlib** on **`miniproject_dataset_cleaned.csv`** to produce **three committed PNG charts**—**`chart1_subjects.png`**, **`chart2_publications_2020.png`**, **`chart3_top_languages.png`**—each tied to an **MP1a analytical question**, with **titles, labeled axes, and chart types matched to the data**. **`week6.md`** documents **what each figure argues**, **why that encoding fits**, and **what the sample can and cannot support** for MP1b.
