'use client';

import { FormEvent, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ga4Event } from "@/lib/analytics/ga4";
import {
  createLead,
  updateLead,
  type LeadTunnelCreatePayload,
} from "@/lib/api/client";
import { useTunnelState } from "@/hooks/useTunnelState";
import { useTunnelTracking } from "@/hooks/useTunnelTracking";
import TunnelHero from "@/components/tunnel/TunnelHero";
import Step1Contact from "@/components/tunnel/Step1Contact";
import Step2Project from "@/components/tunnel/Step2Project";
import Step3Formules from "@/components/tunnel/Step3Formules";
import ConfirmationPage from "@/components/tunnel/ConfirmationPage";
import TrustSignals from "@/components/tunnel/TrustSignals";

const STEPS = [
  { id: 1, label: "Contact" },
  { id: 2, label: "Projet" },
  { id: 3, label: "Formules" },
  { id: 4, label: "Photos" },
] as const;

function DevisGratuitsV3Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { state, updateField, updateFields, goToStep } = useTunnelState();
  const source = searchParams.get("source") || searchParams.get("src") || "direct";
  const from = searchParams.get("from") || "/devis-gratuits-v3";
  
  const { trackStep, trackStepChange, trackCompletion, trackError } = useTunnelTracking({
    source,
    from,
    leadId: state.leadId,
  });

  // Track initial entry
  useEffect(() => {
    if (state.currentStep === 1 && !state.leadId) {
      ga4Event("form_start", {
        source,
        from,
        step_name: "CONTACT",
        step_index: 1,
      });
      trackStep(1, "CONTACT", "contact_v3");
    }
  }, [source, from]);

  // Track step views
  useEffect(() => {
    const stepMap = {
      1: { logical: "CONTACT" as const, screen: "contact_v3" },
      2: { logical: "PROJECT" as const, screen: "project_v3" },
      3: { logical: "RECAP" as const, screen: "formules_v3" },
      4: { logical: "THANK_YOU" as const, screen: "confirmation_v3" },
    };
    
    const current = stepMap[state.currentStep];
    if (current) {
      trackStep(state.currentStep, current.logical, current.screen);
    }
  }, [state.currentStep]);

  async function handleSubmitStep1(e: FormEvent) {
    e.preventDefault();

    if (!state.firstName.trim() || state.firstName.trim().length < 2) {
      trackError("VALIDATION_ERROR", "Invalid firstName", 1, "CONTACT");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
      trackError("VALIDATION_ERROR", "Invalid email", 1, "CONTACT");
      return;
    }

    try {
      const payload: LeadTunnelCreatePayload = {
        firstName: state.firstName.trim(),
        lastName: state.lastName.trim(),
        email: state.email.trim(),
        phone: state.phone.trim(),
        source,
        primaryChannel: "web",
      };

      const response = await createLead(payload);
      updateFields({ leadId: response.id, linkingCode: response.linkingToken || null });

      trackStepChange(1, 2, "CONTACT", "PROJECT", "forward");
      goToStep(2);
    } catch (err: any) {
      console.error("Error creating lead:", err);
      trackError("API_ERROR", err.message || "Failed to create lead", 1, "CONTACT");
    }
  }

  async function handleSubmitStep2(e: FormEvent) {
    e.preventDefault();

    const isOriginValid = state.originPostalCode.length === 5 && state.originCity.trim().length > 0;
    const isDestinationValid = state.destinationUnknown || 
      (state.destinationPostalCode.length === 5 && state.destinationCity.trim().length > 0);
    const isDateValid = state.movingDate.length > 0;

    if (!isOriginValid || !isDestinationValid || !isDateValid) {
      trackError("VALIDATION_ERROR", "Invalid project fields", 2, "PROJECT");
      return;
    }

    try {
      if (state.leadId) {
        await updateLead(state.leadId, {
          originPostalCode: state.originPostalCode,
          originCity: state.originCity,
          originAddress: state.originAddress,
          destinationPostalCode: state.destinationUnknown ? null : state.destinationPostalCode,
          destinationCity: state.destinationUnknown ? null : state.destinationCity,
          destinationAddress: state.destinationUnknown ? null : state.destinationAddress,
          movingDate: state.movingDate,
        });
      }

      trackStepChange(2, 3, "PROJECT", "RECAP", "forward");
      goToStep(3);
    } catch (err: any) {
      console.error("Error updating lead:", err);
      trackError("API_ERROR", err.message || "Failed to update lead", 2, "PROJECT");
    }
  }

  async function handleSubmitStep3(e: FormEvent) {
    e.preventDefault();

    const surface = parseInt(state.surfaceM2) || 60;
    if (surface < 10 || surface > 500) {
      trackError("VALIDATION_ERROR", "Invalid surface", 3, "RECAP");
      return;
    }

    try {
      if (state.leadId) {
        const volumeM3 = Math.round(surface * 0.7);
        const distanceKm = 450; // Placeholder - would calculate from cities
        const priceMin = Math.round(surface * 15);
        const priceMax = Math.round(surface * 25);
        
        await updateLead(state.leadId, {
          surfaceM2: surface,
          volumeM3: volumeM3,
          density: state.density,
          formule: state.formule,
          priceMin: priceMin,
          priceMax: priceMax,
          distanceKm: distanceKm,
        });
      }

      trackStepChange(3, 4, "RECAP", "THANK_YOU", "forward");
      trackCompletion();
      goToStep(4);
    } catch (err: any) {
      console.error("Error finalizing lead:", err);
      trackError("API_ERROR", err.message || "Failed to finalize lead", 3, "RECAP");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#F8F9FA] to-white">
      {/* Hero with progress */}
      <TunnelHero currentStep={state.currentStep} totalSteps={STEPS.length} />

      {/* Main content */}
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Trust signals */}
        {state.currentStep < 4 && (
          <div className="mb-12">
            <TrustSignals />
          </div>
        )}

        {/* Step content */}
        <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12">
          {state.currentStep === 1 && (
            <Step1Contact
              firstName={state.firstName}
              email={state.email}
              onFirstNameChange={(value) => updateField("firstName", value)}
              onEmailChange={(value) => updateField("email", value)}
              onSubmit={handleSubmitStep1}
              isSubmitting={false}
              error={null}
            />
          )}

          {state.currentStep === 2 && (
            <Step2Project
              originPostalCode={state.originPostalCode}
              originCity={state.originCity}
              destinationPostalCode={state.destinationPostalCode}
              destinationCity={state.destinationCity}
              destinationUnknown={state.destinationUnknown}
              movingDate={state.movingDate}
              dateFlexible={state.dateFlexible}
              onFieldChange={(field, value) => updateField(field as any, value)}
              onSubmit={handleSubmitStep2}
              isSubmitting={false}
              error={null}
            />
          )}

          {state.currentStep === 3 && (
            <Step3Formules
              surfaceM2={state.surfaceM2}
              formule={state.formule}
              onFieldChange={(field, value) => updateField(field as any, value)}
              onSubmit={handleSubmitStep3}
              isSubmitting={false}
              error={null}
            />
          )}

          {state.currentStep === 4 && (
            <ConfirmationPage
              firstName={state.firstName}
              email={state.email}
              linkingCode={state.linkingCode || undefined}
            />
          )}
        </div>

        {/* Navigation helpers */}
        {state.currentStep > 1 && state.currentStep < 4 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                const prevStep = (state.currentStep - 1) as 1 | 2 | 3 | 4;
                trackStepChange(state.currentStep, prevStep, "PROJECT", "CONTACT", "back");
                goToStep(prevStep);
              }}
              className="text-[#1E293B]/70 hover:text-[#0F172A] text-sm font-medium transition-colors"
            >
              ← Retour
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function DevisGratuitsV3Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#F8F9FA] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6BCFCF] border-t-transparent"></div>
          <p className="mt-4 text-[#1E293B]/70">Chargement...</p>
        </div>
      </div>
    }>
      <DevisGratuitsV3Content />
    </Suspense>
  );
}
