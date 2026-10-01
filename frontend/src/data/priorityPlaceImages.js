// Exact, place-specific Wikimedia Commons images for the four priority city catalogues.
// The browser loads these remote images directly; no local image files are required.
const FILES = {
  // Vijayawada
  "ap-vij-01": "Kanaka Durga Gopuram, Vijayawada.jpg",
  "ap-vij-02": "Prakasam Barrage vijayawada.jpg",
  "ap-vij-03": "Bhavani Island of Vijayawada.jpg",
  "ap-vij-04": "Gandhi hill vijayawada.jpg",
  "ap-vij-05": "Undavalli caves.jpg",
  "ap-vij-06": "Kondapalli Fort.jpg",
  "ap-vij-07": "Train in Rajiv Gandhi Park (43821156351).jpg",
  "ap-vij-08": "Moghalrajpuram Caves View from Entrace.jpg",

  // Visakhapatnam
  "ap-viz-01": "RK beach in Visakhapatnam on a winter day.jpg",
  "ap-viz-02": "Kailasagiri Hill.jpg",
  "ap-viz-03": "Inside INS Kursura, Vishakhapatnam-01.jpg",
  "ap-viz-04": "Yarada-Beach-Visakhapatnam.jpg",
  "ap-viz-05": "View of Tenneti park Visakhapatnam.JPG",
  "ap-viz-06": "Simhachalam Temple vizag.jpg",
  "ap-viz-07": "Giraffee at Indira Gandhi Zoological Park, Visakhapatnam.jpg",
  "ap-viz-08": "Dolphin Nose.jpg",

  // Tirupati / Tirumala
  "ap-tir-01": "Tirumala Venkateswara temple entrance 09062015.JPG",
  "ap-tir-02": "Kapila theertham.jpg",
  "ap-tir-03": "Main gopuram at govindarajaswami temple at tirupati.JPG",
  "ap-tir-04": "Padmavathi Ammavari Temple.JPG",
  "ap-tir-05": "Silathoranam Tirupati.jpg",
  "ap-tir-06": "Akasha ganga.jpg",
  "ap-tir-07": "Chandragiri Fort.jpg",
  "ap-tir-08": "Talakona waterfalls.jpg",

  // Delhi
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
  "del-12": "Connaught Place New Delhi.jpg",
};

export function commonsFileUrl(filename) {
  if (!filename) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=1200`;
}

export const PRIORITY_PLACE_IMAGES = Object.fromEntries(
  Object.entries(FILES).map(([id, filename]) => [id, commonsFileUrl(filename)])
);

export const PRIORITY_PLACE_IMAGE_SOURCES = Object.fromEntries(
  Object.entries(FILES).map(([id, filename]) => [
    id,
    `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename)}`
  ])
);
