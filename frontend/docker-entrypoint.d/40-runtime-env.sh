#!/bin/sh
# nginx runs every script in /docker-entrypoint.d/ at start-up, so the backend URL can change without a rebuild.
set -eu
url=$(printf '%s' "${API_BASE_URL:-http://localhost:8080}" | tr -d '"\')
printf 'window.__ENV = { API_BASE_URL: "%s" };\n' "$url" > /usr/share/nginx/html/env.js
echo "env.js: API_BASE_URL=$url"
