import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { listPlaces, getPlace, getPlaceMeta, ensurePlaceCatalog, upsertVerifiedPlace } from "./placeService.js";

const envDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(envDir, ".env") });
dotenv.config({ path: path.join(envDir, "..", "server", ".env") });
dotenv.config({ path: path.join(envDir, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "Smart Travel Guide API", health: "/api/health", places: "/api/places" });
});

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "30mb" }));
app.use(session({
  secret: process.env.SESSION_SECRET || "smart-travel-guide-development-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Development user/reset store. Users are persisted so restarting the server
// does not erase registered accounts. For production, use a real database.
const dataDir = path.join(__dirname, "data");
const usersFile = path.join(dataDir, "users.json");
const packagesFile = path.join(dataDir, "packages.json");
const bookingsFile = path.join(dataDir, "bookings.json");
const availabilityFile = path.join(dataDir, "guide_availability.json");
const guideRequestsFile = path.join(dataDir, "guide_requests.json");
const notificationsFile = path.join(dataDir, "notifications.json");
const identityProofDir = path.join(dataDir, "identity-proofs");
const placeSubmissionsFile = path.join(dataDir, "place_submissions.json");
const placeVerificationFile = path.join(dataDir, "place_verification.json");
const adminReviewsFile = path.join(dataDir, "reviews.json");
const adminReportsFile = path.join(dataDir, "reports.json");
const helpTicketsFile = path.join(dataDir, "help_tickets.json");
const adminActionsFile = path.join(dataDir, "admin_actions.json");
const placePhotosFile = path.join(dataDir, "place_photos.json");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(identityProofDir, { recursive: true });
for (const file of [usersFile, packagesFile, bookingsFile, availabilityFile, guideRequestsFile, notificationsFile, placeSubmissionsFile, adminReviewsFile, adminReportsFile, helpTicketsFile, adminActionsFile, placePhotosFile]) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
}

function loadUsers() {
  try {
    const raw = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    return new Map(Object.entries(raw));
  } catch {
    return new Map();
  }
}

function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(Object.fromEntries(users), null, 2), "utf8");
}
function loadJsonArray(file) {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}
function saveJsonArray(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

const users = loadUsers();
const adminResetTokens = new Map();
const resetTokens = new Map();
// Per-tab application sessions. The token lives in sessionStorage, so separate browser tabs can keep separate roles.
const appSessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

app.get("/api/health", (_req, res) => {
  // Health must respond immediately. MongoDB availability is reported separately
  // so an Atlas/DNS/auth problem cannot make the whole API appear hung.
  res.json({
    ok: true,
    service: "Smart Travel Guide API",
    emailConfigured: emailConfigured(),
    database: "unknown",
    fallbackCatalogue: true
  });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    const meta = await getPlaceMeta();
    res.json({ ok: true, database: meta.source === "mongodb", placeCount: meta.count, source: meta.source });
  } catch (error) {
    res.json({ ok: true, database: false, source: "curated-fallback", message: error.message });
  }
});

// Public destination catalogue. The first request seeds MongoDB with the existing
// destinations plus a larger Wikidata/Wikimedia tourist-attraction catalogue.
app.get("/api/places", async (req, res) => {
  try {
    const result = await listPlaces({ q: req.query.q, state: req.query.state, city: req.query.city, type: req.query.type, page: req.query.page, pageSize: req.query.pageSize });
    res.json(result);
  } catch (error) {
    console.error("Places API error:", error.message);
    res.status(503).json({ message: "Place catalogue is temporarily unavailable." });
  }
});

app.get("/api/places/meta", async (_req, res) => {
  try { res.json(await getPlaceMeta()); }
  catch (error) { console.error("Place metadata error:", error.message); res.status(503).json({ message: "Place catalogue is temporarily unavailable." }); }
});

app.get("/api/places/:id", async (req, res) => {
  try {
    const place = await getPlace(req.params.id);
    if (!place) return res.status(404).json({ message: "Place not found." });
    res.json(place);
  } catch (error) {
    console.error("Place details error:", error.message);
    res.status(503).json({ message: "Place catalogue is temporarily unavailable." });
  }
});

app.post("/api/signup", (req, res) => {
  const {
    name, email, phone, dob, age, gender, state, address, pincode,
    travelTypes, budget, interests, guideBio, guideExpertise, languages,
    experience, qualification, additionalInterests, areaInterests,
    identityProofData, identityProofName, identityProofType, identityProofSize,
    vehiclesAvailable, vehicles,
    password, role
  } = req.body;
  const accountRole = role === "guide" ? "guide" : "user";

  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!name || !normalizedEmail || !phone || !gender || !password) {
    return res.status(400).json({ message: "Please complete all required fields." });
  }
  if (accountRole === "guide" && !address) {
    return res.status(400).json({ message: "Address is required for Local Guide signup." });
  }

  if (accountRole === "guide") {
    const validAge = /^\d{1,3}$/.test(String(age || "")) && Number(age) >= 1 && Number(age) <= 120;
    const validPincode = /^\d{6}$/.test(String(pincode || ""));
    const validIdentity = typeof identityProofData === "string" && identityProofData.startsWith("data:") && identityProofData.includes(";base64,");
    if (!validAge || !validPincode || !languages || !validIdentity) {
      return res.status(400).json({ message: "Please complete all required local guide fields and upload your identity proof." });
    }
    if (Number(identityProofSize || 0) > 8 * 1024 * 1024) {
      return res.status(400).json({ message: "Identity proof must be 8 MB or smaller." });
    }
  } else {
    const validAge = /^\d{1,3}$/.test(String(age || "")) && Number(age) >= 1 && Number(age) <= 120;
    if (!validAge) {
      return res.status(400).json({ message: "Please enter a valid age." });
    }
  }

  if (users.has(normalizedEmail)) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  let identityProof = null;
  if (accountRole === "guide") {
    try {
      const match = String(identityProofData).match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error("Invalid identity proof data");
      const extension = match[1] === "application/pdf" ? "pdf" : match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
      const fileName = `${crypto.createHash("sha256").update(normalizedEmail).digest("hex")}.${extension}`;
      const filePath = path.join(identityProofDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(match[2], "base64"));
      identityProof = {
        fileName,
        originalName: String(identityProofName || "identity-proof"),
        mimeType: String(identityProofType || match[1]),
        size: Number(identityProofSize || 0),
        uploadedAt: new Date().toISOString()
      };
    } catch {
      return res.status(400).json({ message: "Could not save the identity proof. Please upload the file again." });
    }
  }

  // Demo only: password is stored as a hash rather than plain text.
  const passwordHash = hashPassword(password);
  let submittedVehicles = [];
  if (accountRole === "guide" && String(vehiclesAvailable || "No") === "Yes") {
    if (!Array.isArray(vehicles) || vehicles.length < 1) return res.status(400).json({ message: "Please provide at least one vehicle when vehicle availability is Yes." });
    submittedVehicles = vehicles.map(v => ({ id: v.id || crypto.randomUUID(), type: String(v.type || "").trim(), customType: String(v.customType || "").trim(), vehicleNumber: String(v.vehicleNumber || "").trim(), vehiclePhoto: v.vehiclePhoto || null, drivingLicense: v.drivingLicense || null, verificationStatus: "Pending", verificationReason: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    for (const v of submittedVehicles) {
      if (!v.type || !v.vehicleNumber || !v.vehiclePhoto?.data || !v.drivingLicense?.data) return res.status(400).json({ message: "Please complete every vehicle detail and upload the vehicle photo and driving license." });
      if (v.type === "Other" && !v.customType) return res.status(400).json({ message: "Please enter the vehicle type for Other." });
    }
  }
  users.set(normalizedEmail, {
    name, email: normalizedEmail, phone, dob: dob || "", age: age || "", gender, state: state || "", address, pincode: pincode || "",
    travelTypes: Array.isArray(travelTypes) ? travelTypes : [], budget: budget || "", interests: interests || "",
    guideBio: guideBio || "", guideExpertise: guideExpertise || "", languages: languages || "", experience: experience || "", qualification: qualification || "", additionalInterests: additionalInterests || "",
    areaInterests: Array.isArray(areaInterests) ? areaInterests : [], identityProof, vehiclesAvailable: accountRole === "guide" ? (vehiclesAvailable === "Yes" ? "Yes" : "No") : "No", vehicles: submittedVehicles,
    role: accountRole, passwordHash, createdAt: new Date().toISOString(), verificationStatus: accountRole === "guide" ? "Pending" : undefined, verificationHistory: accountRole === "guide" ? [{ status: "Pending", at: new Date().toISOString(), note: "Guide registration submitted." }] : []
  });
  saveUsers();
  if (accountRole === "guide") {
    saveAdminAction({
      type: "guide_registration",
      title: "New Local Guide verification request",
      description: `${name} submitted Local Guide verification details.`,
      targetEmail: normalizedEmail
    });
  }

  res.status(201).json({
    message: "Account created successfully.",
    role: accountRole,
    verificationStatus: accountRole === "guide" ? "Pending" : undefined
  });
});

app.put("/api/profile", requireSession, (req, res) => {
  const { email, name, phone, dob, age, gender, state, address, pincode, travelTypes, budget, interests, guideBio, guideExpertise, languages, experience, qualification, additionalInterests, areaInterests, avatarData, avatarName, vehiclesAvailable } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!req.authUser || req.authUser.email !== normalizedEmail) return res.status(403).json({ message: "You can only update your own profile." });
  const user = users.get(normalizedEmail);
  if (!user) return res.status(404).json({ message: "Account not found." });
  if (!name || !phone || !gender) return res.status(400).json({ message: "Please complete the required personal information." });
  if (user.role === "guide" && !address) return res.status(400).json({ message: "Address is required for a Local Guide profile." });
  if (user.role === "guide") {
    const validAge = /^\d{1,3}$/.test(String(age || user.age || "")) && Number(age || user.age) >= 1 && Number(age || user.age) <= 120;
    const validPincode = /^\d{6}$/.test(String(pincode || user.pincode || ""));
    if (!validAge || !validPincode || !languages) return res.status(400).json({ message: "Please complete the required local guide profile information." });
  } else {
    const validAge = /^\d{1,3}$/.test(String(age || user.age || "")) && Number(age || user.age) >= 1 && Number(age || user.age) <= 120;
    if (!validAge) return res.status(400).json({ message: "Please enter a valid age." });
  }
  if (avatarData) {
    const validAvatar = typeof avatarData === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(avatarData);
    if (!validAvatar) return res.status(400).json({ message: "Profile picture must be a JPG, PNG or WEBP image." });
    const base64 = avatarData.split(",")[1] || "";
    if (Buffer.byteLength(base64, "base64") > 3 * 1024 * 1024) return res.status(400).json({ message: "Profile picture must be 3 MB or smaller." });
    user.avatarData = avatarData;
    user.avatarName = String(avatarName || "profile-picture");
  }
  Object.assign(user, { name, phone, dob: dob || user.dob || "", age: age || user.age || "", gender, state: state || user.state || "", address: address || user.address || "", pincode: pincode || user.pincode || "", travelTypes: Array.isArray(travelTypes) ? travelTypes : user.travelTypes || [], budget: budget || user.budget || "", interests: interests || "", guideBio: guideBio || "", guideExpertise: guideExpertise || user.guideExpertise || "", languages: languages || user.languages || "", experience: experience || "", qualification: qualification || "", additionalInterests: additionalInterests || "", areaInterests: Array.isArray(areaInterests) ? areaInterests : user.areaInterests || [], vehiclesAvailable: user.role === "guide" ? (vehiclesAvailable === "Yes" ? "Yes" : (vehiclesAvailable === "No" ? "No" : (user.vehiclesAvailable || "No"))) : user.vehiclesAvailable });
  saveUsers();
  const { passwordHash: _, ...safeUser } = user;
  res.json({ message: "Profile updated successfully.", user: safeUser });
});


app.get("/api/auth/google/config", (_req, res) => {
  res.json({ configured: Boolean(process.env.GOOGLE_CLIENT_ID), clientId: process.env.GOOGLE_CLIENT_ID || "" });
});

app.post("/api/auth/google", async (req, res) => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const credential = String(req.body?.credential || "").trim();
  if (!clientId) return res.status(503).json({ message: "Google sign-in is not configured on the server yet." });
  if (!credential) return res.status(400).json({ message: "Google credential is missing." });

  let googleAccount;
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.sub) throw new Error("Invalid Google credential.");
    if (String(data.aud || "") !== clientId) throw new Error("Google client ID does not match this application.");
    if (String(data.iss || "") !== "https://accounts.google.com" && String(data.iss || "") !== "accounts.google.com") throw new Error("Invalid Google issuer.");
    const verified = String(data.email_verified).toLowerCase() === "true";
    const email = normalizedEmail(data.email);
    const gmailAddress = email.endsWith("@gmail.com");
    const workspaceAddress = Boolean(String(data.hd || "").trim());
    if (!email || !verified || (!gmailAddress && !workspaceAddress)) {
      throw new Error("Google could not verify this account email. Please use a verified Gmail or Google Workspace account.");
    }
    googleAccount = {
      sub: String(data.sub),
      email,
      name: String(data.name || "Traveller"),
      picture: String(data.picture || "")
    };
  } catch (error) {
    return res.status(401).json({ message: error.message || "Google sign-in failed. Please try again." });
  }

  let user = users.get(googleAccount.email);
  if (user?.role === "guide") {
    return res.status(403).json({ message: "This email belongs to a Local Guide account. Please use Local Guide login." });
  }

  if (!user) {
    user = {
      name: googleAccount.name,
      email: googleAccount.email,
      phone: "",
      dob: "",
      age: "",
      gender: "",
      state: "",
      address: "",
      pincode: "",
      travelTypes: [],
      budget: "",
      interests: "",
      guideBio: "",
      guideExpertise: "",
      languages: "",
      experience: "",
      qualification: "",
      additionalInterests: "",
      areaInterests: [],
      role: "user",
      authProvider: "google",
      googleSub: googleAccount.sub,
      avatarData: googleAccount.picture,
      avatarName: "Google profile picture",
      createdAt: new Date().toISOString()
    };
    users.set(googleAccount.email, user);
  } else {
    if (user.googleSub && user.googleSub !== googleAccount.sub) {
      return res.status(403).json({ message: "This Traveller account is already linked to a different Google account." });
    }
    user.googleSub = googleAccount.sub;
    user.authProvider = user.authProvider || "google";
    if (!user.avatarData && googleAccount.picture) {
      user.avatarData = googleAccount.picture;
      user.avatarName = "Google profile picture";
    }
  }

  saveUsers();
  const { passwordHash: _, password: __, ...safeUser } = user;
  const sessionToken = crypto.randomBytes(32).toString("hex");
  appSessions.set(sessionToken, { email: safeUser.email, role: "user", createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS });
  res.json({ user: safeUser, authenticated: true, sessionToken, provider: "google" });
});

