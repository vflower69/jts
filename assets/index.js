// ---------------------------------------------------------
// CONFIG VARS
// ---------------------------------------------------------
const GITHUB_USER = "vflower69";
const GITHUB_REPO = "jts";
const GITHUB_FILE_PATH = "data/jimothy.json";

// Pagination
let currentPage = 1;
const perPage = 5;
let allLocations = [];
let showingAll = false;

// ---------------------------------------------------------
// GOOGLE MAP INIT — now uses MapModule
// ---------------------------------------------------------
window.initMap = function () {
  MapModule.initMap(document.getElementById("map"));

  // Click to place marker
  MapModule.map.addListener("click", (e) => {
    MapModule.placeSingleMarker(e.latLng);
    document.getElementById("locationInput").value =
      `${e.latLng.lat().toFixed(6)}, ${e.latLng.lng().toFixed(6)}`;
  });

  // Autocomplete
  const input = document.getElementById("locationInput");
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;
    MapModule.placeSingleMarker(place.geometry.location);
    MapModule.flyTo(place.geometry.location);
  });

  loadJournal();
};

// ---------------------------------------------------------
// LOAD JOURNAL
// ---------------------------------------------------------
async function loadJournal() {
  const errorEl = document.getElementById("journalError");
  errorEl.classList.add("hidden");

  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${GITHUB_FILE_PATH}`
    );
    const data = await res.json();

    allLocations = data.locations.slice().reverse();
    currentPage = 1;

    renderJournalPage();
  } catch (err) {
    errorEl.classList.remove("hidden");
  }
}

// ---------------------------------------------------------
// RENDER JOURNAL PAGE
// ---------------------------------------------------------
function renderJournalPage() {
  const list = document.getElementById("journalList");
  list.innerHTML = "";

  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageItems = allLocations.slice(start, end);

  pageItems.forEach((loc, index) => {
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

    // Zoom button → fly-to camera
    li.querySelector(".zoomBtn").onclick = () => {
      MapModule.flyTo({ lat: loc.lat, lng: loc.lng }, 16);
    };

    // Hover glow
    li.onmouseenter = () => {
      const marker = MapModule.getPageMarker(index);
      if (marker) MapModule.glowMarker(marker);
    };
  });

  // Draw paginated markers
  MapModule.drawPageMarkers(pageItems);

  renderJournalPagination();
}

// ---------------------------------------------------------
// PAGINATION
// ---------------------------------------------------------
function renderJournalPagination() {
  const totalPages = Math.ceil(allLocations.length / perPage);
  const pagination = document.getElementById("journalPagination");

  pagination.innerHTML = `
    <button id="journalPrev"
      class="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-40"
      ${currentPage === 1 ? "disabled" : ""}>
      Prev
    </button>

    <span class="px-2 text-sm text-[#858481]">
      Page ${currentPage} / ${totalPages}
    </span>

    <button id="journalNext"
      class="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-40"
      ${currentPage === totalPages ? "disabled" : ""}>
      Next
    </button>
  `;

  document.getElementById("journalPrev").onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderJournalPage();
      showingAll = false;
      document.getElementById("toggleAllSightings").innerText =
        "Show All Sightings On Map";
    }
  };

  document.getElementById("journalNext").onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderJournalPage();
      showingAll = false;
      document.getElementById("toggleAllSightings").innerText =
        "Show All Sightings On Map";
    }
  };
}

document.getElementById("reloadJournal").onclick = loadJournal;

// ---------------------------------------------------------
// TOGGLE ALL SIGHTINGS
// ---------------------------------------------------------
document.getElementById("toggleAllSightings").onclick = () => {
  showingAll = !showingAll;

  if (showingAll) {
    document.getElementById("toggleAllSightings").innerText =
      "Show Paginated Sightings On Map";
    MapModule.drawAllMarkers(allLocations);
  } else {
    document.getElementById("toggleAllSightings").innerText =
      "Show All Sightings On Map";
    renderJournalPage();
  }
};

// ---------------------------------------------------------
// SUBMIT SIGHTING
// ---------------------------------------------------------
async function submitFormSighting() {
  event.preventDefault();

  const loc = document.getElementById("locationInput").value.trim();
  const note = document.getElementById("noteInput").value.trim();
  const time = document.getElementById("timeInput").value;

  if (!loc) {
    alert("Please click the map or enter a location.");
    return;
  }

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

  const timestamp = new Date().toISOString();

  const payload = { lat, lng, timestamp, note };

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

window.submitFormSighting = submitFormSighting;

// ---------------------------------------------------------
// VISITOR COUNTER
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  fetch("https://counter.jimothytracker.org/")
    .then(r => r.json())
    .then(data => {
      const value = data.value.toString().padStart(10, "0");
      document.getElementById("visit-meter").textContent = value;
    });
});

// ---------------------------------------------------------
// CONTACT MODAL + TOAST
// ---------------------------------------------------------
const contactModal = document.getElementById("contactModal");
const contactUsBtn = document.getElementById("contactUsBtn");
const closeContact = document.getElementById("closeContact");
const toast = document.getElementById("toast");

contactUsBtn.addEventListener("click", () => {
  contactModal.classList.remove("hidden");
});

closeContact.addEventListener("click", () => {
  contactModal.classList.add("hidden");
});

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

document.getElementById("contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  contactModal.classList.remove("hidden");

  const form = e.target;
  const formData = new FormData(form);

  const email = formData.get("sender_email");
  const message = formData.get("message");

  if (!email || !email.includes("@")) {
    showToast("Please enter a valid email.", "error");
    return;
  }

  if (!message || message.length < 5) {
    showToast("Message is too short.", "error");
    return;
  }

  try {
    const res = await fetch("https://contact.jimothytracker.org", {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" }
    });

    if (res.ok) {
      showToast("Message sent!", "success");
      form.reset();
      contactModal.classList.add("hidden");
    } else {
      showToast("Error sending message.", "error");
    }
  } catch (err) {
    showToast("Network error.", "error");
  }
});
