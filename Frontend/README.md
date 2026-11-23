# Alpha Lost & Found

Campus lost-and-found web app. React 18 + Vite + Tailwind CSS 3 + React Router 6.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in /dist
```

## Structure

```
src/
  components/   Layout, Navbar, Footer, ItemCard, ReportForm, ProtectedRoute, PageHeader
  pages/        Landing, Login, Register, Dashboard, Browse, ReportLost, ReportFound, ItemDetails
  context/      AuthContext (users/session), ItemsContext (reports)
  data/         Seed items and categories
```

## Routes

| Path | Page | Login required |
|---|---|---|
| `/` | Landing | no |
| `/login`, `/register` | Auth | no |
| `/browse`, `/items/:id` | Browse / details | no |
| `/dashboard` | Home dashboard | yes |
| `/report-lost`, `/report-found` | Report forms | yes |

## Notes

- Auth and items are stored in `localStorage`, so the app works without a backend.
  Replace the functions in `context/AuthContext.jsx` and `context/ItemsContext.jsx`
  with API calls when you add one. Passwords are stored in plain text here, so don't ship that.
- Theme colors live in `tailwind.config.js` under `brand`.
