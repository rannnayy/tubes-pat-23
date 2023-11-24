package types

import "github.com/gofiber/fiber/v2/middleware/session"

var SessionStore *session.Store

func SessionInit(){
	SessionStore = session.New()
}