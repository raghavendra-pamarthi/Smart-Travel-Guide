import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBooking, daysBetween, formatDate, formatDateTime, getUser, fetchBookings } from "../utils";
import { PRIORITY_PLACE_IMAGES } from "../data/priorityPlaceImages";

const wikiImageCache = new Map();
async function fetchWikiThumb(title, width=1200) {
  if (!title) return null;
  if (wikiImageCache.has(title)) return wikiImageCache.get(title);
  try {
    const qs = new URLSearchParams({ action:"query", prop:"pageimages", titles:title, format:"json", formatversion:"2", pithumbsize:String(width), origin:"*" });
    const r = await fetch(`https://en.wikipedia.org/w/api.php?${qs}`);
    if (!r.ok) throw new Error();
    const data = await r.json();
    const page = Object.values(data.query?.pages || {})[0];
    const url = page?.thumbnail?.source || page?.original?.source || null;
    wikiImageCache.set(title,url);
    return url;
  } catch { wikiImageCache.set(title,null); return null; }
}

function usePackageImage(item) {
  const [src,setSrc]=useState(item.image || null);
  useEffect(()=>{
    let active=true;
    if(item.image){setSrc(item.image);return()=>{active=false};}
    fetchWikiThumb(item.wikiTitle || item.places?.[0]?.wikiTitle).then(url=>{if(active)setSrc(url||null)});
    return()=>{active=false};
  },[item.image,item.wikiTitle,item.places]);
  return src;
}

function PlaceThumb({place}) {
  const [src,setSrc]=useState(place.image || PRIORITY_PLACE_IMAGES[place.id] || null);
  useEffect(()=>{
    let active=true;
    if(src || !place.wikiTitle) return()=>{active=false};
    fetchWikiThumb(place.wikiTitle,500).then(url=>{if(active)setSrc(url||null)});
    return()=>{active=false};
  },[place.wikiTitle,place.id,src]);
  return src ? <img src={src} alt={place.name}/> : <span className="package-place-thumb-placeholder"><i className="bi bi-camera"/></span>;
}

