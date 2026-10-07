import React, { useState } from "react";
import { saveUser } from "../utils";
import RoleSwitcher from "../components/RoleSwitcher";
import BrandMark from "../components/BrandMark";
import ThemeToggle from "../components/ThemeToggle";

const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const GUIDE_LANGUAGES = [
  "English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam",
  "Marathi", "Bengali", "Gujarati", "Punjabi", "Odia", "Assamese",
  "Urdu", "Kashmiri", "Nepali", "Sanskrit", "Konkani", "Manipuri",
  "Maithili", "Sindhi", "Bodo", "Dogri", "Santhali"
];

const initial = {
  name:"", email:"", phone:"", dob:"", age:"", gender:"", state:"", address:"", pincode:"",
  travelTypes:[], budget:"", interests:"", guideBio:"", guideExpertise:"", languages:[], experience:"", qualification:"", additionalInterests:"",
  areaInterests:[], identityProof:null, vehiclesAvailable:"No", vehicleCount:"", vehicles:[], password:"", confirmPassword:"", terms:false
};

export default function Signup() {
  const [form,setForm]=useState(initial);
  const [role,setRole]=useState(new URLSearchParams(window.location.search).get("role") === "guide" ? "guide" : "user");
  const [error,setError]=useState("");
  const today=new Date().toLocaleDateString("en-CA");
  const change=e=>setForm({...form,[e.target.name]:e.target.type==="checkbox"?e.target.checked:e.target.value});
  const toggleType=t=>setForm({...form,travelTypes:form.travelTypes.includes(t)?form.travelTypes.filter(x=>x!==t):[...form.travelTypes,t]});
  const toggleArea=t=>setForm({...form,areaInterests:form.areaInterests.includes(t)?form.areaInterests.filter(x=>x!==t):[...form.areaInterests,t]});
  const toggleLanguage=language=>setForm(prev=>({...prev,languages:prev.languages.includes(language)?prev.languages.filter(x=>x!==language):[...prev.languages,language]}));
  const handleIdentityProof=e=>{
    const file=e.target.files?.[0];
    if(!file){ setForm({...form,identityProof:null}); return; }
    const allowed=["application/pdf","image/jpeg","image/png","image/webp"];
    if(!allowed.includes(file.type)) return setError("Identity proof must be a PDF, JPG, PNG or WEBP file.");
    if(file.size>8*1024*1024) return setError("Identity proof must be 8 MB or smaller.");
    const reader=new FileReader();
    reader.onload=()=>{ setError(""); setForm(prev=>({...prev,identityProof:{name:file.name,type:file.type,size:file.size,data:reader.result}})); };
    reader.readAsDataURL(file);
  };
  const updateVehicle=(index,key,value)=>setForm(prev=>{const vehicles=[...prev.vehicles];vehicles[index]={...vehicles[index],[key]:value};return {...prev,vehicles}});
  const addVehicle=()=>setForm(prev=>({...prev,vehicles:[...prev.vehicles,{type:"",customType:"",vehicleNumber:"",vehiclePhoto:null,drivingLicense:null}]}));
  const removeVehicle=index=>setForm(prev=>({...prev,vehicles:prev.vehicles.filter((_,i)=>i!==index)}));
  const readVehicleFile=(index,key,e)=>{const file=e.target.files?.[0];if(!file)return;if(file.size>8*1024*1024)return setError("Vehicle photo and driving license must be 8 MB or smaller.");const allowed=key==="vehiclePhoto"?["image/jpeg","image/png","image/webp"]:["application/pdf","image/jpeg","image/png","image/webp"];if(!allowed.includes(file.type))return setError(key==="vehiclePhoto"?"Vehicle photo must be JPG, PNG or WEBP.":"Driving license must be PDF, JPG, PNG or WEBP.");const r=new FileReader();r.onload=()=>{setError("");updateVehicle(index,key,{name:file.name,type:file.type,size:file.size,data:r.result});};r.readAsDataURL(file)};

  async function submit(e){
    e.preventDefault(); setError("");
    const requiredValue = key => String(form[key] ?? "").trim().length > 0;
    const guideCommonRequired=["name","email","phone","age","gender","state","address","pincode","password","confirmPassword"];
    const travellerRequired=["name","email","phone","age","gender","password","confirmPassword"];
    if(role === "guide") {
      if(guideCommonRequired.some(k=>!requiredValue(k)) || !Array.isArray(form.languages) || form.languages.length===0 || !form.identityProof) return setError("Please complete all required local guide fields and upload your identity proof.");
      if(!/^\d{1,3}$/.test(String(form.age)) || Number(form.age)<1 || Number(form.age)>120) return setError("Please enter a valid age.");
      if(!/^\d{6}$/.test(String(form.pincode))) return setError("Please enter a valid 6-digit pincode.");
      if(form.identityProof.size>8*1024*1024) return setError("Identity proof must be 8 MB or smaller.");
    } else if(travellerRequired.some(k=>!requiredValue(k))) {
      return setError("Please complete all required traveller fields: Full Name, Email Address, Phone Number, Age, Gender, Password and Confirm Password.");
    }
    if(!form.terms) return setError("Please accept the Terms & Conditions.");
    if(form.password!==form.confirmPassword) return setError("Passwords do not match.");
    if(form.password.length<8) return setError("Password must contain at least 8 characters.");
    try {
      const payload={...form,languages:Array.isArray(form.languages)?form.languages.join(", "):form.languages,role,identityProofData:form.identityProof?.data||null,identityProofName:form.identityProof?.name||"",identityProofType:form.identityProof?.type||"",identityProofSize:form.identityProof?.size||0};
      delete payload.identityProof;
      const response=await fetch("/api/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok) return setError(data.message || "Could not create account.");
      sessionStorage.setItem("stg_signup_role", role);
      window.location.href=`/login?registered=1&role=${encodeURIComponent(role)}`;
    } catch {
      setError("Cannot connect to the server. Start it with: npm run server");
    }
  }
  return <main className={`auth-page signup-page auth-signup-redesign ${role === "guide" ? "guide-signup" : "traveller-signup"}`}>
    <AuthHeader role={role} />
    <AuthRoleInfo role={role} mode="signup" />
    <div className="auth-card-wrap">
      <form className="auth-card signup-card" onSubmit={submit}>
        <div className="auth-brand"><BrandMark /><strong>Smart <b>Travel</b> Guide</strong></div>
        <h2>Create Your <span>{role === "guide" ? "Guide Account" : "Account"}</span></h2><p>{role === "guide" ? "Create your local guide profile and start sharing your destination expertise." : "Join Smart Travel Guide and start exploring India."}</p>
        <RoleSwitcher role={role} onChange={setRole}/>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {role === "guide" ? <>
          <h5>Personal Information</h5>
          <div className="form-grid">
            <Field label="Full Name" name="name" value={form.name} onChange={change} required />
            <Field label="Email" name="email" type="email" value={form.email} onChange={change} required />
            <Field label="Phone Number" name="phone" value={form.phone} onChange={change} required />
            <Field label="Age" name="age" type="number" value={form.age} onChange={change} placeholder="Enter your age" min="1" max="120" required />
            <div className="field"><label>Gender <em>*</em></label><div className="radio-row">{["Male","Female"].map(g=><label key={g}><input type="radio" name="gender" value={g} checked={form.gender===g} onChange={change}/>{g}</label>)}</div></div>
          </div>
          <div className="form-grid">
            <SelectField label="State" name="state" value={form.state} onChange={change} options={INDIAN_STATES_AND_UTS} placeholder="Select your state / UT" required />
            <Field label="Address" name="address" value={form.address} onChange={change} placeholder="Enter your complete address" required />
            <Field label="Pincode" name="pincode" value={form.pincode} onChange={change} placeholder="6-digit pincode" maxLength={6} required />
          </div>
          <h5>Local Guide Information</h5>
          <div className="form-grid">
            <Field label="Guide Experience" name="experience" value={form.experience} onChange={change} placeholder="e.g. 3 years" />
            <LanguageMultiSelect selected={form.languages} onToggle={toggleLanguage} options={GUIDE_LANGUAGES} required />
          </div>
          <Field label="Short Bio" name="guideBio" value={form.guideBio} onChange={change} placeholder="Briefly tell travellers about yourself and your local knowledge" />
          <div className="field guide-area-field">
            <label>Area interest in guiding</label>
            <div className="chips">{["Heritage & History","Nature & Wildlife","Beaches & Coastal","Adventure & Trekking","Culture & Food","Spiritual & Pilgrimage","Photography","Shopping & Local Markets","Family Tours","Eco Tourism"].map(t=><button type="button" className={form.areaInterests.includes(t)?"chip active":"chip"} onClick={()=>toggleArea(t)} key={t}>{t}</button>)}</div>
          </div>
          <section className="guide-vehicle-signup-section">
            <div className="guide-section-heading"><div><h5>Vehicle Availability</h5><p>Tell us whether you have vehicles available for guiding travellers.</p></div></div>
            <div className="field"><label>Vehicles Available <em>*</em></label><div className="radio-row"><label><input type="radio" name="vehiclesAvailable" value="No" checked={form.vehiclesAvailable==="No"} onChange={e=>setForm(prev=>({...prev,vehiclesAvailable:"No",vehicleCount:"",vehicles:[]}))}/> No</label><label><input type="radio" name="vehiclesAvailable" value="Yes" checked={form.vehiclesAvailable==="Yes"} onChange={e=>setForm(prev=>({...prev,vehiclesAvailable:"Yes"}))}/> Yes</label></div></div>
            {form.vehiclesAvailable==="Yes"&&<><div className="field"><label>How many vehicles? <em>*</em></label><input type="number" min="1" max="20" value={form.vehicleCount} onChange={e=>{const count=Math.max(0,Math.min(20,Number(e.target.value)||0));setForm(prev=>{const vehicles=Array.from({length:count},(_,i)=>prev.vehicles[i]||{type:"",customType:"",vehicleNumber:"",vehiclePhoto:null,drivingLicense:null});return {...prev,vehicleCount:e.target.value,vehicles}})}} placeholder="Enter number of vehicles" required/></div>
            <div className="vehicle-signup-list">{form.vehicles.map((v,i)=><article className="vehicle-signup-card" key={i}><div className="vehicle-card-head"><strong>Vehicle {i+1}</strong></div><div className="form-grid"><SelectField label="Type of Vehicle" name={`vehicle-type-${i}`} value={v.type} onChange={e=>updateVehicle(i,"type",e.target.value)} options={["Car","Auto","Bike","Other"]} placeholder="Select vehicle type" required/><div className="field"><label>Vehicle Number <em>*</em></label><input value={v.vehicleNumber} onChange={e=>updateVehicle(i,"vehicleNumber",e.target.value)} placeholder="e.g. AP XX XX XXXX" required/></div></div>{v.type==="Other"&&<div className="field"><label>Define Vehicle Type <em>*</em></label><input value={v.customType} onChange={e=>updateVehicle(i,"customType",e.target.value)} placeholder="Enter vehicle type" required/></div>}<div className="vehicle-upload-grid"><FileUpload label="Recent Vehicle Photo" file={v.vehiclePhoto} accept="image/jpeg,image/png,image/webp" onChange={e=>readVehicleFile(i,"vehiclePhoto",e)}/><FileUpload label="Guide Driving License" file={v.drivingLicense} accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e=>readVehicleFile(i,"drivingLicense",e)}/></div></article>)}</div></>}
          </section>
          <div className="field identity-proof-field">
            <label>Identity Proof <em>*</em></label>
            <div className={`identity-upload-box ${form.identityProof ? "has-file" : ""}`}>
              <input id="guide-identity-proof" className="identity-file-input" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleIdentityProof} required={!form.identityProof}/>
              {!form.identityProof ? (
                <label htmlFor="guide-identity-proof" className="identity-upload-empty">
                  <i className="bi bi-cloud-arrow-up"></i>
                  <strong>Upload a file</strong>
                </label>
              ) : (
                <label htmlFor="guide-identity-proof" className="identity-file-name">{form.identityProof.name}</label>
              )}
            </div>
          </div>
          <h5>Account Security</h5>
          <div className="form-grid">
            <PasswordField label="Password" name="password" value={form.password} onChange={change} placeholder="At least 8 characters" required/>
            <div className="field password-confirm-field">
              <label>Confirm Password <em>*</em></label>
              <PasswordField name="confirmPassword" value={form.confirmPassword} onChange={change} required className={form.confirmPassword ? (form.confirmPassword === form.password ? "is-valid" : "is-invalid") : ""} placeholder="Re-enter your password"/>
              {form.confirmPassword && form.confirmPassword !== form.password && <small className="password-match-message invalid"><i className="bi bi-x-circle"></i> Passwords do not match.</small>}
              {form.confirmPassword && form.confirmPassword === form.password && <small className="password-match-message valid"><i className="bi bi-check-circle"></i> Passwords match.</small>}
            </div>
          </div>
        </> : <>
          <h5>Personal Information</h5>
          <div className="form-grid">
            <Field label="Full Name" name="name" value={form.name} onChange={change} required />
            <Field label="Email Address" name="email" type="email" value={form.email} onChange={change} required />
            <Field label="Phone Number" name="phone" value={form.phone} onChange={change} required />
            <Field label="Age" name="age" type="number" value={form.age} onChange={change} placeholder="Enter your age" min="1" max="120" required />
            <div className="field"><label>Gender <em>*</em></label><div className="radio-row">{["Male","Female","Other"].map(g=><label key={g}><input type="radio" name="gender" value={g} checked={form.gender===g} onChange={change}/>{g}</label>)}</div></div>
          </div>
          <h5>Account Security</h5>
          <div className="form-grid">
            <PasswordField label="Password" name="password" value={form.password} onChange={change} placeholder="At least 8 characters" required/>
            <div className="field password-confirm-field">
              <label>Confirm Password <em>*</em></label>
              <PasswordField name="confirmPassword" value={form.confirmPassword} onChange={change} required className={form.confirmPassword ? (form.confirmPassword === form.password ? "is-valid" : "is-invalid") : ""} placeholder="Re-enter your password"/>
              {form.confirmPassword && form.confirmPassword !== form.password && <small className="password-match-message invalid"><i className="bi bi-x-circle"></i> Passwords do not match.</small>}
              {form.confirmPassword && form.confirmPassword === form.password && <small className="password-match-message valid"><i className="bi bi-check-circle"></i> Passwords match.</small>}
            </div>
          </div>
        </>}
        <label className="terms"><input type="checkbox" name="terms" checked={form.terms} onChange={change}/> I agree to the <a href="#terms">Terms & Conditions</a> <em>*</em></label>
        <button className="btn btn-primary btn-lg w-100">Create Account <i className="bi bi-arrow-right"></i></button>
      </form>
    </div>
  </main>
}

