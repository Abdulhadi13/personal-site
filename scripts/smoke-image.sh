#!/bin/sh
set -eu
base=${1:-http://127.0.0.1:8080}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
for path in / /projects/ /blogs/ /about/ /ar/ /ar/projects/ /ar/blogs/ /ar/about/ /healthz; do
  status=$(curl -sS -o "$tmp/body" -w '%{http_code}' "$base$path")
  [ "$status" = 200 ] || { echo "$path: expected 200, got $status" >&2; exit 1; }
done
status=$(curl -sS -o /dev/null -w '%{http_code}' "$base/this-page-does-not-exist/")
[ "$status" = 404 ] || { echo "Missing page: expected 404, got $status" >&2; exit 1; }
curl -fsS "$base/" > "$tmp/index"
asset=$(grep -oE '/_astro/[^" ]+\.(css|js)' "$tmp/index" | head -n 1)
[ -n "$asset" ] || { echo 'No fingerprinted asset found' >&2; exit 1; }
curl -fsS -D "$tmp/headers" -o /dev/null "$base$asset"
grep -qi 'cache-control:.*immutable' "$tmp/headers" || { echo 'Asset cache policy missing' >&2; exit 1; }
curl -fsS -D "$tmp/headers" -o /dev/null "$base/"
grep -qi 'cache-control:.*no-cache' "$tmp/headers" || { echo 'HTML cache policy missing' >&2; exit 1; }
echo 'Image smoke test passed.'
