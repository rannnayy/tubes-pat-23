CREATE TABLE users (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username  VARCHAR(32) NOT NULL UNIQUE,
  password  TEXT        NOT NULL
);

---- create above / drop below ----

drop table users;
