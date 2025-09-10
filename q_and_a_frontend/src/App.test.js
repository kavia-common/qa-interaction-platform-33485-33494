import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

describe('App UI rendering', () => {
  beforeEach(() => {
    setupLocalStorageMock();
    jest.clearAllMocks();
  });

  test('renders header, form, answer section, and history sidebar', () => {
    render(<App />);

    // Header content
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByText('Q&A Agent')).toBeInTheDocument();
    expect(
      screen.getByText('Ask questions and review your conversation history')
    ).toBeInTheDocument();

    // Form elements
    expect(screen.getByRole('form', { name: /question form/i })).toBeInTheDocument();
    const textarea = screen.getByLabelText(/question input/i);
    expect(textarea).toBeInTheDocument();
    const askButton = screen.getByRole('button', { name: /ask/i });
    expect(askButton).toBeInTheDocument();

    // Answer section and placeholder
    expect(screen.getByText(/agent answer/i)).toBeInTheDocument();
    expect(screen.getByText(/The agent’s answer will appear here./i)).toBeInTheDocument();

    // Sidebar
    expect(screen.getByText(/history/i)).toBeInTheDocument();
    expect(screen.getByText(/No previous Q&A yet./i)).toBeInTheDocument();
    const clearButton = screen.getByRole('button', { name: /clear/i });
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
    const askBtn = screen.getByRole('button', { name: /ask/i });
    const textarea = screen.getByLabelText(/question input/i);

    expect(askBtn).toBeDisabled();
    await userEvent.type(textarea, 'Hello?');
    expect(askBtn).toBeEnabled();
  });

  test('submitting shows loading then displays answer and clears input', async () => {
    askQuestionMock.mockResolvedValueOnce('Mocked answer response');
    render(<App />);

    const textarea = screen.getByLabelText(/question input/i);
    const askBtn = screen.getByRole('button', { name: /ask/i });

    await userEvent.type(textarea, '  What is AI?  ');
    await userEvent.click(askBtn);

    // Button text changes to Asking… and answer shows loading state
    expect(screen.getByRole('button', { name: /asking…/i })).toBeInTheDocument();
    expect(screen.getByText(/Thinking…/i)).toBeInTheDocument();

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
    await userEvent.click(screen.getByRole('button', { name: /ask/i }));

    // Shows loading first
    expect(screen.getByText(/Thinking…/i)).toBeInTheDocument();

    // Then shows error alert
    await waitFor(() => {
      expect(
        screen.getByRole('alert', { name: '' })
      ).toHaveTextContent(/Failed to get an answer/i);
    });

    // Placeholder for answer section should not appear with error (since alert present)
    expect(screen.queryByText(/The agent’s answer will appear here./i)).not.toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /ask/i }));

    expect(screen.getByRole('button', { name: /asking…/i })).toBeInTheDocument();
    expect(screen.getByText(/Thinking…/i)).toBeInTheDocument();

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

    const list = screen.getByRole('list', { name: /Q&A history/i });
    // Ensure both entries present
    expect(within(list).getByText('Prev Q1')).toBeInTheDocument();
    expect(within(list).getByText('Prev Q2')).toBeInTheDocument();

    // Clear button enabled when there is history
    expect(screen.getByRole('button', { name: /clear/i })).toBeEnabled();
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

    const list = screen.getByRole('list', { name: /Q&A history/i });
    await userEvent.click(within(list).getByRole('button', { name: /load this q&a/i }));

    // The textarea should now contain the stored question and the answer section show the stored answer
    expect(screen.getByLabelText(/question input/i)).toHaveValue('Stored Q');
    expect(screen.getByText('Stored A')).toBeInTheDocument();
  });

  test('submitting a new Q&A adds to history and persists via localStorage', async () => {
    const storage = setupLocalStorageMock({ qa_history: JSON.stringify([]) });
    askQuestionMock.mockResolvedValueOnce('Answer X');

    render(<App />);

    await userEvent.type(screen.getByLabelText(/question input/i), 'New Question');
    await userEvent.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => expect(screen.getByText('Answer X')).toBeInTheDocument());

    // History list should now have an item with question text
    const historyList = await screen.findByRole('list', { name: /Q&A history/i });
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
    const clearBtn1 = screen.getByRole('button', { name: /clear/i });
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
    // For simplicity in a single test, we can unmount previous render by rendering again
    render(<App />);
    const clearBtn2 = screen.getByRole('button', { name: /clear/i });
    expect(clearBtn2).toBeEnabled();

    // Confirm clearing
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    await userEvent.click(clearBtn2);

    // History should now be empty and placeholder visible
    await waitFor(() => {
      expect(screen.getByText(/No previous Q&A yet./i)).toBeInTheDocument();
    });
    confirmSpy.mockRestore();
  });
});
