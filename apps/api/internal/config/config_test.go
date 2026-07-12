package config_test

import (
	"testing"

	"github.com/TyrionGump/tyche-api/internal/config"
)

func lookupFrom(env map[string]string) func(string) (string, bool) {
	return func(key string) (string, bool) {
		value, ok := env[key]
		return value, ok
	}
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := config.Load(lookupFrom(nil))
	if err != nil {
		t.Fatalf("Load() unexpected error: %v", err)
	}
	if cfg.ListenAddr != "127.0.0.1:8081" {
		t.Errorf("ListenAddr = %q", cfg.ListenAddr)
	}
}

func TestLoadOverrides(t *testing.T) {
	cfg, err := config.Load(lookupFrom(map[string]string{"LISTEN_ADDR": "0.0.0.0:9000"}))
	if err != nil {
		t.Fatalf("Load() unexpected error: %v", err)
	}
	if cfg.ListenAddr != "0.0.0.0:9000" {
		t.Errorf("ListenAddr = %q, want 0.0.0.0:9000", cfg.ListenAddr)
	}
}
