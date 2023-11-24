// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.23.0
// source: users.sql

package database

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const createUser = `-- name: CreateUser :one
INSERT INTO users (
  username, password
) VALUES (
  $1, $2
)
RETURNING id, username, password
`

type CreateUserParams struct {
	Username string `db:"username" json:"username" validate:"required,max=32"`
	Password string `db:"password" json:"password" validate:"required,alphanum"`
}

func (q *Queries) CreateUser(ctx context.Context, arg CreateUserParams) (User, error) {
	row := q.db.QueryRow(ctx, createUser, arg.Username, arg.Password)
	var i User
	err := row.Scan(&i.ID, &i.Username, &i.Password)
	return i, err
}

const deleteUser = `-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1
`

func (q *Queries) DeleteUser(ctx context.Context, id pgtype.UUID) error {
	_, err := q.db.Exec(ctx, deleteUser, id)
	return err
}

const getUserById = `-- name: GetUserById :one
SELECT id, username, password FROM users
WHERE id = $1 LIMIT 1
`

func (q *Queries) GetUserById(ctx context.Context, id pgtype.UUID) (User, error) {
	row := q.db.QueryRow(ctx, getUserById, id)
	var i User
	err := row.Scan(&i.ID, &i.Username, &i.Password)
	return i, err
}

const getUserByUsername = `-- name: GetUserByUsername :one
SELECT id, username, password FROM users
WHERE username = $1 LIMIT 1
`

func (q *Queries) GetUserByUsername(ctx context.Context, username string) (User, error) {
	row := q.db.QueryRow(ctx, getUserByUsername, username)
	var i User
	err := row.Scan(&i.ID, &i.Username, &i.Password)
	return i, err
}

const updateUserFieldPassword = `-- name: UpdateUserFieldPassword :exec
UPDATE users
  set password = $2
WHERE id = $1
`

type UpdateUserFieldPasswordParams struct {
	ID       pgtype.UUID `db:"id" json:"id"`
	Password string      `db:"password" json:"password" validate:"required,alphanum"`
}

func (q *Queries) UpdateUserFieldPassword(ctx context.Context, arg UpdateUserFieldPasswordParams) error {
	_, err := q.db.Exec(ctx, updateUserFieldPassword, arg.ID, arg.Password)
	return err
}