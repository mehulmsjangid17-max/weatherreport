/**
 * iOS Club — Real-Time Weather & Air Quality Dashboard
 * Vanilla JavaScript (ES6+)
 * Open-Meteo REST APIs (Geocoding, Forecast & Air Quality)
 */

// Default Configuration (Optimized for Indian Places)
const DEFAULT_CONFIG = {
  DEFAULT_CITY: 'New Delhi',
  DEFAULT_COUNTRY: 'India',
  COUNTRY_CODE: 'IN',
  WEATHER_API_KEY: '',
  AIR_QUALITY_API_KEY: '',
  GEO_API_URL: 'https://geocoding-api.open-meteo.com/v1/search',
  FORECAST_API_URL: 'https://api.open-meteo.com/v1/forecast',
  AIR_QUALITY_API_URL: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  REVERSE_GEO_API_URL: 'https://api.bigdatacloud.net/data/reverse-geocode-client'
};

let appConfig = { ...DEFAULT_CONFIG };

// Asynchronously loads .env or env.js configuration
async function loadEnvConfig() {
  // 1. Merge window.ENV from env.js if defined
  if (window.ENV && typeof window.ENV === 'object') {
    appConfig = { ...appConfig, ...window.ENV };
  }

  // 2. Fetch and parse .env file dynamically if running on local/remote server
  try {
    const res = await fetch('./.env', { cache: 'no-store' });
    if (res.ok) {
      const text = await res.text();
      const lines = text.split(/\r?\n/);
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key) appConfig[key] = val;
        }
      });
      console.log('[iOS Club] Loaded configuration from .env successfully.');
    }
  } catch (err) {
    // Silently continue with window.ENV / defaults if .env fetch is blocked or offline
  }

  window.appConfig = appConfig;
}

// App state
const DEFAULT_INDIAN_RECENTS = ['New Delhi', 'Mumbai', 'Bengaluru', 'Ahmedabad', 'Jaipur', 'Kolkata'];
let currentUnit = localStorage.getItem('weather_unit') || 'C';
let currentTheme = localStorage.getItem('weather_theme') || 'dark';
let savedRecents = localStorage.getItem('weather_recents');
let recentSearches = savedRecents ? JSON.parse(savedRecents) : [...DEFAULT_INDIAN_RECENTS];
let currentData = {
  weather: null,
  aqi: null,
  location: null
};
let clockTimer = null;
let debounceTimer = null;

