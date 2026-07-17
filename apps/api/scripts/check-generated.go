package main

import (
	"bytes"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
)

var generatedFiles = []string{
	"internal/httpapi/gen.go",
}

type snapshot struct {
	contents []byte
	mode     fs.FileMode
}

func main() {
	before, err := takeSnapshots(generatedFiles)
	if err != nil {
		fail(err)
	}

	generate := exec.Command("go", "generate", "./...")
	generate.Stdout = os.Stdout
	generate.Stderr = os.Stderr
	if err := generate.Run(); err != nil {
		restoreOrFail(before)
		fail(fmt.Errorf("generate API bindings: %w", err))
	}

	changed, err := changedFiles(before)
	if err != nil {
		restoreOrFail(before)
		fail(err)
	}
	if len(changed) == 0 {
		fmt.Println("Generated Go artifacts match the current contract.")
		return
	}

	fmt.Fprintln(os.Stderr, "Generated Go artifacts are stale:")
	for _, path := range changed {
		fmt.Fprintf(os.Stderr, "  M %s\n", path)
	}
	os.Exit(1)
}

func takeSnapshots(paths []string) (map[string]snapshot, error) {
	snapshots := make(map[string]snapshot, len(paths))
	for _, path := range paths {
		contents, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("read %s: %w", path, err)
		}
		info, err := os.Stat(path)
		if err != nil {
			return nil, fmt.Errorf("stat %s: %w", path, err)
		}
		snapshots[path] = snapshot{contents: contents, mode: info.Mode()}
	}
	return snapshots, nil
}

func changedFiles(before map[string]snapshot) ([]string, error) {
	changed := make([]string, 0, len(before))
	for _, path := range generatedFiles {
		after, err := os.ReadFile(path)
		if err != nil {
			return nil, fmt.Errorf("read generated %s: %w", path, err)
		}
		if !bytes.Equal(before[path].contents, after) {
			changed = append(changed, path)
		}
	}
	return changed, nil
}

func restoreOrFail(snapshots map[string]snapshot) {
	for path, original := range snapshots {
		if err := os.WriteFile(path, original.contents, original.mode.Perm()); err != nil {
			fail(fmt.Errorf("restore %s: %w", path, err))
		}
	}
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(1)
}
