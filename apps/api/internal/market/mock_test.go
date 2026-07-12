package market_test

import (
	"testing"
	"time"

	"github.com/TyrionGump/tyche-api/internal/market"
)

func TestMockQuoteKnownSymbol(t *testing.T) {
	now := time.Date(2026, 7, 8, 12, 0, 0, 0, time.UTC)
	m := market.NewMock(func() time.Time { return now })

	got, ok := m.Quote("AAPL")
	if !ok {
		t.Fatal("Quote(AAPL) not found")
	}
	if got.Symbol != "AAPL" || got.Name == "" || got.Exchange == "" || got.Sector == "" {
		t.Errorf("identity fields incomplete: %+v", got)
	}
	if got.Price <= 0 || got.MarketCap <= 0 || got.Volume <= 0 {
		t.Errorf("expected positive price/marketCap/volume: %+v", got)
	}
	if got.Week52Low >= got.Week52High {
		t.Errorf("expected week52Low < week52High: %+v", got)
	}
	if !got.AsOf.Equal(now) {
		t.Errorf("AsOf = %v, want %v", got.AsOf, now)
	}
	if got.PERatio == nil || got.EPS == nil || got.DivYield == nil || got.Beta == nil {
		t.Errorf("expected fundamentals populated: %+v", got)
	}

	again, ok := m.Quote("AAPL")
	if !ok || again.Price != got.Price || again.ChangePct != got.ChangePct {
		t.Errorf("mock quotes must be deterministic: %+v vs %+v", again, got)
	}
}

func TestMockQuoteUnknownSymbol(t *testing.T) {
	m := market.NewMock(time.Now)
	if _, ok := m.Quote("ZZZZ"); ok {
		t.Error("Quote(ZZZZ) expected ok=false")
	}
}

func TestMockCoversUICatalog(t *testing.T) {
	m := market.NewMock(time.Now)
	// The full catalog in tyche-ui's market.ts (default lists draw from it).
	symbols := []string{
		"AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL", "META", "AMD",
		"AVGO", "NFLX", "JPM", "V", "XOM", "CVX", "NEE", "LLY", "COST",
	}
	for _, symbol := range symbols {
		if _, ok := m.Quote(symbol); !ok {
			t.Errorf("Quote(%s) not found", symbol)
		}
	}
}

func TestMockSearchEmptyQueryReturnsSortedCatalog(t *testing.T) {
	m := market.NewMock(time.Now)
	got := m.Search("", 50)
	if len(got) != 17 {
		t.Fatalf("len = %d, want 17", len(got))
	}
	if got[0].Symbol != "AAPL" || got[len(got)-1].Symbol != "XOM" {
		t.Errorf("expected sort by symbol AAPL..XOM, got %s..%s", got[0].Symbol, got[len(got)-1].Symbol)
	}
	for _, l := range got {
		if l.Symbol == "" || l.Name == "" || l.Exchange == "" || l.Sector == "" {
			t.Errorf("incomplete listing: %+v", l)
		}
	}
}

func TestMockSearchMatchesSymbolOrNameCaseInsensitive(t *testing.T) {
	m := market.NewMock(time.Now)

	bySymbol := m.Search("msft", 50) // matches symbol MSFT only (no name contains "msft")
	if len(bySymbol) != 1 || bySymbol[0].Symbol != "MSFT" {
		t.Errorf("Search(msft) = %+v, want [MSFT]", bySymbol)
	}

	byName := m.Search("visa", 50) // matches name "Visa Inc." only
	if len(byName) != 1 || byName[0].Symbol != "V" {
		t.Errorf("Search(visa) = %+v, want [V]", byName)
	}

	if got := m.Search("zzz", 50); len(got) != 0 {
		t.Errorf("Search(zzz) = %+v, want empty", got)
	}
}

func TestMockSearchHonorsLimit(t *testing.T) {
	m := market.NewMock(time.Now)
	got := m.Search("", 5)
	if len(got) != 5 {
		t.Fatalf("len = %d, want 5", len(got))
	}
	// The first 5 of the sorted catalog.
	if got[0].Symbol != "AAPL" || got[4].Symbol != "COST" {
		t.Errorf("limit should return the first sorted 5, got %s..%s", got[0].Symbol, got[4].Symbol)
	}
}

func TestMockSearchEdgeCases(t *testing.T) {
	m := market.NewMock(time.Now)

	// Whitespace-only query behaves like empty: matches everything.
	if got := m.Search("   ", 50); len(got) != 17 {
		t.Errorf("Search(whitespace) len = %d, want 17", len(got))
	}

	// A negative limit must not panic; it returns no matches.
	if got := m.Search("", -1); len(got) != 0 {
		t.Errorf("Search(_, -1) len = %d, want 0", len(got))
	}
}
