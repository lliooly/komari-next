import { getSettings, updateSettings } from "./api";
import { parseSettings } from "./announcement";

// Serialize writes from the theme controls and announcement editor in this tab.
// Always merge against the server so editing one section preserves the others.
let queue: Promise<unknown> = Promise.resolve();
export function updateThemeSettings(update: (current: Record<string, unknown>) => Record<string, unknown>): Promise<void> {
  const save = queue.catch(() => {}).then(async () => {
    const settings = await getSettings();
    await updateSettings({ theme_settings: update(parseSettings(settings.theme_settings)) });
  });
  queue = save;
  return save;
}
