import { motion } from "framer-motion";

const steps = [
  {
    num: "1",
    tag: "Collections API · /charge",
    title: "Buyers Load Wallets",
    desc: "Customers pay via M-Pesa STK Push, Airtel Money or card. Our platform auto-detects the provider from the phone prefix and routes invisibly. Instant webhook confirmation fires to your server.",
    checks: [
      "0712xxx → M-Pesa Daraja STK Push",
      "0733xxx → Airtel Money Collections",
      "Card numbers → Flutterwave Charge",
      "Webhook confirmation in under 2 seconds",
    ],
    img: "https://images.unsplash.com/photo-1616077168712-fc6c788db4af?w=800&q=82&auto=format&fit=crop",
    alt: "Customer paying with M-Pesa on smartphone",
    reverse: false,
  },
  {
    num: "2",
    tag: "Escrow API · /hold + /condition",
    title: "Smart Auto-Split in Escrow",
    desc: "Funds lock instantly against a hold ID. Define your release condition — buyer approval, delivery confirmation, timer expiry, or a webhook from your own server.",
    checks: [
      "Hold created in milliseconds",
      "Configurable hold expiry timers",
      "Visual condition builder — no code",
      "Full audit log of every condition event",
    ],
    img: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&q=82&auto=format&fit=crop",
    alt: "Secure escrow holds funds safely",
    reverse: true,
  },
  {
    num: "3",
    tag: "Disbursement API · /disburse",
    title: "Instant Seller Payouts",
    desc: "When the condition is met, disbursement fires automatically. Split percentages hit multiple M-Pesa wallets within seconds. Your platform fee is deducted silently.",
    checks: [
      "Multi-party M-Pesa B2C payouts simultaneously",
      "Splits must sum to exactly 100%",
      "Auto-generated PDF receipts per disbursement",
      "Your 2.5% + KSh 20 fee deducted automatically",
    ],
    img: "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&q=82&auto=format&fit=crop",
    alt: "Instant M-Pesa payout to seller",
    reverse: false,
  },
];

const HowItWorks = () => (
  <section id="how" className="py-24 bg-white">
    <div className="container mx-auto max-w-[1280px] px-8">
      <div className="text-center max-w-[640px] mx-auto mb-16">
        <div className="inline-block bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-sm font-semibold text-primary-dark mb-4">
          Simple &amp; Powerful
        </div>
        <h2 className="font-display text-[clamp(1.9rem,3.2vw,2.9rem)] font-extrabold text-ink-deep mb-4 leading-tight">
          Three Steps to Payment Freedom
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Complexity hidden. Reliability guaranteed. Revenue flowing automatically.
        </p>
      </div>

      <div className="flex flex-col gap-[72px]">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            viewport={{ once: true, margin: "-36px" }}
            className={`grid grid-cols-1 lg:grid-cols-2 gap-20 items-center ${
              step.reverse ? "lg:[direction:rtl]" : ""
            }`}
          >
            <div className={`rounded-[20px] overflow-hidden relative shadow-[0_12px_44px_hsl(155_100%_42%/0.14)] aspect-[4/3] ${step.reverse ? "lg:[direction:ltr]" : ""}`}>
              <img src={step.img} alt={step.alt} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <div className="absolute top-[18px] left-[18px] w-[46px] h-[46px] rounded-xl bg-gradient-to-br from-primary to-green-dark flex items-center justify-center font-display text-xl font-extrabold text-white shadow-[0_4px_14px_hsl(155_100%_42%/0.35)]">
                {step.num}
              </div>
            </div>
            <div className={step.reverse ? "lg:[direction:ltr]" : ""}>
              <div className="text-xs font-bold tracking-wider uppercase text-primary mb-3">
                {step.tag}
              </div>
              <h3 className="font-display text-[1.95rem] font-extrabold text-ink-deep mb-4 leading-tight">
                {step.title}
              </h3>
              <p className="text-base text-muted-foreground leading-relaxed mb-6">
                {step.desc}
              </p>
              <div className="flex flex-col gap-2.5">
                {step.checks.map((check, j) => (
                  <div key={j} className="flex items-start gap-2.5 text-sm text-foreground">
                    <div className="w-[19px] h-[19px] rounded-full bg-gradient-to-br from-primary to-green-dark flex items-center justify-center text-white text-[9px] flex-shrink-0 mt-0.5">
                      ✓
                    </div>
                    {check}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
