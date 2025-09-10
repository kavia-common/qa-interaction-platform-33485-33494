import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock the askQuestion API
jest.mock('./services/api', () => ({
  askQuestion: jest.fn(),
}));

// Utility: setup a controllable localStorage mock per test to keep isolation
function setupLocalStorageMock(initial = {}) {
  let store = { ...initial };
  const getItem = jest.fn((key) => (key in store ? store[key] : null));
  const setItem = jest.fn((key, val) => {
    store[key] = String(val);
  });
  const removeItem = jest.fn((key) => {
    delete store[key];
  });
  const clear = jest.fn(() => {
    store = {};
  });
  Object.defineProperty(window, 'localStorage', {
    value: { getItem, setItem, removeItem, clear },
    writable: true,
    configurable: true,
  });
  return { getItem, setItem, removeItem, clear, getStore: () => store };
}

// Helper to get the sidebar container to scope queries and avoid ambiguous matches
function getSidebar() {
  // Aside contains history UI; use role-based query: complementary
  const sidebar = screen.getByRole('complementary', { hidden: true }) || document.querySelector('.sidebar');
  return sidebar || document.querySelector('.sidebar');
}

describe('App UI rendering', () => {
  beforeEach(() => {
    setupLocalStorageMock();
    jest.clearAllMocks();
  });

  test('renders header, form, answer section, and history sidebar', () => {
    render(<App />);

    // Header content
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(within(header).getByText('Q&A Agent')).toBeInTheDocument();
    expect(
      within(header).getByText('Ask questions and review your conversation history')
    ).toBeInTheDocument();

    // Form elements
    expect(screen.getByRole('form', { name: /question form/i })).toBeInTheDocument();
    const textarea = screen.getByLabelText(/question input/i);
    expect(textarea).toBeInTheDocument();
    const askButton = screen.getByRole('button', { name: /^ask$/i });
    expect(askButton).toBeInTheDocument();

    // Answer section and placeholder
    expect(screen.getByText(/agent answer/i)).toBeInTheDocument();
    expect(screen.getByText(/The agent’s answer will appear here./i)).toBeInTheDocument();

    // Sidebar checks (scoped)
    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(within(sidebar).getByText(/history/i)).toBeInTheDocument();
    expect(within(sidebar).getByText(/No previous Q&A yet./i)).toBeInTheDocument();
    const clearButton = within(sidebar).getByRole('button', { name: /clear all history/i });
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toBeDisabled();
  });
});

describe('Submitting a question flow', () => {
  let askQuestionMock;
  beforeEach(() => {
    setupLocalStorageMock();
    jest.resetModules();
    askQuestionMock = require('./services/api').askQuestion;
  });

  test('typing enables submit button', async () => {
    render(<App />);
    const askBtn = screen.getByRole('button', { name: /^ask$/i });
    const textarea = screen.getByLabelText(/question input/i);

    expect(askBtn).toBeDisabled();
    await userEvent.type(textarea, 'Hello?');
    expect(askBtn).toBeEnabled();
  });

  test('submitting shows loading then displays answer and clears input', async () => {
    askQuestionMock.mockResolvedValueOnce('Mocked answer response');
    render(<App />);

    const textarea = screen.getByLabelText(/question input/i);
    const askBtn = screen.getByRole('button', { name: /^ask$/i });

    await userEvent.type(textarea, '  What is AI?  ');
    await userEvent.click(askBtn);

    // Wait for the loading states to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /asking…/i })).toBeInTheDocument();
      expect(screen.getByText(/Thinking…/i)).toBeInTheDocument();
    });

    // Wait for the API-resolved answer
    await waitFor(() => {
      expect(askQuestionMock).toHaveBeenCalledWith('What is AI?');
      expect(screen.getByText('Mocked answer response')).toBeInTheDocument();
    });

    // After success, the textarea should be cleared
    expect(textarea).toHaveValue('');
  });

  test('error state when API fails shows alert and no answer', async () => {
    askQuestionMock.mockRejectedValueOnce(new Error('Network'));
    render(<App />);

    const textarea = screen.getByLabelText(/question input/i);
    await userEvent.type(textarea, 'Cause error');
    await userEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    // Shows loading first
    await waitFor(() => {
      expect(screen.getByText(/Thinking…/i)).toBeInTheDocument();
    });

    // Then shows error alert
    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/Failed to get an answer/i);
    });

    // Placeholder for answer section should not appear with error (since alert present)
    expect(screen.queryByText(/The agent’s answer will appear here./i)).not.toBeInTheDocument();

    // Retry button should be visible when error is shown
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  test('explicit loading state: button shows Asking… and answer panel shows Thinking… while awaiting', async () => {
    // Return a promise that we resolve later to keep loading visible
    let resolveFn;
    askQuestionMock.mockImplementation(
      () => new Promise((resolve) => { resolveFn = resolve; })
    );

    render(<App />);
    const textarea = screen.getByLabelText(/question input/i);
    await userEvent.type(textarea, 'Stay loading');
    await userEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    // Wait for loading states
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /asking…/i })).toBeInTheDocument();
      expect(screen.getByText(/Thinking…/i)).toBeInTheDocument();
    });

    // Resolve and ensure it updates
    resolveFn('Loaded finally');
    await waitFor(() => {
      expect(screen.getByText('Loaded finally')).toBeInTheDocument();
    });
  });
});