// DOM Elements
const searchForm = document.getElementById('searchForm');
const cityInput = document.getElementById('citySearchInput');
const clearInputBtn = document.getElementById('clearSearchInputBtn');
const geoBtn = document.getElementById('geolocationBtn');
const suggestionsBox = document.getElementById('searchSuggestions');
const recentsList = document.getElementById('recentSearchesList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const toastContainer = document.getElementById('toastContainer');

// Weather Card Elements
const cityNameEl = document.getElementById('cityName');
const countryNameEl = document.getElementById('countryName');
const detectedBadge = document.getElementById('detectedBadge');
const currentDateEl = document.getElementById('currentDate');
const currentTimeEl = document.getElementById('currentTime');
const weatherIconEl = document.getElementById('currentWeatherIcon');
const currentTempEl = document.getElementById('currentTemp');
const tempUnitEl = document.getElementById('currentTempUnit');
const conditionEl = document.getElementById('currentCondition');
const feelsLikeEl = document.getElementById('currentFeelsLike');
const humidityEl = document.getElementById('currentHumidity');
const windEl = document.getElementById('currentWind');
const precipEl = document.getElementById('currentPrecipitation');

// Forecast & AQI Elements
const forecastGrid = document.getElementById('forecastGrid');
const aqiValueEl = document.getElementById('aqiValue');
const aqiBadgeEl = document.getElementById('aqiStatusBadge');
const aqiMarker = document.getElementById('aqiMeterMarker');
const aqiRecEl = document.getElementById('aqiRecommendation');
const pm25ValEl = document.getElementById('pm25Val');
const pm25Fill = document.getElementById('pm25Fill');
const pm10ValEl = document.getElementById('pm10Val');
const pm10Fill = document.getElementById('pm10Fill');

// Detailed Stats Elements
const detailHumidityEl = document.getElementById('detailHumidity');
const detailHumidityDesc = document.getElementById('detailHumidityDesc');
const detailWindSpeedEl = document.getElementById('detailWindSpeed');
const detailWindUnitEl = document.getElementById('detailWindUnit');
const compassArrow = document.getElementById('compassArrow');
const detailWindDirEl = document.getElementById('detailWindDirection');
const detailCloudEl = document.getElementById('detailCloudCover');
const detailPressureEl = document.getElementById('detailPressure');
const detailVisibilityEl = document.getElementById('detailVisibility');
const detailVisUnitEl = document.getElementById('detailVisUnit');
const detailPrecipEl = document.getElementById('detailPrecipitation');

// Controls
const celsiusBtn = document.getElementById('celsiusBtn');
const fahrenheitBtn = document.getElementById('fahrenheitBtn');
const themeToggleBtn = document.getElementById('themeToggle');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinks = document.getElementById('navLinks');
const navLinkItems = document.querySelectorAll('.nav-link');

// -------------------------------------------------------------
// Weather Interpretation (WMO codes to text & icons)
// -------------------------------------------------------------
function getWeatherDetails(code) {
  switch (code) {
    case 0:
      return {
        text: 'Clear Sky',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="32" cy="32" r="14" fill="#fbbf24" stroke="#f59e0b"/>
          <line x1="32" y1="6" x2="32" y2="12" stroke="#f59e0b"/>
          <line x1="32" y1="52" x2="32" y2="58" stroke="#f59e0b"/>
          <line x1="6" y1="32" x2="12" y2="32" stroke="#f59e0b"/>
          <line x1="52" y1="32" x2="58" y2="32" stroke="#f59e0b"/>
          <line x1="13.6" y1="13.6" x2="17.8" y2="17.8" stroke="#f59e0b"/>
          <line x1="46.2" y1="46.2" x2="50.4" y2="50.4" stroke="#f59e0b"/>
          <line x1="13.6" y1="50.4" x2="17.8" y2="46.2" stroke="#f59e0b"/>
          <line x1="46.2" y1="17.8" x2="50.4" y2="13.6" stroke="#f59e0b"/>
        </svg>`
      };
    case 1:
      return {
        text: 'Mainly Clear',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="26" cy="26" r="11" fill="#fbbf24" stroke="#f59e0b"/>
          <path d="M46 48a12 12 0 0 0-8-20 12.3 12.3 0 0 0-4.3.8A14 14 0 1 0 20 48Z" fill="#94a3b8" fill-opacity="0.3" stroke="#cbd5e1"/>
        </svg>`
      };
    case 2:
      return {
        text: 'Partly Cloudy',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="24" cy="24" r="10" fill="#fbbf24" stroke="#f59e0b"/>
          <path d="M50 48H22a10 10 0 1 1 2.3-19.7A14 14 0 0 1 50 35a9 9 0 0 1 0 13Z" fill="#64748b" fill-opacity="0.4" stroke="#94a3b8"/>
        </svg>`
      };
    case 3:
      return {
        text: 'Overcast',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M50 46H20a12 12 0 1 1 2.8-23.7A16 16 0 0 1 50 30a11 11 0 0 1 0 16Z" fill="#475569" fill-opacity="0.5" stroke="#94a3b8"/>
        </svg>`
      };
    case 45:
    case 48:
      return {
        text: 'Fog / Mist',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="16" y1="24" x2="48" y2="24" stroke="#94a3b8"/>
          <line x1="12" y1="32" x2="52" y2="32" stroke="#cbd5e1"/>
          <line x1="18" y1="40" x2="46" y2="40" stroke="#94a3b8"/>
          <line x1="22" y1="48" x2="42" y2="48" stroke="#64748b"/>
        </svg>`
      };
    case 51:
    case 53:
    case 55:
      return {
        text: 'Drizzle',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M48 38H20a10 10 0 1 1 2.3-19.7A13 13 0 0 1 48 26a8 8 0 0 1 0 12Z" fill="#475569" fill-opacity="0.4" stroke="#94a3b8"/>
          <line x1="24" y1="44" x2="22" y2="50" stroke="#38bdf8"/>
          <line x1="34" y1="44" x2="32" y2="50" stroke="#38bdf8"/>
          <line x1="44" y1="44" x2="42" y2="50" stroke="#38bdf8"/>
        </svg>`
      };
    case 61:
    case 63:
    case 65:
      return {
        text: code === 61 ? 'Light Rain' : code === 63 ? 'Moderate Rain' : 'Heavy Rain',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M48 36H20a10 10 0 1 1 2.3-19.7A13 13 0 0 1 48 24a8 8 0 0 1 0 12Z" fill="#334155" fill-opacity="0.5" stroke="#94a3b8"/>
          <line x1="22" y1="42" x2="18" y2="54" stroke="#38bdf8" stroke-width="3"/>
          <line x1="32" y1="42" x2="28" y2="54" stroke="#38bdf8" stroke-width="3"/>
          <line x1="42" y1="42" x2="38" y2="54" stroke="#38bdf8" stroke-width="3"/>
        </svg>`
      };
    case 71:
    case 73:
    case 75:
    case 77:
      return {
        text: 'Snowfall',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M48 36H20a10 10 0 1 1 2.3-19.7A13 13 0 0 1 48 24a8 8 0 0 1 0 12Z" fill="#334155" fill-opacity="0.5" stroke="#cbd5e1"/>
          <circle cx="22" cy="46" r="2.5" fill="#e2e8f0"/>
          <circle cx="32" cy="52" r="2.5" fill="#e2e8f0"/>
          <circle cx="42" cy="46" r="2.5" fill="#e2e8f0"/>
        </svg>`
      };
    case 80:
    case 81:
    case 82:
      return {
        text: 'Rain Showers',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="24" cy="22" r="8" fill="#fbbf24" stroke="#f59e0b"/>
          <path d="M50 38H26a9 9 0 0 1 1.7-17.7A12 12 0 0 1 50 27a7.5 7.5 0 0 1 0 11Z" fill="#334155" fill-opacity="0.5" stroke="#94a3b8"/>
          <line x1="28" y1="44" x2="24" y2="54" stroke="#38bdf8" stroke-width="2.5"/>
          <line x1="38" y1="44" x2="34" y2="54" stroke="#38bdf8" stroke-width="2.5"/>
          <line x1="48" y1="44" x2="44" y2="54" stroke="#38bdf8" stroke-width="2.5"/>
        </svg>`
      };
    case 95:
    case 96:
    case 99:
      return {
        text: 'Thunderstorm',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M48 34H20a10 10 0 1 1 2.3-19.7A13 13 0 0 1 48 22a8 8 0 0 1 0 12Z" fill="#1e293b" fill-opacity="0.6" stroke="#64748b"/>
          <polygon points="32 36 26 46 33 46 29 56 40 44 33 44 38 36" fill="#fbbf24" stroke="#f59e0b"/>
        </svg>`
      };
    default:
      return {
        text: 'Partly Cloudy',
        icon: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="32" cy="32" r="12" fill="#fbbf24" stroke="#f59e0b"/>
        </svg>`
      };
  }
}

// -------------------------------------------------------------
// Formatters & Conversions
// -------------------------------------------------------------
function convertTemp(celsius) {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return '--';
  return currentUnit === 'F' ? Math.round((celsius * 9) / 5 + 32) : Math.round(celsius);
}

function convertSpeed(kmh) {
  if (kmh === null || kmh === undefined || isNaN(kmh)) {
    return { val: '--', unit: currentUnit === 'F' ? 'mph' : 'km/h' };
  }
  if (currentUnit === 'F') {
    return { val: Math.round(kmh * 0.621371), unit: 'mph' };
  }
  return { val: Math.round(kmh), unit: 'km/h' };
}

function convertVisibility(meters) {
  if (!meters || isNaN(meters)) return { val: '--', unit: currentUnit === 'F' ? 'mi' : 'km' };
  if (currentUnit === 'F') {
    return { val: (meters / 1609.34).toFixed(1), unit: 'mi' };
  }
  return { val: (meters / 1000).toFixed(1), unit: 'km' };
}

function getWindDirection(deg) {
  if (deg === null || deg === undefined || isNaN(deg)) return '--';
  const cardinal = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return `${deg}° (${cardinal[index]})`;
}

// AQI calculations (US EPA Standard)
function parseAQI(aqi) {
  if (aqi <= 50) {
    return {
      label: 'Good',
      color: '#10b981',
      percent: Math.min(Math.max((aqi / 50) * 25, 4), 25),
      advice: 'Air quality is satisfactory and poses little or no health risk. Perfect for outdoor activities!'
    };
  } else if (aqi <= 100) {
    return {
      label: 'Moderate',
      color: '#f59e0b',
      percent: 25 + ((aqi - 50) / 50) * 25,
      advice: 'Air quality is acceptable. Very sensitive individuals should consider taking it easier outdoors.'
    };
  } else if (aqi <= 150) {
    return {
      label: 'Unhealthy (Sensitive)',
      color: '#f97316',
      percent: 50 + ((aqi - 100) / 50) * 25,
      advice: 'Sensitive individuals may experience breathing discomfort. General public should limit heavy exertion.'
    };
  } else if (aqi <= 200) {
    return {
      label: 'Unhealthy',
      color: '#ef4444',
      percent: 75 + ((aqi - 150) / 50) * 15,
      advice: 'Everyone may experience irritation. Sensitive groups should stay indoors if possible.'
    };
  } else if (aqi <= 300) {
    return {
      label: 'Very Unhealthy',
      color: '#8b5cf6',
      percent: 90 + ((aqi - 200) / 100) * 8,
      advice: 'Health alert: Risk of serious health effects for everyone. Avoid strenuous outdoor activities.'
    };
  } else {
    return {
      label: 'Hazardous',
      color: '#7f1d1d',
      percent: 98,
      advice: 'Emergency health warning: Everyone should avoid all outdoor physical activity and keep windows shut.'
    };
  }
}

// -------------------------------------------------------------
// Toast Alerts & Loading Spinner
// -------------------------------------------------------------
function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  toast.innerHTML = `
    <span>${message}</span>
    <button type="button" class="toast-close-btn" aria-label="Close">
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="18" x2="18" y2="6"></line>
      </svg>
    </button>
  `;

  const closeBtn = toast.querySelector('.toast-close-btn');
  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 250);
  };

  closeBtn.addEventListener('click', dismiss);
  toastContainer.appendChild(toast);
  if (duration > 0) setTimeout(dismiss, duration);
}

function showLoading(state, text = 'Fetching weather data...') {
  if (!loadingOverlay) return;
  if (state) {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// API Fetchers
// -------------------------------------------------------------
async function fetchCityCoordinates(city) {
  const geoUrl = appConfig.GEO_API_URL || 'https://geocoding-api.open-meteo.com/v1/search';
  const url = `${geoUrl}?name=${encodeURIComponent(city.trim())}&count=10&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding service unavailable');
  const data = await res.json();
  const results = data.results || [];

  // Prioritize Indian locations if configured for India
  if (appConfig.COUNTRY_CODE === 'IN') {
    results.sort((a, b) => {
      const aIsIndia = a.country_code === 'IN' || (a.country && a.country.toLowerCase() === 'india');
      const bIsIndia = b.country_code === 'IN' || (b.country && b.country.toLowerCase() === 'india');
      if (aIsIndia && !bIsIndia) return -1;
      if (!aIsIndia && bIsIndia) return 1;
      return 0;
    });
  }

  return results;
}

async function fetchForecastData(lat, lon) {
  const forecastUrl = appConfig.FORECAST_API_URL || 'https://api.open-meteo.com/v1/forecast';
  let url = `${forecastUrl}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  if (appConfig.WEATHER_API_KEY) {
    url += `&apikey=${encodeURIComponent(appConfig.WEATHER_API_KEY)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Forecast service unavailable');
  return await res.json();
}

async function fetchAirQualityData(lat, lon) {
  const aqiUrl = appConfig.AIR_QUALITY_API_URL || 'https://air-quality-api.open-meteo.com/v1/air-quality';
  let url = `${aqiUrl}?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5&timezone=auto`;
  if (appConfig.AIR_QUALITY_API_KEY) {
    url += `&apikey=${encodeURIComponent(appConfig.AIR_QUALITY_API_KEY)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Air quality service unavailable');
  return await res.json();
}

async function reverseLookup(lat, lon) {
  try {
    const revUrl = appConfig.REVERSE_GEO_API_URL || 'https://api.bigdatacloud.net/data/reverse-geocode-client';
    const url = `${revUrl}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Reverse geocode failed');
    const data = await res.json();
    return {
      city: data.city || data.locality || data.principalSubdivision || 'Detected Location',
      country: data.countryName || ''
    };
  } catch {
    return { city: `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`, country: '' };
  }
}

// -------------------------------------------------------------
// Core Controller: Load & Render
// -------------------------------------------------------------
async function loadCityWeather(location) {
  if (!navigator.onLine) {
    showToast('Please check your internet connection.', 'error');
    return;
  }

  showLoading(true, `Loading weather for ${location.name}...`);

  try {
    const [weatherRes, aqiRes] = await Promise.all([
      fetchForecastData(location.lat, location.lon),
      fetchAirQualityData(location.lat, location.lon)
    ]);

    currentData.weather = weatherRes;
    currentData.aqi = aqiRes;
    currentData.location = {
      ...location,
      timezone: weatherRes.timezone || 'UTC'
    };

    // Save to recents if not a raw coordinate label
    if (!location.name.startsWith('Lat ')) {
      addRecentSearch(location.name);
    }
    localStorage.setItem('weather_last_location', JSON.stringify(currentData.location));

    // Render all cards
    renderCurrentWeather();
    renderForecast();
    renderAirQuality();
    renderDetailedStats();
    updateLiveClock();

    showLoading(false);
    showToast(`Updated weather for ${location.name}`, 'success', 2200);

  } catch (err) {
    console.error('Data error:', err);
    showLoading(false);
    showToast('Unable to fetch weather data. Please try again later.', 'error');
  }
}

function renderCurrentWeather() {
  const loc = currentData.location;
  const current = currentData.weather?.current;
  if (!current) return;

  cityNameEl.textContent = loc.name;
  countryNameEl.textContent = loc.admin1 ? `${loc.admin1}, ${loc.country}` : loc.country;
  
  if (loc.isDetected) {
    detectedBadge.classList.remove('hidden');
  } else {
    detectedBadge.classList.add('hidden');
  }

  const weather = getWeatherDetails(current.weather_code);
  conditionEl.textContent = weather.text;
  weatherIconEl.innerHTML = weather.icon;

  currentTempEl.textContent = convertTemp(current.temperature_2m);
  tempUnitEl.textContent = `°${currentUnit}`;

  feelsLikeEl.textContent = `${convertTemp(current.apparent_temperature)}°${currentUnit}`;
  humidityEl.textContent = `${Math.round(current.relative_humidity_2m)}%`;

  const wind = convertSpeed(current.wind_speed_10m);
  windEl.textContent = `${wind.val} ${wind.unit}`;
  precipEl.textContent = `${(current.precipitation || 0).toFixed(1)} mm`;
}

function renderForecast() {
  const daily = currentData.weather?.daily;
  if (!daily || !forecastGrid) return;

  forecastGrid.innerHTML = '';
  const total = daily.time.length;
  const start = total >= 6 ? 1 : 0; // prefer next 5 days
  const daysToShow = 5;

  for (let i = start; i < start + daysToShow && i < total; i++) {
    const dateStr = daily.time[i];
    const date = new Date(dateStr + 'T00:00:00');
    
    const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weather = getWeatherDetails(daily.weather_code[i]);
    const maxT = convertTemp(daily.temperature_2m_max[i]);
    const minT = convertTemp(daily.temperature_2m_min[i]);
    const rainProb = daily.precipitation_probability_max[i] ?? 0;

    const card = document.createElement('div');
    card.className = 'forecast-card glass-card';
    card.innerHTML = `
      <div class="forecast-day-wrap">
        <div class="forecast-day">${dayName}</div>
        <div class="forecast-date">${formattedDate}</div>
      </div>
      <div class="forecast-icon">${weather.icon}</div>
      <div class="forecast-condition">${weather.text}</div>
      <div class="forecast-temp-range">
        <span class="temp-max">${maxT}°</span>
        <span class="temp-min">${minT}°</span>
      </div>
      <div class="forecast-rain-prob" title="Rain probability">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
        </svg>
        <span>${rainProb}%</span>
      </div>
    `;
    forecastGrid.appendChild(card);
  }
}

function renderAirQuality() {
  const aqiCurrent = currentData.aqi?.current;
  if (!aqiCurrent) return;

  const rawAqi = aqiCurrent.us_aqi ?? aqiCurrent.european_aqi ?? 0;
  const info = parseAQI(rawAqi);

  aqiValueEl.textContent = rawAqi;
  aqiValueEl.style.color = info.color;

  aqiBadgeEl.textContent = info.label;
  aqiBadgeEl.style.color = info.color;
  aqiBadgeEl.style.borderColor = info.color;
  aqiBadgeEl.style.backgroundColor = `${info.color}20`;

  if (aqiMarker) aqiMarker.style.left = `${info.percent}%`;
  aqiRecEl.textContent = info.advice;

  const pm25 = aqiCurrent.pm2_5 !== undefined ? aqiCurrent.pm2_5.toFixed(1) : '--';
  const pm10 = aqiCurrent.pm10 !== undefined ? aqiCurrent.pm10.toFixed(1) : '--';
  pm25ValEl.textContent = pm25;
  pm10ValEl.textContent = pm10;

  if (pm25Fill && aqiCurrent.pm2_5 !== undefined) {
    const pct = Math.min(Math.round((aqiCurrent.pm2_5 / 60) * 100), 100);
    pm25Fill.style.width = `${Math.max(pct, 6)}%`;
  }
  if (pm10Fill && aqiCurrent.pm10 !== undefined) {
    const pct = Math.min(Math.round((aqiCurrent.pm10 / 100) * 100), 100);
    pm10Fill.style.width = `${Math.max(pct, 6)}%`;
  }
}

function renderDetailedStats() {
  const current = currentData.weather?.current;
  if (!current) return;

  // Humidity
  detailHumidityEl.textContent = Math.round(current.relative_humidity_2m);
  if (current.relative_humidity_2m < 35) {
    detailHumidityDesc.textContent = 'Dry air — drink extra water';
  } else if (current.relative_humidity_2m > 65) {
    detailHumidityDesc.textContent = 'High humidity — muggy feel';
  } else {
    detailHumidityDesc.textContent = 'Comfortable moisture levels';
  }

  // Wind
  const wind = convertSpeed(current.wind_speed_10m);
  detailWindSpeedEl.textContent = wind.val;
  detailWindUnitEl.textContent = wind.unit;

  const deg = current.wind_direction_10m ?? 0;
  if (compassArrow) compassArrow.style.transform = `rotate(${deg}deg)`;
  detailWindDirEl.textContent = getWindDirection(deg);

  // Cloud cover, pressure, visibility, precipitation
  detailCloudEl.textContent = Math.round(current.cloud_cover ?? 0);
  detailPressureEl.textContent = Math.round(current.surface_pressure ?? 1013);

  const vis = convertVisibility(current.visibility);
  detailVisibilityEl.textContent = vis.val;
  detailVisUnitEl.textContent = vis.unit;

  detailPrecipEl.textContent = (current.precipitation ?? 0).toFixed(1);
}

function updateLiveClock() {
  if (clockTimer) clearInterval(clockTimer);

  const tick = () => {
    try {
      const now = new Date();
      const tz = currentData.location?.timezone || 'UTC';

      currentDateEl.textContent = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(now);

      currentTimeEl.textContent = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(now);
    } catch {
      const now = new Date();
      currentDateEl.textContent = now.toLocaleDateString();
      currentTimeEl.textContent = now.toLocaleTimeString();
    }
  };

  tick();
  clockTimer = setInterval(tick, 1000);
}

// -------------------------------------------------------------
// Recent Searches & LocalStorage
// -------------------------------------------------------------
function addRecentSearch(cityName) {
  if (!cityName || !cityName.trim()) return;
  const name = cityName.trim();
  
  // Deduplicate and move to top
  recentSearches = recentSearches.filter(item => item.toLowerCase() !== name.toLowerCase());
  recentSearches.unshift(name);
  if (recentSearches.length > 6) recentSearches.pop();

  localStorage.setItem('weather_recents', JSON.stringify(recentSearches));
  renderRecentSearches();
}

function renderRecentSearches() {
  if (!recentsList) return;
  recentsList.innerHTML = '';

  if (recentSearches.length === 0) {
    recentsList.innerHTML = '<span class="no-recents-text">No recent searches yet. Search any city above!</span>';
    return;
  }

  recentSearches.forEach(city => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'recent-tag';
    btn.innerHTML = `
      <span>${city}</span>
      <span class="recent-tag-remove" title="Remove" aria-hidden="true">&times;</span>
    `;

    btn.addEventListener('click', (e) => {
      if (e.target.classList.contains('recent-tag-remove')) {
        e.stopPropagation();
        removeRecentSearch(city);
      } else {
        handleSearch(city);
      }
    });

    recentsList.appendChild(btn);
  });
}

function removeRecentSearch(city) {
  recentSearches = recentSearches.filter(c => c.toLowerCase() !== city.toLowerCase());
  localStorage.setItem('weather_recents', JSON.stringify(recentSearches));
  renderRecentSearches();
  showToast(`Removed "${city}" from history`, 'info', 1800);
}

function clearAllRecents() {
  recentSearches = [];
  localStorage.removeItem('weather_recents');
  renderRecentSearches();
  showToast('Search history cleared', 'info', 1800);
}

// -------------------------------------------------------------
// Search Actions
// -------------------------------------------------------------
async function handleSearch(cityName) {
  const query = (cityName || cityInput.value).trim();
  if (!query) {
    showToast('Please enter a city name.', 'error');
    cityInput.focus();
    return;
  }

  hideSuggestions();
  showLoading(true, `Searching for "${query}"...`);

  try {
    const results = await fetchCityCoordinates(query);
    if (!results || results.length === 0) {
      showLoading(false);
      showToast('City not found. Please check spelling and try again.', 'error');
      return;
    }

    const top = results[0];
    cityInput.value = '';
    toggleClearBtn();

    await loadCityWeather({
      name: top.name,
      country: top.country || '',
      admin1: top.admin1 || '',
      lat: top.latitude,
      lon: top.longitude,
      isDetected: false
    });

  } catch (err) {
    console.error('Search error:', err);
    showLoading(false);
    showToast('Unable to connect to search service. Try again later.', 'error');
  }
}

function handleGeolocation() {
  if (!('geolocation' in navigator)) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  showLoading(true, 'Requesting GPS location...');

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        showLoading(true, 'Finding nearest city...');
        const geoInfo = await reverseLookup(latitude, longitude);

        await loadCityWeather({
          name: geoInfo.city,
          country: geoInfo.country,
          admin1: '',
          lat: latitude,
          lon: longitude,
          isDetected: true
        });
      } catch (err) {
        console.error('Geo lookup error:', err);
        showLoading(false);
        showToast('Could not resolve your location.', 'error');
      }
    },
    (err) => {
      showLoading(false);
      if (err.code === err.PERMISSION_DENIED) {
        showToast('Location permission denied. Please search for a city manually.', 'error');
      } else {
        showToast('Could not get GPS coordinates. Please search manually.', 'error');
      }
    },
    { timeout: 10000, maximumAge: 60000 }
  );
}

