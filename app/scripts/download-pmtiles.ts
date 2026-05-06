// app/scripts/download-pmtiles.ts
async function main() {
  console.log('PMTiles self-hosting setup:');
  console.log('');
  console.log('1. Install pmtiles CLI: npm install -g pmtiles');
  console.log('2. Download planet extract (or use Protomaps build service):');
  console.log('   pmtiles extract https://build.protomaps.com/20240801.pmtiles detroit.pmtiles --bbox="-83.30,42.25,-82.91,42.45"');
  console.log('3. Upload to Hetzner Object Storage:');
  console.log('   - Create a Hetzner Object Storage bucket');
  console.log('   - Enable CORS for your game domain');
  console.log('   - Upload detroit.pmtiles to the bucket');
  console.log('4. Configure CDN (optional): Hetzner + Cloudflare for caching');
  console.log('');
  console.log('For dev, use OpenFreeMap tiles (no setup needed).');
}

main();
