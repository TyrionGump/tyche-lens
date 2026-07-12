// Package config loads service configuration from environment
// variables. A .env file is not auto-loaded.
package config

type Config struct {
	ListenAddr string
}

func Load(lookup func(string) (string, bool)) (Config, error) {
	cfg := Config{ListenAddr: "127.0.0.1:8081"}
	if value, ok := lookup("LISTEN_ADDR"); ok {
		cfg.ListenAddr = value
	}
	return cfg, nil
}
