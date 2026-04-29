import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { PLATFORM_CONFIGS } from "@/lib/platforms";

export const Footer = () => (
  <footer className="border-t bg-secondary/30">
    <div className="container py-12">
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logo}
              alt="MDounloader logo"
              width={36}
              height={36}
              loading="lazy"
              className="h-9 w-9 rounded-xl shadow-elegant"
            />
            <span className="text-lg font-bold">MDounloader</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            A multi-platform downloader for public TikTok, Instagram, Facebook, YouTube, X, LinkedIn, and TinyURL workflows.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Platforms</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {PLATFORM_CONFIGS.map((platform) => (
              <li key={platform.key}>
                <Link to={platform.route} className="hover:text-foreground">
                  {platform.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li><Link to="/pro" className="hover:text-foreground">Pro</Link></li>
            <li><Link to="/auth" className="hover:text-foreground">Account</Link></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
        <p>Copyright {new Date().getFullYear()} MDounloader. Public links only.</p>
        <p>Built for quick, direct downloads.</p>
      </div>
    </div>
  </footer>
);
