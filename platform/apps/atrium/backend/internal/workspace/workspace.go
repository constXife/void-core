package workspace

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type Workspace struct {
	Categories []Category `json:"categories"`
}

type Category struct {
	ID            int             `json:"id"`
	Title         string          `json:"title"`
	Slug          string          `json:"slug"`
	DisplayConfig json.RawMessage `json:"display_config"`
}

func Load(ctx context.Context, db *sql.DB) (Workspace, error) {
	categories, err := loadCategories(ctx, db)
	if err != nil {
		return Workspace{}, err
	}

	return Workspace{
		Categories: categories,
	}, nil
}

func loadCategories(ctx context.Context, db *sql.DB) ([]Category, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, title, slug, display_config
		FROM spaces
		WHERE is_provisioned = true
		ORDER BY id
	`)
	if err != nil {
		return nil, fmt.Errorf("query categories: %w", err)
	}
	defer rows.Close()

	var categories []Category
	for rows.Next() {
		var cfg []byte
		var item Category
		if err := rows.Scan(&item.ID, &item.Title, &item.Slug, &cfg); err != nil {
			return nil, fmt.Errorf("scan category: %w", err)
		}
		item.DisplayConfig = normalizeJSON(cfg)
		categories = append(categories, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate categories: %w", err)
	}

	return categories, nil
}
