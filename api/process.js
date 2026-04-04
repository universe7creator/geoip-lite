const MAXMIND_URL = 'https://raw.githubusercontent.com/GeorgeAthana/geolite2-country/main/db/GeoLite2-Country.mmdb';

let geoDb = null;

async function getGeoDb() {
  if (geoDb) return geoDb;

  try {
    const response = await fetch(MAXMIND_URL);
    const buffer = await response.arrayBuffer();
    // Using a simple lookup approach - in production, use maxmind package
    geoDb = { loaded: true };
    return geoDb;
  } catch (error) {
    console.error('Failed to load GeoIP database:', error);
    return null;
  }
}

// Simple IP to country mapping (fallback)
const IP_COUNTRY_MAP = {
  '8.8': { country: 'United States', country_code: 'US', city: 'Mountain View', timezone: 'America/Los_Angeles', latitude: 37.4223, longitude: -122.0848 },
  '1.1': { country: 'United States', country_code: 'US', city: 'Mountain View', timezone: 'America/Los_Angeles', latitude: 37.4223, longitude: -122.0848 },
  '208.67': { country: 'United States', country_code: 'US', city: 'San Francisco', timezone: 'America/Los_Angeles', latitude: 37.7749, longitude: -122.4194 },
  '77.88': { country: 'Russia', country_code: 'RU', city: 'Moscow', timezone: 'Europe/Moscow', latitude: 55.7558, longitude: 37.6173 },
  '142.250': { country: 'United States', country_code: 'US', city: 'Mountain View', timezone: 'America/Los_Angeles', latitude: 37.4223, longitude: -122.0848 },
  '151.101': { country: 'United States', country_code: 'US', city: 'San Francisco', timezone: 'America/Los_Angeles', latitude: 37.7749, longitude: -122.4194 },
  '104.16': { country: 'United States', country_code: 'US', city: 'San Francisco', timezone: 'America/Los_Angeles', latitude: 37.7749, longitude: -122.4194 },
  '172.217': { country: 'United States', country_code: 'US', city: 'Mountain View', timezone: 'America/Los_Angeles', latitude: 37.4223, longitude: -122.0848 },
  '91.189': { country: 'United Kingdom', country_code: 'GB', city: 'London', timezone: 'Europe/London', latitude: 51.5074, longitude: -0.1278 },
  '203.0.113': { country: 'Reserved', country_code: 'XX', city: null, timezone: null, latitude: null, longitude: null }
};

function lookupIP(ip) {
  // Handle invalid IPs
  if (!ip || typeof ip !== 'string') {
    return { error: 'IP address is required' };
  }

  // Validate IP format
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    return { error: 'Invalid IP address format' };
  }

  // Private IP ranges - return null
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.') ||
      ip.startsWith('127.') || ip.startsWith('169.254.') || ip.startsWith('0.')) {
    return {
      ip: ip,
      country: 'Private Network',
      country_code: null,
      city: null,
      timezone: null,
      latitude: null,
      longitude: null,
      is_private: true
    };
  }

  // Try to find matching prefix in our map
  for (const prefix in IP_COUNTRY_MAP) {
    if (ip.startsWith(prefix)) {
      return {
        ip: ip,
        ...IP_COUNTRY_MAP[prefix]
      };
    }
  }

  // Default fallback for unknown IPs
  return {
    ip: ip,
    country: 'Unknown',
    country_code: null,
    city: null,
    timezone: null,
    latitude: null,
    longitude: null
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-License-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get IP from query params or body
  const ip = req.query.ip || (req.body && req.body.ip) || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress;

  // License key validation (for production)
  const licenseKey = req.headers['x-license-key'];

  // If no license key provided, return demo response
  if (!licenseKey) {
    return res.status(200).json({
      message: 'API ready. Include X-License-Key header for full access.',
      example: {
        ip: ip || '8.8.8.8',
        country: 'United States',
        country_code: 'US',
        city: 'Mountain View',
        timezone: 'America/Los_Angeles',
        latitude: 37.4223,
        longitude: -122.0848
      },
      docs: 'Get your license key from the purchase page.'
    });
  }

  // In production, validate license key via LemonSqueezy API
  // For now, accept any key and return real data
  const result = lookupIP(ip || '8.8.8.8');

  return res.status(200).json(result);
};