export const DEFAULT_USER = { name: "Traveler", email: "", phone: "", dob: "", gender: "", state: "", address: "", travelTypes: [], budget: "", interests: "", role: "user" };

export function getUser() { try { return JSON.parse(sessionStorage.getItem("stg_user")) || null; } catch { return null; } }
export function saveUser(user) { sessionStorage.setItem("stg_user", JSON.stringify(user)); }
export function isLoggedIn() { return sessionStorage.getItem("stg_session_active") === "true"; }
export function setLoggedIn(value) { sessionStorage.setItem("stg_session_active", String(value)); }
export function getSessionToken() { return sessionStorage.getItem("stg_session_token") || ""; }
export function clearSession() { sessionStorage.removeItem("stg_session_active"); sessionStorage.removeItem("stg_user"); sessionStorage.removeItem("stg_session_token"); }
export function authHeaders(extra={}) { const token=getSessionToken(); return token ? { ...extra, Authorization: `Bearer ${token}` } : extra; }
export function apiFetch(url, options={}) {
  const headers = authHeaders(options.headers || {});
  return fetch(url, { ...options, headers, credentials: "include" });
}
export async function getServerSession() {
  try {
    const r = await apiFetch("/api/session");
    if (!r.ok) {
      if (r.status === 401 && getSessionToken()) clearSession();
      return null;
    }
    const data = await r.json();
    if (data.authenticated && data.user) { saveUser(data.user); setLoggedIn(true); return data.user; }
  } catch {}
  return null;
}
export async function logoutSession() {
  try { await apiFetch("/api/logout", { method: "POST" }); } catch {}
  clearSession();
}

const KEY_PACKAGES = "stg_guide_packages";
const KEY_BOOKINGS = "stg_package_bookings";
const KEY_GUIDE_PLACES = "stg_guide_place_availability";

export function readJSON(key, fallback=[]) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
export function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event("stg-data-change")); }
export function getGuidePackages() { return readJSON(KEY_PACKAGES, []); }
export function saveGuidePackage(pkg) { const all=getGuidePackages(); writeJSON(KEY_PACKAGES,[pkg,...all]); return pkg; }
export function deleteGuidePackage(id) { writeJSON(KEY_PACKAGES,getGuidePackages().filter(p=>p.id!==id)); }
export function getBookings() { return readJSON(KEY_BOOKINGS, []); }
export function addBooking(booking) { const all=getBookings(); writeJSON(KEY_BOOKINGS,[booking,...all]); return booking; }
export function getGuidePlaceAvailability() { return readJSON(KEY_GUIDE_PLACES, []); }
export function saveGuidePlaceAvailability(record) { const all=getGuidePlaceAvailability(); const exists=all.some(x=>x.guideEmail===record.guideEmail&&x.placeId===record.placeId&&x.date===record.date); if(!exists) writeJSON(KEY_GUIDE_PLACES,[record,...all]); return record; }
export function removeGuidePlaceAvailability(id) { writeJSON(KEY_GUIDE_PLACES,getGuidePlaceAvailability().filter(x=>x.id!==id)); }

export async function fetchGuidePackages(guideEmail="") { try { const q=guideEmail?`?guideEmail=${encodeURIComponent(guideEmail)}`:""; const r=await apiFetch(`/api/guide/packages${q}`); if(!r.ok) throw new Error(); const data=await r.json(); if(!data.length){ const local=getGuidePackages(); if(guideEmail) return local.filter(p=>p.guideEmail===guideEmail); if(local.length) return local; } return data; } catch { return getGuidePackages(); } }
export async function createGuidePackage(pkg) {
  const r=await apiFetch("/api/guide/packages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(pkg)});
  const d=await r.json();
  if(!r.ok) throw new Error(d.message||"Could not publish package");
  writeJSON(KEY_PACKAGES,getGuidePackages().filter(x=>x.id!==pkg.id));
  return d.package;
}
export async function removeGuidePackage(id) {
  const r=await apiFetch(`/api/guide/packages/${encodeURIComponent(id)}`,{method:"DELETE"});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.message||"Could not delete package");
  writeJSON(KEY_PACKAGES,getGuidePackages().filter(p=>p.id!==id));
  return true;
}

