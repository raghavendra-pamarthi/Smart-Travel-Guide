import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createTrip, deleteTrip, getTrips, renameTrip, removePlaceFromTrip, subscribeTrips } from "../utils/tripStore";
import { fetchPlaceById } from "../utils/placeApi";
import { getUser, fetchGuideRequests, createGuideRequest, cancelGuideRequest, searchAvailableGuides, fetchNotifications, markNotificationRead, formatDate, fetchBookings } from "../utils";
import GeneratePlanModal from "../components/GeneratePlanModal";
import AddPlaceToTripModal from "../components/AddPlaceToTripModal";

export default function MyTrips(){
  const [trips,setTrips]=useState(()=>getTrips());
  const [placeCache,setPlaceCache]=useState({});
  const [newName,setNewName]=useState("");
  const [editingTripId,setEditingTripId]=useState("");
  const [editingTripName,setEditingTripName]=useState("");
  const [generate,setGenerate]=useState({open:false,places:[],tripId:""});
  const [addPlaceModal,setAddPlaceModal]=useState({open:false,trip:null});
  const [guideModal,setGuideModal]=useState({open:false,trip:null});
  const [requests,setRequests]=useState([]);
  const [notifications,setNotifications]=useState([]);
  const [packageBookings,setPackageBookings]=useState([]);
  const [notificationsModal,setNotificationsModal]=useState(false);
  const [statusProfileGuide,setStatusProfileGuide]=useState(null);
  const [searchParams,setSearchParams]=useSearchParams();
  const navigate=useNavigate();
  const user=getUser()||{};

  useEffect(()=>subscribeTrips(next=>setTrips(next)),[]);
  useEffect(()=>{
    const bookingId=searchParams.get("bookingId"); if(!bookingId)return; const target=document.getElementById(`package-booking-${bookingId}`); if(!target)return; target.scrollIntoView({behavior:"smooth",block:"center"}); target.classList.add("trip-card-focus"); const timer=window.setTimeout(()=>target.classList.remove("trip-card-focus"),1800); const cleanup=window.setTimeout(()=>setSearchParams(prev=>{const next=new URLSearchParams(prev);next.delete("bookingId");return next},{replace:true}),2200); return()=>{window.clearTimeout(timer);window.clearTimeout(cleanup)};
  },[searchParams,setSearchParams,packageBookings]);
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
  const refreshRequests=async()=>{if(!user.email)return;setRequests(await fetchGuideRequests({travellerEmail:user.email}));setPackageBookings((await fetchBookings({travellerEmail:user.email})).filter(b=>b.bookingType!=="guide_request"));setNotifications(await fetchNotifications())};
  useEffect(()=>{refreshRequests();const t=setInterval(refreshRequests,5000);return()=>clearInterval(t)},[]);

  const create=()=>{if(!newName.trim())return;createTrip(newName.trim(),[]);setNewName("")};
  const startRename=(trip)=>{setEditingTripId(trip.id);setEditingTripName(trip.name);};
  const cancelRename=()=>{setEditingTripId("");setEditingTripName("");};
  const saveRename=(trip)=>{const next=editingTripName.trim();if(!next)return;renameTrip(trip.id,next);cancelRename();};
  const removeTrip=(trip)=>{
    if(!window.confirm(`Delete ${trip.name}?`)) return;
    const remaining=deleteTrip(trip.id);
    setTrips(Array.isArray(remaining) ? remaining : getTrips());
    setPlaceCache(prev=>{
      const next={...prev};
      for(const placeId of trip.placeIds || []) delete next[String(placeId)];
      return next;
    });
  };
  const openGenerate=(trip)=>{const tripPlaces=trip.placeIds.map(id=>placeCache[String(id)]).filter(Boolean);if(trip.placeIds.length<2)return;if(tripPlaces.length!==trip.placeIds.length){window.alert("Some places are still loading. Please wait a moment and try again.");return}setGenerate({open:true,places:tripPlaces,tripId:trip.id})};
  const requestForTrip=(trip)=>setGuideModal({open:true,trip});
  const requestsForTrip=(tripId)=>requests.filter(r=>r.tripId===tripId).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));

  return <main className="inner-page my-trips-page">
    <div className="inner-header"><span className="eyebrow"><i className="bi bi-journal-bookmark"/> My journeys</span><h1>My Trips <button type="button" className="trip-notification-btn" onClick={()=>setNotificationsModal(true)} title="Notifications"><i className="bi bi-bell-fill"/>{notifications.some(n=>!n.read)&&<b>{notifications.filter(n=>!n.read).length}</b>}</button></h1><p>Trips contain only the places you choose. A starting place is selected only when you generate the route.</p></div>
    {packageBookings.length>0&&<section className="trip-bookings-section"><div className="guide-booking-status-heading"><strong>Package Bookings</strong><span>{packageBookings.length}</span></div><div className="trip-package-booking-list">{packageBookings.map(b=><article id={`package-booking-${b.id}`} className="trip-package-booking-card" key={b.id}><div><span className="booking-type-badge package">PACKAGE</span><h4>{b.packageName||"Package"}</h4><small>Guide: {b.guideName||"Local Guide"}</small></div><div><strong>Date</strong><span>{formatDate(b.bookingDate||b.startDate)}</span></div><div><strong>Total Package Cost</strong><span>₹{Number(b.packageTotalCost??b.price??0).toLocaleString("en-IN")}</span></div>{b.selectedVehicle&&<div><strong>Vehicle</strong><span>{b.selectedVehicle.customType||b.selectedVehicle.type} · ₹{Number(b.vehicleTotalCost||0).toLocaleString("en-IN")}</span></div>}<em className={`booking-status ${String(b.status||"Pending").toLowerCase().replace(/\s+/g,"-")}`}>{b.status||"Pending"}</em>{b.statusReason&&<small className="booking-status-reason">{b.statusReason}</small>}</article>)}</div></section>}
    <section className="trip-create-bar"><div><strong>Create a new trip</strong><small>Start an empty trip and add places from Search, Recommendations or Packages.</small></div><div className="trip-create-form"><input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Trip name" onKeyDown={e=>e.key==="Enter"&&create()}/><button className="btn btn-primary" onClick={create} disabled={!newName.trim()}>Create Trip</button></div></section>
    {trips.length===0?<div className="empty-state"><i className="bi bi-map"/><strong>No saved trips yet</strong><span>Use the heart on a place and choose a trip, or create a new trip above.</span><Link className="btn btn-primary" to="/user/search">Explore Places</Link></div>:<div className="saved-trips-grid">
      {trips.map(trip=>{const tripPlaces=trip.placeIds.map(id=>placeCache[String(id)]).filter(Boolean);const ready=tripPlaces.length===trip.placeIds.length;const tripRequests=requestsForTrip(trip.id);return <article id={`trip-card-${trip.id}`} className="saved-trip-card" key={trip.id}>
        <div className="saved-trip-head"><div className="saved-trip-title-wrap"><span className="eyebrow"><i className="bi bi-briefcase"/> Trip</span>{editingTripId===trip.id?<div className="trip-inline-edit"><input autoFocus value={editingTripName} onChange={e=>setEditingTripName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveRename(trip);if(e.key==="Escape")cancelRename()}} aria-label="Trip name"/><button type="button" className="trip-inline-save" onClick={()=>saveRename(trip)} disabled={!editingTripName.trim()} title="Save trip name"><i className="bi bi-check-lg"/></button><button type="button" className="trip-inline-cancel" onClick={cancelRename} title="Cancel"><i className="bi bi-x-lg"/></button></div>:<h3>{trip.name}</h3>}<small>{trip.placeIds.length} place{trip.placeIds.length===1?"":"s"}</small></div><div className="saved-trip-head-actions"><button type="button" className="icon-btn" onClick={()=>startRename(trip)} title="Rename trip"><i className="bi bi-pencil"/></button><button type="button" className="icon-btn danger" onClick={()=>removeTrip(trip)} title="Delete trip" aria-label={`Delete ${trip.name}`}><i className="bi bi-trash3"/></button></div></div>
        <div className="saved-trip-places">{tripPlaces.length?tripPlaces.map(place=><div className="saved-trip-place" key={place.id}>{place.image?<img src={place.image} alt=""/>:<span className="saved-trip-place-placeholder"><i className="bi bi-camera"/></span>}<div><Link to={`/place/${encodeURIComponent(place.id)}`} state={{fromSearch:"/user/trips",place}}><strong>{place.name}</strong></Link><small>{place.city?`${place.city}${place.state?`, ${place.state}`:""}`:place.state}</small></div><button type="button" className="trip-remove-place" onClick={()=>removePlaceFromTrip(trip.id,place.id)} title="Remove from this trip"><i className="bi bi-x-lg"/></button></div>):<div className="saved-trip-empty"><i className="bi bi-heart"/> No places in this trip yet.</div>}{!ready&&<div className="saved-trip-loading"><span className="spinner-border spinner-border-sm"/> Loading saved places…</div>}</div>
        {tripRequests.length>0&&<div className="guide-booking-status-list"><div className="guide-booking-status-heading"><strong>Guide / Travel System Requests</strong><span>{tripRequests.length}</span></div>{tripRequests.map(request=><GuideRequestStatus key={request.id} request={request} onProfile={()=>setStatusProfileGuide({...request.guideProfile, name:request.guideName, email:request.guideEmail, phone:request.guidePhone, avatarData:request.avatarData, status:request.status, requestId:request.id})} onRemove={async()=>{try{await cancelGuideRequest(request.id);await refreshRequests()}catch(e){window.alert(e.message||"Could not remove the request.")}}}/>)}</div>}
        <div className="saved-trip-actions"><button type="button" className="btn btn-outline-primary" onClick={()=>setAddPlaceModal({open:true,trip})}><i className="bi bi-plus-circle"/> Add places</button><button type="button" className="btn btn-outline-success" disabled={!ready||trip.placeIds.length<1} onClick={()=>requestForTrip(trip)}><i className="bi bi-person-badge"/> Book Guide / Travel System</button><button type="button" className="btn btn-primary" disabled={!ready||trip.placeIds.length<2} onClick={()=>openGenerate(trip)}><i className="bi bi-signpost-2"/> Generate Plan</button></div>
      </article>})}
    </div>}
    <GeneratePlanModal open={generate.open} places={generate.places} tripId={generate.tripId} onClose={()=>setGenerate({open:false,places:[],tripId:""})}/>
    <AddPlaceToTripModal open={addPlaceModal.open} trip={addPlaceModal.trip} onClose={()=>setAddPlaceModal({open:false,trip:null})}/>
    <BookGuideModal open={guideModal.open} trip={guideModal.trip} placeCache={placeCache} requests={requests} onClose={()=>setGuideModal({open:false,trip:null})} onSent={async(close=true)=>{await refreshRequests();if(close)setGuideModal({open:false,trip:null})}}/>
    <NotificationsModal open={notificationsModal} notifications={notifications} requests={requests} onClose={()=>setNotificationsModal(false)} onRead={async n=>{await markNotificationRead(n.id);setNotificationsModal(false);await refreshRequests();if(n.bookingId){setSearchParams({bookingId:String(n.bookingId)});navigate(`/user/trips?bookingId=${encodeURIComponent(n.bookingId)}`);return;}const request=requests.find(r=>String(r.id)===String(n.requestId));if(request?.tripId){setSearchParams({tripId:request.tripId});navigate(`/user/trips?tripId=${encodeURIComponent(request.tripId)}`);}}}/>
    <GuideProfileModal guide={statusProfileGuide} selected={false} actionLabel={statusProfileGuide?.status==="Pending"?"Remove Request":"Close"} onClose={()=>setStatusProfileGuide(null)} onSelect={statusProfileGuide?.status==="Pending"?async()=>{try{await cancelGuideRequest(statusProfileGuide.requestId);setStatusProfileGuide(null);await refreshRequests()}catch(e){window.alert(e.message||"Could not remove the request.")}}:undefined}/>
  </main>;
}

