'use client';

// ─────────────────────────────────────────────────────────────────────────────
// AI Chatbot — Sentimetrics
//
// This page embeds the Sentimetrics conversational AI advisor hosted on Zapier.
// The interface spans the full available viewport height beneath the site header.
//
// For collaborators wishing to build a native chatbot instead:
//  1. Configure an LLM API route under app/api/ (Gemini, OpenAI, or similar)
//  2. Maintain a conversation history array in useState
//  3. Extract user preferences from the dialogue and pass them to
//     getRecommendations() from '@/src/utils/engine.js' to surface top matches
//  4. Store your API key in .env.local (never commit it to version control)
// ─────────────────────────────────────────────────────────────────────────────

import Script from 'next/script';

export default function Chatbot() {
  return (
    <div style={{ 
      width: '100%', 
      minHeight: 'calc(100vh - 64px)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '40px 24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1000px',
        height: '75vh',
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border)',
        overflow: 'hidden'
      }}>
        <Script 
          type="module" 
          src="https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js" 
          strategy="lazyOnload"
        />
        <zapier-interfaces-chatbot-embed 
          is-popup="false" 
          chatbot-id="cmngc0d6i002w3ncsli612e08"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
