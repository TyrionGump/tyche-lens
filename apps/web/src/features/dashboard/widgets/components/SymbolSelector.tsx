import { MARKET_QUOTE_FIXTURES } from "@/domain/market/index.ts";

const AVAILABLE_SYMBOLS = Object.keys(MARKET_QUOTE_FIXTURES).sort();

interface SymbolSelectorProps {
  value: string;
  onChange: (symbol: string) => void;
}

export function SymbolSelector({ value, onChange }: SymbolSelectorProps) {
  return (
    <select
      aria-label="Market symbol"
      className="cursor-pointer rounded-control border border-border bg-bg px-2 py-1.25 text-body font-bold text-ink"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {AVAILABLE_SYMBOLS.map((symbol) => (
        <option key={symbol} value={symbol}>
          {symbol}
        </option>
      ))}
    </select>
  );
}
