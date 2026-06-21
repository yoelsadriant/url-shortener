#!/bin/sh
set -e

AWS="aws --endpoint-url ${DYNAMODB_ENDPOINT:-http://dynamodb-local:8000}"

ensure_table() {
  table=$1
  index=$2
  hash_attr=$3
  index_attr=$4

  if $AWS dynamodb describe-table --table-name "$table" 2>/dev/null | grep -q "$index"; then
    echo "table '$table' already has $index"
    return
  fi

  $AWS dynamodb delete-table --table-name "$table" 2>/dev/null || true
  sleep 1
  $AWS dynamodb create-table \
    --table-name "$table" \
    --attribute-definitions \
      AttributeName="$hash_attr",AttributeType=S \
      AttributeName="$index_attr",AttributeType=S \
    --key-schema AttributeName="$hash_attr",KeyType=HASH \
    --global-secondary-indexes \
      "IndexName=$index,KeySchema=[{AttributeName=$index_attr,KeyType=HASH}],Projection={ProjectionType=ALL}" \
    --billing-mode PAY_PER_REQUEST
}

ensure_table "$URL_TABLE"  "$URL_USER_INDEX"      code   userId
ensure_table "$USER_TABLE" "$USER_USERNAME_INDEX" userId username
