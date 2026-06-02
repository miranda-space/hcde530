# Week 5 — Competency 5: Pandas and tabular data

---

## What C5 means here

Working with real tables in **pandas**: loading a CSV into a **DataFrame**, inspecting structure and dtypes, spotting “dirty” values that do not show up as NaN (for example **empty strings** in text columns), applying **repeatable cleaning rules**, and writing out a **cleaned CSV** I can trust for later analysis.

---

## Evidence

**Notebook and files.** The work lives in **`A5_pandas_hw.ipynb`**. The raw table is **`miniproject_dataset.csv`**; after cleaning I save **`miniproject_dataset_cleaned.csv`** (UTF-8, no index column).

**Building the raw dataset (context).** I used the **Open Library Search API** (`https://openlibrary.org/search.json`) with several AI-related query strings, pagination limits, a **recent-publication year** filter, and **deduplication by Open Library work key**. Results are assembled in pandas and written once to **`miniproject_dataset.csv`** (that download cell is meant to run only when refreshing the data).

**Exploration.** I use **`pd.read_csv`**, then summaries such as **`info()`** / **`head()`** to confirm column types, row counts, and whether pandas sees missing values.

**Cleaning empty strings.** For string columns, **`''` is not a null** to pandas. I normalize those placeholders so empty strings are treated like missing data where it matters (for example **`publication_places`**, **`author_name`**, **`languages`**).

**Quality checks and row removal.** I inspect **`edition_count`** for values that look implausible for AI-tagged works, spot **bad keyword matches** (for example classic literature picked up by broad queries), **drop** those rows, and re-check high-**`edition_count`** rows before finalizing the cleaned file.

---

## What the dataset is and what I did with it

The CSV rows are **books or works** returned from Open Library for AI-related search topics, with fields such as **`search_topic`**, **`title`**, **`author_name`**, **`first_publish_year`**, **`subjects`**, **`languages`**, **`edition_count`**, **`publishers`**, and **`publication_places`**.

I **summarize** the table, **validate** obvious columns, **fix string empties**, **remove** clearly wrong titles, and **export** the result so the mini-project analysis can start from **`miniproject_dataset_cleaned.csv`** instead of the noisier raw pull.

In **`A5_pandas_hw.ipynb`** (section **Analytical questions**), I use pandas on **`df_cleaned`** to answer three questions: **rows per `search_topic`**, **recency of `first_publish_year`**, and **`languages` distribution / missingness**.

---

## claim

I use **pandas** to **load**, **inspect**, **clean**, and **analyze** a tabular dataset from **`miniproject_dataset.csv`**, including **empty-string handling**, **sanity checks on `edition_count`**, **removing falsely matched works**, **three analytical questions on the cleaned table**, and saving **`miniproject_dataset_cleaned.csv`**. **`week5.md`** documents what that competency covers, how the raw file was produced, and how the notebook shows the evidence end-to-end.
