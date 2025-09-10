/**
 * Determine if we should use the mock implementation or a real backend.
 * If REACT_APP_API_URL is present and non-empty, we'll call the backend.
 */
const API_BASE = (process && process.env && process.env.REACT_APP_API_URL) || '';
export const isMock = !API_BASE;

/**
 * Perform the real API call to the backend /ask endpoint.
 * @param {string} question
 * @returns {Promise<string>}
 */
async function askQuestionReal(question) {
  const url = `${API_BASE.replace(/\/+$/, '')}/ask`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Allow backends that expect 'question' or 'prompt'
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    // Include status text to aid debugging
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed: ${res.status} ${res.statusText} ${text ? `- ${text}` : ''}`);
  }

  // Expecting { answer: string }
  const data = await res.json();
  if (!data || typeof data.answer !== 'string') {
    throw new Error('Malformed response: expected JSON with an "answer" string field.');
  }
  return data.answer;
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
