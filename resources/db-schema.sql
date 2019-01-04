CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE block_stat (
  "number" int,
  "hash" char(64),
  "timestamp" decimal(78,0)
);

CREATE TABLE players (
  "player_address" char(34) PRIMARY KEY,
  "name" varchar(256) not null,
  "fame" int not null default 0,
  "tronium" int not null default 0,
  "item1" char(34),
  "item2" char(34),
  "item3" char(34),
  "item4" char(34),
  "updated_date" timestamp with time zone not null default now(),
  "created_date" timestamp with time zone not null default now()
);

CREATE TABLE player_collectables (
  "player_address" char(34) PRIMARY KEY,
  "collectable" char(34),
  "created_date" timestamp with time zone not null default now()
);

CREATE TYPE channel_state AS ENUM ('Opened', 'Closed');

CREATE TABLE channels (
  "player_address" char(34),
  "channel_id" int,
  "public_key" varchar(256),
  "tronium" int not null default 0,
  "state" channel_state default 'Opened',
  "updated_date" timestamp with time zone not null default now(),
  "created_date" timestamp with time zone not null default now()
);

CREATE UNIQUE INDEX channels_idx ON channels(player_address, channel_id);

CREATE TYPE message_type AS ENUM ('PLAYER_OPENED', 'DELEAR_ACCEPTED', 'PLAYER_CLOSED');

CREATE TABLE messages (
  "player_address" char(34),
  "channel_id" int,
  "round" int,
  "type" message_type,
  "text" json,
  "created_date" timestamp with time zone not null default now()
);

CREATE UNIQUE INDEX messages_idx ON messages(player_address, channel_id, round, type);

CREATE TYPE battle_status AS ENUM ('READY', 'ONGOING', 'FINISHED');

CREATE TABLE battles (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "player_address" char(34),
  "villain_max_hp" int,
  "villain_hp" int,
  "epicness" int,
  "tronium" int,
  "status" battle_status,
  "updated_date" timestamp with time zone not null default now(),
  "created_date" timestamp with time zone not null default now()
);
