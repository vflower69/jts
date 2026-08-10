// ------------------------------
// CONFIG VARS
// ------------------------------
const GITHUB_USER = "vflower69";
const GITHUB_REPO = "jts";
const GITHUB_FILE_PATH = "data/jimothy.json";

let map;
let marker;
let mapMarkers = [];
let markerCluster = null;
let showingAll = false;

// ------------------------------
// CLEAR THE MARKERS ON MAP
// ------------------------------
function clearMapMarkers() {
  mapMarkers.forEach(m => m.setMap(null));
  mapMarkers = [];
}

// --------------------------------------------------------------------
// DRAW MARKERS ON MAP FOR ONLY THE CURRENT PAGE OF SIGHTING PAGENATION
// --------------------------------------------------------------------
function drawPageMarkers(pageItems) {
  clearMapMarkers();
  const bounds = new google.maps.LatLngBounds();
  pageItems.forEach(loc => {
    const marker = new google.maps.Marker({
      position: { lat: loc.lat, lng: loc.lng },
      map,
      label: "J",
      opacity: 0, // start invisible for fade-in
    });
    // Smooth fade-in
    setTimeout(() => marker.setOpacity(1), 50);
    mapMarkers.push(marker);
    bounds.extend(marker.getPosition());
  });
  // Auto-pan + auto-zoom to fit current page
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds);
  }
}

// ------------------------------
// drawAllMarkers
// ------------------------------
function drawAllMarkers() {
  clearMapMarkers();

  const bounds = new google.maps.LatLngBounds();

  const markers = allLocations.map(loc => {
    const marker = new google.maps.Marker({
      position: { lat: loc.lat, lng: loc.lng },
      map,
      label: "J"
    });
    bounds.extend(marker.getPosition());
    return marker;
  });

  mapMarkers = markers;

  // Create clusterer FIRST
  markerCluster = new markerClusterer.MarkerClusterer({
    map,
    markers
  });

  // For debugging purpose
  console.log("allLocations length:", allLocations.length);
  console.log("bounds.contains(map.getCenter())", bounds.contains(map.getCenter()));

  // Now auto-fit AFTER clusterer finishes
  //google.maps.event.addListenerOnce(map, "idle", () => {
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds);
    }
  //});
}


// ------------------------------
// GOOGLE MAP INIT
// ------------------------------

//Center the map at the South Entrance of the Seattle Ballard Locks when refresh browser with view of its neighborhood + nearby areas
window.initMap = function () {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 47.66498, lng: -122.39688 },
    zoom: 12,
  });

  // Click to place marker
  map.addListener("click", (e) => {
    placeMarker(e.latLng);
    document.getElementById("locationInput").value =
      `${e.latLng.lat().toFixed(6)}, ${e.latLng.lng().toFixed(6)}`;
  });

  // Autocomplete
  const input = document.getElementById("locationInput");
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;
    placeMarker(place.geometry.location);
    map.panTo(place.geometry.location);
  });

  loadJournal();
};

// ------------------------------
// PLACE MARKER
// ------------------------------
function placeMarker(latLng) {
  if (marker) marker.setMap(null);
  marker = new google.maps.Marker({
    position: latLng,
    map,
  });
}

// ------------------------------
// LOAD JOURNAL
// ------------------------------
// Add pagenation - part1
let currentPage = 1;
const perPage = 5;
let allLocations = [];