// -------------------------------------------------------------
// Autocomplete Suggestions
// -------------------------------------------------------------
function handleInputTyping(e) {
  toggleClearBtn();
  const text = e.target.value.trim();

  if (debounceTimer) clearTimeout(debounceTimer);
  if (text.length < 2) {
    hideSuggestions();
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const results = await fetchCityCoordinates(text);
      renderSuggestions(results);
    } catch {
      hideSuggestions();
    }
  }, 280);
}

function renderSuggestions(cities) {
  if (!suggestionsBox) return;
  if (!cities || cities.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsBox.innerHTML = '';
  cities.forEach(city => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    const subParts = [];
    if (city.admin1) subParts.push(city.admin1);
    if (city.country) subParts.push(city.country);
    const subText = subParts.join(', ');

    item.innerHTML = `
      <span class="suggestion-name">${city.name}</span>
      <span class="suggestion-country">${subText}</span>
    `;

    item.addEventListener('click', () => {
      cityInput.value = '';
      hideSuggestions();
      toggleClearBtn();

      loadCityWeather({
        name: city.name,
        country: city.country || '',
        admin1: city.admin1 || '',
        lat: city.latitude,
        lon: city.longitude,
        isDetected: false
      });
    });

    suggestionsBox.appendChild(item);
  });

  suggestionsBox.classList.remove('hidden');
}

