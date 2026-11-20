import React, { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  DownloadCloud,
  GitCompareArrows,
  RefreshCw,
  Search,
} from "lucide-react";
import type {
  IntervalsActivity,
  IntervalsEvent,
} from "../types/intervals";
import {
  computePlanVsActual,
  formatDateFullPl,
  formatDuration,
  formatPace,
  sportLabelPl,
} from "../utils/analytics";

interface ActivitiesViewProps {
  activities: IntervalsActivity[];
  allActivities: IntervalsActivity[];
  events?: IntervalsEvent[];
  onSelectActivity: (activity: IntervalsActivity) => void;
  isStrava?: boolean;
  isSyncing?: boolean;
  onSyncMissingPeriod?: () => void;
  onFullSync?: () => void;
}

type SortKey =
  | "date"
  | "moving_time"
  | "distance"
  | "elevation"
  | "tss"
  | "intensity"
  | "ef";

type SubTab = "list" | "plan" | "compare";

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  activities,
  allActivities,
  events,
  onSelectActivity,
  isStrava,
  isSyncing,
  onSyncMissingPeriod,
  onFullSync,
}) => {
  const [subTab, setSubTab] = useState<SubTab>("list");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [compareAId, setCompareAId] = useState<string>(
    activities[0]?.id || ""
  );
  const [compareBId, setCompareBId] = useState<string>(
    activities[1]?.id || activities[0]?.id || ""
  );

  const planSummary = useMemo(
    () => computePlanVsActual(events, allActivities),
    [events, allActivities]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? activities.filter(
          (a) =>
            (a.name || "").toLowerCase().includes(q) ||
            sportLabelPl(a.type).toLowerCase().includes(q) ||
            (a.start_date_local || "").includes(q)
        )
      : activities;

    return [...filtered].sort((a, b) => {
      let va = 0;
      let vb = 0;

      if (sortKey === "date") {
        const cmp = (a.start_date_local || "").localeCompare(
          b.start_date_local || ""
        );
        return sortDir === "desc" ? -cmp : cmp;
      } else if (sortKey === "moving_time") {
        va = Number(a.moving_time) || 0;
        vb = Number(b.moving_time) || 0;
      } else if (sortKey === "distance") {
        va = Number(a.distance) || 0;
        vb = Number(b.distance) || 0;
      } else if (sortKey === "elevation") {
        va = Number(a.total_elevation_gain) || 0;
        vb = Number(b.total_elevation_gain) || 0;
      } else if (sortKey === "tss") {
        va = Number(a.icu_training_load) || 0;
        vb = Number(b.icu_training_load) || 0;
      } else if (sortKey === "intensity") {
        va = Number(a.icu_intensity) || 0;
        vb = Number(b.icu_intensity) || 0;
      } else if (sortKey === "ef") {
        va = Number(a.icu_efficiency_factor) || 0;
        vb = Number(b.icu_efficiency_factor) || 0;
      }

      return sortDir === "desc" ? vb - va : va - vb;
    });
  }, [activities, query, sortKey, sortDir]);

  const totalHours = (
    filteredAndSorted.reduce((s, a) => s + (Number(a.moving_time) || 0), 0) /
    3600
  ).toFixed(1);
  const totalKm = Math.round(
    filteredAndSorted.reduce((s, a) => s + (Number(a.distance) || 0) / 1000, 0)
  );
  const totalTss = Math.round(
    filteredAndSorted.reduce((s, a) => s + (Number(a.icu_training_load) || 0), 0)
  );

  const actA =
    allActivities.find((a) => a.id === compareAId) || activities[0] || null;
  const actB =
    allActivities.find((a) => a.id === compareBId) ||
    activities[1] ||
    activities[0] ||
    null;

  const SortHeader: React.FC<{ label: string; col: SortKey }> = ({
    label,
    col,
  }) => {
    const active = sortKey === col;
    return (
      <button
        type="button"
        onClick={() => handleSort(col)}
        className={`inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white ${
          active ? "text-slate-900 font-semibold dark:text-white" : ""
        }`}
      >
        <span>{label}</span>
        {active &&
          (sortDir === "desc" ? (
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          ))}
      </button>
    );
  };

  const renderCompareRow = (
    label: string,
    valA: number | null | undefined,
    valB: number | null | undefined,
    formatFn: (v: number) => string,
    higherIsBetter = true
  ) => {
    const aOk = typeof valA === "number" && Number.isFinite(valA) && valA > 0;
    const bOk = typeof valB === "number" && Number.isFinite(valB) && valB > 0;
    const diff = aOk && bOk ? valA - valB : null;
    const pct = aOk && bOk && valB !== 0 ? ((valA - valB) / valB) * 100 : null;

    const diffPositive = diff !== null && (higherIsBetter ? diff > 0 : diff < 0);
    const diffNegative = diff !== null && (higherIsBetter ? diff < 0 : diff > 0);

    return (
      <tr key={label}>
        <td className="px-5 py-3 text-xs font-medium text-slate-600 dark:text-slate-400">
          {label}
        </td>
        <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-blue-600 dark:text-blue-400">
          {aOk ? formatFn(valA) : "—"}
        </td>
        <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-violet-600 dark:text-violet-400">
          {bOk ? formatFn(valB) : "—"}
        </td>
        <td
          className={`px-5 py-3 text-right font-mono text-xs tabular-nums ${
            diffPositive
              ? "text-emerald-600 dark:text-emerald-400"
              : diffNegative
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {pct !== null
            ? `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`
            : "—"}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 rounded-lg bg-indigo-100/70 p-1 dark:bg-indigo-950/40">
          <button
            type="button"
            onClick={() => setSubTab("list")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === "list"
                ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-800 dark:text-indigo-300"
                : "text-slate-600 hover:text-indigo-700 dark:text-slate-400"
            }`}
          >
            Lista aktywności
          </button>
          <button
            type="button"
            onClick={() => setSubTab("plan")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === "plan"
                ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-800 dark:text-indigo-300"
                : "text-slate-600 hover:text-indigo-700 dark:text-slate-400"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Plan vs Wykonanie</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("compare")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              subTab === "compare"
                ? "bg-white text-indigo-700 shadow-xs dark:bg-slate-800 dark:text-indigo-300"
                : "text-slate-600 hover:text-indigo-700 dark:text-slate-400"
            }`}
          >
            <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Porównaj treningi (A vs B)</span>
          </button>
        </div>

        {subTab === "list" && (
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400">
            <span>{filteredAndSorted.length} aktywności</span>
            <span aria-hidden="true">·</span>
            <span>{totalHours} h</span>
            <span aria-hidden="true">·</span>
            <span>{totalKm} km</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {totalTss} TSS
            </span>
            {isStrava && onSyncMissingPeriod && (
              <>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={onSyncMissingPeriod}
                  title="Pobierz treningi z okresu 03.09.2026 – 18.11.2026"
                  className="font-sans inline-flex items-center gap-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900/80 text-orange-700 dark:text-orange-300 px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <DownloadCloud className="h-3 w-3" />
                  <span>{isSyncing ? "Pobieranie..." : "Pobierz okres 03.09–18.11.2026"}</span>
                </button>
                {onFullSync && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={onFullSync}
                    title="Pobierz wszystkie strony bez limitu liczby aktywności"
                    className="font-sans inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Pełny sync</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {subTab === "list" && (
        <>
          <div className="relative w-full sm:w-80">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj po nazwie, dacie lub sporcie..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {filteredAndSorted.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                Brak aktywności spełniających kryteria wyszukiwania.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-5 py-3">
                        <SortHeader label="Data" col="date" />
                      </th>
                      <th className="px-4 py-3">Nazwa treningu</th>
                      <th className="px-4 py-3">Dyscyplina</th>
                      <th className="px-4 py-3 text-right">
                        <SortHeader label="Czas" col="moving_time" />
                      </th>
                      <th className="px-4 py-3 text-right">
                        <SortHeader label="Dystans" col="distance" />
                      </th>
                      <th className="px-4 py-3 text-right">
                        <SortHeader label="Przewyższ." col="elevation" />
                      </th>
                      <th className="px-4 py-3 text-right">Tempo</th>
                      <th className="px-4 py-3 text-right">NP / Moc</th>
                      <th className="px-4 py-3 text-right">Śr. HR</th>
                      <th className="px-4 py-3 text-right">
                        <SortHeader label="IF %" col="intensity" />
                      </th>
                      <th className="px-4 py-3 text-right">
                        <SortHeader label="EF" col="ef" />
                      </th>
                      <th className="px-5 py-3 text-right">
                        <SortHeader label="TSS" col="tss" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredAndSorted.map((act) => {
                      const np = act.icu_weighted_avg_watts || act.average_watts;
                      return (
                        <tr
                          key={act.id}
                          onClick={() => onSelectActivity(act)}
                          className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-5 py-2.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {formatDateFullPl(act.start_date_local)}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100 max-w-[240px] truncate">
                            {act.name || sportLabelPl(act.type)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {sportLabelPl(act.type)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatDuration(act.moving_time)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {act.distance > 0
                              ? `${(act.distance / 1000).toFixed(1)} km`
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {act.total_elevation_gain &&
                            act.total_elevation_gain > 0
                              ? `${Math.round(act.total_elevation_gain)} m`
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {formatPace(act.average_speed, act.type)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {np ? `${Math.round(np)} W` : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {act.average_heartrate
                              ? `${Math.round(act.average_heartrate)}`
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {act.icu_intensity
                              ? `${Math.round(act.icu_intensity)}%`
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {act.icu_efficiency_factor
                              ? act.icu_efficiency_factor.toFixed(2)
                              : "—"}
                          </td>
                          <td className="px-5 py-2.5 text-right font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                            {act.icu_training_load
                              ? Math.round(act.icu_training_load)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {subTab === "plan" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Realizacja planu (ostatnie 60 dni)
              </div>
              <div className="mt-2 font-mono text-3xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                {planSummary.adherencePct !== null
                  ? `${planSummary.adherencePct}%`
                  : "—"}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {planSummary.pastRows.length} zaplanowanych jednostek w kalendarzu
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Nadchodzące treningi i starty
              </div>
              <div className="mt-2 font-mono text-3xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {planSummary.upcomingRows.length}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Zaplanowane w kolejnych 35 dniach
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Najbliższe wydarzenie
              </div>
              <div className="mt-2 truncate font-display text-base font-semibold text-slate-900 dark:text-white">
                {planSummary.upcomingRows[0]?.name || "Brak wpisów w kalendarzu"}
              </div>
              <p className="mt-1 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {planSummary.upcomingRows[0]
                  ? formatDateFullPl(planSummary.upcomingRows[0].start_date_local)
                  : "Dodaj jednostki w Intervals.icu lub wyślij plan z Analizy AI"}
              </p>
            </div>
          </div>

          {planSummary.upcomingRows.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  Nadchodzący kalendarz z Intervals.icu
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-5 py-2.5">Data</th>
                      <th className="px-4 py-2.5">Nazwa jednostki</th>
                      <th className="px-4 py-2.5">Dyscyplina</th>
                      <th className="px-4 py-2.5 text-right">Plan. Czas</th>
                      <th className="px-5 py-2.5 text-right">Plan. TSS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {planSummary.upcomingRows.slice(0, 14).map((ev, i) => (
                      <tr key={ev.id || i}>
                        <td className="px-5 py-2.5 font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDateFullPl(ev.start_date_local)}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                          {ev.name || "Zaplanowany trening"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                          {sportLabelPl(ev.type)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {ev.moving_time ? formatDuration(ev.moving_time) : "—"}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                          {ev.icu_training_load ? Math.round(ev.icu_training_load) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Historia: Plan vs Wykonanie (ostatnie 60 dni)
              </h3>
            </div>
            {planSummary.pastRows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Brak przeszłych zaplanowanych treningów w kalendarzu Intervals.icu z ostatnich 60 dni.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-5 py-2.5">Data</th>
                      <th className="px-4 py-2.5">Zaplanowany trening</th>
                      <th className="px-4 py-2.5 text-right">Plan (min / TSS)</th>
                      <th className="px-4 py-2.5 text-right">Wykonano (min / TSS)</th>
                      <th className="px-5 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {planSummary.pastRows.slice(0, 25).map((r, i) => (
                      <tr key={`${r.date}-${i}`}>
                        <td className="px-5 py-2.5 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDateFullPl(r.date)}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                          {r.plannedName}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {r.plannedMin ? `${r.plannedMin}m` : "—"} /{" "}
                          {r.plannedTss ? `${r.plannedTss} TSS` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                          {r.actualMin ? `${r.actualMin}m` : "0m"} / {r.actualTss} TSS
                        </td>
                        <td
                          className={`px-5 py-2.5 text-right font-medium whitespace-nowrap ${
                            r.status === "completed"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : r.status === "partial"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {r.status === "completed"
                            ? "Zrealizowano"
                            : r.status === "partial"
                            ? "Częściowo"
                            : "Pominięto"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {subTab === "compare" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <label
                htmlFor="compare-a"
                className="mb-1.5 block text-xs font-semibold text-blue-600 dark:text-blue-400"
              >
                Trening A (Nowszy / Porównywany)
              </label>
              <select
                id="compare-a"
                value={actA?.id || ""}
                onChange={(e) => setCompareAId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {allActivities.slice(0, 80).map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatDateFullPl(a.start_date_local)} · {a.name || sportLabelPl(a.type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="compare-b"
                className="mb-1.5 block text-xs font-semibold text-violet-600 dark:text-violet-400"
              >
                Trening B (Baza odniesienia)
              </label>
              <select
                id="compare-b"
                value={actB?.id || ""}
                onChange={(e) => setCompareBId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {allActivities.slice(0, 80).map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatDateFullPl(a.start_date_local)} · {a.name || sportLabelPl(a.type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {actA && actB && (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="px-5 py-3">Metryka</th>
                      <th className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">
                        Trening A ({formatDateFullPl(actA.start_date_local)})
                      </th>
                      <th className="px-4 py-3 text-right text-violet-600 dark:text-violet-400">
                        Trening B ({formatDateFullPl(actB.start_date_local)})
                      </th>
                      <th className="px-5 py-3 text-right">Różnica A vs B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {renderCompareRow(
                      "Czas ruchu",
                      actA.moving_time,
                      actB.moving_time,
                      (v) => formatDuration(v)
                    )}
                    {renderCompareRow(
                      "Dystans",
                      actA.distance,
                      actB.distance,
                      (v) => `${(v / 1000).toFixed(2)} km`
                    )}
                    {renderCompareRow(
                      "Przewyższenie",
                      actA.total_elevation_gain,
                      actB.total_elevation_gain,
                      (v) => `${Math.round(v)} m`
                    )}
                    {renderCompareRow(
                      "Obciążenie (TSS)",
                      actA.icu_training_load,
                      actB.icu_training_load,
                      (v) => `${Math.round(v)} TSS`
                    )}
                    {renderCompareRow(
                      "Moc znormalizowana (NP / Śr.)",
                      actA.icu_weighted_avg_watts || actA.average_watts,
                      actB.icu_weighted_avg_watts || actB.average_watts,
                      (v) => `${Math.round(v)} W`
                    )}
                    {renderCompareRow(
                      "Średnie tętno",
                      actA.average_heartrate,
                      actB.average_heartrate,
                      (v) => `${Math.round(v)} bpm`,
                      false
                    )}
                    {renderCompareRow(
                      "Intensywność (IF%)",
                      actA.icu_intensity,
                      actB.icu_intensity,
                      (v) => `${Math.round(v)}%`
                    )}
                    {renderCompareRow(
                      "Efficiency Factor (EF)",
                      actA.icu_efficiency_factor,
                      actB.icu_efficiency_factor,
                      (v) => v.toFixed(2)
                    )}
                    {renderCompareRow(
                      "Dryf tętna (Decoupling)",
                      actA.decoupling,
                      actB.decoupling,
                      (v) => `${v.toFixed(1)}%`,
                      false
                    )}
                    {renderCompareRow(
                      "Kadencja",
                      actA.average_cadence,
                      actB.average_cadence,
                      (v) => `${Math.round(v)} rpm`
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
