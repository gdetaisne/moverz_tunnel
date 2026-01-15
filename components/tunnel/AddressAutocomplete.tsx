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
  inputId?: string;
}

// --- Providers ---

// FR (BAN api-adresse.data.gouv.fr)
async function fetchBanSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
    query
  )}&limit=5`;
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
  return (data.features ?? []).map((f) => ({
    label: f.properties.label,
    addressLine: f.properties.label,
    city: f.properties.city,
    postalCode: f.properties.postcode,
    countryCode: "fr",
    lon: f.geometry?.coordinates?.[0],
    lat: f.geometry?.coordinates?.[1],
  }));
}

// World/Europe (Nominatim OSM)
async function fetchNominatimSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&addressdetails=1&limit=5`;
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
  return (data ?? []).map((item) => {
    const addr = item.address ?? {};
    const city = addr.city || addr.town || addr.village || addr.hamlet || undefined;
    return {
      label: item.display_name,
      addressLine: item.display_name,
      city,
      postalCode: addr.postcode,
      countryCode: addr.country_code,
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
  inputId,
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
    if (mode === "world") {
      return fetchNominatimSuggestions(query, signal);
    }
    if (mode === "fr") {
      return fetchBanSuggestions(query, signal);
    }
    // auto: BAN d'abord, puis Nominatim si aucun résultat
    const ban = await fetchBanSuggestions(query, signal);
    if (ban.length > 0) return ban;
    return fetchNominatimSuggestions(query, signal);
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
      <label className="block text-sm font-medium text-[#0F172A]">{label}</label>
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
          className="w-full rounded-xl border-2 border-[#E3E5E8] bg-white px-4 py-3 text-base text-[#0F172A] placeholder:text-[#1E293B]/40 focus:border-[#6BCFCF] focus:outline-none focus:ring-2 focus:ring-[#6BCFCF]/20 transition-all"
        />

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

