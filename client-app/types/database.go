package types

import (
	"clientapp/database"
	"context"
	"os"

	"github.com/jackc/pgx/v5"
)

type dbInstance struct {
	Queries *database.Queries
	Ctx     context.Context
}

func DbInit() (*pgx.Conn, error) {
	DbInstance.Ctx = context.Background()
	conn, err := pgx.Connect(DbInstance.Ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return nil, err
	}
	// defer conn.Close(DbInstance.Ctx)

	DbInstance.Queries = database.New(conn)

	return conn, nil
}

var DbInstance dbInstance
