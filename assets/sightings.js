// ------------------------------
// CONFIG VARS
// ------------------------------
const GITHUB_USER = "vflower69";
const GITHUB_REPO = "jts";
const GITHUB_FILE_PATH = "data/jimothy.json";

// -------------------------------
// Neighborhood Lookup
// -------------------------------
function getNeighborhood(lat, lng) {
  if (lat > 47.67 && lng < -122.40) return "Ballard";
  if (lat > 47.66 && lng < -122.33) return "Green Lake";
  if (lat > 47.62 && lng < -122.35) return "Queen Anne";
  if (lat > 47.61 && lng < -122.33) return "Downtown Seattle";
  if (lat > 47.65 && lng < -122.30) return "University District";
  if (lat > 47.66 && lng < -122.31) return "Ravenna";
  if (lat > 47.63 && lng < -122.30) return "Capitol Hill";
  if (lat > 47.60 && lng < -122.33) return "Pioneer Square";
  return "Seattle Area";
}

// -------------------------------
// Icon selection based on note
// -------------------------------
function getSightingIcon(note) {
  if (!note || note.trim() === "") return "🦝";
  const n = note.toLowerCase();
  if (n.includes("water") || n.includes("bay") || n.includes("pond")) return "🌊";
  if (n.includes("park")) return "🌳";
  if (n.includes("crossing") || n.includes("road")) return "🚶";
  if (n.includes("far") || n.includes("not sure")) return "👀";
  if (n.includes("hanging")) return "😎";
  return "🦝";
}

