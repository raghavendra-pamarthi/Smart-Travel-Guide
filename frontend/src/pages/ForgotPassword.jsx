import React, { useState } from "react";
import { Link } from "react-router-dom";
import { getUser } from "../utils";
import BrandMark from "../components/BrandMark";

export default function ForgotPassword(){
 const [email,setEmail]=useState(""); const [sent,setSent]=useState(false); const [error,setError]=useState("");
 async function submit(e){
   e.preventDefault(); setError("");
   try {
     const response = await fetch("/api/forgot-password", {
       method:"POST",
       headers:{"Content-Type":"application/json"},
       body:JSON.stringify({email})
     });
     const data = await response.json();
     if(!response.ok) return setError(data.message || "Could not send reset email.");
     setSent(true);
   } catch {
     setError("Cannot connect to the server. Start it with: npm run server");
   }
 }
 return <main className="auth-page forgot-page">
  <div className="forgot-visual"><BrandMark className="big"/><h1>Lost Access?<br/>The Journey<br/><span>Still Awaits.</span></h1><p>Reset your password and get back to exploring India with Smart Travel Guide.</p><div className="side-points"><b><i className="bi bi-map"></i> Explore <small>Amazing destinations</small></b><b><i className="bi bi-heart"></i> Plan <small>Your perfect trip</small></b><b><i className="bi bi-people"></i> Experience <small>A better you</small></b></div></div>
  <div className="forgot-form-area"><div className="auth-top"><Link to="/login">← Back to Login</Link></div><form className="auth-card forgot-card" onSubmit={submit}>
   <div className="reset-icon"><i className="bi bi-envelope-paper"></i></div><h2>Forgot <span>Password?</span></h2><p>No worries! Enter your registered email address and we'll send you a link to reset your password.</p>
   {error&&<div className="alert alert-danger py-2">{error}</div>}
   {sent ? <div className="reset-success"><i className="bi bi-check-circle-fill"></i><h4>Reset link sent!</h4><p>We successfully sent a password reset link to <strong>{email}</strong>. Check your inbox and spam folder.</p><Link className="btn btn-primary w-100" to="/login">Back to Login</Link></div> :
   <><div className="field"><label>Email Address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your registered email" required/></div><button className="btn btn-primary btn-lg w-100">Send Reset Link <i className="bi bi-arrow-right"></i></button><div className="how-box"><strong><i className="bi bi-info-circle"></i> How it works?</strong><ol><li>Enter your registered email.</li><li>We'll send a password reset link.</li><li>Open the link and create a new password.</li></ol></div></>}
  </form></div>
 </main>
}
