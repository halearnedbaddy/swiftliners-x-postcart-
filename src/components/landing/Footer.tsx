const footerCols = [
  {
    title: "Product",
    links: ["Collections API", "Escrow API", "Disbursement API", "Documentation", "API Status"],
  },
  {
    title: "Company",
    links: ["About Us", "Careers", "Blog", "Press Kit", "Contact"],
  },
  {
    title: "Resources",
    links: ["Help Center", "Case Studies", "Guides", "Community", "Changelog"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Security", "Compliance"],
  },
];

const Footer = () => (
  <footer className="bg-ink-deep pt-[68px] pb-8 text-white">
    <div className="container mx-auto max-w-[1280px] px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-14 mb-16">
        <div>
          <div className="flex items-center gap-2 font-display text-xl font-extrabold mb-4">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-green-dark text-white font-black text-lg shadow-[0_4px_12px_hsl(155_100%_42%/0.3)]">
              P
            </div>
            PayLoom Instants
          </div>
          <p className="text-white/50 leading-relaxed text-sm mb-7 max-w-xs">
            Enterprise escrow payment infrastructure for East African marketplaces.
            Collect. Hold. Split. Disburse. Built on M-Pesa, trusted by founders across Africa.
          </p>
          <div className="flex gap-3">
            {["𝕏", "in", "f", "ig"].map((social) => (
              <a
                key={social}
                href="#"
                className="w-9 h-9 bg-white/8 rounded-lg flex items-center justify-center text-white/65 text-sm transition-all hover:bg-primary hover:text-white hover:-translate-y-0.5"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
        {footerCols.map((col) => (
          <div key={col.title}>
            <h5 className="font-display text-sm font-bold mb-4">{col.title}</h5>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-white/50 text-sm hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/8 pt-7 flex flex-col sm:flex-row justify-between items-center text-white/40 text-sm gap-3">
        <div>© 2026 PayLoom Instants. All rights reserved.</div>
        <div>Built with conviction for East African commerce 🌍</div>
      </div>
    </div>
  </footer>
);

export default Footer;
