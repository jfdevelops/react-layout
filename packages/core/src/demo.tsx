import React from 'react'
import ReactDOM from 'react-dom/client'

import { ViewMap } from './ViewMap'

function Demo() {
  return (
    <main
      style={{
        fontFamily: 'Georgia, serif',
        margin: '0 auto',
        maxWidth: 960,
        padding: '3rem 1.5rem',
      }}
    >
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', marginBottom: '1rem' }}>view-map</h1>
      <p style={{ lineHeight: 1.6, marginBottom: '1.5rem' }}>
        Local demo for the React library build. The exported component is a typed iframe wrapper
        with sensible defaults and React 18-compatible peer dependencies.
      </p>
      <ViewMap
        srcDoc={`
          <style>
            body {
              margin: 0;
              display: grid;
              place-items: center;
              min-height: 100vh;
              background:
                radial-gradient(circle at top, #d9efe3, transparent 45%),
                linear-gradient(180deg, #f8f2dc, #d7e7f2);
              font-family: Georgia, serif;
              color: #1b365d;
            }
            .card {
              background: rgba(255, 255, 255, 0.78);
              border: 1px solid rgba(27, 54, 93, 0.15);
              border-radius: 16px;
              box-shadow: 0 18px 48px rgba(27, 54, 93, 0.14);
              padding: 24px 28px;
              text-align: center;
            }
          </style>
          <div class="card">
            <h2 style="margin: 0 0 12px;">Map Preview</h2>
            <p style="margin: 0;">Replace src or srcDoc with your actual embed target.</p>
          </div>
        `}
      />
    </main>
  )
}

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>,
)
