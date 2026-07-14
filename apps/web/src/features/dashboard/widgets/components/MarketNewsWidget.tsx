import { MARKET_NEWS_FIXTURES } from "@/domain/market";

export function MarketNewsWidget() {
  return (
    <div className="tl-noscrollbar flex h-full flex-col overflow-auto">
      {MARKET_NEWS_FIXTURES.map((newsItem) => (
        <div key={newsItem.title} className="border-t border-line py-3 first:border-t-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded-chip bg-accent-soft px-1.75 py-0.5 text-caption font-extrabold text-accent">
              {newsItem.symbol}
            </span>
            <span className="tl-faint">
              {newsItem.source} · {newsItem.publishedAgo}
            </span>
          </div>
          <div className="text-body leading-[1.4] font-medium">{newsItem.title}</div>
        </div>
      ))}
    </div>
  );
}
