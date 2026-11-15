import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUpRight, Bell, BookOpen, ChevronDown, Eye, EyeOff, Heart, Laptop, Menu, MessageCircle, Search, Send, Sofa, Sparkles, X } from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "";
const categories = ["All finds", "Textbooks", "Electronics", "Furniture", "Clothing", "Bicycles"];
const categoryIcons = { Textbooks: BookOpen, Electronics: Laptop, Furniture: Sofa };
const fallbackImages = ["#E4EDCB", "#F2E5D9", "#DCE8E8"].map(background => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="${background}"/><circle cx="320" cy="170" r="76" fill="#CFE27A"/><path d="M286 151h68v68h-68zM302 169h36m-36 16h36m-36 16h22" fill="none" stroke="#1B3B2D" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><text x="320" y="310" text-anchor="middle" fill="#1B3B2D" font-family="Arial,sans-serif" font-size="22" letter-spacing="5">PASSITON</text></svg>`)}`);

async function api(path, options = {}) {
  const token = localStorage.getItem("passiton_token");
  const response = await fetch(`${API}/api${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 && token) {
    localStorage.removeItem("passiton_token");
    localStorage.removeItem("passiton_user");
    window.dispatchEvent(new CustomEvent("passiton:session-expired"));
  }
  if (!response.ok) { const error = new Error(payload.message || "Something went wrong"); error.payload = payload; throw error; }
  if (path === "/reservations" && options.method === "POST") {
    const conversation = await api("/conversations", { method: "POST", body: options.body });
    window.dispatchEvent(new CustomEvent("passiton:conversation", { detail: conversation.data }));
  }
  return payload;
}

function App() {
  const [listings, setListings] = useState([]);
  const [category, setCategory] = useState("All finds");
  const [hostel, setHostel] = useState("");
  const [feed, setFeed] = useState("all");
  const [notifications, setNotifications] = useState(() => JSON.parse(localStorage.getItem("passiton_notifications") || "[]"));
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [myListingsOpen, setMyListingsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [listingDetail, setListingDetail] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [handoffsOpen, setHandoffsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("passiton_user") || "null"));

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("verifyEmail");
    if (!token) return;
    api(`/auth/verify-email/${encodeURIComponent(token)}`)
      .then(result => setToast(result.message || "Email verified. You can now log in."))
      .catch(error => setToast(error.message))
      .finally(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("verifyEmail");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        setAuthOpen(true);
      });
  }, []);

  const loadListings = async () => {
    setLoading(true); setError("");
    try { setSubmittedSearch(search.trim()); const query = new URLSearchParams({ limit: "24", ...(search ? { search } : {}), ...(category !== "All finds" ? { category: category.toLowerCase() } : {}), ...(hostel ? { hostel } : {}) }); const result = feed === "graduating" ? await api("/listings/graduating-soon") : await api(`/listings?${query}`); let rows=result.data||[]; const total=result.pagination?.total ?? rows.length; if(feed==="graduating") rows=rows.filter(item=>(!hostel||item.hostel?.toLowerCase().includes(hostel.toLowerCase()))&&(category==="All finds"||item.category?.toLowerCase()===category.toLowerCase())&&(!search||`${item.title} ${item.description} ${item.category}`.toLowerCase().includes(search.toLowerCase()))); setListings(rows); setResultCount(feed==="graduating"?rows.length:total); }
    catch (e) { setError(e.message); setListings([]); setResultCount(0); }
    finally { setLoading(false); }
  };
  const clearFilters = async () => {
    const filtersWillTriggerReload = category !== "All finds" || Boolean(hostel) || feed !== "all";
    setSearch(""); setSubmittedSearch(""); setCategory("All finds"); setHostel(""); setFeed("all");
    if (filtersWillTriggerReload) return;
    setLoading(true); setError("");
    try { const result = await api("/listings?limit=24"); setListings(result.data || []); setResultCount(result.pagination?.total ?? result.data?.length ?? 0); }
    catch (e) { setError(e.message); setListings([]); setResultCount(0); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadListings(); }, [category, hostel, feed]);
  useEffect(() => { const handler=e=>setNotifications(n=>[...n,e.detail]); window.addEventListener("passiton:notification",handler); return ()=>window.removeEventListener("passiton:notification",handler); }, []);
  useEffect(() => { localStorage.setItem("passiton_notifications", JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { const handler=()=>{setUser(null);setAuthOpen(true);setToast("Your session expired. Please log in again.");}; window.addEventListener("passiton:session-expired",handler); return ()=>window.removeEventListener("passiton:session-expired",handler); }, []);
  const signOut = () => { localStorage.removeItem("passiton_token"); localStorage.removeItem("passiton_user"); localStorage.removeItem("passiton_notifications"); setNotifications([]); setUser(null); setToast("Signed out"); };
  const reserve = async (listingId) => { if (!user) return setAuthOpen(true); try { await api("/reservations", { method: "POST", body: JSON.stringify({ listingId }) }); setToast("Reserved — the seller will be notified"); loadListings(); } catch (e) { setToast(e.message); } };

  return <div className="app">
    <header className="nav"><a className="brand" href="#top"><span className="brand-mark">↗</span> pass<span>it</span>on</a><nav><a href="#browse">Browse</a><a href="#how">How it works</a><a href="#stories">Community</a></nav><div className="nav-actions">{user ? <><div className="notification-wrap"><button className="icon-btn" aria-label="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18}/>{notifications.length > 0 && <b>{notifications.length}</b>}</button>{notificationsOpen && <div className="notification-pop">{notifications.length ? <><div className="notification-tools"><b>Notifications</b><button onClick={() => setNotifications([])}>Clear all</button></div>{notifications.map((n,i) => <button key={`${n.conversationId}-${n.message?._id||i}`} onClick={() => {setNotifications(current=>current.filter((_,index)=>index!==i));setNotificationsOpen(false);window.dispatchEvent(new CustomEvent("passiton:open-chat", {detail:n.conversationId}));}}>{n.type === "NEW_CONVERSATION" ? "New chat started · Open conversation" : `New message · ${n.message?.body || "Open conversation"}`}</button>)}</> : <p>No new notifications.</p>}</div>}</div><button className="handoffs-button" onClick={() => setHandoffsOpen(true)}>My handoffs</button><button className="handoffs-button" onClick={() => setRequestsOpen(true)}>Requests</button><button className="handoffs-button" onClick={() => setMyListingsOpen(true)}>My listings</button><button className="handoffs-button" onClick={() => setReportsOpen(true)}>Reports</button><button className="handoffs-button" onClick={() => setProfileOpen(true)}>Profile</button><button type="button" className="logout-button" onClick={signOut}>Log out</button></> : <button className="login-link" onClick={() => setAuthOpen(true)}>Log in <ArrowUpRight size={16}/></button>}<button type="button" className="sell-btn" onClick={() => user ? setListingOpen(true) : setAuthOpen(true)}>List an item <ArrowUpRight size={16}/></button></div><button className="menu" aria-label="Menu" onClick={() => setMobileMenuOpen(open => !open)}><Menu/></button>{mobileMenuOpen && <div className="mobile-menu">{user ? <><button onClick={() => {setHandoffsOpen(true);setMobileMenuOpen(false);}}>My handoffs</button><button onClick={() => {setRequestsOpen(true);setMobileMenuOpen(false);}}>Reservation requests</button><button onClick={() => {setMyListingsOpen(true);setMobileMenuOpen(false);}}>My listings</button><button onClick={() => {setReportsOpen(true);setMobileMenuOpen(false);}}>My reports</button><button onClick={() => {setProfileOpen(true);setMobileMenuOpen(false);}}>Profile</button><button onClick={signOut}>Log out</button></> : <button onClick={() => {setAuthOpen(true);setMobileMenuOpen(false);}}>Log in</button>}<button onClick={() => {if(user)setListingOpen(true);else setAuthOpen(true);setMobileMenuOpen(false);}}>List an item</button></div>}</header>
    <main id="top"><section className={listings.length ? "hero has-listing-preview" : "hero"}><div className="eyebrow"><Sparkles size={15}/> CAMPUS MARKETPLACE</div><h1>Good things,<br/><em>passed on.</em></h1><p className="hero-copy">Find what you need from someone who no longer does. A simpler, kinder way to keep campus life moving.</p><div className="hero-search"><Search size={20}/><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && loadListings()} placeholder="Search textbooks, lamps, bikes..."/><button onClick={loadListings}>Search</button></div><div className="hero-meta"><span><b>2.4k+</b> items passed on</span><span><b>98%</b> happy handoffs</span><span><b>1</b> campus community</span></div><div className="hero-preview" aria-label="Recent listings">{listings.slice(0,2).map((item,index)=><article className="hero-listing-card" key={item._id}><img src={item.images?.[0] || fallbackImages[index]} alt={item.title}/><div className="hero-listing-info"><span>{item.category}</span><strong>{item.title}</strong><small>{item.hostel || item.seller?.college || "Campus pickup"}</small><b>₹{Number(item.price).toLocaleString("en-IN")}</b></div></article>)}</div></section>
      <section className="browse" id="browse"><div className="section-heading"><div><p className="eyebrow">CURATED FOR YOU</p><h2>{feed === "graduating" ? <>Graduating <em>soon.</em></> : <>Find your next <em>favorite.</em></>}</h2></div><button className="text-btn">See all finds <ArrowUpRight size={16}/></button></div><div className="feed-controls"><button className={feed === "all" ? "category active" : "category"} onClick={() => setFeed("all")}>All finds</button><button className={feed === "graduating" ? "category active" : "category"} onClick={() => setFeed("graduating")}>Graduating soon</button><input aria-label="Filter by hostel" value={hostel} onChange={e => setHostel(e.target.value)} placeholder="Filter hostel?"/></div><div className="category-row">{categories.map(c => { const Icon = categoryIcons[c]; return <button className={category === c ? "category active" : "category"} onClick={() => setCategory(c)} key={c}>{Icon && <Icon size={17}/>} {c}</button> })}</div>{(submittedSearch || category !== "All finds" || hostel || feed !== "all") && <div className="search-feedback" aria-live="polite"><span>{loading ? "Updating results…" : <>Showing {listings.length} of {resultCount} matches{submittedSearch ? <> for <b>“{submittedSearch}”</b></> : ""}</>}</span><button type="button" onClick={clearFilters}>Clear filters</button></div>}{loading ? <div className="empty">Finding good things...</div> : error ? <div className="empty"><p>{error}</p><button className="text-btn" onClick={loadListings}>Try again</button></div> : listings.length === 0 ? <div className="empty"><p>No finds yet. Be the first to pass something on.</p><button type="button" className="sell-btn" onClick={() => user ? setListingOpen(true) : setAuthOpen(true)}>List an item</button></div> : <div className="grid">{listings.map((item, i) => <article className="card" key={item._id} role="button" tabIndex={0} onClick={() => setListingDetail(item)} onKeyDown={e => e.key === "Enter" && setListingDetail(item)}><div className="card-image"><img src={item.images?.[0] || fallbackImages[i % fallbackImages.length]} alt=""/><span className="condition">{item.condition || "Good"}</span>{item.status !== "active" && <span className={`listing-status ${item.status}`}>{item.status === "reserved" ? "Reserved" : item.status === "sold" ? "Sold" : item.status}</span>}</div><div className="card-body"><div className="card-top"><span className="card-category">{item.category}</span><strong>₹{Number(item.price).toLocaleString("en-IN")}</strong></div><h3>{item.title}</h3><p>{item.hostel || "Campus pickup"} · {item.seller?.name || "PassItOn student"}</p><div className="card-actions"><button className="reserve-btn" disabled={item.status !== "active"} onClick={e => { e.stopPropagation(); reserve(item._id); }}>{item.status === "active" ? <>Reserve item <ArrowUpRight size={15}/></> : item.status === "reserved" ? "Reserved" : "Unavailable"}</button><button className="seller-reviews" onClick={e => { e.stopPropagation(); setReviewTarget(item.seller); }}>Reviews</button></div></div></article>)}</div>}</section>
      <section className="steps" id="how"><p className="eyebrow">THE PASSITON WAY</p><h2>Less clutter.<br/><em>More connection.</em></h2><div className="step-grid"><div><span>01</span><h3>List what’s next</h3><p>Snap a photo, set a fair price, and give your things a second chapter.</p></div><div><span>02</span><h3>Find your match</h3><p>Search a campus full of useful, affordable things from people nearby.</p></div><div><span>03</span><h3>Make the handoff</h3><p>Chat, meet safely on campus, and pass it on with a little more purpose.</p></div></div></section>
      <section className="quote" id="stories"><div className="quote-mark">“</div><blockquote>My old lamp found a new desk, and I found a textbook for half the price. It feels good to keep useful things in the loop.</blockquote><p>— Ananya, third-year student</p></section>
    </main><footer><a className="brand" href="#top"><span className="brand-mark">↗</span> pass<span>it</span>on</a><p>Good things, passed on.</p><small>© 2026 PassItOn</small></footer>
    {toast && <div className="toast">{toast}<button onClick={() => setToast("")}><X size={15}/></button></div>}
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onSuccess={next => { setUser(next); setAuthOpen(false); setToast(`Welcome, ${next.name}`); }}/>} {listingOpen && <ListingModal onClose={() => setListingOpen(false)} onSuccess={() => { setListingOpen(false); setToast("Your item is now live"); loadListings(); }}/>} {editingListing && <ListingModal listing={editingListing} onClose={() => setEditingListing(null)} onSuccess={() => { setEditingListing(null); setToast("Listing updated"); loadListings(); }}/>} {listingDetail && <ListingDetailsModal listing={listingDetail} user={user} onSignIn={() => { setListingDetail(null); setAuthOpen(true); }} onClose={() => setListingDetail(null)} onReviews={seller => setReviewTarget(seller)} onReport={target => setReportTarget(target)} onReserve={reserve}/>} {reviewTarget && <ReviewsModal seller={reviewTarget} user={user} onClose={() => setReviewTarget(null)}/>} {reportTarget && <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} onDone={() => { setReportTarget(null); setToast("Report submitted"); }}/>} {handoffsOpen && <HandoffsModal onClose={() => setHandoffsOpen(false)} onToast={setToast}/>} {requestsOpen && <SellerRequestsModal onClose={() => setRequestsOpen(false)} onToast={setToast}/>} {myListingsOpen && <MyListingsModal user={user} onClose={() => setMyListingsOpen(false)} onEdit={listing => { setMyListingsOpen(false); setEditingListing(listing); }} onToast={setToast} onRefresh={loadListings}/>} {reportsOpen && <MyReportsModal onClose={() => setReportsOpen(false)}/>} {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} onSave={next=>{setUser(next);localStorage.setItem("passiton_user",JSON.stringify(next));setToast("Profile saved");}}/>}
  </div>;
}

function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", college: "", hostel: "", graduationYear: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(seconds => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const submit = async e => {
    e.preventDefault();
    try {
      const result = await api(`/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body: JSON.stringify(form) });
      if (mode === "login") {
        localStorage.setItem("passiton_token", result.token);
        localStorage.setItem("passiton_user", JSON.stringify(result.data));
        onSuccess(result.data);
      } else {
        setMode("login");
        setShowResend(true);
        setError(result.message);
      }
    } catch (x) {
      setError(x.message);
      if (x.payload?.code === "EMAIL_NOT_VERIFIED") setShowResend(true);
    }
  };
  const resendVerification = async () => {
    setResending(true);
    try {
      const result = await api("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: form.email }),
      });
      setError(result.message);
      setResendCooldown(result.resendCooldownSeconds || 60);
    } catch (x) {
      setError(x.message);
      if (x.payload?.retryAfter) setResendCooldown(x.payload.retryAfter);
    } finally {
      setResending(false);
    }
  };
  return <div className="overlay"><form className="modal" onSubmit={submit}>
    <button type="button" className="close" onClick={onClose}><X/></button>
    <p className="eyebrow">WELCOME TO PASSITON</p><h2>{mode === "login" ? "Welcome back." : "Join the loop."}</h2>
    <p className="modal-copy">{mode === "login" ? "Pick up where you left off." : "A better way to buy and pass things on."}</p>
    {mode === "register" && <><input required placeholder="Your name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}/><input required placeholder="College" value={form.college} onChange={e => setForm({...form, college: e.target.value})}/><input placeholder="Hostel (optional)" value={form.hostel} onChange={e => setForm({...form, hostel: e.target.value})}/><input required placeholder="Graduation year" type="number" value={form.graduationYear} onChange={e => setForm({...form, graduationYear: e.target.value})}/></>}
    <input required type="email" placeholder="College email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
    <div className="password-field"><input required minLength={mode === "register" ? 6 : undefined} type={showPassword ? "text" : "password"} placeholder={mode === "register" ? "Password (at least 6 characters)" : "Password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})}/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
    {error && <div className="form-error">{error}</div>}
    {showResend && mode === "login" && <button type="button" className="switch" disabled={!form.email || resending || resendCooldown > 0} onClick={resendVerification}>{resending ? "Sending..." : resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend verification email"}</button>}
    <button className="primary-btn">{mode === "login" ? "Log in" : "Create account"} <ArrowUpRight size={17}/></button>
    <button type="button" className="switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setShowResend(false); }}>{mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}</button>
  </form></div>;
}

function ListingModal({ onClose, onSuccess, listing = null }) {
  const [form, setForm] = useState(() => listing ? { title: listing.title || "", description: listing.description || "", price: listing.price ?? "", category: listing.category || "textbooks", condition: listing.condition || "good", hostel: listing.hostel || "", graduationDate: listing.graduationDate ? new Date(listing.graduationDate).toISOString().slice(0, 10) : "", images: listing.images || [] } : { title: "", description: "", price: "", category: "textbooks", condition: "good", hostel: "", graduationDate: "", images: [] });
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState([]); const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const addPhotos = async ({ target }) => {
    const files = [...target.files]; target.value = "";
    if (!files.length) return;
    if (files.some(file => !file.type.startsWith("image/"))) return setError("Please choose image files only.");
    if (files.some(file => file.size > 1024 * 1024)) return setError("Each photo must be 1 MB or smaller.");
    if (form.images.length + files.length > 5) return setError("You can add up to 5 photos.");
    try {
      const images = await Promise.all(files.map(file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); })));
      setForm({ ...form, images: [...form.images, ...images] }); setError("");
    } catch { setError("We could not read one of those photos."); }
  };
  const submit = async e => { e.preventDefault(); try { await api(listing ? `/listings/${listing._id}` : "/listings", { method: listing ? "PATCH" : "POST", body: JSON.stringify({ ...form, ...(confirmDuplicate ? { confirmDuplicate: true } : {}) }) }); onSuccess(); } catch (x) { setError(x.message); if (x.payload?.code === "POTENTIAL_DUPLICATE") setDuplicates(x.payload.data?.potentialDuplicates || []); } };
  return <div className="overlay"><form className="modal" onSubmit={submit}>
    <button type="button" className="close" onClick={onClose}><X/></button><p className="eyebrow">PASS IT ON</p><h2>{listing ? "Edit listing." : "List an item."}</h2>
    <input required placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})}/><textarea required placeholder="Tell its story" value={form.description} onChange={e => setForm({...form, description: e.target.value})}/>
    <div className="form-row"><input required type="number" placeholder="Price (₹)" value={form.price} onChange={e => setForm({...form, price: e.target.value})}/><select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>{["textbooks","electronics","furniture","appliances","clothing","bicycles","sports","others"].map(x => <option key={x}>{x}</option>)}</select></div><select value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>{["new","like-new","good","fair","poor"].map(x => <option key={x}>{x}</option>)}</select><input placeholder="Hostel pickup (optional)" value={form.hostel} onChange={e=>setForm({...form,hostel:e.target.value})}/><label className="date-field">Graduation date (for Graduating Soon feed)<input type="date" value={form.graduationDate} onChange={e=>setForm({...form,graduationDate:e.target.value})}/></label>
    <label className="photo-picker">Add photos <span>Up to 5 · 1 MB each</span><input type="file" accept="image/*" multiple onChange={addPhotos}/></label>
    {form.images.length > 0 && <div className="photo-previews">{form.images.map((image, index) => <div key={image} className="photo-preview"><img src={image} alt={`Selected photo ${index + 1}`}/><button type="button" onClick={() => setForm({...form, images: form.images.filter((_, i) => i !== index)})} aria-label={`Remove photo ${index + 1}`}><X size={14}/></button></div>)}</div>}
    {error && <div className="form-error">{error}</div>}{duplicates.length>0&&<div className="duplicate-panel"><b>Similar listings</b>{duplicates.map(d=><p key={d.listingId}>{d.title} · ₹{d.price} · {d.score}% match</p>)}<button type="button" className="switch" onClick={()=>setConfirmDuplicate(true)}>I checked these; continue</button></div>}<button className="primary-btn">{confirmDuplicate ? (listing ? "Confirm update" : "Confirm and publish") : (listing ? "Save changes" : "Publish listing")} <Send size={16}/></button>
  </form></div>;
}

