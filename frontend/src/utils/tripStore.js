import { getUser } from "../utils";

const CHANNEL_NAME = "stg-trip-store-v2";
const PREFIX = "stg_saved_trips_v2";

let channel = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event) => {
      if (event?.data?.type === "trip-change") {
        window.dispatchEvent(new CustomEvent("stg-trip-store-change", { detail: event.data }));
      }
    });
  } catch {
    channel = null;
  }
}

function getUserKey() {
  const user = getUser();
  const email = String(user?.email || "guest").trim().toLowerCase();
  return `${PREFIX}:${encodeURIComponent(email || "guest")}`;
}

function readTrips() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(getUserKey()) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTrips(trips, detail = {}) {
  if (typeof window === "undefined") return;
  const clean = trips.map(normalizeTrip);
  window.localStorage.setItem(getUserKey(), JSON.stringify(clean));
  window.dispatchEvent(new CustomEvent("stg-trip-store-change", { detail: { ...detail, trips: clean } }));
  try { channel?.postMessage({ type: "trip-change", ...detail, trips: clean }); } catch {}
}

function normalizeTrip(trip) {
  return {
    id: String(trip.id),
    name: String(trip.name || "My Trip"),
    placeIds: Array.from(new Set((trip.placeIds || []).map(String))),
    createdAt: trip.createdAt || new Date().toISOString(),
    updatedAt: trip.updatedAt || trip.createdAt || new Date().toISOString(),
  };
}

function emit(detail = {}) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("stg-trip-store-change", { detail }));
  }
}

export function getTrips() {
  return readTrips();
}

export function getTripById(id) {
  return getTrips().find(trip => String(trip.id) === String(id)) || null;
}

export function saveTrip(trip) {
  const now = new Date().toISOString();
  const normalized = normalizeTrip({ ...trip, updatedAt: now });
  const all = getTrips();
  const index = all.findIndex(t => String(t.id) === normalized.id);
  if (index >= 0) all[index] = normalized;
  else all.unshift(normalized);
  writeTrips(all, { action: index >= 0 ? "update" : "create", tripId: normalized.id });
  return normalized;
}

export function createTrip(name, placeIds = []) {
  const trip = normalizeTrip({
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `trip-${Date.now()}`,
    name: name?.trim() || `My Trip ${new Date().toLocaleDateString("en-IN")}`,
    placeIds,
  });
  const all = getTrips();
  all.unshift(trip);
  writeTrips(all, { action: "create", tripId: trip.id });
  return trip;
}

export function renameTrip(id, name) {
  const all = getTrips();
  const trip = all.find(t => String(t.id) === String(id));
  if (!trip) return null;
  trip.name = name?.trim() || trip.name;
  trip.updatedAt = new Date().toISOString();
  writeTrips(all, { action: "rename", tripId: trip.id });
  return normalizeTrip(trip);
}

export function deleteTrip(id) {
  const normalizedId = String(id);
  const all = getTrips().filter(t => String(t.id) !== normalizedId);
  writeTrips(all, { action: "delete", tripId: normalizedId });
  if (typeof window !== "undefined" && getActivePlanTripId() === normalizedId) {
    window.localStorage.removeItem("stg_active_plan_trip");
  }
  return all;
}

export function addPlaceToTrip(tripId, placeId) {
  const all = getTrips();
  const trip = all.find(t => String(t.id) === String(tripId));
  if (!trip) return null;
  const normalizedId = String(placeId);
  if (!trip.placeIds.includes(normalizedId)) trip.placeIds.push(normalizedId);
  trip.updatedAt = new Date().toISOString();
  writeTrips(all, { action: "add-place", tripId: trip.id, placeId: normalizedId });
  return normalizeTrip(trip);
}

export function addPlacesToTrip(tripId, placeIds) {
  const all = getTrips();
  const trip = all.find(t => String(t.id) === String(tripId));
  if (!trip) return null;
  const ids = placeIds.map(String);
  trip.placeIds = Array.from(new Set([...trip.placeIds, ...ids]));
  trip.updatedAt = new Date().toISOString();
  writeTrips(all, { action: "add-places", tripId: trip.id, placeIds: ids });
  return normalizeTrip(trip);
}

export function removePlaceFromTrip(tripId, placeId) {
  const all = getTrips();
  const trip = all.find(t => String(t.id) === String(tripId));
  if (!trip) return null;
  trip.placeIds = trip.placeIds.filter(id => String(id) !== String(placeId));
  trip.updatedAt = new Date().toISOString();
  writeTrips(all, { action: "remove-place", tripId: trip.id, placeId: String(placeId) });
  return normalizeTrip(trip);
}

export function setTripPlaces(tripId, placeIds) {
  const all = getTrips();
  const trip = all.find(t => String(t.id) === String(tripId));
  if (!trip) return null;
  trip.placeIds = Array.from(new Set(placeIds.map(String)));
  trip.updatedAt = new Date().toISOString();
  writeTrips(all, { action: "set-places", tripId: trip.id });
  return normalizeTrip(trip);
}

export function subscribeTrips(handler) {
  if (typeof window === "undefined") return () => {};
  const listener = () => handler(getTrips());
  const storageListener = (event) => {
    if (event.key === getUserKey()) listener();
  };
  window.addEventListener("stg-trip-store-change", listener);
  window.addEventListener("storage", storageListener);
  return () => {
    window.removeEventListener("stg-trip-store-change", listener);
    window.removeEventListener("storage", storageListener);
  };
}

export function getTripsContainingPlace(placeId) {
  return getTrips().filter(trip => trip.placeIds.includes(String(placeId)));
}

export function createOrReuseTrip(name, placeIds = []) {
  const normalized = Array.from(new Set(placeIds.map(String)));
  const exact = getTrips().find(trip => trip.placeIds.length === normalized.length && normalized.every(id => trip.placeIds.includes(id)));
  if (exact) return exact;
  return createTrip(name, normalized);
}

export function setActivePlan(tripId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("stg_active_plan_trip", String(tripId || ""));
  emit({ action: "active-plan", tripId: String(tripId || "") });
}

export function getActivePlanTripId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("stg_active_plan_trip") || "";
}
