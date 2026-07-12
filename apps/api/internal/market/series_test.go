package market_test

import (
	"math"
	"slices"
	"testing"
	"time"

	"github.com/TyrionGump/tyche-api/internal/market"
)

func TestSeriesShapeAndDeterminism(t *testing.T) {
	m := market.NewMock(time.Now)

	first, ok := m.Series("AAPL", 70)
	if !ok {
		t.Fatal("Series(AAPL) not found")
	}
	if len(first) != 70 {
		t.Fatalf("len = %d, want 70", len(first))
	}

	// The drift easing computes price + (drift * 1), which can land one
	// float64 ulp away from the exact price — compare with a tolerance.
	quote, _ := m.Quote("AAPL")
	if last := first[len(first)-1]; math.Abs(last-quote.Price) > 1e-9 {
		t.Errorf("series must end at the current price: got %v, want %v", last, quote.Price)
	}

	second, _ := m.Series("AAPL", 70)
	if !slices.Equal(first, second) {
		t.Error("series must be deterministic for the same symbol and points")
	}

	other, _ := m.Series("MSFT", 70)
	if slices.Equal(first, other) {
		t.Error("different symbols should produce different series")
	}
}

func TestSeriesRespectsPointCount(t *testing.T) {
	m := market.NewMock(time.Now)
	got, ok := m.Series("NVDA", 2)
	if !ok || len(got) != 2 {
		t.Errorf("Series(NVDA, 2) = %d points, ok=%v; want 2, true", len(got), ok)
	}
}

func TestSeriesUnknownSymbol(t *testing.T) {
	m := market.NewMock(time.Now)
	if _, ok := m.Series("ZZZZ", 70); ok {
		t.Error("Series(ZZZZ) expected ok=false")
	}
}

func TestSeriesInvalidPoints(t *testing.T) {
	m := market.NewMock(time.Now)
	for _, points := range []int{0, -1} {
		if got, ok := m.Series("AAPL", points); ok || got != nil {
			t.Errorf("Series(AAPL, %d) = (%v, %v), want (nil, false)", points, got, ok)
		}
	}
}
