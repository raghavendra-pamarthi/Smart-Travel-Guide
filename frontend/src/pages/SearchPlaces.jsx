import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DestinationCard from "../components/DestinationCard";
import { getSelectedDestinations, toggleSelectedDestination } from "../utils/roadmapUtils";
import { fetchPlaceMeta, fetchPlaces } from "../utils/placeApi";

const SEARCH_MEMORY_KEY = "stg_last_search";
const CITY_ALIASES = {
  Vijayawada: ["vijayawada", "bezawada"],
  Visakhapatnam: ["visakhapatnam", "vishakapatnam", "vishakhapatnam", "vizag"],
  Tirupati: ["tirupati", "tirupathi", "thirupathi"],
  Delhi: ["delhi", "new delhi"]
};

function cityMatchesQuery(city, query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized || !city || city === "All Cities") return true;
  const values = [String(city).toLowerCase(), ...(CITY_ALIASES[city] || [])];
  return values.includes(normalized);
}

function readInitialSearch(params) {
  const hasUrlSearch = ["q", "state", "city", "type"].some(key => params.has(key));
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(SEARCH_MEMORY_KEY) || "{}"); } catch {}
  if (hasUrlSearch) {
    const urlQ = params.get("q") || "";
    return {
      q: urlQ,
      state: params.get("state") || "All States",
      // Keep a valid city selection when the query itself is that city (e.g.
      // q=Vijayawada&city=Vijayawada), but discard stale city selections such
      // as q=Vijayawada&city=Visakhapatnam.
      city: cityMatchesQuery(params.get("city") || "All Cities", urlQ)
        ? (params.get("city") || "All Cities")
        : "All Cities",
      type: params.get("type") || "All Types",
        };
  }
  const savedQ = saved.q || "";
  const savedCity = saved.city || "All Cities";
  return {
    q: savedQ,
    state: saved.state || "All States",
    city: cityMatchesQuery(savedCity, savedQ) ? savedCity : "All Cities",
    type: saved.type || "All Types",
  };
}