export default function PackageCard({item, requireLogin=false}){
 const [open,setOpen]=useState(false); const nav=useNavigate(); const [booked,setBooked]=useState(false); const [bookingStatus,setBookingStatus]=useState(""); const [bookingBusy,setBookingBusy]=useState(false); const [bookingDate,setBookingDate]=useState(item.startDate||""); const [selectedVehicleId,setSelectedVehicleId]=useState(""); const packageImage=usePackageImage(item);
 useEffect(()=>{if(!open)return;setBookingDate(item.startDate||"");setSelectedVehicleId("");const check=async()=>{const user=getUser();if(!user?.email)return;const existing=await fetchBookings({travellerEmail:user.email});const current=existing.find(x=>x.packageId===item.id&&x.status!=="Cancelled"&&String(x.travellerEmail).toLowerCase()===String(user.email).toLowerCase());setBooked(Boolean(current));setBookingStatus(current?.status||"");};check()},[open,item.id]);
 const book=async()=>{const user=getUser()||{};if(!user.email)return nav("/login");if(!bookingDate||bookingDate<item.startDate||bookingDate>item.endDate)return alert("Select a valid booking date within the package dates.");if((item.vehicles||[]).length&&!selectedVehicleId)return alert("Select a vehicle for this package.");setBookingBusy(true);const existing=await fetchBookings({travellerEmail:user.email});const packageExisting=existing.filter(x=>x.packageId===item.id&&!['Cancelled','Rejected'].includes(x.status));if(packageExisting.some(x=>x.travellerEmail===user.email)){setBooked(true);setBookingBusy(false);return;}if(item.maxTravellers&&packageExisting.length>=item.maxTravellers){alert("This package is fully booked.");setBookingBusy(false);return;}const b={id:crypto.randomUUID(),packageId:item.id,packageName:item.name,guideEmail:item.guideEmail,guideName:item.guideName,travellerEmail:user.email,travellerName:user.name||"Traveller",bookingDate,startDate:bookingDate,endDate:bookingDate,days:1,status:"Pending",vehicleId:selectedVehicleId||null,bookedAt:new Date().toISOString()};try{const created=await createBooking(b);setBooked(true);setBookingStatus(created?.status||"Pending")}catch(e){alert(e.message||"Could not complete booking.")}finally{setBookingBusy(false)}};
 const places=item.places||[]; const vehicles=item.vehicles||[];
 return <>
  <div className="package-card" onClick={()=>setOpen(true)}>
   <div className="package-image-wrap">{packageImage?<img src={packageImage} alt={item.name}/>:<div className="destination-image-placeholder"><i className="bi bi-camera"/><strong>Package image loading</strong><small>Place-specific image from Wikipedia</small></div>}</div>
   <div className="package-body"><h5>{item.name}</h5><div className="package-dates"><span><i className="bi bi-calendar-event"/> {formatDate(item.startDate)}</span><span><i className="bi bi-clock"/> {item.days||item.duration||"—"}</span></div><p className="package-tour-preview">{item.description||"Explore this carefully planned journey with memorable local experiences."}</p><div className="package-meta"><strong>₹{Number(item.price).toLocaleString("en-IN")}</strong>{item.rating&&<span><i className="bi bi-star-fill"/> {item.rating}</span>}</div><button className="btn btn-outline-primary w-100" onClick={e=>{e.stopPropagation();requireLogin?nav("/login"):setOpen(true)}}>View Package <i className="bi bi-arrow-right"/></button></div>
  </div>
  {open&&<div className="modal-backdrop-custom package-modal-backdrop" onClick={()=>setOpen(false)}><div className="guide-modal package-detail-modal package-detail-modal-large" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setOpen(false)}>×</button>
   {packageImage?<img className="package-detail-image" src={packageImage} alt={item.name}/>:<div className="package-detail-image package-detail-image-placeholder"><i className="bi bi-camera"/><strong>Package image unavailable</strong></div>}
   <span className="eyebrow">Travel Package</span><h2>{item.name}</h2>
   <div className="detail-grid"><div><small>Start Date & Time</small><strong>{formatDateTime(item.startDate,item.startTime)}</strong></div><div><small>End Date & Time</small><strong>{formatDateTime(item.endDate,item.endTime)}</strong></div><div><small>Number of Days</small><strong>{item.days||item.duration||"—"}</strong></div><div><small>Approximate Cost</small><strong>₹{Number(item.price).toLocaleString("en-IN")}</strong></div></div>
   <section className="package-detail-section"><h5>Places Covered</h5><div className="package-place-card-list">{places.length?places.map(p=><div className="package-place-card" key={p.id}><PlaceThumb place={p}/><div><button type="button" className="package-place-link" onClick={()=>{setOpen(false); if(p?.id) nav(`/place/${encodeURIComponent(p.id)}`, { state:{ fromPackage:item.id, place:p } });}}>{p.name}<i className="bi bi-arrow-up-right"/></button><small>{p.city}{p.state?`, ${p.state}`:""}</small>{p.description&&<p>{p.description}</p>}</div></div>):<span>No places specified</span>}</div></section>
   <section className="package-detail-section"><h5>Package Information</h5><div className="package-info-list"><div className="package-info-item"><small>Maximum Travellers</small><strong>{item.maxTravellers||"Not specified"}</strong></div><div className="package-info-item"><small>Total Package Cost</small><strong>₹{Number(item.price).toLocaleString("en-IN")}</strong></div><div className="package-info-item"><small>Vehicle Options</small><strong>{vehicles.length?vehicles.map(v=>`${v.type||v.customType} · ₹${Number(v.totalCost||0).toLocaleString("en-IN")}`).join(" | "):"No vehicle option"}</strong></div></div>{vehicles.length>0&&<div className="package-vehicle-detail-list">{vehicles.map(v=><article key={v.vehicleId}><div>{v.vehiclePhoto?.data?<img src={v.vehiclePhoto.data} alt={v.type||"Vehicle"}/>:<i className="bi bi-car-front"/>}</div><section><strong>{v.customType||v.type}</strong><small>{v.vehicleNumber}</small><span>Total cost: ₹{Number(v.totalCost||0).toLocaleString("en-IN")}</span></section></article>)}</div>}</section>
   <section className="package-detail-section"><h5>Description</h5><p className="package-detail-description">{item.description||"No description provided."}</p></section>
   {item.guideEmail&&<section className="package-detail-section"><div className="package-guide-box"><strong><i className="bi bi-person-badge"/> Local Guide</strong><span>{item.guideName||"Local Guide"}</span>{item.guidePhone&&<a className="guide-phone-link" href={`tel:${item.guidePhone}`}><i className="bi bi-telephone-fill"/> {item.guidePhone}</a>}<small>{item.guideEmail}</small></div></section>}
   {!booked&&<section className="package-booking-controls"><div className="field"><label>Booking Date <em>*</em></label><input type="date" min={item.startDate} max={item.endDate} value={bookingDate} onChange={e=>setBookingDate(e.target.value)}/></div>{vehicles.length>0&&<div className="field"><label>Select Vehicle <em>*</em></label><select value={selectedVehicleId} onChange={e=>setSelectedVehicleId(e.target.value)}><option value="">Select a vehicle</option>{vehicles.map(v=><option key={v.vehicleId} value={v.vehicleId}>{v.type||v.customType} · {v.vehicleNumber} · Total ₹{Number(v.totalCost||0).toLocaleString("en-IN")}</option>)}</select></div>}<button className="btn btn-primary w-100 mt-3" disabled={bookingBusy} onClick={book}>{bookingBusy?"Booking...":"Book This Package"}</button></section>}{booked&&<button className="btn btn-primary w-100 mt-3" disabled>{bookingStatus==="Confirmed"?"Package Confirmed":"Booking Pending"}</button>}
  </div></div>}
 </>;
}
