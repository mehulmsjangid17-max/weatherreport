/**
 * iOS Club — Client-side Environment Configuration
 * This configuration is loaded into window.ENV before script.js runs.
 * Variables defined here or inside a .env file will be automatically merged.
 */
window.ENV = {
  // Default Location (Optimized for Indian places)
  DEFAULT_CITY: "New Delhi",
  DEFAULT_COUNTRY: "India",
  COUNTRY_CODE: "IN",

  // Optional: Custom API Keys for integration
  WEATHER_API_KEY: "",
  AIR_QUALITY_API_KEY: "",

  // REST API Endpoints
  GEO_API_URL: "https://geocoding-api.open-meteo.com/v1/search",
  FORECAST_API_URL: "https://api.open-meteo.com/v1/forecast",
  AIR_QUALITY_API_URL: "https://air-quality-api.open-meteo.com/v1/air-quality",
  REVERSE_GEO_API_URL: "https://api.bigdatacloud.net/data/reverse-geocode-client"
};
