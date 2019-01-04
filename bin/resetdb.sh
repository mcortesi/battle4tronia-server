#!/usr/bin/env bash

function usage() {
    echo "Usage $0 (dev|test)" >&2
    exit 1
}

if [[ $# != 1 ]]; then
    usage
else
  case "$1" in
    test)
localdb="battlefortronia_test"
    ;;
    dev)
localdb="battlefortronia_dev"
    ;;
    *)
    usage
    ;;
  esac
fi

localdbuser="battlefortronia"
schemafile="$(dirname "${BASH_SOURCE[0]}")/../resources/db-schema.sql"

echo "            "
echo "🚩 ➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖ 🚩"
echo "🛢  ➡  🗑  Dropping database..."
dropdb -h localhost -U $localdbuser $localdb ||
{ echo Cannot drop local db ; exit 1; }

echo "            "
echo "🚩 ➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖ 🚩"
echo "✨  🛢  ✨  Creating database..."

createdb -U $localdbuser -h localhost $localdb ||
{ echo "Cannot create local db" ; exit; }

echo "            "
echo "🚩 ➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖➖ 🚩"
echo "📦  ➡️  🛢  Running Schema script..."
cat "$schemafile" | psql -h localhost $localdb -U $localdbuser ||
{ echo "Cannot apply dump" ; exit 1; }