// -------------------------------
// Map preview (static image)
// -------------------------------
function getMapPreview(lat, lng) {
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x200&markers=color:red|${lat},${lng}&key=AIzaSyAlxVpnD3O24HnHep4J4gwWZCHqKG7uewk`;
}

// -------------------------------
// Heatmap data
// -------------------------------
function generateHeatmapData(sightings) {
  return sightings.map(s => ({
    lat: s.lat,
    lng: s.lng,
    weight: 1
  }));
}

// -------------------------------
// Movement Animation
// -------------------------------
function animateMovement(sightings) {
  const icon = document.getElementById("raccoonIcon");
  const container = document.getElementById("movementAnimation");

  const width = container.clientWidth;
  const height = container.clientHeight;

  const lats = sightings.map(s => s.lat);
  const lngs = sightings.map(s => s.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  function mapToXY(lat, lng) {
    const x = ((lng - minLng) / (maxLng - minLng)) * width;
    const y = height - ((lat - minLat) / (maxLat - minLat)) * height;
    return { x, y };
  }

  let index = 0;

  function step() {
    const s = sightings[index];
    const { x, y } = mapToXY(s.lat, s.lng);

    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;

    index = (index + 1) % sightings.length;
    setTimeout(step, 1200);
  }

  step();
}

// -------------------------------
// Modal Map
// -------------------------------
function setupMapModal() {
  const modal = document.getElementById("mapModal");
  const closeBtn = document.getElementById("closeMapModal");
  const modalMap = document.getElementById("modalMap");

  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

  document.querySelectorAll(".map-preview").forEach(img => {
    img.addEventListener("click", () => {
      const lat = parseFloat(img.dataset.lat);
      const lng = parseFloat(img.dataset.lng);

      modal.classList.remove("hidden");

      const map = new google.maps.Map(modalMap, {
        center: { lat, lng },
        zoom: 16
      });

      new google.maps.Marker({ position: { lat, lng }, map });
    });
  });
}

// -------------------------------
// Neighborhood Heatmap
// -------------------------------
function renderNeighborhoodHeatmap(sightings) {
  const container = document.getElementById("neighborhoodHeatmap");

  const counts = {};
  sightings.forEach(s => {
    const n = getNeighborhood(s.lat, s.lng);
    counts[n] = (counts[n] || 0) + 1;
  });

  container.innerHTML = Object.entries(counts)
    .map(([name, count]) => {
      const intensity = Math.min(count * 20, 100);
      return `
        <div class="p-4 rounded-lg text-white"
             style="background: rgba(166, 79, 60, ${intensity / 100});">
          <p class="text-lg font-semibold">${name}</p>
          <p>${count} sightings</p>
        </div>
      `;
    })
    .join("");
}

// -------------------------------
// AI Neighborhood Descriptions
// -------------------------------
function generateNeighborhoodDescriptions(sightings) {
  const container = document.getElementById("neighborhoodDescriptions");

  const groups = {};
  sightings.forEach(s => {
    const n = getNeighborhood(s.lat, s.lng);
    groups[n] = groups[n] || [];
    groups[n].push(s);
  });

  container.innerHTML = Object.entries(groups)
    .map(([name, list]) => {
      const notes = list.map(s => s.note || "").join(" ").toLowerCase();

      let vibe = "quiet residential area";
      if (notes.includes("water") || notes.includes("bay")) vibe = "waterfront zone Jimothy enjoys";
      if (notes.includes("park")) vibe = "green park‑heavy area";
      if (notes.includes("crossing")) vibe = "busy street‑crossing area";
      if (notes.includes("hanging")) vibe = "relaxed hangout spot";

      return `
        <div class="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <p class="text-xl font-semibold">${name}</p>
          <p class="text-gray-700">This neighborhood appears to be a ${vibe} based on recent sightings.</p>
        </div>
      `;
    })
    .join("");
}

// -------------------------------
// Favorite Places Ranking
// -------------------------------
function renderFavoritePlaces(sightings) {
  const container = document.getElementById("favoritePlaces");

  const counts = {};
  sightings.forEach(s => {
    const n = getNeighborhood(s.lat, s.lng);
    counts[n] = (counts[n] || 0) + 1;
  });

  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  container.innerHTML = ranked
    .map(([name, count], i) => `
      <div class="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <p class="text-lg font-semibold">#${i + 1} — ${name}</p>
        <p class="text-gray-700">${count} sightings</p>
      </div>
    `)
    .join("");
}

// -------------------------------
// Seasonal Movement Patterns
// -------------------------------
function renderSeasonalPatterns(sightings) {
  const container = document.getElementById("seasonalPatterns");

  const seasons = { Winter: [], Spring: [], Summer: [], Fall: [] };

  sightings.forEach(s => {
    const month = new Date(s.timestamp).getMonth();
    if (month <= 1 || month === 11) seasons.Winter.push(s);
    else if (month <= 4) seasons.Spring.push(s);
    else if (month <= 7) seasons.Summer.push(s);
    else seasons.Fall.push(s);
  });

  container.innerHTML = Object.entries(seasons)
    .map(([season, list]) => `
      <div class="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <p class="text-xl font-semibold">${season}</p>
        <p class="text-gray-700">${list.length} sightings</p>
      </div>
    `)
    .join("");
}

// -------------------------------
// Mood Engine
// -------------------------------
function calculateJimothyMood(sightings) {
  if (sightings.length < 2) {
    return { mood: "Unknown", emoji: "❓", reason: "Not enough data" };
  }

  const sorted = [...sightings].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  let wanderingScore = 0;
  let nightActivity = 0;
  let waterAffinity = 0;
  let parkAffinity = 0;
  let fastMovement = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const dx = Math.abs(curr.lng - prev.lng);
    const dy = Math.abs(curr.lat - prev.lat);

    const distance = Math.sqrt(dx * dx + dy * dy);
    const timeDiff =
      (new Date(curr.timestamp) - new Date(prev.timestamp)) / 3600000;

    const speed = distance / (timeDiff || 1);

    if (speed > 0.005) fastMovement++;
    if (dx < 0.002 && dy < 0.002) wanderingScore++;

    const hour = new Date(curr.timestamp).getHours();
    if (hour >= 22 || hour <= 5) nightActivity++;

    const note = (curr.note || "").toLowerCase();
    if (note.includes("water") || note.includes("bay")) waterAffinity++;
    if (note.includes("park")) parkAffinity++;
  }

  if (fastMovement > 3)
    return {
      mood: "Adventurous",
      emoji: "🦝💨",
      reason: "Jimothy has been moving quickly across neighborhoods."
    };

  if (wanderingScore > 5)
    return {
      mood: "Curious",
      emoji: "🦝🔍",
      reason: "Jimothy has been wandering around small areas."
    };

  if (nightActivity > 5)
    return {
      mood: "Sleepy",
      emoji: "🦝😴",
      reason: "Jimothy has been active mostly at night."
    };

  if (waterAffinity > 2)
    return {
      mood: "Playful",
      emoji: "🦝🌊",
      reason: "Jimothy has been hanging out near water."
    };

  if (parkAffinity > 2)
    return {
      mood: "Chill",
      emoji: "🦝🌳",
      reason: "Jimothy has been relaxing in parks."
    };

  return {
    mood: "Exploring",
    emoji: "🦝🧭",
    reason: "Jimothy is moving steadily across neighborhoods."
  };
}

// -------------------------------
// Mood Renderer
// -------------------------------
function renderJimothyMood(moodData) {
  const container = document.getElementById("jimothyMood");
  container.innerHTML = `
    <p class="text-xl font-semibold">${moodData.emoji} ${moodData.mood}</p>
    <p class="text-gray-700">${moodData.reason}</p>
  `;
}

// -------------------------------
// Mood History Chart
// -------------------------------
function computeDailyMoods(sightings) {
  const days = {};

  sightings.forEach(s => {
    const day = new Date(s.timestamp).toISOString().split("T")[0];
    days[day] = days[day] || [];
    days[day].push(s);
  });

  const daily = [];

  for (const [day, list] of Object.entries(days)) {
    const mood = calculateJimothyMood(list);
    daily.push({ day, mood });
  }

  return daily.sort((a, b) => new Date(a.day) - new Date(b.day));
}

function renderMoodHistoryChart(dailyMoods) {
  const container = document.getElementById("moodHistoryChart");

  container.innerHTML = dailyMoods
    .map(entry => {
      const barWidth = Math.min(entry.mood.mood.length * 20, 200);

      return `
        <div>
          <p class="text-sm text-gray-500">${entry.day}</p>
          <div class="flex items-center gap-3">
            <div class="h-4 bg-amber-700 rounded" style="width:${barWidth}px"></div>
            <span>${entry.mood.emoji} ${entry.mood.mood}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

// -------------------------------
// Daily Mood Summary
// -------------------------------
function renderDailyMoodSummary(dailyMoods) {
  const container = document.getElementById("dailyMoodSummary");

  const today = new Date().toISOString().split("T")[0];
  const todayMood = dailyMoods.find(d => d.day === today);

  if (!todayMood) {
    container.innerHTML = "<p>No sightings today.</p>";
    return;
  }

  container.innerHTML = `
    <p class="text-xl font-semibold">${todayMood.mood.emoji} ${todayMood.mood.mood}</p>
    <p class="text-gray-700">${todayMood.mood.reason}</p>
  `;
}

// -------------------------------
// Mood Forecast
// -------------------------------
function forecastMood(dailyMoods) {
  if (dailyMoods.length < 3) {
    return {
      mood: "Unknown",
      emoji: "❓",
      reason: "Not enough historical data to forecast."
    };
  }

  const last3 = dailyMoods.slice(-3).map(d => d.mood.mood);

  const counts = {};
  last3.forEach(m => (counts[m] = (counts[m] || 0) + 1));

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const likelyMood = sorted[0][0];

  const emojiMap = {
    Adventurous: "🦝💨",
    Curious: "🦝🔍",
    Sleepy: "🦝😴",
    Playful: "🦝🌊",
    Chill: "🦝🌳",
    Exploring: "🦝🧭"
  };

  return {
    mood: likelyMood,
    emoji: emojiMap[likelyMood] || "🦝",
    reason: `Based on the last 3 days, Jimothy is likely to be ${likelyMood.toLowerCase()} tomorrow.`
  };
}

function renderMoodForecast(forecast) {
  const container = document.getElementById("moodForecast");

  container.innerHTML = `
    <p class="text-xl font-semibold">${forecast.emoji} ${forecast.mood}</p>
    <p class="text-gray-700">${forecast.reason}</p>
  `;
}

// -------------------------------
// Migration Prediction
// -------------------------------
function predictMigration(sightings) {
  if (sightings.length < 2) return null;

  const sorted = [...sightings].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  const dx = last.lng - prev.lng;
  const dy = last.lat - prev.lat;

  const predictedLat = last.lat + dy * 0.5;
  const predictedLng = last.lng + dx * 0.5;

  return {
    lat: predictedLat,
    lng: predictedLng,
    neighborhood: getNeighborhood(predictedLat, predictedLng)
  };
}

function renderMigrationPrediction(prediction) {
  const container = document.getElementById("migrationPrediction");

  if (!prediction) {
    container.innerHTML = "<p>Not enough data to predict movement.</p>";
    return;
  }

  container.innerHTML = `
    <p class="text-lg font-semibold">Likely Next Location:</p>
    <p class="text-gray-700">${prediction.neighborhood}</p>
    <p class="text-sm text-gray-500">Lat: ${prediction.lat.toFixed(5)}, Lng: ${prediction.lng.toFixed(5)}</p>
  `;
}

// -------------------------------
// Next Neighborhood Forecast
// -------------------------------
function forecastNextNeighborhood(sightings) {
  const counts = {};

  sightings.forEach(s => {
    const n = getNeighborhood(s.lat, s.lng);
    counts[n] = (counts[n] || 0) + 1;
  });

  const sorted = sightings.sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  const recentNeighborhood = getNeighborhood(sorted[0].lat, sorted[0].lng);

  const weighted = Object.entries(counts).map(([name, count]) => {
    const bonus = name === recentNeighborhood ? 2 : 0;
    return { name, score: count + bonus };
  });

  weighted.sort((a, b) => b.score - a.score);

  return weighted[0].name;
}

function renderNextForecast(neighborhood) {
  const container = document.getElementById("nextForecast");
  container.innerHTML = `
    <p class="text-lg font-semibold">Forecast:</p>
    <p class="text-gray-700">Jimothy is most likely heading toward <strong>${neighborhood}</strong>.</p>
  `;
}

// -------------------------------
// Timeline
// -------------------------------
function renderTimeline(sightings) {
  const container = document.getElementById("timelineContainer");

  container.innerHTML = sightings
    .map(s => {
      const date = new Date(s.timestamp).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short"
      });

      const neighborhood = getNeighborhood(s.lat, s.lng);

      return `
        <div class="border-l-4 border-amber-700 pl-4 py-2">
          <p class="text-sm text-gray-500">${date}</p>
          <p class="text-lg font-semibold">${neighborhood}</p>
          <p class="text-gray-700">${s.note || "No notes provided."}</p>
        </div>
      `;
    })
    .join("");
}

