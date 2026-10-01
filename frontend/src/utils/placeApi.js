import { apiFetch } from "../utils";
import { destinations as localDestinations, VIJAYAWADA_PACKAGE_PLACES, VISAKHAPATNAM_PACKAGE_PLACES, TIRUPATI_PACKAGE_PLACES, HYDERABAD_PACKAGE_PLACES } from "../data/travelData";
import { PRIORITY_PLACE_IMAGES, PRIORITY_PLACE_IMAGE_SOURCES } from "../data/priorityPlaceImages";

const packagePlaces = [...VIJAYAWADA_PACKAGE_PLACES, ...VISAKHAPATNAM_PACKAGE_PLACES, ...TIRUPATI_PACKAGE_PLACES, ...HYDERABAD_PACKAGE_PLACES].map(normalizePackagePlace);

function normalizePackagePlace(p){
  const id=String(p.id);
  return { ...p, id, country:p.country||"India", description:p.description||`Explore ${p.name} and discover its local attractions and experiences.`, image:PRIORITY_PLACE_IMAGES[id]||p.image||null, images:PRIORITY_PLACE_IMAGES[id]?[PRIORITY_PLACE_IMAGES[id]]:(p.image?[p.image]:[]), imageSource:PRIORITY_PLACE_IMAGES[id]?"Wikimedia Commons":null, imageSourceUrl:PRIORITY_PLACE_IMAGES[id]?(PRIORITY_PLACE_IMAGE_SOURCES[id]||null):null, imageStatus:(PRIORITY_PLACE_IMAGES[id]||p.image)?"available":"missing", reviewCount:0, highlights:[] };
}

function normalizeLocalPlace(p){
  const id = String(p.id);
  return {
    ...p,
    id,
    city: p.city || p.name,
    country: p.country || "India",
    description: p.description || `Explore ${p.name} and discover its local attractions and experiences.`,
    image: PRIORITY_PLACE_IMAGES[id] || p.image || null,
    images: PRIORITY_PLACE_IMAGES[id] ? [PRIORITY_PLACE_IMAGES[id]] : (Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : [])),
    imageSource: PRIORITY_PLACE_IMAGES[id] ? "Wikimedia Commons" : (p.imageSource || null),
    imageSourceUrl: PRIORITY_PLACE_IMAGES[id] ? (PRIORITY_PLACE_IMAGE_SOURCES[id] || null) : (p.imageSourceUrl || p.sourceUrl || null),
    reviewCount: p.reviewCount || 0,
    highlights: p.highlights || [],
    imageStatus: p.imageStatus || (p.image ? "available" : "missing")
  };
}

export async function fetchPlaces(params={}){
  const qs=new URLSearchParams();
  Object.entries(params).forEach(([key,value])=>{
    if(value !== undefined && value !== null && value !== "" && !["All States","All Cities","All Types"].includes(value)) qs.set(key,value);
  });
  try{
    const r=await apiFetch(`/api/places${qs.toString()?`?${qs}`:""}`);
    if(!r.ok) throw new Error("Places service unavailable");
    const data=await r.json();
    const places=Array.isArray(data.places)?data.places.map(normalizeLocalPlace):[];
    // Merge pages so selected destinations can still be resolved later by the roadmap.
    if(places.length){
      try{
        const existing=JSON.parse(sessionStorage.getItem("stg_place_catalog")||"[]");
        const merged=new Map((Array.isArray(existing)?existing:[]).map(p=>[String(p.id),p]));
        places.forEach(p=>merged.set(String(p.id),p));
        sessionStorage.setItem("stg_place_catalog",JSON.stringify([...merged.values()]));
      }catch{}
    }
    places.total=Number(data.total||places.length); places.page=Number(data.page||1); places.pageSize=Number(data.pageSize||places.length||24); places.hasMore=Boolean(data.hasMore); return places;
  }catch{
    let list=[...localDestinations,...packagePlaces].map(normalizeLocalPlace);
    const q=String(params.q||"").toLowerCase();
    if(q) list=list.filter(p=>`${p.name} ${p.city} ${p.state} ${p.type} ${(p.aliases||[]).join(" ")}`.toLowerCase().includes(q));
    if(params.city && params.city!=="All Cities") list=list.filter(p=>p.city===params.city);
    if(params.state && params.state!=="All States") list=list.filter(p=>p.state===params.state);
    if(params.type && params.type!=="All Types") list=list.filter(p=>p.type===params.type);
    const page=Math.max(1,Number(params.page)||1), pageSize=Math.max(1,Math.min(48,Number(params.pageSize)||24));
    const start=(page-1)*pageSize;
    const result=list.slice(start,start+pageSize); result.total=list.length; result.page=page; result.pageSize=pageSize; result.hasMore=start+pageSize<list.length; return result;
  }
}

export async function fetchPlaceMeta(){
  try{
    const r=await apiFetch("/api/places/meta");
    if(!r.ok) throw new Error();
    return await r.json();
  }catch{
    return {
      states:[...new Set(localDestinations.map(x=>x.state))].sort(),
      types:[...new Set(localDestinations.map(x=>x.type))].sort(),
      count:localDestinations.length
    };
  }
}

export async function fetchPlaceById(id){
  try{
    const r=await apiFetch(`/api/places/${encodeURIComponent(id)}`);
    if(!r.ok) throw new Error();
    return normalizeLocalPlace(await r.json());
  }catch{
    return [...localDestinations,...packagePlaces].map(normalizeLocalPlace).find(p=>String(p.id)===String(id)) || null;
  }
}


export async function fetchAllPlacesByCity(city){
  const first=await fetchPlaces({city,page:1,pageSize:48});
  let all=[...first];
  let page=2;
  while(first.hasMore && page<=20){ const next=await fetchPlaces({city,page,pageSize:48}); all.push(...next); if(!next.hasMore) break; page++; }
  const seen=new Set(); return all.filter(p=>{const id=String(p.id);if(seen.has(id))return false;seen.add(id);return true});
}
