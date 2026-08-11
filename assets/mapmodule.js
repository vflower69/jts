// ---------------------------------------------------------
// MapModule.js — Complete, Polished, Fully‑Featured Map System
// ---------------------------------------------------------
const MapModule = (() => {

  let map;
  let singleMarker = null;
  let pageMarkers = [];
  let allMarkers = [];
  let markerCluster = null;

  let heatmapLayer = null;
  let contourCircles = [];

  // ---------------------------------------------------------
  // INIT MAP
  // ---------------------------------------------------------
  function initMap(el) {
    map = new google.maps.Map(el, {
      center: { lat: 47.66498, lng: -122.39688 },
      zoom: 12,
      gestureHandling: "greedy",
    });
  }

  // ---------------------------------------------------------
  // CINEMATIC FLY‑TO CAMERA
  // ---------------------------------------------------------
  function flyTo(latLng, zoom = null) {
    const start = map.getCenter();
    const end = latLng;

    let progress = 0;
    const duration = 600;

    const animate = (timestamp) => {
      if (!animate.start) animate.start = timestamp;
      progress = (timestamp - animate.start) / duration;
      if (progress > 1) progress = 1;

      const lat = start.lat() + (end.lat - start.lat()) * progress;
      const lng = start.lng() + (end.lng - start.lng()) * progress;

      map.panTo({ lat, lng });

      if (zoom !== null) {
        const currentZoom = map.getZoom();
        map.setZoom(currentZoom + (zoom - currentZoom) * progress);
      }

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  // ---------------------------------------------------------
  // SMOOTH FADE‑IN MARKER
  // ---------------------------------------------------------
  function fadeInMarker(marker) {
    marker.setOpacity(0);
    let opacity = 0;

    const step = () => {
      opacity += 0.05;
      marker.setOpacity(opacity);
      if (opacity < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------
  // PULSING MARKER EFFECT
  // ---------------------------------------------------------
  function addPulseEffect(marker) {
    const div = document.createElement("div");
    div.className = "pulse-marker";

    const overlay = new google.maps.OverlayView();
    overlay.onAdd = function () {
      this.getPanes().overlayLayer.appendChild(div);
    };

    overlay.draw = function () {
      const proj = this.getProjection();
      const pos = proj.fromLatLngToDivPixel(marker.getPosition());
      div.style.left = pos.x + "px";
      div.style.top = pos.y + "px";
    };

    overlay.onRemove = function () {
      div.remove();
    };

    overlay.setMap(marker.getMap());
  }

  // ---------------------------------------------------------
  // CLEAR ALL MARKERS + CLUSTERER + HEATMAP + CONTOURS
  // ---------------------------------------------------------
  function clearAll() {
    pageMarkers.forEach(m => m.setMap(null));
    allMarkers.forEach(m => m.setMap(null));
    pageMarkers = [];
    allMarkers = [];

    if (markerCluster) {
      markerCluster.clearMarkers();
      markerCluster = null;
    }

    if (heatmapLayer) {
      heatmapLayer.setMap(null);
      heatmapLayer = null;
    }

    contourCircles.forEach(c => c.setMap(null));
    contourCircles = [];
  }

  // ---------------------------------------------------------
  // DRAW PAGINATED MARKERS
  // ---------------------------------------------------------
  function drawPageMarkers(locations) {
    clearAll();

    const bounds = new google.maps.LatLngBounds();

    pageMarkers = locations.map(loc => {
      const marker = new google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map,
        label: "J",
      });

      fadeInMarker(marker);
      addPulseEffect(marker);
      attachTooltip(marker, loc.note || "No note");

      bounds.extend(marker.getPosition());
      return marker;
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds);
  }

  // ---------------------------------------------------------
  // DRAW ALL MARKERS (CLUSTERED)
  // ---------------------------------------------------------
  function drawAllMarkers(locations) {
    clearAll();

    const bounds = new google.maps.LatLngBounds();

    allMarkers = locations.map(loc => {
      const marker = new google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map,
        label: "J",
      });

      fadeInMarker(marker);
      addPulseEffect(marker);
      attachTooltip(marker, loc.note || "No note");

      bounds.extend(marker.getPosition());
      return marker;
    });

    markerCluster = new markerClusterer.MarkerClusterer({
      map,
      markers: allMarkers,
    });

    // Animated cluster expansion
    markerCluster.addListener("click", (cluster) => {
      animateClusterExpansion(cluster);
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds);
  }

  // ---------------------------------------------------------
  // ANIMATED CLUSTER EXPANSION
  // ---------------------------------------------------------
  function animateClusterExpansion(cluster) {
    const center = cluster.getCenter();
    const icon = cluster.clusterIcon_.div_;

    icon.style.transition = "transform 0.3s ease-out";
    icon.style.transform = "scale(1.3)";
    setTimeout(() => {
      icon.style.transform = "scale(1)";
    }, 300);

    let currentZoom = map.getZoom();
    const targetZoom = currentZoom + 2;

    const step = () => {
      currentZoom += 0.2;
      map.setZoom(currentZoom);
      map.panTo(center);
      if (currentZoom < targetZoom) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------
  // HEATMAP LAYER
  // ---------------------------------------------------------
  function drawHeatmap(locations) {
    if (heatmapLayer) heatmapLayer.setMap(null);

    const points = locations.map(loc => new google.maps.LatLng(loc.lat, loc.lng));

    heatmapLayer = new google.maps.visualization.HeatmapLayer({
      data: points,
      map: map,
      radius: 35,
      opacity: 0.6,
    });
  }

  // ---------------------------------------------------------
  // DENSITY CONTOURS
  // ---------------------------------------------------------
  function drawDensityContours(locations) {
    contourCircles.forEach(c => c.setMap(null));
    contourCircles = [];

    locations.forEach(loc => {
      const circle = new google.maps.Circle({
        map,
        center: { lat: loc.lat, lng: loc.lng },
        radius: 120,
        strokeColor: "#FF8C00",
        strokeOpacity: 0.35,
        strokeWeight: 1,
        fillColor: "#FF8C00",
        fillOpacity: 0.08,
      });
      contourCircles.push(circle);
    });
  }

  // ---------------------------------------------------------
  // SINGLE MARKER PLACEMENT
  // ---------------------------------------------------------
  function placeSingleMarker(latLng) {
    if (singleMarker) singleMarker.setMap(null);
    singleMarker = new google.maps.Marker({
      position: latLng,
      map,
    });
  }

  // ---------------------------------------------------------
  // MARKER HOVER TOOLTIP
  // ---------------------------------------------------------
  function attachTooltip(marker, text) {
    const info = new google.maps.InfoWindow({ content: text });

    marker.addListener("mouseover", () => info.open(map, marker));
    marker.addListener("mouseout", () => info.close());
  }

  // ---------------------------------------------------------
  // MARKER SELECTION GLOW
  // ---------------------------------------------------------
  function glowMarker(marker) {
    marker.setIcon({
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: "#ff8800",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3,
    });

    setTimeout(() => {
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#ff8800",
        fillOpacity: 1,
        strokeColor: "#b85c00",
        strokeWeight: 1,
      });
    }, 600);
  }

  // ---------------------------------------------------------
  // BOUNCE HIGHLIGHT
  // ---------------------------------------------------------
  function highlightMarker(marker) {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => marker.setAnimation(null), 700);
  }

  // ---------------------------------------------------------
  // EXPORT PUBLIC API
  // ---------------------------------------------------------
  return {
    initMap,
    flyTo,
    drawPageMarkers,
    drawAllMarkers,
    drawHeatmap,
    drawDensityContours,
    placeSingleMarker,
    attachTooltip,
    glowMarker,
    highlightMarker,
  };
})();
