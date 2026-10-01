import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import RoadmapMap from "../components/RoadmapMap";
import { fetchRoadMatrix, fetchRoadRoute, formatDistance, formatHours, haversineKm, shortestOpenRouteFromStart } from "../utils/roadmapUtils";
import { getTripById, subscribeTrips, removePlaceFromTrip } from "../utils/tripStore";
import { fetchPlaceById } from "../utils/placeApi";
import AddPlaceToTripModal from "../components/AddPlaceToTripModal";

const isUsableCoordinate = place => Number.isFinite(Number(place?.lat)) && Number.isFinite(Number(place?.lng)) && Number(place.lat) >= 6 && Number(place.lat) <= 38 && Number(place.lng) >= 68 && Number(place.lng) <= 98;

export default function Roadmap(){
  const [params] = useSearchParams();
  // A generated plan is always tied to the trip ID in its own URL.
  // Never fall back to a global/previously active trip; that caused old places to leak into new plans.
  const tripId = params.get("tripId") || "";
  const initialStartId = params.get("startId") || "";
  const [places,setPlaces]=useState([]);
  const [ordered,setOrdered]=useState([]);
  const [route,setRoute]=useState(null);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState("");
  const [usingRoad,setUsingRoad]=useState(false);
  const [startId,setStartId]=useState(initialStartId);
  const [addPlaceOpen,setAddPlaceOpen]=useState(false);
  const calculationId=useRef(0);

  const resolveTripPlaces = async () => {
    if (!tripId) return [];
    const trip = getTripById(tripId);
    if (!trip) return [];
    const resolved = await Promise.all(trip.placeIds.map(async id => {
      try { return await fetchPlaceById(id); } catch { return null; }
    }));
    return resolved.filter(Boolean).filter(isUsableCoordinate);
  };

  const recalculate = async (selected, id) => {
    if (id !== calculationId.current) return;
    setPlaces(selected);
    setRoute(null);
    setUsingRoad(false);
    setMessage("");
    if (selected.length < 2) {
      setOrdered(selected);
      setLoading(false);
      return;
    }

    const startIndex = selected.findIndex(p => String(p.id) === String(startId));
    const effectiveStart = startIndex >= 0 ? startIndex : 0;
    if (startIndex < 0 && selected[0]) setStartId(String(selected[0].id));
    setLoading(true);

    try {
      let matrix = null;
      try { matrix = await fetchRoadMatrix(selected); } catch {}
      if (id !== calculationId.current) return;
      const result = shortestOpenRouteFromStart(selected, effectiveStart, matrix);
      const next = result.order.map(i => selected[i]);
      setOrdered(next);
      try {
        const road = await fetchRoadRoute(next);
        if (id !== calculationId.current) return;
        setRoute(road);
        setUsingRoad(true);
      } catch {
        if (id !== calculationId.current) return;
        setRoute({distance:result.distance,duration:NaN,coordinates:next.map(p=>[p.lat,p.lng])});
        setUsingRoad(false);
        setMessage("Road routing is temporarily unavailable, so the map is showing a direct route between stops.");
      }
    } catch {
      if (id !== calculationId.current) return;
      const result = shortestOpenRouteFromStart(selected, effectiveStart);
      const next = result.order.map(i => selected[i]);
      setOrdered(next);
      setRoute({distance:result.distance,duration:NaN,coordinates:next.map(p=>[p.lat,p.lng])});
      setUsingRoad(false);
      setMessage("Road routing is temporarily unavailable. The route order is calculated using geographic distance.");
    } finally {
      if (id === calculationId.current) setLoading(false);
    }
  };

  useEffect(()=>{
    let mounted=true;
    const run=async()=>{
      if(!mounted) return;
      const id=++calculationId.current;
      const selected=await resolveTripPlaces();
      if(!mounted || id !== calculationId.current) return;
      const currentTrip=getTripById(tripId);
      if (!currentTrip) {
        setPlaces([]); setOrdered([]); setRoute(null); setLoading(false); setMessage("This saved trip no longer exists."); return;
      }
      if (selected.length !== currentTrip.placeIds.length) {
        setMessage("One or more saved places could not be loaded or have invalid coordinates, so they are not included on the map.");
      }
      if (!startId && selected[0]) setStartId(String(selected[0].id));
      await recalculate(selected,id);
    };
    run();
    const unsubscribe=subscribeTrips(()=>run());
    return()=>{mounted=false;unsubscribe();calculationId.current+=1;};
  },[tripId,startId]);

  const directDistance=useMemo(()=>ordered.reduce((sum,p,i)=>i?sum+haversineKm(ordered[i-1],p):0,0),[ordered]);
  const trip = tripId ? getTripById(tripId) : null;

  if(!tripId) return <main className="inner-page"><div className="inner-header"><span className="eyebrow"><i className="bi bi-signpost-2"/> Travel Planner</span><h1>Trip Plan</h1><p>Open Generate Plan from one of your saved trips to create a route.</p></div><div className="roadmap-empty"><i className="bi bi-map"/><strong>No trip selected</strong><span>Open My Trips and generate a plan for a saved trip.</span><Link className="btn btn-primary" to="/user/trips">Open My Trips</Link></div></main>;

  if(!loading && places.length<2) return <main className="inner-page"><div className="inner-header"><span className="eyebrow"><i className="bi bi-signpost-2"/> Travel Planner</span><h1>{trip?.name || "Trip Plan"}</h1><p>A route requires at least two valid places in this saved trip.</p></div>{message&&<div className="roadmap-note"><i className="bi bi-info-circle"/>{message}</div>}<div className="roadmap-empty"><i className="bi bi-map"/><strong>Choose 2 or more places</strong><span>Go back to My Trips and add more destinations.</span><Link className="btn btn-primary" to="/user/trips">Open My Trips</Link></div></main>;

  const startPlace = ordered[0];
  return <main className="inner-page roadmap-page">
    <div className="inner-header roadmap-header"><div><span className="eyebrow"><i className="bi bi-signpost-2"/> Smart Route Planner</span><h1>{trip?.name || "Your Travel Roadmap"}</h1><p>Starting from <strong>{startPlace?.name || "selected place"}</strong>. Changes to this saved trip update this route automatically.</p></div></div>
    {message&&<div className="roadmap-note"><i className="bi bi-info-circle"/>{message}</div>}
    <section className="roadmap-summary"><div><i className="bi bi-geo-alt"/><span>Places</span><strong>{ordered.length}</strong></div><div><i className="bi bi-signpost-2"/><span>Total distance</span><strong>{route?formatDistance(route.distance):"—"}</strong></div><div><i className="bi bi-clock"/><span>Estimated drive time</span><strong>{route&&usingRoad?formatHours(route.duration):"—"}</strong></div></section>
    <section className="roadmap-layout">
      <div className="roadmap-map-panel"><div className="roadmap-map-title"><div><strong>Route Map</strong><small>{usingRoad?"Road route between all trip destinations":"Direct-distance route"}</small></div><span><i className="bi bi-check-circle-fill"/> All trip stops included</span></div><RoadmapMap places={ordered} routeCoordinates={route?.coordinates}/></div>
      <aside className="roadmap-stops">
        <div className="stops-heading"><div><strong>Visit in this order</strong><small>{ordered.length} destinations</small></div>{trip&&<button type="button" className="btn btn-outline-primary btn-sm" onClick={()=>setAddPlaceOpen(true)}><i className="bi bi-plus-circle"/> Add place</button>}</div>
        {ordered.map((p,i)=>(
          <div className={`roadmap-stop ${i===0?"start-stop":""}`} key={p.id}>
            <div className="stop-number">{i+1}</div>
            <div className="roadmap-stop-image">{p.image?<img src={p.image} alt={p.name}/>:<i className="bi bi-camera"/>}</div>
            <div><strong>{p.name}</strong><small>{p.city ? `${p.city}${p.state?`, ${p.state}`:""}` : p.state}{i===0&&<em>Start</em>}</small></div>
            {trip&&<button type="button" className="roadmap-stop-remove" onClick={()=>{ if(ordered.length<=2){ window.alert("A trip needs at least 2 places to generate a route."); return; } removePlaceFromTrip(tripId,p.id); }} title="Remove from trip" aria-label={`Remove ${p.name} from trip`}><i className="bi bi-x-lg"/></button>}
            {i<ordered.length-1&&<i className="bi bi-arrow-down"/>}
          </div>
        ))}
        <div className="route-total"><span>Total route</span><strong>{route?formatDistance(route.distance):formatDistance(directDistance)}</strong></div>
      </aside>
    </section>
    {trip&&<AddPlaceToTripModal open={addPlaceOpen} trip={trip} onClose={()=>setAddPlaceOpen(false)}/>} 
  </main>;
}
