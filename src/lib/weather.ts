export type WeatherResult = {
  locationName: string;
  updatedAtSeconds: number;
  temperatureC: number;
  weatherCode: number;
};

export function formatTemperature(celsius: number): string {
  if (typeof celsius !== 'number' || Number.isNaN(celsius)) return '–°';
  return `${Math.round(celsius)}°C`;
}

// Maps Open-Meteo weather codes (WMO) to an icon and label.
// Docs: https://open-meteo.com
export function getIconAndLabel(weatherCode: number): { icon: string; label: string } {
  if (typeof weatherCode !== 'number') {
    return { icon: '☁️', label: 'Unknown' };
  }

  if (weatherCode === 0) return { icon: '☀️', label: 'Clear sky' };
  if (weatherCode === 1 || weatherCode === 2) return { icon: '🌤️', label: 'Partly cloudy' };
  if (weatherCode === 3) return { icon: '☁️', label: 'Overcast' };
  if (weatherCode === 45 || weatherCode === 48) return { icon: '🌫️', label: 'Foggy' };
  if (weatherCode >= 51 && weatherCode <= 57) return { icon: '🌦️', label: 'Drizzle' };
  if (weatherCode >= 61 && weatherCode <= 67) return { icon: '🌧️', label: 'Rain' };
  if (weatherCode >= 71 && weatherCode <= 77) return { icon: '❄️', label: 'Snow' };
  if (weatherCode >= 80 && weatherCode <= 82) return { icon: '🌧️', label: 'Rain showers' };
  if (weatherCode >= 85 && weatherCode <= 86) return { icon: '🌨️', label: 'Snow showers' };
  if (weatherCode >= 95 && weatherCode <= 99) return { icon: '⛈️', label: 'Thunderstorm' };

  return { icon: '☁️', label: 'Unknown' };
}

export function formatUpdatedTime(timestampSeconds: number): string {
  const date = timestampSeconds ? new Date(timestampSeconds * 1000) : new Date();
  return `Updated at ${date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export async function fetchWeatherForLocation(location: string): Promise<WeatherResult> {
  type OpenMeteoGeocodingResponse = {
    results?: Array<{
      name: string;
      latitude: number;
      longitude: number;
    }>;
  };

  type OpenMeteoForecastResponse = {
    current?: {
      time?: string;
      temperature_2m?: number;
      weather_code?: number;
    };
  };

  // First, turn the location name into coordinates using Open-Meteo's geocoding API.
  const geoParams = new URLSearchParams({
    name: location,
    count: '1',
    language: 'en',
    format: 'json',
  });

  const geoResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${geoParams.toString()}`
  );
  if (!geoResponse.ok) {
    throw new Error(`Geocoding request failed (${geoResponse.status})`);
  }

  const geoData = (await geoResponse.json()) as OpenMeteoGeocodingResponse;
  if (!geoData?.results || geoData.results.length === 0) {
    const err = new Error('CITY_NOT_FOUND') as Error & { code?: string };
    err.code = 'CITY_NOT_FOUND';
    throw err;
  }

  const place = geoData.results[0];

  // Then, fetch the current weather for those coordinates.
  const forecastParams = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,weather_code',
    timezone: 'auto',
  });

  const forecastResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?${forecastParams.toString()}`
  );
  if (!forecastResponse.ok) {
    throw new Error(`Weather request failed (${forecastResponse.status})`);
  }

  const forecast = (await forecastResponse.json()) as OpenMeteoForecastResponse;
  const current = forecast?.current || {};

  const updatedAtSeconds = current.time
    ? Date.parse(current.time) / 1000
    : Math.floor(Date.now() / 1000);

  return {
    locationName: place.name,
    updatedAtSeconds,
    temperatureC: current.temperature_2m ?? NaN,
    weatherCode: current.weather_code ?? -1,
  };
}

