"use client";

import { Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAnnouncement } from "@/contexts/AnnouncementContext";
import { announcementStatus } from "@/lib/announcement";
import AnnouncementMarkdown from "./AnnouncementMarkdown";

export default function AnnouncementBanner() {
  const { announcement, loaded, now } = useAnnouncement();
  const { t } = useTranslation();
  const visible = loaded && now > 0 && announcementStatus(announcement, now) === "active";
  return (
    <div aria-live="polite" aria-atomic="true">
      {visible && <section aria-label={t("announcement.title")} className="announcement-banner">
        <div className="container mx-auto flex gap-3 px-4 py-3">
          <Megaphone className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="announcement-scroll min-w-0 flex-1 overflow-auto overscroll-contain" tabIndex={0} role="region" aria-label={t("announcement.content")}>
            <AnnouncementMarkdown content={announcement.content} />
          </div>
        </div>
      </section>}
    </div>
  );
}
