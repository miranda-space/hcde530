# app-review word-count summary.
# Run from this folder: python app_review_word_count.py  (requires app_reviews.csv)
import csv

FILENAME = "app_reviews.csv"


# Section 1: Define how we measure review length
# Same whitespace rule as demo_word_count.py so class demos and this script
# are comparable when we talk about "word count" in discussion or grading.
def count_words(text: str) -> int:
    """Count words by splitting on whitespace (matches class demo)."""
    return len(text.split())


# Section 2: Load reviews from CSV
# Load everything before the loop so analysis and printing stay in one place，
# mirrors the demo script structure I annotated in week2.md.
reviews = []
with open(FILENAME, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        reviews.append(row)


# Section 3: Per-review table
# Table first: reviewers can sanity-check one long/short review before
# looking at min/max/average, which can hide individual stories.
word_counts = []
print(f"{'ID':<6} {'Words':<6} Review (preview)")
print("-" * 72)

for row in reviews:
    rid = row["review_id"]
    text = row["review_text"].strip()
    n = count_words(text)
    word_counts.append(n)
    preview = (text[:56] + "...") if len(text) > 56 else text
    print(f"{rid:<6} {n:<6} {preview}")


# Section 4: Summary statistics
# Shortest/longest/average describe the batch， single "word" avoids awkward
# grammar when a one-word review is the minimum.
shortest = min(word_counts)
longest = max(word_counts)
avg = sum(word_counts) / len(word_counts)

print()
print("── Summary ─────────────────────────────────")
print(f"  Reviews counted : {len(word_counts)}")
print(f"  Shortest        : {shortest} word{'s' if shortest != 1 else ''}")
print(f"  Longest         : {longest} words")
print(f"  Average         : {avg:.1f} words")
