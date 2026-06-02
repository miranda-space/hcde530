# Week 4 — Competency 4: APIs and data acquisition

---

## What C4 means here

Pulling structured data from a web API using Python. Reading API documentation to understand what endpoints exist, what parameters they take, and what the response looks like. Handling API keys safely — not committing them to a public repo.

---

## Evidence

**HTTP request and JSON parsing.** In `api_application.py` I call `requests.get` on `https://api.api-ninjas.com/v1/city` with `headers={"X-Api-Key": ...}` and `params={"name": city_name}`, then use `response.json()` to turn the body into Python objects.

**API choice.** I used **API Ninjas — City API** (`/v1/city`), it returns geographic and demographic fields for cities matched by name.

**Key handling.** The key lives only in **`week4_api/.env`** as `API_NINJAS_KEY`. The script loads it with `python-dotenv` and reads it with **`os.environ.get("API_NINJAS_KEY")`**. **`.gitignore`** lists `.env` (and `venv/`) so secrets and the virtual environment are not committed.

---

## What the endpoint returns and what I did with it

The endpoint returns a **JSON array** of city fields including **`name`**, **`country`**, **`population`**, **`latitude`**, and **`longitude`** (the API can return more but I focused on these five).

User **input a city name**, take the **first match** in the array, **print** those fields in a readable labeled format, and **append the same row** to **`city_lookup_results.csv`**. It both prints searching result and append it into a the table with the csv file.

---

## claim

I called **API Ninjas’ `/v1/city` endpoint**, which requires an **API key** sent in the **`X-Api-Key`** header and a **`name`** query parameter. The response is a **JSON list of city records**, then I extract **name, country, population, latitude, and longitude**, print them, and **append each successful lookup to a CSV** under the same directory as the python script. **`week4.md`** documents why that structure matters, how it functions and how I avoid committing the key (`.env` + `.gitignore` + `os.environ.get`).

---

## Connections to HCD practice

**Structured data instead of ad hoc lookup.** In research we often need locale or population context for screening, sampling, or interpreting who we talked to. Pulling **named fields from an API** (rather than retyping from a website) is closer to working from a **survey export or CRM extract**: predictable columns you can join, filter, or document later.

**Ambiguous inputs.** City names are not unique, the script uses the **first match** in the JSON array, which is fine for a class demo but would be risky in a real study without **disambiguation** (state/country, map pickers, confirmation step)—the same care we use when a screener says “Portland” without specifying which one.

**Traceability and credentials.** **Appending each lookup to `city_lookup_results.csv`** leaves a small **audit trail** of what was queried and returned (I tested with **Seattle** and **Dallas**). Keeping the **API key in `.env`**, not in Git, parallels treating **participant-linked or access credentials** as out-of-band secrets even when the script only handles city names.

**Competency link.** C4 here is not “using an API for its own sake”—it is learning a **repeatable acquisition path** (read docs → authenticate → parse JSON → persist rows) that supports **transparent, reproducible** data work downstream in HCDE projects.
