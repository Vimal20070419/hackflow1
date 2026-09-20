# HackFlow — Hackathon Digital Registration & Barcode System

**HackFlow** is a complete, production-ready, full-stack digital registration and participant access management system built for offline hackathons. It replaces slow, error-prone manual paper/spreadsheet verification with a fast, barcode-driven workflow utilizing smartphone camera scanning, dual registration desk isolation, pre-printed physical barcode wristbands, and participant team access.

---

## 🌟 Key Capabilities & Features

1. **Dual Isolated Registration Desks (Desk 1 & Desk 2)**:
   - Dedicated credentials for Desk 1 (`desk1@hackathon.org`) and Desk 2 (`desk2@hackathon.org`).
   - Isolated Socket.IO real-time channels: scans performed by Mobile Scanner A pair strictly to Desk 1; Mobile Scanner B pairs strictly to Desk 2.
   - Synchronized central MongoDB database with live statistics and recent audit feeds.

2. **Mobile Phone as Wireless Barcode Camera Scanner**:
   - The registration desk laptop displays a dynamic **Pairing Barcode** and numeric pairing code.
   - Mobile phones connect instantly over Wi-Fi without entering credentials.
   - Camera-based scanning using high-speed browser camera API (`Html5Qrcode` with 1D Code-128/Code-39 barcode decoders).
   - Web Audio synthesizer chimes + haptic vibration feedback.
   - Instant push to the paired laptop dashboard.

3. **Composite Team Identification (No Name Collisions)**:
   - Resolves the major offline hackathon challenge where different colleges register under identical team names (e.g. `VisionX`, `Innovix`, `Tech Titans`).
   - Hierarchical composite search and indexing: `College Name` → `Team Name` → `Team Members`.
   - Makes accidental misallocation impossible.

4. **100 Pre-Printed Physical Barcode Wristband Pool**:
   - Supports pre-printed physical wristbands (`BC-00001` through `BC-00100`).
   - Strict atomic allocation prevention: if an allocated barcode is scanned again, the system immediately blocks assignment and displays who it belongs to, their college, and the allocation timestamp.
   - Printable 1D Barcode Wristband sheet for organizers rendered with `jsbarcode`.

5. **Designated Team Leader Assignment**:
   - Staff selects one verified member from the roster as the active Team Leader.
   - Team Leader status is saved permanently to the database and displayed on wristband credentials.

6. **Participant Wristband Access**:
   - Participants scan their wristband barcode or navigate to `/portal?barcode=BC-XXXXX`.
   - Direct authenticated team session protected by Team Leader's phone number.
   - Displays verified members, designated team leader, college, and domain track.

7. **Domain-Tailored Problem Statement Selection**:
   - Displays problem statements tailored specifically to the team's registered track (*Gen AI & AI*, *Web development & App development*, *Machine Learning and AI*, *Cloud Computing*).
   - Teams lock in their problem statement with one click, automatically updating the central database.

8. **Excel / CSV Dataset Ingestion**:
   - Built-in parser (`xlsx`) that groups individual member entries into teams by College + Team Name.
   - Ships pre-seeded with all 56 teams and ~100 participants from the official event registration sheets!

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, JsBarcode, Lucide Icons, Canvas Confetti |
| **Backend** | Node.js, Express, TypeScript (`tsx`), CORS, Multer, xlsx |
| **Database** | MongoDB & Mongoose (with atomic updates & partial unique indexes) |
| **Real-time** | WebSockets / Socket.IO (room-based desk isolation) |
| **Authentication** | JWT (JSON Web Tokens) & Bcrypt password hashing |
| **Barcode Scanning** | HTML5 Camera Barcode Detection (`Html5Qrcode`) with 1D Code-128 support |
| **Design System** | Custom Glassmorphic Dark Event UI, Google Fonts (*Outfit*, *Inter*, *JetBrains Mono*) |

---

## 🔑 Default Credentials

| Role | Email | Password | Access / Dashboard |
|---|---|---|---|
| **Registration Desk 1** | `desk1@hackathon.org` | `desk1pass123` | Desk 1 Dashboard |
| **Registration Desk 2** | `desk2@hackathon.org` | `desk2pass123` | Desk 2 Dashboard |
| **Admin Lead** | `admin@hackathon.org` | `admin123` | Master Admin Access |
| **Mobile Scanner** | *Zero-login pairing* | *Scan Barcode or enter pairing code* | Wireless Mobile Camera |
| **Participant** | *Zero-login wristband* | *Scan wristband Barcode (e.g. `BC-00001`)* | Team & Problem Portal |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **MongoDB**: Local MongoDB running on `mongodb://127.0.0.1:27017`

### 1. Clone & Install Dependencies

```bash
# In the project root
cd backend
npm install

cd ../frontend
npm install
```

### 2. Seed the Database
Populates the 100 pre-printed physical Barcode wristbands (`BC-00001` to `BC-00100`), staff accounts, and all 56 real hackathon teams:

```bash
cd backend
npm run seed
```

### 3. Start Both Services

**Terminal 1 (Backend API & Socket Server):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Vite Frontend):**
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.
