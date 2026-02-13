"use client";

import { useEffect, useRef, useState } from "react";

export type AddressSuggestion = {
  label: string;
  addressLine?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;
  lat?: number;
  lon?: number;
};

export interface AddressAutocompleteProps {
  label: string;
  placeholder?: string;
  initialValue?: string;
  onSelect: (value: AddressSuggestion) => void;
  onInputChange?: (rawText: string) => void;
  disabled?: boolean;
  mode?: "fr" | "world" | "auto";
  kind?: "address" | "city";
  contextPostalCode?: string;
  contextCity?: string;
  contextCountryCode?: string; // ex: "fr"
  validated?: boolean; // affichage d'un indicateur "OK coords"
  invalidated?: boolean; // affichage d'un indicateur rouge (tentative submit mais non exploitable)
  inputId?: string;
  required?: boolean;
  errorMessage?: string | null;
}

// --- Providers ---

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetriableStatus = (status: number) => status === 429 || (status >= 500 && status < 600);

const extractPostalCode = (raw?: string): string | undefined => {
  const text = (raw || "").trim();
  if (!text) return undefined;
  const m = text.match(/\b(\d{5})\b/);
  return m?.[1];
};

async function fetchWithRetry(
  url: string,
  options: RequestInit & { signal?: AbortSignal },
  retryCount = 2
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const res = await fetch(url, options);
      if (!res.ok && isRetriableStatus(res.status) && attempt < retryCount) {
        await sleep(250 * Math.pow(2, attempt));
        continue;
      }
      return res;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      lastError = error;
      if (attempt < retryCount) {
        await sleep(250 * Math.pow(2, attempt));
        continue;
      }
    }
  }
  throw lastError ?? new Error("Network error");
}

