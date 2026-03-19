const weatherSection = document.getElementById('weather-section');
const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');

const weatherIconEl = document.getElementById('weather-icon');
const weatherLabelEl = document.getElementById('weather-label');
const weatherTempEl = document.getElementById('weather-temp');
const weatherLocationEl = document.getElementById('weather-location');
const weatherUpdatedEl = document.getElementById('weather-updated');

const locationInput = document.getElementById('location-input');
const searchBtn = document.getElementById('search-btn');
const searchError = document.getElementById('search-error');
const searchHint = document.getElementById('search-hint');
const searchForm = document.getElementById('search-form');

function showSection(section) {
  weatherSection.hidden = section !== 'weather';
  errorSection.hidden = section !== 'error';
}

function setGlobalError(message) {
  errorMessage.textContent = message;
}

function setSearchError(message) {
  if (!message) {
    searchError.hidden = true;
    searchError.textContent = '';
    locationInput.setAttribute('aria-invalid', 'false');
    return;
  }
  searchError.hidden = false;
  searchError.textContent = message;
  locationInput.setAttribute('aria-invalid', 'true');
}

function formatTemperature(celsius) {
  if (typeof celsius !== 'number' || Number.isNaN(celsius)) {
    return '–°';
  }
  return `${Math.round(celsius)}°C`;
}

// Maps Open-Meteo weather codes (WMO) to an icon and label.
// Codes: https://open-meteo.com
function getIconAndLabel(weatherCode) {
  if (typeof weatherCode !== 'number') {
    return { icon: '☁️', label: 'Unknown' };
  }

  if (weatherCode === 0) {
    return { icon: '☀️', label: 'Clear sky' };
  }
  if (weatherCode === 1 || weatherCode === 2) {
    return { icon: '🌤️', label: 'Partly cloudy' };
  }
  if (weatherCode === 3) {
    return { icon: '☁️', label: 'Overcast' };
  }
  if (weatherCode === 45 || weatherCode === 48) {
    return { icon: '🌫️', label: 'Foggy' };
  }
  if (weatherCode >= 51 && weatherCode <= 57) {
    return { icon: '🌦️', label: 'Drizzle' };
  }
  if (weatherCode >= 61 && weatherCode <= 67) {
    return { icon: '🌧️', label: 'Rain' };
  }
  if (weatherCode >= 71 && weatherCode <= 77) {
    return { icon: '❄️', label: 'Snow' };
  }
  if (weatherCode >= 80 && weatherCode <= 82) {
    return { icon: '🌧️', label: 'Rain showers' };
  }
  if (weatherCode >= 85 && weatherCode <= 86) {
    return { icon: '🌨️', label: 'Snow showers' };
  }
  if (weatherCode >= 95 && weatherCode <= 99) {
    return { icon: '⛈️', label: 'Thunderstorm' };
  }

  return { icon: '☁️', label: 'Unknown' };
}

function formatUpdatedTime(timestampSeconds) {
  const date = timestampSeconds ? new Date(timestampSeconds * 1000) : new Date();
  return `Updated at ${date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

async function fetchWeatherForLocation(location) {
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

  const geoData = await geoResponse.json();
  if (!geoData.results || !geoData.results.length) {
    const err = new Error('CITY_NOT_FOUND');
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

  const forecast = await forecastResponse.json();
  const current = forecast.current || {};

  const unixTime = current.time ? Date.parse(current.time) / 1000 : Math.floor(Date.now() / 1000);

  // Normalize into the shape expected by updateWeatherUI
  return {
    name: place.name,
    dt: unixTime,
    coord: { lat: place.latitude, lon: place.longitude },
    main: { temp: current.temperature_2m },
    weather: [{ id: current.weather_code }],
  };
}

function updateWeatherUI(data) {
  const weather = Array.isArray(data.weather) && data.weather[0] ? data.weather[0] : {};
  const { icon, label } = getIconAndLabel(weather.id);

  weatherIconEl.textContent = icon;
  weatherLabelEl.textContent = label;
  weatherTempEl.textContent = formatTemperature(
    data.main && typeof data.main.temp === 'number' ? data.main.temp : NaN
  );

  const locationLabel =
    typeof data.name === 'string' && data.name.trim() ? data.name : 'Unknown';

  weatherLocationEl.textContent = locationLabel;
  weatherUpdatedEl.textContent = formatUpdatedTime(data.dt);
}

function initialize() {
  let isLoading = false;
  const initialHintText = searchHint.textContent;

  // Initial UX: no weather/error placeholders until a successful search.
  weatherSection.hidden = true;
  errorSection.hidden = true;
  weatherSection.setAttribute('aria-busy', 'false');
  errorMessage.textContent = '';
  setSearchError('');

  async function submitSearch() {
    if (isLoading) return;

    const raw = locationInput.value.trim();
    if (!raw) {
      setSearchError('Please enter a location name.');
      return;
    }

    isLoading = true;
    searchHint.textContent = 'Loading...';
    searchBtn.disabled = true;
    locationInput.disabled = true;
    weatherSection.setAttribute('aria-busy', 'true');

    setSearchError('');
    setGlobalError('');

    try {
      const data = await fetchWeatherForLocation(raw);
      updateWeatherUI(data);
      showSection('weather');
    } catch (error) {
      console.error(error);
      let message =
        'We were unable to fetch weather data right now. Please try again in a moment.';

      if (error && typeof error.message === 'string') {
        if (error.message.includes('CITY_NOT_FOUND') || error.code === 'CITY_NOT_FOUND') {
          message =
            'We could not find that location. Please check the spelling and try again.';
        }
      }

      setGlobalError(message);
      showSection('error');
    } finally {
      isLoading = false;
      searchHint.textContent = initialHintText;
      searchBtn.disabled = false;
      locationInput.disabled = false;
      weatherSection.setAttribute('aria-busy', 'false');
    }
  }

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    submitSearch();
  });
}

document.addEventListener('DOMContentLoaded', initialize);

