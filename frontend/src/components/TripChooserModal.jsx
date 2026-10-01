import React, { useEffect, useState } from "react";
import { addPlacesToTrip, createTrip, getTrips, subscribeTrips } from "../utils/tripStore";

export default function TripChooserModal({ places = [], open, onClose, onAdded }) {
  const [trips, setTrips] = useState(() => getTrips());
  const [mode, setMode] = useState("existing");
  const [tripId, setTripId] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeTrips(setTrips), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => { if (event.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const current = getTrips();
    setTrips(current);
    setMode(current.length ? "existing" : "new");
    setTripId(current[0]?.id || "");
    setName("");
    setBusy(false);
  }, [open]);

  if (!open || !places.length) return null;

  const ids = places.map(place => String(place.id));

  const submit = (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const trip = mode === "new"
        ? createTrip(name.trim(), ids)
        : addPlacesToTrip(tripId, ids);
      if (!trip) throw new Error("Could not update the selected trip.");
      onAdded?.(trip);
      onClose?.();
    } catch (error) {
      setBusy(false);
      window.alert(error.message || "Could not add the places to the trip.");
    }
  };

  return (
    <div className="modal-backdrop-custom trip-modal-backdrop" role="dialog" aria-modal="true">
      <form className="trip-choice-modal trip-choice-modal-large" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <span className="eyebrow"><i className="bi bi-heart-fill"/> Add selected places to a trip</span>
        <h2>Choose where these places should go</h2>
        <p>All places currently in My Places will be added together. You can choose an existing trip or create a new one.</p>

        <div className="trip-choice-summary-grid">
          {places.map(place => (
            <div className="trip-choice-summary-card" key={place.id}>
              {place.image ? <img src={place.image} alt="" /> : <span className="trip-choice-summary-placeholder"><i className="bi bi-camera" /></span>}
              <div><strong>{place.name}</strong><small>{place.city || place.state || "India"}</small></div>
            </div>
          ))}
        </div>

        <div className="trip-choice-tabs">
          <button type="button" className={mode === "existing" ? "active" : ""} onClick={() => setMode("existing")} disabled={!trips.length}>Existing trip</button>
          <button type="button" className={mode === "new" ? "active" : ""} onClick={() => setMode("new")}>Create new trip</button>
        </div>

        {mode === "existing" ? (
          trips.length ? (
            <div className="trip-choice-list">
              {trips.map(trip => (
                <label className={`trip-choice-item ${tripId === trip.id ? "selected" : ""}`} key={trip.id}>
                  <input type="radio" name="trip" value={trip.id} checked={tripId === trip.id} onChange={() => setTripId(trip.id)} />
                  <span><strong>{trip.name}</strong><small>{trip.placeIds.length} place{trip.placeIds.length === 1 ? "" : "s"} · Add selected places here</small></span>
                </label>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty"><i className="bi bi-journal-plus"/><strong>No trips yet</strong><span>Create your first trip to continue.</span></div>
          )
        ) : (
          <label className="trip-name-field">
            <span>Trip name</span>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Andhra Weekend" required />
          </label>
        )}

        <div className="trip-choice-actions">
          <span className="trip-choice-count">{places.length} selected place{places.length === 1 ? "" : "s"}</span>
          <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || (mode === "existing" && !tripId) || (mode === "new" && !name.trim())}>
            {busy ? "Saving…" : mode === "new" ? "Create Trip & Add" : "Add to Trip"}
          </button>
        </div>
      </form>
    </div>
  );
}
