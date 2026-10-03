# iOS Club — Real-Time Weather & Air Quality Dashboard 🌦️

A responsive, modern weather and air quality dashboard built with **HTML5, CSS3, and Vanilla JavaScript (ES6+)** for the technical team selection task. The app fetches live meteorological and pollution data using public REST APIs without external UI frameworks.

---

## 🔗 Live Demo

- **GitHub Pages:** [Live Demo](https://mehulmsjangid17-max.github.io/task1_iosclub/Task%202/)  
- **Direct Alias:** [Weather Dashboard](https://mehulmsjangid17-max.github.io/task1_iosclub/weather/)

---

## ✨ Features

- **Real-Time Weather Metrics**: Displays current temperature, feels-like temperature, humidity, wind velocity, cloud coverage, surface pressure, and visibility.
- **City Search & Suggestions**: Instant search for any city globally with a live suggestions dropdown powered by the Open-Meteo Geocoding API.
- **GPS Geolocation ("Use My Location")**: Detects your location via the browser Geolocation API and automatically resolves the nearest locality.
- **5-Day Extended Forecast**: Daily forecast cards showing weather conditions, high/low temperatures, and rain probability.
- **Air Quality Monitor (AQI)**: Evaluates the US AQI standard, categorized into *Good*, *Moderate*, *Unhealthy*, and *Hazardous*, complete with a visual progress meter and health recommendations.
- **Particulate Matter Diagnostic**: Live concentration levels for PM2.5 and PM10 with visual progress indicators.
- **Unit Conversion (°C / °F)**: Instant conversion across all weather values (temperatures, wind speed, visibility) without page reloads.
- **Recent Searches**: Saves past searches to `localStorage` with clickable quick-search chips and history management.
- **Dark & Light Mode**: Built-in theme switcher using CSS custom properties, persisted in client storage.
- **Responsive & Accessible**: Mobile-first design that adapts smoothly from 320px screens to large desktops without horizontal scrolling.

---

## 🛠️ Tech Stack

- **HTML5**: Semantic tags, accessible ARIA roles, and responsive viewport setup.
- **CSS3**: Custom design tokens, glassmorphism (`backdrop-filter`), CSS Grid, Flexbox, and micro-animations.
- **JavaScript (ES6+)**: `async/await`, `fetch`, DOM events, debouncing, and `localStorage`.
- **APIs**:
  - [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) for city coordinates.
  - [Open-Meteo Forecast API](https://open-meteo.com/en/docs) for current weather and 5-day outlook.
  - [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) for AQI, PM2.5, and PM10.
  - [BigDataCloud Client Geocoding](https://www.bigdatacloud.com/) for client-side coordinate lookup fallback.

---

## ⚙️ Environment Configuration (`.env`) & API Integration

You can customize the API endpoints, default location, and integrate external API keys directly using the [`.env`](file:///Users/mehulsuthar/Desktop/Mehul/Task%202/.env) file or [`env.js`](file:///Users/mehulsuthar/Desktop/Mehul/Task%202/env.js).

Example [`.env`](file:///Users/mehulsuthar/Desktop/Mehul/Task%202/.env) settings:
```ini
# Default Location (Optimized for Indian Places)
DEFAULT_CITY=New Delhi
DEFAULT_COUNTRY=India
COUNTRY_CODE=IN

# Optional: Custom API Keys (if integrating custom weather/AQI providers)
WEATHER_API_KEY=
AIR_QUALITY_API_KEY=

# Public REST API Endpoints
GEO_API_URL=https://geocoding-api.open-meteo.com/v1/search
FORECAST_API_URL=https://api.open-meteo.com/v1/forecast
AIR_QUALITY_API_URL=https://air-quality-api.open-meteo.com/v1/air-quality
REVERSE_GEO_API_URL=https://api.bigdatacloud.net/data/reverse-geocode-client
```

> **How it works:**  
> When the dashboard loads, it automatically reads [`.env`](file:///Users/mehulsuthar/Desktop/Mehul/Task%202/.env) (and [`env.js`](file:///Users/mehulsuthar/Desktop/Mehul/Task%202/env.js) for static `file:///` support), prioritizing Indian cities in autocomplete, defaulting to **New Delhi**, and injecting any configured API keys into requests.

---

## 🚀 Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mehulmsjangid17-max/task1_iosclub.git
   cd task1_iosclub
   ```

2. **Run locally:**
   Simply open `Task 2/index.html` in any modern web browser, or launch a quick local server:
   ```bash
   # Using Python
   python3 -m http.server 8080
   ```
   Open `http://localhost:8080/Task 2/` in your browser.

---

## 📄 License & Credits

- Developed for the **iOS Club Technical Selection Task**.
- Data provided by [Open-Meteo](https://open-meteo.com/).
- © 2026 iOS Club. All rights reserved.
