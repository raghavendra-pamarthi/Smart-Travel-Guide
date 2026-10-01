import React, { useEffect, useState } from "react";
import { fetchPlaces } from "../utils/placeApi";
import { addPlaceToTrip, getTripById, subscribeTrips } from "../utils/tripStore";

export default function AddPlaceToTripModal({ open, trip, onClose }) {
  const [currentTrip, setCurrentTrip] = useState(trip || null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState("");

  useEffect(() => {
    if (!open) return;
    setCurrentTrip(trip ? getTripById(trip.id) || trip : null);
    setQuery("");
    setResults([]);
    setAddingId("");
  }, [open, trip]);

  useEffect(() => {
    if (!open) return;
    return subscribeTrips(() => {
      if (trip?.id) setCurrentTrip(getTripById(trip.id));
    });
  }, [open, trip?.id]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchPlaces({ q: query.trim(), page: 1, pageSize: 24 });
        setResults(data || []);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  if (!open || !currentTrip) return null;

  const included = new Set((currentTrip.placeIds || []).map(String));

  const handleAdd = (place) => {
    const id = String(place.id);
    if (included.has(id) || addingId) return;
    setAddingId(id);
    const updated = addPlaceToTrip(currentTrip.id, id);
    if (updated) setCurrentTrip(updated);
    window.setTimeout(() => setAddingId(""), 250);
  };

  return (
    <div className="modal-backdrop-custom trip-modal-backdrop" role="dialog" aria-modal="true">
      <div className="trip-choice-modal add-place-modal-large">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="eyebrow"><i className="bi bi-plus-circle"/> Add places</span>
        <h2>Add places to {currentTrip.name}</h2>
        <p>Search the complete destination catalogue and add places directly to this trip.</p>

        <div className="add-place-search">
          <i className="bi bi-search" />
          <input value={query} onChange={e => setQuery(e.target.value)} autoFocus placeholder="Search any place, city or state" />
        </div>

        <div className="add-place-results">
          {loading ? (
            <div className="add-place-empty"><i className="bi bi-arrow-repeat spinner-inline" /> Searching places…</div>
          ) : results.length ? results.map(place => {
            const already = included.has(String(place.id));
            return (
              <div className="add-place-result" key={place.id}>
                {place.image ? <img src={place.image} alt="" /> : <span className="add-place-result-placeholder"><i className="bi bi-camera"/></span>}
                <div>
                  <strong>{place.name}</strong>
                  <small>{place.city || place.state || "India"}{place.city && place.state ? `, ${place.state}` : ""}</small>
                  <span>{place.type || "Tourist Attraction"}</span>
                </div>
                <button type="button" className={`btn ${already ? "btn-light" : "btn-primary"}`} onClick={() => handleAdd(place)} disabled={already || addingId === String(place.id)}>
                  {already ? "Added" : addingId === String(place.id) ? "Adding…" : "Add"}
                </button>
              </div>
            );
          }) : (
            <div className="add-place-empty"><i className="bi bi-search"/><strong>No places found</strong><span>Try another place name, city or state.</span></div>
          )}
        </div>

        <div className="add-place-footer">
          <small>{currentTrip.placeIds.length} places currently in this trip</small>
          <button type="button" className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
