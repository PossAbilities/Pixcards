#!/usr/bin/env bash
# Runs ON the Ryan's Cloud VPS. .github/workflows/deploy.yml uploads the release to
# /root/pixcards-release.tar.gz and pipes this script over ssh.
#
# Swaps the new code into /opt/pixcards/app, rebuilds the image and restarts ONLY the
# app container. The database container, its volume and /opt/pixcards/.env are never
# touched. If the new version doesn't answer within ~90s it rolls back to the
# previous image automatically.
set -euo pipefail

DIR=/opt/pixcards
TARBALL=/root/pixcards-release.tar.gz
COMPOSE=(docker compose -p pixcards -f "$DIR/docker-compose.db.yml" -f "$DIR/docker-compose.app.yml")

cd "$DIR"

echo "→ Unpacking release"
rm -rf app-new
mkdir app-new
tar xzf "$TARBALL" -C app-new
test -f app-new/Dockerfile || { echo "Release has no Dockerfile — aborting, live site untouched"; exit 1; }

# Keep the running image as pixcards:previous so a bad release can be undone in seconds.
old_previous=$(docker image inspect -f '{{.Id}}' pixcards:previous 2>/dev/null || true)
docker tag pixcards:latest pixcards:previous

rm -rf app-prev
mv app app-prev
mv app-new app

echo "→ Building (the live site keeps running meanwhile)"
if ! "${COMPOSE[@]}" build app; then
  echo "Build failed — restoring the previous code folder; the live site was not changed"
  rm -rf app
  mv app-prev app
  exit 1
fi

echo "→ Restarting the app container"
"${COMPOSE[@]}" up -d --no-deps app

healthy=false
for _ in $(seq 1 30); do
  sleep 3
  cid=$("${COMPOSE[@]}" ps -q app)
  if [ -n "$cid" ] && docker exec "$cid" node -e \
    "fetch('http://localhost:3000/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    healthy=true
    break
  fi
done

if [ "$healthy" != true ]; then
  echo "New version did not respond — rolling back to the previous image"
  docker logs --tail 40 "$("${COMPOSE[@]}" ps -q app)" || true
  docker tag pixcards:previous pixcards:latest
  rm -rf app
  mv app-prev app
  "${COMPOSE[@]}" up -d --no-deps --force-recreate app
  exit 1
fi

# Free the disk used by the image from two releases ago (no-op if still in use).
if [ -n "$old_previous" ] && [ "$old_previous" != "$(docker image inspect -f '{{.Id}}' pixcards:previous)" ]; then
  docker rmi "$old_previous" >/dev/null 2>&1 || true
fi
rm -f "$TARBALL"

echo "✓ Deployed"
"${COMPOSE[@]}" ps app
