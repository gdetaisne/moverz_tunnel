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
  inputId?: string;
  required?: boolean;
  errorMessage?: string | null;
}

// --- Providers ---

// FR (BAN api-adresse.data.gouv.fr)
async function fetchBanSuggestions(
  query: string,
  context?: { postalCode?: string; city?: string },
  options?: { kind?: "address" | "city" },
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  const postalCode = (context?.postalCode || "").trim();
  const kind = options?.kind ?? "address";
  // BAN supporte `postcode` pour filtrer par code postal.
  // Pour les villes, `type=municipality` évite les rues/adresses.
  const typeParam = kind === "city" ? "&type=municipality" : "";
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
    query
  )}&limit=5${postalCode ? `&postcode=${encodeURIComponent(postalCode)}` : ""}${typeParam}`;
  const res = await fetch(url, { signal });
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
    const postalCode = f.properties.postcode ?? undefined;
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
  const kind = options?.kind ?? "address";
  // Nominatim ne propose pas un filtre "postcode" dédié côté query-string;
  // on l'injecte dans la requête pour prioriser les résultats proches.
  const effectiveQuery = postalCode ? `${query} ${postalCode}` : query;
  const featuretype = kind === "city" ? "&featuretype=city" : "";
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    effectiveQuery
  )}&format=json&addressdetails=1&limit=5${countryCode ? `&countrycodes=${encodeURIComponent(countryCode)}` : ""}${featuretype}`;
  const res = await fetch(url, {
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    display_name: string;
    lat: string;
    lon: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      hamlet?: string;
      postcode?: string;
      country_code?: string;
    };
  }[];
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

  return (data ?? []).map((item) => {
    const addr = item.address ?? {};
    const city = addr.city || addr.town || addr.village || addr.hamlet || undefined;
    const cc = addr.country_code;
    const label =
      kind === "city"
        ? formatCityLabel(city, addr.postcode, cc) || item.display_name
        : item.display_name;
    return {
      label,
      addressLine: kind === "city" ? undefined : item.display_name,
      city,
      postalCode: addr.postcode,
      countryCode: cc,
      lat: Number.parseFloat(item.lat),
      lon: Number.parseFloat(item.lon),
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
    if (mode === "world") {
      return fetchNominatimSuggestions(query, ctx, { kind }, signal);
    }
    if (mode === "fr") {
      return fetchBanSuggestions(query, ctx, { kind }, signal);
    }
    // auto: BAN d'abord, puis Nominatim si aucun résultat
    const ban = await fetchBanSuggestions(query, ctx, { kind }, signal);
    if (ban.length > 0) return ban;
    return fetchNominatimSuggestions(query, ctx, { kind }, signal);
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

  // Fallback : si l'utilisateur ne clique pas une suggestion, on géocode le texte en blur.
  const resolveOnBlur = async () => {
    const trimmed = input.trim();
    if (trimmed.length < 5) return;
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
              if (highlightIdx >= 0 && highlightIdx < results.length) {
                e.preventDefault();
                void commitSelection(results[highlightIdx]!);
              }
            } else if (e.key === "Escape") {
              setShowDropdown(false);
            }
          }}
          placeholder={placeholder}
          aria-invalid={!!errorMessage}
          aria-describedby={errorMessage ? `${inputId ?? "address"}-error` : undefined}
          className={[
            "w-full rounded-xl border-2 bg-white px-4 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/40 focus:outline-none focus:ring-2 transition-all",
            errorMessage
              ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/15"
              : "border-[#E3E5E8] focus:border-[#6BCFCF] focus:ring-[#6BCFCF]/20",
          ].join(" ")}
        />

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

