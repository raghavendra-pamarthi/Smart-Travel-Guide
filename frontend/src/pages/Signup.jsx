import React, { useState } from "react";
import { saveUser } from "../utils";
import RoleSwitcher from "../components/RoleSwitcher";
import BrandMark from "../components/BrandMark";
import ThemeToggle from "../components/ThemeToggle";

const initial = {
  name:"", email:"", phone:"", dob:"", age:"", gender:"", state:"", address:"", pincode:"",
  travelTypes:[], budget:"", interests:"", guideBio:"", guideExpertise:"", languages:"", experience:"", qualification:"", additionalInterests:"",
  areaInterests:[], identityProof:null, password:"", confirmPassword:"", terms:false
};

export default function Signup() {
  const [form,setForm]=useState(initial);
  const [role,setRole]=useState(new URLSearchParams(window.location.search).get("role") === "guide" ? "guide" : "user");
  const [error,setError]=useState("");
  const today=new Date().toLocaleDateString("en-CA");
  const change=e=>setForm({...form,[e.target.name]:e.target.type==="checkbox"?e.target.checked:e.target.value});
  const toggleType=t=>setForm({...form,travelTypes:form.travelTypes.includes(t)?form.travelTypes.filter(x=>x!==t):[...form.travelTypes,t]});
  const toggleArea=t=>setForm({...form,areaInterests:form.areaInterests.includes(t)?form.areaInterests.filter(x=>x!==t):[...form.areaInterests,t]});
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
  async function submit(e){
    e.preventDefault(); setError("");
    const requiredValue = key => String(form[key] ?? "").trim().length > 0;
    const guideCommonRequired=["name","email","phone","age","gender","address","pincode","languages","password","confirmPassword"];
    const travellerRequired=["name","email","phone","age","gender","password","confirmPassword"];
    if(role === "guide") {
      if(guideCommonRequired.some(k=>!requiredValue(k)) || !form.identityProof) return setError("Please complete all required local guide fields and upload your identity proof.");
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
      const payload={...form,role,identityProofData:form.identityProof?.data||null,identityProofName:form.identityProof?.name||"",identityProofType:form.identityProof?.type||"",identityProofSize:form.identityProof?.size||0};
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
            <div className="field"><label>Gender <em>*</em></label><div className="radio-row">{["Male","Female","Other","Prefer not to say"].map(g=><label key={g}><input type="radio" name="gender" value={g} checked={form.gender===g} onChange={change}/>{g}</label>)}</div></div>
          </div>
          <div className="form-grid">
            <Field label="Address" name="address" value={form.address} onChange={change} placeholder="Enter your complete address" required />
            <Field label="Pincode" name="pincode" value={form.pincode} onChange={change} placeholder="6-digit pincode" maxLength={6} required />
          </div>
          <h5>Local Guide Information</h5>
          <div className="form-grid">
            <Field label="Guide Experience" name="experience" value={form.experience} onChange={change} placeholder="e.g. 3 years" />
            <Field label="Languages can speak" name="languages" value={form.languages} onChange={change} placeholder="English, Telugu, Hindi..." required />
          </div>
          <Field label="Short Bio" name="guideBio" value={form.guideBio} onChange={change} placeholder="Briefly tell travellers about yourself and your local knowledge" />
          <div className="field guide-area-field">
            <label>Area interest in guiding</label>
            <div className="chips">{["Heritage & History","Nature & Wildlife","Beaches & Coastal","Adventure & Trekking","Culture & Food","Spiritual & Pilgrimage","Photography","Shopping & Local Markets","Family Tours","Eco Tourism"].map(t=><button type="button" className={form.areaInterests.includes(t)?"chip active":"chip"} onClick={()=>toggleArea(t)} key={t}>{t}</button>)}</div>
          </div>
          <div className="field identity-proof-field">
            <label>Identity Proof upload <em>*</em></label>
            <label className="identity-upload-box">
              <i className="bi bi-cloud-arrow-up"></i>
              <strong>{form.identityProof ? form.identityProof.name : "Choose identity proof"}</strong>
              <small>PDF, JPG, PNG or WEBP · Max 8 MB</small>
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={handleIdentityProof} required={!form.identityProof}/>
            </label>
            {form.identityProof && <small className="upload-success"><i className="bi bi-check-circle-fill"></i> Identity proof selected ({Math.ceil(form.identityProof.size/1024)} KB)</small>}
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
