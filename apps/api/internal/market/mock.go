package market

import (
	"slices"
	"strings"
	"time"
)

// Mock serves the deterministic sample catalog below. Figures mirror
// tyche-ui's src/data/market.ts so both screens agree while the
// dashboard still runs on its local copy.
type Mock struct {
	now      func() time.Time
	listings []Listing
}

func NewMock(now func() time.Time) *Mock {
	listings := make([]Listing, 0, len(catalog))
	for symbol, row := range catalog {
		listings = append(listings, Listing{
			Symbol:   symbol,
			Name:     row.name,
			Exchange: row.exchange,
			Sector:   row.sector,
		})
	}
	slices.SortFunc(listings, func(a, b Listing) int {
		return strings.Compare(a.Symbol, b.Symbol)
	})
	return &Mock{now: now, listings: listings}
}

func (m *Mock) Quote(symbol string) (Quote, bool) {
	row, ok := catalog[symbol]
	if !ok {
		return Quote{}, false
	}
	return Quote{
		Symbol:     symbol,
		Name:       row.name,
		Exchange:   row.exchange,
		Sector:     row.sector,
		Price:      row.price,
		ChangePct:  row.changePct,
		ChangeAbs:  row.changeAbs,
		Open:       row.open,
		High:       row.high,
		Low:        row.low,
		PrevClose:  row.prevClose,
		MarketCap:  row.marketCap,
		Volume:     row.volume,
		Week52High: row.week52High,
		Week52Low:  row.week52Low,
		PERatio:    ptr(row.peRatio),
		EPS:        ptr(row.eps),
		DivYield:   ptr(row.divYield),
		Beta:       ptr(row.beta),
		AsOf:       m.now(),
	}, true
}

// Search returns listings whose symbol or name contains query
// (case-insensitive), sorted by symbol, at most limit. An empty or
// whitespace-only query matches everything. A negative limit is treated
// as zero (returns no matches) rather than panicking on make.
func (m *Mock) Search(query string, limit int) []Listing {
	if limit < 0 {
		limit = 0
	}
	q := strings.ToLower(strings.TrimSpace(query))
	matches := make([]Listing, 0, limit)
	for _, listing := range m.listings {
		if len(matches) == limit {
			break
		}
		if q == "" ||
			strings.Contains(strings.ToLower(listing.Symbol), q) ||
			strings.Contains(strings.ToLower(listing.Name), q) {
			matches = append(matches, listing)
		}
	}
	return matches
}

func ptr(v float64) *float64 { return &v }

type company struct {
	name, exchange, sector                   string
	price, changePct, changeAbs              float64
	open, high, low, prevClose               float64
	marketCap, volume, week52High, week52Low float64
	peRatio, eps, divYield, beta             float64
}

