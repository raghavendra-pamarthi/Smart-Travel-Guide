import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { packages as defaultPackages } from "../data/travelData";
import DestinationCard from "../components/DestinationCard";
import PackageCard from "../components/PackageCard";
import { PRIORITY_PLACE_IMAGES } from "../data/priorityPlaceImages";
import { getUser, fetchGuidePackages } from "../utils";
import { fetchPlaces } from "../utils/placeApi";

export default function UserDashboard(){
 const [user]=useState(getUser()||{name:"Traveler"});
 const [guidePackages,setGuidePackages]=useState([]);
 const [destinations,setDestinations]=useState([]);
 useEffect(()=>{
   let active=true;
   (async()=>{
     const [vij,viz,tir]=await Promise.all([
       fetchPlaces({city:"Vijayawada",page:1,pageSize:24}),
       fetchPlaces({city:"Visakhapatnam",page:1,pageSize:24}),
       fetchPlaces({city:"Tirupati",page:1,pageSize:24})
     ]);
     if(!active)return;
     const pick=(list)=>list.filter(x=>x.type!=="City");
     const takeById=(list, ids)=>ids.map(id=>list.find(x=>String(x.id)===id)).filter(Boolean);
     const priority=[
       ...takeById(pick(vij), ["ap-vij-01","ap-vij-02"]),
       ...takeById(pick(viz), ["ap-viz-02","ap-viz-01"]),
       ...takeById(pick(tir), ["ap-tir-01","ap-tir-05"])
     ].map(item => ({ ...item, image: PRIORITY_PLACE_IMAGES[item.id] || item.image }));
     setDestinations(priority);
   })();
   return()=>{active=false};
 },[]);
 useEffect(()=>{const refresh=async()=>setGuidePackages(await fetchGuidePackages()); refresh(); window.addEventListener("stg-data-change",refresh); const t=setInterval(refresh,5000); window.addEventListener("focus",refresh); return()=>{window.removeEventListener("stg-data-change",refresh);window.removeEventListener("focus",refresh);clearInterval(t)}},[]);
 const allPackages=useMemo(()=>[...guidePackages,...defaultPackages], [guidePackages]);
 const recommendedPlaces=destinations;
 const recommendedPackages=allPackages.slice(0,4);
 return <main className="user-page">
  <section className="user-hero">
   <div className="user-hero-content">
    <span className="eyebrow"><i className="bi bi-compass"></i> Your Personal Travel Space</span>
    <h1>Welcome back, {user.name?.split(" ")[0]}! 👋</h1>
    <p>Discover places, compare packages and plan your next journey.</p>
    <Link to="/user/search" className="dashboard-search-button"><i className="bi bi-search"></i><span>Search Places</span><i className="bi bi-arrow-right"></i></Link>
   </div><img src="/assets/user-hero-clean.jpg" alt="Travel"/>
  </section>

  <section className="content-section user-content">
   <div className="section-heading"><div><h2>Recommended Places</h2><p>Start with hand-picked places from Vijayawada, Visakhapatnam and Tirupati.</p></div><Link to="/user/recommendations/places">View All Places</Link></div>
   <div className="destination-grid">{recommendedPlaces.map(x=><DestinationCard item={x} key={x.id}/>)}</div>
  </section>

  <section className="content-section user-content package-section-user">
   <div className="section-heading"><div><h2>Packages</h2><p>Smart Travel Guide and Local Guide packages are available together.</p></div><Link to="/user/recommendations/packages">View All Packages</Link></div>
   <div className="package-grid">{recommendedPackages.map(x=><PackageCard item={x} key={`${x.guideEmail||"smart"}-${x.id}`}/>)}</div>
  </section>

 </main>
}
