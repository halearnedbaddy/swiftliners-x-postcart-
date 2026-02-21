import { motion } from "framer-motion";

const features = [
  {
    img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80&auto=format&fit=crop",
    icon: "⚡",
    title: "Lightning Integration",
    desc: "Go live in under 30 minutes with our simple REST API. No payment engineering team required — clean endpoints and clear docs.",
    link: "View API Docs →",
  },
  {
    img: "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=600&q=80&auto=format&fit=crop",
    icon: "💰",
    title: "Automatic Splits",
    desc: "Every transaction automatically divides — platform fee to you, earnings to sellers. Atomic, accurate, auditable every time.",
    link: "See How It Works →",
  },
  {
    img: "https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=600&q=80&auto=format&fit=crop",
    icon: "📱",
    title: "M-Pesa Native",
    desc: "Built for Africa. M-Pesa isn't an afterthought — it's our foundation. STK Push, instant confirmations, B2C payouts baked in.",
    link: "Learn More →",
  },
  {
    img: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80&auto=format&fit=crop",
    icon: "🔒",
    title: "Bank-Grade Security",
    desc: "ACID-compliant transactions, bcrypt API keys, 2FA on live key reveal, Redis rate limiting, IP whitelisting and full audit trails.",
    link: "Security Details →",
  },
  {
    img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80&auto=format&fit=crop",
    icon: "📊",
    title: "Real-Time Dashboards",
    desc: "Live GMV, escrow balances, webhook logs and CSV exports. Complete visibility for buyers, sellers and admins in one interface.",
    link: "Explore Dashboard →",
  },
  {
    img: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&q=80&auto=format&fit=crop",
    icon: "🚀",
    title: "Scale Confidently",
    desc: "From 10 to 100,000 daily transactions. Progressive API unlock ensures proper integration at every stage before real money flows.",
    link: "Read Case Studies →",
  },
];

const Features = () => (
  <section id="features" className="py-24 bg-secondary">
    <div className="container mx-auto max-w-[1280px] px-8">
      <div className="text-center max-w-[640px] mx-auto mb-16">
        <div className="inline-block bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-sm font-semibold text-primary-dark mb-4">
          Why PayLoom Instants
        </div>
        <h2 className="font-display text-[clamp(1.9rem,3.2vw,2.9rem)] font-extrabold text-ink-deep mb-4 leading-tight">
          Everything Your Marketplace Needs to Scale
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          From your first transaction to your millionth — collect, hold, split and
          disburse with four clean API calls.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: i * 0.08 }}
            viewport={{ once: true, margin: "-36px" }}
            className="group bg-white border border-border rounded-[18px] overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_44px_hsl(155_100%_42%/0.14)] hover:border-primary/30 relative after:absolute after:top-0 after:left-0 after:right-0 after:h-[3px] after:bg-gradient-to-r after:from-primary after:to-green-dark after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100"
          >
            <div className="h-[172px] overflow-hidden relative">
              <img
                src={feat.img}
                alt={feat.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/10" />
              <div className="absolute -bottom-5 left-5 w-[42px] h-[42px] rounded-[11px] bg-white border-[1.5px] border-border flex items-center justify-center text-xl shadow-[0_4px_12px_rgba(0,0,0,0.09)]">
                {feat.icon}
              </div>
            </div>
            <div className="p-6 pt-8 pb-7">
              <h3 className="font-display text-lg font-bold text-ink-deep mb-2">
                {feat.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                {feat.desc}
              </p>
              <a
                href="#"
                className="text-primary font-semibold text-sm inline-flex items-center gap-1 transition-[gap] hover:gap-2"
              >
                {feat.link}
              </a>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
