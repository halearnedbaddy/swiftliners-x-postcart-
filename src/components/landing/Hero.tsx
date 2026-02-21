import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#edfff7] via-white to-white pt-[130px] pb-20">
      {/* Blobs */}
      <div className="absolute -top-[120px] -right-[160px] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,hsl(155_100%_42%/0.11)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,hsl(155_100%_42%/0.06)_0%,transparent_70%)] pointer-events-none" />

      <div className="container mx-auto max-w-[1280px] px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-sm font-semibold text-primary-dark mb-6"
            >
              <span className="w-[7px] h-[7px] rounded-full bg-primary animate-[livepulse_2s_infinite]" />
              M-Pesa · Airtel · Cards — One Unified API
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="font-display text-[clamp(2.8rem,4.5vw,4.5rem)] leading-[1.06] font-extrabold text-ink-deep mb-5"
            >
              <span className="bg-gradient-to-br from-primary to-green-dark bg-clip-text text-transparent">
                Instant Payments.
              </span>
              <br />
              Automatic Splits.
              <br />
              Zero Headaches.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-lg text-muted-foreground leading-relaxed max-w-[510px] mb-10"
            >
              The escrow payment infrastructure East African marketplaces trust.
              Collect, hold funds until conditions are met, then disburse
              automatically to multiple parties in seconds.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45 }}
              className="flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                className="rounded-[10px] bg-gradient-to-br from-primary to-green-dark text-white font-semibold text-base px-9 py-6 shadow-[0_4px_14px_hsl(155_100%_42%/0.25)] hover:translate-y-[-2px] hover:shadow-[0_8px_22px_hsl(155_100%_42%/0.35)] transition-all"
                asChild
              >
                <Link to="/signup">Start Building Free <ArrowRight className="ml-1 w-4 h-4" /></Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="rounded-[10px] font-semibold text-base px-9 py-6"
              >
                <Play className="mr-1 w-4 h-4" /> Watch Demo
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="flex flex-wrap gap-10 mt-14 pt-10 border-t border-border"
            >
              {[
                { n: "KES 2M+", l: "Processed Monthly" },
                { n: "99.9%", l: "Uptime SLA" },
                { n: "<2s", l: "Avg Response Time" },
              ].map((stat) => (
                <div key={stat.l}>
                  <span className="font-display text-[2.1rem] font-extrabold text-primary block">
                    {stat.n}
                  </span>
                  <span className="text-sm text-muted-foreground">{stat.l}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 26 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            {/* Floating chips */}
            <div className="absolute -top-4 right-7 z-20 bg-white rounded-xl px-3 py-2 shadow-[0_8px_26px_rgba(0,0,0,0.11)] flex items-center gap-2 animate-[float-up_4s_ease-in-out_infinite]">
              <span className="w-[7px] h-[7px] rounded-full bg-primary flex-shrink-0" />
              <div>
                <div className="font-display text-sm font-extrabold text-ink-deep">KSh 50,000</div>
                <div className="text-[0.7rem] text-muted-foreground">Held in Escrow ✓</div>
              </div>
            </div>
            <div className="absolute top-1/2 -right-7 z-20 -translate-y-1/2 bg-white rounded-xl px-3 py-2 shadow-[0_8px_26px_rgba(0,0,0,0.11)] flex items-center gap-2 animate-[float-up_4s_1.2s_ease-in-out_infinite]">
              <span className="w-[7px] h-[7px] rounded-full bg-gold flex-shrink-0" />
              <div>
                <div className="font-display text-sm font-extrabold text-ink-deep">Auto-split sent</div>
                <div className="text-[0.7rem] text-muted-foreground">85% Seller · 15% Platform</div>
              </div>
            </div>

            <div className="rounded-[22px] overflow-hidden shadow-[0_28px_70px_rgba(0,61,41,0.16)] aspect-[4/3] relative">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=85&auto=format&fit=crop"
                alt="Business woman making a mobile payment"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary-dark/50" />
              <div className="absolute bottom-[18px] left-[18px] bg-white rounded-[14px] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.13)] flex items-center gap-3">
                <div className="w-[38px] h-[38px] bg-primary/10 rounded-[9px] flex items-center justify-center text-lg">
                  💸
                </div>
                <div>
                  <div className="font-display text-xl font-extrabold text-ink-deep">KSh 847K</div>
                  <div className="text-xs text-muted-foreground">Collected this month</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
