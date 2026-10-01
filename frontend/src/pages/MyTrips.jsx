import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createTrip, deleteTrip, getTrips, renameTrip, removePlaceFromTrip, subscribeTrips } from "../utils/tripStore";
import { fetchPlaceById } from "../utils/placeApi";
import { getUser, fetchGuideRequests, createGuideRequest, searchAvailableGuides, fetchNotifications, markNotificationRead, formatDate } from "../utils";
import GeneratePlanModal from "../components/GeneratePlanModal";
import AddPlaceToTripModal from "../components/AddPlaceToTripModal";

export default function MyTrips(){
  const [trips,setTrips]=useState(()=>getTrips());
  const [placeCache,setPlaceCache]=useState({});
  const [newName,setNewName]=useState("");
  const [generate,setGenerate]=useState({open:false,places:[],tripId:""});
  const [addPlaceModal,setAddPlaceModal]=useState({open:false,trip:null});
  const [guideModal,setGuideModal]=useState({open:false,trip:null});
  const [requests,setRequests]=useState([]);
  const [notifications,setNotifications]=useState([]);
  const [notificationsModal,setNotificationsModal]=useState(false);
  const [searchParams,setSearchParams]=useSearchParams();
  const user=getUser()||{};

  useEffect(()=>subscribeTrips(next=>setTrips(next)),[]);
  useEffect(()=>{
    const tripId=searchParams.get("tripId");
    if(!tripId || !trips.length) return;
    const target=document.getElementById(`trip-card-${tripId}`);
    if(!target) return;
    target.scrollIntoView({behavior:"smooth",block:"center"});
    target.classList.add("trip-card-focus");
    const timer=window.setTimeout(()=>target.classList.remove("trip-card-focus"),1800);
    const cleanupTimer=window.setTimeout(()=>setSearchParams(prev=>{const next=new URLSearchParams(prev);next.delete("tripId");return next;},{replace:true}),2200);
    return()=>{window.clearTimeout(timer);window.clearTimeout(cleanupTimer);};
  },[searchParams,trips,setSearchParams]);
  useEffect(()=>{
    let active=true; const ids=[...new Set(trips.flatMap(t=>t.placeIds.map(String)))]; const missing=ids.filter(id=>!placeCache[id]);
    if(!missing.length) return;
    (async()=>{const entries=await Promise.all(missing.map(async id=>[id,await fetchPlaceById(id)]));if(!active)return;setPlaceCache(prev=>{const next={...prev};entries.forEach(([id,p])=>{if(p)next[id]=p});return next})})();
    return()=>{active=false};
  },[trips]);
  const refreshRequests=async()=>{if(!user.email)return;setRequests(await fetchGuideRequests({travellerEmail:user.email}));setNotifications(await fetchNotifications())};
  useEffect(()=>{refreshRequests();const t=setInterval(refreshRequests,5000);return()=>clearInterval(t)},[]);

  const create=()=>{if(!newName.trim())return;createTrip(newName.trim(),[]);setNewName("")};
  const rename=(trip)=>{const next=window.prompt("Trip name",trip.name);if(next?.trim())renameTrip(trip.id,next.trim())};
  const openGenerate=(trip)=>{const tripPlaces=trip.placeIds.map(id=>placeCache[String(id)]).filter(Boolean);if(trip.placeIds.length<2)return;if(tripPlaces.length!==trip.placeIds.length){window.alert("Some places are still loading. Please wait a moment and try again.");return}setGenerate({open:true,places:tripPlaces,tripId:trip.id})};
  const requestForTrip=(trip)=>setGuideModal({open:true,trip});
  const statusForTrip=(tripId)=>requests.filter(r=>r.tripId===tripId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0];

  return <main className="inner-page my-trips-page">
    <div className="inner-header"><span className="eyebrow"><i className="bi bi-journal-bookmark"/> My journeys</span><h1>My Trips <button type="button" className="trip-notification-btn" onClick={()=>setNotificationsModal(true)} title="Notifications"><i className="bi bi-bell-fill"/>{notifications.some(n=>!n.read)&&<b>{notifications.filter(n=>!n.read).length}</b>}</button></h1><p>Trips contain only the places you choose. A starting place is selected only when you generate the route.</p></div>
    <section className="trip-create-bar"><div><strong>Create a new trip</strong><small>Start an empty trip and add places from Search, Recommendations or Packages.</small></div><div className="trip-create-form"><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Trip name" onKeyDown={e=>e.key==="Enter"&&create()}/><button className="btn btn-primary" onClick={create} disabled={!newName.trim()}>Create Trip</button></div></section>
    {trips.length===0?<div className="empty-state"><i className="bi bi-map"/><strong>No saved trips yet</strong><span>Use the heart on a place and choose a trip, or create a new trip above.</span><Link className="btn btn-primary" to="/user/search">Explore Places</Link></div>:<div className="saved-trips-grid">
      {trips.map(trip=>{const tripPlaces=trip.placeIds.map(id=>placeCache[String(id)]).filter(Boolean);const ready=tripPlaces.length===trip.placeIds.length;const request=statusForTrip(trip.id);return <article id={`trip-card-${trip.id}`} className="saved-trip-card" key={trip.id}>
        <div className="saved-trip-head"><div><span className="eyebrow"><i className="bi bi-briefcase"/> Trip</span><h3>{trip.name}</h3><small>{trip.placeIds.length} place{trip.placeIds.length===1?"":"s"}</small></div><div className="saved-trip-head-actions"><button type="button" className="icon-btn" onClick={()=>rename(trip)} title="Rename trip"><i className="bi bi-pencil"/></button><button type="button" className="icon-btn danger" onClick={()=>window.confirm(`Delete ${trip.name}?`)&&deleteTrip(trip.id)} title="Delete trip"><i className="bi bi-trash3"/></button></div></div>
        <div className="saved-trip-places">{tripPlaces.length?tripPlaces.map(place=><div className="saved-trip-place" key={place.id}>{place.image?<img src={place.image} alt=""/>:<span className="saved-trip-place-placeholder"><i className="bi bi-camera"/></span>}<div><Link to={`/place/${encodeURIComponent(place.id)}`} state={{fromSearch:"/user/trips",place}}><strong>{place.name}</strong></Link><small>{place.city?`${place.city}${place.state?`, ${place.state}`:""}`:place.state}</small></div><button type="button" className="trip-remove-place" onClick={()=>removePlaceFromTrip(trip.id,place.id)} title="Remove from this trip"><i className="bi bi-x-lg"/></button></div>):<div className="saved-trip-empty"><i className="bi bi-heart"/> No places in this trip yet.</div>}{!ready&&<div className="saved-trip-loading"><span className="spinner-border spinner-border-sm"/> Loading saved places…</div>}</div>
        {request&&<div className={`guide-booking-status ${String(request.status||"").toLowerCase().replace(/\s+/g,"-")}`}><strong>Guide / Travel System: {request.status}</strong>{request.status==="Accepted"&&<span> Contact: {request.guidePhone||"See guide details"}</span>}{request.status==="Rejected"&&request.rejectionReason&&<small>Reason: {request.rejectionReason}</small>}{request.status==="Not Available"&&<small>{request.statusReason||"The selected Local Guide is no longer available for the requested dates."}</small>}</div>}
        <div className="saved-trip-actions"><button type="button" className="btn btn-outline-primary" onClick={()=>setAddPlaceModal({open:true,trip})}><i className="bi bi-plus-circle"/> Add places</button><button type="button" className="btn btn-outline-success" disabled={!ready||trip.placeIds.length<1} onClick={()=>requestForTrip(trip)}><i className="bi bi-person-badge"/> Book Guide / Travel System</button><button type="button" className="btn btn-primary" disabled={!ready||trip.placeIds.length<2} onClick={()=>openGenerate(trip)}><i className="bi bi-signpost-2"/> Generate Plan</button></div>
      </article>})}
    </div>}
    <GeneratePlanModal open={generate.open} places={generate.places} tripId={generate.tripId} onClose={()=>setGenerate({open:false,places:[],tripId:""})}/>
    <AddPlaceToTripModal open={addPlaceModal.open} trip={addPlaceModal.trip} onClose={()=>setAddPlaceModal({open:false,trip:null})}/>
    <BookGuideModal open={guideModal.open} trip={guideModal.trip} placeCache={placeCache} requests={requests} onClose={()=>setGuideModal({open:false,trip:null})} onSent={async()=>{await refreshRequests();setGuideModal({open:false,trip:null})}}/>
    <NotificationsModal open={notificationsModal} notifications={notifications} onClose={()=>setNotificationsModal(false)} onRead={async id=>{await markNotificationRead(id);await refreshRequests()}}/>
  </main>;
}

