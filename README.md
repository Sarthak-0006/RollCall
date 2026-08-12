# RollCall — QR Attendance App (MERN)

A full-stack attendance tracker with separate teacher and student dashboards.
Teachers create lectures, take attendance manually, or generate a
time-limited QR code for students to self check-in. Students join lectures,
scan the QR code (or type a fallback code), and track their attendance
percentage per lecture.

## Stack

- **MongoDB** + **Mongoose** — data storage
- **Express** + **Node.js** — REST API, JWT auth
- **React** (Vite) + **Tailwind CSS** — frontend, two role-based dashboards
- **html5-qrcode** — camera-based QR scanning in the browser
- **qrcode** (npm) — server-side QR code image generation

## How it fits together

```
attendance-app/
├── backend/     Express API (auth, lectures, sessions, attendance)
└── frontend/    React app (Login/Register, Teacher + Student dashboards)
```

**Core concepts**

- **Lecture** — a course a teacher creates once (e.g. "Data Structures").
  Students join it using a short join code.
- **Session** — a single class meeting under a lecture (e.g. today's class).
  A teacher starts a session, then either marks attendance manually or
  generates a QR code that's valid for a few minutes.
- **Attendance** — one record per student per session, tagged with how it
  was marked (`manual` or `qr`). A student's attendance percentage for a
  lecture is `present sessions ÷ total sessions held`.

## 1. Prerequisites

- Node.js 18+ and npm
- A MongoDB database — either a local install (`mongodb://127.0.0.1:27017`)
  or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and fill in:

- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — any long random string
- `CLIENT_URL` — leave as `http://localhost:5173` for local dev

Start the API:

```bash
npm run dev      # http://localhost:5000, auto-restarts on changes
```

Check it's alive: `GET http://localhost:5000/api/health` → `{"status":"ok"}`

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

By default the frontend calls the API at `http://localhost:5000/api`. To
change that, create `frontend/.env` with:

```
VITE_API_URL=http://localhost:5000/api
```

## 4. Try it out

1. Open `http://localhost:5173/register`, create a **teacher** account.
2. Create a lecture — note the join code shown on its card.
3. Register a second account as a **student** (use a different browser tab
   or an incognito window) and join the lecture with that code.
4. As the teacher, open the lecture and click **Start session**.
5. Generate a QR code — as the student, open the same lecture and scan it
   with **Open camera scanner** (or paste the fallback code shown under
   the QR image). A webcam works fine for testing.
6. Alternatively, mark the student **Present**/**Absent** manually from the
   teacher's roster panel.
7. Check the student dashboard — the lecture card now shows attendance
   percentage; the lecture detail page shows full session history.

## API overview

| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | anyone | create account |
| POST | `/api/auth/login` | anyone | log in |
| POST | `/api/lectures` | teacher | create a lecture |
| GET | `/api/lectures/my` | both | lectures I teach / joined |
| GET | `/api/lectures` | student | browse all lectures |
| POST | `/api/lectures/join` | student | join by `joinCode` or `lectureId` |
| GET | `/api/lectures/:id` | both | lecture detail + sessions |
| POST | `/api/lectures/:id/sessions` | teacher | start a session |
| GET | `/api/sessions/:id` | teacher | roster + attendance status |
| POST | `/api/sessions/:id/qr` | teacher | generate/regenerate QR |
| GET | `/api/sessions/:id/qr` | teacher | current QR status |
| POST | `/api/sessions/:id/manual` | teacher | mark students present/absent |
| POST | `/api/sessions/:id/close` | teacher | close roll call |
| POST | `/api/attendance/scan` | student | mark self present via QR token |
| GET | `/api/attendance/my-summary` | student | % per lecture, all lectures |
| GET | `/api/attendance/lecture/:id` | student | history for one lecture |
| GET | `/api/attendance/lecture/:id/report` | teacher | all students' stats |

## Notes & possible next steps

- QR tokens are short-lived (2–15 min, teacher's choice) and single-use per
  student. There's no rate-limiting on the manual-code-entry fallback yet —
  worth adding (e.g. `express-rate-limit`) before using this beyond a
  classroom demo.
- Attendance percentage is calculated against *all* sessions ever held for
  a lecture, even ones before a student joined. If you need per-student
  enrollment dates factored in, that's a small change to the aggregation
  in `attendanceController.js`.
- Camera scanning needs HTTPS (or `localhost`) per browser security rules —
  fine for local dev, but you'll need a TLS certificate when deploying.
- No password-reset flow yet — only register/login.
