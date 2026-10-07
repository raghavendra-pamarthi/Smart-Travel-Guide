import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// placeService is imported before server.js executes its dotenv.config() in ESM.
// Load server/.env here so MongoDB credentials are available during module initialization.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", "server", ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_USERNAME = process.env.MONGODB_USERNAME;
const MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
const DB_NAME = process.env.MONGODB_DB || "smart_travel_guide";
const COLLECTION = "places";
const PLACE_STATUS_FILE = path.join(__dirname, "data", "place_verification.json");
let clientPromise = null;

function rejectedPlaceIds() {
  try {
    const raw = JSON.parse(fs.readFileSync(PLACE_STATUS_FILE, "utf8"));
    return new Set((Array.isArray(raw) ? raw : []).filter(x => x && x.status === "Rejected").map(x => String(x.placeId)));
  } catch { return new Set(); }
}

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const IMAGE_TIMEOUT_MS = 9000;

const PRIORITY_IMAGE_FILES = {
  "ap-vij-01": "Kanaka Durga Gopuram, Vijayawada.jpg",
  "ap-vij-02": "Prakasam Barrage vijayawada.jpg",
  "ap-vij-03": "Bhavani Island of Vijayawada.jpg",
  "ap-vij-04": "Gandhi hill vijayawada.jpg",
  "ap-vij-05": "Undavalli caves.jpg",
  "ap-vij-06": "Kondapalli Fort.jpg",
  "ap-vij-07": "Train in Rajiv Gandhi Park (43821156351).jpg",
  "ap-vij-08": "Moghalrajapuram Caves View from Entrace.jpg",
  "ap-viz-01": "RK beach in Visakhapatnam on a winter day.jpg",
  "ap-viz-02": "Kailasagiri Hill.jpg",
  "ap-viz-03": "Inside INS Kursura, Vishakhapatnam-01.jpg",
  "ap-viz-04": "Yarada-Beach-Visakhapatnam.jpg",
  "ap-viz-05": "View of Tenneti park Visakhapatnam.JPG",
  "ap-viz-06": "Simhachalam Temple vizag.jpg",
  "ap-viz-07": "Giraffee at Indira Gandhi Zoological Park, Visakhapatnam.jpg",
  "ap-viz-08": "Dolphin Nose.jpg",
  "ap-tir-01": "Tirumala Venkateswara temple entrance 09062015.JPG",
  "ap-tir-02": "Kapila theertham.jpg",
  "ap-tir-03": "Main gopuram at govindarajaswami temple at tirupati.JPG",
  "ap-tir-04": "Padmavathi Ammavari Temple.JPG",
  "ap-tir-05": "Silathoranam Tirupati.jpg",
  "ap-tir-06": "Akasha ganga.jpg",
  "ap-tir-07": "Chandragiri Fort.jpg",
  "ap-tir-08": "Talakona waterfalls.jpg",
  "del-01": "India gate new delhi.jpg",
  "del-02": "Red Fort Delhi India.jpg",
  "del-03": "Qutb Minar, Delhi, India.jpg",
  "del-04": "Humayun's Tomb-Delhi.jpg",
  "del-05": "Lotus Temple New Delhi India.jpg",
  "del-06": "Akshardham, Delhi.jpg",
  "del-07": "Jama Masjid Delhi .jpg",
  "del-08": "Lodhi Garden, New Delhi, India.jpg",
  "del-09": "Purana Qila.jpg",
  "del-10": "Raj Ghat Delhi India.JPG",
  "del-11": "National Museum, New Delhi.jpg",
  "del-12": "Connaught Place New Delhi.jpg"
};

const CITY_COVER_FILES = {
  "seed-21": "Kanaka Durga Gopuram, Vijayawada.jpg",
  "seed-11": "RK beach in Visakhapatnam on a winter day.jpg",
  "seed-10": "Tirumala Venkateswara Temple, Tirupati (24338261275).jpg",
  "seed-22": "India gate new delhi.jpg"
};

