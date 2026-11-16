// Atmos & Reel — Weather + Movie Search API project
// Weather uses Open-Meteo (no API key). Movies use OMDb (free API key required).

const OMDB_API_KEY = "YOUR_OMDB_API_KEY"; // Replace with your OMDb key from https://www.omdbapi.com/apikey.aspx

const $ = (selector) => document.querySelector(selector);
const toast = $("#toast");
let toastTimer;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

// Sidebar navigation
document.querySelectorAll(".nav-link").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    button.classList.add("active");
    const targetView = document.getElementById(button.dataset.view);
    targetView.classList.add("active");
    $("#page-title").textContent = button.dataset.view === "weather-view" ? "Weather overview" : "Movie explorer";
  });
});

const weatherDescriptions = {
  0: ["Clear sky", "☀"], 1: ["Mainly clear", "🌤"], 2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁"], 45: ["Fog", "🌫"], 48: ["Depositing rime fog", "🌫"],
  51: ["Light drizzle", "🌦"], 53: ["Moderate drizzle", "🌦"], 55: ["Dense drizzle", "🌧"],
  56: ["Freezing drizzle", "🌧"], 57: ["Dense freezing drizzle", "🌧"],
  61: ["Slight rain", "🌦"], 63: ["Moderate rain", "🌧"], 65: ["Heavy rain", "🌧"],
  66: ["Freezing rain", "🌧"], 67: ["Heavy freezing rain", "🌧"],
  71: ["Slight snow", "🌨"], 73: ["Moderate snow", "🌨"], 75: ["Heavy snow", "❄"],
  77: ["Snow grains", "❄"], 80: ["Rain showers", "🌦"], 81: ["Moderate showers", "🌧"],
  82: ["Violent showers", "⛈"], 85: ["Snow showers", "🌨"], 86: ["Heavy snow showers", "❄"],
  95: ["Thunderstorm", "⛈"], 96: ["Thunderstorm with hail", "⛈"], 99: ["Thunderstorm with heavy hail", "⛈"]
};

async function getWeatherForCity(city) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoResponse = await fetch(geoUrl);
  if (!geoResponse.ok) throw new Error("Could not reach the city search service.");
  const geoData = await geoResponse.json();
  if (!geoData.results || geoData.results.length === 0) throw new Error("City not found. Check the spelling and try again.");

  const place = geoData.results[0];
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_precipitation,precipitation,weather_code,wind_speed_10m&timezone=auto`;
  const weatherResponse = await fetch(weatherUrl);
  if (!weatherResponse.ok) throw new Error("Could not retrieve weather data.");
  const data = await weatherResponse.json();
  const current = data.current;
  const [description, icon] = weatherDescriptions[current.weather_code] || ["Weather conditions", "🌡"];

  $("#weather-location").textContent = `${place.name}${place.admin1 ? ", " + place.admin1 : ""}`;
  $("#weather-city-label").textContent = `${place.name}${place.country ? ", " + place.country : ""}`;
  $("#weather-icon").textContent = icon;
  $("#weather-condition").textContent = description;
  $("#temperature").innerHTML = `${Math.round(current.temperature_2m)}<span>°C</span>`;
  $("#feels-like").textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;
  $("#humidity").innerHTML = `${current.relative_humidity_2m}<small>%</small>`;
  $("#wind").innerHTML = `${Math.round(current.wind_speed_10m)}<small> km/h</small>`;
  $("#precipitation").innerHTML = `${Number(current.precipitation).toFixed(1)}<small> mm</small>`;
  $("#humidity-bar").style.width = `${current.relative_humidity_2m}%`;
  $("#wind-bar").style.width = `${Math.min(current.wind_speed_10m / 100 * 100, 100)}%`;
  $("#rain-bar").style.width = `${Math.min(current.precipitation / 10 * 100, 100)}%`;
  $("#weather-date").textContent = `Updated ${new Date(current.time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
}

$("#weather-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const city = $("#city-input").value.trim();
  if (!city) return;
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Loading…";
  try {
    await getWeatherForCity(city);
    showToast(`Weather loaded for ${city}.`);
  } catch (error) {
    showToast(error.message || "Weather search failed. Please try again.", true);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Search <span>→</span>';
  }
});

function renderMovies(movies) {
  const results = $("#movie-results");
  results.innerHTML = "";
  movies.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "movie-card";
    const poster = movie.Poster && movie.Poster !== "N/A"
      ? `<img class="movie-poster" src="${movie.Poster}" alt="${escapeHTML(movie.Title)} poster" loading="lazy">`
      : `<div class="poster-placeholder" aria-label="Poster unavailable">▣</div>`;
    card.innerHTML = `${poster}<div class="movie-info"><h4 class="movie-title">${escapeHTML(movie.Title)}</h4><div class="movie-meta"><span>${escapeHTML(movie.Year || "Year N/A")}</span><span class="rating">★ ${escapeHTML(movie.imdbRating || "N/A")}</span></div></div>`;
    results.appendChild(card);
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

async function searchMovies(title) {
  if (OMDB_API_KEY === "YOUR_OMDB_API_KEY") {
    throw new Error("Add your OMDb API key in js/app.js first. Get a free key at omdbapi.com.");
  }
  const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(title)}&type=movie`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not reach the movie database.");
  const data = await response.json();
  if (data.Response === "False") throw new Error(data.Error || "No movies found for this search.");

  // Search endpoint gives posters/title/year. Fetch detail endpoint to get IMDb ratings.
  const details = await Promise.all(data.Search.slice(0, 8).map(async (movie) => {
    try {
      const detailResponse = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${movie.imdbID}`);
      const detail = await detailResponse.json();
      return { ...movie, imdbRating: detail.imdbRating };
    } catch {
      return movie;
    }
  }));
  return details;
}

$("#movie-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = $("#movie-input").value.trim();
  if (!title) return;
  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Searching…";
  $("#movie-heading").textContent = `Results for “${title}”`;
  $("#movie-results").innerHTML = `<div class="empty-state"><h3>Searching movies…</h3><p>Please wait while we fetch results.</p></div>`;
  try {
    const movies = await searchMovies(title);
    renderMovies(movies);
    showToast(`Found ${movies.length} movie results.`);
  } catch (error) {
    $("#movie-results").innerHTML = `<div class="empty-state"><div class="empty-icon">⌕</div><h3>Could not find movies</h3><p>${escapeHTML(error.message || "Please try another title.")}</p></div>`;
    showToast(error.message || "Movie search failed.", true);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Explore <span>→</span>';
  }
});

// Load an example city on startup so the weather dashboard isn't blank.
getWeatherForCity("Bengaluru").catch(() => {
  $("#weather-condition").textContent = "Search a city to get started";
});
