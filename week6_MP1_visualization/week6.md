# Week 6 — Competency 6: Visualization for tabular analysis

---

## What C6 means here

Turning the cleaned Open Library book table into **readable charts**: choosing encodings that match the question (counts over categories, trends over time, skewed distributions), using **pandas** to aggregate and reshape, and pairing **interactive** views (**Plotly Express**) with **static** matplotlib figures where that fits the narrative.

---

## Evidence

**Notebook and files.** The work lives in **`visualization.ipynb`**. The table is **`miniproject_dataset.csv`** from an updated Open Library pull; after the same style of cleaning as Week 5, the notebook writes **`miniproject_dataset_cleaned.csv`** (UTF-8, no index column).

**Data collection (revised).** The download step applies **the same stopping rules to every `search_topic`**, with per-topic time limits and pagination, so no single query string dominates the row counts the way an older capped design did for **“artificial intelligence.”** That supports fairer comparisons in plots that break out by topic.

**Subject frequency.** I explode or otherwise parse **`subjects`**, filter to recent **`first_publish_year`**, aggregate counts, and build a **horizontal bar chart** with **`px.bar`** (sorted categories, layout tuned for long subject labels).

**Publications over time.** I group by **`first_publish_year`** and **`search_topic`**, plot **line charts** with **`matplotlib`** (including a **log-scaled** y-axis where counts span orders of magnitude, plus a **2020–present** view for the recent surge).

**Language mix.** I summarize **`languages`** and plot a **horizontal bar** chart of the top codes to show how strongly the sample skews toward English compared with the long tail.

---

## What the dataset is and what I did with it

The rows are still **Open Library works** tied to AI-related search topics, with fields such as **`search_topic`**, **`title`**, **`author_name`**, **`first_publish_year`**, **`subjects`**, **`languages`**, and **`edition_count`**.

I **refresh or reload** the CSV as needed, **reuse Week 5–style cleaning** for string empties and obvious bad titles, then **aggregate and visualize** so patterns in **subject tags**, **publishing growth by subtopic**, and **language coverage** are visible at a glance—with short markdown interpretations next to the figures in the notebook.

---

## claim

I use **pandas**, **Plotly Express**, and **matplotlib** on **`miniproject_dataset_cleaned.csv`** to produce **evidence-backed visualizations** of AI-related Open Library metadata: **top subjects** (recent years), **publication counts over time by `search_topic`** (full range and recent window, log scale where appropriate), and **language distribution**. **`week6.md`** documents what that competency covers, how the revised collection supports fairer topic comparisons, and how **`visualization.ipynb`** shows the evidence end-to-end.
