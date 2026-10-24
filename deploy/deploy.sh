#!/bin/bash
# Updates the clone from GitHub, builds, applies the migrations and restarts
# the Internship Portal. Run it on the server: deploy/deploy.sh [branch]
set -euo pipefail
cd "$(dirname "$0")"

BRANCH=${1:-main}

# First pass: update the code, then run the updated version of this script.
if [ "${DEPLOY_UPDATED:-}" != 1 ]; then
  echo "==> Code ($BRANCH)"
  git fetch --quiet origin "$BRANCH"
  git checkout --quiet -B "$BRANCH" "origin/$BRANCH"
  git log -1 --format='    %h %s'
  DEPLOY_UPDATED=1 exec ./deploy.sh "$BRANCH"
fi

[ -f .env ] || { echo "Missing deploy/.env (see deploy/.env.example)"; exit 1; }
PUBLIC_URL=$(grep -E '^PUBLIC_API_URL=' .env | cut -d= -f2-)

echo "==> API build"
docker compose build api migrate

echo "==> Frontend build"
rm -rf www.new
docker buildx build --quiet --target web \
  --build-arg VITE_API_URL="$PUBLIC_URL" \
  --output type=local,dest=www.new \
  ..

echo "==> Migrations"
docker compose run --rm migrate

echo "==> API restart"
docker compose up -d --wait api

echo "==> Frontend publish"
rm -rf www.old
[ -d www ] && mv www www.old
mv www.new www
rm -rf www.old

# Picks up changes to site.caddy.
docker exec caddy caddy reload --config /etc/caddy/Caddyfile > /dev/null 2>&1 \
  || echo "    (Caddy was not reloaded: is the \"caddy\" container running?)"

docker image prune -f > /dev/null
echo "==> Done: $PUBLIC_URL"
