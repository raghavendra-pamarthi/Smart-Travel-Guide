import { destinations, VIJAYAWADA_PACKAGE_PLACES, VISAKHAPATNAM_PACKAGE_PLACES, TIRUPATI_PACKAGE_PLACES, HYDERABAD_PACKAGE_PLACES } from "../data/travelData";

const SELECTED_IDS_KEY = "stg_selected_places";
const SELECTED_DATA_KEY = "stg_selected_places_data";
const SELECTION_CHANNEL_NAME = "stg-trip-state";

let selectionChannel = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    selectionChannel = new BroadcastChannel(SELECTION_CHANNEL_NAME);
    selectionChannel.addEventListener("message", (event) => {
      if (event?.data?.type === "selection-change") {
        window.dispatchEvent(new CustomEvent("stg-selection-change", { detail: { crossTab: true } }));
      }
    });
  } catch {
    selectionChannel = null;
  }
}

function catalog() {
  const fallback = [...destinations, ...VIJAYAWADA_PACKAGE_PLACES, ...VISAKHAPATNAM_PACKAGE_PLACES, ...TIRUPATI_PACKAGE_PLACES, ...HYDERABAD_PACKAGE_PLACES].map(d => ({
    ...d,
    id: String(d.id),
    city: d.city || d.name,
    country: d.country || "India",
    description: d.description || "",
    images: d.images || [d.image]
  }));
  try {
    const saved = JSON.parse(sessionStorage.getItem("stg_place_catalog") || "[]");
    if (Array.isArray(saved) && saved.length) {
      const merged = new Map(fallback.map(p => [String(p.id), p]));
      saved.forEach(p => merged.set(String(p.id), p));
      return [...merged.values()];
    }
  } catch {}
  return fallback;
}