describe('History behavior with localStorage', () => {
  let askQuestionMock;
  beforeEach(() => {
    jest.resetModules();
    askQuestionMock = require('./services/api').askQuestion;
  });

  test('existing history from localStorage appears and clear button enabled', () => {
    const initialHistory = [
      {
        id: '1',
        question: 'Prev Q1',
        answer: 'Prev A1',
        timestamp: new Date('2023-01-01T00:00:00.000Z').toISOString(),
      },
      {
        id: '2',
        question: 'Prev Q2',
        answer: 'Prev A2',
        timestamp: new Date('2023-01-02T00:00:00.000Z').toISOString(),
      },
    ];
    setupLocalStorageMock({
      qa_history: JSON.stringify(initialHistory),
    });

    render(<App />);

    const sidebar = document.querySelector('.sidebar');
    const list = within(sidebar).getByRole('list', { name: /Q&A history/i });
    // Ensure both entries present
    expect(within(list).getByText('Prev Q1')).toBeInTheDocument();
    expect(within(list).getByText('Prev Q2')).toBeInTheDocument();

    // Clear button enabled when there is history
    expect(within(sidebar).getByRole('button', { name: /clear all history/i })).toBeEnabled();
  });

  test('clicking a history item loads its question and answer into the main view', async () => {
    const initialHistory = [
      {
        id: 'abc',
        question: 'Stored Q',
        answer: 'Stored A',
        timestamp: new Date('2023-01-01T00:00:00.000Z').toISOString(),
      },
    ];
    setupLocalStorageMock({ qa_history: JSON.stringify(initialHistory) });

    render(<App />);

    const sidebar = document.querySelector('.sidebar');
    const list = within(sidebar).getByRole('list', { name: /Q&A history/i });

    // Select the list item by contained question text, then click the history-button inside
    const item = within(list).getByText('Stored Q').closest('li');
    const loadBtn = within(item).getByRole('button', { name: /load this Q&A/i });
    await userEvent.click(loadBtn);

    // The textarea should now contain the stored question and the answer section show the stored answer
    expect(screen.getByLabelText(/question input/i)).toHaveValue('Stored Q');
    expect(screen.getByText('Stored A')).toBeInTheDocument();
  });

  test('submitting a new Q&A adds to history and persists via localStorage', async () => {
    const storage = setupLocalStorageMock({ qa_history: JSON.stringify([]) });
    askQuestionMock.mockResolvedValueOnce('Answer X');

    render(<App />);

    await userEvent.type(screen.getByLabelText(/question input/i), 'New Question');
    await userEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => expect(screen.getByText('Answer X')).toBeInTheDocument());

    // History list should now have an item with question text
    const sidebar = document.querySelector('.sidebar');
    const historyList = await within(sidebar).findByRole('list', { name: /Q&A history/i });
    expect(within(historyList).getByText('New Question')).toBeInTheDocument();

    // localStorage should be updated
    const stored = storage.getStore().qa_history;
    const parsed = JSON.parse(stored);
    expect(parsed.length).toBe(1);
    expect(parsed[0].question).toBe('New Question');
    expect(parsed[0].answer).toBe('Answer X');
  });

  test('clear history disables when empty and is functional when items exist', async () => {
    // First: empty state
    setupLocalStorageMock({ qa_history: JSON.stringify([]) });
    render(<App />);
    const sidebar1 = document.querySelector('.sidebar');
    const clearBtn1 = within(sidebar1).getByRole('button', { name: /clear all history/i });
    expect(clearBtn1).toBeDisabled();

    // Rerender with items present
    const initialHistory = [
      {
        id: '1',
        question: 'Q1',
        answer: 'A1',
        timestamp: new Date().toISOString(),
      },
    ];
    setupLocalStorageMock({ qa_history: JSON.stringify(initialHistory) });

    // Unmount and remount to use new storage state
    render(<App />);
    const sidebar2 = document.querySelector('.sidebar');
    const clearBtn2 = within(sidebar2).getByRole('button', { name: /clear all history/i });
    expect(clearBtn2).toBeEnabled();

    // Confirm clearing
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    await userEvent.click(clearBtn2);

    // History should now be empty and placeholder visible
    await waitFor(() => {
      expect(within(sidebar2).getByText(/No previous Q&A yet./i)).toBeInTheDocument();
    });
    confirmSpy.mockRestore();
  });

  test('per-item delete removes only that entry from history', async () => {
    const initialHistory = [
      { id: '1', question: 'Q1', answer: 'A1', timestamp: new Date().toISOString() },
      { id: '2', question: 'Q2', answer: 'A2', timestamp: new Date().toISOString() },
    ];
    setupLocalStorageMock({ qa_history: JSON.stringify(initialHistory) });

    render(<App />);

    const sidebar = document.querySelector('.sidebar');
    const list = within(sidebar).getByRole('list', { name: /Q&A history/i });

    // Delete the entry for Q1 using the icon button with aria-label
    const q1Item = within(list).getByText('Q1').closest('li');
    const deleteBtn = within(q1Item).getByRole('button', { name: /delete this history item/i });
    await userEvent.click(deleteBtn);

    // Q1 should be gone; Q2 remains
    expect(within(list).queryByText('Q1')).not.toBeInTheDocument();
    expect(within(list).getByText('Q2')).toBeInTheDocument();
  });

  test('history length is capped at 200 most recent entries', async () => {
    const storage = setupLocalStorageMock({ qa_history: JSON.stringify([]) });
    // Mock a quick resolution for asks
    askQuestionMock.mockImplementation(async (q) => `A for ${q}`);

    render(<App />);
    const textarea = screen.getByLabelText(/question input/i);
    const ask = screen.getByRole('button', { name: /^ask$/i });

    // Add 205 entries
    for (let i = 1; i <= 205; i++) {
      await userEvent.clear(textarea);
      await userEvent.type(textarea, `Question ${i}`);
      await userEvent.click(ask);
      // wait for each to be added to history
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => {
        expect(screen.getByText(`A for Question ${i}`)).toBeInTheDocument();
      });
    }

    const stored = storage.getStore().qa_history;
    const parsed = JSON.parse(stored);
    expect(parsed.length).toBe(200);
    // Most recent should be first and be Question 205
    expect(parsed[0].question).toBe('Question 205');
    // Oldest retained should be Question 6
    expect(parsed[199].question).toBe('Question 6');
  });
});

