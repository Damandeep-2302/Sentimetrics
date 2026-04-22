/**
 * Sentimetrics Backend Server
 *
 * Express + Socket.io server running on port 3001.
 * Scrapes upcoming phone data from GSMArena on startup, then emits
 * a single featured phone via Socket.io using a ping-pong index rotation
 * every 5 to 7 seconds.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { scrapeUpcomingPhones } = require('./scraper');
const releasedPhones = require('../src/api/phones.json');


const PORT = 3001;
const FRONTEND_ORIGIN = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Express + Socket.io setup
// ---------------------------------------------------------------------------
const app = express();

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// ---------------------------------------------------------------------------
// In-memory phone cache
// ---------------------------------------------------------------------------
let upcomingPhones = [];

// ---------------------------------------------------------------------------
// REST endpoints
// ---------------------------------------------------------------------------

/**
 * GET /api/health
 * Returns operational status and dataset size for monitoring purposes.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    count: upcomingPhones.length,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/phones
 * Returns the full cached list of upcoming phones.
 */
app.get('/api/phones', (req, res) => {
  res.json({ phones: upcomingPhones });
});

/**
 * GET /api/released-phones
 * Returns the full list of released phones from the shared dataset.
 */
app.get('/api/released-phones', (req, res) => {
  res.json(releasedPhones);
});


// ---------------------------------------------------------------------------
// Ping-pong rotation logic
// Generates a sequence like [0, 1, 2, 3, 4, 3, 2, 1] that cycles indefinitely.
// ---------------------------------------------------------------------------

/**
 * Builds a ping-pong index sequence for the given dataset length.
 * Example for length 5: [0, 1, 2, 3, 4, 3, 2, 1]
 *
 * @param {number} length
 * @returns {number[]}
 */
function buildPingPongSequence(length) {
  if (length <= 1) return [0];
  const forward = Array.from({ length }, (_, i) => i);
  const backward = forward.slice(1, length - 1).reverse();
  return [...forward, ...backward];
}

/**
 * Starts the ping-pong rotation, emitting `featured_upcoming_phone` on each cycle.
 * Interval is randomised between 5000 and 7000 ms per specification.
 */
function startRotation() {
  const sequence = buildPingPongSequence(upcomingPhones.length);
  let position = 0;

  function emitNext() {
    const index = sequence[position % sequence.length];
    const phone = upcomingPhones[index];

    io.emit('featured_upcoming_phone', phone);
    console.log(`[rotation] Emitted index ${index}: "${phone.name}"`);

    position++;
    const nextDelay = 5000 + Math.floor(Math.random() * 2001); // 5000–7000 ms
    setTimeout(emitNext, nextDelay);
  }

  // First emit after 1 second to allow clients to connect
  setTimeout(emitNext, 1000);
}

// ---------------------------------------------------------------------------
// Socket.io connection handler
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  console.log(`[socket.io] Client connected — ID: ${socket.id}`);

  // Send the current phone immediately upon connection
  if (upcomingPhones.length > 0) {
    socket.emit('featured_upcoming_phone', upcomingPhones[0]);
  }

  socket.on('disconnect', () => {
    console.log(`[socket.io] Client disconnected — ID: ${socket.id}`);
  });
});

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

async function init() {
  console.log('[server] Sentimetrics backend initialising...');

  upcomingPhones = await scrapeUpcomingPhones();
  console.log(
    `[server] Dataset ready — ${upcomingPhones.length} upcoming phones loaded.`
  );

  startRotation();

  httpServer.listen(PORT, () => {
    console.log(
      `[server] Express + Socket.io operational at http://localhost:${PORT}`
    );
  });
}

init();
