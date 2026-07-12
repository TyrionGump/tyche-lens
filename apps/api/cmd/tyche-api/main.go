package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/TyrionGump/tyche-api/internal/config"
	"github.com/TyrionGump/tyche-api/internal/httpapi"
	"github.com/TyrionGump/tyche-api/internal/market"
)

func main() {
	os.Exit(run())
}

func run() int {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := config.Load(os.LookupEnv)
	if err != nil {
		logger.Error("load configuration", "error", err)
		return 1
	}

	logger.Info("serving mock quotes")
	m := market.NewMock(func() time.Time { return time.Now().UTC() })
	server := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: httpapi.NewHandler(httpapi.NewServer(m), logger),
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		logger.Info("listening", "addr", cfg.ListenAddr)
		errCh <- server.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		logger.Error("server stopped unexpectedly", "error", err)
		return 1
	case <-ctx.Done():
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("shutdown", "error", err)
		return 1
	}
	logger.Info("service stopped")
	return 0
}
