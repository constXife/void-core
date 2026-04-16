package migrate

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
)

func Apply(ctx context.Context, db *sql.DB, dir string) error {
	if err := ensureSchemaTable(ctx, db); err != nil {
		return err
	}

	files, err := migrationFiles(dir)
	if err != nil {
		return err
	}

	for _, file := range files {
		applied, err := isApplied(ctx, db, file)
		if err != nil {
			return err
		}
		if applied {
			continue
		}

		contents, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", file, err)
		}

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}

		if _, err := tx.ExecContext(ctx, string(contents)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("apply migration %s: %w", file, err)
		}

		if _, err := tx.ExecContext(ctx, "INSERT INTO schema_migrations (filename) VALUES ($1)", filepath.Base(file)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %s: %w", file, err)
		}

		if err := tx.Commit(); err != nil {
			return err
		}
	}

	return nil
}

func ensureSchemaTable(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ DEFAULT NOW()
		)
	`)
	return err
}

func migrationFiles(dir string) ([]string, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	files := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		files = append(files, filepath.Join(dir, entry.Name()))
	}

	sort.Strings(files)
	return files, nil
}

func isApplied(ctx context.Context, db *sql.DB, file string) (bool, error) {
	var exists bool
	err := db.QueryRowContext(ctx, "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE filename = $1)", filepath.Base(file)).Scan(&exists)
	return exists, err
}
