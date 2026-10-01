import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearSelectedDestinations, getSelectedDestinations, toggleSelectedDestination, subscribeSelectionChange } from "../utils/roadmapUtils";
import TripChooserModal from "./TripChooserModal";

export default function PlaceCart(){
  const [open,setOpen]=useState(false);
  const [places,setPlaces]=useState([]);
  const [showTripChooser,setShowTripChooser]=useState(false);
  const [heartFlights,setHeartFlights]=useState([]);
  const [cartPulse,setCartPulse]=useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const buttonRef=useRef(null);
  const refresh=()=>setPlaces(getSelectedDestinations());

  useEffect(()=>{
    refresh();
    const sync=()=>refresh();
    const closeOnOutside=(event)=>{
      if (!event.target.closest?.(".place-cart-wrap")) setOpen(false);
    };
    const closeOnEscape=(event)=>{ if(event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", closeOnOutside, true);
    document.addEventListener("keydown", closeOnEscape);
    const fly=(event)=>{
      const source=event.detail||{};
      const target=buttonRef.current?.getBoundingClientRect?.();
      if(!target || typeof source.x!=="number" || typeof source.y!=="number") return;
      const flight={id:`${Date.now()}-${Math.random()}`,x:source.x,y:source.y,dx:(target.left+target.width/2)-source.x,dy:(target.top+target.height/2)-source.y};
      setHeartFlights(prev=>[...prev,flight]);
      setCartPulse(true);
      window.setTimeout(()=>setHeartFlights(prev=>prev.filter(item=>item.id!==flight.id)),850);
      window.setTimeout(()=>setCartPulse(false),650);
    };
    window.addEventListener("stg-heart-fly",fly);
    const unsubscribeSelection=subscribeSelectionChange(sync);
    return()=>{
      window.removeEventListener("stg-heart-fly",fly);
      unsubscribeSelection();
      document.removeEventListener("pointerdown", closeOnOutside, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  },[]);

  useEffect(()=>{ setOpen(false); }, [location.pathname, location.search]);

  const remove=id=>{toggleSelectedDestination(id);refresh();};
  const clearCart=()=>{ clearSelectedDestinations(); setPlaces([]); };

  return <>
    <div className="place-cart-wrap">
      <button ref={buttonRef} className={`place-cart-btn ${open?"active":""} ${cartPulse?"place-cart-pulse":""}`} onClick={()=>setOpen(v=>!v)} aria-label="Open selected places cart" aria-expanded={open}>
        <i className="bi bi-bag"></i><span className="place-cart-label">My Places</span>{places.length>0&&<b className="place-cart-count">{places.length}</b>}
      </button>
      {open&&<>
        <div className="place-cart-backdrop" onClick={()=>setOpen(false)}></div>
        <div className="place-cart-popover">
          <div className="place-cart-header"><div><strong>Selected Places</strong><small>{places.length} destination{places.length!==1?"s":""} in your current selection</small></div><button onClick={()=>setOpen(false)} aria-label="Close"><i className="bi bi-x-lg"></i></button></div>
          {places.length?<>
            <div className="place-cart-list">{places.map((p)=><div className="place-cart-item" key={p.id}><img src={p.image||""} alt=""/><div><strong>{p.name}</strong><small>{p.city ? `${p.city}${p.state?`, ${p.state}`:""}` : p.state}</small><small className="place-cart-bucket-label">Selected for this cart only</small></div><button onClick={()=>remove(p.id)} aria-label={`Remove ${p.name}`}><i className="bi bi-trash3"></i></button></div>)}</div>
            <div className="place-cart-footer place-cart-footer-stack"><div className="place-cart-footer-row"><button type="button" className="place-cart-clear" onClick={clearCart} disabled={!places.length}>Clear All</button><button type="button" className="btn btn-outline-primary place-cart-add-trip" disabled={!places.length} onClick={()=>setShowTripChooser(true)}><i className="bi bi-folder-plus"></i> Add to Trip</button></div></div>
          </>:<div className="place-cart-empty"><i className="bi bi-heart"></i><strong>Your selection is empty</strong><span>Tap a heart on any destination to add it here.</span><Link to="/user/search" onClick={()=>setOpen(false)}>Find places</Link></div>}
        </div>
      </>}
    </div>
    {heartFlights.map(flight=><div key={flight.id} className="heart-flight" style={{left:`${flight.x}px`,top:`${flight.y}px`,"--dx":`${flight.dx}px`,"--dy":`${flight.dy}px`}}><i className="bi bi-heart-fill"></i></div>)}
    <TripChooserModal open={showTripChooser} places={places} onClose={()=>setShowTripChooser(false)} onAdded={(trip)=>{
      setShowTripChooser(false);
      setOpen(false);
      if (trip?.id) navigate(`/user/trips?tripId=${encodeURIComponent(trip.id)}`);
    }} />
  </>;
}
