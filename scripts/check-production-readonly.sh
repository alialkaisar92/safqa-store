#!/usr/bin/env bash
set -u
BASE_URL="${BASE_URL:-https://rab7na-store.vercel.app}"
TMP_DIR="${TMPDIR:-/tmp}/rab7na-production-check-$$"
mkdir -p "$TMP_DIR"
trap 'rm -rf "$TMP_DIR"' EXIT
failures=0
check_status() {
  local name="$1" url="$2" method="${3:-GET}" data="${4:-}"
  local body="$TMP_DIR/${name}.body" headers="$TMP_DIR/${name}.headers" status
  if [ "$method" = "POST" ]; then
    status=$(curl -sS --max-time 25 -D "$headers" -o "$body" -X POST -H 'Content-Type: application/json' --data "$data" -w '%{http_code}' "$url") || status="curl_error"
  else
    status=$(curl -sS --max-time 25 -D "$headers" -o "$body" -w '%{http_code}' "$url") || status="curl_error"
  fi
  printf '%-28s HTTP=%s\n' "$name" "$status"
  if [ "$status" = "curl_error" ]; then failures=$((failures+1)); return; fi
}
check_status health "$BASE_URL/api/health"
if grep -q '"ok":true' "$TMP_DIR/health.body" && grep -q '"database":"postgresql"' "$TMP_DIR/health.body"; then echo '  health payload: PASS'; else echo '  health payload: FAIL'; failures=$((failures+1)); fi
check_status products "$BASE_URL/api/products"
if grep -q '^\[' "$TMP_DIR/products.body" && grep -q '"name"' "$TMP_DIR/products.body" && grep -q '"available"' "$TMP_DIR/products.body"; then echo '  products payload: PASS'; else echo '  products payload: REVIEW'; fi
check_status price_list "$BASE_URL/api/price-list"
if grep -q '^\[' "$TMP_DIR/price_list.body"; then echo '  price-list payload: PASS'; else echo '  price-list payload: REVIEW'; fi
check_status auth_me "$BASE_URL/api/auth/me"
if grep -q 'غير مسجل الدخول' "$TMP_DIR/auth_me.body"; then echo '  unauthenticated auth guard: PASS'; else echo '  unauthenticated auth guard: REVIEW'; fi
check_status create_order_unauth "$BASE_URL/api/create-order" POST '{}'
if [ "$(grep -o '"error"' "$TMP_DIR/create_order_unauth.body" | wc -l)" -ge 1 ]; then echo '  unauthenticated order guard: PASS'; else echo '  unauthenticated order guard: REVIEW'; fi
check_status public_store "$BASE_URL/store"
if grep -q 'fetchQueuedOrderStatus' "$TMP_DIR/public_store.body" && grep -q 'rab7na_order_idempotency_key' "$TMP_DIR/public_store.body"; then echo '  queued checkout markers: PASS'; else echo '  queued checkout markers: FAIL'; failures=$((failures+1)); fi
if grep -qi 'database_url\|safka_api_key\|api-safka-key' "$TMP_DIR/health.body" "$TMP_DIR/products.body" "$TMP_DIR/price_list.body" "$TMP_DIR/auth_me.body" "$TMP_DIR/create_order_unauth.body" "$TMP_DIR/public_store.body"; then echo '  secret exposure scan: FAIL'; failures=$((failures+1)); else echo '  secret exposure scan: PASS'; fi
if [ "$failures" -eq 0 ]; then echo 'PRODUCTION_READONLY_SUITE=PASS'; else echo "PRODUCTION_READONLY_SUITE=FAIL failures=$failures"; fi
exit "$failures"
