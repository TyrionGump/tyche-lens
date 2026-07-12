package httpapi

import "context"

const maxSearchResults = 20

func (s *Server) GetSymbols(_ context.Context, request GetSymbolsRequestObject) (GetSymbolsResponseObject, error) {
	query := ""
	if request.Params.Query != nil {
		query = *request.Params.Query
	}
	listings := s.market.Search(query, maxSearchResults)
	response := SymbolsResponse{Symbols: make([]Listing, 0, len(listings))}
	for _, listing := range listings {
		response.Symbols = append(response.Symbols, Listing{
			Symbol:   listing.Symbol,
			Name:     listing.Name,
			Exchange: listing.Exchange,
			Sector:   listing.Sector,
		})
	}
	return GetSymbols200JSONResponse(response), nil
}
