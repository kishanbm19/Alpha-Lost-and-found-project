export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-10">
      <h1 className="text-3xl md:text-4xl">{title}</h1>
      {subtitle && (
        <p className="mt-3 font-mono text-sm text-brand-dark/80">{subtitle}</p>
      )}
    </div>
  );
}
