package handlers

import (
	"clientapp/database"
	"clientapp/types"
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

// {username: "", password: ""}
func RegisterUser(c *fiber.Ctx) error {
	var err error
	user := new(database.CreateUserParams)

	if err := c.BodyParser(user); err != nil {
		return err
	}

	if err := types.Validator.Validate(user); err != nil {
		return err
	}

	if user.Password, err = types.HashParam.Hash(user.Password); err != nil {
		return err
	}

	if _, err := types.DbInstance.Queries.CreateUser(types.DbInstance.Ctx, *user); err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(&types.ResponseTemplate{
		Success: true,
		Message: "User Created",
	})
}

// {username: "", password: ""}
func LoginUser(c *fiber.Ctx) error {
	var err error

	sess, err := types.SessionStore.Get(c)
	if err != nil {
		return err
	}

	param := new(database.CreateUserParams)

	if err := c.BodyParser(param); err != nil {
		return err
	}

	if err := types.Validator.Validate(param); err != nil {
		return err
	}

	user, err := types.DbInstance.Queries.GetUserByUsername(types.DbInstance.Ctx, param.Username)
	if err != nil {
		return err
	}

	result, err := types.HashParam.Verify(param.Password, user.Password)
	if err != nil {
		return err
	}

	if !result {
		return errors.New("login error")
	}

	var uid_str []byte
	if uid_str, err = user.ID.MarshalJSON(); err != nil {
		return err
	}

	sess.Set("uid", uid_str)

	if err := sess.Save(); err != nil {
		return err
	}

	return c.Status(fiber.StatusAccepted).JSON(&types.ResponseTemplate{
		Success: true,
		Message: "Login success",
	})
}

// {password: ""}
func UpdateUserPassword(c *fiber.Ctx) error {
	if err := types.Enforce(c); err != nil {
		return err
	}

	var err error

	sess, err := types.SessionStore.Get(c)
	if err != nil {
		return err
	}

	param := new(database.UpdateUserFieldPasswordParams)

	if err := c.BodyParser(param); err != nil {
		return err
	}

	if err := types.Validator.Validate(param); err != nil {
		return err
	}

	if param.Password, err = types.HashParam.Hash(param.Password); err != nil {
		return err
	}

	if err := param.ID.UnmarshalJSON(sess.Get("uid").([]byte)); err != nil {
		return err
	}

	if err := types.DbInstance.Queries.UpdateUserFieldPassword(types.DbInstance.Ctx, *param); err != nil {
		return err
	}

	return c.Status(fiber.StatusAccepted).JSON(&types.ResponseTemplate{
		Success: true,
		Message: "User Updated",
	})
}

func DeleteUser(c *fiber.Ctx) error {
	if err := types.Enforce(c); err != nil {
		return err
	}
	
	var err error

	sess, err := types.SessionStore.Get(c)
	if err != nil {
		return err
	}

	var uid pgtype.UUID
	if err := uid.UnmarshalJSON(sess.Get("uid").([]byte)); err != nil {
		return err
	}

	if err := types.DbInstance.Queries.DeleteUser(types.DbInstance.Ctx, uid); err != nil {
		return err
	}

	return c.Status(fiber.StatusAccepted).JSON(&types.ResponseTemplate{
		Success: true,
		Message: "User Deleted",
	})
}
