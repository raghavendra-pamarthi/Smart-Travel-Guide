import React, { useEffect, useState } from "react";
import { getUser, saveUser, setLoggedIn, logoutSession, apiFetch } from "../utils";
import { useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";

export default function Profile(){
 const [user,setUser]=useState(getUser()||{}); const [saved,setSaved]=useState(false); const [error,setError]=useState(""); const [uploading,setUploading]=useState(false); const [vehicleBusy,setVehicleBusy]=useState(false); const [newVehicle,setNewVehicle]=useState({type:"",customType:"",vehicleNumber:"",vehiclePhoto:null,drivingLicense:null}); const nav=useNavigate();
 const guide=user.role==="guide";
 const change=e=>setUser({...user,[e.target.name]:e.target.value});
 useEffect(()=>{if(!guide||!user.email)return;apiFetch(`/api/guide/vehicles?guideEmail=${encodeURIComponent(user.email)}`).then(r=>r.ok?r.json():null).then(d=>{if(d?.vehicles){const next={...getUser(),vehicles:d.vehicles,vehiclesAvailable:d.vehicles.length?"Yes":"No"};saveUser(next);setUser(next)}}).catch(()=>{})},[guide,user.email]);
 const handleAvatar=e=>{
   const file=e.target.files?.[0];
   if(!file)return;
   if(!["image/jpeg","image/png","image/webp"].includes(file.type)) return setError("Profile picture must be a JPG, PNG or WEBP image.");
   if(file.size>3*1024*1024) return setError("Profile picture must be 3 MB or smaller.");
   setUploading(true); setError("");
   const reader=new FileReader();
   reader.onload=()=>{setUser(prev=>({...prev,avatarData:reader.result,avatarName:file.name}));setUploading(false)};
   reader.onerror=()=>{setError("Could not read the profile picture. Please try again.");setUploading(false)};
   reader.readAsDataURL(file);
 };
 const vehicleFile=(key,e)=>{const file=e.target.files?.[0];if(!file)return;const allowed=key==="vehiclePhoto"?["image/jpeg","image/png","image/webp"]:["application/pdf","image/jpeg","image/png","image/webp"];if(!allowed.includes(file.type))return setError(key==="vehiclePhoto"?"Vehicle photo must be JPG, PNG or WEBP.":"Driving license must be PDF, JPG, PNG or WEBP.");if(file.size>8*1024*1024)return setError("Vehicle files must be 8 MB or smaller.");const r=new FileReader();r.onload=()=>setNewVehicle(v=>({...v,[key]:{name:file.name,type:file.type,size:file.size,data:r.result}}));r.readAsDataURL(file)};
 const addVehicle=async()=>{if(!newVehicle.type||!newVehicle.vehicleNumber||!newVehicle.vehiclePhoto?.data||!newVehicle.drivingLicense?.data||(newVehicle.type==="Other"&&!newVehicle.customType))return setError("Complete all vehicle details and uploads.");setVehicleBusy(true);setError("");try{const r=await apiFetch("/api/guide/vehicles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newVehicle)});const d=await r.json();if(!r.ok)throw new Error(d.message||"Could not add vehicle.");const next={...user,vehicles:[d.vehicle,...(user.vehicles||[])],vehiclesAvailable:"Yes"};saveUser(next);setUser(next);setNewVehicle({type:"",customType:"",vehicleNumber:"",vehiclePhoto:null,drivingLicense:null});setSaved(true);setTimeout(()=>setSaved(false),2500)}catch(e){setError(e.message||"Could not add vehicle.")}finally{setVehicleBusy(false)}};
 const deleteVehicle=async(id)=>{if(!window.confirm("Delete this vehicle?"))return;setVehicleBusy(true);try{const r=await apiFetch(`/api/guide/vehicles/${encodeURIComponent(id)}`,{method:"DELETE"});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||"Could not delete vehicle.");const vehicles=(user.vehicles||[]).filter(v=>String(v.id)!==String(id));const next={...user,vehicles,vehiclesAvailable:vehicles.length?"Yes":"No"};saveUser(next);setUser(next)}catch(e){setError(e.message||"Could not delete vehicle.")}finally{setVehicleBusy(false)}};

 async function save(e){
   e.preventDefault(); setError("");
   if(uploading)return;
   try {
     const response=await apiFetch("/api/profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(user)});
     const data=await response.json();
     if(!response.ok) return setError(data.message||"Could not update profile.");
     const updated={...user,...data.user}; saveUser(updated); setUser(updated); setSaved(true); setTimeout(()=>setSaved(false),2500);
   } catch {
     setError("Cannot connect to the server. Please make sure the server is running.");
   }
 }
 const logout=async()=>{await logoutSession();setLoggedIn(false);nav("/")};
 const avatar=user.avatarData;
 const formContent=<><div className="inner-header"><span className="eyebrow">Account</span><h1>{guide?"Guide Profile":"My Profile"}</h1><p>{guide?"Keep your local guide information, expertise and contact details up to date.":"Update your name, contact details and travel preferences."}</p></div>
 <form className="profile-card" onSubmit={save}>
  <div className="profile-heading">
   <div className="profile-picture-editor">
    {avatar?<img className="avatar profile-avatar profile-avatar-image" src={avatar} alt="Profile"/>:<span className="avatar profile-avatar">{(user.name||"U").charAt(0)}</span>}
    <label className="profile-picture-button"><i className="bi bi-camera-fill"/> {avatar?"Change picture":"Add profile picture"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatar}/></label>
   </div>
   <div><h3>{user.name||"User"}</h3><p>{user.email}</p><small className="profile-picture-hint">JPG, PNG or WEBP · Max 3 MB</small></div>
  </div>
  <div className="form-grid"><Field label="Full Name" name="name" value={user.name||""} onChange={change}/><Field label="Phone Number" name="phone" value={user.phone||""} onChange={change}/><Field label="Date of Birth" name="dob" type="date" value={user.dob||""} onChange={change}/><div className="field"><label>Gender</label><select name="gender" value={user.gender||""} onChange={change}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></div><Field label="Home State / City" name="state" value={user.state||""} onChange={change}/></div>
  <Field label="Address" name="address" value={user.address||""} onChange={change}/><div className="field"><label>Email Address <small>(login email)</small></label><input value={user.email||""} disabled/></div>
  {guide ? <><h5 className="profile-section-title">Guide Profile</h5><Field label="Guide Bio" name="guideBio" value={user.guideBio||""} onChange={change}/><div className="form-grid"><div className="field"><label>Guide Expertise</label><select name="guideExpertise" value={user.guideExpertise||""} onChange={change}><option value="">Select expertise</option><option>Heritage & History</option><option>Nature & Wildlife</option><option>Adventure</option><option>Beaches</option><option>Culture & Food</option><option>Spiritual Tours</option><option>Photography</option></select></div><Field label="Languages You Speak" name="languages" value={user.languages||""} onChange={change}/><Field label="Guiding Experience" name="experience" value={user.experience||""} onChange={change}/><Field label="Qualification / Certification" name="qualification" value={user.qualification||""} onChange={change}/></div><Field label="Additional Interests" name="additionalInterests" value={user.additionalInterests||""} onChange={change}/></> : <><h5 className="profile-section-title">Travel Preferences</h5><Field label="Travel Interests" name="interests" value={user.interests||""} onChange={change}/></>}
  {guide&&<section className="profile-vehicles-section"><h5 className="profile-section-title">Vehicles</h5><p className="profile-vehicle-note">Only Admin-verified vehicles can be selected for new packages. New vehicles remain pending until Admin verification.</p><div className="profile-vehicle-list">{(user.vehicles||[]).map(v=><article className="profile-vehicle-card" key={v.id}><div>{v.vehiclePhoto?.data?<img src={v.vehiclePhoto.data} alt="Vehicle"/>:<span><i className="bi bi-car-front"/></span>}</div><section><strong>{v.customType||v.type}</strong><small>{v.vehicleNumber}</small><em className={`vehicle-verification-status ${String(v.verificationStatus||"Pending").toLowerCase().replace(/\s+/g,"-")}`}>{v.verificationStatus||"Pending"}</em></section><button type="button" onClick={()=>deleteVehicle(v.id)} disabled={vehicleBusy}><i className="bi bi-trash3"/></button></article>)}</div><div className="profile-add-vehicle"><h6>Add Vehicle</h6><div className="form-grid"><div className="field"><label>Type</label><select value={newVehicle.type} onChange={e=>setNewVehicle(v=>({...v,type:e.target.value}))}><option value="">Select type</option><option>Car</option><option>Auto</option><option>Bike</option><option>Other</option></select></div><div className="field"><label>Vehicle Number</label><input value={newVehicle.vehicleNumber} onChange={e=>setNewVehicle(v=>({...v,vehicleNumber:e.target.value}))}/></div></div>{newVehicle.type==="Other"&&<div className="field"><label>Vehicle Type</label><input value={newVehicle.customType} onChange={e=>setNewVehicle(v=>({...v,customType:e.target.value}))}/></div>}<div className="vehicle-upload-grid"><VehicleFile label="Recent Vehicle Photo" file={newVehicle.vehiclePhoto} accept="image/jpeg,image/png,image/webp" onChange={e=>vehicleFile("vehiclePhoto",e)}/><VehicleFile label="Driving License" file={newVehicle.drivingLicense} accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>vehicleFile("drivingLicense",e)}/></div><button type="button" className="btn btn-outline-primary" onClick={addVehicle} disabled={vehicleBusy}>{vehicleBusy?"Saving…":"Submit Vehicle for Verification"}</button></div></section>}
  {error&&<div className="alert alert-danger py-2">{error}</div>}<button className="btn btn-primary px-5" disabled={uploading}>{uploading?"Preparing picture…":"Save Profile"}</button>{saved&&<span className="saved-msg"><i className="bi bi-check-circle"></i> Profile updated</span>}
 </form></>;
 if(guide) return <main className="guide-page guide-profile-page"><aside className="guide-sidebar"><div className="guide-brand"><BrandMark className="guide-brand-mark"/><div><strong>Smart Travel Guide</strong><small>Guide · Share · Inspire</small></div></div><nav><a href="/guide" onClick={e=>{e.preventDefault();nav("/guide")}}><i className="bi bi-house-door-fill"/>Dashboard</a><a href="/guide#packages" onClick={e=>{e.preventDefault();nav("/guide#packages")}}><i className="bi bi-briefcase"/>My Packages</a><a href="/guide#availability" onClick={e=>{e.preventDefault();nav("/guide#availability")}}><i className="bi bi-calendar-check"/>Guide Availability</a><a href="/guide/bookings" onClick={e=>{e.preventDefault();nav("/guide/bookings")}}><i className="bi bi-clipboard-check"/>My Bookings</a><a className="active" href="/guide/profile"><i className="bi bi-person"/>My Profile</a><a href="/guide/contributions" onClick={e=>{e.preventDefault();nav("/guide/contributions")}}><i className="bi bi-geo-alt"/>My Contributions</a></nav><button className="guide-drawer-logout" onClick={logout}><i className="bi bi-box-arrow-right"/> Logout</button></aside><div className="inner-page">{formContent}</div></main>;
 return <main className="inner-page">{formContent}</main>;
}
function Field({label,name,value,onChange,type="text"}){return <div className="field"><label>{label}</label><input name={name} type={type} value={value} onChange={onChange}/></div>}

function VehicleFile({label,file,accept,onChange}){return <div className="field vehicle-file-field"><label>{label}</label><label className={`vehicle-file-box ${file?"has-file":""}`}><input type="file" accept={accept} onChange={onChange}/>{file?<><i className="bi bi-file-earmark-check"/><strong>{file.name}</strong></>:<><i className="bi bi-cloud-arrow-up"/><strong>Upload a file</strong></>}</label></div>}
