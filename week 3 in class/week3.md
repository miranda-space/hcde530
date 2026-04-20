# Week 3 — Competency 3: Data cleaning and file handling

---

This week I worked from a messy survey CSV and a deliberately broken script, using Python’s **`csv.DictReader`**.

The run failed with **`ValueError: invalid literal for int() with base 10: 'fifteen'`**. The traceback highlighted **`int(row["experience_years"])`**, which narrowed the issue to a single field: **experience** was sometimes stored as a **word** instead of digits. That’s ordinary survey noise; the fix belongs in the cleaning step.

I added a small parser: numeric strings use **`isdigit()`**, and a short **word-to-number map** covers spelled-out values like *fifteen* → 15 so aggregates stay reproducible. Separately, the “top 5” satisfaction list was sorted ascending, so the first five entries were the **lowest** scores; sorting **descending** aligned the code with the wording of the question.

What I’d claim for this competency: I can **read an error message**, tie it to a **column and row pattern**, and document a **repeatable rule**—not just say the data is cleaned.
