import React, { useState } from "react";
import { getUser, apiFetch } from "../utils";

export default function SuggestPlace(){
  const [form,setForm]=useState({placeName:"",city:"",state:"",category:"Tourist Place",address:"",imageUrl:"",description:""});
  const [submitted,setSubmitted]=useState(false);
  const user=getUser()||{};
  const change=e=>setForm({...form,[e.target.name]:e.target.value});
  async function submit(e){
    e.preventDefault();
    try{
      const r=await apiFetch("/api/place-submissions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const d=await r.json();
      if(!r.ok) throw new Error(d.message||"Could not submit the place.");
      const suggestions=JSON.parse(localStorage.getItem("stg_place_suggestions")||"[]");
      suggestions.unshift(d.submission);
      localStorage.setItem("stg_place_suggestions",JSON.stringify(suggestions));
      setSubmitted(true);
      setForm({placeName:"",city:"",state:"",category:"Tourist Place",address:"",imageUrl:"",description:""});
    }catch(err){alert(err.message||"Could not submit the place.");}
  }
  return <main className="suggest-place-page">
    <section className="suggest-place-card">
      <h1>Add New Place</h1>
      {submitted&&<div className="suggest-success"><i className="bi bi-check-circle-fill"></i> Your place suggestion has been submitted for verification.</div>}
      <form onSubmit={submit}>
        <div className="suggest-form-grid">
          <div className="suggest-field"><label>Place Name</label><input required name="placeName" value={form.placeName} onChange={change}/></div>
          <div className="suggest-field"><label>City</label><input required name="city" value={form.city} onChange={change}/></div>
          <div className="suggest-field"><label>State</label><input required name="state" value={form.state} onChange={change}/></div>
          <div className="suggest-field"><label>Category</label><select name="category" value={form.category} onChange={change}><option>Tourist Place</option><option>Historical</option><option>Mountains</option><option>Nature</option><option>Beaches</option><option>Culture</option><option>Spiritual</option><option>Adventure</option></select></div>
        </div>
        <div className="suggest-field"><label>Address</label><input required name="address" value={form.address} onChange={change}/></div>
        <div className="suggest-field"><label>Image URL</label><input required name="imageUrl" type="url" placeholder="https://example.com/image.jpg" value={form.imageUrl} onChange={change}/></div>
        <div className="suggest-field"><label>Description</label><textarea required name="description" rows="5" value={form.description} onChange={change}></textarea></div>
        <button className="suggest-submit" type="submit">Submit for Verification</button>
      </form>
    </section>
  </main>
}
