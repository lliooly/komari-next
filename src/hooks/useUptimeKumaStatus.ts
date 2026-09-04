"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildUptimeKumaUrls,
  fetchUptimeKumaStatus,
  type UptimeKumaSettings,
  type UptimeKumaSnapshot,
} from "@/lib/uptimeKuma";

export const UPTIME_KUMA_REFRESH_INTERVAL_MS = 2 * 60 * 1000;
export const UPTIME_KUMA_REQUEST_TIMEOUT_MS = 15 * 1000;

export interface UptimeKumaStatusState {
  data: UptimeKumaSnapshot | null;
  isLoading: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
}

type RefreshSource = "background" | "manual";

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to fetch Uptime Kuma status";
}

export function useUptimeKumaStatus(
  settings: Partial<UptimeKumaSettings> | undefined
) {
  const enabled = settings?.enabled === true;
  const baseUrl = settings?.baseUrl?.trim() ?? "";
  const slug = settings?.slug?.trim() ?? "";
  const urls = useMemo(
    () => buildUptimeKumaUrls({ baseUrl, slug }),
    [baseUrl, slug]
  );
  const [state, setState] = useState<UptimeKumaStatusState>({
    data: null,
    isLoading: false,
    error: null,
    lastUpdatedAt: null,
  });
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (source: RefreshSource = "background"): Promise<boolean> => {
    if (source === "background" && controllerRef.current) {
      return false;
    }

    const requestId = ++requestIdRef.current;
    controllerRef.current?.abort();

    if (!enabled) {
      setState({
        data: null,
        isLoading: false,
        error: null,
        lastUpdatedAt: null,
      });
      return false;
    }

    if (!urls) {
      setState({
        data: null,
        isLoading: false,
        error: "Uptime Kuma URL or status page slug is invalid",
        lastUpdatedAt: null,
      });
      return false;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    let didTimeout = false;
    const timeout = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, UPTIME_KUMA_REQUEST_TIMEOUT_MS);
    setState((previous) => ({
      ...previous,
      isLoading: previous.data === null,
      error: null,
    }));

    try {
      const data = await fetchUptimeKumaStatus(
        { enabled, baseUrl, slug },
        controller.signal
      );

      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return false;
      }

      setState({
        data,
        isLoading: false,
        error: null,
        lastUpdatedAt: new Date(),
      });
      return true;
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return false;
      }
      if (controller.signal.aborted && !didTimeout) {
        return false;
      }

      setState((previous) => ({
        ...previous,
        isLoading: false,
        error: didTimeout ? "Uptime Kuma request timed out" : getErrorMessage(error),
      }));
      return false;
    } finally {
      window.clearTimeout(timeout);
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }, [baseUrl, enabled, slug, urls]);

  useEffect(() => {
    setState({
      data: null,
      isLoading: enabled && urls !== null,
      error: null,
      lastUpdatedAt: null,
    });
    void refresh();

    if (!enabled || !urls) {
      return () => {
        requestIdRef.current += 1;
        controllerRef.current?.abort();
        controllerRef.current = null;
      };
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, UPTIME_KUMA_REFRESH_INTERVAL_MS);

    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
      window.clearInterval(timer);
    };
  }, [enabled, refresh, urls]);

  return {
    ...state,
    refresh,
  };
}