function GuideRequestStatus({request,onRemove,onProfile}){
 const status=String(request.status||"Pending");
 const statusClass=status.toLowerCase().replace(/\s+/g,"-");
 return <article className={`guide-request-status-card ${statusClass}`}>
   <button type="button" className="guide-request-status-main guide-request-status-profile" onClick={onProfile} title="View Local Guide profile">
     <div className="guide-request-status-avatar">{request.avatarData?<img src={request.avatarData} alt={`${request.guideName||"Local Guide"} profile`}/>:<span>{(request.guideName||"G").charAt(0).toUpperCase()}</span>}</div>
     <div className="guide-request-status-copy"><strong>{request.guideName||"Local Guide"}</strong><span className={`guide-status-badge ${statusClass}`}>{status}</span></div>
   </button>
   <div className="guide-request-status-detail">
     {status==="Accepted"&&<p><i className="bi bi-check-circle-fill"/> Accepted{request.guidePhone?` · Contact: ${request.guidePhone}`:""}</p>}
     {status==="Rejected"&&<p><i className="bi bi-x-circle-fill"/> Rejected{request.rejectionReason?` · ${request.rejectionReason}`:""}</p>}
     {status==="Timed Out"&&<p><i className="bi bi-hourglass-split"/> Request closed because another Local Guide accepted this trip.</p>}
     {status==="Not Available"&&<p><i className="bi bi-calendar-x-fill"/> {request.statusReason||"This guide is no longer available for the requested dates."}</p>}
     {status==="Removed"&&<p><i className="bi bi-dash-circle-fill"/> Request removed by Traveller.</p>}
   </div>
   <div className="guide-request-status-actions">
     {status==="Pending"&&<button type="button" className="btn btn-outline-danger btn-sm" onClick={onRemove}>Remove Request</button>}
   </div>
 </article>;
}

