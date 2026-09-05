import type { Metadata } from "next";
import "@/global.css";
import { Providers } from "@/components/providers";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import RemainingValueCalculator from "@/components/RemainingValueCalculator";
import AnnouncementBanner from "@/components/AnnouncementBanner";

export const metadata: Metadata = {
  title: "Komari Monitor",
  description: "A simple server monitor tool.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col transition-colors duration-300">
        <Providers>
          <header className="sticky top-0 z-50 w-full shrink-0 px-3 pt-3 sm:px-4">
            <div className="container mx-auto flex flex-col gap-3">
              <NavBar />
              <AnnouncementBanner />
            </div>
          </header>
          <main className="flex-1 py-4 md:py-12">
            {children}
          </main>
          <Footer />
          <RemainingValueCalculator />
        </Providers>
      </body>
    </html>
  );
}
