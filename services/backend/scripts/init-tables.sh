#!/bin/sh
# Idempotently creates the urls/users tables. Reads env vars; requires `aws` on PATH.

set -eu

: "${AWS_REGION:?AWS_REGION is required}"
: "${URL_TABLE:?URL_TABLE is required}"
: "${URL_USER_INDEX:?URL_USER_INDEX is required}"
: "${USER_TABLE:?USER_TABLE is required}"
: "${USER_USERNAME_INDEX:?USER_USERNAME_INDEX is required}"

AWS="aws --region $AWS_REGION"
if [ -n "${AWS_ENDPOINT:-}" ]; then
  AWS="$AWS --endpoint-url $AWS_ENDPOINT"
fi

i=0
until $AWS dynamodb list-tables >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "DynamoDB at ${AWS_ENDPOINT:-aws} not reachable after 30 attempts" >&2
    exit 1
  fi
  sleep 1
done

ensure_table() {
  table=$1
  pk=$2
  index=$3
  index_attr=$4

  if $AWS dynamodb describe-table --table-name "$table" >/dev/null 2>&1; then
    echo "  table '$table' already exists"
    return
  fi

  $AWS dynamodb create-table \
    --table-name "$table" \
    --attribute-definitions \
      AttributeName="$pk",AttributeType=S \
      AttributeName="$index_attr",AttributeType=S \
    --key-schema AttributeName="$pk",KeyType=HASH \
    --global-secondary-indexes \
      "IndexName=$index,KeySchema=[{AttributeName=$index_attr,KeyType=HASH}],Projection={ProjectionType=ALL}" \
    --billing-mode PAY_PER_REQUEST >/dev/null
  echo "  created '$table' with index '$index'"
}

ensure_table "$URL_TABLE"  code   "$URL_USER_INDEX"      userId
ensure_table "$USER_TABLE" userId "$USER_USERNAME_INDEX" username