function GuideProfileModal({guide,onClose,onSelect,selected,actionLabel="Select This Guide"}){
 if(!guide)return null;
 const profile=guide.profile||guide.guideProfile||guide||{};
 const hidden=new Set(["passwordHash","identityProof","verificationHistory","vehicles","role","verificationStatus","createdAt","authProvider","sub"]);
 const dynamicEntries=Object.entries(profile).filter(([key,value])=>!hidden.has(key)&&value!==undefined&&value!==null&&value!==""&&!(["name","email","phone","age","gender","state","address","pincode","languages","experience","qualification","guideBio","guideExpertise","additionalInterests","areaInterests","avatarData","avatarName"].includes(key)));
 const displayValue=value=>Array.isArray(value)?value.join(", "):typeof value==="object"?JSON.stringify(value):String(value);
 const label=key=>key.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/_/g," ").replace(/^./,c=>c.toUpperCase());
 return <div className="modal-backdrop-custom guide-profile-backdrop"><div className="guide-modal guide-profile-modal">
   <button className="modal-close" onClick={onClose} aria-label="Close guide profile">×</button>
   <div className="guide-profile-hero"><div className="guide-profile-avatar">{guide.avatarData?<img src={guide.avatarData} alt={`${guide.name||"Local Guide"} profile`}/>:<span>{(guide.name||"G").charAt(0).toUpperCase()}</span>}</div><div><span className="guide-section-kicker">LOCAL GUIDE PROFILE</span><h2>{guide.name||"Local Guide"}</h2><p>{guide.guideBio||guide.guideExpertise||"Verified Local Guide"}</p></div></div>
   <div className="guide-profile-grid">
     {[["Email",guide.email],["Phone",guide.phone],["Age",guide.age],["Gender",guide.gender],["State",guide.state],["Address",guide.address],["Pincode",guide.pincode],["Languages",guide.languages],["Experience",guide.experience],["Qualification",guide.qualification],["Guide Expertise",guide.guideExpertise],["Additional Interests",guide.additionalInterests],["Area Interests",guide.areaInterests]].filter(([,v])=>v!==undefined&&v!==null&&v!=="").map(([k,v])=><div className="guide-profile-field" key={k}><small>{k}</small><strong>{displayValue(v)}</strong></div>)}
     {dynamicEntries.map(([k,v])=><div className="guide-profile-field" key={k}><small>{label(k)}</small><strong>{displayValue(v)}</strong></div>)}
   </div>
   {Array.isArray(profile.vehicles)&&profile.vehicles.length>0&&<section className="guide-profile-vehicles"><h3>Vehicles</h3><div className="guide-profile-vehicle-grid">{profile.vehicles.filter(v=>v.verificationStatus==="Verified").map(v=><article key={v.id}><div>{v.vehiclePhoto?.data?<img src={v.vehiclePhoto.data} alt="Vehicle"/>:<i className="bi bi-car-front"/>}</div><section><strong>{v.customType||v.type}</strong><small>{v.vehicleNumber}</small><em>Verified</em></section></article>)}</div></section>}
   <div className="guide-profile-footer"><span>{guide.previousTrips||0} previous trip{guide.previousTrips===1?"":"s"}{guide.rating?` · ${guide.rating}`:""}</span>{onSelect&&<button type="button" className={`btn ${selected?"btn-outline-success":"btn-primary"}`} onClick={onSelect}>{selected?"Selected":actionLabel}</button>}</div>
 </div></div>;
}

