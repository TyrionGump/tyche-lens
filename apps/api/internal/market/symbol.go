package market

import (
	"fmt"
	"regexp"
	"strings"
)

var symbolPattern = regexp.MustCompile(`^[A-Z][A-Z0-9.-]{0,9}$`)

func NormalizeSymbol(raw string) (string, error) {
	normalized := strings.ToUpper(strings.TrimSpace(raw))
	if !symbolPattern.MatchString(normalized) {
		return "", fmt.Errorf("invalid symbol %q", raw)
	}
	return normalized, nil
}