function priorityImageUrl(id) {
  const key = String(id);
  const filename = PRIORITY_IMAGE_FILES[key] || CITY_COVER_FILES[key] || null;
  return filename ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=1200` : null;
}

function priorityImageFilename(id) {
  const key = String(id);
  return PRIORITY_IMAGE_FILES[key] || CITY_COVER_FILES[key] || null;
}

const GENERIC_ASSET_RE = /\/assets\/(?:agra|alleppey|goa|manali|udaipur|gangtok)\.jpg(?:[?#].*)?$/i;

const LEGACY_PLACES = [
  { id: "legacy-1", name: "Agra", city: "Agra", state: "Uttar Pradesh", country: "India", rating: 4.6, reviewCount: 0, type: "Historical", lat: 27.1767, lng: 78.0081, image: "/assets/agra.jpg", description: "Agra is home to the Taj Mahal and a remarkable collection of Mughal-era monuments." },
  { id: "legacy-2", name: "Manali", city: "Manali", state: "Himachal Pradesh", country: "India", rating: 4.5, reviewCount: 0, type: "Mountains", lat: 32.2396, lng: 77.1887, image: "/assets/manali.jpg", description: "Manali is a Himalayan destination known for mountain scenery, valleys and outdoor experiences." },
  { id: "legacy-3", name: "Alleppey", city: "Alappuzha", state: "Kerala", country: "India", rating: 4.7, reviewCount: 0, type: "Nature", lat: 9.4981, lng: 76.3388, image: "/assets/alleppey.jpg", description: "Alleppey, also known as Alappuzha, is famous for Kerala's backwaters and houseboat experiences." },
  { id: "legacy-4", name: "Goa", city: "Panaji", state: "Goa", country: "India", rating: 4.4, reviewCount: 0, type: "Beaches", lat: 15.2993, lng: 74.124, image: "/assets/goa.jpg", description: "Goa combines beaches, historic architecture, coastal landscapes and a distinctive local culture." },
  { id: "legacy-5", name: "Udaipur", city: "Udaipur", state: "Rajasthan", country: "India", rating: 4.6, reviewCount: 0, type: "Historical", lat: 24.5854, lng: 73.7125, image: "/assets/udaipur.jpg", description: "Udaipur is known for its lakes, palaces, historic streets and Rajput heritage." },
  { id: "legacy-6", name: "Gangtok", city: "Gangtok", state: "Sikkim", country: "India", rating: 4.5, reviewCount: 0, type: "Mountains", lat: 27.3389, lng: 88.6065, image: "/assets/gangtok.jpg", description: "Gangtok is a Himalayan city with mountain views, monasteries and access to Sikkim's natural landscapes." },
  { id: "legacy-7", name: "Kashmir", city: "Srinagar", state: "Jammu & Kashmir", country: "India", rating: 4.8, reviewCount: 0, type: "Mountains", lat: 34.0837, lng: 74.7973, image: "/assets/manali.jpg", description: "Kashmir is known for Himalayan scenery, lakes, valleys, gardens and distinctive local culture." },
  { id: "legacy-8", name: "Andaman", city: "Port Blair", state: "Andaman & Nicobar Islands", country: "India", rating: 4.7, reviewCount: 0, type: "Beaches", lat: 11.6234, lng: 92.7265, image: "/assets/goa.jpg", description: "The Andaman Islands offer tropical beaches, marine experiences, forests and island landscapes." },
  { id: "legacy-9", name: "Coorg", city: "Madikeri", state: "Karnataka", country: "India", rating: 4.6, reviewCount: 0, type: "Nature", lat: 12.4244, lng: 75.7382, image: "/assets/alleppey.jpg", description: "Coorg is a green hill region known for coffee estates, forests, waterfalls and Kodava culture." },
  { id: "seed-10", name: "Tirupati", city: "Tirupati", state: "Andhra Pradesh", country: "India", rating: 4.8, reviewCount: 0, type: "Religious", lat: 13.6288, lng: 79.4192, image: "/assets/agra.jpg", description: "Tirupati is a major pilgrimage destination in Andhra Pradesh, known for the Tirumala temple complex.", aliases: ["Tirupathi", "Thirupathi"] },
  { id: "seed-11", name: "Visakhapatnam", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", rating: 4.6, reviewCount: 0, type: "Beaches", lat: 17.6868, lng: 83.2185, image: "/assets/goa.jpg", description: "Visakhapatnam is a coastal city known for beaches, hills, museums and maritime heritage.", aliases: ["Vishakapatnam", "Vishakhapatnam", "Vizag"] },
  { id: "seed-12", name: "Araku Valley", city: "Araku Valley", state: "Andhra Pradesh", country: "India", rating: 4.7, reviewCount: 0, type: "Nature", lat: 18.3273, lng: 82.8732, image: "/assets/alleppey.jpg", description: "Araku Valley is a scenic hill region known for coffee plantations, forests and tribal culture." },
  { id: "seed-13", name: "Hyderabad", city: "Hyderabad", state: "Telangana", country: "India", rating: 4.6, reviewCount: 0, type: "Historical", lat: 17.3850, lng: 78.4867, image: "/assets/agra.jpg", description: "Hyderabad blends historic monuments, food culture, markets and modern city life." },
  { id: "seed-14", name: "Mysuru", city: "Mysuru", state: "Karnataka", country: "India", rating: 4.7, reviewCount: 0, type: "Historical", lat: 12.2958, lng: 76.6394, image: "/assets/udaipur.jpg", description: "Mysuru is known for its palace, heritage architecture, gardens and cultural traditions." },
  { id: "seed-15", name: "Ooty", city: "Ooty", state: "Tamil Nadu", country: "India", rating: 4.6, reviewCount: 0, type: "Nature", lat: 11.4102, lng: 76.6950, image: "/assets/alleppey.jpg", description: "Ooty is a hill station known for tea gardens, cool weather, lakes and mountain scenery." },
  { id: "seed-16", name: "Jaipur", city: "Jaipur", state: "Rajasthan", country: "India", rating: 4.7, reviewCount: 0, type: "Historical", lat: 26.9124, lng: 75.7873, image: "/assets/udaipur.jpg", description: "Jaipur is the Pink City, known for forts, palaces, markets and Rajasthan's architectural heritage." },
  { id: "seed-17", name: "Varanasi", city: "Varanasi", state: "Uttar Pradesh", country: "India", rating: 4.8, reviewCount: 0, type: "Religious", lat: 25.3176, lng: 82.9739, image: "/assets/agra.jpg", description: "Varanasi is an ancient city on the Ganges, known for its ghats, temples and cultural traditions." },
  { id: "seed-18", name: "Rishikesh", city: "Rishikesh", state: "Uttarakhand", country: "India", rating: 4.7, reviewCount: 0, type: "Nature", lat: 30.0869, lng: 78.2676, image: "/assets/manali.jpg", description: "Rishikesh is a Himalayan gateway known for river landscapes, yoga, temples and adventure activities." },
  { id: "seed-19", name: "Darjeeling", city: "Darjeeling", state: "West Bengal", country: "India", rating: 4.7, reviewCount: 0, type: "Mountains", lat: 27.0410, lng: 88.2663, image: "/assets/gangtok.jpg", description: "Darjeeling is a Himalayan hill town known for tea estates, mountain views and heritage railways." },
  { id: "seed-20", name: "Mumbai", city: "Mumbai", state: "Maharashtra", country: "India", rating: 4.5, reviewCount: 0, type: "City", lat: 19.0760, lng: 72.8777, image: "/assets/goa.jpg", description: "Mumbai is a major coastal metropolis known for landmarks, arts, food and cultural life." },
  { id: "seed-21", name: "Vijayawada", city: "Vijayawada", state: "Andhra Pradesh", country: "India", rating: 4.6, reviewCount: 0, type: "City", lat: 16.5062, lng: 80.6480, image: "/assets/goa.jpg", description: "Vijayawada is a major city on the Krishna River with temples, caves, riverfront attractions and nearby heritage sites.", aliases: ["Bezawada"] },
  { id: "seed-22", name: "Delhi", city: "Delhi", state: "Delhi", country: "India", rating: 4.6, reviewCount: 0, type: "City", lat: 28.6139, lng: 77.2090, image: "/assets/agra.jpg", description: "Delhi is India's capital region, with major historic monuments, museums, gardens, markets and cultural landmarks.", aliases: ["New Delhi"] }
];

const PRIORITY_PLACES = [
  // Vijayawada
  { id: "ap-vij-01", wikiTitle: "Kanaka Durga Temple", name: "Kanaka Durga Temple", city: "Vijayawada", state: "Andhra Pradesh", country: "India", type: "Religious", lat: 16.5190278, lng: 80.6214944, description: "Kanaka Durga Temple is a prominent temple on Indrakeeladri overlooking Vijayawada and the Krishna River.", aliases: ["Durga Temple", "Vijayawada Durga Temple", "Indrakeeladri"] },
  { id: "ap-vij-02", wikiTitle: "Prakasam Barrage", name: "Prakasam Barrage", city: "Vijayawada", state: "Andhra Pradesh", country: "India", type: "Nature", lat: 16.50642, lng: 80.60529, description: "Prakasam Barrage spans the Krishna River and is one of Vijayawada's best-known riverfront landmarks." },
  { id: "ap-vij-03", wikiTitle: "Bhavani Island", name: "Bhavani Island", city: "Vijayawada", state: "Andhra Pradesh", country: "India", type: "Nature", lat: 16.52630, lng: 80.56980, description: "Bhavani Island is a riverside recreation destination on the Krishna River near Vijayawada." },
  { id: "ap-vij-04", wikiTitle: "Gandhi Hill, Vijayawada", name: "Gandhi Hill", city: "Vijayawada", state: "Andhra Pradesh", country: "India", type: "Historical", lat: 16.5203, lng: 80.6170, description: "Gandhi Hill is a Vijayawada landmark with a memorial and elevated views over the city." },
  { id: "ap-vij-05", wikiTitle: "Undavalli Caves", name: "Undavalli Caves", city: "Vijayawada", state: "Andhra Pradesh", country: "India", type: "Historical", lat: 16.49667, lng: 80.58170, description: "Undavalli Caves are historic rock-cut caves near Vijayawada known for their carved halls and sculptures." },
  { id: "ap-vij-06", wikiTitle: "Kondapalli Fort", name: "Kondapalli Fort", city: "Vijayawada", state: "Andhra Pradesh", country: "India", type: "Historical", lat: 16.62506, lng: 80.53039, description: "Kondapalli Fort is a hilltop fort near Vijayawada with historic structures and views of the surrounding region." },
  { id: "ap-vij-07", wikiTitle: "Rajiv Gandhi Park, Vijayawada", name: "Rajiv Gandhi Park", city: "Vijayawada", state: "Andhra Pradesh", country: "India", type: "Nature", lat: 16.50935, lng: 80.61239, description: "Rajiv Gandhi Park is a public recreation space near the Krishna River in Vijayawada." },
  { id: "ap-vij-08", wikiTitle: "Mogalarajapuram Caves", name: "Mogalarajapuram Caves", city: "Vijayawada", state: "Andhra Pradesh", country: "India", type: "Historical", lat: 16.5061635, lng: 80.6470729, description: "Mogalarajapuram Caves are rock-cut historic caves and an archaeological attraction in Vijayawada." },

  // Visakhapatnam
  { id: "ap-viz-01", wikiTitle: "Ramakrishna Beach", name: "RK Beach", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", type: "Beaches", lat: 17.714230, lng: 83.323628, description: "RK Beach is a popular seafront destination in Visakhapatnam with a long coastal promenade." },
  { id: "ap-viz-02", wikiTitle: "Kailasagiri", name: "Kailasagiri", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", type: "Nature", lat: 17.74926, lng: 83.34177, description: "Kailasagiri is a hilltop park in Visakhapatnam with panoramic views of the coast and city." },
  { id: "ap-viz-03", wikiTitle: "INS Kurusura Submarine Museum", name: "INS Kurusura Submarine Museum", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", type: "Historical", lat: 17.716778, lng: 83.329492, description: "The INS Kurusura Submarine Museum is a maritime museum on the Visakhapatnam beachfront." },
  { id: "ap-viz-04", wikiTitle: "Yarada Beach", name: "Yarada Beach", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", type: "Beaches", lat: 17.6644, lng: 83.2844, description: "Yarada Beach is a scenic coastal beach south of central Visakhapatnam, surrounded by hills." },
  { id: "ap-viz-05", wikiTitle: "Tenneti Park", name: "Tenneti Park", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", type: "Nature", lat: 17.74763, lng: 83.34982, description: "Tenneti Park is a sea-facing urban park along the Visakhapatnam coast." },
  { id: "ap-viz-06", wikiTitle: "Simhachalam Temple", name: "Simhachalam Temple", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", type: "Religious", lat: 17.76633, lng: 83.25052, description: "Simhachalam Temple is a historic hill temple near Visakhapatnam dedicated to Varaha Narasimha." },
  { id: "ap-viz-07", wikiTitle: "Indira Gandhi Zoological Park", name: "Indira Gandhi Zoological Park", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", type: "Nature", lat: 17.76613, lng: 83.34962, description: "Indira Gandhi Zoological Park is a large zoological park in Visakhapatnam surrounded by Eastern Ghats terrain." },
  { id: "ap-viz-08", wikiTitle: "Dolphin's Nose, Visakhapatnam", name: "Dolphin's Nose", city: "Visakhapatnam", state: "Andhra Pradesh", country: "India", type: "Nature", lat: 17.675, lng: 83.295, description: "Dolphin's Nose is a rocky headland overlooking Visakhapatnam's harbour and coastline." },

  // Tirupati
  { id: "ap-tir-01", wikiTitle: "Venkateswara Temple, Tirumala", name: "Sri Venkateswara Temple, Tirumala", city: "Tirupati", state: "Andhra Pradesh", country: "India", type: "Religious", lat: 13.683250, lng: 79.347194, description: "Sri Venkateswara Temple at Tirumala is the principal pilgrimage landmark associated with Tirupati.", aliases: ["Tirumala Temple", "Venkateswara Temple", "Tirupati Temple"] },
  { id: "ap-tir-02", wikiTitle: "Kapila Theertham", name: "Kapila Theertham", city: "Tirupati", state: "Andhra Pradesh", country: "India", type: "Religious", lat: 13.6416, lng: 79.4054, description: "Kapila Theertham is a temple and waterfall site at the foot of Tirumala hills." },
  { id: "ap-tir-03", wikiTitle: "Govindaraja Swamy Temple", name: "Sri Govindaraja Swamy Temple", city: "Tirupati", state: "Andhra Pradesh", country: "India", type: "Religious", lat: 13.6287, lng: 79.4191, description: "Sri Govindaraja Swamy Temple is an important historic temple in Tirupati city." },
  { id: "ap-tir-04", wikiTitle: "Padmavathi Temple, Tiruchanur", name: "Sri Padmavathi Ammavari Temple", city: "Tirupati", state: "Andhra Pradesh", country: "India", type: "Religious", lat: 13.5982, lng: 79.4122, description: "Sri Padmavathi Ammavari Temple at Tiruchanur is an important pilgrimage site near Tirupati." },
  { id: "ap-tir-05", wikiTitle: "Silathoranam", name: "Silathoranam", city: "Tirupati", state: "Andhra Pradesh", country: "India", type: "Nature", lat: 13.678175, lng: 79.351519, description: "Silathoranam is a natural rock arch in the Tirumala hills and a distinctive geological attraction." },
  { id: "ap-tir-06", wikiTitle: "Akasaganga Teertham", name: "Akasaganga Teertham", city: "Tirupati", state: "Andhra Pradesh", country: "India", type: "Nature", lat: 13.70279, lng: 79.34022, description: "Akasaganga Teertham is a scenic water feature and pilgrimage stop in the Tirumala hills." },
  { id: "ap-tir-07", wikiTitle: "Chandragiri Fort", name: "Chandragiri Fort", city: "Tirupati", state: "Andhra Pradesh", country: "India", type: "Historical", lat: 13.58303, lng: 79.30529, description: "Chandragiri Fort is a historic hill fort complex in the Tirupati region." },
  { id: "ap-tir-08", wikiTitle: "Talakona", name: "Talakona Waterfall", city: "Tirupati", state: "Andhra Pradesh", country: "India", type: "Nature", lat: 13.6606, lng: 79.1638, description: "Talakona Waterfall is a major natural attraction in the Tirupati region, surrounded by forested hills." },

  // Delhi
  { id: "del-01", wikiTitle: "India Gate, Delhi", name: "India Gate", city: "Delhi", state: "Delhi", country: "India", type: "Historical", lat: 28.6129, lng: 77.2295, description: "India Gate is a major New Delhi landmark and war memorial on Kartavya Path." },
  { id: "del-02", wikiTitle: "Red Fort", name: "Red Fort", city: "Delhi", state: "Delhi", country: "India", type: "Historical", lat: 28.6562, lng: 77.2410, description: "The Red Fort is a historic Mughal-era fortification in Old Delhi." },
  { id: "del-03", wikiTitle: "Qutb Minar", name: "Qutub Minar", city: "Delhi", state: "Delhi", country: "India", type: "Historical", lat: 28.5244, lng: 77.1855, description: "Qutub Minar is a UNESCO-listed historic minaret complex in south Delhi." },
  { id: "del-04", wikiTitle: "Humayun's Tomb", name: "Humayun's Tomb", city: "Delhi", state: "Delhi", country: "India", type: "Historical", lat: 28.5933, lng: 77.2507, description: "Humayun's Tomb is a major Mughal-era garden tomb complex in Delhi." },
  { id: "del-05", wikiTitle: "Lotus Temple", name: "Lotus Temple", city: "Delhi", state: "Delhi", country: "India", type: "Religious", lat: 28.5535, lng: 77.2588, description: "The Lotus Temple is a distinctive Bahai House of Worship in south Delhi." },
  { id: "del-06", wikiTitle: "Akshardham (Delhi)", name: "Akshardham Temple", city: "Delhi", state: "Delhi", country: "India", type: "Religious", lat: 28.6127, lng: 77.2773, description: "Swaminarayan Akshardham is a major temple and cultural complex in east Delhi." },
  { id: "del-07", wikiTitle: "Jama Masjid, Delhi", name: "Jama Masjid", city: "Delhi", state: "Delhi", country: "India", type: "Religious", lat: 28.6507, lng: 77.2334, description: "Jama Masjid is one of Old Delhi's most prominent historic mosques." },
  { id: "del-08", wikiTitle: "Lodi Gardens", name: "Lodhi Garden", city: "Delhi", state: "Delhi", country: "India", type: "Nature", lat: 28.5933, lng: 77.2197, description: "Lodhi Garden is a large landscaped park containing historic tombs and monuments." },
  { id: "del-09", wikiTitle: "Purana Qila", name: "Purana Qila", city: "Delhi", state: "Delhi", country: "India", type: "Historical", lat: 28.6096, lng: 77.2437, description: "Purana Qila is a historic fort complex near central Delhi." },
  { id: "del-10", wikiTitle: "Raj Ghat and associated memorials", name: "Raj Ghat", city: "Delhi", state: "Delhi", country: "India", type: "Historical", lat: 28.6407, lng: 77.2494, description: "Raj Ghat is a memorial site on the banks of the Yamuna in Delhi." },
  { id: "del-11", wikiTitle: "National Museum, New Delhi", name: "National Museum", city: "Delhi", state: "Delhi", country: "India", type: "Historical", lat: 28.6118, lng: 77.2195, description: "The National Museum is one of India's major museums, located in central New Delhi." },
  { id: "del-12", wikiTitle: "Connaught Place", name: "Connaught Place", city: "Delhi", state: "Delhi", country: "India", type: "City", lat: 28.6315, lng: 77.2167, description: "Connaught Place is a central Delhi commercial and cultural district known for its circular architecture, shops and restaurants." }
];

const CURATED_CATALOG = [...LEGACY_PLACES, ...PRIORITY_PLACES].map(normalizePlace);

function matchesPlace(place, { q = "", state = "", city = "", type = "" } = {}) {
  if (city && city !== "All Cities" && String(place.city).toLowerCase() !== String(city).toLowerCase()) return false;
  if (state && state !== "All States" && String(place.state).toLowerCase() !== String(state).toLowerCase()) return false;
  if (type && type !== "All Types" && String(place.type).toLowerCase() !== String(type).toLowerCase()) return false;
  if (!q) return true;
  const haystack = [place.name, place.city, place.state, place.type, ...(place.aliases || [])].join(" ").toLowerCase();
  return haystack.includes(String(q).toLowerCase());
}

function fallbackListPlaces({ q = "", state = "", city = "", type = "", page = 1, pageSize = 24 } = {}) {
  const filtered = CURATED_CATALOG.filter(place => {
      if (city && city !== "All Cities" && type === "All Types" && place.type === "City") return false;
      return matchesPlace(place, { q, state, city, type });
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(48, Math.max(1, Number(pageSize) || 24));
  const total = filtered.length;
  const places = filtered.slice((safePage - 1) * safePageSize, safePage * safePageSize);
  return { places, total, page: safePage, pageSize: safePageSize, hasMore: safePage * safePageSize < total, source: "curated-fallback" };
}

function fallbackGetPlace(id) {
  return CURATED_CATALOG.find(place => String(place.id) === String(id)) || null;
}

function isGenericImportedImage(value, id) {
  if (!value) return false;
  if (priorityImageUrl(id)) return false;
  return GENERIC_ASSET_RE.test(String(value)) || /Special:FilePath\/https?%3A/i.test(String(value));
}

export function normalizePlace(raw) {
  const city = raw.city || raw.name || "";
  const aliases = new Set(Array.isArray(raw.aliases) ? raw.aliases : []);
  const cityAliasMap = {
    Visakhapatnam: ["Vishakapatnam", "Vishakhapatnam", "Vizag"],
    Tirupati: ["Tirupathi", "Thirupathi"],
    Vijayawada: ["Bezawada"],
    Delhi: ["New Delhi"]
  };
  (cityAliasMap[city] || []).forEach(x => aliases.add(x));
  const priorityImage = priorityImageUrl(raw.id);
  const rawImage = typeof raw.image === "string" ? raw.image : null;
  const image = priorityImage || (isGenericImportedImage(rawImage, raw.id) ? null : rawImage);
  const imageSource = priorityImage ? "Wikimedia Commons" : (raw.imageSource || (image ? "Source catalogue" : null));
  const imageSourceUrl = priorityImage
    ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(priorityImageFilename(String(raw.id)) || "")}`
    : (raw.imageSourceUrl || raw.sourceUrl || null);
  return {
    id: String(raw.id),
    wikidataId: raw.wikidataId || null,
    wikiTitle: raw.wikiTitle || null,
    name: raw.name || "Unknown place",
    city,
    state: raw.state || "India",
    country: raw.country || "India",
    type: raw.type || "Tourist Attraction",
    aliases: [...aliases],
    description: raw.description || "Explore this destination and discover its history, attractions and local experiences.",
    image: image || null,
    images: Array.isArray(raw.images) && raw.images.length && !isGenericImportedImage(raw.images[0], raw.id) ? raw.images : (image ? [image] : []),
    imageSource,
    imageSourceUrl,
    imageStatus: image ? "available" : "missing",
    lat: Number(raw.lat),
    lng: Number(raw.lng),
    rating: Number(raw.rating || 0),
    reviewCount: Number(raw.reviewCount || 0),
    highlights: Array.isArray(raw.highlights) ? raw.highlights : [],
    source: raw.source || "Smart Travel Guide curated catalogue",
    sourceUrl: raw.sourceUrl || null,
    articleName: raw.articleName || null,
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

async function getCollection() {
  if (!MONGODB_USERNAME || !MONGODB_PASSWORD) {
    if (!MONGODB_URI) throw new Error("MongoDB credentials are not configured");
  }
  if (!clientPromise) {
    const client = MONGODB_USERNAME && MONGODB_PASSWORD
      ? new MongoClient("mongodb+srv://stg.rjukvtn.mongodb.net", {
          auth: { username: MONGODB_USERNAME, password: MONGODB_PASSWORD },
          authSource: "admin",
          serverSelectionTimeoutMS: 4000,
          connectTimeoutMS: 4000,
          socketTimeoutMS: 4000
        })
      : new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 4000, connectTimeoutMS: 4000, socketTimeoutMS: 4000 });
    clientPromise = client.connect().then(c => c.db(DB_NAME).collection(COLLECTION));
  }
  return clientPromise;
}

