'use strict';

const express      = require('express');
const helmet       = require('helmet');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const crypto       = require('crypto');
const fs           = require('fs');
const path         = require('path');

/* ─── Config ─────────────────────────────────────────── */
require('dotenv').config?.();

const PORT           = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'X9$kL2@mNpQ7#wR4';
const ADMIN_ROUTE    = process.env.ADMIN_ROUTE    || '/vault-x9k2';
const SESSION_HOURS  = parseInt(process.env.SESSION_HOURS || '12', 10);
const DATA_FILE      = path.join(__dirname, 'data', 'portfolio.json');

/* ─── Express Setup ──────────────────────────────────── */
const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.static('public', { maxAge: '1h' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Wait 15 minutes.' },
});

/* ─── Session Store ──────────────────────────────────── */
const sessions = new Map();

function createToken() {
  const token = crypto.randomBytes(48).toString('base64url');
  const expires = Date.now() + SESSION_HOURS * 3600_000;
  sessions.set(token, { expires });
  return token;
}

function cleanSessions() {
  const now = Date.now();
  for (const [tok, sess] of sessions) {
    if (sess.expires < now) sessions.delete(tok);
  }
}
setInterval(cleanSessions, 600_000);

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  const sess = sessions.get(token);
  if (!sess || sess.expires < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired' });
  }
  next();
}

/* ─── Data Layer ─────────────────────────────────────── */
function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[DATA] Read error:', e.message);
  }
  return seedData();
}

