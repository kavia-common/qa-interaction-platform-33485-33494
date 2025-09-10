//
// PUBLIC_INTERFACE
// askQuestion simulates an asynchronous call to a Q&A backend.
// Replace the internals with a real API call when integrating a backend.
//
/**
 * PUBLIC_INTERFACE
 * askQuestion triggers an asynchronous request to the (mock) agent to get an answer.
 * Replace implementation with a real fetch to your backend when ready.
 *
 * Example integration:
 *   const res = await fetch(`${process.env.REACT_APP_API_URL}/ask`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ question })
 *   });
 *   if (!res.ok) throw new Error('Failed to fetch');
 *   const data = await res.json();
 *   return data.answer;
 *
 * @param {string} question - The user-submitted question text.
 * @returns {Promise<string>} Resolves to the agent's answer as a string.
 */
export async function askQuestion(question) {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Provide a sensible placeholder response
  return `This is a placeholder answer for: "${question}". Integrate with your backend API to return real agent responses.`;
}
