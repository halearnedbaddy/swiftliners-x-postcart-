import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTA = () => (
  <section id="pricing" className="relative py-24 overflow-hidden">
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1400&q=80')`,
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/95 to-[rgba(0,30,20,0.87)]" />
    <div className="container mx-auto max-w-[1280px] px-8 relative z-10 text-center">
      <div className="flex flex-wrap gap-12 justify-center mb-10">
        {[
          { v: "2.5%", l: "+ KSh 20 per transaction" },
          { v: "<1hr", l: "Sandbox to first live charge" },
          { v: "4", l: "API calls. Full escrow flow." },
        ].map((stat) => (
          <div key={stat.l}>
            <span className="font-display text-4xl font-extrabold text-primary block">{stat.v}</span>
            <span className="text-sm text-white/60">{stat.l}</span>
          </div>
        ))}
      </div>
      <h2 className="font-display text-[clamp(2rem,4vw,3.1rem)] font-extrabold text-white mb-4">
        Ready to Transform Your Marketplace?
      </h2>
      <p className="text-lg text-white/80 max-w-[540px] mx-auto mb-10 leading-relaxed">
        Join 50+ African marketplaces processing millions through PayLoom Instants. Start free, scale effortlessly.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Button
          size="lg"
          className="rounded-[10px] bg-white text-primary-dark font-bold text-base px-9 py-6 hover:translate-y-[-2px] hover:shadow-[0_8px_24px_rgba(255,255,255,0.3)] transition-all"
          asChild
        >
          <Link to="/signup">Get API Access Now <ArrowRight className="ml-1 w-4 h-4" /></Link>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-[10px] bg-transparent text-white border-2 border-white/65 font-semibold text-base px-9 py-6 hover:bg-white/10 hover:border-white transition-all"
        >
          Schedule Demo
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-[10px] bg-transparent text-white border-2 border-white/65 font-semibold text-base px-9 py-6 hover:bg-white/10 hover:border-white transition-all"
        >
          Talk to Sales
        </Button>
      </div>
    </div>
  </section>
);

export default CTA;
