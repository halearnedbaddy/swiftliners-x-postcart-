const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="text-center">
      <h2 className="font-display text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-white/40 text-sm">This section is coming soon.</p>
    </div>
  </div>
);

export default PlaceholderPage;
