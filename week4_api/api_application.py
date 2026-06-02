"""Week 4 city lookup (API Ninjas /v1/city).

HCD: API fields work like survey columns.
First match only needs disambiguation in real studies.
CSV append logs lookups, API key stays in .env, not Git.
"""
import csv
import os
import sys

import requests
from dotenv import load_dotenv


# Section 1: Load credentials safely
# Read the API key from .env so it is not stored in Git, exit if missing.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
api_key = os.environ.get("API_NINJAS_KEY")

if not api_key:
    print("Set API_NINJAS_KEY in week4_api/.env.", file=sys.stderr)
    sys.exit(1)


# Section 2: Get city name from user
# Require a non-empty name after stripping spaces so the API has a real query.
city_name = input("City name: ").strip()
if not city_name:
    print("City name cannot be empty.", file=sys.stderr)
    sys.exit(1)


# Section 3: Request city data from the API
# Authenticate with X-Api-Key, pass the city as the name query param.
url = "https://api.api-ninjas.com/v1/city"
response = requests.get(
    url,
    headers={"X-Api-Key": api_key},
    params={"name": city_name},
    timeout=30,
)

if not response.ok:
    print(response.text)
    sys.exit(1)

# Parse JSON, the API returns a list, so an empty list means no match.
data = response.json()

if not data:
    print("No city found for that name.")
    sys.exit(0)


# Section 4: Extract and display fields
# Several cities can share a name — we use the first result for this demo only.
city = data[0]

name = city.get("name")
country = city.get("country")
population = city.get("population")
latitude = city.get("latitude")
longitude = city.get("longitude")

print("Name:", name)
print("Country:", country)
print("Population:", population)
print("Latitude:", latitude)
print("Longitude:", longitude)


# Section 5: Save results to CSV
# Append mode keeps a running log of lookups instead of replacing the file.
_script_dir = os.path.dirname(os.path.abspath(__file__))
_csv_path = os.path.join(_script_dir, "city_lookup_results.csv")
_fieldnames = ["name", "country", "population", "latitude", "longitude"]
_row = {
    "name": name,
    "country": country,
    "population": population,
    "latitude": latitude,
    "longitude": longitude,
}
_file_exists = os.path.isfile(_csv_path)

with open(_csv_path, "a", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=_fieldnames)
    if not _file_exists:
        writer.writeheader()
    writer.writerow(_row)
print("Saved to:", _csv_path)
