-- PostGIS SHART EMAS — standart PostgreSQL yetarli

DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
  id        SERIAL PRIMARY KEY,
  viloyat   VARCHAR(255),
  district  VARCHAR(255),
  mfy       VARCHAR(255),
  name      VARCHAR(255),
  location  JSONB
);

CREATE INDEX locations_lat_idx ON locations (((location->>'lat')::float8));
CREATE INDEX locations_lng_idx ON locations (((location->>'lng')::float8));
