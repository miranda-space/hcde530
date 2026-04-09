# Read fictional app reviews from CSV and summarize word counts
import csv

FILENAME = "app_reviews.csv"


def count_words(text: str) -> int:
    """Return word count using whitespace splits (same idea as class demos)."""
    return len(text.split())


reviews = []
with open(FILENAME, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        reviews.append(row)

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

shortest = min(word_counts)
longest = max(word_counts)
avg = sum(word_counts) / len(word_counts)

print()
print("── Summary ─────────────────────────────────")
print(f"  Reviews counted : {len(word_counts)}")
print(f"  Shortest        : {shortest} word{'s' if shortest != 1 else ''}")
print(f"  Longest         : {longest} words")
print(f"  Average         : {avg:.1f} words")