function hideSuggestions() {
  if (suggestionsBox) {
    suggestionsBox.classList.add('hidden');
    suggestionsBox.innerHTML = '';
  }
}

function toggleClearBtn() {
  if (!clearInputBtn || !cityInput) return;
  if (cityInput.value.length > 0) {
    clearInputBtn.classList.remove('hidden');
  } else {
    clearInputBtn.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// Theme & Unit Switchers
// -------------------------------------------------------------
function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('weather_theme', theme);
}

function toggleTheme() {
  const next = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(next);
  showToast(`Switched to ${next} theme`, 'info', 1600);
}

function setUnit(unit) {
  if (currentUnit === unit) return;
  currentUnit = unit;
  localStorage.setItem('weather_unit', unit);

  celsiusBtn.classList.toggle('active', unit === 'C');
  celsiusBtn.setAttribute('aria-pressed', unit === 'C');
  fahrenheitBtn.classList.toggle('active', unit === 'F');
  fahrenheitBtn.setAttribute('aria-pressed', unit === 'F');

  if (currentData.weather) {
    renderCurrentWeather();
    renderForecast();
    renderDetailedStats();
  }
  showToast(`Temperature unit: °${unit}`, 'info', 1600);
}

// -------------------------------------------------------------
// Mobile Menu & ScrollSpy
// -------------------------------------------------------------
function toggleMobileMenu() {
  const open = navLinks.classList.contains('mobile-open');
  navLinks.classList.toggle('mobile-open', !open);
  hamburgerBtn.classList.toggle('active', !open);
  hamburgerBtn.setAttribute('aria-expanded', !open);
}

function closeMobileMenu() {
  navLinks.classList.remove('mobile-open');
  hamburgerBtn.classList.remove('active');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
}

// -------------------------------------------------------------
// Setup & Initialization
// -------------------------------------------------------------
function attachEvents() {
  // Theme and unit buttons
  themeToggleBtn.addEventListener('click', toggleTheme);
  celsiusBtn.addEventListener('click', () => setUnit('C'));
  fahrenheitBtn.addEventListener('click', () => setUnit('F'));

  // Mobile menu
  hamburgerBtn.addEventListener('click', toggleMobileMenu);
  navLinkItems.forEach(link => link.addEventListener('click', closeMobileMenu));

  // Search form
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSearch();
  });

  cityInput.addEventListener('input', handleInputTyping);
  cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideSuggestions();
  });

  clearInputBtn.addEventListener('click', () => {
    cityInput.value = '';
    toggleClearBtn();
    cityInput.focus();
    hideSuggestions();
  });

  geoBtn.addEventListener('click', handleGeolocation);
  clearHistoryBtn.addEventListener('click', clearAllRecents);

  // Close menus/dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !hamburgerBtn.contains(e.target)) {
      closeMobileMenu();
    }
    if (!searchForm.contains(e.target) && !suggestionsBox.contains(e.target)) {
      hideSuggestions();
    }
  });

  // Offline notifications
  window.addEventListener('offline', () => {
    showToast('Please check your internet connection.', 'error', 4500);
  });
  window.addEventListener('online', () => {
    showToast('Internet connection restored.', 'success', 2500);
  });
}

