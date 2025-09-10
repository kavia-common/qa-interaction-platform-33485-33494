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

## Integrating a Backend/API

The app currently uses a placeholder method to simulate agent responses.
To integrate a real backend:

1. Set an environment variable for your API base:
   - Add REACT_APP_API_URL in a .env file (do not commit secrets).
2. Replace the getAnswerFromAgent function in src/App.js:
   ```
   const res = await fetch(process.env.REACT_APP_API_URL + '/ask', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ question: text })
   });
   const data = await res.json();
   return data.answer;
   ```
3. Ensure CORS is enabled on your backend.

## Notes

- Q&A history is persisted in localStorage.
- No UI framework is used; styles are defined in src/App.css for easy customization.
