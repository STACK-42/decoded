import { Component, type ReactNode } from "react";

/**
 * Catches a page or lesson chunk that failed to load. Each deploy renames the
 * chunks, so a tab left open across one can ask for files that are gone, and
 * reloading fetches the current ones.
 */
export class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="border border-border p-8 text-center">
        <p className="font-display text-2xl font-bold mb-2">This page didn't load.</p>
        <p className="font-body text-muted-foreground mb-5">
          The site may have just updated, or your connection dropped. Your progress is safe.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-foreground px-5 py-3 font-mono text-xs uppercase tracking-widest text-background transition-opacity hover:opacity-85"
        >
          Reload
        </button>
      </div>
    );
  }
}