function AuthHeader({role}){
 return <header className="auth-reference-header signup-auth-header">
   <a href="/" className="auth-reference-brand"><BrandMark/><span><strong>Smart Travel Guide</strong><small>Plan Smart. Travel Better.</small></span></a>
   <nav><a href="/">Home</a><a href="/#destinations">Destinations</a><a href="/#packages">Packages</a><a href="/#how-it-works">How It Works</a><a href="/#about">About Us</a></nav>
   <div className="auth-header-actions"><ThemeToggle compact /><a className="auth-header-login" href={`/login?role=${role}`}>Login</a></div>
 </header>
}

function AuthRoleInfo({role}) {
 const guide = role === "guide";
 return <section
   className={`auth-signup-visual ${guide ? "guide" : "traveller"}`}
   aria-label={guide ? "Local Guide" : "Traveller"}
 >
   <div className="auth-photo-copy">
     <span className="auth-photo-kicker">{guide ? "For Local Guides, Our Support" : "Your Journey, Our Guidance"}</span>
     <h1>{guide ? <>Your Place.<br/><span>Your Story.<br/>Your Way.</span></> : <>Your Journey.<br/><span>Our Guidance.</span></>}</h1>
     <p>{guide ? "Create and manage your travel packages, connect with travellers, and share the beauty of your place with the world through Smart Travel Guide." : "Discover beautiful destinations, trusted local guides, and affordable travel packages across India."}</p>
     <div className="auth-photo-points">
       {(guide ? [["bi-map","Create Travel Packages"],["bi-people","Connect with Travellers"],["bi-graph-up-arrow","Grow Your Local Business"]] : [["bi-shield-check","Verified Destinations"],["bi-person-check","Trusted Local Guides"],["bi-briefcase","Affordable Travel Packages"]]).map(([icon,text]) => (
         <div key={text}><span><i className={`bi ${icon}`}/></span><strong>{text}</strong></div>
       ))}
     </div>
   </div>
 </section>
}

