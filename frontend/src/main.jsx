import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, Bell, BookOpen, ChevronDown, Heart, Laptop, Menu, Search, Send, Sofa, Sparkles, X } from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "";
const categories = ["All finds", "Textbooks", "Electronics", "Furniture", "Clothing", "Bicycles"];
const categoryIcons = { Textbooks: BookOpen, Electronics: Laptop, Furniture: Sofa };
const fallbackImages = ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=700&q=80", "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=80", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=80"];

async function api(path, options = {}) {
  const token = localStorage.getItem("passiton_token");
  const response = await fetch(`${API}/api${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Something went wrong");
  return payload;
}

function App() {
  const [listings, setListings] = useState([]);
  const [category, setCategory] = useState("All finds");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("passiton_user") || "null"));

  const loadListings = async () => {
    setLoading(true); setError("");
    try { const query = new URLSearchParams({ limit: "24", ...(search ? { search } : {}), ...(category !== "All finds" ? { category: category.toLowerCase() } : {}) }); const result = await api(`/listings?${query}`); setListings(result.data || []); }
    catch (e) { setError(e.message); setListings([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadListings(); }, [category]);
  const signOut = () => { localStorage.removeItem("passiton_token"); localStorage.removeItem("passiton_user"); setUser(null); setToast("Signed out"); };
  const reserve = async (listingId) => { if (!user) return setAuthOpen(true); try { await api("/reservations", { method: "POST", body: JSON.stringify({ listingId }) }); setToast("Reserved — the seller will be notified"); loadListings(); } catch (e) { setToast(e.message); } };

  return <div className="app">
    <header className="nav"><a className="brand" href="#top"><span className="brand-mark">↗</span> pass<span>it</span>on</a><nav><a href="#browse">Browse</a><a href="#how">How it works</a><a href="#stories">Community</a></nav><div className="nav-actions">{user ? <><button className="icon-btn"><Bell size={18}/></button><button className="avatar" onClick={signOut}>{(user.name || "U")[0]}</button></> : <button className="login-link" onClick={() => setAuthOpen(true)}>Log in <ArrowUpRight size={16}/></button>}<button className="sell-btn" onClick={() => user ? setListingOpen(true) : setAuthOpen(true)}>List an item <ArrowUpRight size={16}/></button></div><button className="menu"><Menu/></button></header>
    <main id="top"><section className="hero"><div className="eyebrow"><Sparkles size={15}/> CAMPUS MARKETPLACE</div><h1>Good things,<br/><em>passed on.</em></h1><p className="hero-copy">Find what you need from someone who no longer does. A simpler, kinder way to keep campus life moving.</p><div className="hero-search"><Search size={20}/><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && loadListings()} placeholder="Search textbooks, lamps, bikes..."/><button onClick={loadListings}>Search</button></div><div className="hero-meta"><span><b>2.4k+</b> items passed on</span><span><b>98%</b> happy handoffs</span><span><b>1</b> campus community</span></div></section>
      <section className="browse" id="browse"><div className="section-heading"><div><p className="eyebrow">CURATED FOR YOU</p><h2>Find your next <em>favorite.</em></h2></div><button className="text-btn">See all finds <ArrowUpRight size={16}/></button></div><div className="category-row">{categories.map(c => { const Icon = categoryIcons[c]; return <button className={category === c ? "category active" : "category"} onClick={() => setCategory(c)} key={c}>{Icon && <Icon size={17}/>} {c}</button> })}</div>{loading ? <div className="empty">Finding good things...</div> : error ? <div className="empty"><p>{error}</p><button className="text-btn" onClick={loadListings}>Try again</button></div> : listings.length === 0 ? <div className="empty"><p>No finds yet. Be the first to pass something on.</p><button className="sell-btn" onClick={() => user ? setListingOpen(true) : setAuthOpen(true)}>List an item</button></div> : <div className="grid">{listings.map((item, i) => <article className="card" key={item._id}><div className="card-image"><img src={item.images?.[0] || fallbackImages[i % fallbackImages.length]} alt=""/><button className="heart"><Heart size={18}/></button><span className="condition">{item.condition || "Good"}</span></div><div className="card-body"><div className="card-top"><span className="card-category">{item.category}</span><strong>₹{Number(item.price).toLocaleString("en-IN")}</strong></div><h3>{item.title}</h3><p>{item.hostel || "Campus pickup"} · {item.seller?.name || "PassItOn student"}</p><button className="reserve-btn" onClick={() => reserve(item._id)}>Reserve item <ArrowUpRight size={15}/></button></div></article>)}</div>}</section>
      <section className="steps" id="how"><p className="eyebrow">THE PASSITON WAY</p><h2>Less clutter.<br/><em>More connection.</em></h2><div className="step-grid"><div><span>01</span><h3>List what’s next</h3><p>Snap a photo, set a fair price, and give your things a second chapter.</p></div><div><span>02</span><h3>Find your match</h3><p>Search a campus full of useful, affordable things from people nearby.</p></div><div><span>03</span><h3>Make the handoff</h3><p>Chat, meet safely on campus, and pass it on with a little more purpose.</p></div></div></section>
      <section className="quote" id="stories"><div className="quote-mark">“</div><blockquote>My old lamp found a new desk, and I found a textbook for half the price. It feels good to keep useful things in the loop.</blockquote><p>— Ananya, third-year student</p></section>
    </main><footer><a className="brand" href="#top"><span className="brand-mark">↗</span> pass<span>it</span>on</a><p>Good things, passed on.</p><small>© 2026 PassItOn</small></footer>
    {toast && <div className="toast">{toast}<button onClick={() => setToast("")}><X size={15}/></button></div>}
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={next => { setUser(next); setAuthOpen(false); setToast(`Welcome, ${next.name}`); }}/>} {listingOpen && <ListingModal onClose={() => setListingOpen(false)} onSuccess={() => { setListingOpen(false); setToast("Your item is now live"); loadListings(); }}/>} 
  </div>;
}

function AuthModal({ onClose, onSuccess }) { const [mode, setMode] = useState("login"); const [form, setForm] = useState({ email: "", password: "", name: "", college: "", graduationYear: "" }); const [error, setError] = useState(""); const submit = async e => { e.preventDefault(); try { const result = await api(`/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body: JSON.stringify(form) }); if (mode === "login") { localStorage.setItem("passiton_token", result.token); localStorage.setItem("passiton_user", JSON.stringify(result.data)); onSuccess(result.data); } else { setMode("login"); setError("Account created. Please verify your email, then log in."); } } catch (x) { setError(x.message); } }; return <div className="overlay"><form className="modal" onSubmit={submit}><button type="button" className="close" onClick={onClose}><X/></button><p className="eyebrow">WELCOME TO PASSITON</p><h2>{mode === "login" ? "Welcome back." : "Join the loop."}</h2><p className="modal-copy">{mode === "login" ? "Pick up where you left off." : "A better way to buy and pass things on."}</p>{mode === "register" && <><input required placeholder="Your name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/><input required placeholder="College" value={form.college} onChange={e => setForm({...form, college: e.target.value})}/><input required placeholder="Graduation year" type="number" value={form.graduationYear} onChange={e => setForm({...form, graduationYear: e.target.value})}/></>}<input required type="email" placeholder="College email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/><input required type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}/>{error && <div className="form-error">{error}</div>}<button className="primary-btn">{mode === "login" ? "Log in" : "Create account"} <ArrowUpRight size={17}/></button><button type="button" className="switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}</button></form></div> }

function ListingModal({ onClose, onSuccess }) { const [form, setForm] = useState({ title: "", description: "", price: "", category: "textbooks", condition: "good" }); const [error, setError] = useState(""); const submit = async e => { e.preventDefault(); try { await api("/listings", { method: "POST", body: JSON.stringify(form) }); onSuccess(); } catch (x) { setError(x.message); } }; return <div className="overlay"><form className="modal" onSubmit={submit}><button type="button" className="close" onClick={onClose}><X/></button><p className="eyebrow">PASS IT ON</p><h2>List an item.</h2><input required placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})}/><textarea required placeholder="Tell its story" value={form.description} onChange={e => setForm({...form, description: e.target.value})}/><div className="form-row"><input required type="number" placeholder="Price (₹)" value={form.price} onChange={e => setForm({...form, price: e.target.value})}/><select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{["textbooks","electronics","furniture","appliances","clothing","bicycles","sports","others"].map(x => <option key={x}>{x}</option>)}</select></div><select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>{["new","like-new","good","fair","poor"].map(x => <option key={x}>{x}</option>)}</select>{error && <div className="form-error">{error}</div>}<button className="primary-btn">Publish listing <Send size={16}/></button></form></div> }

createRoot(document.getElementById("root")).render(<App />);
