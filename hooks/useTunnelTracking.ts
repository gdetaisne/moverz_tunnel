"use client";

import { useEffect, useCallback, useRef } from "react";
import { ga4Event } from "@/lib/analytics/ga4";
import { trackTunnelEvent } from "@/lib/api/client";
import {
  sendAnalyticsEvent,
  captureAcquisitionParams,
} from "@/lib/analytics/collector";

type LogicalStep = "ENTRY" | "CONTACT" | "PROJECT" | "RECAP" | "PHOTOS" | "THANK_YOU";

interface TunnelTrackingConfig {
  source: string;
  from: string;
  leadId?: string | null;
  email?: string | null;
}

export function useTunnelTracking(config: TunnelTrackingConfig) {
  const { source, from, leadId, email } = config;
  const sessionIdRef = useRef<string>("");
  const stepTimestampsRef = useRef<Record<number, number>>({});

  // Refs for data that changes often (no re-render on update)
  const emailRef = useRef(email);
  emailRef.current = email;
  const formSnapshotRef = useRef<Record<string, unknown> | null>(null);
  const pricingSnapshotRef = useRef<Record<string, unknown> | null>(null);

  // Get or create session ID + capture acquisition params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let sessionId = localStorage.getItem("moverz_tunnel_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("moverz_tunnel_session_id", sessionId);
    }
    sessionIdRef.current = sessionId;

    // Capture UTMs and acquisition params once at mount
    captureAcquisitionParams();
  }, []);

  /** Call this to update the form snapshot before step transitions */
  const updateFormSnapshot = useCallback((snapshot: Record<string, unknown> | null) => {
    formSnapshotRef.current = snapshot;
  }, []);

  /** Call this to update the pricing snapshot */
  const updatePricingSnapshot = useCallback((snapshot: Record<string, unknown> | null) => {
    pricingSnapshotRef.current = snapshot;
  }, []);

  const trackStep = useCallback((
    stepIndex: number,
    logicalStep: LogicalStep,
    screenId: string
  ) => {
    // Record entry time for this step
    stepTimestampsRef.current[stepIndex] = Date.now();

    // GA4 event
    ga4Event("tunnel_step_viewed", {
      source,
      from,
      step_name: logicalStep,
      step_index: stepIndex,
      lead_id: leadId,
    });

    // Back Office tracking (existing)
    trackTunnelEvent({
      eventType: "TUNNEL_STEP_VIEWED",
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep,
      screenId,
      extra: {
        sessionId: sessionIdRef.current,
        stepIndex,
        urlPath: typeof window !== "undefined" ? window.location.pathname : "",
      },
    }).catch(console.error);

    // ✅ Analytics Neon (enriched)
    sendAnalyticsEvent({
      eventType: "TUNNEL_STEP_VIEWED",
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep,
      screenId,
      email: emailRef.current || undefined,
      formSnapshot: formSnapshotRef.current || undefined,
      pricingSnapshot: pricingSnapshotRef.current || undefined,
      extra: {
        stepIndex,
        from,
      },
    });
  }, [source, from, leadId]);

  const trackStepChange = useCallback((
    fromStepIndex: number,
    toStepIndex: number,
    fromLogicalStep: LogicalStep,
    toLogicalStep: LogicalStep,
    toScreenId: string,
    direction: "forward" | "back"
  ) => {
    const startTime = stepTimestampsRef.current[fromStepIndex];
    const durationMs = startTime ? Date.now() - startTime : undefined;

    // Back Office tracking (existing)
    trackTunnelEvent({
      eventType: "TUNNEL_STEP_CHANGED",
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep: toLogicalStep,
      screenId: toScreenId,
      extra: {
        sessionId: sessionIdRef.current,
        fromStep: fromLogicalStep,
        toStep: toLogicalStep,
        fromStepIndex,
        toStepIndex,
        direction,
        durationMs,
        urlPath: typeof window !== "undefined" ? window.location.pathname : "",
      },
    }).catch(console.error);

    // ✅ Analytics Neon (enriched)
    sendAnalyticsEvent({
      eventType: "TUNNEL_STEP_CHANGED",
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep: toLogicalStep,
      screenId: toScreenId,
      email: emailRef.current || undefined,
      formSnapshot: formSnapshotRef.current || undefined,
      pricingSnapshot: pricingSnapshotRef.current || undefined,
      extra: {
        fromStep: fromLogicalStep,
        toStep: toLogicalStep,
        fromStepIndex,
        toStepIndex,
        direction,
        durationMs,
        from,
      },
    });
  }, [source, from, leadId]);

  const trackCompletion = useCallback((opts?: { leadId?: string | null; screenId?: string }) => {
    const effectiveLeadId = opts?.leadId ?? leadId ?? null;
    ga4Event("lead_submit", {
      source,
      from,
      lead_id: effectiveLeadId,
    });

    const totalDurationMs = stepTimestampsRef.current[1] 
      ? Date.now() - stepTimestampsRef.current[1]
      : undefined;

    // Back Office tracking (existing)
    trackTunnelEvent({
      eventType: "TUNNEL_COMPLETED",
      backofficeLeadId: effectiveLeadId || undefined,
      source,
      logicalStep: "THANK_YOU",
      screenId: opts?.screenId ?? "confirmation_v3",
      extra: {
        sessionId: sessionIdRef.current,
        totalDurationMs,
        stepsCount: Object.keys(stepTimestampsRef.current).length,
        urlPath: typeof window !== "undefined" ? window.location.pathname : "",
      },
    }).catch(console.error);

    // ✅ Analytics Neon (enriched)
    sendAnalyticsEvent({
      eventType: "TUNNEL_COMPLETED",
      backofficeLeadId: effectiveLeadId || undefined,
      source,
      logicalStep: "THANK_YOU",
      screenId: opts?.screenId ?? "confirmation_v3",
      email: emailRef.current || undefined,
      formSnapshot: formSnapshotRef.current || undefined,
      pricingSnapshot: pricingSnapshotRef.current || undefined,
      extra: {
        totalDurationMs,
        stepsCount: Object.keys(stepTimestampsRef.current).length,
        from,
      },
    });
  }, [source, from, leadId]);

  const trackError = useCallback((
    errorType: string,
    errorMessage: string,
    currentStepIndex: number,
    logicalStep: LogicalStep,
    screenId: string
  ) => {
    // Back Office tracking (existing)
    trackTunnelEvent({
      eventType: "TUNNEL_ERROR",
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep,
      screenId,
      extra: {
        sessionId: sessionIdRef.current,
        errorType,
        errorMessage,
        stepIndex: currentStepIndex,
        urlPath: typeof window !== "undefined" ? window.location.pathname : "",
      },
    }).catch(console.error);

    // ✅ Analytics Neon (enriched)
    sendAnalyticsEvent({
      eventType: "TUNNEL_ERROR",
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep,
      screenId,
      email: emailRef.current || undefined,
      extra: {
        errorType,
        errorMessage,
        stepIndex: currentStepIndex,
        from,
      },
    });
  }, [source, from, leadId]);

  // ============================================================
  // NEW: Fine-grained interaction tracking (Neon only)
  // ============================================================

  const trackFieldInteraction = useCallback((
    fieldName: string,
    logicalStep: LogicalStep,
    screenId: string,
    interactionType: "focus" | "blur" | "change" = "focus"
  ) => {
    sendAnalyticsEvent({
      eventType: "FIELD_INTERACTION",
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep,
      screenId,
      email: emailRef.current || undefined,
      extra: {
        fieldName,
        interactionType,
        from,
      },
    });
  }, [source, from, leadId]);

  const trackValidationError = useCallback((
    fields: string[],
    logicalStep: LogicalStep,
    screenId: string
  ) => {
    sendAnalyticsEvent({
      eventType: "VALIDATION_ERROR",
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep,
      screenId,
      email: emailRef.current || undefined,
      extra: {
        fields,
        fieldsCount: fields.length,
        from,
      },
    });
  }, [source, from, leadId]);

  const trackPricingViewed = useCallback((
    pricing: Record<string, unknown>,
    logicalStep: LogicalStep,
    screenId: string
  ) => {
    sendAnalyticsEvent({
      eventType: "PRICING_VIEWED",
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep,
      screenId,
      email: emailRef.current || undefined,
      pricingSnapshot: pricing,
      extra: {
        from,
      },
    });
  }, [source, from, leadId]);

  const trackCustomEvent = useCallback((
    eventType: string,
    logicalStep: LogicalStep,
    screenId: string,
    extra?: Record<string, unknown>
  ) => {
    sendAnalyticsEvent({
      eventType,
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep,
      screenId,
      email: emailRef.current || undefined,
      extra: {
        ...extra,
        from,
      },
    });
  }, [source, from, leadId]);

  return {
    // Existing (BO + GA4 + Neon)
    trackStep,
    trackStepChange,
    trackCompletion,
    trackError,
    // Snapshot updaters
    updateFormSnapshot,
    updatePricingSnapshot,
    // NEW (Neon only — fine-grained)
    trackFieldInteraction,
    trackValidationError,
    trackPricingViewed,
    trackCustomEvent,
  };
}
