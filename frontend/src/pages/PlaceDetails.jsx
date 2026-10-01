import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchPlaceById } from "../utils/placeApi";
import { apiFetch, getUser, isLoggedIn } from "../utils";
import { getSelectedDestinations, toggleSelectedDestination } from "../utils/roadmapUtils";

function sendHeartFlight(button) {
  const rect = button?.getBoundingClientRect?.();
  if (!rect) return;
  window.dispatchEvent(new CustomEvent("stg-heart-fly", {
    detail: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }));
}

export default function PlaceDetails(){
  const { id } = useParams();
  const location=useLocation();
  const navigate=useNavigate();
  const user=getUser()||{};
  const [place,setPlace]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [activeImage,setActiveImage]=useState(0);
  const [selected,setSelected]=useState(()=>getSelectedDestinations().some(x=>String(x.id)===String(id)));
  const [reviews,setReviews]=useState([]);
  const [photos,setPhotos]=useState([]);
  const [rating,setRating]=useState(5);
  const [reviewText,setReviewText]=useState("");
  const [reviewBusy,setReviewBusy]=useState(false);
  const [photoBusy,setPhotoBusy]=useState(false);
  const [actionMessage,setActionMessage]=useState("");
  const [actionError,setActionError]=useState("");

  const loadCommunity=async(placeData)=>{
    if(!placeData) return;
    try{
      const r=await apiFetch(`/api/reviews?itemId=${encodeURIComponent(placeData.id)}`);
      if(r.ok) setReviews(await r.json());
    }catch{}
    if(isLoggedIn()){
      try{ const r=await apiFetch(`/api/places/${encodeURIComponent(placeData.id)}/photos`); if(r.ok) setPhotos(await r.json()); }catch{}
    }
  };

  useEffect(()=>{
    let active=true;
    setLoading(true); setError(""); setActiveImage(0);
    fetchPlaceById(id).then(data=>{
      if(!active)return;
      const next = data || location.state?.place || null;
      if(!next)setError("We could not find this place.");
      setPlace(next);
      setLoading(false);
      if(next) loadCommunity(next);
    }).catch(()=>{if(active){setError("Unable to load place details.");setLoading(false)}});
    return()=>{active=false};
  },[id]);

  useEffect(()=>{
    const sync=()=>setSelected(getSelectedDestinations().some(x=>String(x.id)===String(id)));
    window.addEventListener("stg-selection-change",sync);
    return()=>window.removeEventListener("stg-selection-change",sync);
  },[id]);

  const gallery=place?[...(place.images||[]),place.image,...photos.map(x=>x.dataUrl)].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i):[];
  const currentImage=gallery[Math.min(activeImage,Math.max(0,gallery.length-1))] || null;

  const toggleHeart=(e)=>{
    e.stopPropagation();
    if(!isLoggedIn()) { navigate("/login"); return; }
    const wasSelected=selected;
    const next=toggleSelectedDestination(id);
    setSelected(next.some(x=>String(x)===String(id)));
    if(!wasSelected) sendHeartFlight(e.currentTarget);
  };

  async function submitReview(e){
    e.preventDefault();
    if(!isLoggedIn()) return navigate("/login");
    if(!reviewText.trim()) return setActionError("Write a review before submitting.");
    setReviewBusy(true); setActionError(""); setActionMessage("");
    try{
      const r=await apiFetch("/api/reviews",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({itemId:place.id,itemName:place.name,itemType:"Place",rating:Number(rating),review:reviewText.trim()})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.message||"Could not submit review.");
      setReviewText(""); setRating(5); setActionMessage("Your review was submitted."); await loadCommunity(place);
    }catch(e){setActionError(e.message||"Could not submit review.");}
    finally{setReviewBusy(false);setTimeout(()=>setActionMessage(""),3500)}
  }

  async function uploadPhoto(e){
    const file=e.target.files?.[0];
    e.target.value="";
    if(!file) return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)) return setActionError("Photo must be JPG, PNG or WEBP.");
    if(file.size>5*1024*1024) return setActionError("Photo must be 5 MB or smaller.");
    if(!isLoggedIn()) return navigate("/login");
    setPhotoBusy(true); setActionError(""); setActionMessage("");
    try{
      const dataUrl=await readAsDataURL(file);
      const r=await apiFetch(`/api/places/${encodeURIComponent(place.id)}/photos`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({placeName:place.name,dataUrl,fileName:file.name})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.message||"Could not upload photo.");
      setPhotos(prev=>[d.photo,...prev]);
      setActionMessage("Your photo was added to this place.");
    }catch(e){setActionError(e.message||"Could not upload photo.");}
    finally{setPhotoBusy(false);setTimeout(()=>setActionMessage(""),3500)}
  }

  if(loading) return <main className="inner-page place-details-page"><div className="place-loading"><div className="spinner-border text-primary"/><strong>Loading place details…</strong><span>Getting the latest destination information.</span></div></main>;
  if(error || !place) {
    const fallbackSearch=location.state?.fromSearch || sessionStorage.getItem("stg_last_search_url") || "/user/search";
    return <main className="inner-page"><div className="empty-state"><i className="bi bi-geo-alt"/><strong>{error || "Place not found"}</strong><button className="btn btn-primary" onClick={()=>navigate(fallbackSearch)}>Back to Places</button></div></main>;
  }

  return <main className="place-details-page">
    <section className="place-details-hero">
      <div className="place-hero-image">{currentImage?<img src={currentImage} alt={place.name} onError={e=>{e.currentTarget.style.display="none"}}/>:<div className="place-hero-placeholder"><i className="bi bi-camera"/><strong>Exact photo not available</strong><span>Add a local photo when you have one.</span>{place.imageSourceUrl&&<a href={place.imageSourceUrl} target="_blank" rel="noreferrer">Open image source</a>}</div>}<div className="place-hero-shade"/></div>
      <div className="place-hero-content">
        <button type="button" className="place-back-link" onClick={()=>{const fromSearch=location.state?.fromSearch || sessionStorage.getItem("stg_last_search_url") || "/user/search";navigate(fromSearch)}}><i className="bi bi-arrow-left"/> Back to search</button>
        <span className="place-type-badge">{place.type}</span><h1>{place.name}</h1>
        <p><i className="bi bi-geo-alt-fill"/> {place.city}{place.state?`, ${place.state}`:""}, {place.country}</p>
        <div className="place-hero-meta">{place.rating>0?<span><i className="bi bi-star-fill"/> {place.rating.toFixed(1)} {place.reviewCount?`(${place.reviewCount} reviews)`:""}</span>:<span><i className="bi bi-star"/> {reviews.length?`${(reviews.reduce((a,r)=>a+Number(r.rating||0),0)/reviews.length).toFixed(1)} community rating`:`Not yet rated`}</span>}<span><i className="bi bi-compass"/> {place.source || "Verified destination data"}</span></div>
        <button type="button" className={`detail-heart-toggle ${selected?"selected":""}`} onClick={toggleHeart} aria-pressed={selected}><i className={`bi ${selected?"bi-heart-fill":"bi-heart"}`}/>{selected?"Added to My Places":"Add to My Places"}</button>
      </div>
    </section>

    {gallery.length>1&&<section className="place-gallery-strip">{gallery.map((src,i)=><button key={`${src}-${i}`} className={i===activeImage?"active":""} onClick={()=>setActiveImage(i)}><img src={src} alt={`${place.name} ${i+1}`}/></button>)}</section>}

    <section className="place-details-content">
      <div className="place-main-column">
        <article className="place-info-card"><div className="place-section-title"><span className="eyebrow"><i className="bi bi-info-circle"/> About the place</span><h2>Discover {place.name}</h2></div><p className="place-description">{place.description}</p><div className="place-detail-chips"><span><i className="bi bi-building"/> {place.type}</span><span><i className="bi bi-geo-alt"/> {place.city}, {place.state}</span>{place.imageSource&&<span><i className="bi bi-camera"/> {place.imageSource}</span>}{place.imageStatus==="missing"&&<span><i className="bi bi-info-circle"/> Photo not stored</span>}</div></article>
        <article className="place-info-card"><div className="place-section-title"><span className="eyebrow"><i className="bi bi-stars"/> Explore</span><h2>Why visit</h2></div><div className="place-highlight-grid">{(place.highlights?.length?place.highlights:[`Explore attractions and experiences around ${place.name}.`,`Learn about the local history, culture and landscape.`,`Add ${place.name} to My Places and include it in your roadmap.`]).map((item,i)=><div className="place-highlight" key={i}><i className={`bi ${["bi-map","bi-building","bi-heart"][i%3]}`}/><span>{item}</span></div>)}</div></article>
        <article className="place-info-card"><div className="place-section-title"><span className="eyebrow"><i className="bi bi-map"/> Location</span><h2>Find the place</h2></div><div className="place-location-grid"><div><strong>City</strong><span>{place.city || "—"}</span></div><div><strong>State</strong><span>{place.state || "—"}</span></div><div><strong>Coordinates</strong><span>{Number(place.lat).toFixed(4)}, {Number(place.lng).toFixed(4)}</span></div></div><a className="btn btn-outline-primary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}><i className="bi bi-pin-map"/> Open in Maps</a>{place.sourceUrl&&<a className="place-source-link" target="_blank" rel="noreferrer" href={place.sourceUrl}>View source information <i className="bi bi-box-arrow-up-right"/></a>}</article>

        <article className="place-info-card community-place-card">
          <div className="place-section-title"><span className="eyebrow"><i className="bi bi-camera-fill"/> Traveller contributions</span><h2>Share photos from {place.name}</h2><p>Upload a real photo you took at this place.</p></div>
          {isLoggedIn()?<label className="place-photo-upload"><i className="bi bi-cloud-arrow-up"/><strong>{photoBusy?"Uploading…":"Upload a photo"}</strong><small>JPG, PNG or WEBP · Max 5 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} disabled={photoBusy}/></label>:<button className="btn btn-outline-primary" onClick={()=>navigate("/login")}><i className="bi bi-box-arrow-in-right"/> Login to upload a photo</button>}
          {photos.length>0&&<div className="community-photo-grid">{photos.map(photo=><figure key={photo.id}><img src={photo.dataUrl} alt={`Shared by ${photo.userName||"Traveller"}`}/><figcaption>{photo.userName||"Traveller"}</figcaption></figure>)}</div>}
        </article>

        <article className="place-info-card community-place-card">
          <div className="place-section-title"><span className="eyebrow"><i className="bi bi-star-fill"/> Reviews & Ratings</span><h2>Tell travellers about your experience</h2></div>
          {isLoggedIn()?<form className="place-review-form" onSubmit={submitReview}><div className="review-rating-picker"><strong>Your rating</strong><div>{[1,2,3,4,5].map(n=><button type="button" key={n} className={n<=rating?"active":""} onClick={()=>setRating(n)} aria-label={`${n} stars`}><i className="bi bi-star-fill"/></button>)}</div></div><textarea value={reviewText} onChange={e=>setReviewText(e.target.value)} rows="4" maxLength="1000" placeholder={`Share your experience at ${place.name}…`}/><button className="btn btn-primary" disabled={reviewBusy}>{reviewBusy?"Submitting…":"Submit Review"}</button></form>:<button className="btn btn-outline-primary" onClick={()=>navigate("/login")}><i className="bi bi-box-arrow-in-right"/> Login to write a review</button>}
          {actionMessage&&<div className="community-message success"><i className="bi bi-check-circle-fill"/>{actionMessage}</div>}{actionError&&<div className="community-message error"><i className="bi bi-exclamation-triangle-fill"/>{actionError}</div>}
          <div className="community-review-list">{reviews.length?reviews.map(r=><article className="community-review" key={r.id}><div className="community-review-head"><strong>{r.travellerName||"Traveller"}</strong><span>{'★'.repeat(Number(r.rating||0))}{'☆'.repeat(Math.max(0,5-Number(r.rating||0)))}</span></div><p>{r.review}</p><small>{r.createdAt?new Date(r.createdAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):""}</small></article>):<div className="empty-state compact-empty"><i className="bi bi-chat-square-text"/><strong>No reviews yet.</strong><span>Be the first traveller to share an experience.</span></div>}</div>
        </article>
      </div>
      <aside className="place-side-column"><div className="place-fact-card"><strong>Destination type</strong><span>{place.type}</span><strong>Country</strong><span>{place.country}</span><strong>Coordinates</strong><span>{Number(place.lat).toFixed(4)}, {Number(place.lng).toFixed(4)}</span><strong>Data source</strong><span>{place.source || "Smart Travel Guide"}</span></div></aside>
    </section>
  </main>;
}
function readAsDataURL(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Could not read the selected image."));reader.readAsDataURL(file);});}
