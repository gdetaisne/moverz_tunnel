'use client';

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ga4Event } from "@/lib/analytics/ga4";
import {
  createLead,
  updateLead,
  trackTunnelEvent,
  type LeadTunnelCreatePayload,
} from "@/lib/api/client";
import TunnelHero from "@/components/tunnel/TunnelHero";
import Step1Contact from "@/components/tunnel/Step1Contact";
import TrustSignals from "@/components/tunnel/TrustSignals";

const STEPS = [
  { id: 1, label: "Contact" },
  { id: 2, label: "Projet" },
  { id: 3, label: "Formules" },
  { id: 4, label: "Photos" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface FormState {
  firstName: string;
  email: string;
}

const INITIAL_FORM_STATE: FormState = {
  firstName: "",
  email: "",
};

function DevisGratuitsV3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = searchParams.get("source") || searchParams.get("src") || "direct";
  const from = searchParams.get("from") || "/devis-gratuits-v3";

  useEffect(() => {
    // Track tunnel start
    ga4Event("form_start", {
      source,
      from,
      step_name: "CONTACT",
      step_index: 1,
    });

    trackTunnelEvent({
      eventType: "TUNNEL_SESSION_STARTED",
      leadTunnelId: undefined,
      source,
      logicalStep: "ENTRY",
      screenId: "contact_v3",
      extra: {
        sessionId: getSessionId(),
        device: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
        tunnelVersion: "v3",
        urlPath: window.location.pathname,
      },
    }).catch(console.error);
  }, [source, from]);

  function getSessionId(): string {
    let sessionId = localStorage.getItem("moverz_tunnel_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("moverz_tunnel_session_id", sessionId);
    }
    return sessionId;
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmitStep1(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.firstName.trim() || form.firstName.trim().length < 2) {
      setError("Merci de saisir votre prénom ou surnom");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Merci de saisir un email valide");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: LeadTunnelCreatePayload = {
        firstName: form.firstName.trim(),
        lastName: "",
        email: form.email.trim(),
        phone: "",
        source,
        primaryChannel: "web",
      };

      const response = await createLead(payload);
      setLeadId(response.id);

      // Track success
      ga4Event("lead_submit", {
        source,
        from,
        lead_id: response.id,
      });

      trackTunnelEvent({
        eventType: "TUNNEL_STEP_CHANGED",
        leadTunnelId: response.id,
        source,
        logicalStep: "PROJECT",
        screenId: "project_v3",
        extra: {
          sessionId: getSessionId(),
          fromStep: "CONTACT",
          toStep: "PROJECT",
          direction: "forward",
          urlPath: window.location.pathname,
        },
      }).catch(console.error);

      // Go to step 2
      setCurrentStep(2);
    } catch (err: any) {
      console.error("Error creating lead:", err);
      setError(err.message || "Une erreur est survenue. Merci de réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F8F9FA] to-white">
      {/* Hero with progress */}
      <TunnelHero currentStep={currentStep} totalSteps={STEPS.length} />

      {/* Main content */}
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Trust signals */}
        <div className="mb-12">
          <TrustSignals />
        </div>

        {/* Step content */}
        <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12">
          {currentStep === 1 && (
            <Step1Contact
              firstName={form.firstName}
              email={form.email}
              onFirstNameChange={(value) => updateField("firstName", value)}
              onEmailChange={(value) => updateField("email", value)}
              onSubmit={handleSubmitStep1}
              isSubmitting={isSubmitting}
              error={error}
            />
          )}

          {currentStep === 2 && (
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold text-[#0F172A] mb-4">
                Étape 2 : Projet
              </h2>
              <p className="text-lg text-[#1E293B]/70">
                (À venir - en cours de développement)
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function DevisGratuitsV3Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F9FA]" />}>
      <DevisGratuitsV3Content />
    </Suspense>
  );
}

