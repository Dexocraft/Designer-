import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendlyMessage = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; operationType?: string };
        if (parsed && parsed.error) {
          friendlyMessage = `Database ${parsed.operationType || 'operation'} failed: ${parsed.error}`;
        }
      } catch {
        // Not a JSON-serialized FirestoreErrorInfo
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#ECEFF3] p-6 text-slate-900">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <h1 className="font-display text-lg font-bold text-slate-900">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-slate-600">{friendlyMessage}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="mt-5 min-h-[42px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Return to Studio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