export async function fetchGuideAvailability(filters={}) {
  try { const qs=new URLSearchParams(); if(filters.guideEmail) qs.set("guideEmail",filters.guideEmail); if(filters.city) qs.set("city",filters.city); if(filters.date) qs.set("date",filters.date); const r=await apiFetch(`/api/guide/availability?${qs.toString()}`); if(!r.ok) throw new Error(); return await r.json(); } catch { const all=getGuidePlaceAvailability(); return all.filter(x=>(!filters.guideEmail||x.guideEmail===filters.guideEmail)&&(!filters.city||String(x.city||x.placeCity||"").toLowerCase()===String(filters.city).toLowerCase())&&(!filters.date||x.date===filters.date)); }
}
export async function createGuideAvailability(record) {
  try { const r=await apiFetch("/api/guide/availability",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(record)}); const d=await r.json(); if(!r.ok) throw new Error(d.message||"Could not save availability"); saveGuidePlaceAvailability(d.availability); return d.availability; } catch(e) { if(e.message) throw e; return saveGuidePlaceAvailability(record); }
}
export async function removeGuideAvailability(id) {
  try { const r=await apiFetch(`/api/guide/availability/${encodeURIComponent(id)}`,{method:"DELETE"}); if(!r.ok) throw new Error(); writeJSON(KEY_GUIDE_PLACES,getGuidePlaceAvailability().filter(x=>x.id!==id)); return true; } catch { removeGuidePlaceAvailability(id); return false; }
}
export async function searchAvailableGuides(city,startDate,endDate) {
  try { const qs=new URLSearchParams({city,startDate:startDate||"",endDate:endDate||startDate||""}); const r=await apiFetch(`/api/guide/search?${qs}`); if(!r.ok) throw new Error((await r.json()).message||"Could not search guides"); return await r.json(); } catch { return []; }
}
export async function fetchGuideRequests(filters={}) {
  try { const qs=new URLSearchParams(); if(filters.guideEmail) qs.set("guideEmail",filters.guideEmail); if(filters.travellerEmail) qs.set("travellerEmail",filters.travellerEmail); const r=await apiFetch(`/api/guide/requests?${qs}`); if(!r.ok) throw new Error(); return await r.json(); } catch { return []; }
}
export async function createGuideRequest(request) { const r=await apiFetch("/api/guide/requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(request)}); const d=await r.json(); if(!r.ok) throw new Error(d.message||"Could not send request"); return d.request; }
export async function cancelGuideRequest(id) { const r=await apiFetch(`/api/guide/requests/${encodeURIComponent(id)}`,{method:"DELETE"}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.message||"Could not remove request"); return d.request; }
export async function respondGuideRequest(id,status,rejectionReason="") { const r=await apiFetch(`/api/guide/requests/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,rejectionReason})}); const d=await r.json(); if(!r.ok) throw new Error(d.message||"Could not update request"); return d.request; }
export async function fetchNotifications() { try { const r=await apiFetch("/api/notifications"); if(!r.ok) throw new Error(); return await r.json(); } catch { return []; } }
export async function markNotificationRead(id) { try { await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`,{method:"PATCH"}); } catch {} }
export async function fetchBookings(filters={}) { try { const qs=new URLSearchParams(); if(filters.guideEmail) qs.set("guideEmail",filters.guideEmail); if(filters.travellerEmail) qs.set("travellerEmail",filters.travellerEmail); const r=await apiFetch(`/api/bookings?${qs.toString()}`); if(!r.ok) throw new Error(); return await r.json(); } catch { const all=getBookings(); if(filters.guideEmail) return all.filter(b=>b.guideEmail===filters.guideEmail); if(filters.travellerEmail) return all.filter(b=>b.travellerEmail===filters.travellerEmail); return all; } }
export async function confirmPackageBooking(id) { const r=await apiFetch(`/api/bookings/${encodeURIComponent(id)}/confirm`,{method:"PATCH"}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.message||"Could not confirm booking"); return d.booking; }
export async function respondPackageBooking(id,status,rejectionReason="") { const r=await apiFetch(`/api/bookings/${encodeURIComponent(id)}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,rejectionReason})}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.message||"Could not update booking"); return d.booking; }
export async function createBooking(booking) { try { const r=await apiFetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(booking)}); const d=await r.json(); if(!r.ok) throw new Error(d.message||"Could not complete booking"); addBooking(d.booking); return d.booking; } catch(e) { if(e.message) throw e; return addBooking(booking); } }

export function parseDate(value) { if(!value) return null; const d=new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? null : d; }
export function daysBetween(start,end) { const a=parseDate(start), b=parseDate(end); if(!a||!b||b<a) return 0; return Math.floor((b-a)/86400000)+1; }
export function rangesOverlap(aStart,aEnd,bStart,bEnd) { const a=parseDate(aStart), b=parseDate(aEnd), c=parseDate(bStart), d=parseDate(bEnd); return !!(a&&b&&c&&d&&a<=d&&c<=b); }
export function guideHasPackageConflict(guideEmail, placeId, date) { return getGuidePackages().some(p=>p.guideEmail===guideEmail && p.places?.some(x=>String(x.id)===String(placeId)) && rangesOverlap(p.startDate,p.endDate,date,date)); }
export function guideIsAvailableForPlace(placeId,date) { const places=getGuidePlaceAvailability(); return places.filter(x=>String(x.placeId)===String(placeId)&&x.date===date&&!guideHasPackageConflict(x.guideEmail,placeId,date)); }
export function guideHasAnyPackageOnDate(guideEmail,date) { return getGuidePackages().some(p=>p.guideEmail===guideEmail&&rangesOverlap(p.startDate,p.endDate,date,date)); }
export function formatDate(value) { const d=parseDate(value); return d ? d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—"; }
export function formatDateTime(date,time="") { if(!date) return "—"; if(!time) return formatDate(date); const d=new Date(`${date}T${time}`); if(Number.isNaN(d.getTime())) return formatDate(date); return d.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }

const KEY_REVIEWS = "stg_reviews";
export function getReviews() { return readJSON(KEY_REVIEWS, []); }
export function saveReview(review) { const all=getReviews(); writeJSON(KEY_REVIEWS,[review,...all]); return review; }
