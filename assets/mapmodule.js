// ---------------------------------------------------------
// mapmodule.js — Exact Google Pin Shape (Screenshot Color + Label Position)
// ---------------------------------------------------------
const mapmodule = (() => {

  let map;
  let singleMarker = null;

  let pageMarkers = [];
  let allMarkers = [];
  let markerCluster = null;

  let heatmapLayer = null;
  let contourCircles = [];

  let J_ICON = null;
  let J_LABEL = null;

  // ---------------------------------------------------------
  // INIT MAP
  // ---------------------------------------------------------
  function initMap(el) {
    map = new google.maps.Map(el, {
      center: { lat: 47.66498, lng: -122.39688 },
      zoom: 12,
      gestureHandling: "greedy",
    });

    // ⭐ Exact Google Maps pin shape (round top, pointed bottom)
    // ⭐ Screenshot color (#EA4335)
    // ⭐ Screenshot label position (slightly lower)
	/*
    J_ICON = {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
      fillColor: "#EA4335",
      fillOpacity: 1,
      strokeColor: "#B31412",
      strokeWeight: 2,
      scale: 2,
      anchor: new google.maps.Point(12, 22),
      labelOrigin: new google.maps.Point(12, 15) // ⭐ screenshot-accurate label position
    };
*/
    J_LABEL = {
      text: "J",
      color: "black",
      fontWeight: "bold",
    };
  }

  function getMap() {
    return map;
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
  // FADE‑IN MARKER
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
  // PULSE EFFECT
  // ---------------------------------------------------------
  function addPulseEffect(marker) {
    if (marker.pulseOverlay) {
      marker.pulseOverlay.setMap(null);
      marker.pulseOverlay = null;
    }

    const div = document.createElement("div");
    div.className = "pulse-marker";

    const overlay = new google.maps.OverlayView();

    overlay.onAdd = function () {
      this.div = div;
      this.getPanes().overlayLayer.appendChild(div);
    };

    overlay.draw = function () {
      const proj = this.getProjection();
      const pos = proj.fromLatLngToDivPixel(marker.getPosition());
      if (this.div) {
        this.div.style.left = pos.x + "px";
        this.div.style.top = pos.y + "px";
      }
    };

    overlay.onRemove = function () {
      if (this.div) {
        this.div.remove();
        this.div = null;
      }
    };

    overlay.setMap(marker.getMap());
    marker.pulseOverlay = overlay;
  }

  // ---------------------------------------------------------
  // CLEAR EVERYTHING
  // ---------------------------------------------------------
  function clearAll() {
    pageMarkers.forEach(m => {
      if (m.pulseOverlay) m.pulseOverlay.setMap(null);
      m.setMap(null);
    });

    allMarkers.forEach(m => {
      if (m.pulseOverlay) m.pulseOverlay.setMap(null);
      m.setMap(null);
    });

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

    if (singleMarker) {
      if (singleMarker.pulseOverlay) singleMarker.pulseOverlay.setMap(null);
      singleMarker.setMap(null);
      singleMarker = null;
    }
  }

  // ---------------------------------------------------------
  // DRAW PAGE MARKERS
  // ---------------------------------------------------------
  function drawPageMarkers(locations) {
    clearAll();

    const bounds = new google.maps.LatLngBounds();

    pageMarkers = locations.map(loc => {
      const marker = new google.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map,
        optimized: false,
        label: J_LABEL,
        icon: J_ICON,
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
        optimized: false,
        label: J_LABEL,
        icon: J_ICON,
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
      renderer: {
        render({ count, position }) {
          return new google.maps.Marker({
            position,
            optimized: false,
            label: J_LABEL,
            icon: J_ICON,
            zIndex: 9999,
          });
        },
      },
    });

    markerCluster.addListener("click", (cluster) => {
      animateClusterExpansion(cluster);
    });

    if (!bounds.isEmpty()) map.fitBounds(bounds);
  }

  // ---------------------------------------------------------
  // CLUSTER EXPANSION
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
  // TOOLTIP
  // ---------------------------------------------------------
  function attachTooltip(marker, text) {
    const info = new google.maps.InfoWindow({ content: text });

    marker.addListener("mouseover", () => info.open(map, marker));
    marker.addListener("mouseout", () => info.close());
  }

  // ---------------------------------------------------------
  // GLOW EFFECT
  // ---------------------------------------------------------
  /*
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
  */
function glowMarker(marker) {
  const icon = { ...J_ICON, strokeColor: "#ffffff", strokeWeight: 3 };
  marker.setIcon(icon);
  setTimeout(() => marker.setIcon(J_ICON), 600);
}

  // ---------------------------------------------------------
  // SINGLE MARKER
  // ---------------------------------------------------------
  function placeSingleMarker(latLng) {
    if (singleMarker) {
      if (singleMarker.pulseOverlay) singleMarker.pulseOverlay.setMap(null);
      singleMarker.setMap(null);
    }

    singleMarker = new google.maps.Marker({
      position: latLng,
      map,
      optimized: false,
      label: J_LABEL,
      icon: J_ICON,
    });
  }

  function getPageMarker(index) {
    return pageMarkers[index] || null;
  }

  return {
    map,
    getMap,
    initMap,
    flyTo,
    drawPageMarkers,
    drawAllMarkers,
    placeSingleMarker,
    attachTooltip,
    glowMarker,
    getPageMarker,
  };
})();
