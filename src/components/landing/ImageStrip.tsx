const cards = [
  {
    img: "https://images.unsplash.com/photo-1607863680198-23d4b2565df0?w=700&q=82&auto=format&fit=crop",
    alt: "Kenyan entrepreneur using mobile payment",
    label: "Collections API",
    title: "M-Pesa STK Push to your customers in one API call",
    tall: true,
  },
  {
    img: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=700&q=82&auto=format&fit=crop",
    alt: "Secure digital escrow and payment lock",
    label: "Escrow / Hold API",
    title: "Lock funds until your condition is met",
  },
  {
    img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=700&q=82&auto=format&fit=crop",
    alt: "Payment splitting and automatic disbursement",
    label: "Disbursement API",
    title: "Auto-split to multiple M-Pesa recipients instantly",
  },
  {
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=700&q=82&auto=format&fit=crop",
    alt: "Real time payment analytics dashboard",
    label: "Live Dashboard",
    title: "Complete visibility — every shilling tracked in real time",
  },
];

const ImageStrip = () => (
  <section className="py-20 bg-white">
    <div className="container mx-auto max-w-[1280px] px-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-[240px]">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`group rounded-[18px] overflow-hidden relative shadow-[0_4px_24px_rgba(0,0,0,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_44px_hsl(155_100%_42%/0.14)] ${
              card.tall ? "lg:row-span-2" : ""
            }`}
          >
            <img
              src={card.img}
              alt={card.alt}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(0,30,18,0.68)]" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="text-[0.68rem] font-bold tracking-wider uppercase text-primary mb-1">
                {card.label}
              </div>
              <div className="font-display text-base font-bold text-white leading-tight">
                {card.title}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ImageStrip;
