# Q&A Frontend (React)

A modern, minimalistic React UI for interacting with a Q&A agent. Users can submit questions, view agent answers, and browse their Q&A history.

## Features

- User question input form
- Display of agent answers
- History of previous Q&A interactions (sidebar)
- Responsive, modern, minimalistic UI
- Light theme with colors:
  - Primary: `#1976d2`
  - Secondary: `#424242`
  - Accent: `#ff9800`

## Getting Started

In the project directory, you can run:

### `npm start`
Runs the app in development mode.
Open http://localhost:3000 to view it in your browser.

### `npm test`
Launches the test runner.

### `npm run build`
Builds the app for production to the `build` folder.

## Backend/API Integration

The app supports calling a real backend automatically when the environment variable `REACT_APP_API_URL` is set. If not set, it falls back to a built‑in mock that simulates latency and returns a placeholder answer.

- Endpoint expected: `POST {REACT_APP_API_URL}/ask`
- Request body: `{ "question": string }`
- Response body: `{ "answer": string }`

### Quick setup

1. Create a `.env` file at the project root (same folder as `package.json`) and define:
   ```
   REACT_APP_API_URL=https://your-backend.example.com
   ```
   Note: Do not commit secrets. Environment variables prefixed with `REACT_APP_` are embedded at build time by Create React App.

2. Ensure your backend has CORS enabled for the frontend origin during development.

3. Start or rebuild the app after changing `.env`:
   - For dev: stop and run `npm start` again so env vars are picked up.
   - For prod: run `npm run build` to generate a build with the correct env.

No additional code changes are necessary. The file `src/services/api.js` will:
- Use `fetch` to call `POST {REACT_APP_API_URL}/ask` when `REACT_APP_API_URL` is present.
- Fallback to a mock answer when it’s not set.

### Optional: UI conditionals

`src/services/api.js` also exports a boolean `isMock` you can use for small UI hints, e.g., displaying a banner in development when the mock is active.

Example:
```js
import { isMock } from './services/api';
// if (isMock) { /* show "Running in mock mode" hint */ }
```

## Notes

- Q&A history is persisted in localStorage.
- No UI framework is used; styles are defined in src/App.css for easy customization.
