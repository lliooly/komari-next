import { Github, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background/70 backdrop-blur-sm">
      <div className="container mx-auto flex flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row">
        <a
          href="https://github.com/tonyliuzj/komari-next"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 transition-colors hover:text-primary"
          aria-label="Komari-Next on GitHub"
        >
          <span>Powered by</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Komari-Next</span>
          </span>
        </a>

        <div className="inline-flex items-center gap-1">
          <span>Made with</span>
          <Heart
            className="h-3 w-3 fill-current text-red-500"
            aria-hidden="true"
          />
          <span>for Komari</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