function LanguageMultiSelect({selected,onToggle,options,required}){
 const [open,setOpen]=useState(false);
 return <div className="field language-multi-field">
   <label>Languages You Speak <em>*</em></label>
   <div className={`language-multi-select ${open ? "open" : ""}`}>
     <button type="button" className="language-multi-trigger" onClick={()=>setOpen(!open)} aria-expanded={open}>
       <span className={selected.length ? "language-selected-text" : "language-placeholder"}>{selected.length ? `${selected.length} language${selected.length>1?"s":""} selected` : "Select languages you can speak"}</span>
       <i className={`bi bi-chevron-${open ? "up" : "down"}`}></i>
     </button>
     {open && <div className="language-options">
       <div className="language-options-head"><strong>Select languages</strong><span>{selected.length} selected</span></div>
       <div className="language-options-list">{options.map(language=><label className="language-option" key={language}>
         <input type="checkbox" checked={selected.includes(language)} onChange={()=>onToggle(language)}/>
         <span className="language-check"><i className="bi bi-check"></i></span>
         <span>{language}</span>
       </label>)}</div>
       <button type="button" className="language-done" onClick={()=>setOpen(false)}>Done</button>
     </div>}
   </div>
   {selected.length>0 && <div className="language-chips">{selected.map(language=><button type="button" key={language} onClick={()=>onToggle(language)}>{language} <i className="bi bi-x"></i></button>)}</div>}
   {!selected.length && required && <small className="field-hint">Select one or more languages.</small>}
 </div>
}