// FR (BAN api-adresse.data.gouv.fr)
async function fetchBanSuggestions(
  query: string,
  context?: { postalCode?: string; city?: string },
  options?: { kind?: "address" | "city" },
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  const postalCode = (context?.postalCode || "").trim();
  const city = (context?.city || "").trim();
  const kind = options?.kind ?? "address";
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  // Pour une recherche d'adresse, on contraint par la ville si on la connaît déjà.
  // BAN ne fournit pas un filtre "city" fiable sans citycode; on biaise donc la requête.
  const effectiveQuery =
    kind === "address" && city && !normalize(query).includes(normalize(city))
      ? `${query} ${city}`
      : query;

  // BAN supporte `postcode` pour filtrer par code postal.
  // Pour les villes, `type=municipality` évite les rues/adresses.
  const typeParam = kind === "city" ? "&type=municipality" : "";
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
    effectiveQuery
  )}&limit=5${postalCode ? `&postcode=${encodeURIComponent(postalCode)}` : ""}${typeParam}`;
  const res = await fetchWithRetry(url, { signal }, 2);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    features: {
      properties: {
        label: string;
        city?: string;
        postcode?: string;
      };
      geometry?: { coordinates?: [number, number] };
    }[];
  };
  const formatCityLabel = (city?: string, postcode?: string) => {
    const c = (city || "").trim();
    const cp = (postcode || "").trim();
    if (!c) return (postcode || "").trim();
    return cp ? `${c} (${cp})` : c;
  };
  return (data.features ?? []).map((f) => {
    const city = f.properties.city ?? undefined;
    const inferredPostalCode =
      f.properties.postcode ??
      extractPostalCode(f.properties.label) ??
      extractPostalCode(city) ??
      extractPostalCode(effectiveQuery);
    const postalCode = inferredPostalCode ?? undefined;
    const baseLabel = f.properties.label;
    const label = kind === "city" ? formatCityLabel(city ?? baseLabel, postalCode) : baseLabel;
    return {
      label,
      addressLine: kind === "city" ? undefined : baseLabel,
      city: city ?? (kind === "city" ? baseLabel : undefined),
      postalCode,
      countryCode: "fr",
      lon: f.geometry?.coordinates?.[0],
      lat: f.geometry?.coordinates?.[1],
    };
  });
}

// World/Europe (Nominatim OSM)
async function fetchNominatimSuggestions(
  query: string,
  context?: { postalCode?: string; city?: string; countryCode?: string },
  options?: { kind?: "address" | "city" },
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  const countryCode = (context?.countryCode || "").trim().toLowerCase();
  const postalCode = (context?.postalCode || "").trim();
  const city = (context?.city || "").trim();
  const kind = options?.kind ?? "address";
  // Nominatim ne propose pas un filtre "postcode" dédié côté query-string;
  // on l'injecte dans la requête pour prioriser les résultats proches.
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const base =
    kind === "address" && city && !normalize(query).includes(normalize(city))
      ? `${query} ${city}`
      : query;
  const effectiveQuery = postalCode ? `${base} ${postalCode}` : base;
  // Pour la recherche "ville", on limite au périmètre Europe par défaut (sinon on remonte USA, etc.).
  // Note: Nominatim attend une liste de codes ISO2 séparés par des virgules.
  const EUROPE_COUNTRYCODES =
    "fr,de,es,it,pt,be,nl,lu,ie,gb,ch,at,pl,cz,sk,hu,si,hr,ba,rs,me,mk,al,gr,bg,ro,md,ua,by,lt,lv,ee,dk,se,no,fi,is,li";
  const effectiveCountrycodes =
    countryCode ||
    (kind === "city" ? EUROPE_COUNTRYCODES : "");
  const url = `/api/geocode?q=${encodeURIComponent(effectiveQuery)}&limit=5&kind=${encodeURIComponent(
    kind
  )}${effectiveCountrycodes ? `&countrycodes=${encodeURIComponent(effectiveCountrycodes)}` : ""}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    provider?: string;
    results?: Array<{
      label: string;
      addressLine?: string;
      city?: string;
      postalCode?: string;
      countryCode?: string;
      lat?: number;
      lon?: number;
    }>;
  };
  const regionNames =
    typeof Intl !== "undefined" && (Intl as any).DisplayNames
      ? new (Intl as any).DisplayNames(["fr"], { type: "region" })
      : null;

  const formatCityLabel = (city?: string, postcode?: string, cc?: string) => {
    const c = (city || "").trim();
    const cp = (postcode || "").trim();
    const code = (cc || "").trim().toLowerCase();
    const countryName =
      code && regionNames ? regionNames.of(code.toUpperCase()) : undefined;
    if (!c) return "";
    const left = cp ? `${c} (${cp})` : c;
    if (!code || code === "fr") return left;
    return countryName ? `${left} — ${countryName}` : `${left} — ${code.toUpperCase()}`;
  };

  return (data.results ?? []).map((item) => {
    const cc = item.countryCode;
    const label =
      kind === "city"
        ? formatCityLabel(item.city, item.postalCode, cc) || item.label
        : item.label;
    return {
      label,
      addressLine: kind === "city" ? undefined : item.addressLine ?? item.label,
      city: item.city,
      postalCode:
        item.postalCode ??
        extractPostalCode(item.label) ??
        extractPostalCode(item.city) ??
        extractPostalCode(effectiveQuery),
      countryCode: cc,
      lat: item.lat,
      lon: item.lon,
    };
  });
}