describe('Retry and Copy interactions', () => {
  let askQuestionMock;
  beforeEach(() => {
    setupLocalStorageMock();
    jest.resetModules();
    askQuestionMock = require('./services/api').askQuestion;
  });

  test('retry after error triggers another request and shows answer', async () => {
    askQuestionMock
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValueOnce('Recovered Answer');

    render(<App />);

    const textarea = screen.getByLabelText(/question input/i);
    await userEvent.type(textarea, 'Will fail then succeed');
    await userEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    // Wait for error alert
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Click retry
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retryBtn);

    // Should show loading then final answer
    await waitFor(() => {
      expect(screen.getByText('Recovered Answer')).toBeInTheDocument();
    });
  });

  test('copy button writes current answer to clipboard and shows Copied! briefly', async () => {
    askQuestionMock.mockResolvedValueOnce('Copy This');
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<App />);

    await userEvent.type(screen.getByLabelText(/question input/i), 'Question for copy');
    await userEvent.click(screen.getByRole('button', { name: /^ask$/i }));

    await waitFor(() => {
      expect(screen.getByText('Copy This')).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /copy answer to clipboard/i });
    await userEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalledWith('Copy This');
    // Button text changes to Copied!
    expect(screen.getByRole('button', { name: /copy answer to clipboard/i })).toHaveTextContent(/copied!/i);
  });
});

describe('API fallback behavior (mock mode)', () => {
  test('is in mock mode when REACT_APP_API_URL is not set and returns placeholder', async () => {
    // Re-import api with env unset
    jest.resetModules();
    delete process.env.REACT_APP_API_URL;
    const api = require('./services/api');
    expect(api.isMock).toBe(true);

    const answer = await api.askQuestion('X');
    expect(answer).toMatch(/placeholder answer for:\s*"X"/i);
  });
});
