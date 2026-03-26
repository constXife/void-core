package main

import (
	"context"
	"database/sql"
	"log"
	"os"

	"atrium/internal/migrate"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	ctx := context.Background()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "backend/migrations"
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if err := migrate.Apply(ctx, db, migrationsDir); err != nil {
		log.Fatalf("apply migrations: %v", err)
	}

	log.Println("migrations applied")
}
