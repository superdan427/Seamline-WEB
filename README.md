# Seamline data helpers

## Importing places from Excel/Sheets

1. Export your spreadsheet to CSV (UTF-8). Make sure the header row uses the same keys as the JSON (`id`, `name`, `lat`, `lng`, `address`, `category`, `phone`, `website`, `opening_hours`, `pop_up`, `tags`, `photos`, etc.).
2. For columns that contain multiple values (e.g. tags or photo URLs) separate entries with either a pipe (`|`) or a comma.
3. Save the CSV somewhere in the project (for example, `data/places.csv`).
4. Convert it into `places.json` with:

   ```bash
   node scripts/csv-to-places.js data/places.csv data/places.json
   ```

   The first argument is the input CSV; the second is the JSON destination. Both default to `data/places.csv` and `data/places.json` if omitted.

The script automatically:
- Parses quoted fields (so commas in addresses are fine).
- Generates ids from the `id` column or falls back to a slugified `name`.
- Casts `lat`/`lng` to numbers.
- Splits `tags`/`photos` into arrays.
- Drops empty values from the final JSON.

### Online-only entries

You can mark a row as an online-only shop by setting the `type` column to `online`. These entries are hidden from the map but show up in the list view under a dedicated **Online** filter.

You can re-run the command any time you update the spreadsheet—just export and convert again.
