import { PRIORITY_PLACE_IMAGES } from "./priorityPlaceImages";
export const destinations = [
  { id: 1, lat: 27.1767, lng: 78.0081, name: "Agra", state: "Uttar Pradesh", rating: 4.6, type: "Historical", image: "/assets/agra.jpg" },
  { id: 2, lat: 32.2396, lng: 77.1887, name: "Manali", state: "Himachal Pradesh", rating: 4.5, type: "Mountains", image: "/assets/manali.jpg" },
  { id: 3, lat: 9.4981, lng: 76.3388, name: "Alleppey", state: "Kerala", rating: 4.7, type: "Nature", image: "/assets/alleppey.jpg" },
  { id: 4, lat: 15.2993, lng: 74.124, name: "Goa", state: "Goa", rating: 4.4, type: "Beaches", image: "/assets/goa.jpg" },
  { id: 5, lat: 24.5854, lng: 73.7125, name: "Udaipur", state: "Rajasthan", rating: 4.6, type: "Historical", image: "/assets/udaipur.jpg" },
  { id: 6, lat: 27.3389, lng: 88.6065, name: "Gangtok", state: "Sikkim", rating: 4.5, type: "Mountains", image: "/assets/gangtok.jpg" },
  { id: 7, lat: 34.0837, lng: 74.7973, name: "Kashmir", state: "Jammu & Kashmir", rating: 4.8, type: "Mountains", image: "/assets/manali.jpg" },
  { id: 8, lat: 11.6234, lng: 92.7265, name: "Andaman", state: "Andaman & Nicobar", rating: 4.7, type: "Beaches", image: "/assets/goa.jpg" },
  { id: 9, lat: 12.4244, lng: 75.7382, name: "Coorg", state: "Karnataka", rating: 4.6, type: "Nature", image: "/assets/alleppey.jpg" }
];

export const VIJAYAWADA_PACKAGE_PLACES = [
  { id: "ap-vij-01", name: "Kanaka Durga Temple", city: "Vijayawada", state: "Andhra Pradesh", type: "Religious", lat: 16.5178, lng: 80.6170, image: PRIORITY_PLACE_IMAGES["ap-vij-01"], description: "Prominent temple on Indrakeeladri overlooking Vijayawada and the Krishna River." },
  { id: "ap-vij-02", name: "Prakasam Barrage", city: "Vijayawada", state: "Andhra Pradesh", type: "Nature", lat: 16.5072, lng: 80.6180, image: PRIORITY_PLACE_IMAGES["ap-vij-02"], description: "A landmark across the Krishna River and a major Vijayawada riverfront attraction." },
  { id: "ap-vij-03", name: "Bhavani Island", city: "Vijayawada", state: "Andhra Pradesh", type: "Nature", lat: 16.4919, lng: 80.6229, image: PRIORITY_PLACE_IMAGES["ap-vij-03"], description: "A riverside recreation destination on the Krishna River near Vijayawada." },
  { id: "ap-vij-06", name: "Kondapalli Fort", city: "Vijayawada", state: "Andhra Pradesh", type: "Historical", lat: 16.6176, lng: 80.5367, image: PRIORITY_PLACE_IMAGES["ap-vij-06"], description: "A hilltop fort near Vijayawada with historic structures and surrounding views." }
];

export const VISAKHAPATNAM_PACKAGE_PLACES = [
  { id: "ap-viz-01", name: "RK Beach", city: "Visakhapatnam", state: "Andhra Pradesh", type: "Beaches", lat: 17.7141, lng: 83.3198, image: PRIORITY_PLACE_IMAGES["ap-viz-01"], description: "A popular seafront destination with a long coastal promenade." },
  { id: "ap-viz-02", name: "Kailasagiri", city: "Visakhapatnam", state: "Andhra Pradesh", type: "Nature", lat: 17.74926, lng: 83.34177, image: PRIORITY_PLACE_IMAGES["ap-viz-02"], description: "A hilltop park with panoramic views of the Visakhapatnam coast and city." },
  { id: "ap-viz-03", name: "INS Kurusura Submarine Museum", city: "Visakhapatnam", state: "Andhra Pradesh", type: "Historical", lat: 17.7145, lng: 83.3192, image: PRIORITY_PLACE_IMAGES["ap-viz-03"], description: "A maritime museum housed in the submarine INS Kurusura on the beachfront." },
  { id: "ap-viz-08", name: "Dolphin's Nose", city: "Visakhapatnam", state: "Andhra Pradesh", type: "Nature", lat: 17.6862, lng: 83.2986, image: PRIORITY_PLACE_IMAGES["ap-viz-08"], description: "A rocky headland overlooking Visakhapatnam's harbour and coastline." }
];

