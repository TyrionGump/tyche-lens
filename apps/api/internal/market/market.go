// Package market holds the market-data domain model and the mock
// catalog that serves it. There is deliberately no real provider and no
// cache here: the service is mock-only for now, and a provider interface
// gets extracted when a second implementation exists.
package market

import "time"

type Quote struct {
	Symbol   string
	Name     string
	Exchange string
	Sector   string

	Price     float64
	ChangePct float64
	ChangeAbs float64

	Open      float64
	High      float64
	Low       float64
	PrevClose float64

	MarketCap  float64
	Volume     float64
	Week52High float64
	Week52Low  float64

	PERatio  *float64
	EPS      *float64
	DivYield *float64
	Beta     *float64

	AsOf time.Time
}

// Listing identifies one tradable company in the directory.
type Listing struct {
	Symbol   string
	Name     string
	Exchange string
	Sector   string
}
