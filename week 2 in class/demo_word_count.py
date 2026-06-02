# Survey response word-count summary.
# Run from this folder: python demo_word_count.py  (requires demo_responses.csv)
import csv


# Section 1: Load responses from CSV
# Read all rows first so later code only analyzes in-memory data—same
# load → measure → summarize flow as in class, without mixing file I/O and printing.
filename = "demo_responses.csv"
responses = []

with open(filename, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        responses.append(row)


# Section 2: Define how we measure response length
# One function keeps the counting rule consistent。 if we change how "words" are
# defined, we only update this block, not every loop iteration.
def count_words(response):
    """Count words by splitting on whitespace (simple proxy for response length)."""
    return len(response.split())


# Section 3: Per-participant table (scan before aggregating)
# Row-by-row output lets a reader spot outliers before
# trusting the summary stats.
print(f"{'ID':<6} {'Role':<22} {'Words':<6} {'Response (first 60 chars)'}")
print("-" * 75)

word_counts = []

for row in responses:
    participant = row["participant_id"]
    role = row["role"]
    response = row["response"]

    count = count_words(response)
    word_counts.append(count)

    # Preview truncates so the table stays readable; full text stays in the CSV.
    if len(response) > 60:
        preview = response[:60] + "..."
    else:
        preview = response

    print(f"{participant:<6} {role:<22} {count:<6} {preview}")


# Section 4: Summary statistics
# Aggregates answer "how long are responses overall?" after the detail table
# grounds those numbers in individual rows.
print()
print("── Summary ─────────────────────────────────")
print(f"  Total responses : {len(word_counts)}")
print(f"  Shortest        : {min(word_counts)} words")
print(f"  Longest         : {max(word_counts)} words")
print(f"  Average         : {sum(word_counts) / len(word_counts):.1f} words")
