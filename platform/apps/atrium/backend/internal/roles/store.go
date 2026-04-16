package roles

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
)

type Role struct {
	ID          int    `json:"id"`
	Key         string `json:"key"`
	Name        string `json:"name"`
	Permissions string `json:"permissions"`
	IsBuiltin   bool   `json:"is_builtin"`
}

func List(ctx context.Context, db *sql.DB) ([]Role, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, key, name, permissions, is_builtin
		FROM roles
		ORDER BY id
	`)
	if err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	defer rows.Close()

	var items []Role
	for rows.Next() {
		var item Role
		if err := rows.Scan(&item.ID, &item.Key, &item.Name, &item.Permissions, &item.IsBuiltin); err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate roles: %w", err)
	}
	return items, nil
}

func PermissionsForKey(ctx context.Context, db *sql.DB, key string) ([]string, error) {
	if key == "" {
		return []string{"view"}, nil
	}
	var raw []byte
	err := db.QueryRowContext(ctx, `
		SELECT permissions
		FROM roles
		WHERE key = $1
	`, key).Scan(&raw)
	if err != nil {
		if err == sql.ErrNoRows {
			return []string{"view"}, nil
		}
		return nil, fmt.Errorf("load role permissions: %w", err)
	}
	var perms []string
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &perms); err != nil {
			return []string{"view"}, nil
		}
	}
	if perms == nil {
		perms = []string{"view"}
	}
	return perms, nil
}
