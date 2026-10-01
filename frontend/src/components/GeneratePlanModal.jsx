import React, { useEffect, useMemo, useState } from "react";
import { createTrip, getTrips, addPlacesToTrip, subscribeTrips, setActivePlan } from "../utils/tripStore";

function sameIds(a = [], b = []) {
  const aa = [...new Set(a.map(String))].sort();
  const bb = [...new Set(b.map(String))].sort();
  return aa.length === bb.length && aa.every((x, i) => x === bb[i]);
}

export default function GeneratePlanModal({ open, places, onClose, tripId: directTripId = "" }) {
  const [trips, setTrips] = useState(() => getTrips());
  const [startId, setStartId] = useState("");
  const [saveMode, setSaveMode] = useState("auto");
  const [tripId, setTripId] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => subscribeTrips(setTrips), []);
  useEffect(() => {
    if (!open) return;
    setStartId(places?.[0]?.id ? String(places[0].id) : "");
    if (directTripId) {
      setSaveMode("direct");
      setTripId(String(directTripId));
      setNewName("");
      return;
    }
    setSaveMode(trips.length ? "existing" : "new");
    setTripId(trips[0]?.id || "");
    setNewName("");
  }, [open, places, trips, directTripId]);

  const selectedPlaceIds = useMemo(() => (places || []).map(p => String(p.id)), [places]);
  if (!open) return null;

  const generate = () => {
    if (!places || places.length < 2 || !startId) return;
    let targetTripId = directTripId ? String(directTripId) : "";
    if (!directTripId) {
      let trip = null;
      if (saveMode === "existing" && tripId) {
        trip = addPlacesToTrip(tripId, selectedPlaceIds);
      } else if (saveMode === "new") {
        const name = newName.trim();
        if (!name) return;
        trip = createTrip(name, selectedPlaceIds);
      }
      if (!trip) return;
      targetTripId = String(trip.id);
    }
    setActivePlan(targetTripId);
    const url = `${window.location.origin}/user/roadmap?tripId=${encodeURIComponent(targetTripId)}&startId=${encodeURIComponent(startId)}`;
    // Keep one route tab per saved trip so generating Trip B can never reuse Trip A's route state.
    const planWindow = window.open(url, `stg-trip-plan-${targetTripId}`);
    if (planWindow) {
      try { planWindow.focus(); } catch {}
      onClose?.();
    } else {
      window.alert("Your browser blocked the new trip-plan tab. Please allow pop-ups for localhost and try again.");
    }
  };

  return (
    <div className="modal-backdrop-custom trip-modal-backdrop" role="dialog" aria-modal="true">
      <div className="generate-plan-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="eyebrow"><i className="bi bi-signpost-2"/> Generate trip plan</span>
        <h2>Choose your starting place</h2>
        <p>The starting location must be one of the places in this trip.</p>

        <div className="start-place-list">
          {places.map(place => (
            <label key={place.id} className={`start-place-item ${String(startId) === String(place.id) ? "selected" : ""}`}>
              <input type="radio" name="start-place" checked={String(startId) === String(place.id)} onChange={() => setStartId(String(place.id))} />
              {place.image ? <img src={place.image} alt="" /> : <span className="start-place-placeholder"><i className="bi bi-camera"/></span>}
              <span><strong>{place.name}</strong><small>{place.city || place.state}</small></span>
            </label>
          ))}
        </div>

        {!directTripId && (
          <div className="generate-save-section">
            <div className="generate-save-heading"><strong>Add these places to a trip first</strong><small>Choose an existing trip or create a new trip. The starting place is chosen only for the route.</small></div>
            <div className="generate-save-options">
              <label><input type="radio" name="save-trip" checked={saveMode === "existing"} onChange={() => setSaveMode("existing")} disabled={!trips.length} /> Add to existing trip</label>
              <label><input type="radio" name="save-trip" checked={saveMode === "new"} onChange={() => setSaveMode("new")} /> Create a new trip</label>
            </div>
            {saveMode === "existing" && (
              <select value={tripId} onChange={e => setTripId(e.target.value)}>
                <option value="">Choose a trip</option>
                {trips.map(trip => <option key={trip.id} value={trip.id}>{trip.name} ({trip.placeIds.length} places)</option>)}
              </select>
            )}
            {saveMode === "new" && <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Trip name" required />}
          </div>
        )}

        <div className="generate-plan-footer">
          <span>{places.length} selected places</span>
          <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={places.length < 2 || !startId || (!directTripId && ((saveMode === "existing" && !tripId) || (saveMode === "new" && !newName.trim())))} onClick={generate}>Generate Plan <i className="bi bi-box-arrow-up-right"/></button>
        </div>
      </div>
    </div>
  );
}