async function init() {
  await loadEnvConfig();
  setTheme(currentTheme);

  if (currentUnit === 'F') {
    celsiusBtn.classList.remove('active');
    celsiusBtn.setAttribute('aria-pressed', 'false');
    fahrenheitBtn.classList.add('active');
    fahrenheitBtn.setAttribute('aria-pressed', 'true');
  }

  renderRecentSearches();
  attachEvents();

  // Load saved location or fallback to default Indian city (New Delhi)
  let savedLoc = null;
  try {
    savedLoc = JSON.parse(localStorage.getItem('weather_last_location'));
  } catch {
    savedLoc = null;
  }

  if (savedLoc && savedLoc.lat && savedLoc.lon) {
    await loadCityWeather(savedLoc);
  } else {
    try {
      const defaultCity = appConfig.DEFAULT_CITY || 'New Delhi';
      const topCities = await fetchCityCoordinates(defaultCity);
      if (topCities && topCities.length > 0) {
        const top = topCities[0];
        await loadCityWeather({
          name: top.name,
          country: top.country || '',
          admin1: top.admin1 || '',
          lat: top.latitude,
          lon: top.longitude,
          isDetected: false
        });
      } else {
        // Direct coordinates fallback for New Delhi, India
        await loadCityWeather({
          name: 'New Delhi',
          country: 'India',
          admin1: 'Delhi',
          lat: 28.6139,
          lon: 77.2090,
          isDetected: false
        });
      }
    } catch (err) {
      console.error('Initial weather fetch error:', err);
      showLoading(false);
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