function parseCoordinate(value) {
  const match = String(value || "").match(/Point\(([-0-9.]+) ([-0-9.]+)\)/);
  if (!match) return null;
  return { lng: Number(match[1]), lat: Number(match[2]) };
}

function isValidIndiaCoordinate(coord) {
  return Boolean(coord) && coord.lat >= 6 && coord.lat <= 37.5 && coord.lng >= 68 && coord.lng <= 98;
}

function classifyType(name, description = "") {
  const text = `${name} ${description}`.toLowerCase();
  if (/beach|island|coast|waterfall|lake|valley|park|forest|wildlife|hill|mountain/.test(text)) return "Nature";
  if (/temple|church|mosque|monument|fort|palace|museum|heritage|archaeological|historic/.test(text)) return "Historical";
  if (/pilgrim|religious|shrine/.test(text)) return "Religious";
  return "Tourist Attraction";
}

function imageRequest(url) {
  return fetch(url, {
    headers: { "User-Agent": "SmartTravelGuide/1.0 (educational project)" },
    signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS)
  });
}

async function fetchWikipediaLeadImages(places) {
  const candidates = places
    .map(place => ({ id: place.id, titles: (place.titles || [place.wikiTitle, place.name, ...(place.aliases || [])]).filter(Boolean) }))
    .filter(x => x.titles.length);
  const map = new Map();
  for (let i = 0; i < candidates.length; i += 40) {
    const batch = candidates.slice(i, i + 40);
    const uniqueTitles = [...new Set(batch.flatMap(x => x.titles))];
    const url = new URL(WIKIPEDIA_API);
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("redirects", "1");
    url.searchParams.set("prop", "pageimages|info");
    url.searchParams.set("inprop", "url");
    url.searchParams.set("piprop", "thumbnail");
    url.searchParams.set("pithumbsize", "1200");
    url.searchParams.set("titles", uniqueTitles.join("|"));
    const response = await imageRequest(url);
    if (!response.ok) throw new Error(`Wikipedia image API returned ${response.status}`);
    const json = await response.json();
    for (const page of Object.values(json.query?.pages || {})) {
      const thumb = page.thumbnail?.source;
      const title = page.title;
      if (thumb && title) map.set(title.toLowerCase(), thumb);
    }
    for (const item of batch) {
      const hit = item.titles.map(t => map.get(String(t).toLowerCase())).find(Boolean);
      if (hit) map.set(item.id, hit);
    }
  }
  return new Map(candidates.map(item => [item.id, map.get(item.id) || null]));
}

