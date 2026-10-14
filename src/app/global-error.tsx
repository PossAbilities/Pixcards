"use client";

// Last-resort screen when the root layout itself fails. It replaces the whole
// document, so it can't rely on the app's CSS, fonts or components.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f9fb",
          color: "#191c1e",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          padding: 24,
          textAlign: "center",
        }}
      >
        <main>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Pixcards is having trouble</h1>
          <p style={{ color: "#464555", margin: "0 0 24px" }}>
            Something went wrong on our side. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#4f46e5",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "12px 24px",
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