app.post("/api/login", (req, res) => {
  const { email, password, role } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = users.get(normalizedEmail);

  if (!user) return res.status(401).json({ message: "No account found with this email. Please sign up first." });

  const accountRole = user.role || "user";
  if (role && accountRole !== role) {
    return res.status(403).json({ message: `This account is registered as a ${accountRole === "guide" ? "Local Guide" : "Traveller"}. Please select the correct account type.` });
  }

  if (!verifyStoredPassword(user, password)) return res.status(401).json({ message: "Incorrect password." });
  saveUsers();

  const { passwordHash: _, password: __, ...safeUser } = user;
  const sessionToken = crypto.randomBytes(32).toString("hex");
  appSessions.set(sessionToken, { email: safeUser.email, role: safeUser.role, createdAt: Date.now(), expiresAt: Date.now() + SESSION_TTL_MS });
  res.json({ user: safeUser, authenticated: true, sessionToken });
});

app.get("/api/session", (req, res) => {
  const token = String(req.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const appSession = appSessions.get(token);
  if (!appSession || appSession.expiresAt < Date.now()) { if (token) appSessions.delete(token); return res.status(401).json({ authenticated: false }); }
  const user = users.get(appSession.email);
  if (!user) { appSessions.delete(token); return res.status(401).json({ authenticated: false }); }
  const { passwordHash: _, ...safeUser } = user;
  res.json({ authenticated: true, user: safeUser });
});

app.post("/api/logout", (req, res) => {
  const token = String(req.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (token) appSessions.delete(token);
  req.session.destroy(() => res.json({ message: "Logged out successfully." }));
});

function getAppSession(req) {
  const token = String(req.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const s = appSessions.get(token);
  if (!s || s.expiresAt < Date.now()) { appSessions.delete(token); return null; }
  s.expiresAt = Date.now() + SESSION_TTL_MS;
  return s;
}

function requireSession(req, res, next) {
  const appSession = getAppSession(req);
  if (!appSession) return res.status(401).json({ message: "Your session has expired. Please login again." });
  const user = users.get(appSession.email);
  if (!user) return res.status(401).json({ message: "Your session is no longer valid. Please login again." });
  req.authUser = user;
  next();
}

function isGuideVerified(user) {
  return Boolean(user && user.role === "guide" && (user.verificationStatus || "Pending") === "Verified");
}

function requireApprovedGuide(req, res, next) {
  if (req.authUser?.role !== "guide") return res.status(403).json({ message: "Only Local Guides can use this function." });
  if (!isGuideVerified(req.authUser)) {
    return res.status(403).json({
      message: "Your Local Guide account must be approved by STG Admin before this functionality is available.",
      verificationStatus: req.authUser.verificationStatus || "Pending"
    });
  }
  next();
}

function normalizedEmail(value) { return String(value || "").trim().toLowerCase(); }
function hashPassword(value) { return crypto.createHash("sha256").update(String(value || "")).digest("hex"); }
function verifyStoredPassword(user, suppliedPassword) {
  const password = String(suppliedPassword || "");
  const currentHash = hashPassword(password);
  if (user?.passwordHash && user.passwordHash === currentHash) return true;
  // Compatibility for older STG accounts that may have stored a legacy plain
  // password field or a raw passwordHash. On a successful legacy match the
  // account is upgraded to the current SHA-256 representation.
  if (user?.passwordHash && user.passwordHash === password) {
    user.passwordHash = currentHash;
    return true;
  }
  if (user?.password && user.password === password) {
    user.passwordHash = currentHash;
    delete user.password;
    return true;
  }
  return false;
}
function packageCities(pkg) {
  const cities = [...new Set((pkg.places || []).map(p => p.city).filter(Boolean))];
  return cities;
}
function dateRangeOverlaps(startDate, endDate, aStart, aEnd) {
  return startDate && endDate && aStart && aEnd && startDate <= aEnd && aStart <= endDate;
}
function enumerateDates(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return [];
  const dates = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
function availabilityCoversDate(item, date) { const from=String(item.fromDate||item.date||""); const to=String(item.toDate||item.date||""); return Boolean(from&&to&&date>=from&&date<=to); }
function guideHasFullAvailability(guideEmail, city, startDate, endDate, availabilityList = null) { const all=availabilityList||loadJsonArray(availabilityFile); const targetCity=String(city||'').trim().toLowerCase(); return enumerateDates(startDate,endDate).every(date=>all.some(x=>normalizedEmail(x.guideEmail)===normalizedEmail(guideEmail)&&String(x.city||x.placeCity||'').trim().toLowerCase()===targetCity&&availabilityCoversDate(x,date))); }
function guideHasAnyAvailability(guideEmail, city, startDate, endDate, availabilityList = null) { const all=availabilityList||loadJsonArray(availabilityFile); const targetCity=String(city||'').trim().toLowerCase(); const requestedDates=enumerateDates(startDate,endDate); return all.some(x=>normalizedEmail(x.guideEmail)===normalizedEmail(guideEmail)&&String(x.city||x.placeCity||'').trim().toLowerCase()===targetCity&&requestedDates.some(date=>availabilityCoversDate(x,date))); }
function synchronizeGuideRequestStatuses() {
  const requests = loadJsonArray(guideRequestsFile);
  const availability = loadJsonArray(availabilityFile);
  const bookings = loadJsonArray(bookingsFile);
  const notifications = loadJsonArray(notificationsFile);
  let requestsChanged = false;
  let bookingsChanged = false;
  let notificationsChanged = false;
  for (const request of requests) {
    if (!['Pending', 'Accepted'].includes(request.status)) continue;
    const stillAvailable = guideHasAnyAvailability(request.guideEmail, request.location, request.startDate, request.endDate, availability);
    if (stillAvailable) continue;
    request.status = 'Not Available';
    request.statusReason = 'The Local Guide is no longer available within the requested date range.';
    request.updatedAt = new Date().toISOString();
    requestsChanged = true;
    const booking = bookings.find(b => String(b.requestId || b.id) === String(request.id) && b.bookingType === 'guide_request');
    if (booking) {
      booking.status = 'Not Available';
      booking.statusReason = request.statusReason;
      booking.updatedAt = request.updatedAt;
      bookingsChanged = true;
    }
    const alreadyNotified = notifications.some(n => n.requestId === request.id && n.type === 'guide_not_available' && new Date(n.createdAt || 0).getTime() >= new Date(request.updatedAt).getTime() - 1000);
    if (!alreadyNotified) {
      notifications.unshift({
        id: crypto.randomUUID(),
        recipientEmail: request.travellerEmail,
        type: 'guide_not_available',
        requestId: request.id,
        bookingId: booking?.id || request.id,
        message: `${request.guideName || 'The selected Local Guide'} is no longer available for ${request.location} on the requested dates. Your guide request has been cancelled as Not Available.`,
        read: false,
        createdAt: new Date().toISOString()
      });
      notificationsChanged = true;
    }
  }
  if (requestsChanged) saveJsonArray(guideRequestsFile, requests);
  if (bookingsChanged) saveJsonArray(bookingsFile, bookings);
  if (notificationsChanged) saveJsonArray(notificationsFile, notifications);
  return requests;
}

// Server-backed guide availability, requests and notifications keep guide/traveller
// data synchronized across browsers and sessions.
app.get("/api/guide/availability", requireSession, (req, res) => {
  let all = loadJsonArray(availabilityFile);
  const guideEmail = normalizedEmail(req.query.guideEmail);
  const city = String(req.query.city || "").trim().toLowerCase();
  const date = String(req.query.date || "");
  if (req.authUser.role === "guide") {
    const owner = normalizedEmail(req.authUser.email);
    if (guideEmail && guideEmail !== owner) return res.status(403).json({ message: "You can only view your own guide availability." });
    all = all.filter(x => normalizedEmail(x.guideEmail) === owner);
  } else if (guideEmail) {
    all = all.filter(x => normalizedEmail(x.guideEmail) === guideEmail);
  }
  if (city) all = all.filter(x => String(x.city || x.placeCity || "").trim().toLowerCase() === city);
  if (date) all = all.filter(x => x.date === date);
  if (req.authUser.role === "user") {
    all = all.filter(x => isGuideVerified(users.get(normalizedEmail(x.guideEmail))));
  }
  res.json(all);
});

app.post("/api/guide/availability", requireSession, requireApprovedGuide, (req, res) => {
  const record = req.body || {};
  const city = String(record.city || "").trim(); const fromDate = String(record.fromDate || record.date || ""); const toDate = String(record.toDate || record.date || fromDate);
  if (!city || !fromDate || !toDate || toDate < fromDate) return res.status(400).json({ message: "City and a valid availability date range are required." });
  const all = loadJsonArray(availabilityFile); const guideEmail = normalizedEmail(req.authUser.email);
  if (all.some(x => normalizedEmail(x.guideEmail) === guideEmail && String(x.city || x.placeCity || "").trim().toLowerCase() === city.toLowerCase() && dateRangeOverlaps(fromDate,toDate,String(x.fromDate||x.date||""),String(x.toDate||x.date||"")))) return res.status(409).json({ message: "You already have availability overlapping this city and date range." });
  const saved = { city, fromDate, toDate, date: fromDate, id: record.id || crypto.randomUUID(), guideEmail: req.authUser.email, guideName: req.authUser.name, guidePhone: req.authUser.phone || "", guideEmailAddress: req.authUser.email, createdAt: new Date().toISOString() };
  all.unshift(saved);
  saveJsonArray(availabilityFile, all);
  res.status(201).json({ availability: saved });
});

app.delete("/api/guide/availability/:id", requireSession, requireApprovedGuide, (req, res) => {
  const all = loadJsonArray(availabilityFile);
  const target = all.find(x => x.id === req.params.id);
  if (target && normalizedEmail(target.guideEmail) !== normalizedEmail(req.authUser.email)) return res.status(403).json({ message: "You can only remove your own availability." });
  saveJsonArray(availabilityFile, all.filter(x => x.id !== req.params.id));
  synchronizeGuideRequestStatuses();
  res.json({ message: "Availability removed." });
});

app.get("/api/guide/search", requireSession, (req, res) => {
  const city = String(req.query.city || "").trim().toLowerCase();
  const startDate = String(req.query.startDate || "");
  const endDate = String(req.query.endDate || startDate || "");
  if (!city) return res.status(400).json({ message: "Location is required." });
  const availability = loadJsonArray(availabilityFile);
  const guides = new Map();
  for (const item of availability) {
    if (String(item.city || item.placeCity || "").trim().toLowerCase() !== city) continue;
    const email = normalizedEmail(item.guideEmail);
    const user = users.get(email);
    if (!user || user.role !== "guide") continue;
    const guideStatus = user.verificationStatus || "Verified";
    if (guideStatus !== "Verified") continue;
    const key = email;
    if (!guides.has(key)) guides.set(key, { name: user.name, email: user.email, phone: user.phone, age: user.age, gender: user.gender, experience: user.experience || "", languages: user.languages || "", guideBio: user.guideBio || "", areaInterests: user.areaInterests || [], vehicles: (user.vehicles || []).filter(v => v.verificationStatus === "Verified").map(sanitizeVehicleForPublic), previousTrips: loadJsonArray(bookingsFile).filter(b => normalizedEmail(b.guideEmail) === email).length, availableDates: [] });
    guides.get(key).availableDates.push(...enumerateDates(String(item.fromDate || item.date || ""), String(item.toDate || item.date || item.fromDate || "")));
  }
  const neededDates = enumerateDates(startDate, endDate);
  const result = [...guides.values()]
    .map(g => ({ ...g, availableDates: [...new Set(g.availableDates)].sort() }))
    .filter(g => !neededDates.length || neededDates.some(d => g.availableDates.includes(d)))
    .map(g => {
      g.availableDates = neededDates.length ? g.availableDates.filter(d => neededDates.includes(d)) : g.availableDates;
      const guide = users.get(normalizedEmail(g.email));
      const profile = guide ? Object.fromEntries(Object.entries(guide).filter(([key, value]) => !['passwordHash','identityProof','verificationHistory'].includes(key) && value !== undefined)) : {};
      return { ...g, avatarData: guide?.avatarData || '', profile };
    });
  res.json(result);
});

app.get("/api/guide/requests", requireSession, (req, res) => {
  // Requests are private to the authenticated party. Query parameters are only
  // used by the existing UI as a filter hint; they can never expand access.
  let all = synchronizeGuideRequestStatuses();
  const requestedGuide = normalizedEmail(req.query.guideEmail);
  const requestedTraveller = normalizedEmail(req.query.travellerEmail);
  if (req.authUser.role === "guide") {
    const owner = normalizedEmail(req.authUser.email);
    if (requestedGuide && requestedGuide !== owner) return res.status(403).json({ message: "You can only view your own guide requests." });
    if (requestedTraveller && requestedTraveller !== owner) return res.status(403).json({ message: "Guide accounts cannot view another traveller's requests." });
    all = all.filter(x => normalizedEmail(x.guideEmail) === owner);
  } else if (req.authUser.role === "user") {
    const owner = normalizedEmail(req.authUser.email);
    if (requestedTraveller && requestedTraveller !== owner) return res.status(403).json({ message: "You can only view your own guide requests." });
    if (requestedGuide) all = all.filter(x => normalizedEmail(x.guideEmail) === requestedGuide);
    all = all.filter(x => normalizedEmail(x.travellerEmail) === owner);
  } else {
    return res.status(403).json({ message: "This account cannot access guide requests." });
  }
  res.json(all.map(x => { const guide=users.get(normalizedEmail(x.guideEmail)); const traveller=users.get(normalizedEmail(x.travellerEmail)); const profile=guide ? Object.fromEntries(Object.entries(guide).filter(([key,value]) => !['passwordHash','identityProof','verificationHistory'].includes(key) && value !== undefined)) : {}; return { ...x, guideName:guide?.name||x.guideName, guidePhone:guide?.phone||x.guidePhone||"", avatarData:guide?.avatarData||x.avatarData||"", guideProfile:profile, travellerName:traveller?.name||x.travellerName }; }));
});

app.post("/api/guide/requests", requireSession, (req, res) => {
  if (req.authUser.role !== "user") return res.status(403).json({ message: "Only travellers can send guide requests." });
  const body = req.body || {};
  const guideEmail = normalizedEmail(body.guideEmail);
  const guide = users.get(guideEmail);
  if (!guide || guide.role !== "guide") return res.status(404).json({ message: "Local Guide not found." });
  if (!isGuideVerified(guide)) return res.status(409).json({ message: "This Local Guide is not currently verified by STG Admin." });
  if (!body.tripId || !body.location || !Array.isArray(body.places) || !body.places.length) return res.status(400).json({ message: "Trip, location and selected places are required." });
  if (!body.startDate || !body.endDate || body.endDate < body.startDate) return res.status(400).json({ message: "A valid guide date range is required." });
  if (!guideHasAnyAvailability(guide.email, body.location, body.startDate, body.endDate)) return res.status(409).json({ message: "This Local Guide is no longer available within the requested date range." });
  const all = synchronizeGuideRequestStatuses();
  if (all.some(x => normalizedEmail(x.travellerEmail) === normalizedEmail(req.authUser.email) && x.tripId === body.tripId && normalizedEmail(x.guideEmail) === guideEmail && ["Pending","Accepted"].includes(x.status))) return res.status(409).json({ message: "A request to this guide already exists for this trip." });
  const record = { ...body, id: body.id || crypto.randomUUID(), travellerEmail: req.authUser.email, travellerName: req.authUser.name, guideEmail: guide.email, guideName: guide.name, guidePhone: guide.phone || "", status: "Pending", rejectionReason: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  all.unshift(record);
  saveJsonArray(guideRequestsFile, all);
  const bookings = loadJsonArray(bookingsFile);
  const booking = {
    id: record.id,
    requestId: record.id,
    bookingType: "guide_request",
    travellerEmail: record.travellerEmail,
    travellerName: record.travellerName,
    travellerPhone: req.authUser.phone || "",
    guideEmail: record.guideEmail,
    guideName: record.guideName,
    guidePhone: record.guidePhone || "",
    packageName: record.tripName || "Customized Trip",
    tripName: record.tripName || "Customized Trip",
    location: record.location,
    startDate: record.startDate,
    endDate: record.endDate,
    days: enumerateDates(record.startDate, record.endDate).length,
    places: record.places,
    requirements: record.requirements || "",
    status: "Pending",
    statusReason: "Waiting for Local Guide confirmation.",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    bookedAt: record.createdAt
  };
  bookings.unshift(booking);
  saveJsonArray(bookingsFile, bookings);
  const notifications = loadJsonArray(notificationsFile);
  notifications.unshift({ id: crypto.randomUUID(), recipientEmail: guide.email, type: "guide_request", requestId: record.id, bookingId: booking.id, message: `${record.travellerName} sent a Guide/Travel System request for ${record.location}. Open My Bookings to review it.`, read: false, createdAt: new Date().toISOString() });
  saveJsonArray(notificationsFile, notifications);
  res.status(201).json({ request: record, booking });
});

app.delete("/api/guide/requests/:id", requireSession, (req, res) => {
  if (req.authUser.role !== "user") return res.status(403).json({ message: "Only travellers can remove guide requests." });
  const all = synchronizeGuideRequestStatuses();
  const index = all.findIndex(x => x.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: "Request not found." });
  const target = all[index];
  if (normalizedEmail(target.travellerEmail) !== normalizedEmail(req.authUser.email)) return res.status(403).json({ message: "You can only remove your own guide requests." });
  if (target.status !== "Pending") return res.status(409).json({ message: `This request is already ${target.status}.` });
  target.status = "Removed";
  target.statusReason = "Request removed by Traveller.";
  target.updatedAt = new Date().toISOString();
  saveJsonArray(guideRequestsFile, all);
  const bookings = loadJsonArray(bookingsFile);
  const bookingIndex = bookings.findIndex(b => String(b.requestId || b.id) === String(target.id) && b.bookingType === "guide_request");
  if (bookingIndex >= 0) { bookings[bookingIndex].status = "Removed"; bookings[bookingIndex].statusReason = target.statusReason; bookings[bookingIndex].updatedAt = target.updatedAt; saveJsonArray(bookingsFile, bookings); }
  const notifications = loadJsonArray(notificationsFile);
  notifications.unshift({ id: crypto.randomUUID(), recipientEmail: target.guideEmail, type: "guide_request_removed", requestId: target.id, bookingId: target.id, message: `${target.travellerName || "Traveller"} removed the Guide/Travel System request for ${target.location}.`, read: false, createdAt: new Date().toISOString() });
  saveJsonArray(notificationsFile, notifications);
  res.json({ request: target });
});

app.patch("/api/guide/requests/:id", requireSession, requireApprovedGuide, (req, res) => {
  const all = synchronizeGuideRequestStatuses();
  const index = all.findIndex(x => x.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: "Request not found." });
  const target = all[index];
  if (normalizedEmail(target.guideEmail) !== normalizedEmail(req.authUser.email)) return res.status(403).json({ message: "You can only respond to your own requests." });
  if (target.status !== "Pending") {
    return res.status(409).json({ message: target.status === "Not Available" ? "This request has been cancelled because the guide is no longer available." : `This request is already ${target.status}.` });
  }
  if (!guideHasAnyAvailability(target.guideEmail, target.location, target.startDate, target.endDate)) {
    target.status = "Not Available";
    target.statusReason = "The Local Guide is no longer available within the requested date range.";
    target.updatedAt = new Date().toISOString();
    all[index] = target;
    saveJsonArray(guideRequestsFile, all);
    const bookings = loadJsonArray(bookingsFile);
    const bookingIndex = bookings.findIndex(b => String(b.requestId || b.id) === String(target.id) && b.bookingType === "guide_request");
    if (bookingIndex >= 0) { bookings[bookingIndex].status = "Not Available"; bookings[bookingIndex].statusReason = target.statusReason; bookings[bookingIndex].updatedAt = target.updatedAt; saveJsonArray(bookingsFile, bookings); }
    const notifications = loadJsonArray(notificationsFile);
    notifications.unshift({ id: crypto.randomUUID(), recipientEmail: target.travellerEmail, type: "guide_not_available", requestId: target.id, bookingId: target.id, message: `${target.guideName || "The selected Local Guide"} is no longer available for ${target.location}. Your guide request has been cancelled as Not Available.`, read: false, createdAt: new Date().toISOString() });
    saveJsonArray(notificationsFile, notifications);
    return res.status(409).json({ message: "The guide is no longer available within the requested date range. The request was marked Not Available.", request: target });
  }
  const status = req.body?.status === "Accepted" ? "Accepted" : req.body?.status === "Rejected" ? "Rejected" : "";
  if (!status) return res.status(400).json({ message: "Status must be Accepted or Rejected." });
  target.status = status;
  target.rejectionReason = status === "Rejected" ? String(req.body?.rejectionReason || "").trim() : "";
  target.statusReason = status === "Accepted" ? "Accepted by the Local Guide." : (target.rejectionReason || "Rejected by the Local Guide.");
  target.updatedAt = new Date().toISOString();
  all[index] = target;
  const bookings = loadJsonArray(bookingsFile);
  if (status === "Accepted") {
    const notificationsForOthers = [];
    for (const other of all) {
      if (other.id === target.id || other.tripId !== target.tripId || normalizedEmail(other.travellerEmail) !== normalizedEmail(target.travellerEmail) || other.status !== "Pending") continue;
      other.status = "Timed Out";
      other.statusReason = "This request was closed because another Local Guide accepted the trip.";
      other.updatedAt = target.updatedAt;
      const otherBooking = bookings.find(b => String(b.requestId || b.id) === String(other.id) && b.bookingType === "guide_request");
      if (otherBooking) {
        otherBooking.status = "Timed Out";
        otherBooking.statusReason = other.statusReason;
        otherBooking.updatedAt = target.updatedAt;
      }
      notificationsForOthers.push({
        id: crypto.randomUUID(),
        recipientEmail: other.travellerEmail,
        type: "guide_timed_out",
        requestId: other.id,
        bookingId: otherBooking?.id || other.id,
        message: `${other.guideName || "Local Guide"} request is no longer active because ${target.guideName || "another Local Guide"} accepted your Guide/Travel System request for ${target.location}.`,
        read: false,
        createdAt: new Date().toISOString()
      });
    }
    if (notificationsForOthers.length) {
      const existingNotifications = loadJsonArray(notificationsFile);
      existingNotifications.unshift(...notificationsForOthers);
      saveJsonArray(notificationsFile, existingNotifications);
    }
  }
  saveJsonArray(guideRequestsFile, all);
  const bookingIndex = bookings.findIndex(b => String(b.requestId || b.id) === String(target.id) && b.bookingType === "guide_request");
  if (bookingIndex >= 0) {
    bookings[bookingIndex].status = status;
    bookings[bookingIndex].statusReason = target.statusReason;
    bookings[bookingIndex].rejectionReason = target.rejectionReason;
    bookings[bookingIndex].updatedAt = target.updatedAt;
    saveJsonArray(bookingsFile, bookings);
  }
  const notifications = loadJsonArray(notificationsFile);
  notifications.unshift({ id: crypto.randomUUID(), recipientEmail: target.travellerEmail, type: `guide_${status.toLowerCase()}`, requestId: target.id, bookingId: target.id, message: status === "Accepted" ? `${target.guideName} accepted your Guide/Travel System request for ${target.location}.` : `${target.guideName} rejected your Guide/Travel System request for ${target.location}.`, read: false, createdAt: new Date().toISOString() });
  saveJsonArray(notificationsFile, notifications);
  res.json({ request: target });
});

app.get("/api/notifications", requireSession, (req, res) => {
  const all = loadJsonArray(notificationsFile);
  res.json(all.filter(x => normalizedEmail(x.recipientEmail) === normalizedEmail(req.authUser.email)));
});

app.patch("/api/notifications/:id/read", requireSession, (req, res) => {
  const all = loadJsonArray(notificationsFile);
  const target = all.find(x => x.id === req.params.id && normalizedEmail(x.recipientEmail) === normalizedEmail(req.authUser.email));
  if (!target) return res.status(404).json({ message: "Notification not found." });
  target.read = true;
  saveJsonArray(notificationsFile, all);
  res.json({ notification: target });
});

function guideVehicles(user) { return Array.isArray(user?.vehicles) ? user.vehicles : []; }
function sanitizeVehicleForPublic(v) { return { id:v.id, type:v.type, customType:v.customType||"", vehicleNumber:v.vehicleNumber, vehiclePhoto:v.vehiclePhoto||null, verificationStatus:v.verificationStatus||"Pending", verificationReason:v.verificationReason||"" }; }
app.get("/api/guide/vehicles", requireSession, (req,res)=>{ const email=normalizedEmail(req.query.guideEmail||req.authUser.email); const owner=normalizedEmail(req.authUser.email); if(req.authUser.role==="guide"&&email!==owner)return res.status(403).json({message:"You can only view your own vehicles."}); const guide=users.get(email); if(!guide||guide.role!=="guide")return res.status(404).json({message:"Local Guide not found."}); const list=guideVehicles(guide); res.json({vehicles:req.authUser.role==="user"?list.filter(v=>v.verificationStatus==="Verified").map(sanitizeVehicleForPublic):list}); });
app.post("/api/guide/vehicles", requireSession, requireApprovedGuide, (req,res)=>{ if(req.authUser.role!=="guide")return res.status(403).json({message:"Only Local Guides can add vehicles."}); const v=req.body||{}; if(!v.type||!v.vehicleNumber||!v.vehiclePhoto?.data||!v.drivingLicense?.data)return res.status(400).json({message:"Vehicle type, number, recent photo and driving license are required."}); if(v.type==="Other"&&!String(v.customType||"").trim())return res.status(400).json({message:"Please enter the vehicle type for Other."}); if(Number(v.vehiclePhoto.size||0)>8*1024*1024||Number(v.drivingLicense.size||0)>8*1024*1024)return res.status(400).json({message:"Vehicle photo and driving license must each be 8 MB or smaller."}); const guide=users.get(normalizedEmail(req.authUser.email)); const vehicleNumber=String(v.vehicleNumber).trim().toUpperCase(); if(guideVehicles(guide).some(x=>String(x.vehicleNumber||"").trim().toUpperCase()===vehicleNumber))return res.status(409).json({message:"A vehicle with this vehicle number is already registered for your account."}); const saved={id:crypto.randomUUID(),type:String(v.type),customType:String(v.customType||""),vehicleNumber,vehiclePhoto:v.vehiclePhoto,drivingLicense:v.drivingLicense,verificationStatus:"Pending",verificationReason:"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; guide.vehicles=guideVehicles(guide); guide.vehicles.unshift(saved); guide.vehiclesAvailable="Yes"; saveUsers(); saveAdminAction({type:"vehicle_registration",title:"New vehicle verification request",description:`${guide.name} submitted ${saved.customType||saved.type} vehicle ${saved.vehicleNumber} for verification.`,targetEmail:guide.email}); res.status(201).json({vehicle:saved}); });
app.delete("/api/guide/vehicles/:id", requireSession, requireApprovedGuide, (req,res)=>{ if(req.authUser.role!=="guide")return res.status(403).json({message:"Only Local Guides can delete vehicles."}); const guide=users.get(normalizedEmail(req.authUser.email)); const list=guideVehicles(guide); if(!list.some(v=>String(v.id)===String(req.params.id)))return res.status(404).json({message:"Vehicle not found."}); guide.vehicles=list.filter(v=>String(v.id)!==String(req.params.id)); if(!guide.vehicles.length)guide.vehiclesAvailable="No"; saveUsers(); const packages=loadJsonArray(packagesFile); let changed=false; for(const pkg of packages){if(normalizedEmail(pkg.guideEmail)!==normalizedEmail(guide.email))continue; const before=Array.isArray(pkg.vehicles)?pkg.vehicles.length:0; pkg.vehicles=(pkg.vehicles||[]).filter(v=>String(v.vehicleId)!==String(req.params.id)); if(pkg.vehicles.length!==before){pkg.travelEnabled=pkg.vehicles.length>0; pkg.travelSystems=pkg.vehicles.map(v=>v.type); changed=true; pkg.updatedAt=new Date().toISOString();}} if(changed)saveJsonArray(packagesFile,packages); res.json({message:"Vehicle deleted and removed from future package transport options."}); });

// Package and booking data is persisted on the server so traveller bookings
// are visible to the Local Guide even when the two accounts use different browsers.
app.get("/api/guide/packages", requireSession, (req, res) => {
  const guideEmail = normalizedEmail(req.query.guideEmail);
  const all = loadJsonArray(packagesFile);
  if (req.authUser.role === "guide") {
    const owner = normalizedEmail(req.authUser.email);
    if (guideEmail && guideEmail !== owner) return res.status(403).json({ message: "You can only view your own guide packages." });
  }
  const visible = all.filter(p => {
    const guide = users.get(String(p.guideEmail || "").trim().toLowerCase());
    const sameGuide = guideEmail && normalizedEmail(p.guideEmail) === guideEmail;
    if (sameGuide && req.authUser.role === "guide" && normalizedEmail(req.authUser.email) === guideEmail) return true;
    return Boolean(guide && isGuideVerified(guide));
  }).filter(p => !guideEmail || normalizedEmail(p.guideEmail) === guideEmail);
  // Travellers only receive packages from verified Local Guides. A guide can still view
  // their own existing packages while waiting for verification, but cannot publish new ones.
  res.json(visible.map(p => {
    const guide = users.get(String(p.guideEmail || "").trim().toLowerCase());
    return { ...p, cities: p.cities?.length ? p.cities : packageCities(p), guideName: guide?.name || p.guideName || "Local Guide", guidePhone: guide?.phone || p.guidePhone || "", guideVerificationStatus: guide?.verificationStatus || "Pending" };
  }));
});

app.post("/api/guide/packages", requireSession, requireApprovedGuide, (req, res) => {
  const pkg = req.body || {};
  if (req.authUser.role !== "guide" || String(pkg.guideEmail || "").trim().toLowerCase() !== String(req.authUser.email || "").toLowerCase()) return res.status(403).json({ message: "Only the logged-in Local Guide can create packages for their account." });
  if (!pkg.guideEmail || !pkg.name || !pkg.startDate || !pkg.endDate || !pkg.price || !pkg.maxTravellers || !pkg.description || !Array.isArray(pkg.places) || !pkg.places.length) return res.status(400).json({ message: "Please complete all package details, maximum travellers and select at least one place." });
  if (Number(pkg.price)<=0 || Number(pkg.maxTravellers)<=0) return res.status(400).json({ message: "Package total cost and maximum travellers must be greater than zero." });
  const verifiedVehicles=(guideVehicles(users.get(normalizedEmail(req.authUser.email)))||[]).filter(v=>v.verificationStatus==="Verified"); const selectedVehicles=Array.isArray(pkg.vehicles)?pkg.vehicles:[];
  if (selectedVehicles.some(v=>!verifiedVehicles.some(av=>String(av.id)===String(v.vehicleId)) || !v.totalCost || Number(v.totalCost)<=0)) return res.status(400).json({ message: "Only Admin-verified vehicles with a valid total cost can be included." });
  const all = loadJsonArray(packagesFile);
  const guide = users.get(String(req.authUser.email || "").trim().toLowerCase());
  const record = { ...pkg, price:Number(pkg.price), maxTravellers:Number(pkg.maxTravellers), vehicles:selectedVehicles.map(v=>({...v,totalCost:Number(v.totalCost)})), guideEmail: req.authUser.email, guideName: guide?.name || pkg.guideName || "Local Guide", guidePhone: guide?.phone || pkg.guidePhone || "", cities: packageCities(pkg), id: pkg.id || crypto.randomUUID(), createdAt: pkg.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  all.unshift(record);
  saveJsonArray(packagesFile, all);
  res.status(201).json({ package: record });
});

app.put("/api/guide/packages/:id", requireSession, requireApprovedGuide, (req, res) => {
  const all = loadJsonArray(packagesFile);
  const index = all.findIndex(p => p.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: "Package not found." });
  if (normalizedEmail(all[index].guideEmail) !== normalizedEmail(req.authUser.email)) return res.status(403).json({ message: "You can only update your own packages." });
  const pkg = req.body || {};
  if (!pkg.name || !pkg.startDate || !pkg.endDate || !pkg.price || !pkg.maxTravellers || !pkg.description || !Array.isArray(pkg.places) || !pkg.places.length) return res.status(400).json({ message: "Please complete all package details, maximum travellers and select at least one place." });
  const verifiedVehicles=(guideVehicles(users.get(normalizedEmail(req.authUser.email)))||[]).filter(v=>v.verificationStatus==="Verified"); const selectedVehicles=Array.isArray(pkg.vehicles)?pkg.vehicles:[]; if(selectedVehicles.some(v=>!verifiedVehicles.some(av=>String(av.id)===String(v.vehicleId))||!v.totalCost||Number(v.totalCost)<=0))return res.status(400).json({message:"Only Admin-verified vehicles with a valid total cost can be included."});
  const guide = users.get(normalizedEmail(req.authUser.email));
  const record = { ...all[index], ...pkg, price:Number(pkg.price), maxTravellers:Number(pkg.maxTravellers), vehicles:selectedVehicles.map(v=>({...v,totalCost:Number(v.totalCost)})), guideEmail: req.authUser.email, guideName: guide?.name || all[index].guideName || "Local Guide", guidePhone: guide?.phone || "", cities: packageCities(pkg), updatedAt: new Date().toISOString() };
  all[index] = record;
  saveJsonArray(packagesFile, all);
  res.json({ package: record });
});

app.delete("/api/guide/packages/:id", requireSession, requireApprovedGuide, (req, res) => {
  const all = loadJsonArray(packagesFile);
  const target = all.find(p => p.id === req.params.id);
  if (!target) return res.status(404).json({ message: "Package not found." });
  if (String(target.guideEmail || "").toLowerCase() !== String(req.authUser.email || "").toLowerCase()) return res.status(403).json({ message: "You can only delete your own packages." });
  saveJsonArray(packagesFile, all.filter(p => p.id !== req.params.id));
  res.json({ message: "Package deleted." });
});

app.get("/api/bookings", requireSession, (req, res) => {
  synchronizeGuideRequestStatuses();
  const guideEmail = normalizedEmail(req.query.guideEmail);
  const travellerEmail = normalizedEmail(req.query.travellerEmail);
  let all = loadJsonArray(bookingsFile);
  const owner = normalizedEmail(req.authUser.email);
  if (req.authUser.role === "guide") {
    if (guideEmail && guideEmail !== owner) return res.status(403).json({ message: "You can only view bookings for your own guide account." });
    if (travellerEmail) return res.status(403).json({ message: "Guide accounts cannot query another traveller's bookings." });
    all = all.filter(b => normalizedEmail(b.guideEmail) === owner);
  } else if (req.authUser.role === "user") {
    if (travellerEmail && travellerEmail !== owner) return res.status(403).json({ message: "You can only view your own bookings." });
    if (guideEmail) all = all.filter(b => normalizedEmail(b.guideEmail) === guideEmail);
    all = all.filter(b => normalizedEmail(b.travellerEmail) === owner);
  } else {
    return res.status(403).json({ message: "This account cannot access bookings." });
  }
  const enriched = all.map(b => {
    const traveller = users.get(normalizedEmail(b.travellerEmail));
    const guide = users.get(normalizedEmail(b.guideEmail));
    return {
      ...b,
      travellerName: traveller?.name || b.travellerName || "Traveller",
      travellerPhone: traveller?.phone || b.travellerPhone || "",
      travellerEmail: traveller?.email || b.travellerEmail || "",
      guideName: guide?.name || b.guideName || "Local Guide",
      guidePhone: guide?.phone || b.guidePhone || "",
      guideEmail: guide?.email || b.guideEmail || ""
    };
  });
  res.json(enriched);
});

app.post("/api/bookings", requireSession, (req, res) => {
  if (req.authUser.role !== "user") return res.status(403).json({ message: "Only travellers can create package bookings." });
  const booking = req.body || {};
  if (!booking.packageId) return res.status(400).json({ message: "Package information is incomplete." });
  const packages = loadJsonArray(packagesFile);
  const pkg = packages.find(p => String(p.id) === String(booking.packageId));
  if (!pkg) return res.status(404).json({ message: "The selected package is no longer available." });
  const guide = users.get(normalizedEmail(pkg.guideEmail));
  if (!guide || guide.role !== "guide" || !isGuideVerified(guide)) {
    return res.status(409).json({ message: "This package is not currently available because the Local Guide is not verified." });
  }
  if (normalizedEmail(booking.guideEmail) && normalizedEmail(booking.guideEmail) !== normalizedEmail(pkg.guideEmail)) {
    return res.status(400).json({ message: "The selected package and Local Guide do not match." });
  }
  const bookingDate=String(booking.bookingDate||booking.startDate||""); if(!bookingDate||bookingDate<pkg.startDate||bookingDate>pkg.endDate)return res.status(400).json({message:"Please select a valid booking date within the package dates."});
  const packageVehicles=Array.isArray(pkg.vehicles)?pkg.vehicles:[]; let selectedVehicle=null; if(booking.vehicleId){selectedVehicle=packageVehicles.find(v=>String(v.vehicleId)===String(booking.vehicleId)); if(!selectedVehicle)return res.status(400).json({message:"The selected vehicle is not available for this package."});}
  const all = loadJsonArray(bookingsFile);
  const activeForPackage = all.filter(b => String(b.packageId) === String(pkg.id) && !["Cancelled","Rejected"].includes(b.status));
  if (activeForPackage.some(b => normalizedEmail(b.travellerEmail) === normalizedEmail(req.authUser.email))) {
    return res.status(409).json({ message: "You have already booked this package." });
  }
  const maxTravellers = Number(pkg.maxTravellers) || 0;
  if (maxTravellers > 0 && activeForPackage.length >= maxTravellers) {
    return res.status(409).json({ message: "This package is fully booked." });
  }
  const record = {
    ...booking,
    packageId: pkg.id, packageName: pkg.name, guideEmail: guide.email, guideName: guide.name,
    guidePhone: guide.phone || "", travellerName: req.authUser.name, travellerPhone: req.authUser.phone || "",
    travellerEmail: req.authUser.email, startDate: bookingDate, endDate: bookingDate, bookingDate, days: 1,
    maxTravellers: maxTravellers || null, price: Number(pkg.price), packageTotalCost:Number(pkg.price), selectedVehicle:selectedVehicle||null, vehicleId:selectedVehicle?.vehicleId||null, vehicleTotalCost:selectedVehicle?Number(selectedVehicle.totalCost):0, id: crypto.randomUUID(), status: "Pending", bookedAt: new Date().toISOString()
  };
  all.unshift(record);
  saveJsonArray(bookingsFile, all);
  const notifications = loadJsonArray(notificationsFile);
  const now = new Date().toISOString();
  notifications.unshift({ id: crypto.randomUUID(), recipientEmail: guide.email, type: "package_booking", bookingId: record.id, message: `${req.authUser.name} booked your package "${record.packageName}".`, read: false, createdAt: now });
  saveJsonArray(notificationsFile, notifications);
  res.status(201).json({ booking: record });
});

app.patch("/api/bookings/:id/status", requireSession, (req,res)=>{
  if(req.authUser.role!=="guide")return res.status(403).json({message:"Only Local Guides can respond to package bookings."});
  const all=loadJsonArray(bookingsFile); const index=all.findIndex(b=>String(b.id)===String(req.params.id)); if(index<0)return res.status(404).json({message:"Booking not found."}); const booking=all[index];
  if(normalizedEmail(booking.guideEmail)!==normalizedEmail(req.authUser.email))return res.status(403).json({message:"You can only respond to your own bookings."});
  if(booking.bookingType==="guide_request")return res.status(400).json({message:"Customized guide requests must be handled through the Guide Request workflow."});
  if(booking.status!=="Pending")return res.status(409).json({message:`This booking is already ${booking.status||"processed"}.`});
  const status=req.body?.status==="Confirmed"?"Confirmed":req.body?.status==="Rejected"?"Rejected":""; if(!status)return res.status(400).json({message:"Status must be Confirmed or Rejected."});
  booking.status=status; booking.rejectionReason=status==="Rejected"?String(req.body?.rejectionReason||"").trim():""; booking.statusReason=status==="Confirmed"?"Confirmed by the Local Guide.":(booking.rejectionReason||"Rejected by the Local Guide."); booking.updatedAt=new Date().toISOString(); all[index]=booking; saveJsonArray(bookingsFile,all);
  const ns=loadJsonArray(notificationsFile); ns.unshift({id:crypto.randomUUID(),recipientEmail:booking.travellerEmail,type:`booking_${status.toLowerCase()}`,bookingId:booking.id,message:status==="Confirmed"?`Your booking for "${booking.packageName}" has been confirmed by ${booking.guideName||"your Local Guide"}.`:`Your booking for "${booking.packageName}" was rejected by ${booking.guideName||"your Local Guide"}.${booking.rejectionReason?` Reason: ${booking.rejectionReason}`:""}`,read:false,createdAt:new Date().toISOString()}); saveJsonArray(notificationsFile,ns); res.json({booking});
});

app.patch("/api/bookings/:id/confirm", requireSession, (req, res) => {
  if (req.authUser.role !== "guide") return res.status(403).json({ message: "Only Local Guides can confirm package bookings." });
  const all = loadJsonArray(bookingsFile);
  const index = all.findIndex(b => String(b.id) === String(req.params.id));
  if (index < 0) return res.status(404).json({ message: "Booking not found." });
  const booking = all[index];
  if (normalizedEmail(booking.guideEmail) !== normalizedEmail(req.authUser.email)) return res.status(403).json({ message: "You can only confirm bookings for your own packages." });
  if (booking.status !== "Pending") return res.status(409).json({ message: `This booking is already ${booking.status || "processed"}.` });
  booking.status = "Confirmed";
  booking.statusReason = "Confirmed by the Local Guide.";
  booking.confirmedAt = new Date().toISOString();
  saveJsonArray(bookingsFile, all);
  const notifications = loadJsonArray(notificationsFile);
  const now = new Date().toISOString();
  notifications.unshift({ id: crypto.randomUUID(), recipientEmail: booking.travellerEmail, type: "booking_confirmed", bookingId: booking.id, message: `Your booking for "${booking.packageName}" has been confirmed by ${booking.guideName || "your Local Guide"}.`, read: false, createdAt: now });
  saveJsonArray(notificationsFile, notifications);
  res.json({ booking });
});

app.post("/api/forgot-password", async (req, res) => {
  const normalizedEmail = String(req.body.email || "").trim().toLowerCase();
  const user = users.get(normalizedEmail);

  // This app is being used as a local project, so give a clear result.
  // Do not claim that an email was sent when there is no registered account.
  if (!user) {
    return res.status(404).json({ message: "No account found with this email. Please sign up first." });
  }

  if (!emailConfigured()) {
    return res.status(503).json({
      message: "Email service is not configured. Add SMTP settings to server/.env first."
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  resetTokens.set(token, {
    email: normalizedEmail,
    expiresAt: Date.now() + 15 * 60 * 1000
  });

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: normalizedEmail,
      subject: "Smart Travel Guide — Reset Your Password",
      text: `Hello ${user.name},\n\nUse this link to reset your Smart Travel Guide password:\n${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#10264a">
          <h2 style="color:#1465f5">Smart Travel Guide</h2>
          <p>Hello ${user.name},</p>
          <p>We received a request to reset your password.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#1465f5;color:#fff;padding:12px 22px;border-radius:7px;text-decoration:none">Reset Password</a></p>
          <p>This link expires in <strong>15 minutes</strong>.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>`
    });

    res.json({ message: "Reset link sent successfully." });
  } catch (err) {
    console.error("Email send failed:", err);
    resetTokens.delete(token);
    res.status(500).json({ message: "Could not send the reset email. Check your SMTP settings." });
  }
});

app.post("/api/reset-password", (req, res) => {
  const { token, password } = req.body;
  const record = resetTokens.get(token);

  if (!record || record.expiresAt < Date.now()) {
    resetTokens.delete(token);
    return res.status(400).json({ message: "This reset link is invalid or has expired." });
  }

  if (!password || password.length < 8) {
    return res.status(400).json({ message: "Password must contain at least 8 characters." });
  }

  const user = users.get(record.email);
  if (!user) return res.status(400).json({ message: "Account no longer exists." });

  user.passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  saveUsers();
  resetTokens.delete(token);
  res.json({ message: "Password updated successfully." });
});


// ---------------------------------------------------------------------------
// Separate Admin Portal
// ---------------------------------------------------------------------------
// Admin authentication is intentionally independent from Traveller/Local Guide
// sessions. Configure ADMIN_ID, ADMIN_PASSWORD and (optionally) SMTP recovery
// values in server/.env for deployment. Local development has a non-production
// fallback credential so the panel can be evaluated without extra setup.
const ADMIN_ID = String(process.env.ADMIN_ID || "admin@smarttravelguide.local").trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "Admin@12345");

function requireAdmin(req, res, next) {
  if (!req.session?.adminAuthenticated || !req.session.adminId) return res.status(401).json({ message: "Admin authentication required." });
  next();
}
function adminSafeUser(user) {
  if (!user) return null;
  const { passwordHash: _, ...safe } = user;
  if (safe.identityProof?.fileName) { try { const filePath=path.join(identityProofDir,safe.identityProof.fileName); if(fs.existsSync(filePath)){ safe.identityProof={...safe.identityProof,data:`data:${safe.identityProof.mimeType||"application/octet-stream"};base64,${fs.readFileSync(filePath).toString("base64")}`}; } } catch {} }
  return { ...safe, verificationStatus: safe.role === "guide" ? (safe.verificationStatus || "Verified") : safe.verificationStatus };
}
function saveAdminAction(action) {
  const all = loadJsonArray(adminActionsFile);
  all.unshift({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...action });
  saveJsonArray(adminActionsFile, all.slice(0, 300));
}
function readPlaceStatuses() { const raw = loadJsonArray(placeVerificationFile); return new Map(raw.map(x => [String(x.placeId), x])); }
function savePlaceStatuses(map) { saveJsonArray(placeVerificationFile, [...map.values()]); }
async function getAdminPlaces() {
  const out=[];
  let page=1, hasMore=true;
  while(hasMore && page<=30){ const r=await listPlaces({page,pageSize:48}); out.push(...(r.places||[])); hasMore=!!r.hasMore; page++; if(!r.places?.length) break; }
  return out;
}

app.post("/api/admin/login", (req, res) => {
  const id = String(req.body?.id || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!id || !password) return res.status(400).json({ message: "Admin ID and password are required." });
  const suppliedHash = crypto.createHash("sha256").update(password).digest("hex");
  const expectedHash = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest("hex");
  if (id !== ADMIN_ID || suppliedHash !== expectedHash) return res.status(401).json({ message: "Invalid admin credentials." });
  req.session.adminAuthenticated = true;
  req.session.adminId = ADMIN_ID;
  res.json({ authenticated: true, admin: { id: ADMIN_ID, name: "STG Administrator", role: "admin" } });
});
app.get("/api/admin/session", requireAdmin, (_req, res) => res.json({ authenticated: true, admin: { id: ADMIN_ID, name: "STG Administrator", role: "admin" } }));
app.post("/api/admin/logout", (req, res) => { delete req.session.adminAuthenticated; delete req.session.adminId; res.json({ message: "Admin logged out." }); });
app.post("/api/admin/forgot-password", async (req, res) => {
  const id = String(req.body?.id || "").trim().toLowerCase();
  if (!id || id !== ADMIN_ID) return res.json({ message: "If the administrator account exists, recovery instructions have been requested." });
  if (!emailConfigured()) return res.status(503).json({ message: "Admin password recovery requires SMTP email to be configured on the server." });
  const token = crypto.randomBytes(32).toString("hex");
  adminResetTokens.set(token, { id, expiresAt: Date.now()+15*60*1000 });
  await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: id, subject: "STG Admin password reset", text: `Use this one-time reset token within 15 minutes: ${token}` });
  res.json({ message: "If the administrator account exists, recovery instructions have been sent." });
});

app.get("/api/admin/overview", requireAdmin, async (_req, res) => {
  const allUsers=[...users.values()];
  const guides=allUsers.filter(u=>u.role==="guide"), travellers=allUsers.filter(u=>u.role!=="guide");
  const guidePending=guides.filter(g=>(g.verificationStatus||"Verified")==="Pending").length;
  const placeSubmissions=loadJsonArray(placeSubmissionsFile);
  const statuses=readPlaceStatuses();
  const pendingPlaces=placeSubmissions.filter(x=>(x.verificationStatus||x.status||"Pending")==="Pending").length + [...statuses.values()].filter(x=>x.status==="Pending").length;
  const reviews=loadJsonArray(adminReviewsFile), reportedReviews=reviews.filter(r=>String(r.reportStatus||"").toLowerCase()==="reported"||String(r.status||"").toLowerCase()==="reported").length;
  const packages=loadJsonArray(packagesFile), bookings=loadJsonArray(bookingsFile), actions=loadJsonArray(adminActionsFile);
  const registrations=allUsers.filter(u=>u.createdAt).map(u=>({id:`reg-${u.email}`,createdAt:u.createdAt,title:u.role==="guide"?"New Local Guide registered":"New Traveller registered",description:`${u.name||u.email} created a ${u.role==="guide"?"Local Guide":"Traveller"} account.`,icon:u.role==="guide"?"bi-person-badge":"bi-person-plus"}));
  const submissions=placeSubmissions.map(x=>({id:`place-${x.id}`,createdAt:x.submittedAt,title:"New Place submitted",description:`${x.placeName} was submitted for verification.`,icon:"bi-geo-alt"}));
  const activity=[...actions,...registrations,...submissions].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,10);
  res.json({totalTravellers:travellers.length,totalGuides:guides.length,totalPlaces:(await getAdminPlaces()).length,totalPackages:packages.length,pendingGuideVerifications:guidePending,pendingPlaceVerifications:pendingPlaces,reportedReviews, totalBookings:bookings.length, recentActivity:activity});
});

app.get("/api/admin/analytics", requireAdmin, async (_req,res)=>{
  const allUsers=[...users.values()], guides=allUsers.filter(u=>u.role==="guide"), submissions=loadJsonArray(placeSubmissionsFile), statuses=readPlaceStatuses();
  const places=await getAdminPlaces(), packages=loadJsonArray(packagesFile), bookings=loadJsonArray(bookingsFile), reviews=loadJsonArray(adminReviewsFile), reports=loadJsonArray(adminReportsFile);
  res.json({totalTravellers:allUsers.filter(u=>u.role!=="guide").length,totalGuides:guides.length,verifiedGuides:guides.filter(g=>(g.verificationStatus||"Verified")==="Verified").length,totalPlaceSubmissions:submissions.length+places.length,approvedPlaces:places.filter(p=>(statuses.get(String(p.id))?.status||"Approved")==="Approved").length+submissions.filter(s=>s.verificationStatus==="Approved").length,totalPackages:packages.length,totalBookings:bookings.length,totalReviews:reviews.length,totalReports:reports.length});
});

app.get("/api/admin/guides", requireAdmin, (_req,res)=>{
  const packages=loadJsonArray(packagesFile), reviews=loadJsonArray(adminReviewsFile), all=[...users.values()].filter(u=>u.role==="guide").map(u=>{const ps=packages.filter(p=>normalizedEmail(p.guideEmail)===normalizedEmail(u.email));return {...adminSafeUser(u),packageCount:ps.length,packageNames:ps.map(p=>p.name).join(", ")||"None",reviewsReceived:reviews.filter(r=>normalizedEmail(r.guideEmail)===normalizedEmail(u.email)).length,identityProofSubmitted:u.identityProof?`${u.identityProof.originalName||u.identityProof.fileName} (${u.identityProof.mimeType||"document"})`:"Not submitted",registrationDate:u.createdAt||u.registeredAt||null};});
  res.json({items:all});
});
app.patch("/api/admin/guides/:email/vehicles/:vehicleId/status", requireAdmin, (req,res)=>{ const email=normalizedEmail(req.params.email),guide=users.get(email); if(!guide||guide.role!=="guide")return res.status(404).json({message:"Local Guide not found."}); const vehicle=guideVehicles(guide).find(v=>String(v.id)===String(req.params.vehicleId)); if(!vehicle)return res.status(404).json({message:"Vehicle not found."}); const status=String(req.body?.status||""); if(!["Pending","Verified","Rejected","Changes Required"].includes(status))return res.status(400).json({message:"Invalid vehicle verification status."}); vehicle.verificationStatus=status; vehicle.verificationReason=String(req.body?.reason||""); vehicle.updatedAt=new Date().toISOString(); saveUsers(); if(status!=="Verified"){const packages=loadJsonArray(packagesFile);let changed=false;for(const pkg of packages){if(normalizedEmail(pkg.guideEmail)!==email)continue;const before=Array.isArray(pkg.vehicles)?pkg.vehicles.length:0;pkg.vehicles=(pkg.vehicles||[]).filter(v=>String(v.vehicleId)!==String(vehicle.id));if(pkg.vehicles.length!==before){pkg.travelEnabled=pkg.vehicles.length>0;pkg.travelSystems=pkg.vehicles.map(v=>v.type);pkg.updatedAt=new Date().toISOString();changed=true;}}if(changed)saveJsonArray(packagesFile,packages);} const ns=loadJsonArray(notificationsFile); ns.unshift({id:crypto.randomUUID(),recipientEmail:guide.email,type:"vehicle_verification",message:`Your ${vehicle.customType||vehicle.type} vehicle ${vehicle.vehicleNumber} is now ${status}.${vehicle.verificationReason?` Reason: ${vehicle.verificationReason}`:""}`,read:false,createdAt:new Date().toISOString()}); saveJsonArray(notificationsFile,ns); res.json({vehicle}); });
app.patch("/api/admin/guides/:email/status", requireAdmin, (req,res)=>{
  const email=normalizedEmail(req.params.email), user=users.get(email); if(!user||user.role!=="guide")return res.status(404).json({message:"Local Guide not found."});
  const allowed=["Pending","Under Review","Verified","Rejected","Changes Required","Suspended"]; const status=String(req.body?.status||""); if(!allowed.includes(status))return res.status(400).json({message:"Invalid guide verification status."});
  user.verificationStatus=status; user.verificationHistory=Array.isArray(user.verificationHistory)?user.verificationHistory:[]; user.verificationHistory.unshift({status,at:new Date().toISOString(),note:String(req.body?.reason||"")}); saveUsers(); saveAdminAction({type:"guide_verification",title:`Guide ${status.toLowerCase()}`,description:`${user.name} is now ${status}.`,targetEmail:user.email});
  {const notifications=loadJsonArray(notificationsFile);const message=status==="Verified"?"Your Local Guide account has been verified by STG Admin.":status==="Rejected"?"Your Local Guide verification was rejected by STG Admin.":status==="Changes Required"?"STG Admin requested changes to your Local Guide verification details.":status==="Suspended"?"Your Local Guide account has been suspended by STG Admin.":`Your Local Guide verification status is now ${status}.`;notifications.unshift({id:crypto.randomUUID(),recipientEmail:user.email,type:"admin_verification",message,read:false,createdAt:new Date().toISOString()});saveJsonArray(notificationsFile,notifications);}
  res.json({user:adminSafeUser(user)});
});
app.get("/api/admin/guides/:email", requireAdmin, (req,res)=>{const u=users.get(normalizedEmail(req.params.email));if(!u||u.role!=="guide")return res.status(404).json({message:"Local Guide not found."});res.json({guide:adminSafeUser(u),verificationHistory:u.verificationHistory||[]});});

app.get("/api/admin/places", requireAdmin, async (_req,res)=>{
  const statuses=readPlaceStatuses(), submissions=loadJsonArray(placeSubmissionsFile), places=await getAdminPlaces();
  const catalogue=places.map(p=>({...p,verificationStatus:statuses.get(String(p.id))?.status||"Approved",submittedBy:"STG Catalogue"}));
  res.json({items:[...submissions.map(x=>({...x,verificationStatus:x.verificationStatus||x.status||"Pending"})),...catalogue]});
});
app.patch("/api/admin/places/:id/status", requireAdmin, async (req,res)=>{
  const id=String(req.params.id), status=String(req.body?.status||""); const allowed=["Pending","Under Review","Approved","Rejected","Needs Correction"]; if(!allowed.includes(status))return res.status(400).json({message:"Invalid place verification status."});
  const submissions=loadJsonArray(placeSubmissionsFile); const si=submissions.findIndex(x=>String(x.id)===id);
  if(si>=0){
    const target={...submissions[si]};
    if(status==="Approved"){try{await upsertVerifiedPlace(target);}catch(error){return res.status(503).json({message:"The place could not be published because the place database is unavailable."});}}
    target.verificationStatus=status;target.verificationHistory=Array.isArray(target.verificationHistory)?target.verificationHistory:[];target.verificationHistory.unshift({status,at:new Date().toISOString(),note:String(req.body?.reason||"")});submissions[si]=target;saveJsonArray(placeSubmissionsFile,submissions);
    if(target.userEmail){const notifications=loadJsonArray(notificationsFile);notifications.unshift({id:crypto.randomUUID(),recipientEmail:target.userEmail,type:"place_verification",message:`Your place submission "${target.placeName}" is now ${status}.${req.body?.reason?` Reason: ${req.body.reason}`:""}`,read:false,createdAt:new Date().toISOString()});saveJsonArray(notificationsFile,notifications);}
  } else {const statuses=readPlaceStatuses();statuses.set(id,{placeId:id,status,updatedAt:new Date().toISOString(),reason:String(req.body?.reason||"")});savePlaceStatuses(statuses);}
  saveAdminAction({type:"place_verification",title:`Place ${status.toLowerCase()}`,description:`Place ${id} is now ${status}.`,targetId:id}); res.json({status});
});

app.get("/api/reviews", requireSession, (req,res)=>{
  const itemId=String(req.query.itemId||"");
  const itemName=String(req.query.itemName||"").trim().toLowerCase();
  const all=loadJsonArray(adminReviewsFile);
  const filtered=all.filter(r=>{
    if(itemId && String(r.itemId||"")!==itemId) return false;
    if(itemName && String(r.itemName||"").trim().toLowerCase()!==itemName) return false;
    return String(r.status||"Published")==="Published";
  });
  res.json(filtered);
});

app.get("/api/places/:id/photos", requireSession, (req,res)=>{
  const all=loadJsonArray(placePhotosFile);
  res.json(all.filter(x=>String(x.placeId)===String(req.params.id)).map(({dataUrl,...safe})=>({...safe,dataUrl})));
});

app.post("/api/places/:id/photos", requireSession, (req,res)=>{
  const body=req.body||{};
  const dataUrl=String(body.dataUrl||"");
  const match=dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if(!match) return res.status(400).json({message:"Please upload a JPG, PNG or WEBP image."});
  const bytes=Buffer.byteLength(match[2],"base64");
  if(bytes>5*1024*1024) return res.status(400).json({message:"Each place photo must be 5 MB or smaller."});
  const all=loadJsonArray(placePhotosFile);
  const record={id:crypto.randomUUID(),placeId:String(req.params.id),placeName:String(body.placeName||"Place"),userEmail:req.authUser.email,userName:req.authUser.name||"Traveller",dataUrl,createdAt:new Date().toISOString()};
  all.unshift(record); saveJsonArray(placePhotosFile,all); res.status(201).json({photo:{...record}});
});

app.get("/api/admin/reviews", requireAdmin, (_req,res)=>res.json({items:loadJsonArray(adminReviewsFile)}));
app.patch("/api/admin/reviews/:id/status", requireAdmin, (req,res)=>{const all=loadJsonArray(adminReviewsFile),i=all.findIndex(x=>String(x.id)===String(req.params.id));if(i<0)return res.status(404).json({message:"Review not found."});all[i].status=String(req.body?.status||"Resolved");all[i].moderationNote=String(req.body?.reason||"");all[i].updatedAt=new Date().toISOString();saveJsonArray(adminReviewsFile,all);saveAdminAction({type:"review",title:"Review moderation updated",description:`Review ${req.params.id} was marked ${all[i].status}.`});res.json({review:all[i]});});
app.post("/api/reviews", requireSession, (req,res)=>{const r=req.body||{};if(!r.rating||!r.itemName)return res.status(400).json({message:"Review information is incomplete."});const all=loadJsonArray(adminReviewsFile);const record={...r,id:r.id||crypto.randomUUID(),travellerEmail:req.authUser.email,travellerName:req.authUser.name,createdAt:new Date().toISOString(),reportStatus:r.reportStatus||"Clear",status:"Published"};all.unshift(record);saveJsonArray(adminReviewsFile,all);res.status(201).json({review:record});});

app.get("/api/admin/travellers", requireAdmin, (_req,res)=>{const bookings=loadJsonArray(bookingsFile);const items=[...users.values()].filter(u=>u.role!=="guide").map(u=>({...adminSafeUser(u),bookingCount:bookings.filter(b=>normalizedEmail(b.travellerEmail)===normalizedEmail(u.email)).length,status:u.status||"Active"}));res.json({items});});
app.get("/api/admin/bookings", requireAdmin, (_req,res)=>{const packageBookings=loadJsonArray(bookingsFile);const guideRequests=loadJsonArray(guideRequestsFile);const packageItems=packageBookings.map(b=>{const g=users.get(normalizedEmail(b.guideEmail)),t=users.get(normalizedEmail(b.travellerEmail));return {...b,bookingType:"Package",guideName:g?.name||b.guideName,travellerName:t?.name||b.travellerName};});const requestItems=guideRequests.map(r=>({id:r.id,bookingType:"Guide/Travel System",travellerEmail:r.travellerEmail,travellerName:r.travellerName,guideEmail:r.guideEmail,guideName:r.guideName,packageName:r.tripName||"Customized Trip",bookedAt:r.createdAt,status:r.status,location:r.location}));res.json({items:[...packageItems,...requestItems]});});
app.get("/api/admin/reports", requireAdmin, (_req,res)=>res.json({items:loadJsonArray(adminReportsFile)}));
app.patch("/api/admin/reports/:id/status", requireAdmin, (req,res)=>{const all=loadJsonArray(adminReportsFile),i=all.findIndex(x=>String(x.id)===String(req.params.id));if(i<0)return res.status(404).json({message:"Report not found."});all[i].status=String(req.body?.status||"Resolved");all[i].actionNote=String(req.body?.reason||"");saveJsonArray(adminReportsFile,all);res.json({report:all[i]});});
app.get("/api/admin/help", requireAdmin, (_req,res)=>res.json({items:loadJsonArray(helpTicketsFile)}));
app.patch("/api/admin/help/:id/status", requireAdmin, (req,res)=>{const all=loadJsonArray(helpTicketsFile),i=all.findIndex(x=>String(x.id)===String(req.params.id));if(i<0)return res.status(404).json({message:"Ticket not found."});all[i].status=String(req.body?.status||"Resolved");all[i].actionNote=String(req.body?.reason||"");saveJsonArray(helpTicketsFile,all);res.json({ticket:all[i]});});

app.get("/api/place-submissions/mine", requireSession, (req,res)=>{
  const all=loadJsonArray(placeSubmissionsFile);
  res.json(all.filter(x=>normalizedEmail(x.userEmail)===normalizedEmail(req.authUser.email)).map(x=>({...x, status:x.verificationStatus||x.status||"Pending", reason:(x.verificationHistory||[]).find(h=>["Rejected","Needs Correction"].includes(h.status))?.note||"", history:Array.isArray(x.verificationHistory)?x.verificationHistory:[]})));
});

app.post("/api/place-submissions", requireSession, (req,res)=>{
  if(!["user","guide"].includes(req.authUser.role)) return res.status(403).json({message:"Only Travellers and Local Guides can submit places."});
  const body=req.body||{};
  if(!body.placeName||!body.city||!body.state||!body.address||!body.imageUrl||!body.description) return res.status(400).json({message:"Please complete all place details."});
  const all=loadJsonArray(placeSubmissionsFile);
  const record={...body,id:body.id||crypto.randomUUID(),userEmail:req.authUser.email,userRole:req.authUser.role,submittedBy:req.authUser.name,status:"Pending",verificationStatus:"Pending",submittedAt:new Date().toISOString(),verificationHistory:[{status:"Pending",at:new Date().toISOString(),note:"Place submitted for admin verification."}]};
  all.unshift(record);
  saveJsonArray(placeSubmissionsFile,all);
  saveAdminAction({type:"place_submission",title:"New place submitted",description:`${record.placeName} was submitted by ${record.submittedBy}.`});
  res.status(201).json({submission:record});
});

app.listen(PORT, () => {
  console.log(`Smart Travel Guide API running at http://localhost:${PORT}`);
});
