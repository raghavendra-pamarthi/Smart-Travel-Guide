# Smart Travel Guide — React + Express

Smart Travel Guide (STG) is a modern travel planning and local guide platform built with a structured **Backend** and **Frontend** architecture using React, Vite, Express, and MongoDB.

## Project Structure

```text
Smart Travel Guide/
├── backend/                     # All Backend API & data services
│   ├── data/                    # Server data stores & identity proofs
│   │   ├── admin_actions.json
│   │   ├── bookings.json
│   │   ├── guide_availability.json
│   │   ├── guide_requests.json
│   │   ├── help_tickets.json
│   │   ├── identity-proofs/
│   │   ├── notifications.json
│   │   ├── packages.json
│   │   ├── place_photos.json
│   │   ├── place_submissions.json
│   │   ├── reports.json
│   │   ├── reviews.json
│   │   └── users.json
│   ├── .env.example             # Backend environment template
│   ├── package.json             # Backend dependencies & scripts
│   ├── placeService.js          # Place catalogue & Wikimedia/Wikidata sync
│   └── server.js                # Express API endpoints & authentication
│
├── frontend/                    # All Frontend React & client assets
│   ├── public/                  # Static assets
│   │   └── assets/              # Curated destination & guide imagery
│   ├── src/                     # React source code
│   │   ├── components/          # Reusable UI widgets & navigation bars
│   │   │   ├── BrandMark.jsx
│   │   │   ├── DestinationCard.jsx
│   │   │   ├── GuideNavbar.jsx  # Navigation bar for Local Guide portal
│   │   │   ├── PackageCard.jsx
│   │   │   ├── PlaceCart.jsx    # Interactive place cart & planning drawer
│   │   │   ├── PublicNavbar.jsx # Navigation bar for visitors
│   │   │   ├── RoadmapMap.jsx   # Leaflet interactive route map
│   │   │   ├── RoleSwitcher.jsx
│   │   │   ├── ThemeToggle.jsx  # Dark/Light theme mode switch
│   │   │   └── UserNavbar.jsx   # Navigation bar for travellers
│   │   ├── data/                # Seed travel destinations & packages
│   │   ├── layouts/             # Role-based site layout architecture
│   │   │   ├── GuideLayout.jsx  # Layout wrapper for Local Guide portal
│   │   │   ├── PublicLayout.jsx # Layout wrapper for visitors
│   │   │   └── UserLayout.jsx   # Layout wrapper for authenticated travellers
│   │   ├── pages/               # Role-specific and public view pages
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── AdminPanel.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── GuideDashboard.jsx
│   │   │   ├── GuideRequests.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── MyContributions.jsx
│   │   │   ├── MyTrips.jsx
│   │   │   ├── NotFound.jsx     # 404 Route Lost catch-all page
│   │   │   ├── PlaceDetails.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Recommendations.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   ├── Roadmap.jsx
│   │   │   ├── SearchPlaces.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── SuggestPlace.jsx
│   │   │   ├── UserDashboard.jsx
│   │   │   └── UserPackages.jsx
│   │   ├── utils/               # Modular client-side helpers & store
│   │   │   ├── auth.js          # User session, bookings, and guide helpers
│   │   │   ├── index.js         # Unified export hub
│   │   │   ├── placeApi.js      # Place search & metadata fetching
│   │   │   ├── roadmapUtils.js  # Route optimization & distance matrix
│   │   │   └── tripStore.js     # Trip creation & localStorage state
│   │   ├── App.jsx              # Central routing & protected route guards
│   │   ├── index.css            # Core catalogue pagination styles
│   │   ├── main.jsx             # Application root mount
│   │   ├── styles.css           # Main component design system
│   │   └── unified-theme.css    # Unified theme tokens & dark/light modes
│   ├── index.html               # HTML entry point
│   ├── package.json             # Frontend dependencies & scripts
│   └── vite.config.js           # Vite config with /api proxy to port 5000
│
├── docs/                        # Project documentation & configuration guides
│   ├── ADMIN_PANEL.md           # Admin panel capabilities & verification rules
│   ├── IMAGE_DATA.md            # Place image curation guidelines
│   ├── MONGODB_SETUP.md         # MongoDB Atlas database setup
│   └── TIRUPATI_IMAGE_SOURCES.md # Curated heritage asset sources
├── package.json                 # Workspace orchestrator
└── .gitignore                   # Multi-package git ignore configuration
```

---

## Site Architecture & Routing

| Role | Route | Description | Layout |
| :--- | :--- | :--- | :--- |
| **Public** | `/` | Landing page, featured spots, guide highlights | `PublicLayout` |
| **Public / Shared** | `/place/:id` | Place details with smart role adaptation | Dynamic |
| **Auth** | `/login` | Traveller & Guide Sign In (Google OAuth supported) | Full Screen |
| **Auth** | `/signup` | Traveller & Guide Registration | Full Screen |
| **Auth** | `/forgot-password` | Password recovery via email reset link | Full Screen |
| **Auth** | `/reset-password` | Set new password with secure token | Full Screen |
| **Traveller** | `/user` | Traveller dashboard & personalized hub | `UserLayout` |
| **Traveller** | `/user/search` | Search places with filters, pagination & map | `UserLayout` |
| **Traveller** | `/user/packages` | Available tour packages from local guides | `UserLayout` |
| **Traveller** | `/user/recommendations`| AI/curated place & package recommendations | `UserLayout` |
| **Traveller** | `/user/roadmap` | Interactive trip route builder & optimizer | `UserLayout` |
| **Traveller** | `/user/trips` | Itinerary planner & custom guide booking | `UserLayout` |
| **Traveller** | `/user/suggest-place` | Submit missing destinations for admin review | `UserLayout` |
| **Traveller** | `/user/contributions`| Track verification status of submitted places | `UserLayout` |
| **Traveller** | `/user/profile` | Traveller profile & travel preferences | `UserLayout` |
| **Local Guide** | `/guide` | Guide management: packages, calendar & bookings| `GuideLayout` |
| **Local Guide** | `/guide/requests` | Incoming traveller customized guide requests | `GuideLayout` |
| **Local Guide** | `/guide/contributions`| Submitted places & admin review status | `GuideLayout` |
| **Local Guide** | `/guide/profile` | Guide bio, specialties & certifications | `GuideLayout` |
| **Admin** | `/admin/login` | Secure Admin sign-in | Full Screen |
| **Admin** | `/admin` & `/admin/:section`| Verifications, reviews, users & analytics | Protected |
| **Fallback** | `*` | Custom 404 Destination Not Found page | Standalone |

---

## Running the Application

You can run the project either from the **root directory** (recommended) or from individual subdirectories:

### Option 1: From the Root Directory (Single Command)
```bash
npm run dev:full
```
This runs both the backend Express server and the frontend Vite server simultaneously using `concurrently`.

Or run them individually:
* **Frontend:** `npm run dev` (starts on `http://localhost:5173`)
* **Backend:** `npm run server` (starts on `http://localhost:5000`)
* **Build:** `npm run build` (builds the frontend bundle)

### Option 2: Running Sub-packages Directly

#### Backend:
```bash
cd backend
npm install
npm start
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## Detailed Documentation

For setup instructions and system specifications, see the `docs/` folder:
- [MongoDB Atlas Setup](docs/MONGODB_SETUP.md)
- [Admin Panel Architecture](docs/ADMIN_PANEL.md)
- [Image Policy & Curation](docs/IMAGE_DATA.md)
- [Heritage Place Data Sources](docs/TIRUPATI_IMAGE_SOURCES.md)
