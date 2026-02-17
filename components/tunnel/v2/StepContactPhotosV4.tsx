/**
 * StepContactPhotosV4 — Moverz V4 Design System (Simplified — moverz.fr style)
 * Écran 4: Confirmation "Bravo!"
 * 
 * ✅ Back-office safe
 * ✅ Tracking safe
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Mail, Clock, Camera, MessageSquare, ListChecks, Upload } from "lucide-react";
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
  const [activeEnrichmentTab, setActiveEnrichmentTab] =
    useState<"notes" | "photos" | "constraints">("notes");
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
            Votre demande de devis a bien été enregistrée
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
              Un email de confirmation vous a été envoyé. Cliquez sur le lien reçu pour valider votre adresse.
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

      {/* Timeline */}
      <CardV4 padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5" style={{ color: "var(--color-accent)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Ce qui se passe maintenant
            </p>
          </div>

          <div className="space-y-3">
            {[
              "1. Vous validez votre mail",
              "2. Nous contactons les meilleurs déménageurs",
              "3. Nous centralisons toutes les réponses / devis",
              "4. On vous fait un récap dans 5 à 7 jours",
            ].map((text, idx) => (
              <div key={text} className="flex items-start gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{
                    background: idx === 0 ? "var(--color-accent)" : "var(--color-accent-light)",
                    color: idx === 0 ? "#fff" : "var(--color-accent)",
                    border: idx === 0 ? "none" : "1px solid var(--color-accent)",
                  }}
                >
                  {idx + 1}
                </div>
                <p
                  className="text-sm"
                  style={{
                    color: idx === 0 ? "var(--color-text)" : "var(--color-text-secondary)",
                    fontWeight: idx === 0 ? 600 : 400,
                  }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardV4>

      {/* Enrichissement du dossier */}
      <CardV4 padding="md">
        {enrichmentMode === "idle" ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
              Vous pouvez maintenant nous parler des détails qui aideront votre déménageur
              à préparer au mieux votre dossier.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setEnrichmentMode("menu");
                  setActiveEnrichmentTab("notes");
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
                Pas maintenant, finaliser mon dossier
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Génial ! Pour enrichir votre dossier vous pouvez :
            </p>
            {access_type === "constrained" && (
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Des contraintes d'accès sont déjà renseignées, vous pouvez les ajuster si besoin.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "notes" as const, label: "Laisser un commentaire", icon: MessageSquare },
                { id: "photos" as const, label: "Ajouter des photos", icon: Camera },
                { id: "constraints" as const, label: "Choisir parmi une liste", icon: ListChecks },
              ].map((item) => {
                const selected = activeEnrichmentTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveEnrichmentTab(item.id);
                      setSaveMessage(null);
                    }}
                    className="rounded-xl px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                    style={{
                      background: selected ? "var(--color-accent)" : "var(--color-surface)",
                      color: selected ? "#fff" : "var(--color-text)",
                      border: selected ? "none" : "2px solid var(--color-border)",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {activeEnrichmentTab === "notes" && (
              <div className="space-y-2">
                <label
                  htmlFor="v4-step4-specific-notes"
                  className="block text-sm font-semibold"
                  style={{ color: "var(--color-text)" }}
                >
                  Votre commentaire
                </label>
                <textarea
                  id="v4-step4-specific-notes"
                  value={specificNotes}
                  onChange={(e) => {
                    onFieldChange("specificNotes", e.target.value);
                    setSaveMessage(null);
                  }}
                  rows={4}
                  className="w-full rounded-xl px-4 py-3 text-sm resize-y"
                  style={{
                    background: "var(--color-bg)",
                    border: "2px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  placeholder="Ex: accès étroit, objets lourds, contraintes horaires..."
                />
              </div>
            )}

            {activeEnrichmentTab === "photos" && (
              <div className="space-y-3">
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
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={!leadId || isUploadingPhotos}
                  className="w-full rounded-xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    border: "2px solid var(--color-border)",
                  }}
                >
                  <Upload className="w-4 h-4" />
                  {isUploadingPhotos ? "Envoi en cours..." : "Importer des photos"}
                </button>
                {!leadId && (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Les photos seront disponibles après création du dossier.
                  </p>
                )}
                {uploadMessage && (
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {uploadMessage}
                  </p>
                )}
              </div>
            )}

            {activeEnrichmentTab === "constraints" && (
              <div className="space-y-2">
                {questions.map((q) => {
                  const sides = parseAccessSides()[q.key];
                  return (
                    <div
                      key={q.key}
                      className="rounded-xl border p-3 space-y-2"
                      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                    >
                      <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        {q.label}
                      </p>
                      <div className="flex items-center gap-2">
                        {[
                          { loc: "origin" as const, label: "Départ", active: Boolean(sides?.origin) },
                          { loc: "destination" as const, label: "Arrivée", active: Boolean(sides?.destination) },
                        ].map((item) => (
                          <button
                            key={item.loc}
                            type="button"
                            onClick={() => toggleSide(q.key, item.loc)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{
                              background: item.active ? "var(--color-accent)" : "var(--color-bg)",
                              color: item.active ? "#fff" : "var(--color-text)",
                              border: item.active ? "none" : "1px solid var(--color-border)",
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                Pas maintenant, finaliser mon dossier
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
