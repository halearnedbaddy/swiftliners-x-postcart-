const items = [
  { icon: "📱", label: "Safaricom M-Pesa" },
  { icon: "🔴", label: "Airtel Money" },
  { icon: "💳", label: "Visa / Mastercard" },
  { icon: "🔒", label: "Bank-Grade Security" },
  { icon: "⚡", label: "Real-Time Webhooks" },
];

const TrustBar = () => (
  <section className="bg-ink-deep py-7">
    <div className="container mx-auto max-w-[1280px] px-8">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          Powered by trusted infrastructure
        </span>
        <div className="flex flex-wrap items-center gap-9">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-white/70 font-semibold text-sm">
              <div className="w-7 h-7 bg-primary/15 border border-primary/20 rounded-md flex items-center justify-center text-sm">
                {item.icon}
              </div>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default TrustBar;