function BookGuideModal({open,trip,placeCache,requests,onClose,onSent}){
 const [city,setCity]=useState("");const [startDate,setStartDate]=useState("");const [endDate,setEndDate]=useState("");const [requirements,setRequirements]=useState("");const [guides,setGuides]=useState([]);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{if(!open||!trip)return;const cities=[...new Set(trip.placeIds.map(id=>placeCache[String(id)]?.city).filter(Boolean))];setCity(cities[0]||"");setStartDate("");setEndDate("");setGuides([]);setError("")},[open,trip?.id]);
 if(!open||!trip)return null;
 const places=trip.placeIds.map(id=>placeCache[String(id)]).filter(Boolean);const cities=[...new Set(places.map(p=>p.city).filter(Boolean))];
 const search=async()=>{if(!city||!startDate||!endDate)return setError("Select a location and trip dates first.");if(endDate<startDate)return setError("End date must be on or after start date.");setLoading(true);setError("");try{const result=await searchAvailableGuides(city,startDate,endDate);setGuides(result);if(!result.length)setError("No Local Guides are marked available for this location and date range.")}catch(e){setError(e.message||"Could not search guides.")}finally{setLoading(false)}};
 const send=async guide=>{try{await createGuideRequest({tripId:trip.id,tripName:trip.name,location:city,startDate,endDate,places,requirements,guideEmail:guide.email});await onSent()}catch(e){setError(e.message||"Could not send request.")}};
 return <div className="modal-backdrop-custom"><div className="guide-modal guide-book-modal"><button className="modal-close" onClick={onClose}>×</button><h2>Book Guide / Travel System</h2><p>Select a location from this trip, enter the required dates, then search guides who have marked themselves available.</p><div className="field"><label>Location <em>*</em></label><select value={city} onChange={e=>{setCity(e.target.value);setGuides([])}}><option value="">Select location</option>{cities.map(c=><option key={c}>{c}</option>)}</select></div><div className="form-grid"><div className="field"><label>Start Date <em>*</em></label><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} min={new Date().toLocaleDateString("en-CA")}/></div><div className="field"><label>End Date <em>*</em></label><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} min={startDate||new Date().toLocaleDateString("en-CA")}/></div></div><div className="field"><label>Traveller Requirements</label><textarea rows="3" value={requirements} onChange={e=>setRequirements(e.target.value)} placeholder="Tell the guide about your requirements (optional)"/></div><button className="btn btn-primary w-100" onClick={search} disabled={loading}>{loading?"Searching…":"Search for Guides"}</button>{error&&<div className="alert alert-info mt-3">{error}</div>}<div className="guide-search-results">{guides.map(g=>{const existing=requests.find(r=>r.tripId===trip.id&&r.guideEmail===g.email&&["Pending","Accepted"].includes(r.status));return <article className="guide-result-card" key={g.email}><div className="guide-result-avatar">{(g.name||"G").charAt(0)}</div><div className="guide-result-main"><h3>{g.name}</h3><p><b>Experience:</b> {g.experience||"Not provided"}</p><p><b>Languages:</b> {g.languages||"Not provided"}</p><p><b>Previous Trips:</b> {g.previousTrips}</p><p>{g.guideBio||"Local Guide"}</p><p><b>Contact:</b> {g.phone||"Not provided"} · {g.email}</p><div className="guide-result-actions">{existing?<span className={`guide-request-pill ${existing.status.toLowerCase()}`}>{existing.status}</span>:<button className="btn btn-outline-success" onClick={()=>send(g)}>Send Request</button>}</div></div></article>})}</div></div></div>
}

function NotificationsModal({open,notifications,onClose,onRead}){if(!open)return null;return <div className="modal-backdrop-custom"><div className="guide-modal"><button className="modal-close" onClick={onClose}>×</button><h2>Notifications</h2>{notifications.length?notifications.map(n=><button className={`notification-row ${n.read?"read":"unread"}`} key={n.id} onClick={()=>!n.read&&onRead(n.id)}><i className="bi bi-bell-fill"/><span>{n.message}<small>{new Date(n.createdAt).toLocaleString("en-IN")}</small></span></button>):<EmptyNotification/>}</div></div>}
function EmptyNotification(){return <div className="empty-state guide-empty"><i className="bi bi-bell"/><strong>No notifications</strong></div>}
