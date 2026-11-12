#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="toonly-schema-check-$$"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --rm -d --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine -c wal_level=logical >/dev/null
for attempt in $(seq 1 60); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
cat tests/database/supabase-platform-fixture.sql supabase/migrations/*.sql |
  docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 >/dev/null
# Confirm the upgrade is safe when its columns, policies, functions and view table already exist.
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261112000000_reel_safety_and_views.sql >/dev/null
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261112010000_viewer_feed_visibility.sql >/dev/null
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261112020000_shared_reels_feed.sql >/dev/null
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < tests/database/security.sql
