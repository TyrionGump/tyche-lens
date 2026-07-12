package httpapi_test

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/TyrionGump/tyche-api/internal/httpapi"
	"github.com/TyrionGump/tyche-api/internal/market"
)

func newHandler(t *testing.T, m httpapi.Market) http.Handler {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(testWriter{t}, nil))
	return httpapi.NewHandler(httpapi.NewServer(m), logger)
}

type testWriter struct{ t *testing.T }

func (w testWriter) Write(p []byte) (int, error) {
	w.t.Log(string(p))
	return len(p), nil
}

func get(t *testing.T, handler http.Handler, target string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
	return rec
}

// panicMarket exercises the recovery middleware.
type panicMarket struct{}

func (panicMarket) Quote(string) (market.Quote, bool)    { panic("boom") }
func (panicMarket) Search(string, int) []market.Listing  { panic("boom") }
func (panicMarket) Series(string, int) ([]float64, bool) { panic("boom") }

func TestHealthz(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/healthz")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode healthz body: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf("status = %q, want ok", body["status"])
	}
}

func TestGetQuotesMissingParam(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.Error
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if body.Code != "invalid_request" {
		t.Errorf("error code = %q, want invalid_request", body.Code)
	}
}

func TestGetQuotesEmptyParam(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes?symbols=")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.Error
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if body.Code != "invalid_request" {
		t.Errorf("error code = %q, want invalid_request", body.Code)
	}
}

func TestGetQuotesHappyPath(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes?symbols=MSFT,AAPL")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.QuotesResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Quotes) != 2 || body.Quotes[0].Symbol != "MSFT" || body.Quotes[1].Symbol != "AAPL" {
		t.Errorf("expected [MSFT AAPL] in request order, got %+v", body.Quotes)
	}
	if body.Quotes[0].Price <= 0 || body.Quotes[0].Name == "" {
		t.Errorf("quote fields incomplete: %+v", body.Quotes[0])
	}
	if body.Quotes[0].Sector == "" {
		t.Errorf("expected sector populated: %+v", body.Quotes[0])
	}
}

func TestGetQuotesNormalizesAndOmitsUnknown(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes?symbols=aapl,ZZZZ")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.QuotesResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Quotes) != 1 || body.Quotes[0].Symbol != "AAPL" {
		t.Errorf("expected lowercased input normalized and unknown omitted, got %+v", body.Quotes)
	}
}

func TestGetQuotesInvalidSymbol(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes?symbols=AAPL,!!")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.Error
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if body.Code != "invalid_request" || body.Message == "" {
		t.Errorf("error body = %+v", body)
	}
}

func TestGetQuotesTooManySymbols(t *testing.T) {
	symbols := "A"
	for range 50 {
		symbols += ",A"
	}
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes?symbols="+symbols)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.Error
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if body.Code != "invalid_request" {
		t.Errorf("error code = %q, want invalid_request", body.Code)
	}
}

func TestPanicRecoversToInternalError(t *testing.T) {
	handler := newHandler(t, panicMarket{})
	rec := get(t, handler, "/v1/quotes?symbols=AAPL")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.Error
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if body.Code != "internal_error" {
		t.Errorf("error code = %q, want internal_error", body.Code)
	}
}

func TestGetSymbolsFullCatalog(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/symbols")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.SymbolsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Symbols) != 17 {
		t.Fatalf("len = %d, want 17", len(body.Symbols))
	}
	first := body.Symbols[0]
	if first.Symbol != "AAPL" || first.Name == "" || first.Exchange == "" || first.Sector == "" {
		t.Errorf("first listing = %+v, want complete AAPL", first)
	}
}

func TestGetSymbolsQueryFilters(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/symbols?query=visa")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.SymbolsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Symbols) != 1 || body.Symbols[0].Symbol != "V" {
		t.Errorf("Search(visa) over the wire = %+v, want [V]", body.Symbols)
	}
}

func TestGetSymbolsNoMatchesIsEmptyArray(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/symbols?query=zzz")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	// The contract requires "symbols" present — an empty array, never null.
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if string(raw["symbols"]) != "[]" {
		t.Errorf(`symbols = %s, want []`, raw["symbols"])
	}
}

func TestGetQuoteHistoryDefaults(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes/AAPL/history")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.HistoryResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Symbol != "AAPL" {
		t.Errorf("symbol = %q, want AAPL", body.Symbol)
	}
	if len(body.Points) != 70 {
		t.Errorf("len(points) = %d, want default 70", len(body.Points))
	}

	again := get(t, handler, "/v1/quotes/AAPL/history")
	var second httpapi.HistoryResponse
	if err := json.Unmarshal(again.Body.Bytes(), &second); err != nil {
		t.Fatalf("decode second response: %v", err)
	}
	if len(second.Points) != len(body.Points) || second.Points[0] != body.Points[0] {
		t.Error("history must be deterministic across requests")
	}
}

func TestGetQuoteHistoryPointsParamAndNormalization(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes/aapl/history?points=30")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.HistoryResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Symbol != "AAPL" || len(body.Points) != 30 {
		t.Errorf("got symbol=%q len=%d, want AAPL/30 (lowercase path normalized)", body.Symbol, len(body.Points))
	}
}

func TestGetQuoteHistoryUnknownSymbol(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes/ZZZZ/history")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.Error
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if body.Code != "not_found" {
		t.Errorf("error code = %q, want not_found", body.Code)
	}
}

func TestGetQuoteHistoryInvalidSymbol(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes/!!/history")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.Error
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if body.Code != "invalid_request" {
		t.Errorf("error code = %q, want invalid_request", body.Code)
	}
}

func TestGetQuoteHistoryPointsOutOfRange(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	for _, target := range []string{
		"/v1/quotes/AAPL/history?points=1",
		"/v1/quotes/AAPL/history?points=501",
	} {
		rec := get(t, handler, target)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status = %d, want 400 (handler range check); body: %s", target, rec.Code, rec.Body.String())
			continue
		}
		var body httpapi.Error
		if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
			t.Errorf("%s: decode error body: %v", target, err)
			continue
		}
		if body.Code != "invalid_request" {
			t.Errorf("%s: error code = %q, want invalid_request", target, body.Code)
		}
	}
}

func TestGetQuoteHistoryMinimumPointsBoundary(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes/AAPL/history?points=2")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.HistoryResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Points) != 2 {
		t.Errorf("len(points) = %d, want 2", len(body.Points))
	}
}

func TestGetQuoteHistoryMaximumPointsBoundary(t *testing.T) {
	handler := newHandler(t, market.NewMock(time.Now))
	rec := get(t, handler, "/v1/quotes/AAPL/history?points=500")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var body httpapi.HistoryResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(body.Points) != 500 {
		t.Errorf("len(points) = %d, want 500", len(body.Points))
	}
}
