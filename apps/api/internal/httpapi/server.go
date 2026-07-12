// Package httpapi implements the OpenAPI contract in api/openapi.yaml.
// gen.go is generated from that contract (see generate.go); handlers
// live one file per resource (quotes.go, symbols.go).
package httpapi

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/TyrionGump/tyche-api/internal/market"
)

// Market is what the handlers need from a market-data backend. It is
// satisfied by *market.Mock; tests inject fakes through it.
type Market interface {
	Quote(symbol string) (market.Quote, bool)
	Search(query string, limit int) []market.Listing
	Series(symbol string, points int) ([]float64, bool)
}

type Server struct {
	market Market
}

func NewServer(m Market) *Server {
	return &Server{market: m}
}

// NewHandler builds the Gin engine that serves the OpenAPI contract plus
// the public /healthz check. The wired error paths answer in the
// contract's {code,message} shape; request-body and response-write
// failures deliberately keep the generated {"msg":...} defaults.
func NewHandler(server *Server, logger *slog.Logger) http.Handler {
	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.Use(gin.CustomRecovery(func(c *gin.Context, recovered any) {
		logger.Error("panic recovered", "panic", recovered)
		c.AbortWithStatusJSON(http.StatusInternalServerError,
			Error{Code: "internal_error", Message: "internal error"})
	}))

	// Public infra route, deliberately outside the OpenAPI contract.
	engine.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	strict := NewStrictHandlerWithOptions(server, nil, StrictGinServerOptions{
		// Fires when a strict handler returns a non-nil error.
		HandlerErrorFunc: func(c *gin.Context, err error) {
			logger.Error("handler error", "error", err)
			c.JSON(http.StatusInternalServerError,
				Error{Code: "internal_error", Message: "internal error"})
		},
	})
	RegisterHandlersWithOptions(engine, strict, GinServerOptions{
		// Param-binding failures (e.g. missing required "symbols").
		ErrorHandler: func(c *gin.Context, err error, _ int) {
			c.JSON(http.StatusBadRequest,
				Error{Code: "invalid_request", Message: err.Error()})
		},
	})
	return engine
}