var catalog = map[string]company{
	"AAPL": {
		name: "Apple Inc.", exchange: "NASDAQ", sector: "Technology",
		price: 214.52, changePct: 1.24, changeAbs: 2.63,
		open: 212.10, high: 215.30, low: 211.75, prevClose: 211.89,
		marketCap: 3.28e12, volume: 48.2e6, week52High: 237.49, week52Low: 164.08,
		peRatio: 33.1, eps: 6.48, divYield: 0.44, beta: 1.10,
	},
	"NVDA": {
		name: "NVIDIA Corporation", exchange: "NASDAQ", sector: "Semiconductors",
		price: 172.18, changePct: 3.41, changeAbs: 5.68,
		open: 167.40, high: 173.90, low: 166.20, prevClose: 166.50,
		marketCap: 4.21e12, volume: 212.6e6, week52High: 195.95, week52Low: 86.62,
		peRatio: 51.8, eps: 3.32, divYield: 0.02, beta: 1.66,
	},
	"TSLA": {
		name: "Tesla, Inc.", exchange: "NASDAQ", sector: "Automotive",
		price: 342.69, changePct: -2.07, changeAbs: -7.24,
		open: 351.00, high: 352.80, low: 339.90, prevClose: 349.93,
		marketCap: 1.10e12, volume: 98.1e6, week52High: 488.54, week52Low: 182.00,
		peRatio: 71.4, eps: 4.80, divYield: 0.0, beta: 2.31,
	},
	"MSFT": {
		name: "Microsoft Corp.", exchange: "NASDAQ", sector: "Technology",
		price: 478.30, changePct: 0.62, changeAbs: 2.95,
		open: 476.00, high: 479.50, low: 475.20, prevClose: 475.35,
		marketCap: 3.55e12, volume: 19.8e6, week52High: 498.10, week52Low: 344.79,
		peRatio: 38.2, eps: 12.52, divYield: 0.66, beta: 0.90,
	},
	"AMZN": {
		name: "Amazon.com Inc.", exchange: "NASDAQ", sector: "Consumer",
		price: 219.84, changePct: 1.05, changeAbs: 2.28,
		open: 217.90, high: 220.60, low: 217.10, prevClose: 217.56,
		marketCap: 2.31e12, volume: 36.4e6, week52High: 242.52, week52Low: 151.61,
		peRatio: 41.0, eps: 5.36, divYield: 0.0, beta: 1.15,
	},
	"GOOGL": {
		name: "Alphabet Inc.", exchange: "NASDAQ", sector: "Technology",
		price: 196.44, changePct: 0.88, changeAbs: 1.71,
		open: 194.80, high: 197.20, low: 194.10, prevClose: 194.73,
		marketCap: 2.42e12, volume: 27.9e6, week52High: 207.05, week52Low: 142.66,
		peRatio: 24.6, eps: 7.98, divYield: 0.41, beta: 1.03,
	},
	"META": {
		name: "Meta Platforms", exchange: "NASDAQ", sector: "Technology",
		price: 742.15, changePct: 1.94, changeAbs: 14.12,
		open: 729.50, high: 745.80, low: 727.40, prevClose: 728.03,
		marketCap: 1.88e12, volume: 14.6e6, week52High: 762.40, week52Low: 442.65,
		peRatio: 28.4, eps: 26.13, divYield: 0.28, beta: 1.21,
	},
	"AMD": {
		name: "Advanced Micro Devices", exchange: "NASDAQ", sector: "Semiconductors",
		price: 138.62, changePct: 2.36, changeAbs: 3.20,
		open: 135.90, high: 139.40, low: 135.10, prevClose: 135.42,
		marketCap: 224.5e9, volume: 41.3e6, week52High: 187.28, week52Low: 76.48,
		peRatio: 46.2, eps: 3.00, divYield: 0.0, beta: 1.71,
	},
	"AVGO": {
		name: "Broadcom Inc.", exchange: "NASDAQ", sector: "Semiconductors",
		price: 268.90, changePct: 1.62, changeAbs: 4.29,
		open: 265.30, high: 270.10, low: 264.70, prevClose: 264.61,
		marketCap: 1.26e12, volume: 18.7e6, week52High: 281.10, week52Low: 128.50,
		peRatio: 39.5, eps: 6.81, divYield: 0.88, beta: 1.18,
	},
	"NFLX": {
		name: "Netflix, Inc.", exchange: "NASDAQ", sector: "Communication",
		price: 1184.20, changePct: -0.54, changeAbs: -6.43,
		open: 1192.00, high: 1198.50, low: 1178.60, prevClose: 1190.63,
		marketCap: 503.8e9, volume: 2.8e6, week52High: 1262.92, week52Low: 587.04,
		peRatio: 49.7, eps: 23.84, divYield: 0.0, beta: 1.25,
	},
	"JPM": {
		name: "JPMorgan Chase", exchange: "NYSE", sector: "Financials",
		price: 284.36, changePct: 0.34, changeAbs: 0.96,
		open: 283.20, high: 285.60, low: 282.40, prevClose: 283.40,
		marketCap: 792.6e9, volume: 8.4e6, week52High: 296.40, week52Low: 190.88,
		peRatio: 13.9, eps: 20.46, divYield: 1.97, beta: 1.05,
	},
	"V": {
		name: "Visa Inc.", exchange: "NYSE", sector: "Financials",
		price: 362.48, changePct: -0.18, changeAbs: -0.65,
		open: 363.50, high: 364.90, low: 361.20, prevClose: 363.13,
		marketCap: 702.3e9, volume: 5.1e6, week52High: 375.51, week52Low: 252.70,
		peRatio: 32.7, eps: 11.08, divYield: 0.65, beta: 0.95,
	},
	"XOM": {
		name: "Exxon Mobil", exchange: "NYSE", sector: "Energy",
		price: 118.74, changePct: -1.12, changeAbs: -1.34,
		open: 120.00, high: 120.60, low: 118.20, prevClose: 120.08,
		marketCap: 511.2e9, volume: 14.9e6, week52High: 126.34, week52Low: 97.80,
		peRatio: 14.8, eps: 8.02, divYield: 3.34, beta: 0.88,
	},
	"CVX": {
		name: "Chevron Corp.", exchange: "NYSE", sector: "Energy",
		price: 162.31, changePct: -0.76, changeAbs: -1.24,
		open: 163.60, high: 164.10, low: 161.70, prevClose: 163.55,
		marketCap: 283.7e9, volume: 7.6e6, week52High: 168.96, week52Low: 132.04,
		peRatio: 15.2, eps: 10.68, divYield: 4.12, beta: 0.92,
	},
	"NEE": {
		name: "NextEra Energy", exchange: "NYSE", sector: "Energy",
		price: 78.92, changePct: 1.48, changeAbs: 1.15,
		open: 77.90, high: 79.30, low: 77.50, prevClose: 77.77,
		marketCap: 162.4e9, volume: 9.2e6, week52High: 86.10, week52Low: 61.72,
		peRatio: 22.1, eps: 3.57, divYield: 2.93, beta: 0.61,
	},
	"LLY": {
		name: "Eli Lilly & Co.", exchange: "NYSE", sector: "Healthcare",
		price: 842.60, changePct: 0.92, changeAbs: 7.68,
		open: 836.00, high: 846.30, low: 833.90, prevClose: 834.92,
		marketCap: 798.4e9, volume: 3.1e6, week52High: 972.53, week52Low: 677.09,
		peRatio: 58.6, eps: 14.38, divYield: 0.73, beta: 0.42,
	},
	"COST": {
		name: "Costco Wholesale", exchange: "NASDAQ", sector: "Consumer",
		price: 1012.45, changePct: 0.21, changeAbs: 2.12,
		open: 1009.80, high: 1016.40, low: 1007.20, prevClose: 1010.33,
		marketCap: 449.1e9, volume: 1.7e6, week52High: 1078.24, week52Low: 793.30,
		peRatio: 55.3, eps: 18.31, divYield: 0.51, beta: 0.79,
	},
}