function writeData(data) {
  ensureDataDir();
  data.meta = { updatedAt: new Date().toISOString() };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

function uid() {
  return crypto.randomBytes(12).toString('hex');
}

/* ─── Seed Data ──────────────────────────────────────── */
function seedData() {
  const data = {
    meta: { updatedAt: new Date().toISOString() },
    profile: {
      name: "Arjun Mehta",
      title: "Senior Full-Stack Developer",
      subtitle: "I architect scalable web platforms and craft pixel-perfect interfaces.",
      bio: "With 6+ years shipping production code for startups and enterprises, I specialise in React/Next.js front-ends backed by Node.js micro-services. I obsess over performance budgets, accessibility, and clean architecture. Outside work I mentor junior developers, contribute to OSS, and write about systems design.",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=600&fit=crop&crop=face",
      email: "arjun@example.dev",
      phone: "+91 98765 43210",
      location: "Bangalore, India",
      resume: "#",
      social: {
        github:    "https://github.com",
        linkedin:  "https://linkedin.com/in/arjunmehta",
        twitter:   "https://twitter.com",
        instagram: "https://instagram.com",
        dribbble:  ""
      }
    },
    skills: [
      { id:"s01", name:"React / Next.js", level:95, category:"Frontend",  icon:"ri-reactjs-line" },
      { id:"s02", name:"TypeScript",      level:92, category:"Frontend",  icon:"ri-code-box-fill" },
      { id:"s03", name:"Tailwind CSS",    level:90, category:"Frontend",  icon:"ri-palette-fill" },
      { id:"s04", name:"Node.js",         level:90, category:"Backend",   icon:"ri-server-fill" },
      { id:"s05", name:"PostgreSQL",      level:85, category:"Backend",   icon:"ri-database-2-fill" },
      { id:"s06", name:"MongoDB",         level:82, category:"Backend",   icon:"ri-database-fill" },
      { id:"s07", name:"GraphQL",         level:80, category:"Backend",   icon:"ri-share-circle-fill" },
      { id:"s08", name:"Docker / K8s",    level:78, category:"DevOps",    icon:"ri-ship-2-fill" },
      { id:"s09", name:"AWS",             level:76, category:"DevOps",    icon:"ri-cloud-fill" },
      { id:"s10", name:"CI/CD Pipelines", level:82, category:"DevOps",    icon:"ri-git-merge-fill" },
      { id:"s11", name:"Figma",           level:75, category:"Design",    icon:"ri-pencil-ruler-2-fill" },
      { id:"s12", name:"Redis / Queues",  level:74, category:"Backend",   icon:"ri-flashlight-fill" },
    ],
    projects: [
      {
        id:"p01",
        title:"CloudSync SaaS Platform",
        description:"End-to-end SaaS with multi-tenant auth, real-time collaboration, Stripe billing, and an analytics dashboard serving 50k+ MAU.",
        image:"https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop",
        url:"https://example.com",
        github:"https://github.com",
        tech:["Next.js","Node.js","PostgreSQL","Redis","Stripe"],
        category:"Full-Stack",
        featured:true,
        date:"2024-05-12"
      },
      {
        id:"p02",
        title:"HealthTrack Mobile App",
        description:"Cross-platform health & fitness tracker with workout plans, nutrition logging, and Apple Health / Google Fit integration.",
        image:"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=500&fit=crop",
        url:"https://example.com",
        github:"https://github.com",
        tech:["React Native","TypeScript","Firebase","GraphQL"],
        category:"Mobile",
        featured:true,
        date:"2024-03-20"
      },
      {
        id:"p03",
        title:"DevFlow CI/CD Dashboard",
        description:"Internal engineering dashboard aggregating GitHub, Jenkins, and Datadog metrics into a single real-time view.",
        image:"https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop",
        url:"",
        github:"https://github.com",
        tech:["React","D3.js","Node.js","WebSockets"],
        category:"Full-Stack",
        featured:true,
        date:"2024-01-15"
      },
      {
        id:"p04",
        title:"E-Commerce Micro-Frontends",
        description:"Module-federated storefront splitting catalog, cart, and checkout into independently deployable micro-frontends.",
        image:"https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop",
        url:"https://example.com",
        github:"https://github.com",
        tech:["React","Webpack 5","Node.js","MongoDB","Docker"],
        category:"Full-Stack",
        featured:false,
        date:"2023-11-08"
      },
      {
        id:"p05",
        title:"AI Content Generator",
        description:"GPT-powered copywriting tool with prompt templates, tone control, brand-voice fine-tuning, and team collaboration.",
        image:"https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=500&fit=crop",
        url:"https://example.com",
        github:"",
        tech:["Next.js","OpenAI API","Prisma","Vercel"],
        category:"AI / ML",
        featured:true,
        date:"2024-06-01"
      },
      {
        id:"p06",
        title:"Real-Time Chat System",
        description:"Scalable chat infrastructure supporting 10k concurrent connections with typing indicators, read receipts, and file sharing.",
        image:"https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=800&h=500&fit=crop",
        url:"",
        github:"https://github.com",
        tech:["Socket.io","React","Node.js","Redis","S3"],
        category:"Full-Stack",
        featured:false,
        date:"2023-08-22"
      }
    ],
    experience: [
      { id:"e01", role:"Senior Full-Stack Developer", company:"TechNova Inc.", period:"2022 – Present", description:"Lead a 6-person squad building a SaaS analytics platform. Reduced API latency 40% with Redis caching and query optimisation." },
      { id:"e02", role:"Full-Stack Developer", company:"PixelForge Studio", period:"2020 – 2022", description:"Delivered 12+ client projects ranging from e-commerce to data dashboards. Introduced CI/CD pipelines cutting deploy time by 60%." },
      { id:"e03", role:"Frontend Developer", company:"StartUp Labs", period:"2018 – 2020", description:"Built responsive SPAs in React, implemented design systems, and improved Lighthouse scores from 55 to 95+." }
    ],
    testimonials: [
      { id:"t01", name:"Sarah Chen", role:"CTO, TechNova", text:"Arjun is the rare engineer who thinks in systems. He delivered our entire analytics pipeline ahead of schedule and under budget.", avatar:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" },
      { id:"t02", name:"David Park", role:"Product Manager, PixelForge", text:"Working with Arjun was a game-changer. His attention to performance and UX details elevated every project he touched.", avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" },
      { id:"t03", name:"Priya Sharma", role:"Design Lead, StartUp Labs", text:"The best developer I've collaborated with. He translates designs into pixel-perfect, accessible, and performant code every time.", avatar:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" }
    ]
  };
  writeData(data);
  return data;
}

/* ─── Public API ─────────────────────────────────────── */
app.get('/api/portfolio', (_req, res) => {
  res.json(readData());
});

/* ─── Auth API ───────────────────────────────────────── */
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = createToken();
  res.json({ token, expiresIn: SESSION_HOURS * 3600 });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  sessions.delete(token);
  res.json({ success: true });
});

app.get('/api/auth/verify', requireAuth, (_req, res) => {
  res.json({ valid: true });
});

/* ─── Admin CRUD ─────────────────────────────────────── */

// Profile
app.put('/api/admin/profile', requireAuth, (req, res) => {
  const data = readData();
  data.profile = { ...data.profile, ...req.body };
  writeData(data);
  res.json({ success: true, profile: data.profile });
});

// Generic CRUD factory
function crudRoutes(resource) {
  // Create
  app.post(`/api/admin/${resource}`, requireAuth, (req, res) => {
    const data = readData();
    const item = { id: uid(), ...req.body, createdAt: new Date().toISOString() };
    data[resource].push(item);
    writeData(data);
    res.status(201).json({ success: true, item });
  });

  // Update
  app.put(`/api/admin/${resource}/:id`, requireAuth, (req, res) => {
    const data = readData();
    const idx = data[resource].findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    data[resource][idx] = { ...data[resource][idx], ...req.body, updatedAt: new Date().toISOString() };
    writeData(data);
    res.json({ success: true, item: data[resource][idx] });
  });

  // Delete
  app.delete(`/api/admin/${resource}/:id`, requireAuth, (req, res) => {
    const data = readData();
    const len = data[resource].length;
    data[resource] = data[resource].filter(x => x.id !== req.params.id);
    if (data[resource].length === len) return res.status(404).json({ error: 'Not found' });
    writeData(data);
    res.json({ success: true });
  });

  // Reorder
  app.put(`/api/admin/${resource}-order`, requireAuth, (req, res) => {
    const data = readData();
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const map = new Map(data[resource].map(x => [x.id, x]));
    data[resource] = ids.map(id => map.get(id)).filter(Boolean);
    writeData(data);
    res.json({ success: true });
  });
}

crudRoutes('skills');
crudRoutes('projects');
crudRoutes('experience');
crudRoutes('testimonials');

/* ─── Admin Page ─────────────────────────────────────── */
app.get(ADMIN_ROUTE, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

/* ─── 404 ────────────────────────────────────────────── */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

/* ─── Start ──────────────────────────────────────────── */
ensureDataDir();
if (!fs.existsSync(DATA_FILE)) seedData();

app.listen(PORT, () => {
  console.log(`
  ┌──────────────────────────────────────┐
  │                                      │
  │   ✦  Portfolio   → http://localhost:${PORT}  │
  │   ✦  Admin       → http://localhost:${PORT}${ADMIN_ROUTE}  │
  │                                      │
  │   Password: ${ADMIN_PASSWORD}       │
  │                                      │
  └──────────────────────────────────────┘
  `);
});