export function AddressAutocomplete({
  label,
  placeholder,
  initialValue,
  onSelect,
  onInputChange,
  disabled,
  mode = "auto",
  kind = "address",
  contextPostalCode,
  contextCity,
  contextCountryCode,
  validated,
  invalidated,
  inputId,
  required = false,
  errorMessage = null,
}: AddressAutocompleteProps) {
  const [input, setInput] = useState(initialValue ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const debounceRef = useRef<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<Record<string, AddressSuggestion[]>>({});
  const lastSelectionRef = useRef<AddressSuggestion | null>(null);

  useEffect(() => {
    setInput(initialValue ?? "");
  }, [initialValue]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      setShowDropdown(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const fetchSuggestionsForQuery = async (
    query: string,
    signal?: AbortSignal
  ): Promise<AddressSuggestion[]> => {
    const ctx = {
      postalCode: contextPostalCode,
      city: contextCity,
      countryCode: contextCountryCode,
    };
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const dedupeKey = (s: AddressSuggestion) =>
      [
        normalize(s.city ?? s.label ?? ""),
        normalize(s.postalCode ?? ""),
        normalize(s.countryCode ?? ""),
      ]
        .filter(Boolean)
        .join("|");

    const rankCity = (s: AddressSuggestion) => {
      const q = normalize(query);
      const city = normalize(s.city ?? "");
      const label = normalize(s.label ?? "");
      const hay = city || label;
      if (!q || !hay) return 100;
      if (hay === q) return 0;
      if (hay.startsWith(q)) return 5;
      if (hay.includes(q)) return 20;
      return 50;
    };

    if (mode === "world") {
      return fetchNominatimSuggestions(query, ctx, { kind }, signal);
    }
    if (mode === "fr") {
      return fetchBanSuggestions(query, ctx, { kind }, signal);
    }
    // auto:
    // - address: BAN d'abord, puis Nominatim si aucun résultat
    // - city: BAN + Nominatim fusionnés (sinon "Berling" masque "Berlin")
    if (kind !== "city") {
      // Si le pays n'est pas FR, BAN n'est pas pertinent: on utilise directement Nominatim filtré.
      if ((ctx.countryCode || "").trim() && (ctx.countryCode || "").trim().toLowerCase() !== "fr") {
        return fetchNominatimSuggestions(query, ctx, { kind }, signal);
      }
      const ban = await fetchBanSuggestions(query, ctx, { kind }, signal);
      if (ban.length > 0) return ban;
      return fetchNominatimSuggestions(query, ctx, { kind }, signal);
    }

    const [ban, world] = await Promise.all([
      fetchBanSuggestions(query, ctx, { kind }, signal).catch(() => []),
      fetchNominatimSuggestions(query, ctx, { kind }, signal).catch(() => []),
    ]);

    const merged = [...ban, ...world];
    const map = new Map<string, AddressSuggestion>();
    for (const item of merged) {
      const key = dedupeKey(item);
      if (!key) continue;
      if (!map.has(key)) map.set(key, item);
    }

    return Array.from(map.values()).sort((a, b) => {
      const ra = rankCity(a);
      const rb = rankCity(b);
      if (ra !== rb) return ra - rb;
      const aIsFr = normalize(a.countryCode ?? "") === "fr";
      const bIsFr = normalize(b.countryCode ?? "") === "fr";
      // Préférer la France en premier dans la liste (sinon les résultats FR sont "cachés").
      if (aIsFr !== bIsFr) return aIsFr ? -1 : 1;
      return (a.label ?? "").localeCompare(b.label ?? "", "fr");
    });
  };

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      return;
    }
    if (cacheRef.current[trimmed]) {
      setResults(cacheRef.current[trimmed]);
      return;
    }
    if (controllerRef.current) controllerRef.current.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setIsLoading(true);
    try {
      const suggestions = await fetchSuggestionsForQuery(trimmed, ctrl.signal);

      cacheRef.current[trimmed] = suggestions;
      if (!ctrl.signal.aborted) setResults(suggestions);
    } catch {
      if (!ctrl.signal.aborted) setResults([]);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  };

  const scheduleSearch = (next: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void runSearch(next);
    }, 250);
  };

  const ensureCoords = async (s: AddressSuggestion): Promise<AddressSuggestion> => {
    if (s.lat != null && s.lon != null) return s;
    const query = (s.addressLine ?? s.label ?? "").trim();
    if (query.length < 3) return s;
    try {
      const list = await fetchSuggestionsForQuery(query);
      const withCoords = list.find((item) => item.lat != null && item.lon != null);
      return withCoords ?? s;
    } catch {
      return s;
    }
  };

  const commitSelection = async (s: AddressSuggestion) => {
    const resolved = await ensureCoords(s);
    lastSelectionRef.current = resolved;
    onSelect(resolved);
    setInput(resolved.addressLine ?? resolved.label);
    setShowDropdown(false);
    setHighlightIdx(-1);
  };

  const selectionValidated = (() => {
    if (typeof validated === "boolean") return validated;
    const last = lastSelectionRef.current;
    if (!last) return false;
    if (last.lat == null || last.lon == null) return false;
    const lastLabel = (last.addressLine ?? last.label ?? "").trim();
    return !!lastLabel && lastLabel === input.trim();
  })();

  const selectionInvalidated = Boolean(invalidated) && !selectionValidated;

  // Fallback : si l'utilisateur ne clique pas une suggestion, on géocode le texte en blur.
  const resolveOnBlur = async () => {
    const trimmed = input.trim();
    // En "ville", on accepte des entrées courtes (ex: "Lyon").
    // En "adresse", on garde un seuil plus haut pour éviter des géocodages bruyants.
    if (trimmed.length < (kind === "city" ? 3 : 5)) return;
    try {
      const last = lastSelectionRef.current;
      const lastLabel = last?.addressLine ?? last?.label ?? "";
      if (last && lastLabel === trimmed && last.lat != null && last.lon != null) {
        return;
      }

      if (last && lastLabel === trimmed) {
        const enriched = await ensureCoords(last);
        if (enriched) await commitSelection(enriched);
        return;
      }

      const list = await fetchSuggestionsForQuery(trimmed);
      const first = list[0];
      // Pour une recherche de ville ambiguë (plusieurs villes homonymes),
      // on n'auto-sélectionne PAS sans indice (ex: code postal) — sinon on "choisit au hasard".
      if (kind === "city") {
        const hasDigits = /\d/.test(trimmed);
        if (!hasDigits && list.length > 1) return;
      }
      // En "world"/étranger, on peut ne pas avoir de CP/ville au format FR.
      // Si on a au moins une suggestion (et idéalement des coords), on la prend.
      if (first) await commitSelection(first);
    } catch {
      // ignore
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-[#0F172A]" htmlFor={inputId}>
          {label}
        </label>
        {required && (
          <span className="text-[11px] font-semibold text-[#1E293B]/50">Requis</span>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          id={inputId}
          value={input}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value;
            setInput(next);
            onInputChange?.(next);
            setShowDropdown(true);
            setHighlightIdx(-1);
            scheduleSearch(next);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => {
            // laisser le click dropdown passer avant de fermer
            window.setTimeout(() => {
              void resolveOnBlur();
              setShowDropdown(false);
            }, 150);
          }}
          onKeyDown={(e) => {
            if (!showDropdown || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightIdx((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              // UX: si rien n'est surligné, "Entrée" sélectionne la première suggestion.
              const idx = highlightIdx >= 0 ? highlightIdx : 0;
              if (idx >= 0 && idx < results.length) {
                e.preventDefault();
                void commitSelection(results[idx]!);
              }
            } else if (e.key === "Escape") {
              setShowDropdown(false);
            }
          }}
          placeholder={placeholder}
          aria-invalid={!!errorMessage}
          aria-describedby={errorMessage ? `${inputId ?? "address"}-error` : undefined}
          className={[
            "w-full rounded-xl border-2 bg-white px-4 py-3 pr-10 text-base text-[#0F172A] placeholder:text-[#1E293B]/40 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all",
            errorMessage
              ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/15"
              : "border-[#E3E5E8] focus:border-[#6BCFCF] focus:ring-[#6BCFCF]/40",
          ].join(" ")}
        />

        {selectionValidated && !errorMessage && !selectionInvalidated && (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6BCFCF]"
            aria-hidden="true"
            title="Coordonnées OK"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 12.5l2 2 4-5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                stroke="currentColor"
                strokeWidth="2.2"
                opacity="0.35"
              />
            </svg>
          </span>
        )}

        {selectionInvalidated && (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#EF4444]"
            aria-hidden="true"
            title="Sélection requise"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 8v5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M12 16.5h.01"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                stroke="currentColor"
                strokeWidth="2.2"
                opacity="0.35"
              />
            </svg>
          </span>
        )}

        {errorMessage && (
          <p
            id={`${inputId ?? "address"}-error`}
            className="mt-2 text-sm font-medium text-[#EF4444]"
          >
            {errorMessage}
          </p>
        )}

        {showDropdown && (isLoading || results.length > 0) && !disabled && (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[#E3E5E8] bg-white shadow-lg">
            {isLoading && (
              <div className="px-4 py-3 text-sm text-[#1E293B]/60">
                Recherche…
              </div>
            )}
            {!isLoading &&
              results.map((r, idx) => {
                const active = idx === highlightIdx;
                return (
                  <button
                    key={`${r.label}-${idx}`}
                    type="button"
                    onMouseEnter={() => setHighlightIdx(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void commitSelection(r)}
                    className={[
                      "w-full px-4 py-3 text-left text-sm transition-colors",
                      active ? "bg-[#6BCFCF]/10" : "hover:bg-[#6BCFCF]/5",
                    ].join(" ")}
                  >
                    <div className="font-medium text-[#0F172A]">{r.label}</div>
                    {(r.postalCode || r.city) && (
                      <div className="mt-0.5 text-xs text-[#1E293B]/60">
                        {[r.postalCode, r.city].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

