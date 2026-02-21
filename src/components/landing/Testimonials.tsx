import { motion } from "framer-motion";

const testimonials = [
  {
    img: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80&auto=format&fit=crop",
    quote: "We went from 3 months of payment engineering to live in 2 hours. PayLoom's split logic just works — no edge cases, no surprises.",
    name: "Amani Kimathi",
    role: "Founder, FreshMart Kenya",
    initials: "AK",
  },
  {
    img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80&auto=format&fit=crop",
    quote: "Our sellers love instant M-Pesa payouts. No waiting for manual transfers. PayLoom turned payments from pain into our strongest feature.",
    name: "Blessing Okafor",
    role: "CTO, ServiceHub NG",
    initials: "BO",
  },
  {
    img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80&auto=format&fit=crop",
    quote: "The real-time dashboard gives us complete visibility. We know exactly where every shilling is — crucial for investor confidence and CBK compliance.",
    name: "David Mwangi",
    role: "CEO, AfriTrade Platform",
    initials: "DM",
  },
];

const Testimonials = () => (
  <section className="py-24 bg-secondary">
    <div className="container mx-auto max-w-[1280px] px-8">
      <div className="text-center max-w-[640px] mx-auto mb-16">
        <div className="inline-block bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-sm font-semibold text-primary-dark mb-4">
          Customer Stories
        </div>
        <h2 className="font-display text-[clamp(1.9rem,3.2vw,2.9rem)] font-extrabold text-ink-deep mb-4 leading-tight">
          Trusted by Marketplace Leaders
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          See what founders across East Africa say about PayLoom Instants.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: i * 0.1 }}
            viewport={{ once: true, margin: "-36px" }}
            className="group bg-white border border-border rounded-[18px] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_44px_hsl(155_100%_42%/0.14)] hover:border-primary/20"
          >
            <div className="h-[115px] overflow-hidden relative">
              <img src={t.img} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary-dark/50" />
            </div>
            <div className="p-7">
              <div className="text-gold mb-3">★★★★★</div>
              <p className="text-muted-foreground leading-relaxed mb-5 text-sm italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-green-dark flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {t.initials}
                </div>
                <div>
                  <div className="font-bold text-sm text-ink-deep">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