async function loadJournal() {
  const errorEl = document.getElementById("journalError");

  // Hide error BEFORE starting the fetch
  errorEl.classList.add("hidden");
  
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}`);
    const data = await res.json();

    // Add pagenation - part2: Save all locations (newest first)
    allLocations = data.locations.slice().reverse();

    // Draw markers on map
    //loadSightingsOnMap(data.locations); // Map markers now handled per page

    // Add pagenation - part3: Render page 1
    currentPage = 1;
    
    renderJournalPage(); //replaced below commented codes
    //document.getElementById("journalError").classList.add("hidden");
  } catch (err) {
    // Only show error if fetch truly fails
    errorEl.classList.remove("hidden");
    //document.getElementById("journalError").classList.remove("hidden");
  }
}

// ------------------------------
// renderJournalPage
// ------------------------------
function renderJournalPage() {
  const list = document.getElementById("journalList");
  list.innerHTML = "";

  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageItems = allLocations.slice(start, end);

  // Render list items
  pageItems.forEach((loc) => {
    const li = document.createElement("li");
    li.className = "p-4 bg-white rounded shadow";
    li.innerHTML = `
      <div class="flex items-center justify-between text-sm">
        <span class="font-semibold">
          ${loc.timestamp}; ${loc.lat}, ${loc.lng}; ${loc.note || ""}
        </span>
        <button class="px-3 py-1 bg-blue-600 text-white rounded zoomBtn">
          Zoom
        </button>
      </div>
    `;

    list.appendChild(li);

    // ⭐ Attach zoom behavior
    li.querySelector(".zoomBtn").onclick = () => {
      map.panTo({ lat: loc.lat, lng: loc.lng });
      map.setZoom(16);
    };
  });

  // Draw only current page markers
  drawPageMarkers(pageItems);

  renderJournalPagination();
}

// ------------------------------
// renderJournalPagination
// ------------------------------
function renderJournalPagination() {
  const totalPages = Math.ceil(allLocations.length / perPage);
  const pagination = document.getElementById("journalPagination");

  pagination.innerHTML = `
    <button
      id="journalPrev"
      class="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-40"
      ${currentPage === 1 ? "disabled" : ""}
    >
      Prev
    </button>
  
    <span class="px-2 text-sm text-[#858481]">
      Page ${currentPage} / ${totalPages}
    </span>
  
    <button
      id="journalNext"
      class="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-40"
      ${currentPage === totalPages ? "disabled" : ""}
    >
      Next
    </button>
  `;

  document.getElementById("journalPrev").onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderJournalPage();
      document.getElementById("toggleAllSightings").innerText = "Show All Sightings On Map";
      showingAll=false;
    }
  };

  document.getElementById("journalNext").onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderJournalPage();
      document.getElementById("toggleAllSightings").innerText = "Show All Sightings On Map";
      showingAll=false;
    }
  };
}

//
document.getElementById("reloadJournal").onclick = loadJournal;

// -----------------------
// toggleAllSightings
// -----------------------
document.getElementById("toggleAllSightings").onclick = () => {
  showingAll = !showingAll;

  if (showingAll) {
    document.getElementById("toggleAllSightings").innerText = "Show Paginated Sightings On Map";
    drawAllMarkers();
  } else {
    document.getElementById("toggleAllSightings").innerText = "Show All Sightings On Map";
    renderJournalPage(); // returns to paginated markers
  }
};

// ------------------------------
// SUBMIT SIGHTING
// ------------------------------
/*
document.getElementById("sightingForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const location = document.getElementById("locationInput").value.trim();
  const time = document.getElementById("timeInput").value;
  const note = document.getElementById("noteInput").value.trim();

  let lat = null;
  let lng = null;

  // Parse coordinates
  if (location.includes(",")) {
    const [la, ln] = location.split(",").map((x) => parseFloat(x));
    lat = la;
    lng = ln;
  }

  if (!lat || !lng) {
    alert("Please click the map or enter coordinates.");
    return;
  }

  const newEntry = {
    timestamp: new Date(time).toISOString(),
    lat,
    lng,
    note,
  };

  await updateGitHubFile(newEntry);
  await loadJournal();

  alert("Sighting shared!");
});
*/

// ------------------------------
// UPDATE GITHUB FILE
// ------------------------------
async function updateGitHubFile(newEntry, fullPayload) {
  await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN_JIMOTHY}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.everest-preview+json"
    },
    body: JSON.stringify({
      event_type: "update-log",
      client_payload: {
        new_entry: newEntry,
        payload: content
      }
    })
  });
}

// -------------------------------------------
// SUBMIT JIMOTHY LOCATION (Cloudflare worker)
// -------------------------------------------
/* ***********CLOUDFLARE WORKER***************
export default {
  async fetch(request, env) {
    // ------------------------------
    // CORS HEADERS
    // ------------------------------
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://jimothytracker.org",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== "POST") {
      return new Response("Only POST allowed", {
        status: 405,
        headers: corsHeaders
      });
    }

    // ------------------------------
    // PARSE REQUEST BODY
    // ------------------------------
    const body = await request.json();
    const dispatch = {
      event_type: "jimothy_sighting",
      client_payload: body
    };

    // ------------------------------
    // TRIGGER GITHUB ACTION
    // ------------------------------
    const res = await fetch(
      `https://api.github.com/repos/${env.GH_OWNER}/${env.GH_REPO}/dispatches`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.GH_TOKEN}`,
          "Accept": "application/vnd.github+json"
        },
        body: JSON.stringify(dispatch)
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return new Response("GitHub error: " + text, {
        status: 500,
        headers: corsHeaders
      });
    }

    // ------------------------------
    // SUCCESS RESPONSE
    // ------------------------------
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};
***********CLOUDFLARE WORKER*************** */
async function submitFormSighting() {
  event.preventDefault();
  
  // Read comma-separated location input
  const loc = document.getElementById("locationInput").value.trim();
  const note = document.getElementById("noteInput").value.trim();
  const time = document.getElementById("timeInput").value;

  if (!loc) {
    alert("Please click the map or enter a location.");
    return;
  }

  // Parse "lat, lng"
  const parts = loc.split(",");
  if (parts.length !== 2) {
    alert("Location must be in 'lat, lng' format.");
    return;
  }

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) {
    alert("Latitude and longitude must be valid numbers.");
    return;
  }

  // Timestamp
  const timestamp = new Date().toISOString();

  // Build payload for Cloudflare Worker
  const payload = {
    lat,
    lng,
    timestamp,
    note
  };

  try {
    const res = await fetch("https://api.jimothytracker.org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      alert("Jimothy sighting submitted successfully.");
      document.getElementById("noteInput").value = "";
      loadJournal();
    } else {
      alert("Error submitting sighting: " + data.error);
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

// ---------------------------------------------------
// DRAW ALL SIGHTINGS ON MAP WITH 'J' IN ORANGE CIRCLE
// ---------------------------------------------------
function loadSightingsOnMap(locations) {
  locations.forEach((loc) => {
    new google.maps.Marker({
      position: { lat: loc.lat, lng: loc.lng },
      map,
      label: "J",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "orange",
        fillOpacity: 1,
        strokeWeight: 1,
        strokeColor: "#b85c00"
      }
    });
  });
}

//Explicitly exposes the function globally so the HTML can call it.
window.submitFormSighting = submitFormSighting;
//window.initMap = initMap; //see line 79

// --------------------------------
// Count visitors
// --------------------------------
document.addEventListener("DOMContentLoaded", () => {
  fetch("https://counter.jimothytracker.org/")
    .then(r => r.json())
    .then(data => {
      const value = data.value.toString().padStart(10, "0");
      document.getElementById("visit-meter").textContent = value;
    });
});

// -----------------------------------------
// The modal form is for "Contact Us" button
// -----------------------------------------
/* ********Old version **************
// Open modal
document.getElementById("contactUsBtn").onclick = () => {
  document.getElementById("contactModal").classList.remove("hidden");
};

// Close modal
document.getElementById("closeContact").onclick = () => {
  document.getElementById("contactModal").classList.add("hidden");
};

// Handle modal form submission
document.getElementById("contactForm").onsubmit = (e) => {
  e.preventDefault();

  const subject = document.getElementById("contactSubject").value.trim();
  const message = document.getElementById("contactMessage").value.trim();

  if (!subject || !message) {
    alert("Please fill out both fields.");
    return;
  }

  alert("Your message has been sent to the Jimothy community team.");
  document.getElementById("contactModal").classList.add("hidden");

  // Clear fields
  document.getElementById("contactSubject").value = "";
  document.getElementById("contactMessage").value = "";
};
********Old version ************** */

// --------------------
// Contact Modal Logic
// --------------------

// Elements
const contactModal = document.getElementById("contactModal");
const contactUsBtn = document.getElementById("contactUsBtn");
const closeContact = document.getElementById("closeContact");
const toast = document.getElementById("toast");

// Open modal
contactUsBtn.addEventListener("click", () => {
  contactModal.classList.remove("hidden");
});

// Close modal
closeContact.addEventListener("click", () => {
  contactModal.classList.add("hidden");
});

// Toast helper
/*
function showToast(message) {
  toast.textContent = message;
  toast.style.opacity = "1";
  toast.style.transform = "scale(1.05)";
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "scale(1)";
  }, 2500);
}
*/
function showToast(message, type = "info") {
  const colors = {
    info: "#34322d",
    success: "#16a34a",
    error: "#dc2626",
    warning: "#f59e0b"
  };
  toast.style.backgroundColor = colors[type];
  toast.textContent = message;
  toast.style.opacity = "1";
  toast.style.transform = "scale(1.05)";
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "scale(1)";
  }, 2500);
}

