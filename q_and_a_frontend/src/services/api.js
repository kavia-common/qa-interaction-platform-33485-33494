 /**
  * Determine if we should use the mock implementation or a real backend.
  * If REACT_APP_API_URL is present and non-empty, we'll call the backend.
  */
 const API_BASE = (process && process.env && process.env.REACT_APP_API_URL) || '';
 export const isMock = !API_BASE;

 /**
  * Convert low-level fetch/Abort errors into user-friendly messages while preserving details.
  * @param {unknown} err
  * @returns {Error}
  */
 function toUserFriendlyError(err) {
   const message = typeof err?.message === 'string' ? err.message : '';

   const isAbort =
     (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') ||
     /aborted|AbortError|timeout/i.test(message);

   if (isAbort) {
     return new Error('Request timed out after 30 seconds. Please try again.');
   }

   // Fetch throws TypeError on network failures (DNS, CORS blocked, offline)
   if (err instanceof TypeError) {
     return new Error('Network error. Please check your connection and try again.');
   }

   // For HTTP errors and others, fall back to a generic friendly message
   return new Error('Something went wrong while contacting the server. Please try again.');
 }

 /**
  * Perform the real API call to the backend /ask endpoint with a 30s timeout using AbortController.
  * @param {string} question
  * @returns {Promise<string>}
  */
 async function askQuestionReal(question) {
   const url = `${API_BASE.replace(/\/*$/, '')}/ask`;

   // Abort the request after 30s
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 30_000);

   try {
     const res = await fetch(url, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       // Allow backends that expect 'question' or 'prompt'
       body: JSON.stringify({ question }),
       signal: controller.signal,
     });

     if (!res.ok) {
       // Attempt to parse a backend-provided error message
       let serverMessage = '';
       try {
         const ct = res.headers.get('content-type') || '';
         if (ct.includes('application/json')) {
           const body = await res.json();
           serverMessage =
             (typeof body?.message === 'string' && body.message) ||
             (typeof body?.error === 'string' && body.error) ||
             '';
         } else {
           serverMessage = await res.text();
         }
       } catch {
         // ignore parse errors
       }
       const base = `Request failed: ${res.status} ${res.statusText}`;
       const detail = serverMessage ? ` - ${serverMessage}` : '';
       // Throw a technical error; caller will convert to user-friendly
       throw new Error(base + detail);
     }

     // Expecting { answer: string }
     const data = await res.json();
     if (!data || typeof data.answer !== 'string') {
       throw new Error('Malformed response: expected JSON with an "answer" string field.');
     }
     return data.answer;
   } catch (err) {
     // Normalize error before propagating up to UI
     throw toUserFriendlyError(err);
   } finally {
     clearTimeout(timeoutId);
   }
 }

 /**
  * Mock implementation used when no backend is configured.
  * Simulates latency and returns a placeholder answer.
  * @param {string} question
  * @returns {Promise<string>}
  */
 async function askQuestionMock(question) {
   // Simulate network latency
   await new Promise((resolve) => setTimeout(resolve, 800));
   return `This is a placeholder answer for: "${question}". Integrate with your backend API to return real agent responses.`;
 }

 // PUBLIC_INTERFACE
 /**
  * PUBLIC_INTERFACE
  * askQuestion triggers an asynchronous request to the agent to get an answer.
  * If REACT_APP_API_URL is set, it will call POST {REACT_APP_API_URL}/ask,
  * otherwise it falls back to a local mock implementation.
  *
  * @param {string} question - The user-submitted question text.
  * @returns {Promise<string>} Resolves to the agent's answer as a string.
  */
 export async function askQuestion(question) {
   if (!question || typeof question !== 'string') {
     throw new Error('Question must be a non-empty string.');
   }
   if (isMock) {
     return askQuestionMock(question);
   }
   return askQuestionReal(question);
 }
