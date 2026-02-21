import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how" },
    { label: "Pricing", href: "#pricing" },
    { label: "About", href: "#about" },
  ];

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 bg-white/96 backdrop-blur-xl border-b border-border transition-shadow duration-300 ${
        scrolled ? "shadow-md" : ""
      }`}
    >
      <div className="container mx-auto max-w-[1280px] px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 font-display text-[1.4rem] font-extrabold text-primary-dark no-underline">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-green-dark text-white font-black text-lg shadow-[0_4px_12px_hsl(155_100%_42%/0.3)]">
              P
            </div>
            PayLoom Instants
          </a>

          {/* Links */}
          <div className="hidden md:flex gap-10">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative text-muted-foreground font-medium text-[0.93rem] no-underline transition-colors hover:text-primary-dark after:absolute after:bottom-[-3px] after:left-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-lg font-semibold" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button className="rounded-lg bg-gradient-to-br from-primary to-green-dark text-white font-semibold shadow-[0_4px_14px_hsl(155_100%_42%/0.25)] hover:translate-y-[-2px] hover:shadow-[0_8px_22px_hsl(155_100%_42%/0.35)] transition-all" asChild>
              <Link to="/signup">Get Started Free →</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
