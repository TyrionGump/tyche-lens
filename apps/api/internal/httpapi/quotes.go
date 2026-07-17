package httpapi

import (
	"context"
	"fmt"

	"github.com/TyrionGump/tyche-api/internal/market"
)

const (
	maxSymbolsPerRequest = 50
	defaultHistoryPoints = 70
	minHistoryPoints     = 2   // mirrors the spec's minimum for "points"
	maxHistoryPoints     = 500 // mirrors the spec's maximum for "points"
)

func (s *Server) GetQuotes(_ context.Context, request GetQuotesRequestObject) (GetQuotesResponseObject, error) {
	parts := request.Params.Symbols

	if len(parts) > maxSymbolsPerRequest {
		return GetQuotes400JSONResponse{
			Code:    "invalid_request",
			Message: fmt.Sprintf("at most %d symbols per request", maxSymbolsPerRequest),
		}, nil
	}

	quotes := make([]Quote, 0, len(parts))
	for _, part := range parts {
		symbol, err := market.NormalizeSymbol(part)
		if err != nil {
			return GetQuotes400JSONResponse{
				Code:    "invalid_request",
				Message: err.Error(),
			}, nil
		}
		q, ok := s.market.Quote(symbol)
		if !ok {
			continue // unknown symbols are omitted, per the contract
		}
		quotes = append(quotes, toAPIQuote(q))
	}
	return GetQuotes200JSONResponse(QuotesResponse{Quotes: quotes}), nil
}

func (s *Server) GetQuoteHistory(_ context.Context, request GetQuoteHistoryRequestObject) (GetQuoteHistoryResponseObject, error) {
	symbol, err := market.NormalizeSymbol(request.Symbol)
	if err != nil {
		return GetQuoteHistory400JSONResponse{
			Code:    "invalid_request",
			Message: err.Error(),
		}, nil
	}
	points := defaultHistoryPoints
	if request.Params.Points != nil {
		points = *request.Params.Points
		if points < minHistoryPoints || points > maxHistoryPoints {
			return GetQuoteHistory400JSONResponse{
				Code:    "invalid_request",
				Message: fmt.Sprintf("points must be between %d and %d", minHistoryPoints, maxHistoryPoints),
			}, nil
		}
	}
	series, ok := s.market.Series(symbol, points)
	if !ok {
		return GetQuoteHistory404JSONResponse{
			Code:    "not_found",
			Message: fmt.Sprintf("unknown symbol %q", symbol),
		}, nil
	}
	return GetQuoteHistory200JSONResponse(HistoryResponse{
		Symbol: symbol,
		Points: series,
	}), nil
}

func toAPIQuote(q market.Quote) Quote {
	return Quote{
		Symbol:     q.Symbol,
		Name:       q.Name,
		Exchange:   q.Exchange,
		Sector:     q.Sector,
		Price:      q.Price,
		ChangePct:  q.ChangePct,
		ChangeAbs:  q.ChangeAbs,
		Open:       q.Open,
		High:       q.High,
		Low:        q.Low,
		PrevClose:  q.PrevClose,
		MarketCap:  q.MarketCap,
		Volume:     q.Volume,
		Week52High: q.Week52High,
		Week52Low:  q.Week52Low,
		PeRatio:    q.PERatio,
		Eps:        q.EPS,
		DivYield:   q.DivYield,
		Beta:       q.Beta,
		AsOf:       q.AsOf,
	}
}