// Form submission
document.getElementById("contactForm").addEventListener("submit", async (e) => {
  console.log("ContactUs form submit triggered");
  e.preventDefault();

  // Ensure modal is visible so FormData works
  contactModal.classList.remove("hidden");
  
  const form = e.target;
  const formData = new FormData(form);

  console.log("Raw FormData:", [...formData.entries()]);
  
  // Basic validation
  const email = formData.get("sender_email");
  const message = formData.get("message");

  if (!email || !email.includes("@")) {
    //showToast("Please enter a valid email.");
    showToast("Please enter a valid email.", "error");

    return;
  }

  if (!message || message.length < 5) {
    //showToast("Message is too short.");
    showToast("Message is too short.", "error");

    return;
  }

  // Submit to Cloudflare Forms to your Worker
  try {
    console.log("Starting fetch...");
    const res = await fetch("https://contact.jimothytracker.org", {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" }
    });
    console.log("Fetch response:", res.status);
    if (res.ok) {
      //showToast("Message sent!");
      showToast("Message sent!", "success");
      form.reset();
      contactModal.classList.add("hidden");
    } else {
      //showToast("Error sending message.");
      showToast("Error sending message.", "error");
    }
  } catch (err) {
    console.error("Fetch failed:", err);
    //showToast("Network error.");
    showToast("Network error.", "error");
  }
});
