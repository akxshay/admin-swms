import dotenv from 'dotenv';
dotenv.config();

export interface MapsAdapter {
  reverseGeocode(lat: number, lng: number): Promise<{ formattedAddress: string; city: string; landmark?: string }>;
  calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number;
}

export class OsmMapsAdapter implements MapsAdapter {
  async reverseGeocode(lat: number, lng: number): Promise<{ formattedAddress: string; city: string; landmark?: string }> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SWMS-SmartWastePortal/1.0 (India Citizen Recycler)' },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        const road = data.address?.road || data.address?.suburb || 'Kadri Hills';
        const city = data.address?.city || data.address?.town || data.address?.state_district || 'Mangaluru';
        return {
          formattedAddress: data.display_name || `${road}, ${city}`,
          city,
          landmark: data.address?.neighbourhood || data.address?.suburb,
        };
      }
    } catch (e) {
      // Graceful fallback
    }
    return {
      formattedAddress: `Near Mangaluru City Center, Karnataka (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      city: 'Mangaluru',
      landmark: 'Dakshina Kannada',
    };
  }

  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }
}

export class GoogleMapsAdapter implements MapsAdapter {
  private apiKey: string;
  private fallback: OsmMapsAdapter;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    this.fallback = new OsmMapsAdapter();
  }

  async reverseGeocode(lat: number, lng: number): Promise<{ formattedAddress: string; city: string; landmark?: string }> {
    if (!this.apiKey) {
      return this.fallback.reverseGeocode(lat, lng);
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      const res = await fetch(url);
      const data = (await res.json()) as any;
      if (data.results && data.results[0]) {
        return {
          formattedAddress: data.results[0].formatted_address,
          city: 'Mangaluru',
        };
      }
    } catch (err) {
      console.error('Google Maps geocoding error:', err);
    }
    return this.fallback.reverseGeocode(lat, lng);
  }

  calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return this.fallback.calculateDistanceKm(lat1, lng1, lat2, lng2);
  }
}

const isGoogleMapsConfigured = Boolean(process.env.MAPS_PROVIDER === 'google' && process.env.GOOGLE_MAPS_API_KEY);
export const mapsAdapter: MapsAdapter = isGoogleMapsConfigured ? new GoogleMapsAdapter() : new OsmMapsAdapter();