async function searchCommonsImage(place) {
  const queries = [
    `${place.name} ${place.city}`,
    place.name,
    ...(place.aliases || [])
  ].filter(Boolean);
  for (const q of queries.slice(0, 2)) {
    try {
      const url = new URL(COMMONS_API);
      url.searchParams.set("action", "query");
      url.searchParams.set("format", "json");
      url.searchParams.set("generator", "search");
      url.searchParams.set("gsrsearch", q);
      url.searchParams.set("gsrnamespace", "6");
      url.searchParams.set("gsrlimit", "6");
      url.searchParams.set("prop", "imageinfo");
      url.searchParams.set("iiprop", "url");
      url.searchParams.set("iiurlwidth", "1200");
      const response = await imageRequest(url);
      if (!response.ok) continue;
      const json = await response.json();
      const pages = Object.values(json.query?.pages || {});
      const exactish = pages
        .map(page => page.imageinfo?.[0]?.thumburl || page.imageinfo?.[0]?.url)
        .filter(Boolean)[0];
      if (exactish) return exactish;
    } catch {}
  }
  return null;
}

async function refreshPriorityImages(collection) {
  const updates = PRIORITY_PLACES.map(place => {
    const image = priorityImageUrl(place.id);
    return {
      updateOne: {
        filter: { id: place.id },
        update: { $set: { image, images: [image], imageSource: "Wikimedia Commons", imageSourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(priorityImageFilename(String(place.id)) || "")}`, imageStatus: "available", imageUpdatedAt: new Date().toISOString() } }
      }
    };
  });
  if (updates.length) await collection.bulkWrite(updates, { ordered: false });
  return updates.length;
}

function imageFromWikidata(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(raw.replaceAll(" ", "_"))}`;
}

async function fetchWikidataPlaces(limit = 500) {
  const query = `
SELECT ?item ?itemLabel ?description ?coord ?image ?articleName ?article WHERE {
  ?item wdt:P17 wd:Q668;
        wdt:P625 ?coord;
        wdt:P31/wdt:P279* wd:Q570116.
  OPTIONAL { ?item schema:description ?description. FILTER(LANG(?description) = "en") }
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL {
    ?article schema:about ?item;
             schema:isPartOf <https://en.wikipedia.org/>;
             schema:name ?articleName.
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT ${Number(limit)}`;
  const response = await fetch("https://query.wikidata.org/sparql?query=" + encodeURIComponent(query) + "&format=json", {
    headers: { Accept: "application/sparql-results+json", "User-Agent": "SmartTravelGuide/1.0 (educational project)" }
  });
  if (!response.ok) throw new Error(`Wikidata returned ${response.status}`);
  const json = await response.json();
  return json.results.bindings.map(row => {
    const coord = parseCoordinate(row.coord?.value);
    const wikidataId = row.item.value.split("/").pop();
    const image = imageFromWikidata(row.image?.value);
    const articleUrl = row.article?.value || null;
    const name = row.itemLabel?.value || wikidataId;
    return normalizePlace({
      id: `wd-${wikidataId}`,
      wikidataId,
      name,
      city: name,
      state: "India",
      country: "India",
      type: classifyType(name, row.description?.value || ""),
      description: row.description?.value || `Explore ${name}, an Indian tourist attraction with its own history, culture and local experiences.`,
      image,
      images: image ? [image] : [],
      lat: coord?.lat,
      lng: coord?.lng,
      rating: 0,
      reviewCount: 0,
      source: "Wikidata / Wikimedia Commons",
      sourceUrl: articleUrl || `https://www.wikidata.org/wiki/${wikidataId}`,
      articleName: row.articleName?.value || null
    });
  }).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.name && isValidIndiaCoordinate({lat:p.lat,lng:p.lng}));
}

async function upsertPlaces(collection, places) {
  const normalized = places.map(normalizePlace).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!normalized.length) return;
  await collection.bulkWrite(
    normalized.map(place => ({
      updateOne: {
        filter: { id: place.id },
        update: { $set: place },
        upsert: true
      }
    })),
    { ordered: false }
  );
}

async function repairGenericImportedImages(collection) {
  const docs = await collection.find({ id: { $nin: PRIORITY_PLACES.map(p => p.id) } }).project({ id: 1, name: 1, city: 1, state: 1, articleName: 1, image: 1, images: 1, wikidataId: 1, sourceUrl: 1 }).toArray();
  const needsRepair = docs.filter(p => isGenericImportedImage(p.image, p.id) || (Array.isArray(p.images) && p.images.some(x => isGenericImportedImage(x, p.id))));
  if (!needsRepair.length) return 0;
  const imageCandidates = needsRepair.map(p => ({
    ...p,
    titles: [p.articleName, p.name, p.wikidataId ? `Q${p.wikidataId.replace(/^Q/, '')}` : null, `${p.name}, ${p.city || ""}`].filter(Boolean)
  }));
  let wikiImages = new Map();
  try {
    wikiImages = await fetchWikipediaLeadImages(imageCandidates);
  } catch (error) {
    console.warn("General image repair unavailable:", error.message);
  }
  const updates = [];
  for (const p of needsRepair) {
    const image = wikiImages.get(p.id) || null;
    updates.push({ updateOne: { filter: { id: p.id }, update: { $set: { image: image || null, images: image ? [image] : [], imageSource: image ? "Wikipedia" : null, imageSourceUrl: p.sourceUrl || null, imageStatus: image ? "available" : "missing", imageUpdatedAt: new Date().toISOString() } } } });
  }
  if (updates.length) await collection.bulkWrite(updates, { ordered: false });
  return updates.length;
}

let prioritySeedPromise = null;
let priorityImagePromise = null;
let generalImageRepairPromise = null;
async function ensurePriorityPlaces(collection) {
  if (!prioritySeedPromise) {
    const seed = [...LEGACY_PLACES, ...PRIORITY_PLACES];
    prioritySeedPromise = upsertPlaces(collection, seed).catch(error => {
      prioritySeedPromise = null;
      throw error;
    });
  }
  await prioritySeedPromise;
}

export async function ensurePlaceCatalog() {
  const collection = await getCollection();
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ name: 1, city: 1, state: 1 });
  await collection.createIndex({ name: "text", city: "text", state: "text", type: "text" });

  // Always upsert the requested high-priority destinations. This is intentionally
  // done even when MongoDB already contains 100+ records, so new seed places are
  // added to an existing catalogue instead of being skipped.
  await ensurePriorityPlaces(collection);
  if (!priorityImagePromise) {
    priorityImagePromise = refreshPriorityImages(collection).catch(error => {
      priorityImagePromise = null;
      console.warn("Priority place image refresh failed:", error.message);
      return 0;
    });
  }
  await priorityImagePromise;
  if (!generalImageRepairPromise) {
    generalImageRepairPromise = repairGenericImportedImages(collection).catch(error => {
      generalImageRepairPromise = null;
      console.warn("General catalogue image repair failed:", error.message);
      return 0;
    });
  }
  await generalImageRepairPromise;

  const countAfterPriority = await collection.countDocuments();
  if (countAfterPriority >= 100) return countAfterPriority;

  try {
    const remote = await fetchWikidataPlaces(500);
    await upsertPlaces(collection, remote);
  } catch (error) {
    console.warn("Wikidata place import unavailable; keeping curated catalogue:", error.message);
  }
  return await collection.countDocuments();
}

export async function listPlaces({ q = "", state = "", city = "", type = "", page = 1, pageSize = 24 } = {}) {
  try {
    const collection = await getCollection();
    await ensurePlaceCatalog();
    const filter = {};
    if (state && state !== "All States") filter.state = state;
    if (city && city !== "All Cities") filter.city = city;
    if (type && type !== "All Types") filter.type = type;
    else if (city && city !== "All Cities") filter.type = { $ne: "City" };
    const rejected = rejectedPlaceIds();
    if (rejected.size) filter.id = { $nin: [...rejected] };
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
        { state: { $regex: q, $options: "i" } },
        { type: { $regex: q, $options: "i" } },
        { aliases: { $regex: q, $options: "i" } }
      ];
    }
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(48, Math.max(1, Number(pageSize) || 24));
    const total = await collection.countDocuments(filter);
    const places = await collection.find(filter)
      .sort({ name: 1 })
      .skip((safePage - 1) * safePageSize)
      .limit(safePageSize)
      .toArray();
    return { places, total, page: safePage, pageSize: safePageSize, hasMore: safePage * safePageSize < total, source: "mongodb" };
  } catch (error) {
    console.warn("MongoDB place catalogue unavailable; using curated fallback:", error.message);
    return fallbackListPlaces({ q, state, city, type, page, pageSize });
  }
}