function ListingDetailsModal({ listing: initialListing, user, onClose, onReviews, onReport, onReserve, onSignIn }) {
  const [listing, setListing] = useState(initialListing);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seller = listing.seller || {};
  const userId = user?.id || user?._id;
  const sellerId = seller.id || seller._id;
  const isOwner = userId && sellerId && String(userId) === String(sellerId);
  useEffect(() => { api(`/listings/${initialListing._id}`).then(result => setListing(result.data)).catch(e => setError(e.message)); }, [initialListing._id]);
  const messageSeller = async () => {
    if (!user) return onSignIn();
    setBusy(true); setError("");
    try {
      const result = await api("/conversations", { method: "POST", body: JSON.stringify({ listingId: listing._id }) });
      window.dispatchEvent(new CustomEvent("passiton:conversation", { detail: result.data }));
      onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <div className="overlay"><div className="modal detail-modal"><button className="close" onClick={onClose}><X/></button><p className="eyebrow">{listing.category} · {listing.condition}</p><h2>{listing.title}</h2>{listing.images?.length > 0 && <div className="detail-images">{listing.images.map((image, index) => <img key={`${image.slice(0, 30)}-${index}`} src={image} alt={`${listing.title}, photo ${index + 1}`}/>)}</div>}<p className="detail-price">₹{Number(listing.price).toLocaleString("en-IN")}</p><p>{listing.description}</p><p className="detail-meta">{listing.hostel || "Campus pickup"} · Seller: {seller.name || "Student"} · Status: {listing.status}</p>{error && <div className="form-error">{error}</div>}<div className="detail-actions">{listing.status === "active" && !isOwner && <button className="primary-btn" onClick={() => { onClose(); onReserve(listing._id); }}>Reserve item</button>}{!isOwner && <button className="secondary-btn" disabled={busy} onClick={messageSeller}>{busy ? "Opening chat…" : "Message seller"}</button>}<button className="secondary-btn" onClick={() => onReviews(seller)}>Seller reviews</button>{user && !isOwner && <button className="secondary-btn" onClick={() => onReport({ targetType: "listing", targetId: listing._id, title: listing.title })}>Report listing</button>}{user && !isOwner && <button className="secondary-btn" onClick={() => onReport({ targetType: "user", targetId: sellerId, title: seller.name || "Seller" })}>Report seller</button>}</div></div></div>;
}

function MyListingsModal({ user, onClose, onEdit, onToast, onRefresh }) {
  const [rows, setRows] = useState([]); const [error, setError] = useState(""); const [busy, setBusy] = useState("");
  const reload = async () => {
    try {
      const results = await Promise.all(["active", "reserved", "sold", "expired"].map(status => api(`/listings?status=${status}&limit=100`)));
      const id = String(user?.id || user?._id);
      setRows(results.flatMap(result => result.data || []).filter(item => String(item.seller?._id || item.seller?.id || item.seller) === id)); setError("");
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { reload(); }, []);
  const remove = async listing => {
    if (!window.confirm(`Delete “${listing.title}”?`)) return;
    setBusy(listing._id);
    try { await api(`/listings/${listing._id}`, { method: "DELETE" }); onToast("Listing deleted"); await reload(); }
    catch (e) { setError(e.message); } finally { setBusy(""); }
  };
  const markSold = async listing => {
    if (!window.confirm(`Mark ${listing.title} as sold?`)) return;
    setBusy(listing._id); setError("");
    try {
      await api(`/listings/${listing._id}`, { method: "PATCH", body: JSON.stringify({ status: "sold", confirmDuplicate: true }) });
      onToast("Listing marked as sold"); onRefresh(); await reload();
    } catch (e) { setError(e.message); }
    finally { setBusy(""); }
  };
  return <div className="overlay"><div className="modal handoffs-modal"><button className="close" onClick={onClose}><X/></button><p className="eyebrow">SELLER DASHBOARD</p><h2>My listings</h2>{error && <div className="form-error">{error}</div>}{rows.length === 0 && !error && <p>You haven’t listed anything yet.</p>}{rows.map(row => <article className="handoff-row" key={row._id}><b>{row.title}</b><span className="handoff-status">{row.status}</span><p>₹{Number(row.price).toLocaleString("en-IN")} · {row.category}</p><div className="request-actions">{row.status !== "sold" && <button disabled={busy === row._id} onClick={() => markSold(row)}>{busy === row._id ? "Saving…" : "Mark as sold"}</button>}<button onClick={() => onEdit(row)}>Edit</button><button disabled={busy === row._id} onClick={() => remove(row)}>{busy === row._id ? "Deleting…" : "Delete"}</button></div></article>)}</div></div>;
}

function ReportModal({ target, onClose, onDone }) {
  const [reason, setReason] = useState(""); const [description, setDescription] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError("");
    try { await api("/reports", { method: "POST", body: JSON.stringify({ targetType: target.targetType, targetId: target.targetId, reason, description }) }); onDone(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <div className="overlay"><form className="modal" onSubmit={submit}><button type="button" className="close" onClick={onClose}><X/></button><p className="eyebrow">SAFETY</p><h2>Report {target.title}</h2><select required value={reason} onChange={e => setReason(e.target.value)}><option value="" disabled>Select a reason</option>{["Fraud or scam", "Prohibited item", "Harassment or abuse", "Misleading information", "Other"].map(value => <option key={value}>{value}</option>)}</select><textarea maxLength="2000" placeholder="Add details (optional)" value={description} onChange={e => setDescription(e.target.value)}/>{error && <div className="form-error">{error}</div>}<button className="primary-btn" disabled={busy}>{busy ? "Submitting…" : "Submit report"}</button></form></div>;
}

function MyReportsModal({ onClose }) {
  const [reports, setReports] = useState(null); const [error, setError] = useState("");
  useEffect(() => { api("/reports/me").then(result => setReports(result.data || [])).catch(e => setError(e.message)); }, []);
  return <div className="overlay"><div className="modal handoffs-modal"><button className="close" onClick={onClose}><X/></button><p className="eyebrow">SAFETY</p><h2>My reports</h2>{error && <div className="form-error">{error}</div>}{reports && reports.length === 0 && <p>You haven’t submitted any reports.</p>}{reports?.map(report => <article className="handoff-row" key={report._id}><b>{report.targetType}: {report.reason}</b><span className="handoff-status">{report.status?.replace("_", " ")}</span><p>{report.description || "No additional details"}</p><small>{new Date(report.createdAt).toLocaleDateString()}</small></article>)}</div></div>;
}

function ReviewsModal({ seller, user, onClose }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const reload = () => api(`/reviews/user/${seller.id || seller._id}`).then(setResult).catch(e => setError(e.message));
  useEffect(() => { if (seller?.id || seller?._id) reload(); }, [seller]);
  const remove = async id => { if (!window.confirm("Delete your review?")) return; try { await api(`/reviews/${id}`, { method: "DELETE" }); await reload(); } catch (e) { setError(e.message); } };
  return <div className="overlay"><div className="modal"><button className="close" onClick={onClose}><X/></button><p className="eyebrow">SELLER TRUST</p><h2>{seller?.name || "Student"}</h2>{error ? <p>{error}</p> : !result ? <p>Loading reviews…</p> : <><p className="rating-summary">★ {result.rating?.average || "New"} · {result.rating?.count || 0} reviews</p>{result.data?.length ? result.data.map(r => <article className="review-row" key={r._id}><b>{r.reviewer?.name || "Student"} · {"★".repeat(r.rating)}</b><p>{r.comment || "No written comment."}</p>{user && String(r.reviewer?._id || r.reviewer?.id) === String(user.id || user._id) && <button className="review-delete" onClick={() => remove(r._id)}>Delete my review</button>}</article>) : <p>No reviews yet.</p>}</>}</div></div>;
}

function HandoffsModal({ onClose, onToast }) {
 const [rows,setRows]=useState([]); const [reviewed,setReviewed]=useState([]); const [error,setError]=useState("");
 const reload=()=>Promise.all([api("/reservations?mine=true"),api("/reviews/mine")]).then(([r,rv])=>{setRows(r.data||[]);setReviewed(rv.data||[]);}).catch(e=>setError(e.message));
 useEffect(()=>{reload();},[]);
 const submit=async (reservationId,rating,comment)=>{try{await api("/reviews",{method:"POST",body:JSON.stringify({reservationId,rating:Number(rating),comment})});onToast("Review submitted");reload();return true;}catch(e){setError(e.message);return false;}};
 const cancel=async row=>{if(!window.confirm("Cancel this reservation?"))return;try{await api(`/reservations/${row._id}`,{method:"DELETE"});onToast("Reservation cancelled");await reload();}catch(e){setError(e.message);}};
 return <div className="overlay"><div className="modal handoffs-modal"><button className="close" onClick={onClose}><X/></button><p className="eyebrow">YOUR HANDOFFS</p><h2>Reservations</h2>{error&&<div className="form-error">{error}</div>}{rows.length===0&&!error&&<p>No reservations yet.</p>}{rows.map(row=><HandoffReview key={row._id} row={row} alreadyReviewed={reviewed.includes(row._id)} onSubmit={submit} onCancel={cancel}/>)}</div></div>;
}
function HandoffReview({row,onSubmit,alreadyReviewed,onCancel}) {
 const [rating,setRating]=useState(5);const [comment,setComment]=useState("");const [done,setDone]=useState(false);
 return <article className="handoff-row"><b>{row.listing?.title||"Campus item"}</b><span className="handoff-status">{row.status}</span>{row.status==="pending"&&<button className="review-delete" onClick={()=>onCancel(row)}>Cancel reservation</button>}{row.status==="accepted"&&(alreadyReviewed||done)?<small className="reviewed-label">Review submitted</small>:row.status==="accepted"&&!done&&<form onSubmit={e=>{e.preventDefault();onSubmit(row._id,rating,comment).then(ok=>{if(ok)setDone(true);});}}><select value={rating} onChange={e=>setRating(e.target.value)} aria-label="Rating">{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} star{n===1?"":"s"}</option>)}</select><input placeholder="Share a handoff note" value={comment} onChange={e=>setComment(e.target.value)}/><button className="primary-btn">Leave review</button></form>}</article>;
}

function SellerRequestsModal({onClose,onToast}) {
 const [rows,setRows]=useState([]);const [error,setError]=useState("");const [busy,setBusy]=useState("");
 const reload=()=>api("/reservations?received=true").then(r=>setRows(r.data||[])).catch(e=>setError(e.message));useEffect(()=>{reload();},[]);
 const act=async(row,action)=>{setBusy(row._id);setError("");try{await api(`/reservations/${row._id}/${action}`,{method:"PATCH"});onToast(action==="accept"?"Reservation accepted":"Reservation rejected");await reload();}catch(e){setError(e.message);}finally{setBusy("");}};
 return <div className="overlay"><div className="modal handoffs-modal"><button className="close" onClick={onClose}><X/></button><p className="eyebrow">SELLER DASHBOARD</p><h2>Reservation requests</h2>{error&&<div className="form-error">{error}</div>}{rows.length===0&&!error&&<p>No requests for your listings yet.</p>}{rows.map(r=><article className="handoff-row" key={r._id}><b>{r.listing?.title||"Campus item"}</b><span className="handoff-status">{r.status}</span><p>From {r.buyer?.name||"Student"} ? {r.buyer?.college||""}</p>{r.status==="pending"&&<div className="request-actions"><button disabled={busy===r._id} onClick={()=>act(r,"accept")}>Accept</button><button disabled={busy===r._id} onClick={()=>act(r,"reject")}>Reject</button></div>}</article>)}</div></div>;
}
function ProfileModal({onClose,onSave}) {
 const [form,setForm]=useState(null);const [error,setError]=useState("");const [saving,setSaving]=useState(false);
 useEffect(()=>{api("/users/me").then(r=>setForm({name:r.data.name||"",college:r.data.college||"",hostel:r.data.hostel||"",graduationYear:r.data.graduationYear||"",profileImage:r.data.profileImage||""})).catch(e=>setError(e.message));},[]);
 const selectPhoto=async event=>{const file=event.target.files?.[0];event.target.value="";if(!file)return;if(!file.type.startsWith("image/"))return setError("Choose an image file.");if(file.size>1024*1024)return setError("Profile photos must be 1 MB or smaller.");const reader=new FileReader();reader.onload=()=>setForm(current=>({...current,profileImage:reader.result}));reader.onerror=()=>setError("Could not read this photo.");reader.readAsDataURL(file);};
 const submit=async e=>{e.preventDefault();setSaving(true);setError("");try{const r=await api("/users/me",{method:"PATCH",body:JSON.stringify({...form,graduationYear:Number(form.graduationYear)})});onSave(r.data);onClose();}catch(e){setError(e.message);}finally{setSaving(false);}};
 return <div className="overlay"><form className="modal" onSubmit={submit}><button type="button" className="close" onClick={onClose}><X/></button><p className="eyebrow">ACCOUNT</p><h2>Edit profile</h2>{!form&&!error?<p>Loading profile…</p>:form&&<><div className="profile-photo-picker">{form.profileImage&&<img src={form.profileImage} alt="Profile preview"/>}<label>Choose profile photo<input type="file" accept="image/*" onChange={selectPhoto}/></label>{form.profileImage&&<button type="button" className="review-delete" onClick={()=>setForm({...form,profileImage:""})}>Remove photo</button>}</div><input required placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input required placeholder="College" value={form.college} onChange={e=>setForm({...form,college:e.target.value})}/><input placeholder="Hostel" value={form.hostel} onChange={e=>setForm({...form,hostel:e.target.value})}/><input required type="number" min="2020" max="2035" placeholder="Graduation year" value={form.graduationYear} onChange={e=>setForm({...form,graduationYear:e.target.value})}/></>}{error&&<div className="form-error">{error}</div>}<button className="primary-btn" disabled={!form||saving}>{saving?"Saving…":"Save profile"}</button></form></div>;
}

function ChatDock() {
  const [user,setUser]=useState(()=>JSON.parse(localStorage.getItem("passiton_user")||"null"));
  const [open,setOpen]=useState(false);const [conversations,setConversations]=useState([]);const [selected,setSelected]=useState(null);const [messages,setMessages]=useState([]);const [draft,setDraft]=useState("");const [error,setError]=useState("");const [socket,setSocket]=useState(null);const selectedRef=useRef(null);selectedRef.current=selected;
  const loadConversations=async()=>{if(!user)return;try{const r=await api("/conversations");setConversations(r.data||[]);}catch(e){setError(e.message);}};
  const loadMessages=async id=>{try{const r=await api(`/conversations/${id}/messages`);setMessages(r.data||[]);}catch(e){setError(e.message);}};
  useEffect(()=>{const timer=window.setInterval(()=>{const next=JSON.parse(localStorage.getItem("passiton_user")||"null");setUser(current=>(current?.id||current?._id)===(next?.id||next?._id)?current:next);},700);return()=>window.clearInterval(timer);},[]);
  useEffect(()=>{let active=true;let s=null;const token=localStorage.getItem("passiton_token");if(!token){setUser(null);return;}setUser(JSON.parse(localStorage.getItem("passiton_user")||"null"));
    const connect=()=>{if(!window.io){const script=document.createElement("script");script.src=`${API}/socket.io/socket.io.js`;script.onload=()=>{if(active&&window.io)connect();};script.onerror=()=>setError("Realtime chat is unavailable; reload to retry.");document.head.appendChild(script);return;}
      s=window.io(API||window.location.origin,{auth:{token}});if(active)setSocket(s);s.on("connect_error",()=>setError("Could not connect to realtime chat."));s.on("message:new",payload=>{if(payload.conversationId===selectedRef.current?._id)setMessages(current=>current.some(m=>m._id===payload.message._id)?current:[...current,payload.message]);loadConversations();});s.on("notification:new",n=>{window.dispatchEvent(new CustomEvent("passiton:notification",{detail:n}));loadConversations();});};connect();

    return()=>{active=false;s?.disconnect();};
  },[user?.id]);
  useEffect(()=>{if(open&&user)loadConversations();},[open,user]);
  useEffect(()=>{if(!selected?._id||!open)return;setMessages([]);loadMessages(selected._id);if(socket)socket.emit("conversation:join",{conversationId:selected._id},ack=>{if(ack&&!ack.ok)setError(ack.error?.message||"Could not join conversation");});return()=>{socket?.emit("conversation:leave",{conversationId:selected._id});};},[selected?._id,open,socket]);
  useEffect(()=>{const openChat=async e=>{setOpen(true);loadConversations();if(e.detail){try{const c=await api(`/conversations/${e.detail}`);setSelected(c.data);}catch(err){setError(err.message);}}};window.addEventListener("passiton:open-chat",openChat);const opened=async e=>{setOpen(true);loadConversations();if(e.detail?._id){try{const c=await api(`/conversations/${e.detail._id}`);setSelected(c.data);}catch(err){setError(err.message);}}};window.addEventListener("passiton:conversation",opened);return()=>{window.removeEventListener("passiton:open-chat",openChat);window.removeEventListener("passiton:conversation",opened);};},[user]);
  const sendMessage=event=>{event.preventDefault();if(!draft.trim()||!selected||!socket)return;socket.emit("message:send",{conversationId:selected._id,body:draft.trim()},ack=>{if(!ack?.ok){setError(ack?.error?.message||"Could not send message");return;}setMessages(current=>current.some(m=>m._id===ack.data._id)?current:[...current,ack.data]);setDraft("");loadConversations();});};
  if(!user)return null;const unread=conversations.reduce((n,c)=>n+(c.unreadCount||0),0);
  return <><button className="chat-launch" onClick={()=>setOpen(!open)} aria-label="Open messages"><MessageCircle size={20}/>{unread>0&&<span>{unread}</span>}</button>{open&&<aside className="chat-dock"><header><div><p className="eyebrow">MESSAGES</p><h2>{selected?selected.otherUser?.name||"Conversation":"Your chats"}</h2></div><button className="close" onClick={()=>setOpen(false)}><X size={20}/></button></header><div className="chat-content">{selected?<><button className="back-to-chats" onClick={()=>{setSelected(null);setMessages([]);}}>? All conversations</button><p className="chat-listing">About: {selected.listing?.title||"an item"}</p><div className="messages">{messages.length?messages.map(m=><div className={m.sender===(user.id||user._id)?"message mine":"message"} key={m._id}><span>{m.body}</span><small>{new Date(m.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div>):<p className="chat-empty">Start the conversation.</p>}</div><form className="message-form" onSubmit={sendMessage}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength="3000" placeholder="Write a message?"/><button aria-label="Send message"><Send size={17}/></button></form></>:<div className="conversation-list">{conversations.length?conversations.map(c=><button key={c._id} onClick={()=>{setSelected(c);setError("");}}><strong>{c.otherUser?.name||"Student"}</strong><span>{c.lastMessage||`About: ${c.listing?.title||"an item"}`}</span>{c.unreadCount>0&&<b>{c.unreadCount}</b>}</button>):<p className="chat-empty">Reserve an item to start chatting with its seller.</p>}</div>}{error&&<p className="chat-error">{error}</p>}</div></aside>}</>;
}

createRoot(document.getElementById("root")).render(<><App /><ChatDock /></>);
