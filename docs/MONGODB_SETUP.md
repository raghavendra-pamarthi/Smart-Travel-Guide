# MongoDB Atlas setup

1. Keep your Atlas credentials in a local file named `backend/.env`.
2. The project expects:
   - `MONGODB_URI`
   - optional `MONGODB_DB` (defaults to `smart_travel_guide`)
3. Your uploaded Atlas credentials file can be copied to `backend/.env`, then add:

```env
MONGODB_DB=smart_travel_guide
```

4. Do not commit `backend/.env` to GitHub.
5. Start both servers with:

```bash
npm install
npm run dev:full
```

6. Check the API at `http://localhost:5000/api/health`.
7. A successful database connection reports `database: true` and a positive `placeCount`.

## Priority city catalogue update

The current version always upserts curated attractions for Vijayawada, Visakhapatnam, Tirupati and Delhi into MongoDB, even when the collection already contains 100+ places. It also recognizes common spellings such as `Vishakapatnam`, `Vishakhapatnam`, `Vizag`, `Tirupathi`, and `Thirupathi` when searching.

After starting the backend, test these in a browser:

- `http://localhost:5000/api/places?q=Vijayawada&pageSize=24`
- `http://localhost:5000/api/places?q=Vishakapatnam&pageSize=24`
- `http://localhost:5000/api/places?q=Thirupathi&pageSize=24`
- `http://localhost:5000/api/places?q=Delhi&pageSize=24`

Keep your existing `backend/.env` file. Do not commit or share it.
