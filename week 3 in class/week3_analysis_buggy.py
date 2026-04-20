import csv

# Fix condition when survey data spells years as words, map common years to integers for cleaning.
str_to_int_years = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20,
}

# Correct the format of the years of experience
def correct_years_format(raw):
    s = raw.strip().lower()
    if not s:
        raise ValueError("experience_years is empty")
    if s.isdigit():
        return int(s)
    if s in str_to_int_years:
        return str_to_int_years[s]
    raise ValueError(f"cannot parse experience_years: {raw!r}")


# Load the survey data from a CSV file
filename = "week3_survey_messy.csv"
rows = []

with open(filename, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)

# Count responses by role
# Normalize role names so "ux researcher" and "UX Researcher" are counted together
role_counts = {}

for row in rows:
    role = row["role"].strip().title()
    if role in role_counts:
        role_counts[role] += 1
    else:
        role_counts[role] = 1

print("Responses by role:")
for role, count in sorted(role_counts.items()):
    print(f"  {role}: {count}")

# Calculate the average years of experience
total_experience = 0
for row in rows:
    # Correct the format of the years of experience
    total_experience += correct_years_format(row["experience_years"])

# Calculate the average years of experience
avg_experience = total_experience / len(rows)
print(f"\nAverage years of experience: {avg_experience:.1f}")

# Find the top 5 highest satisfaction scores
scored_rows = []
# Append the satisfaction scores to the list
for row in rows:
    if row["satisfaction_score"].strip():
        scored_rows.append((row["participant_name"], int(row["satisfaction_score"])))

# Find the top 5 highest satisfaction scores
scored_rows = []
for row in rows:
    if row["satisfaction_score"].strip():
        scored_rows.append((row["participant_name"], int(row["satisfaction_score"])))

scored_rows.sort(key=lambda x: x[1])
top5 = scored_rows[:5]

print("\nTop 5 satisfaction scores:")
# Print the top 5 satisfaction scores
for name, score in top5:
    print(f"  {name}: {score}")