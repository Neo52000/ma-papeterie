const https = require('https');

const CHAUMONT_LAT = 48.111338;
const CHAUMONT_LNG = 5.138481;
const DEFAULT_RADIUS_KM = 20;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function isInZone(lat, lng, centerLat = CHAUMONT_LAT, centerLng = CHAUMONT_LNG, radiusKm = DEFAULT_RADIUS_KM) {
  if (!lat || !lng) return false;
  const dist = haversine(lat, lng, centerLat, centerLng);
  return dist <= radiusKm;
}

function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(address);
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encoded}&limit=1`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.features && json.features.length > 0) {
            const [lng, lat] = json.features[0].geometry.coordinates;
            resolve({ lat, lng });
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

module.exports = { haversine, isInZone, geocodeAddress, CHAUMONT_LAT, CHAUMONT_LNG };