export default function SearchPlaces(){
 const [params,setParams]=useSearchParams();
 const initial = useMemo(()=>readInitialSearch(params), []);
 const [q,setQ]=useState(initial.q);
 const [state,setState]=useState(initial.state);
 const [city,setCity]=useState(initial.city);
 const [type,setType]=useState(initial.type);
 const [destinations,setDestinations]=useState([]);
 const [total,setTotal]=useState(0);
 const [page,setPage]=useState(1);
 const [hasMore,setHasMore]=useState(false);
 const [states,setStates]=useState([]);
 const [cities,setCities]=useState([]);
 const [types,setTypes]=useState([]);
 const [loading,setLoading]=useState(true);
 const [loadingMore,setLoadingMore]=useState(false);
 const [selected,setSelected]=useState(()=>getSelectedDestinations().map(x=>x.id));

 useEffect(()=>{
  const sync=()=>setSelected(getSelectedDestinations().map(x=>x.id));
  window.addEventListener("stg-selection-change",sync);
  return()=>window.removeEventListener("stg-selection-change",sync);
 },[]);

 useEffect(()=>{
  (async()=>{
   const meta=await fetchPlaceMeta();
   setStates(meta.states||[]);
   setCities(meta.cities||[]);
   setTypes(meta.types||[]);
  })();
 },[]);

 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoading(true);
   setPage(1);
   const result=await fetchPlaces({q,state,city,type,page:1,pageSize:24});
   if(active){
    setDestinations(result);
    setTotal(result.total ?? result.length);
    setHasMore(Boolean(result.hasMore));
    setLoading(false);
   }
  })();
  return()=>{active=false};
 },[q,state,city,type]);

 // Keep the current search in both the URL and session memory so refresh/back never loses it.
 useEffect(()=>{
  try {
   sessionStorage.setItem(SEARCH_MEMORY_KEY, JSON.stringify({q,state,city,type}));
  } catch {}
  const next = new URLSearchParams();
  if(q) next.set("q",q);
  if(state!=="All States") next.set("state",state);
  if(city!=="All Cities") next.set("city",city);
  if(type!=="All Types") next.set("type",type);
  const nextSearchUrl = `/user/search${next.toString() ? `?${next.toString()}` : ""}`;
  try { sessionStorage.setItem("stg_last_search_url", nextSearchUrl); } catch {}
  setParams(next,{replace:true});
 },[q,state,city,type,setParams]);

 const loadMore=async()=>{
  if(!hasMore||loadingMore) return;
  setLoadingMore(true);
  try{
   const next=page+1;
   const result=await fetchPlaces({q,state,city,type,page:next,pageSize:24});
   setDestinations(prev=>[
    ...prev,
    ...result.filter(p=>!prev.some(x=>String(x.id)===String(p.id)))
   ]);
   setPage(next);
   setTotal(result.total ?? result.length);
   setHasMore(Boolean(result.hasMore));
  }finally{
   setLoadingMore(false);
  }
 };

 const handleSearchChange=(value)=>{
   setQ(value);
   // The search box is independent from the City filter. Editing the search
   // clears a previous city filter so an old city cannot silently block results.
   if(city!=="All Cities") setCity("All Cities");
 };
 const clear=()=>{setQ("");setState("All States");setCity("All Cities");setType("All Types");};
 const togglePlace=id=>{
   const next=toggleSelectedDestination(id);
   setSelected(next);
   return next;
 };

 const normalizedQ=q.trim().toLowerCase();
 const matchingCity = !city || city === "All Cities" ? cities.find(name=>{
   const key=String(name).toLowerCase();
   return key===normalizedQ || (CITY_ALIASES[name]||[]).includes(normalizedQ);
 }) : null;
 const visibleDestinations = matchingCity
   ? destinations.filter(item => !(item.type === "City" && String(item.city).toLowerCase() === String(matchingCity).toLowerCase()))
   : destinations;

 const showCityResults = !loading && city === "All Cities";

 return <main className="inner-page search-page">
  <section className="search-controls-card">
   <div className="search-input-large"><i className="bi bi-search"></i><input value={q} onChange={e=>handleSearchChange(e.target.value)} placeholder="Search Place"/></div>
   <div className="search-filter-grid search-filter-grid">
    <label><span>State</span><select value={state} onChange={e=>setState(e.target.value)}><option>All States</option>{states.map(x=><option key={x}>{x}</option>)}</select></label>
    <label><span>City</span><select value={city} onChange={e=>setCity(e.target.value)}><option>All Cities</option>{cities.map(x=><option key={x}>{x}</option>)}</select></label>
    <label><span>Place Type</span><select value={type} onChange={e=>setType(e.target.value)}><option>All Types</option>{types.map(x=><option key={x}>{x}</option>)}</select></label>
    <button className="clear-search-btn" onClick={clear}><i className="bi bi-arrow-counterclockwise"></i> Clear</button>
   </div>
   <div className="cart-selection-hint"><i className="bi bi-heart-fill"></i><span><strong>{selected.length} place{selected.length!==1?"s":""} selected</strong> — tap the heart on a place to add it to <b>My Places</b> in the top bar.</span></div>
   <div className="search-summary"><strong>{total}</strong> destination{total!==1?"s":""} found <span>{state!=="All States"&&`• ${state}`}</span><span>{city!=="All Cities"&&`• ${city}`}</span><span>{type!=="All Types"&&`• ${type}`}</span></div>
  </section>

  <section className="search-results">
   <div className="section-heading"><div><h2>Destinations</h2><p>Click a place to open its dedicated destination page. Use the heart to add it to your travel plan.</p></div></div>

   {matchingCity && showCityResults && (
    <button type="button" className="city-result-card" onClick={()=>setCity(matchingCity)}>
      <span className="city-result-icon"><i className="bi bi-buildings"/></span>
      <span className="city-result-copy"><strong>{matchingCity}</strong><small>City result • click to view all places in {matchingCity}</small></span>
      <span className="city-result-action">View all places <i className="bi bi-arrow-right"/></span>
    </button>
   )}

   {loading ? (
    <div className="place-loading compact-loading"><div className="spinner-border text-primary"/><span>Loading destinations…</span></div>
   ) : visibleDestinations.length ? (
    <>
     {city!=="All Cities" && <div className="city-filter-banner"><i className="bi bi-buildings-fill"/><strong>All places in {city}</strong><button type="button" onClick={()=>setCity("All Cities")}>Clear city</button></div>}
     <div className="destination-grid search-results-grid">
      {visibleDestinations.map(x=><DestinationCard item={x} key={x.id} selectable selected={selected.includes(x.id)} onToggle={togglePlace}/>)}
     </div>
     {hasMore && <div className="load-more-wrap">
      <button type="button" className="btn btn-outline-primary load-more-btn" onClick={loadMore} disabled={loadingMore}>
       {loadingMore ? <><span className="spinner-border spinner-border-sm me-2"/>Loading…</> : <>Load more places <i className="bi bi-arrow-down-circle"/></>}
      </button>
      <small>Showing {visibleDestinations.length} of {total} destinations</small>
     </div>}
    </>
   ) : (
    <div className="empty-state"><i className="bi bi-search"></i><strong>No destinations match your filters.</strong><span>Try a different state, city, place type or search term.</span></div>
   )}
  </section>
 </main>;
}
