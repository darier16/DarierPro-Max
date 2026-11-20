import type {
  IntervalsActivity,
  IntervalsSyncPayload,
} from "../types/intervals";

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseNumber(val: string | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(",", ".").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseIntervalsExportFile(
  fileName: string,
  content: string
): IntervalsSyncPayload {
  const trimmed = content.trim();
  if (fileName.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    const activities: IntervalsActivity[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.activities)
      ? parsed.activities
      : [];

    if (activities.length === 0) {
      throw new Error("Plik JSON nie zawiera listy aktywności.");
    }

    return {
      athlete: parsed.athlete || { id: "local", name: "Import lokalny" },
      activities,
      wellness: Array.isArray(parsed.wellness) ? parsed.wellness : [],
      syncedAt: new Date().toISOString(),
      source: "file",
    };
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("Plik CSV jest pusty lub zawiera tylko nagłówek.");
  }

  const headerLine = lines[0];
  const delimiter = headerLine.includes(";") && !headerLine.includes(",") ? ";" : ",";
  const headers = splitCsvLine(headerLine, delimiter).map((h) =>
    h.replace(/^"|"$/g, "").trim()
  );

  const activities: IntervalsActivity[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] || "").replace(/^"|"$/g, "");
    });

    const startDate =
      row.start_date_local || row.start_date || row.date || row.Date || "";
    if (!startDate) continue;

    const movingTime =
      parseNumber(row.moving_time) ??
      parseNumber(row.elapsed_time) ??
      (parseNumber(row.moving_time_mins)
        ? Number(parseNumber(row.moving_time_mins)) * 60
        : 0);

    const distance = parseNumber(row.distance) ?? 0;
    const avgSpeed =
      parseNumber(row.average_speed) ??
      (movingTime && movingTime > 0 && distance > 0 ? distance / movingTime : 0);

    activities.push({
      id: row.id || `csv-${i}`,
      start_date_local: startDate,
      type: row.type || row.sport || "Ride",
      name: row.name || row.title || `Trening ${startDate.slice(0, 10)}`,
      moving_time: movingTime || 0,
      elapsed_time: parseNumber(row.elapsed_time) ?? movingTime ?? 0,
      distance,
      total_elevation_gain: parseNumber(row.total_elevation_gain) ?? 0,
      average_speed: avgSpeed,
      average_watts: parseNumber(row.average_watts),
      icu_weighted_avg_watts:
        parseNumber(row.icu_weighted_avg_watts) ??
        parseNumber(row.weighted_average_watts),
      icu_training_load:
        parseNumber(row.icu_training_load) ?? parseNumber(row.tss) ?? 0,
      icu_intensity: parseNumber(row.icu_intensity),
      icu_ftp: parseNumber(row.icu_ftp),
      average_heartrate: parseNumber(row.average_heartrate),
      max_heartrate: parseNumber(row.max_heartrate),
      average_cadence: parseNumber(row.average_cadence),
      icu_efficiency_factor: parseNumber(row.icu_efficiency_factor),
      decoupling: parseNumber(row.decoupling),
      icu_ctl: parseNumber(row.icu_ctl),
      icu_atl: parseNumber(row.icu_atl),
      icu_rpe: parseNumber(row.icu_rpe),
      feel: parseNumber(row.feel),
      calories: parseNumber(row.calories),
      source: "CSV_IMPORT",
    });
  }

  if (activities.length === 0) {
    throw new Error(
      "Nie rozpoznano kolumn Intervals.icu w pliku CSV (wymagane m.in. start_date_local, type, moving_time)."
    );
  }

  return {
    athlete: { id: "csv-import", name: "Import z pliku CSV" },
    activities,
    wellness: [],
    syncedAt: new Date().toISOString(),
    source: "file",
  };
}
