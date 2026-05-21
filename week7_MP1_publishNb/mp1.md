# MP1 — Mini Project competency claims

---

## What this project is

A published study of **recent AI-related works** in **Open Library**: one notebook loads a cleaned CSV, profiles the table, charts three research questions, and states conclusions and process. All deliverables live in **`week7_MP1_publishNb/`**.

---

## Competency 4 — APIs and data acquisition

### What C4 means here

Pulling structured data from a web API with Python: parameterized requests, JSON results, and honest documentation of how the sample was built.

### Evidence

The dataset **`miniproject_dataset_cleaned.csv`** comes from the **Open Library Search API** (`https://openlibrary.org/search.json`), using nine AI-related search strings, pagination, a recent-year filter, and deduplication by work key. Collection used **per-topic time limits**, retries, and pauses when connections failed (see **`published_notebook.ipynb`** Section 5). The published notebook does not re-download data; it analyzes the committed CSV.

### Claim

I acquired mini-project metadata from a **public search API**, documented **stopping rules and sampling limits**, and shipped a **stable CSV** for analysis.

---

## Competency 5 — Pandas and tabular data

### What C5 means here

Loading a real table into a **DataFrame**, inspecting structure and missing values, and using a cleaned file that downstream charts can trust.

### Evidence

**`published_notebook.ipynb`** Section 2: **`pd.read_csv("miniproject_dataset_cleaned.csv")`**, then **`head()`**, **`info()`**, **`describe()`**, and **`isnull().sum()`** with interpretations (~980 rows; core fields complete; **`subjects`** ~60% missing; **`publication_places`** ~98% missing; **`edition_count`** skewed and not used as popularity).

The cleaned file reflects prior rules: empty strings treated as missing, bad title matches removed.

### Claim

I **load**, **profile**, and **interpret gaps** in **`miniproject_dataset_cleaned.csv`** before any charts, and I state which analyses those gaps allow or limit.

---

## Competency 6 — Visualization for tabular analysis

### What C6 means here

Matching chart type to the question, aggregating with pandas, and exporting readable figures with titles and labeled axes.

### Evidence

**Section 3** — three charts, each with a markdown interpretation of **what it argues**:

| File | Question | Type |
|------|----------|------|
| **`chart1_subjects.png`** | Top subject tags (recent years) | Horizontal bar (Plotly → **kaleido**) |
| **`chart2_publications_2020.png`** | Publications by **`search_topic`**, 2020–present | Line chart, log **y** (matplotlib) |
| **`chart3_top_languages.png`** | Language mix | Horizontal bar (matplotlib) |

Subjects: explode **`subjects`**, **`first_publish_year ≥ 2023`**, top 25. Time: counts by year and **`search_topic`** (broad “artificial intelligence” query excluded from lines). Languages: split **`languages`**, top 15 codes. Static PNGs are committed so results do not require re-running Plotly interactively; matplotlib saves run **`savefig` before `show()`**.

**Section 4** summarizes findings in plain language (themes, post-2020 growth, English dominance).

### Claim

I produce **three labeled, evidence-backed charts** on the cleaned table and explain **what each figure supports and what it cannot claim** given missing metadata.

---

## Process and integrated claim

**Section 5** describes the learning path inside this project: early collection used **unequal row caps** (one query overrepresented); later collection used **the same rules per topic** after API timeouts; surprises included strong **Education** among subjects and sparse **publication places**.

### Integrated claim

From **`published_notebook.ipynb`**, **`miniproject_dataset_cleaned.csv`**, and committed chart PNGs, I show I can **profile tabular API-derived data**, **visualize it to answer focused questions**, and **report limits honestly**—using Open Library as a low-cost, structured view of recent AI-related catalog activity, not a full census of global publishing.

---

## File index

| Path | Role |
|------|------|
| **`mp1.md`** | Competency summary (this file) |
| **`published_notebook.ipynb`** | Published MP1 notebook |
| **`miniproject_dataset_cleaned.csv`** | Analysis dataset |
| **`chart1_subjects.png`** | Subject chart |
| **`chart2_publications_2020.png`** | Time-by-topic chart |
| **`chart3_top_languages.png`** | Language chart |
