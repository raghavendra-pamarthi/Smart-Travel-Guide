import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { setLoggedIn } from "../utils";
import RoleSwitcher from "../components/RoleSwitcher";
import BrandMark from "../components/BrandMark";
import ThemeToggle from "../components/ThemeToggle";

export default function Login(){
 const location=useLocation();
 const queryRole=new URLSearchParams(location.search).get("role");
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [role,setRole]=useState(queryRole === "guide" ? "guide" : "user"); const [error,setError]=useState("");
 const [googleError,setGoogleError]=useState("");
 const googleButtonRef=useRef(null);
 const nav=useNavigate();
 const registered=new URLSearchParams(location.search).get("registered");
 useEffect(()=>{
   const rememberedRole = sessionStorage.getItem("stg_signup_role");
   if(queryRole === "guide" || queryRole === "user") setRole(queryRole);
   else if(rememberedRole === "guide" || rememberedRole === "user") setRole(rememberedRole);
   sessionStorage.removeItem("stg_signup_role");
 },[queryRole]);
 useEffect(()=>{
   if(role !== "user") {
     if(googleButtonRef.current) googleButtonRef.current.innerHTML="";
     setGoogleError("");
     return;
   }
   let active=true;
   let resizeObserver;
   const loadGoogleScript=()=>new Promise((resolve,reject)=>{
     if(window.google?.accounts?.id) return resolve();
     const existing=document.querySelector('script[data-google-identity="true"]');
     if(existing){ existing.addEventListener("load",resolve,{once:true}); existing.addEventListener("error",reject,{once:true}); return; }
     const script=document.createElement("script");
     script.src="https://accounts.google.com/gsi/client";
     script.async=true;
     script.defer=true;
     script.dataset.googleIdentity="true";
     script.onload=resolve;
     script.onerror=()=>reject(new Error("Could not load Google sign-in."));
     document.head.appendChild(script);
   });
   async function setupGoogle(){
     try {
       const cfgResponse=await fetch("/api/auth/google/config",{credentials:"include"});
       const cfg=await cfgResponse.json().catch(()=>({}));
       if(!active) return;
       if(!cfg.configured || !cfg.clientId){
         setGoogleError("Google sign-in needs GOOGLE_CLIENT_ID in backend/.env.");
         return;
       }
       await loadGoogleScript();
       if(!active || !googleButtonRef.current || !window.google?.accounts?.id) return;
       googleButtonRef.current.innerHTML="";
       window.google.accounts.id.initialize({
         client_id: cfg.clientId,
         callback: async (response)=>{
           setError(""); setGoogleError("");
           try {
             const r=await fetch("/api/auth/google",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({credential:response.credential}),credentials:"include"});
             const data=await r.json().catch(()=>({}));
             if(!r.ok) return setError(data.message||"Google sign-in failed.");
             sessionStorage.setItem("stg_user",JSON.stringify({...data.user,role:"user"}));
             if(data.sessionToken) sessionStorage.setItem("stg_session_token",data.sessionToken);
             setLoggedIn(true);
             nav("/user");
           } catch {
             setError("Cannot connect to the server. Start it with: npm run server");
           }
         },
         ux_mode:"popup",
         auto_select:false
       });
       let renderedGoogleWidth = 0;
       const renderGoogleButton = () => {
         if (!active || !googleButtonRef.current || !window.google?.accounts?.id) return;
         const availableWidth = Math.round(googleButtonRef.current.clientWidth || 320);
         const buttonWidth = Math.min(320, Math.max(200, availableWidth));
         if (buttonWidth === renderedGoogleWidth && googleButtonRef.current.childElementCount) return;
         renderedGoogleWidth = buttonWidth;
         googleButtonRef.current.innerHTML="";
         window.google.accounts.id.renderButton(googleButtonRef.current,{
           type:"standard", theme:"outline", size:"large", text:"continue_with", shape:"pill", width:buttonWidth, logo_alignment:"left"
         });
       };
       renderGoogleButton();
       if (window.ResizeObserver && googleButtonRef.current) {
         resizeObserver = new ResizeObserver(() => renderGoogleButton());
         resizeObserver.observe(googleButtonRef.current);
       }
     } catch(error){
       if(active) setGoogleError(error.message||"Could not load Google sign-in.");
     }
   }
   setupGoogle();
   return ()=>{
     active=false;
     try { resizeObserver?.disconnect(); } catch {}
     if(googleButtonRef.current) googleButtonRef.current.innerHTML="";
   };
 },[role,nav]);
 async function submit(e){
   e.preventDefault(); setError("");
   try {
     const response = await fetch("/api/login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,role}),credentials:"include"});
     const data = await response.json();
     if(!response.ok) return setError(data.message || "Login failed.");
     sessionStorage.setItem("stg_user", JSON.stringify({...data.user, role: data.user.role || role}));
     if (data.sessionToken) sessionStorage.setItem("stg_session_token", data.sessionToken);
     setLoggedIn(true);
     nav((data.user.role || role) === "guide" ? "/guide" : "/user");
   } catch { setError("Cannot connect to the server. Start it with: npm run server"); }
 }
 return <main className={`auth-redesign login-redesign ${role === "guide" ? "guide-login" : "traveller-login"}`}>
   <AuthHeader role={role} />
   <div className="auth-redesign-body">
     <AuthRoleInfo role={role} />
     <div className="auth-form-panel">
       <form className="auth-reference-card login-reference-card" onSubmit={submit}>
         <div className="auth-brand-centered"><BrandMark /><strong>Smart Travel Guide</strong><small>Plan Smart. Travel Better.</small></div>
         <h2>Welcome <span>Back!</span></h2>
         <p>Login as a traveller or local guide to continue with<br className="desktop-only"/> Smart Travel Guide.</p>
         <RoleSwitcher role={role} onChange={r=>{setRole(r);setError("");}}/>
         {registered&&<div className="alert alert-success py-2">Account created. Please login.</div>}{error&&<div className="alert alert-danger py-2">{error}</div>}
         <Field label="Email Address" value={email} setValue={setEmail} type="email"/>
         <Field label="Password" value={password} setValue={setPassword} type="password"/>
         <div className="login-options reference-options"><label><input type="checkbox"/> Remember me</label><Link to="/forgot-password">Forgot Password?</Link></div>
         <button type="submit" className="reference-login-btn">Login <i className="bi bi-arrow-right"/></button>
         {role === "user" && <div className="google-login-section">
           <div className="reference-or"><span/>or<span/></div>
           <div className="google-button-wrap" ref={googleButtonRef} aria-label="Continue with Google"/>
           {googleError && <div className="google-config-note">{googleError}</div>}
         </div>}
       </form>
     </div>
   </div>
 </main>
}

