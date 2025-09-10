import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

/**
 * PUBLIC_INTERFACE
 * App is the main entry component for the Q&A interface. It renders:
 * - A header with application title
 * - A responsive layout with a main content area (question form, answer display)
 *   and a sidebar containing Q&A history.
 * The app uses a light theme with primary (#1976d2), secondary (#424242), and accent (#ff9800) colors.
 */
function App() {
  // State for the question being typed
  const [question, setQuestion] = useState('');
  // State for the currently displayed answer
  const [answer, setAnswer] = useState('');
  // Loading state while "fetching" the answer
  const [loading, setLoading] = useState(false);
  // Error message state
  const [error, setError] = useState('');
  // Q&A history: array of { id, question, answer, timestamp }
  const [history, setHistory] = useState(() => {
    // Initialize from localStorage to persist across refreshes
    try {
      const stored = localStorage.getItem('qa_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Keep localStorage synced
  useEffect(() => {
    try {
      localStorage.setItem('qa_history', JSON.stringify(history));
    } catch {
      // ignore storage errors gracefully
    }
  }, [history]);

  // Derived flag to control submit button
  const canSubmit = useMemo(() => !!question.trim() && !loading, [question, loading]);

  // Simulated/placeholder API call to fetch an answer
  // PUBLIC_INTERFACE
  const getAnswerFromAgent = async (text) => {
    /**
     * This function simulates an API call. Replace its content with a real fetch:
     * Example:
     *   const res = await fetch(process.env.REACT_APP_API_URL + '/ask', {
     *     method: 'POST',
     *     headers: { 'Content-Type': 'application/json' },
     *     body: JSON.stringify({ question: text })
     *   });
     *   const data = await res.json();
     *   return data.answer;
     */
    await new Promise((r) => setTimeout(r, 800)); // simulate latency
    // Provide a sensible placeholder response
    return `This is a placeholder answer for: "${text}". Integrate with your backend API to return real agent responses.`;
  };

  // Handle form submission
  // PUBLIC_INTERFACE
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError('');
    setAnswer('');

    try {
      const response = await getAnswerFromAgent(question.trim());
      setAnswer(response);

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        question: question.trim(),
        answer: response,
        timestamp: new Date().toISOString(),
      };
      setHistory((prev) => [entry, ...prev]);
      setQuestion('');
    } catch (err) {
      setError('Failed to get an answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Restore a history item into the main view
  // PUBLIC_INTERFACE
  const loadFromHistory = (entryId) => {
    const item = history.find((h) => h.id === entryId);
    if (!item) return;
    setQuestion(item.question);
    setAnswer(item.answer);
    setError('');
  };

  // Clear all history
  // PUBLIC_INTERFACE
  const clearHistory = () => {
    if (window.confirm('Clear all Q&A history?')) {
      setHistory([]);
      setAnswer('');
      setError('');
    }
  };

  return (
    <div className="qa-app">
      <Header />

      <div className="layout">
        <main className="main">
          <section className="card">
            <h2 className="section-title">Ask the agent</h2>
            <form className="form" onSubmit={handleSubmit} aria-label="Question form">
              <label htmlFor="question" className="sr-only">Your question</label>
              <textarea
                id="question"
                className="input"
                placeholder="Type your question here..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                aria-label="Question input"
              />
              <div className="actions">
                <button
                  type="submit"
                  className="btn"
                  disabled={!canSubmit}
                  aria-disabled={!canSubmit}
                  title={!question.trim() ? 'Enter a question to ask' : 'Submit question'}
                >
                  {loading ? 'Asking…' : 'Ask'}
                </button>
              </div>
            </form>
          </section>

          <section className="card">
            <h2 className="section-title">Agent answer</h2>
            {error && <div role="alert" className="alert">{error}</div>}
            {!error && !answer && !loading && (
              <p className="placeholder">The agent’s answer will appear here.</p>
            )}
            {!error && (answer || loading) && (
              <div className={`answer ${loading ? 'loading' : ''}`}>
                {loading ? 'Thinking…' : answer}
              </div>
            )}
          </section>
        </main>

        <aside className="sidebar">
          <div className="sidebar-header">
            <h3 className="sidebar-title">History</h3>
            <button
              className="btn btn-secondary"
              onClick={clearHistory}
              disabled={history.length === 0}
              title={history.length === 0 ? 'No history to clear' : 'Clear all history'}
            >
              Clear
            </button>
          </div>
          {history.length === 0 ? (
            <p className="placeholder">No previous Q&A yet.</p>
          ) : (
            <ul className="history-list" aria-label="Q&A history">
              {history.map((item) => (
                <li key={item.id} className="history-item">
                  <button
                    className="history-button"
                    onClick={() => loadFromHistory(item.id)}
                    title="Load this Q&A"
                  >
                    <span className="history-q">{item.question}</span>
                    <span className="history-time">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * Header component rendering the title and a subtle brand accent.
 * PUBLIC_INTERFACE
 */
function Header() {
  return (
    <header className="header" role="banner">
      <div className="brand">
        <div className="brand-accent" />
        <h1 className="title">Q&A Agent</h1>
      </div>
      <p className="subtitle">Ask questions and review your conversation history</p>
    </header>
  );
}

export default App;
