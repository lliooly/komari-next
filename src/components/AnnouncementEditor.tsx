"use client";

import { useState } from "react";
import { Megaphone, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { useAnnouncement } from "@/contexts/AnnouncementContext";
import { announcementStatus, localDateTime, type Announcement } from "@/lib/announcement";
import { updateThemeSettings } from "@/lib/themeSettings";
import AnnouncementMarkdown from "./AnnouncementMarkdown";

function EditorForm() {
  const { announcement, accept, now } = useAnnouncement();
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(announcement.enabled);
  const [content, setContent] = useState(announcement.content);
  const [start, setStart] = useState(localDateTime(announcement.startsAt));
  const [end, setEnd] = useState(localDateTime(announcement.endsAt));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const save = async (disable = false) => {
    setError("");
    setMessage("");
    const starts = new Date(start).getTime();
    const ends = new Date(end).getTime();
    if (!disable && enabled && (!content.trim() || !Number.isFinite(starts) || !Number.isFinite(ends) || ends <= starts || ends <= Date.now())) {
      setError(t("announcement.validation"));
      return;
    }
    const value: Announcement = disable ? { ...announcement, enabled: false } : {
      enabled, content: content.trim(),
      startsAt: Number.isFinite(starts) ? new Date(starts).toISOString() : "",
      endsAt: Number.isFinite(ends) ? new Date(ends).toISOString() : "",
    };
    setSaving(true);
    try {
      await updateThemeSettings((current) => ({
        ...Object.fromEntries(Object.entries(current).filter(([key]) => key !== "announcement" && !key.startsWith("announcement."))),
        announcement: value,
      }));
      accept(value);
      if (disable) setEnabled(false);
      setMessage(t("announcement.saved"));
    } catch { setError(t("announcement.saveFailed")); }
    finally { setSaving(false); }
  };

  return <form className="min-w-0 space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <p className="text-sm text-muted-foreground">{t("announcement.statusLabel")}: {t(`announcement.status.${announcementStatus(announcement, now)}`)}</p>
    <fieldset disabled={saving} className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="announcement-enabled">{t("announcement.enabled")}</label>
        <Switch id="announcement-enabled" checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className="space-y-2">
        <label htmlFor="announcement-content">{t("announcement.content")}</label>
        <Textarea id="announcement-content" value={content} onChange={(e) => setContent(e.target.value)} className="min-w-0 min-h-32 max-h-64 resize-y field-sizing-fixed font-mono" />
        <p className="text-xs text-muted-foreground">{t("announcement.markdownHelp")}</p>
      </div>
      <p className="text-sm text-muted-foreground">{t("announcement.timezone", { timezone })}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-2"><label htmlFor="announcement-start">{t("announcement.startsAt")}</label><Input id="announcement-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="min-w-0 space-y-2"><label htmlFor="announcement-end">{t("announcement.endsAt")}</label><Input id="announcement-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">{t("announcement.preview")}</h3>
        <div className="announcement-banner rounded-lg p-3">
          <div className="announcement-scroll overflow-auto" tabIndex={0} role="region" aria-label={t("announcement.preview")}>
            {content.trim() ? <AnnouncementMarkdown content={content} /> : <p className="text-sm">{t("announcement.previewEmpty")}</p>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving} aria-busy={saving}><Save className="h-4 w-4" aria-hidden="true" />{t(saving ? "announcement.saving" : "announcement.save")}</Button>
        <Button type="button" variant="outline" disabled={saving || !announcement.enabled} onClick={() => void save(true)}>{t("announcement.disableNow")}</Button>
      </div>
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <p role="status" className="text-sm text-muted-foreground">{message}</p>
  </form>;
}

export default function AnnouncementEditor() {
  const { isThemeSettingsAdmin } = useTheme();
  const { loaded } = useAnnouncement();
  const { t } = useTranslation();
  if (!isThemeSettingsAdmin) return null;
  return <Dialog>
    <DialogTrigger asChild><Button type="button" variant="outline" className="w-full justify-start" disabled={!loaded}><Megaphone className="h-4 w-4" aria-hidden="true" />{t("announcement.manage")}</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl grid-cols-1 overflow-y-auto">
      <DialogTitle>{t("announcement.manage")}</DialogTitle>
      <DialogDescription>{t("announcement.description")}</DialogDescription>
      <EditorForm />
    </DialogContent>
  </Dialog>;
}
