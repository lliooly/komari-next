"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { EMPTY_ANNOUNCEMENT, readAnnouncement, type Announcement } from "@/lib/announcement";

const Context = createContext<{
  announcement: Announcement;
  loaded: boolean;
  now: number;
  accept: (value: Announcement) => void;
} | undefined>(undefined);

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const [announcement, setAnnouncement] = useState(EMPTY_ANNOUNCEMENT);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(0);
  const revision = useRef(0);
  const accept = useCallback((value: Announcement) => {
    revision.current++;
    setAnnouncement(value);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let disposed = false;
    let request: AbortController | undefined;
    const refresh = async () => {
      if (document.hidden || request) return;
      const version = revision.current;
      const controller = new AbortController();
      request = controller;
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch("/api/public", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!disposed && version === revision.current && data?.data) {
          setAnnouncement(readAnnouncement(data.data.theme_settings));
          setLoaded(true);
        }
      } catch { /* Keep the last known announcement during a temporary outage. */ }
      finally { window.clearTimeout(timeout); request = undefined; }
    };
    const resume = () => { setNow(Date.now()); void refresh(); };
    resume();
    const poll = window.setInterval(refresh, 30000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    return () => {
      disposed = true;
      request?.abort();
      window.clearInterval(poll);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
    };
  }, []);

  return <Context.Provider value={{ announcement, loaded, now, accept }}>{children}</Context.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnnouncement() {
  const value = useContext(Context);
  if (!value) throw new Error("useAnnouncement requires AnnouncementProvider");
  return value;
}
