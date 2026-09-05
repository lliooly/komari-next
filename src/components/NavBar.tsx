"use client";

import LanguageSwitch from "./Language";
import LoginDialog from "./Login";
import ThemeSwitcher from "./ThemeSwitcher";
import DarkModeToggle from "./DarkModeToggle";
import SpaLink from "./SpaLink";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { dispatchOpenRemainingValueCalculatorEvent } from "@/lib/remainingValueEvents";
import { useEffect, useState } from "react";

function getSupportedLogoUrl(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  try {
    const url = new URL(
      trimmedValue,
      typeof window === "undefined" ? "http://localhost" : window.location.origin
    );

    return url.protocol === "http:" || url.protocol === "https:"
      ? trimmedValue
      : "";
  } catch {
    return "";
  }
}

const NavBar = () => {
  const { publicInfo } = usePublicInfo();
  const { guestDisplay, managedThemeSettings } = useTheme();
  const { t } = useTranslation();
  const logoUrl = getSupportedLogoUrl(managedThemeSettings.logoUrl);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoUrl]);

  const showCustomLogo = Boolean(logoUrl) && !logoLoadFailed;

  return (
    <nav className="w-full bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-all duration-300 shadow-sm">
      <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-2">
          <SpaLink href="/" className="flex items-center gap-3 hover:opacity-80 transition-all">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-primary/20">
              {showCustomLogo ? (
                <img
                  src={logoUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full rounded-lg object-contain"
                  draggable={false}
                  onError={() => setLogoLoadFailed(true)}
                />
              ) : (
                <span className="text-primary-foreground font-bold text-xl" aria-hidden="true">
                  K
                </span>
              )}
            </div>
            <span className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {publicInfo?.sitename}
            </span>
          </SpaLink>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <ThemeSwitcher />
          {guestDisplay.showPrice && guestDisplay.showExpiredAt && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={dispatchOpenRemainingValueCalculatorEvent}
            >
              <Calculator className="h-4 w-4" />
              <span className="sr-only">
                {t("remainingValue.title", { defaultValue: "Remaining Value Calculator" })}
              </span>
            </Button>
          )}
          <LanguageSwitch />

          {publicInfo?.private_site ? (
            <LoginDialog
              autoOpen={publicInfo?.private_site}
              info={t('common.private_site')}
              onLoginSuccess={() => { window.location.reload(); }}
            />
          ) : (
            <LoginDialog />
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
