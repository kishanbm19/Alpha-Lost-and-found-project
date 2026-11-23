export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
        <div>
          <p className="font-mono text-sm font-bold">Alpha Lost &amp; Found</p>
          <p className="mt-1 font-mono text-xs text-white/70">
            © {new Date().getFullYear()} Alpha Lost &amp; Found. All rights reserved.
          </p>
        </div>
        <p className="text-sm text-white/80">
          Helping students reconnect with their lost belongings
        </p>
      </div>
    </footer>
  );
}
