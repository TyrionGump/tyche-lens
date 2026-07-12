interface ComparedSymbolChipProps {
  symbol: string;
  title: string;
  onRemove: () => void;
}

export function ComparedSymbolChip({ symbol, title, onRemove }: ComparedSymbolChipProps) {
  return (
    <button
      type="button"
      className="inline-flex flex-none animate-[chipIn_0.18s_cubic-bezier(0.2,0.7,0.3,1)] cursor-pointer items-center gap-1.25 rounded-full border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-accent-soft px-2.75 py-1 text-label font-bold text-accent transition-colors duration-120 hover:border-down hover:bg-[color-mix(in_srgb,var(--down)_10%,transparent)] hover:text-down"
      title={title}
      onClick={onRemove}
    >
      {symbol} <span className="font-extrabold opacity-55">×</span>
    </button>
  );
}
