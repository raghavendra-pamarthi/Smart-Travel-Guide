import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function RoadmapMap({ places, routeCoordinates }) {
  const mapRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (instanceRef.current) instanceRef.current.remove();
    const map = L.map(mapRef.current, { scrollWheelZoom: true });
    instanceRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const bounds = [];
    places.forEach((place, index) => {
      const marker = L.marker([place.lat, place.lng]).addTo(map);
      marker.bindPopup(`<strong>${index + 1}. ${place.name}</strong><br>${place.state}`);
      bounds.push([place.lat, place.lng]);
    });

    if (routeCoordinates?.length > 1) {
      L.polyline(routeCoordinates, { weight: 5, opacity: 0.85 }).addTo(map);
      routeCoordinates.forEach(point => bounds.push(point));
    }

    if (bounds.length) map.fitBounds(bounds, { padding: [35, 35] });
    else map.setView([22.5, 79], 5);

    return () => { map.remove(); instanceRef.current = null; };
  }, [places, routeCoordinates]);

  return <div ref={mapRef} className="roadmap-map" aria-label="Travel roadmap map" />;
}
