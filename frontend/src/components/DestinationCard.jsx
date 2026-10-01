import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { guideIsAvailableForPlace, formatDate } from "../utils";
import { getSelectedDestinations, toggleSelectedDestination } from "../utils/roadmapUtils";

function PlaceImage({ item }) {
  const candidates = Array.from(new Set([item.image, ...(Array.isArray(item.images) ? item.images : [])].filter(Boolean)));
  const [index, setIndex] = useState(0);
  const src = candidates[index] || null;
  return (
    <div className="destination-image-wrap">
      {src ? (
        <img src={src} alt={item.name} loading="lazy" onError={() => setIndex(value => value + 1)} />
      ) : (
        <div className="destination-image-placeholder">
          <i className="bi bi-camera" />
          <strong>Photo not available</strong>
          <small>{item.imageSource ? `Source: ${item.imageSource}` : "Add an exact place photo"}</small>
          {item.imageSourceUrl && <a href={item.imageSourceUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>View source</a>}
        </div>
      )}
      <span className="destination-view-pill">{item.type === "City" ? "View all places" : "View details"} <i className="bi bi-arrow-up-right"/></span>
    </div>
  );
}

function sendHeartFlight(button) {
  const rect = button?.getBoundingClientRect?.();
  if (!rect) return;
  window.dispatchEvent(new CustomEvent("stg-heart-fly", { detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } }));
}

export default function DestinationCard({item,guideDate,selectable=false,selected=false,onToggle}){
 const navigate=useNavigate();
 const location=useLocation();
 const guides=guideDate?guideIsAvailableForPlace(item.id,guideDate):[];
 const openDetails=()=>{
   if(item.type === "City" && item.city){
     navigate(`/user/search?q=${encodeURIComponent(item.city)}&city=${encodeURIComponent(item.city)}`);
     return;
   }
   navigate(`/place/${encodeURIComponent(item.id)}`, { state: { fromSearch: `${location.pathname}${location.search}`, place: item } });
 };
 const description=String(item.description||"");
 const guideText = guides.length > 1 ? `${guides.length} local guides available` : guides.length === 1 ? "1 local guide available" : "No local guide available";
 const canSelect=selectable && item.type !== "City";
 const handleHeart=(e)=>{
   e.stopPropagation();
   if(!onToggle) return;
   const wasSelected=selected;
   onToggle(item.id);
   if(!wasSelected){
     sendHeartFlight(e.currentTarget);
   }
 };
 return <>
 <article className={`destination-card destination-card-clickable ${selectable&&selected?"roadmap-selected":""}`} onClick={openDetails} role="link" tabIndex={0} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")openDetails()}}>
  {canSelect&&<button type="button" className={`heart-select-control ${selected?"selected":""}`} onClick={handleHeart} aria-pressed={selected} aria-label={`${selected?"Remove":"Add"} ${item.name} ${selected?"from":"to"} My Places`}><i className={`bi ${selected?"bi-heart-fill":"bi-heart"}`}></i></button>}
  <PlaceImage item={item}/>
  <div className="card-body"><div className="destination-card-main"><strong>{item.name}</strong><small><i className="bi bi-geo-alt-fill"/> {item.city || item.state}{item.city && item.state ? `, ${item.state}` : ""}</small><span className="destination-type-label">{item.type || "Tourist Attraction"}</span>{description && <p>{description.length>125?`${description.slice(0,125).trimEnd()}…`:description}</p>}</div><span className="rating">{item.rating>0?<><i className="bi bi-star-fill"/> {item.rating}</>:<><i className="bi bi-star"/> New</>}</span></div>
  {item.imageStatus === "missing" && <div className="destination-image-source warning"><i className="bi bi-info-circle"/> Exact photo not stored</div>}
  {item.imageStatus !== "missing" && item.imageSource&&<div className="destination-image-source"><i className="bi bi-camera"/> {item.imageSource}</div>}
  {guideDate&&<div className={`place-guide-status ${guides.length?"available":"unavailable"}`}><i className={`bi ${guides.length?"bi-person-check":"bi-person-x"}`}></i><span>{guideText}{guides.length===1&&guides[0].guidePhone&&<a className="guide-phone-link-inline" href={`tel:${guides[0].guidePhone}`} onClick={e=>e.stopPropagation()}><i className="bi bi-telephone-fill"/> {guides[0].guidePhone}</a>}</span><small>{formatDate(guideDate)}</small></div>}
 </article>
 </>;
}
