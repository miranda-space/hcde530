import csv
import os
import sys

import requests
from dotenv import load_dotenv

# Load API key from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# Save API key to environment variable
api_key = os.environ.get("API_NINJAS_KEY")

# Check if API key is set
if not api_key:
    print("Set API_NINJAS_KEY in week4_api/.env.", file=sys.stderr)
    sys.exit(1)

# Get city name from user
city_name = input("City name: ").strip()
if not city_name:
    print("City name cannot be empty.", file=sys.stderr)
    sys.exit(1)

# Make API request, 30 second timeout for slow responses
url = "https://api.api-ninjas.com/v1/city"
response = requests.get(
    url,
    headers={"X-Api-Key": api_key},
    params={"name": city_name},
    timeout=30,
)

# If request fails, print error and exit
if not response.ok:
    print(response.text)
    sys.exit(1)

# Parse response as JSON
data = response.json()

# If no city found, print error and exit
if not data:
    print("No city found for that name.")
    sys.exit(0)

# Get first city from response
city = data[0]

# Get city details, more than three fields
name = city.get("name")
country = city.get("country")
population = city.get("population")
latitude = city.get("latitude")
longitude = city.get("longitude")

# Print city details
print("Name:", name)
print("Country:", country)
print("Population:", population)
print("Latitude:", latitude)
print("Longitude:", longitude)

# Save city details to CSV
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
# Append to CSV, create file if it doesn't exist, write header if it doesn't exist
# Write to file for each city searched
with open(_csv_path, "a", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=_fieldnames)
    if not _file_exists:
        writer.writeheader()
    writer.writerow(_row)
print("Saved to:", _csv_path)

# I searched Seattle and Dallas as test cases, and they can be found in the CSV file.