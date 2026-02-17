/**
 * StepContactPhotosV4 — Moverz V4 Design System (Simplified — moverz.fr style)
 * Écran 4: Confirmation "Bravo!"
 * 
 * ✅ Back-office safe
 * ✅ Tracking safe
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Mail, Camera, MessageSquare, ListChecks, Upload } from "lucide-react";
import { CardV4 } from "@/components/tunnel-v4";
import { uploadLeadPhotos } from "@/lib/api/client";

type QuestionKey =
  | "narrow_access"
  | "long_carry"
  | "difficult_parking"
  | "lift_required";

const questions: Array<{ key: QuestionKey; label: string }> = [
  { key: "narrow_access", label: "Petit ascenseur / passages étroits ?" },
  { key: "long_carry", label: "Portage > 10 m ?" },
  { key: "difficult_parking", label: "Stationnement compliqué ?" },
  { key: "lift_required", label: "Besoin d'un monte-meuble ?" },
];

const OBJECTS_BLOCK_START = "[[OBJETS_SPECIFIQUES_V4_START]]";
const OBJECTS_BLOCK_END = "[[OBJETS_SPECIFIQUES_V4_END]]";
const EXTRA_NOTES_BLOCK_START = "[[ENRICHISSEMENT_NOTES_V4_START]]";
const EXTRA_NOTES_BLOCK_END = "[[ENRICHISSEMENT_NOTES_V4_END]]";

type ObjectsState = {
  piano: boolean;
  coffreFort: boolean;
  meublesTresLourdsCount: number;
  aquarium: boolean;
  objetsFragilesVolumineux: boolean;
};

type ExtraNotesState = {
  note: string;
};

interface StepContactPhotosV4Props {
  leadId?: string | null;
  linkingCode?: string | null;
  estimateMinEur?: number | null;
  estimateMaxEur?: number | null;
  estimateIsIndicative?: boolean;
  email?: string | null;
  recap?: {
    originCity?: string | null;
    originPostalCode?: string | null;
    destinationCity?: string | null;
    destinationPostalCode?: string | null;
    movingDate?: string | null;
    formule?: string | null;
    surfaceM2?: string | null;
  };
  specificNotes: string;
  access_details: string;
  access_type: "simple" | "constrained";
  onFieldChange: (field: string, value: any) => void;
  onStartEnrichment?: () => void;
  onSaveEnrichment?: () => Promise<void>;
  isSavingEnrichment?: boolean;
}

export function StepContactPhotosV4({
  leadId,
  email = null,
  specificNotes,
  access_details,
  access_type,
  onFieldChange,
  onStartEnrichment,
  onSaveEnrichment,
  isSavingEnrichment = false,
}: StepContactPhotosV4Props) {
  const [mounted, setMounted] = useState(false);
  const requestOnceRef = useRef(false);
  const [confirmationState, setConfirmationState] = useState<
    { status: "idle" | "sending" | "sent"; message?: string } | { status: "error"; message: string }
  >({ status: "idle" });
  const [enrichmentMode, setEnrichmentMode] = useState<"idle" | "menu">("idle");
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!leadId) return;
    if (requestOnceRef.current) return;
    requestOnceRef.current = true;
    setConfirmationState({ status: "sent", message: "Email de confirmation envoyé" });
  }, [mounted, leadId]);

  const normalizedEmail = (email || "").trim().toLowerCase();

  const stripTaggedBlock = (raw: string, startTag: string, endTag: string): string => {
    const start = raw.indexOf(startTag);
    const end = raw.indexOf(endTag);
    if (start === -1 || end === -1 || end < start) return raw.trim();
    const before = raw.slice(0, start).trim();
    const after = raw.slice(end + endTag.length).trim();
    return [before, after].filter(Boolean).join("\n\n").trim();
  };

  const parseObjectsState = (raw: string): ObjectsState => {
    const start = raw.indexOf(OBJECTS_BLOCK_START);
    const end = raw.indexOf(OBJECTS_BLOCK_END);
    const defaults: ObjectsState = {
      piano: false,
      coffreFort: false,
      meublesTresLourdsCount: 0,
      aquarium: false,
      objetsFragilesVolumineux: false,
    };
    if (start === -1 || end === -1 || end < start) return defaults;
    const block = raw.slice(start + OBJECTS_BLOCK_START.length, end);
    const readBool = (key: string) =>
      new RegExp(`^${key}:(true|false)$`, "m").exec(block)?.[1] === "true";
    const countMatch = /^meublesTresLourdsCount:(\d+)$/m.exec(block);
    return {
      piano: readBool("piano"),
      coffreFort: readBool("coffreFort"),
      meublesTresLourdsCount: countMatch ? Number.parseInt(countMatch[1], 10) : 0,
      aquarium: readBool("aquarium"),
      objetsFragilesVolumineux: readBool("objetsFragilesVolumineux"),
    };
  };

  const serializeObjectsState = (state: ObjectsState): string =>
    `${OBJECTS_BLOCK_START}
piano:${state.piano}
coffreFort:${state.coffreFort}
meublesTresLourdsCount:${state.meublesTresLourdsCount}
aquarium:${state.aquarium}
objetsFragilesVolumineux:${state.objetsFragilesVolumineux}
${OBJECTS_BLOCK_END}`;

  const parseExtraNotesState = (raw: string): ExtraNotesState => {
    const start = raw.indexOf(EXTRA_NOTES_BLOCK_START);
    const end = raw.indexOf(EXTRA_NOTES_BLOCK_END);
    const defaults: ExtraNotesState = { note: "" };
    if (start === -1 || end === -1 || end < start) return defaults;
    const block = raw.slice(start + EXTRA_NOTES_BLOCK_START.length, end);
    const read = (key: string) => {
      const m = new RegExp(`^${key}:(.*)$`, "m").exec(block);
      if (!m?.[1]) return "";
      try {
        return decodeURIComponent(m[1]);
      } catch {
        return m[1];
      }
    };
    const unified = read("note");
    if (unified) return { note: unified };
    // Compat: relit l'ancien format (depart/arrivee/objets) si présent.
    const legacyParts = [
      read("depart"),
      read("arrivee"),
      read("objets"),
    ].filter((v) => v.trim().length > 0);
    return { note: legacyParts.join(" | ") };
  };

  const serializeExtraNotesState = (state: ExtraNotesState): string =>
    `${EXTRA_NOTES_BLOCK_START}
note:${encodeURIComponent(state.note || "")}
${EXTRA_NOTES_BLOCK_END}`;

  const rebuildSpecificNotes = (nextObjects: ObjectsState, nextExtraNotes: ExtraNotesState) => {
    const withoutObjects = stripTaggedBlock(specificNotes || "", OBJECTS_BLOCK_START, OBJECTS_BLOCK_END);
    const base = stripTaggedBlock(withoutObjects, EXTRA_NOTES_BLOCK_START, EXTRA_NOTES_BLOCK_END);
    const hasAnyObject =
      nextObjects.piano ||
      nextObjects.coffreFort ||
      nextObjects.aquarium ||
      nextObjects.objetsFragilesVolumineux ||
      nextObjects.meublesTresLourdsCount > 0;
    const hasAnyExtra = nextExtraNotes.note.trim().length > 0;
    const blocks = [
      hasAnyObject ? serializeObjectsState(nextObjects) : "",
      hasAnyExtra ? serializeExtraNotesState(nextExtraNotes) : "",
    ].filter(Boolean);
    const nextRaw = [base, ...blocks].filter(Boolean).join("\n\n").trim();
    onFieldChange("specificNotes", nextRaw);
    setSaveMessage(null);
  };

  const upsertObjectsState = (next: ObjectsState) => {
    const currentExtra = parseExtraNotesState(specificNotes || "");
    rebuildSpecificNotes(next, currentExtra);
  };

  const objectsState = parseObjectsState(specificNotes || "");
  const extraNotesState = parseExtraNotesState(specificNotes || "");
  const objectsRas =
    !objectsState.piano &&
    !objectsState.coffreFort &&
    !objectsState.aquarium &&
    !objectsState.objetsFragilesVolumineux &&
    objectsState.meublesTresLourdsCount <= 0;

  const parseAccessSides = () => {
    const sides: Record<QuestionKey, { origin?: boolean; destination?: boolean }> = {
      narrow_access: {},
      long_carry: {},
      difficult_parking: {},
      lift_required: {},
    };

    const parts = (access_details || "").split("|").filter(Boolean);
    for (const p of parts) {
      const [loc, key] = p.split(":") as [string, QuestionKey];
      if (!key) continue;
      if (loc === "origin") sides[key].origin = true;
      if (loc === "destination") sides[key].destination = true;
    }
    return sides;
  };

  const toggleSide = (q: QuestionKey, loc: "origin" | "destination") => {
    const current = parseAccessSides();
    const was = current[q]?.[loc] ?? false;
    current[q][loc] = !was;

    const parts: string[] = [];
    for (const qKey of Object.keys(current) as QuestionKey[]) {
      if (current[qKey].origin) parts.push(`origin:${qKey}`);
      if (current[qKey].destination) parts.push(`destination:${qKey}`);
    }
    const nextDetails = parts.join("|");
    onFieldChange("access_details", nextDetails);
    const hasAny = parts.length > 0;
    onFieldChange("access_type", hasAny ? "constrained" : "simple");
    onFieldChange("narrow_access", Boolean(current.narrow_access.origin || current.narrow_access.destination));
    onFieldChange("long_carry", Boolean(current.long_carry.origin || current.long_carry.destination));
    onFieldChange(
      "difficult_parking",
      Boolean(current.difficult_parking.origin || current.difficult_parking.destination)
    );
    onFieldChange("lift_required", Boolean(current.lift_required.origin || current.lift_required.destination));
    setSaveMessage(null);
  };

  const setSideRas = (loc: "origin" | "destination") => {
    const current = parseAccessSides();
    for (const qKey of Object.keys(current) as QuestionKey[]) {
      current[qKey][loc] = false;
    }
    const parts: string[] = [];
    for (const qKey of Object.keys(current) as QuestionKey[]) {
      if (current[qKey].origin) parts.push(`origin:${qKey}`);
      if (current[qKey].destination) parts.push(`destination:${qKey}`);
    }
    const nextDetails = parts.join("|");
    onFieldChange("access_details", nextDetails);
    const hasAny = parts.length > 0;
    onFieldChange("access_type", hasAny ? "constrained" : "simple");
    onFieldChange("narrow_access", Boolean(current.narrow_access.origin || current.narrow_access.destination));
    onFieldChange("long_carry", Boolean(current.long_carry.origin || current.long_carry.destination));
    onFieldChange(
      "difficult_parking",
      Boolean(current.difficult_parking.origin || current.difficult_parking.destination)
    );
    onFieldChange("lift_required", Boolean(current.lift_required.origin || current.lift_required.destination));
    setSaveMessage(null);
  };

  const handleUploadPhotos = async (files: File[]) => {
    if (!leadId || files.length === 0) return;
    setIsUploadingPhotos(true);
    setUploadMessage(null);
    try {
      const result = await uploadLeadPhotos(leadId, files);
      if (result.errors.length > 0) {
        setUploadMessage(result.errors[0]?.reason ?? "Certaines photos n'ont pas pu être envoyées.");
      } else {
        setUploadMessage(`${result.success.length} photo(s) ajoutée(s) au dossier.`);
      }
      setSaveMessage(null);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Erreur lors de l'upload des photos.");
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleSaveEnrichment = async () => {
    if (!onSaveEnrichment) return;
    try {
      await onSaveEnrichment();
      setSaveMessage("Précisions enregistrées avec succès.");
    } catch {
      setSaveMessage("Impossible d'enregistrer pour le moment.");
    }
  };
  const accessSides = parseAccessSides();
  const originRas = questions.every((q) => !accessSides[q.key]?.origin);
  const destinationRas = questions.every((q) => !accessSides[q.key]?.destination);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero */}
      <CardV4 padding="lg">
        <div className="text-center space-y-4">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold mx-auto"
            style={{
              background: "rgba(22,163,74,0.1)",
              border: "1px solid rgba(22,163,74,0.3)",
              color: "var(--color-success)",
            }}
          >
            <CheckCircle2 className="w-5 h-5" strokeWidth={3} />
            Dossier créé avec succès
          </div>

          <h1
            className="text-4xl sm:text-5xl font-bold"
            style={{ fontFamily: "var(--font-sora)", color: "var(--color-text)" }}
          >
            Bravo !
          </h1>

          <p className="text-base sm:text-lg" style={{ color: "var(--color-text-secondary)" }}>
            Votre demande est bien enregistrée.
          </p>
        </div>
      </CardV4>

      {/* Email confirmation */}
      <CardV4 padding="md">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--color-accent-light)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <Mail className="w-6 h-6" style={{ color: "var(--color-accent)" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text)" }}>
              Confirmez votre email
              {normalizedEmail && (
                <span className="ml-2 font-mono" style={{ color: "var(--color-accent)" }}>
                  {normalizedEmail}
                </span>
              )}
            </p>
            <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Cliquez sur le lien reçu pour activer votre dossier.
            </p>

            {confirmationState.status === "sent" && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(22,163,74,0.1)",
                  color: "var(--color-success)",
                }}
              >
                <CheckCircle2 className="w-3 h-3" />
                {confirmationState.message || "Email de confirmation envoyé"}
              </div>
            )}
          </div>
        </div>
      </CardV4>

      {/* Enrichissement du dossier */}
      <CardV4 padding="md">
        {enrichmentMode === "idle" ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              Souhaitez-vous enrichir votre dossier ?
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Ajoutez un commentaire, des photos ou des contraintes utiles.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEnrichmentMode("menu");
                  setSaveMessage(null);
                  onStartEnrichment?.();
                }}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                Enrichir mon dossier
              </button>
              <button
                type="button"
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  border: "2px solid var(--color-border)",
                }}
              >
                Pas maintenant
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--color-text)" }}>
                Eviter les suppléments imprévus
              </h3>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                Un accès mal déclaré peut générer 150 à 500 € de frais supplémentaires.
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                ⏱ 1 minute pour sécuriser votre estimation
              </p>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                await handleUploadPhotos(files);
                e.currentTarget.value = "";
              }}
            />

            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
              <div
                className="order-2 sm:order-2 min-w-[85%] sm:min-w-0 snap-start rounded-xl border p-3 flex flex-col gap-3"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    2. Contraintes au départ
                  </p>
                </div>
                {questions.map((q) => {
                  const active = Boolean(accessSides[q.key]?.origin);
                  return (
                    <button
                      key={`origin-${q.key}`}
                      type="button"
                      onClick={() => toggleSide(q.key, "origin")}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium"
                      style={{
                        background: active ? "var(--color-accent-light)" : "var(--color-bg)",
                        color: "var(--color-text)",
                        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                      }}
                    >
                      {q.label}
                    </button>
                  );
                })}
                <div className="mt-auto space-y-2">
                  <button
                    type="button"
                    onClick={() => setSideRas("origin")}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{
                      background: originRas ? "var(--color-accent)" : "var(--color-bg)",
                      color: originRas ? "#fff" : "var(--color-text)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    Rien à déclarer
                  </button>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={!leadId || isUploadingPhotos}
                    className="w-full px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                    style={{
                      background: "transparent",
                      color: "var(--color-text-secondary)",
                      border: "1px dashed var(--color-border)",
                    }}
                  >
                    <Camera className="w-3.5 h-3.5 inline mr-1" />
                    Ajouter une photo (optionnel)
                  </button>
                </div>
              </div>

              <div
                className="order-3 sm:order-3 min-w-[85%] sm:min-w-0 snap-start rounded-xl border p-3 flex flex-col gap-3"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    3. Contraintes à l'arrivée
                  </p>
                </div>
                {questions.map((q) => {
                  const active = Boolean(accessSides[q.key]?.destination);
                  return (
                    <button
                      key={`dest-${q.key}`}
                      type="button"
                      onClick={() => toggleSide(q.key, "destination")}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium"
                      style={{
                        background: active ? "var(--color-accent-light)" : "var(--color-bg)",
                        color: "var(--color-text)",
                        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                      }}
                    >
                      {q.label}
                    </button>
                  );
                })}
                <div className="mt-auto space-y-2">
                  <button
                    type="button"
                    onClick={() => setSideRas("destination")}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{
                      background: destinationRas ? "var(--color-accent)" : "var(--color-bg)",
                      color: destinationRas ? "#fff" : "var(--color-text)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    Rien à déclarer
                  </button>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={!leadId || isUploadingPhotos}
                    className="w-full px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                    style={{
                      background: "transparent",
                      color: "var(--color-text-secondary)",
                      border: "1px dashed var(--color-border)",
                    }}
                  >
                    <Camera className="w-3.5 h-3.5 inline mr-1" />
                    Ajouter une photo (optionnel)
                  </button>
                </div>
              </div>

              <div
                className="order-1 sm:order-1 min-w-[85%] sm:min-w-0 snap-start rounded-xl border p-3 flex flex-col gap-3"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    1. Objets spécifiques
                  </p>
                </div>
                {[
                  { key: "piano", label: "Piano" },
                  { key: "coffreFort", label: "Coffre-fort" },
                  { key: "aquarium", label: "Aquarium" },
                  { key: "objetsFragilesVolumineux", label: "Objets fragiles volumineux" },
                ].map((item) => {
                  const active = Boolean(objectsState[item.key as keyof ObjectsState]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        upsertObjectsState({
                          ...objectsState,
                          [item.key]: !active,
                        } as ObjectsState);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium"
                      style={{
                        background: active ? "var(--color-accent-light)" : "var(--color-bg)",
                        color: "var(--color-text)",
                        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}

                <div className="space-y-1">
                  <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                    Meuble(s) très lourd(s)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={objectsState.meublesTresLourdsCount}
                    onChange={(e) => {
                      const next = Number.parseInt(e.target.value || "0", 10);
                      upsertObjectsState({
                        ...objectsState,
                        meublesTresLourdsCount: Number.isFinite(next) ? Math.max(0, next) : 0,
                      });
                    }}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                </div>

                <div className="mt-auto space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      upsertObjectsState({
                        piano: false,
                        coffreFort: false,
                        meublesTresLourdsCount: 0,
                        aquarium: false,
                        objetsFragilesVolumineux: false,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{
                      background: objectsRas ? "var(--color-accent)" : "var(--color-bg)",
                      color: objectsRas ? "#fff" : "var(--color-text)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    Rien à déclarer
                  </button>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={!leadId || isUploadingPhotos}
                    className="w-full px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                    style={{
                      background: "transparent",
                      color: "var(--color-text-secondary)",
                      border: "1px dashed var(--color-border)",
                    }}
                  >
                    <Camera className="w-3.5 h-3.5 inline mr-1" />
                    Ajouter une photo (optionnel)
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Précision manuelle (commune)
              </label>
              <input
                type="text"
                value={extraNotesState.note}
                onChange={(e) =>
                  rebuildSpecificNotes(objectsState, {
                    note: e.target.value,
                  })
                }
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                placeholder="Ajouter une précision utile (optionnel)"
              />
            </div>

            {uploadMessage && (
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {uploadMessage}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSaveEnrichment}
                disabled={isSavingEnrichment}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                {isSavingEnrichment ? "Enregistrement..." : "Valider ces précisions"}
              </button>
              <button
                type="button"
                onClick={() => setEnrichmentMode("idle")}
                className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  border: "2px solid var(--color-border)",
                }}
              >
                Pas maintenant
              </button>
            </div>
            {saveMessage && (
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {saveMessage}
              </p>
            )}
          </div>
        )}
      </CardV4>
    </div>
  );
}
