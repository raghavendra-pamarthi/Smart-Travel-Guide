import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { packages as defaultPackages } from "../data/travelData";
import DestinationCard from "../components/DestinationCard";
import PackageCard from "../components/PackageCard";
import { fetchGuidePackages } from "../utils";
import { fetchPlaces } from "../utils/placeApi";

function uniquePlaces(items){
  const seen = new Set();
  return items.filter(p => { const id=String(p.id); if(seen.has(id)) return false; seen.add(id); return true; });
}

export default function Recommendations({mode}){
 const [guidePackages,setGuidePackages]=useState([]);
 const [destinations,setDestinations]=useState([]);
 const [loadingPlaces,setLoadingPlaces]=useState(true);
 const [guideDate,setGuideDate]=useState("");
 const today=new Date().toLocaleDateString("en-CA");
 useEffect(()=>{const f=async()=>setGuidePackages(await fetchGuidePackages());f();window.addEventListener("stg-data-change",f);const t=setInterval(f,5000);window.addEventListener("focus",f);return()=>{window.removeEventListener("stg-data-change",f);window.removeEventListener("focus",f);clearInterval(t)}},[]);
 useEffect(()=>{let active=true;(async()=>{setLoadingPlaces(true);const [general,vij,viz,tir]=await Promise.all([
   fetchPlaces({page:1,pageSize:48}),
   fetchPlaces({city:"Vijayawada",page:1,pageSize:24}),
   fetchPlaces({city:"Visakhapatnam",page:1,pageSize:24}),
   fetchPlaces({city:"Tirupati",page:1,pageSize:24})
  ]); if(active){
    const vijPlaces=uniquePlaces(vij.filter(x=>x.type!=="City"));
    const vizPlaces=uniquePlaces(viz.filter(x=>x.type!=="City"));
    const tirPlaces=uniquePlaces(tir.filter(x=>x.type!=="City"));
    const priority=[];
    const max=Math.max(vijPlaces.length,vizPlaces.length,tirPlaces.length);
    for(let i=0;i<max;i++){ if(vijPlaces[i]) priority.push(vijPlaces[i]); if(vizPlaces[i]) priority.push(vizPlaces[i]); if(tirPlaces[i]) priority.push(tirPlaces[i]); }
    const rest=uniquePlaces([...general].filter(x=>x.type!=="City" && !priority.some(p=>String(p.id)===String(x.id))));
    setDestinations([...priority,...rest]);
    setLoadingPlaces(false);
  }})();return()=>{active=false}},[]);
 const allPackages=useMemo(()=>[...guidePackages,...defaultPackages],[guidePackages]);
 const showPlaces=mode!=="packages", showPackages=mode!=="places";
 const isAllPlaces=mode==="places", isAllPackages=mode==="packages";
 const placeItems=mode==="places"?destinations:destinations.slice(0,6);
 const packageItems=mode==="packages"?allPackages:allPackages.slice(0,4);
 return <main className="inner-page recommendation-page">
  <div className="inner-header"><span className="eyebrow"><i className="bi bi-stars"></i> {isAllPlaces||isAllPackages?"Explore":"Personalized for you"}</span><h1>{isAllPlaces?"All Places":isAllPackages?"All Packages":"Smart Recommendations"}</h1><p>{isAllPlaces?"Browse destinations and explore local places.":isAllPackages?"Browse every available package from Smart Travel Guide and Local Guides.":"Priority suggestions begin with Vijayawada, Visakhapatnam and Tirupati places."}</p></div>
  <div className="recommendation-banner"><i className="bi bi-stars"></i><div><strong>Priority recommendations</strong><p>Vijayawada, Visakhapatnam and Tirupati attractions are kept at the top of your recommendations.</p></div></div>
  {showPlaces&&<section className="recommendation-section"><div className="section-heading"><div><h2>{isAllPlaces?"All Places":"Recommended Places"}</h2><p>{isAllPlaces?"Explore destinations across the catalogue.":"Vijayawada, Visakhapatnam and Tirupati places appear first."}</p></div>{mode!=="places"&&<Link to="/user/recommendations/places">View All Places</Link>}</div>
   {isAllPlaces&&<div className="guide-date-filter"><label><i className="bi bi-person-badge"></i> Check local guide availability</label><input type="date" min={today} value={guideDate} onChange={e=>setGuideDate(e.target.value)}/></div>}
   {loadingPlaces?<div className="place-loading compact-loading"><div className="spinner-border text-primary"/><span>Loading destinations…</span></div>:<div className="destination-grid">{placeItems.map(x=><DestinationCard item={x} key={x.id} guideDate={isAllPlaces?guideDate:""}/>)}</div>}
  </section>}
  {showPackages&&<section className="recommendation-section"><div className="section-heading"><div><h2>{isAllPackages?"All Packages":"Recommended Packages"}</h2><p>{isAllPackages?"All available packages from Smart Travel Guide and Local Guides.":"Packages now include Vijayawada, Visakhapatnam, Tirupati and Hyderabad."}</p></div>{mode!=="packages"&&<Link to="/user/recommendations/packages">View All Packages</Link>}</div><div className="package-grid">{packageItems.map(x=><PackageCard item={x} key={`${x.guideEmail||"smart"}-${x.id}`}/>)}</div></section>}
 </main>
}