function BookGuideModal({open,trip,placeCache,requests,onClose,onSent}){
 const [city,setCity]=useState("");const [startDate,setStartDate]=useState("");const [endDate,setEndDate]=useState("");const [requirements,setRequirements]=useState("");const [guides,setGuides]=useState([]);const [selectedGuides,setSelectedGuides]=useState([]);const [profileGuide,setProfileGuide]=useState(null);const [loading,setLoading]=useState(false);const [sending,setSending]=useState(false);const [error,setError]=useState("");
 useEffect(()=>{if(!open||!trip)return;const cities=[...new Set(trip.placeIds.map(id=>placeCache[String(id)]?.city).filter(Boolean))];setCity(cities[0]||"");setStartDate("");setEndDate("");setRequirements("");setGuides([]);setSelectedGuides([]);setProfileGuide(null);setError("")},[open,trip?.id]);
 if(!open||!trip)return null;
 const places=trip.placeIds.map(id=>placeCache[String(id)]).filter(Boolean);const cities=[...new Set(places.map(p=>p.city).filter(Boolean))];
 const requestForGuide=(email)=>requests.find(r=>r.tripId===trip.id&&r.guideEmail===email&&["Pending","Accepted"].includes(r.status));
 const search=async()=>{if(!city||!startDate||!endDate)return setError("Select a location and trip dates first.");if(endDate<startDate)return setError("End date must be on or after start date.");setLoading(true);setError("");try{const result=await searchAvailableGuides(city,startDate,endDate);setGuides(result);setSelectedGuides(prev=>prev.filter(email=>result.some(g=>g.email===email)));if(!result.length)setError("No Local Guides are marked available in this date range.")}catch(e){setError(e.message||"Could not search guides.")}finally{setLoading(false)}};
 const toggleGuide=(email)=>setSelectedGuides(prev=>prev.includes(email)?prev.filter(x=>x!==email):[...prev,email]);
 const sendSelected=async()=>{if(!selectedGuides.length)return setError("Select at least one Local Guide.");setSending(true);setError("");const selected=guides.filter(g=>selectedGuides.includes(g.email));const errors=[];for(const guide of selected){if(requestForGuide(guide.email))continue;try{await createGuideRequest({tripId:trip.id,tripName:trip.name,location:city,startDate,endDate,places,requirements,guideEmail:guide.email})}catch(e){errors.push(`${guide.name||guide.email}: ${e.message||"Could not send request."}`)}}if(errors.length){await onSent(false);setSending(false);setError(errors.join(" "));}else{await onSent(true);setSending(false);}};
 return <div className="modal-backdrop-custom"><div className="guide-modal guide-book-modal"><button className="modal-close" onClick={onClose}>×</button><h2>Book Guide / Travel System</h2><p>Select a location and date range, search available Local Guides, then open their profiles and select one or more guides.</p><div className="field"><label>Location <em>*</em></label><select value={city} onChange={e=>{setCity(e.target.value);setGuides([]);setSelectedGuides([])}}><option value="">Select location</option>{cities.map(c=><option key={c}>{c}</option>)}</select></div><div className="form-grid"><div className="field"><label>Start Date <em>*</em></label><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} min={new Date().toLocaleDateString("en-CA")}/></div><div className="field"><label>End Date <em>*</em></label><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} min={startDate||new Date().toLocaleDateString("en-CA")}/></div></div><div className="field"><label>Traveller Requirements</label><textarea rows="3" value={requirements} onChange={e=>setRequirements(e.target.value)} placeholder="Tell the guide about your requirements (optional)"/></div><button className="btn btn-primary w-100" onClick={search} disabled={loading}>{loading?"Searching…":"Search for Guides"}</button>{error&&<div className="alert alert-info mt-3">{error}</div>}
   <div className="guide-search-summary">{guides.length>0&&<span>{guides.length} Local Guide{guides.length===1?"":"s"} found · {selectedGuides.length} selected</span>}</div>
   <div className="guide-search-results">{guides.map(g=>{const existing=requestForGuide(g.email);const selected=selectedGuides.includes(g.email);return <article className={`guide-result-card ${selected?"selected":""}`} key={g.email}>
     <button type="button" className="guide-result-profile-button" onClick={()=>setProfileGuide(g)} aria-label={`View ${g.name||"Local Guide"} profile`}><div className="guide-result-avatar">{g.avatarData?<img src={g.avatarData} alt=""/>:<span>{(g.name||"G").charAt(0).toUpperCase()}</span>}</div><div className="guide-result-main"><h3>{g.name}</h3><p>{g.guideBio||g.guideExpertise||"Verified Local Guide"}</p><p><b>Available:</b> {(g.availableDates||[]).filter(d=>d>=startDate&&d<=endDate).map(formatDate).join(", ")||"Within selected range"}</p></div></button>
     <div className="guide-result-meta"><span><i className="bi bi-star-fill"/> {g.rating||"Verified guide"}</span><span>{g.languages||"Languages not provided"}</span></div>
     <div className="guide-result-actions"><button type="button" className="btn btn-outline-primary" onClick={()=>setProfileGuide(g)}>View Profile</button>{existing?<span className={`guide-request-pill ${String(existing.status).toLowerCase().replace(/\s+/g,"-")}`}>{existing.status}</span>:<button type="button" className={`btn ${selected?"btn-outline-success":"btn-outline-success"}`} onClick={()=>toggleGuide(g.email)}>{selected?"Selected":"Select Guide"}</button>}</div>
   </article>})}</div>
   {selectedGuides.length>0&&<div className="guide-selection-footer"><span>{selectedGuides.length} guide{selectedGuides.length===1?"":"s"} selected</span><button className="btn btn-primary" onClick={sendSelected} disabled={sending}>{sending?"Sending Requests…":"Send Requests to Selected Guides"}</button></div>}
   <GuideProfileModal guide={profileGuide} selected={profileGuide?selectedGuides.includes(profileGuide.email):false} onClose={()=>setProfileGuide(null)} onSelect={()=>{if(profileGuide){toggleGuide(profileGuide.email);setProfileGuide(null)}}}/>
 </div></div>;
}

function NotificationsModal({open,notifications,onClose,onRead}){if(!open)return null;return <div className="modal-backdrop-custom"><div className="guide-modal"><button className="modal-close" onClick={onClose}>×</button><h2>Notifications</h2>{notifications.length?notifications.map(n=><button className={`notification-row ${n.read?"read":"unread"}`} key={n.id} onClick={()=>onRead(n)}><i className="bi bi-bell-fill"/><span>{n.message}<small>{new Date(n.createdAt).toLocaleString("en-IN")}</small></span></button>):<EmptyNotification/>}</div></div>}
function EmptyNotification(){return <div className="empty-state guide-empty"><i className="bi bi-bell"/><strong>No notifications</strong></div>}