function parseArray(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function getSharedIds() {
  if (typeof window === "undefined") return [];
  // localStorage is the single source of truth for the temporary My Places cart.
  // If an older build left a session-only selection behind, migrate it once.
  const stored = window.localStorage.getItem(SELECTED_IDS_KEY);
  if (stored !== null) return parseArray(window.localStorage, SELECTED_IDS_KEY).map(String);
  const legacyIds = parseArray(window.sessionStorage, SELECTED_IDS_KEY).map(String);
  if (legacyIds.length) {
    try { window.localStorage.setItem(SELECTED_IDS_KEY, JSON.stringify(legacyIds)); } catch {}
  }
  return legacyIds;
}

function getSharedPlaceData() {
  if (typeof window === "undefined") return [];
  return parseArray(window.localStorage, SELECTED_DATA_KEY);
}

function writeSelection(ids, places) {
  if (typeof window === "undefined") return;
  const normalizedIds = ids.map(String);
  try {
    window.localStorage.setItem(SELECTED_IDS_KEY, JSON.stringify(normalizedIds));
    window.localStorage.setItem(SELECTED_DATA_KEY, JSON.stringify(places));
  } catch {}
  // Keep the session copy for existing in-tab code/backward compatibility.
  try {
    window.sessionStorage.setItem(SELECTED_IDS_KEY, JSON.stringify(normalizedIds));
  } catch {}
  window.dispatchEvent(new CustomEvent("stg-selection-change"));
  try {
    selectionChannel?.postMessage({ type: "selection-change", ids: normalizedIds });
  } catch {}
}

export function getDestinationById(id) {
  const normalized = String(id);
  const shared = getSharedPlaceData().find(d => String(d.id) === normalized);
  if (shared) return shared;
  return catalog().find(d => String(d.id) === normalized);
}

export function getSelectedDestinations() {
  if (typeof window === "undefined") return [];
  const ids = getSharedIds();
  const shared = getSharedPlaceData();
  const byId = new Map(shared.map(place => [String(place.id), place]));
  const resolved = ids.map(id => byId.get(String(id)) || catalog().find(d => String(d.id) === String(id))).filter(Boolean);

  // Migrate older session-only selections to cross-tab storage the first time they are read.
  if (ids.length && shared.length === 0) {
    writeSelection(ids, resolved);
  }
  return resolved;
}

export function getSelectedIds() {
  return getSharedIds();
}

export function saveSelectedDestinations(ids) {
  const normalizedIds = ids.map(String);
  const previous = getSharedPlaceData();
  const previousById = new Map(previous.map(place => [String(place.id), place]));
  const places = normalizedIds
    .map(id => getDestinationById(id) || previousById.get(id))
    .filter(Boolean);
  writeSelection(normalizedIds, places);
}

export function clearSelectedDestinations() {
  if (typeof window === "undefined") return;
  // Keep an explicit empty value in localStorage. Removing the key would allow
  // an old sessionStorage selection in another tab to resurrect the cart.
  try {
    window.localStorage.setItem(SELECTED_IDS_KEY, JSON.stringify([]));
    window.localStorage.setItem(SELECTED_DATA_KEY, JSON.stringify([]));
  } catch {}
  try { window.sessionStorage.setItem(SELECTED_IDS_KEY, JSON.stringify([])); } catch {}
  window.dispatchEvent(new CustomEvent("stg-selection-change", { detail: { cleared: true } }));
  try { selectionChannel?.postMessage({ type: "selection-change", ids: [], cleared: true }); } catch {}
}

export function toggleSelectedDestination(id) {
  const normalized = String(id);
  const ids = getSharedIds();
  const next = ids.includes(normalized)
    ? ids.filter(x => x !== normalized)
    : [...ids, normalized];
  saveSelectedDestinations(next);
  return next;
}

export function subscribeSelectionChange(handler) {
  if (typeof window === "undefined") return () => {};
  const listener = () => handler(getSelectedDestinations());
  const storageListener = (event) => {
    if (event.key === SELECTED_IDS_KEY || event.key === SELECTED_DATA_KEY) listener();
  };
  window.addEventListener("stg-selection-change", listener);
  if (!selectionChannel) window.addEventListener("storage", storageListener);
  return () => {
    window.removeEventListener("stg-selection-change", listener);
    if (!selectionChannel) window.removeEventListener("storage", storageListener);
  };
}

export function haversineKm(a,b){const R=6371,toRad=v=>v*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lng-a.lng),lat1=toRad(a.lat),lat2=toRad(b.lat),x=Math.sin(dLat/2)**2+Math.sin(dLon/2)**2*Math.cos(lat1)*Math.cos(lat2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
export function shortestOpenRoute(points,matrix=null){const n=points.length;if(n<=1)return{order:points.map((_,i)=>i),distance:0};const dist=(i,j)=>matrix?.[i]?.[j]??haversineKm(points[i],points[j]),size=1<<n,dp=Array.from({length:size},()=>Array(n).fill(Infinity)),parent=Array.from({length:size},()=>Array(n).fill(-1));for(let i=0;i<n;i++)dp[1<<i][i]=0;for(let mask=1;mask<size;mask++)for(let last=0;last<n;last++){if(!(mask&(1<<last))||!Number.isFinite(dp[mask][last]))continue;for(let next=0;next<n;next++){if(mask&(1<<next))continue;const nm=mask|(1<<next),candidate=dp[mask][last]+dist(last,next);if(candidate<dp[nm][next]){dp[nm][next]=candidate;parent[nm][next]=last;}}}const full=size-1;let last=0;for(let i=1;i<n;i++)if(dp[full][i]<dp[full][last])last=i;const order=[];let mask=full;while(last!==-1){order.push(last);const prev=parent[mask][last];mask^=1<<last;last=prev;}order.reverse();return{order,distance:dp[full][order[order.length-1]]};}
export async function fetchRoadMatrix(points){if(points.length<2)return null;const coords=points.map(p=>`${p.lng},${p.lat}`).join(";"),url=`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance`,r=await fetch(url);if(!r.ok)throw new Error("Routing service unavailable");const data=await r.json();if(!data.distances)throw new Error("No road distance data");return data.distances.map(row=>row.map(v=>Number.isFinite(v)?v/1000:Infinity));}
export async function fetchRoadRoute(points){if(points.length<2)return null;const coords=points.map(p=>`${p.lng},${p.lat}`).join(";"),url=`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`,r=await fetch(url);if(!r.ok)throw new Error("Route geometry unavailable");const data=await r.json(),route=data.routes?.[0];if(!route)throw new Error("No route found");return{distance:route.distance/1000,duration:route.duration/3600,coordinates:route.geometry.coordinates.map(([lng,lat])=>[lat,lng])};}
export function formatDistance(km){if(km<1)return`${Math.round(km*1000)} m`;return`${km.toLocaleString(undefined,{maximumFractionDigits:0})} km`;} 
export function formatHours(hours){if(!Number.isFinite(hours))return"—";const totalMinutes=Math.round(hours*60),h=Math.floor(totalMinutes/60),m=totalMinutes%60;return h?`${h}h ${m?`${m}m`:""}`.trim():`${m}m`;}

export function shortestOpenRouteFromStart(points, startIndex = 0, matrix = null){
  const n = points.length;
  if(n<=1) return {order: points.map((_,i)=>i), distance:0};
  const start = Math.max(0, Math.min(n-1, Number(startIndex)||0));
  const dist=(i,j)=>matrix?.[i]?.[j]??haversineKm(points[i],points[j]);
  const size=1<<n;
  const dp=Array.from({length:size},()=>Array(n).fill(Infinity));
  const parent=Array.from({length:size},()=>Array(n).fill(-1));
  dp[1<<start][start]=0;
  for(let mask=1;mask<size;mask++) for(let last=0;last<n;last++){
    if(!(mask&(1<<last))||!Number.isFinite(dp[mask][last])) continue;
    for(let next=0;next<n;next++){
      if(mask&(1<<next)) continue;
      const nm=mask|(1<<next), candidate=dp[mask][last]+dist(last,next);
      if(candidate<dp[nm][next]){dp[nm][next]=candidate;parent[nm][next]=last;}
    }
  }
  const full=size-1;
  let last=start;
  for(let i=0;i<n;i++) if(dp[full][i]<dp[full][last]) last=i;
  const order=[]; let mask=full;
  while(last!==-1){ order.push(last); const prev=parent[mask][last]; mask^=1<<last; last=prev; }
  order.reverse();
  return {order,distance:dp[full][order[order.length-1]]};
}
