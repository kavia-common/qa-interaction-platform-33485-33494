import React, { useMemo, useRef, useState } from 'react';
import './App.css';
import { askQuestion } from './services/api';
import useLocalStorage from './hooks/useLocalStorage';
import Header from './components/Header';

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
  // Q&A history: array of { id, question, answer, timestamp } persisted with localStorage
  const [history, setHistory] = useLocalStorage('qa_history', []);

  // Derived flag to control submit button
  const canSubmit = useMemo(() => !!question.trim() && !loading, [question, loading]);

  // Refs and transient UI state
  const textareaRef = useRef(null);
  const copiedTimeoutRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // Handle keydown in textarea for Enter/Cmd+Enter submit
  const onTextareaKeyDown = (e) => {
    const isEnter = e.key === 'Enter';
    const isMac = navigator.platform && navigator.platform.toUpperCase().includes('MAC');
    const metaOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // Submit on Cmd/Ctrl+Enter OR Enter without Shift. Shift+Enter inserts newline
    if (isEnter && (metaOrCtrl || !e.shiftKey)) {
      e.preventDefault();
      if (canSubmit) {
        handleSubmit(e);
      }
    }
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
      const response = await askQuestion(question.trim());
      setAnswer(response);

      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        question: question.trim(),
        answer: response,
        timestamp: new Date().toISOString(),
      };
      setHistory((prev) => [entry, ...prev]);
      setQuestion('');

      // Focus back to textarea for quick iterative questions
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (err) {
      // Surface user-friendly error message coming from API layer when possible
      const message =
        (err && typeof err.message === 'string' && err.message) ||
        'Failed to get an answer. Please try again.';
      setError(message);
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
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
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

  // PUBLIC_INTERFACE
  /**
   * PUBLIC_INTERFACE
   * Copies the current answer to the clipboard, if available.
   * Shows a brief "Copied!" state to provide feedback.
   */
  const copyAnswer = async () => {
    if (!answer || typeof navigator?.clipboard?.writeText !== 'function') return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 1200);
    } catch {
      // Ignore copy failures silently to avoid noisy UX
    }
  };

  // PUBLIC_INTERFACE
  /**
   * PUBLIC_INTERFACE
   * Retry the last submission (using current question field).
   */
  const retry = async () => {
    if (!question.trim() || loading) return;
    // Create a synthetic event-like payload for handleSubmit
    await handleSubmit({ preventDefault: () => {} });
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
                onKeyDown={onTextareaKeyDown}
                rows={4}
                aria-label="Question input"
                aria-describedby="question-help"
                ref={textareaRef}
              />
              <span id="question-help" className="sr-only">
                Press Enter to submit. Use Shift+Enter for a new line. On macOS use Command+Enter, on Windows/Linux use Ctrl+Enter.
              </span>
              <div className="actions">
                <button
                  type="submit"
                  className="btn"
                  disabled={!canSubmit}
                  aria-disabled={!canSubmit}
                  aria-label={loading ? 'Asking, please wait' : 'Ask the agent'}
                  title={
                    !question.trim()
                      ? 'Enter a question to ask'
                      : loading
                        ? 'Asking…'
                        : 'Submit question'
                  }
                >
                  {loading ? 'Asking…' : 'Ask'}
                </button>
              </div>
            </form>
          </section>

          <section className="card">
            <h2 className="section-title">Agent answer</h2>
            {error && (
              <>
                <div role="alert" className="alert">{error}</div>
                <div className="actions" style={{ justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={retry}
                    disabled={!question.trim() || loading}
                    aria-disabled={!question.trim() || loading}
                    aria-label="Retry"
                    title={!question.trim() ? 'Enter a question to retry' : 'Retry'}
                  >
                    Retry
                  </button>
                </div>
              </>
            )}
            {!error && !answer && !loading && (
              <p className="placeholder">The agent’s answer will appear here.</p>
            )}
            {!error && (answer || loading) && (
              <>
                <div className={`answer ${loading ? 'loading' : ''}`} aria-live="polite">
                  {loading ? 'Thinking…' : answer}
                </div>
                <div className="actions" style={{ justifyContent: 'flex-start' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={copyAnswer}
                    disabled={!answer || loading}
                    aria-disabled={!answer || loading}
                    aria-label="Copy answer to clipboard"
                    title={!answer ? 'No answer to copy' : 'Copy answer'}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </>
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
              aria-disabled={history.length === 0}
              aria-label="Clear all history"
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
                    aria-label={`Load Q and A from ${new Date(item.timestamp).toLocaleString()}`}
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

export default App;
