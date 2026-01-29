import axios from 'axios';

export async function getCountryFromIP(ip: string): Promise<string> {
  try {
    // In development, local IPs won't work with geolocation APIs
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
      return 'KE'; // Default to Kenya for local dev
    }

    // Use a free geolocation API (e.g., ipapi.co or ip-api.com)
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    return response.data.country_code || 'KE';
  } catch (error) {
    console.error('Geolocation error:', error);
    return 'KE'; // Fallback
  }
}
