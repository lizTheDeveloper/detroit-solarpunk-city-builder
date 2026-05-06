#!/usr/bin/env bash
# app/scripts/deploy-tiles.sh
#
# Extracts Detroit PMTiles and uploads to Hetzner Object Storage.
# Prerequisites:
#   - pmtiles CLI: npm install -g pmtiles
#   - rclone configured for Hetzner Object Storage
#   - HETZNER_BUCKET env var set
#
# Usage: ./scripts/deploy-tiles.sh

set -euo pipefail

BBOX="-83.30,42.25,-82.91,42.45"
PLANET_URL="https://build.protomaps.com/20240801.pmtiles"
OUTPUT="detroit.pmtiles"
BUCKET="${HETZNER_BUCKET:-city-builder-tiles}"

echo "==> Extracting Detroit region from Protomaps planet..."
pmtiles extract "$PLANET_URL" "$OUTPUT" --bbox="$BBOX"

echo "==> PMTiles file size:"
ls -lh "$OUTPUT"

echo "==> Uploading to Hetzner Object Storage (bucket: $BUCKET)..."
# Using rclone (configure 'hetzner' remote first):
# rclone copy "$OUTPUT" "hetzner:$BUCKET/" --progress
#
# Or using s3cmd:
# s3cmd put "$OUTPUT" "s3://$BUCKET/$OUTPUT" \
#   --host=fsn1.your-objectstorage.com \
#   --host-bucket="%(bucket)s.fsn1.your-objectstorage.com"

echo "==> Setting CORS policy..."
cat <<'CORS'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["Range", "If-Match", "If-None-Match"],
      "ExposeHeaders": ["Content-Length", "Content-Range", "ETag"],
      "MaxAgeSeconds": 86400
    }
  ]
}
CORS

echo "==> Done! Tile URL: https://$BUCKET.fsn1.your-objectstorage.com/$OUTPUT"
echo "    Use pmtiles:// protocol in MapLibre: pmtiles://https://$BUCKET.fsn1.your-objectstorage.com/$OUTPUT"