// ---------------------------------------------------------------
// Show Jimothy movement on map:
// This creates: A Google Map, A raccoon marker, Smooth movement from sighting to sighting, Auto‑panning as Jimothy travels
// -------------------------------------------------------------
function animateMovementOnMap(sightings) {
  if (!sightings.length) return;

  const map = new google.maps.Map(document.getElementById("movementMap"), {
    center: { lat: sightings[0].lat, lng: sightings[0].lng },
    zoom: 14,
    mapTypeId: "roadmap"
  });

  // Jimothy icon
  const jimothyIcon = {
    url: "/assets/raccoon.png",
    scaledSize: new google.maps.Size(50, 50)
  };

  const marker = new google.maps.Marker({
    position: { lat: sightings[0].lat, lng: sightings[0].lng },
    map,
    icon: jimothyIcon
  });

  // ⭐ Polyline path
  const pathCoordinates = sightings.map(s => ({ lat: s.lat, lng: s.lng }));

  const jimothyPath = new google.maps.Polyline({
    path: pathCoordinates,
    geodesic: true,
    strokeColor: "#d97706",
    strokeOpacity: 0.9,
    strokeWeight: 4
  });

  jimothyPath.setMap(map);

  // ⭐ Pulsing marker at latest sighting
  const pulseDiv = document.createElement("div");
  pulseDiv.classList.add("pulse-marker");

  new google.maps.OverlayView().onAdd = function () {
    const panes = this.getPanes();
    panes.overlayMouseTarget.appendChild(pulseDiv);
  };

  const pulseOverlay = new google.maps.OverlayView();
  pulseOverlay.onAdd = function () {
    const panes = this.getPanes();
    panes.overlayLayer.appendChild(pulseDiv);
  };
  pulseOverlay.draw = function () {
    const projection = this.getProjection();
    const pos = projection.fromLatLngToDivPixel(
      new google.maps.LatLng(
        sightings[sightings.length - 1].lat,
        sightings[sightings.length - 1].lng
      )
    );
    pulseDiv.style.left = pos.x - 10 + "px";
    pulseDiv.style.top = pos.y - 10 + "px";
    pulseDiv.style.position = "absolute";
  };
  pulseOverlay.setMap(map);

  // ⭐ Animation controls
  let i = 0;
  let interval = null;

  function startAnimation() {
    if (interval) return;

    interval = setInterval(() => {
      if (i >= sightings.length) {
        clearInterval(interval);
        interval = null;
        return;
      }

      const next = sightings[i];
      marker.setPosition({ lat: next.lat, lng: next.lng });
      map.panTo({ lat: next.lat, lng: next.lng });

      i++;
    }, 1200);
  }

  function pauseAnimation() {
    clearInterval(interval);
    interval = null;
  }

  function replayAnimation() {
    pauseAnimation();
    i = 0;
    marker.setPosition({ lat: sightings[0].lat, lng: sightings[0].lng });
    map.panTo({ lat: sightings[0].lat, lng: sightings[0].lng });
    startAnimation();
  }

  // Hook up buttons
  document.getElementById("playBtn").onclick = startAnimation;
  document.getElementById("pauseBtn").onclick = pauseAnimation;
  document.getElementById("replayBtn").onclick = replayAnimation;

  // Auto-start animation
  startAnimation();
}



