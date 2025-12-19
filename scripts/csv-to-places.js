#!/usr/bin/env node
/**
 * Convert a CSV export (from Excel/Sheets) into data/places.json
 *
 * Usage:
 *   node scripts/csv-to-places.js ./data/places.csv ./data/places.json
 *
 * When the CSV uses headers that match the JSON keys the script will map them automatically.
 * Multi-value columns (e.g. tags, photos) can use either "|" or "," separators.
 */
import fs from "node:fs";
import path from "node:path";

const [, , inputArg, outputArg] = process.argv;
const defaultInput = path.join(process.cwd(), "data", "places.csv");
const defaultOutput = path.join(process.cwd(), "data", "places.json");

const inputPath = inputArg ? path.resolve(process.cwd(), inputArg) : defaultInput;
const outputPath = outputArg ? path.resolve(process.cwd(), outputArg) : defaultOutput;

const HEADER_ALIASES = {
  name: "name",
  title: "name",
  place_name: "name",
  id: "id",
  slug: "id",
  lat: "lat",
  latitude: "lat",
  lng: "lng",
  long: "lng",
  longitude: "lng",
  address: "address",
  location: "address",
  category: "category",
  categories: "category",
  catergories: "category",
  type: "type",
  place_type: "type",
  listing_type: "type",
  shop_type: "type",
  contact_number: "phone",
  contact: "phone",
  phone_number: "phone",
  phone: "phone",
  website: "website",
  url: "website",
  opening_hours: "opening_hours",
  hours: "opening_hours",
  tags: "tags",
  keywords: "tags",
  pop_up: "pop_up",
  popup: "pop_up",
  description: "pop_up",
  summary: "pop_up",
  photos: "photos",
  images: "photos",
  more_info: "more_info",
  average_price: "average_price",
  approved: "approved",
  overall: "overall",
  been: "been",
};

if (!fs.existsSync(inputPath)) {
  console.error(`CSV not found at ${inputPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8");

const rows = parseCSV(raw).filter((row) => row.some((cell) => cell.trim() !== ""));
if (rows.length === 0) {
  console.error("CSV appears empty.");
  process.exit(1);
}

const [header, ...records] = rows;
const cleanedHeader = header.map((key) => normalizeHeader(key));

const places = records
  .map((cells, idx) => {
    const record = {};
    cleanedHeader.forEach((key, columnIdx) => {
      record[key] = cells[columnIdx] ?? "";
    });
    return normaliseRecord(record, idx + 1);
  })
  .filter(Boolean);

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, `${JSON.stringify(places, null, 2)}\n`, "utf8");
console.log(`Converted ${places.length} row(s) to ${outputPath}`);

function parseCSV(text) {
  const rows = [];
  let current = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      insideQuotes = true;
      continue;
    }

    if (char === ",") {
      current.push(value);
      value = "";
      continue;
    }

    if (char === "\n") {
      current.push(value);
      rows.push(current);
      current = [];
      value = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    value += char;
  }

  current.push(value);
  rows.push(current);
  return rows;
}

function normaliseRecord(record, rowNumber) {
  const result = {};
  const trimmed = (key) => (record[key] ?? "").toString().trim();

  result.name = trimmed("name");
  if (!result.name) return null;
  result.id = trimmed("id") || slugify(result.name) || `row_${rowNumber}`;
  result.address = trimmed("address") || undefined;
  const rawType = trimmed("type");
  const normalizedType = rawType.toLowerCase();
  const isPlaceType = normalizedType === "online" || normalizedType === "physical";

  result.category = trimmed("category") || (!isPlaceType ? rawType : undefined);
  if (isPlaceType) {
    result.type = normalizedType;
  }
  result.phone = trimmed("phone") || undefined;
  result.website = trimmed("website") || undefined;
  result.opening_hours = cleanOpeningHours(trimmed("opening_hours"));
  result.pop_up = trimmed("pop_up") || trimmed("description") || undefined;

  result.lat = toNumber(record.lat);
  result.lng = toNumber(record.lng);

  const tags = splitList(record.tags);
  if (tags.length) result.tags = tags;

  const photos = splitList(record.photos);
  if (photos.length) result.photos = photos;

  Object.keys(record).forEach((key) => {
    if (
      [
        "id",
        "name",
        "address",
        "category",
        "phone",
        "website",
        "opening_hours",
        "pop_up",
        "description",
        "lat",
        "lng",
        "tags",
        "type",
        "photos",
      ].includes(key)
    ) {
      return;
    }
    const value = trimmed(key);
    if (value) {
      result[key] = value;
    }
  });

  return result;
}

function toNumber(value) {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : undefined;
}

function splitList(rawValue) {
  if (!rawValue) return [];
  const str = rawValue.toString().trim();
  if (!str) return [];
  const separator = str.includes("|") ? "|" : ",";
  return str
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(input) {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function normalizeHeader(header) {
  const cleaned = header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!cleaned) return "";
  return HEADER_ALIASES[cleaned] ?? cleaned;
}

function cleanOpeningHours(value) {
  if (!value) return undefined;
  let text = value.replace(/\r\n?/g, "\n");
  text = text.replace(/_/g, " ");
  text = text.replace(/[\uFFFDÐ]/g, "–");
  text = text.replace(/\ufeff/g, "");
  text = text.replace(/[ \t]+\n/g, "\n");
  return text.trim();
}