function AuthHeader({role,mode}){
 return <header className="auth-reference-header">
   <a href="/" className="auth-reference-brand"><BrandMark/><span><strong>Smart Travel Guide</strong><small>Plan Smart. Travel Better.</small></span></a>
   <nav><a href="/">Home</a><a href="/#destinations">Destinations</a><a href="/#packages">Packages</a><a href="/#how-it-works">How It Works</a><a href="/#about">About Us</a></nav>
   <div className="auth-header-actions"><ThemeToggle compact /><a className="auth-header-signup" href={`/signup?role=${role}`}>Sign Up</a></div>
 </header>
}

function AuthRoleInfo({role}){
 const guide = role === "guide";
 return <section
   className={`auth-reference-visual ${guide ? "guide" : "traveller"}`}
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

function Field({label,value,setValue,type}){
 const [show,setShow]=useState(false); const isPassword=type==="password";
 return <div className="reference-field"><label>{label}</label><div className={isPassword?"reference-password-wrap":""}><i className={`bi ${isPassword?"bi-lock":"bi-envelope"}`}/><input type={isPassword?(show?"text":"password"):type} value={value} onChange={e=>setValue(e.target.value)} placeholder={label}/>{isPassword&&<button type="button" className="reference-eye" onClick={()=>setShow(!show)} aria-label={show?"Hide password":"Show password"}><i className={show?"bi bi-eye-slash":"bi bi-eye"}/></button>}</div></div>
}
