package market_test

import (
	"testing"

	"github.com/TyrionGump/tyche-api/internal/market"
)

func TestNormalizeSymbol(t *testing.T) {
	valid := map[string]string{
		"AAPL":       "AAPL",
		" aapl ":     "AAPL",
		"brk.b":      "BRK.B",
		"A":          "A",
		"AB-CD.1":    "AB-CD.1",
		"ABCDEFGHIJ": "ABCDEFGHIJ",
	}
	for input, want := range valid {
		got, err := market.NormalizeSymbol(input)
		if err != nil {
			t.Errorf("NormalizeSymbol(%q) unexpected error: %v", input, err)
			continue
		}
		if got != want {
			t.Errorf("NormalizeSymbol(%q) = %q, want %q", input, got, want)
		}
	}

	invalid := []string{"", "  ", "1ABC", ".AAPL", "TOOLONGSYMBOL", "AA PL", "aa/pl", "ABCDEFGHIJK", "-AAPL"}
	for _, input := range invalid {
		if _, err := market.NormalizeSymbol(input); err == nil {
			t.Errorf("NormalizeSymbol(%q) expected error, got nil", input)
		}
	}
}