export const TIRUPATI_PACKAGE_PLACES = [
  { id: "ap-tir-01", wikiTitle: "Venkateswara Temple, Tirumala", name: "Sri Venkateswara Temple, Tirumala", city: "Tirupati", state: "Andhra Pradesh", type: "Religious", lat: 13.6833, lng: 79.3473, image: PRIORITY_PLACE_IMAGES["ap-tir-01"], description: "The principal pilgrimage landmark associated with Tirupati and Tirumala." },
  { id: "ap-tir-02", wikiTitle: "Kapila Theertham", name: "Kapila Theertham", city: "Tirupati", state: "Andhra Pradesh", type: "Religious", lat: 13.6416, lng: 79.4054, image: PRIORITY_PLACE_IMAGES["ap-tir-02"], description: "A temple and waterfall site at the foot of the Tirumala hills." },
  { id: "ap-tir-03", wikiTitle: "Govindaraja Swamy Temple", name: "Sri Govindaraja Swamy Temple", city: "Tirupati", state: "Andhra Pradesh", type: "Religious", lat: 13.6287, lng: 79.4191, image: PRIORITY_PLACE_IMAGES["ap-tir-03"], description: "An important historic temple in Tirupati city." },
  { id: "ap-tir-05", wikiTitle: "Silathoranam", name: "Silathoranam", city: "Tirupati", state: "Andhra Pradesh", type: "Nature", lat: 13.678175, lng: 79.351519, image: PRIORITY_PLACE_IMAGES["ap-tir-05"], description: "A natural rock arch in the Tirumala hills and a distinctive geological attraction." },
  { id: "ap-tir-07", wikiTitle: "Chandragiri Fort", name: "Chandragiri Fort", city: "Tirupati", state: "Andhra Pradesh", type: "Historical", lat: 13.58303, lng: 79.30529, image: PRIORITY_PLACE_IMAGES["ap-tir-07"], description: "A historic hill fort complex in the Tirupati region." }
];

export const HYDERABAD_PACKAGE_PLACES = [
  { id: "hy-01", wikiTitle: "Charminar", name: "Charminar", city: "Hyderabad", state: "Telangana", country: "India", type: "Historical", lat: 17.3616, lng: 78.4747, description: "Hyderabad's iconic four-minaret monument and one of the city's best-known heritage landmarks." },
  { id: "hy-02", wikiTitle: "Golconda Fort", name: "Golconda Fort", city: "Hyderabad", state: "Telangana", country: "India", type: "Historical", lat: 17.3833, lng: 78.4011, description: "A historic fortified complex known for its architecture, gates, palaces and acoustic engineering." },
  { id: "hy-03", wikiTitle: "Salar Jung Museum", name: "Salar Jung Museum", city: "Hyderabad", state: "Telangana", country: "India", type: "Historical", lat: 17.3713, lng: 78.4803, description: "A major museum containing collections of art, manuscripts, decorative objects and historic artefacts." },
  { id: "hy-04", wikiTitle: "Chowmahalla Palace", name: "Chowmahalla Palace", city: "Hyderabad", state: "Telangana", country: "India", type: "Historical", lat: 17.3578, lng: 78.4716, description: "A historic palace complex associated with the Asaf Jahi dynasty and Hyderabad's royal heritage." },
  { id: "hy-05", wikiTitle: "Hussain Sagar", name: "Hussain Sagar", city: "Hyderabad", state: "Telangana", country: "India", type: "Nature", lat: 17.4239, lng: 78.4738, description: "A large heart-shaped lake in central Hyderabad with a prominent Buddha statue and waterfront views." }
];

export const packages = [
  { id: 5, name: "Vijayawada Heritage & River Escape", startDate: "2026-10-22", endDate: "2026-10-24", days: 3, duration: "3 Days / 2 Nights", price: 8999, rating: 4.7, image: PRIORITY_PLACE_IMAGES["ap-vij-01"], description: "Explore Vijayawada's temples, Krishna River landmarks, island experiences and nearby heritage attractions.", places: VIJAYAWADA_PACKAGE_PLACES },
  { id: 6, name: "Visakhapatnam Coastal Explorer", startDate: "2026-10-26", endDate: "2026-10-29", days: 4, duration: "4 Days / 3 Nights", price: 11999, rating: 4.8, image: PRIORITY_PLACE_IMAGES["ap-viz-02"], description: "Experience Visakhapatnam's beaches, Kailasagiri, maritime heritage and coastal viewpoints.", places: VISAKHAPATNAM_PACKAGE_PLACES },
  { id: 7, name: "Tirupati Spiritual Journey", startDate: "2026-11-02", endDate: "2026-11-05", days: 4, duration: "4 Days / 3 Nights", price: 10999, rating: 4.8, image: PRIORITY_PLACE_IMAGES["ap-tir-01"], description: "A pilgrimage-focused Tirupati journey covering major temples and heritage attractions with verified place-specific imagery.", places: TIRUPATI_PACKAGE_PLACES },
  { id: 8, name: "Hyderabad Heritage & Culture", startDate: "2026-11-12", endDate: "2026-11-15", days: 4, duration: "4 Days / 3 Nights", price: 12499, rating: 4.7, image: null, wikiTitle: "Charminar", description: "Explore Hyderabad's historic monuments, royal heritage, museums and lakefront landmarks.", places: HYDERABAD_PACKAGE_PLACES },
  { id: 1, name: "Kashmir Escape", startDate: "2026-12-01", endDate: "2026-12-05", days: 5, duration: "5 Days / 4 Nights", price: 18999, rating: 4.8, image: "/assets/manali.jpg", description: "A scenic Kashmir journey through mountain landscapes, lakes and memorable local experiences.", places: [destinations[6]] },
  { id: 3, name: "Rajasthan Heritage", startDate: "2026-12-10", endDate: "2026-12-15", days: 6, duration: "6 Days / 5 Nights", price: 21999, rating: 4.6, image: "/assets/udaipur.jpg", description: "Discover royal architecture, lakes and the rich heritage of Rajasthan.", places: [destinations[4]] }
];

export const initialTrips = [
  { id: 1, destination: "Goa", dates: "Jan 12 – Jan 16, 2026", status: "Completed", reviewed: false, image: "/assets/goa.jpg" },
  { id: 2, destination: "Agra", dates: "Mar 03 – Mar 05, 2026", status: "Completed", reviewed: true, image: "/assets/agra.jpg" },
  { id: 3, destination: "Kerala", dates: "Aug 20 – Aug 25, 2025", status: "Completed", reviewed: true, image: "/assets/alleppey.jpg" }
];
