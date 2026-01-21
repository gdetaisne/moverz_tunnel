"use client";

import { useEffect, useCallback, useRef } from "react";
import { ga4Event } from "@/lib/analytics/ga4";
import { trackTunnelEvent } from "@/lib/api/client";

type LogicalStep = "ENTRY" | "CONTACT" | "PROJECT" | "RECAP" | "PHOTOS" | "THANK_YOU";

interface TunnelTrackingConfig {
  source: string;
  from: string;
  leadId?: string | null;
}

export function useTunnelTracking(config: TunnelTrackingConfig) {
  const { source, from, leadId } = config;
  const sessionIdRef = useRef<string>("");
  const stepTimestampsRef = useRef<Record<number, number>>({});

  // Get or create session ID
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let sessionId = localStorage.getItem("moverz_tunnel_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem("moverz_tunnel_session_id", sessionId);
    }
    sessionIdRef.current = sessionId;
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

    // Custom tracking
    trackTunnelEvent({
      eventType: "TUNNEL_STEP_VIEWED",
      // leadId ici = Lead Back Office (Postgres)
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

    trackTunnelEvent({
      eventType: "TUNNEL_STEP_CHANGED",
      // leadId ici = Lead Back Office (Postgres)
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep: toLogicalStep,
      // IMPORTANT: screenId ne doit JAMAIS dépendre de l'index (ré-ordonnable).
      // Toujours passer un screenId explicite lié à l'écran UI (ex: project_v4).
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
  }, [source, leadId]);

  const trackCompletion = useCallback((opts?: { leadId?: string | null }) => {
    const effectiveLeadId = opts?.leadId ?? leadId ?? null;
    ga4Event("lead_submit", {
      source,
      from,
      lead_id: effectiveLeadId,
    });

    const totalDurationMs = stepTimestampsRef.current[1] 
      ? Date.now() - stepTimestampsRef.current[1]
      : undefined;

    trackTunnelEvent({
      eventType: "TUNNEL_COMPLETED",
      // leadId ici = Lead Back Office (Postgres)
      backofficeLeadId: effectiveLeadId || undefined,
      source,
      logicalStep: "THANK_YOU",
      screenId: "confirmation_v3",
      extra: {
        sessionId: sessionIdRef.current,
        totalDurationMs,
        stepsCount: Object.keys(stepTimestampsRef.current).length,
        urlPath: typeof window !== "undefined" ? window.location.pathname : "",
      },
    }).catch(console.error);
  }, [source, from, leadId]);

  const trackError = useCallback((
    errorType: string,
    errorMessage: string,
    currentStepIndex: number,
    logicalStep: LogicalStep,
    screenId: string
  ) => {
    trackTunnelEvent({
      eventType: "TUNNEL_ERROR",
      // leadId ici = Lead Back Office (Postgres)
      backofficeLeadId: leadId || undefined,
      source,
      logicalStep,
      // IMPORTANT: screenId ne doit JAMAIS dépendre de l'index (ré-ordonnable).
      screenId,
      extra: {
        sessionId: sessionIdRef.current,
        errorType,
        errorMessage,
        stepIndex: currentStepIndex,
        urlPath: typeof window !== "undefined" ? window.location.pathname : "",
      },
    }).catch(console.error);
  }, [source, leadId]);

  return {
    trackStep,
    trackStepChange,
    trackCompletion,
    trackError,
  };
}