function FileUpload({label,file,accept,onChange}){return <div className="field vehicle-file-field"><label>{label} <em>*</em></label><label className={`vehicle-file-box ${file?"has-file":""}`}><input type="file" accept={accept} onChange={onChange}/>{file?<><i className="bi bi-file-earmark-check"/><strong>{file.name}</strong></>:<><i className="bi bi-cloud-arrow-up"/><strong>Upload a file</strong></>}</label></div>}

function PasswordField({label,name,value,onChange,placeholder,required,className=""}){
 const [show,setShow]=useState(false);
 return <div className="field password-field">
   {label && <label>{label} {required&&<em>*</em>}</label>}
   <div className="password-input-wrap">
     <input name={name} type={show?"text":"password"} value={value} onChange={onChange} required={required} className={className} placeholder={placeholder}/>
     <button type="button" className="password-toggle" onClick={()=>setShow(!show)} aria-label={show?"Hide password":"Show password"}><i className={show?"bi bi-eye-slash":"bi bi-eye"}></i></button>
   </div>
 </div>
}

function Field({label,name,value,onChange,type="text",placeholder,required,max,min,maxLength}){return <div className="field"><label>{label} {required&&<em>*</em>}</label><input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder||`Enter ${label.toLowerCase()}`} max={max} min={min} maxLength={maxLength} required={required}/></div>}

function SelectField({label,name,value,onChange,options,placeholder,required}){
 return <div className="field"><label>{label} {required&&<em>*</em>}</label><select name={name} value={value} onChange={onChange} required={required}>
   <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
   {options.map(option=><option key={option} value={option}>{option}</option>)}
 </select></div>
}
