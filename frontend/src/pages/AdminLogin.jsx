import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";

export default function AdminLogin(){
  const nav=useNavigate();
  const [form,setForm]=useState({id:"",password:""});
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const forgot=async()=>{
    if(!form.id) return setError("Enter your Admin ID / Email first.");
    try{const r=await fetch("/api/admin/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({id:form.id})});const d=await r.json();if(!r.ok)throw new Error(d.message||"Recovery could not be started.");alert(d.message);}catch(e){setError(e.message);}
  };
  const submit=async e=>{
    e.preventDefault(); setError(""); setBusy(true);
    try{
      const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(form)});
      const d=await r.json();
      if(!r.ok) throw new Error(d.message||"Admin login failed.");
      sessionStorage.setItem("stg_admin_authenticated","true");
      sessionStorage.setItem("stg_admin",JSON.stringify(d.admin));
      nav("/admin",{replace:true});
    }catch(err){setError(err.message||"Admin login failed.");}
    finally{setBusy(false);}
  };
  return <main className="admin-auth-page">
    <section className="admin-auth-shell">
      <div className="admin-auth-brand"><BrandMark className="admin-auth-brand-mark"/><div><strong>Smart Travel Guide</strong><span>Admin Control Center</span></div></div>
      <div className="admin-auth-card">
        <div className="admin-auth-icon"><i className="bi bi-shield-lock-fill"/></div>
        <span className="admin-eyebrow">SECURE ADMIN ACCESS</span>
        <h1>Admin Portal</h1>
        <p>Sign in to manage verification, quality control and system monitoring.</p>
        {error&&<div className="admin-alert error"><i className="bi bi-exclamation-triangle-fill"/>{error}</div>}
        <form onSubmit={submit}>
          <label>Admin ID / Email<input autoComplete="username" value={form.id} onChange={e=>setForm({...form,id:e.target.value})} placeholder="Admin ID or email" required/></label>
          <label>Password<div className="admin-password"><input type={show?"text":"password"} autoComplete="current-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Password" required/><button type="button" onClick={()=>setShow(!show)} aria-label={show?"Hide password":"Show password"}><i className={`bi ${show?"bi-eye-slash":"bi-eye"}`}/></button></div></label>
          <div className="admin-login-row"><button type="button" className="admin-link-button" onClick={forgot}>Forgot Password?</button></div>
          <button className="admin-login-submit" disabled={busy}>{busy?<><span className="spinner-border spinner-border-sm"/> Signing in...</>:<>Sign in to Admin <i className="bi bi-arrow-right"/></>}</button>
        </form>
        <div className="admin-security-note"><i className="bi bi-shield-check"/> Separate from Traveller and Local Guide authentication</div>
      </div>
    </section>
  </main>;
}