export async function getPlace(id) {
  try {
    const collection = await getCollection();
    await ensurePlaceCatalog();
    if (rejectedPlaceIds().has(String(id))) return null;
    const place = await collection.findOne({ id: String(id) });
    return place || fallbackGetPlace(id);
  } catch (error) {
    console.warn("MongoDB place details unavailable; using curated fallback:", error.message);
    return fallbackGetPlace(id);
  }
}

export async function getPlaceMeta() {
  try {
    const collection = await getCollection();
    await ensurePlaceCatalog();
    const [states, types, docs, count] = await Promise.all([
      collection.distinct("state"),
      collection.distinct("type"),
      collection.find({}, { projection: { city: 1, name: 1, state: 1 } }).toArray(),
      collection.countDocuments()
    ]);
    const priorityCities = new Set(["Vijayawada", "Visakhapatnam", "Tirupati", "Delhi"]);
    const cities = [...new Set(docs
      .map(d => ({ city: d.city, name: d.name, state: d.state }))
      .filter(d => d.city && (d.city !== d.name || priorityCities.has(d.city) || (d.state && d.state !== "India")))
      .map(d => d.city))].sort();
    return {
      states: states.filter(Boolean).sort(),
      types: types.filter(Boolean).sort(),
      cities,
      count,
      source: "mongodb"
    };
  } catch (error) {
    console.warn("MongoDB place metadata unavailable; using curated fallback:", error.message);
    return {
      states: [...new Set(CURATED_CATALOG.map(p => p.state).filter(Boolean))].sort(),
      types: [...new Set(CURATED_CATALOG.map(p => p.type).filter(Boolean))].sort(),
      cities: [...new Set(CURATED_CATALOG.map(p => ({city:p.city,name:p.name,state:p.state})).filter(d => d.city && (d.city !== d.name || ["Vijayawada","Visakhapatnam","Tirupati","Delhi"].includes(d.city) || (d.state && d.state !== "India"))).map(d => d.city))].sort(),
      count: CURATED_CATALOG.length,
      source: "curated-fallback"
    };
  }
}

export async function upsertVerifiedPlace(raw) {
  const collection = await getCollection();
  const place = normalizePlace({
    ...raw,
    id: String(raw.id),
    source: raw.source || "Traveller submission",
    type: raw.type || raw.category || "Tourist Attraction",
    description: raw.description || "Explore this destination and discover local experiences.",
    image: raw.image || raw.imageUrl || null,
    sourceUrl: raw.sourceUrl || null
  });
  await collection.updateOne({ id: place.id }, { $set: place }, { upsert: true });
  return place;
}