// -------------------------------
// Main Loader
// -------------------------------
async function loadSightings() {
  const container = document.getElementById("sightingListContainer");

  try {
    const response = await fetch(`https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}`);
    const data = await response.json();
    const sightings = data.locations || [];

    sightings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const recent = sightings.slice(0, 5);
    container.innerHTML = recent
      .map(s => {
        const date = new Date(s.timestamp).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short"
        });
        const neighborhood = getNeighborhood(s.lat, s.lng);
        const icon = getSightingIcon(s.note);
        const mapUrl = getMapPreview(s.lat, s.lng);
        const note = s.note && s.note.trim() !== "" ? s.note : "No notes provided.";

        return `
          <div class="p-5 bg-white rounded-lg shadow-sm border border-gray-200 space-y-3">
            <div class="flex items-center gap-3">
              <span class="text-3xl">${icon}</span>
              <div>
                <p class="text-sm text-gray-500">${date}</p>
                <p class="text-lg font-semibold">${neighborhood}</p>
              </div>
            </div>
            <img src="${mapUrl}" alt="Map preview"
                 class="map-preview rounded-lg border border-gray-300 cursor-pointer"
                 data-lat="${s.lat}" data-lng="${s.lng}" />
            <p class="text-gray-700">${note}</p>
            <p class="text-xs text-gray-500">Lat: ${s.lat}, Lng: ${s.lng}</p>
          </div>
        `;
      })
      .join("");

    // Run all visualizations
    //animateMovement(sightings);
    //animateMovementOnMap(sightings);
    animateMovementOnMap([...sightings].reverse());//run from oldest to latest sighting location

    setupMapModal();
    renderTimeline(sightings);
    renderNeighborhoodHeatmap(sightings);
    generateNeighborhoodDescriptions(sightings);
    renderFavoritePlaces(sightings);
    renderSeasonalPatterns(sightings);

    const moodData = calculateJimothyMood(sightings);
    renderJimothyMood(moodData);

    const dailyMoods = computeDailyMoods(sightings);
    renderMoodHistoryChart(dailyMoods);
    renderDailyMoodSummary(dailyMoods);

    const moodForecast = forecastMood(dailyMoods);
    renderMoodForecast(moodForecast);

    const prediction = predictMigration(sightings);
    renderMigrationPrediction(prediction);

    const nextNeighborhood = forecastNextNeighborhood(sightings);
    renderNextForecast(nextNeighborhood);

  } catch (err) {
    console.error("Error loading sightings:", err);
    container.innerHTML = `<p class="text-red-600">Unable to load sightings at this time.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadSightings);
