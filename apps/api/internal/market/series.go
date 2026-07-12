package market

// Port of tyche-ui's buildSeries (src/data/market.ts) and the detail
// panel's symbol-hash seeding: a seeded pseudo-random walk whose closing
// drift is eased across the whole series (∝ t²) so it lands exactly on
// the current price without a fake cliff on the last tick.

const seriesVolatility = 0.05

// Series returns a deterministic price walk of exactly points samples
// ending at the symbol's current price. ok is false for an unknown
// symbol or a non-positive points (which would otherwise panic on the
// slice make); callers enforce the contract's 2..500 range upstream.
func (m *Mock) Series(symbol string, points int) ([]float64, bool) {
	row, ok := catalog[symbol]
	if !ok {
		return nil, false
	}
	if points < 1 {
		return nil, false
	}
	return syntheticSeries(seedFor(symbol), points, row.price, seriesVolatility), true
}

// seedFor hashes a symbol the same way the UI's detail panel did, so
// every company keeps its distinct chart shape.
func seedFor(symbol string) int64 {
	seed := int64(7)
	for _, ch := range symbol {
		seed = (seed*31 + int64(ch)) % 9973
	}
	return seed
}

// newSeededRandom is a Park–Miller LCG in [0,1), matching the UI's
// createSeededRandom.
func newSeededRandom(seed int64) func() float64 {
	state := seed % 2147483647
	if state <= 0 {
		state += 2147483646
	}
	return func() float64 {
		state = state * 16807 % 2147483647
		return float64(state) / 2147483647
	}
}

func syntheticSeries(seed int64, points int, endValue, volatility float64) []float64 {
	random := newSeededRandom(seed)
	out := make([]float64, points)

	value := endValue * (1 - (random()-0.5)*volatility*2)
	for i := range out {
		value += (random() - 0.48) * endValue * volatility * 0.18
		out[i] = value
	}

	last := points - 1
	drift := endValue - out[last]
	for i := range out {
		t := 1.0
		if last != 0 {
			t = float64(i) / float64(last)
		}
		out[i] += drift * t * t
	}
	return out
}
