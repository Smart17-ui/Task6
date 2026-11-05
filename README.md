# Lantern: an Online Learning Platform

Lantern is a full-stack app where instructors publish courses and students enroll, study lessons, and track their progress.

## Architecture

Lantern has three parts that run separately:

```
 Browser                      API server                     Database
 React + React Router  --->   Node.js + Express      --->    MongoDB
 (/client)            JSON    (/server)            Mongoose  (Atlas in production)
                      + JWT
```

1. **The React client** shows the pages and calls the API over HTTP. It holds no business rules that matter for security.
2. **The Express API** handles each request in the same order: **route → auth middleware → role check → validation → controller → model**. Any error is passed to one error handler, which returns JSON like `{ "message": "..." }`.
3. **MongoDB** stores four collections: `users`, `courses`, `lessons`, and `enrollments`.

**How login works:** when a user logs in, the API returns a signed token (a JWT). The client saves it and sends it with every request in an `Authorization: Bearer <token>` header. The API verifies the token and loads the user from the database each time, so deleting a user or changing their role takes effect immediately.

**Data model:**

| Model | Key fields |
| --- | --- |
| **User** | name, email, password (bcrypt hash), role |
| **Course** | title, description, category, thumbnailUrl, level, instructor, isPublished. `lessons` is a virtual field, sorted by order |
| **Lesson** | course, title, content (markdown), videoUrl, order |
| **Enrollment** | student, course, completedLessons[], progressPercent, lastAccessedLesson, lastAccessedAt, completedAt, activity[] |

## Features

**Visitors** see a landing page at `/` with the newest courses and topics, and can browse the full catalogue at `/courses`.

**Students** can browse and search the catalogue, enroll and unenroll, read lessons and watch videos, mark lessons complete, and pick up where they left off. Their dashboard shows courses in progress, completed courses, and recent activity.

**Instructors** can create, edit, publish, and delete their own courses, and add, edit, reorder, and delete lessons with a markdown preview. Their dashboard shows enrollment counts and average progress, and they can see each student's progress.

**Admins** can change user roles, delete users, and manage every course.

**Throughout the app:**

- Lesson content is only sent to enrolled students and the people managing the course. The public outline never includes it.
- Roles are checked on the server as well as in the client.
- Every page has loading, empty, and error states, and forms show errors next to the relevant field.
- Progress stays correct when an instructor adds or deletes a lesson, because all enrolled students are recalculated.

## Folder structure

```
client/                   React app (Vite + Tailwind CSS)
  src/
    api/client.js         fetch wrapper: adds the token, handles errors
    components/           reusable UI (ProgressBar, CourseCard, LessonManager...)
    context/AuthContext   the logged-in user, available to every component
    hooks/useFetch.js     loads data and tracks loading and error states
    pages/                one file per page
    App.jsx               the list of routes
server/                   Express API
  src/
    config/db.js          MongoDB connection
    controllers/          what each endpoint does
    middleware/           auth, role checks, validation, error handling
    models/               Mongoose schemas
    routes/               URLs and their validation rules
    services/             progress calculations
    seed/                 sample data script
    utils/                shared helpers, including who may access a course
    app.js                configures Express
    server.js             starts the server
  tests/                  Jest + Supertest API tests
```

## Local setup

You need [Node.js](https://nodejs.org) 22 or newer, and a MongoDB database: either a free [Atlas](https://www.mongodb.com/cloud/atlas) cluster (see [step 1 of Deployment](#1-create-the-database-on-mongodb-atlas)) or [MongoDB Community Server](https://www.mongodb.com/try/download/community) installed locally.

**1. Set up the API** (in a terminal):

```bash
cd server
npm install
cp .env.example .env     # on Windows Command Prompt: copy .env.example .env
```

Open `server/.env`, set `MONGODB_URI` if you aren't using a local database, and replace `JWT_SECRET` with the output of:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**2. Add the sample data and start the API.** Seeding deletes everything in the database it points at, so check `MONGODB_URI` first.

```bash
npm run seed
npm run dev              # http://localhost:4000
```

**3. Start the client** (in a second terminal):

```bash
cd client
npm install
cp .env.example .env     # on Windows Command Prompt: copy .env.example .env
npm run dev              # http://localhost:5173
```

Open http://localhost:5173 and log in with a test account.

## Test accounts

`npm run seed` creates these accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | Admin123! |
| Instructor | instructor@example.com | Instructor123! |
| Student | student@example.com | Student123! |
| Student (second, for realistic averages) | riley@example.com | Student123! |

## Running the tests

```bash
cd server
npm test
```

The tests cover authentication, enrollment, access to lesson content, and progress. They use a temporary in-memory MongoDB, so they need no setup and never touch your data. The first run downloads a MongoDB binary of about 800 MB, so it needs a stable connection and can take several minutes. Later runs reuse it.

Run them with `npm test` rather than `npx jest`. The script turns on Node's `--experimental-vm-modules` flag, which the MongoDB driver needs inside Jest's sandbox. Without it, every test fails with `Missing required sub-document 'driver'`.

## API endpoints

All paths start with `/api`. "Auth" means the request needs an `Authorization: Bearer <token>` header. Errors look like `{ "message": "...", "errors": [{ "field": "...", "message": "..." }] }`, where `errors` only appears for validation failures.

### Auth

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create a student or instructor account |
| POST | `/auth/login` | Public | Log in and receive a token |
| GET | `/auth/me` | Auth | Get the current user |

### Courses

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/courses` | Public | Published courses. Query: `search`, `category`, `level`, `page`, `limit` |
| GET | `/courses/categories` | Public | Categories of published courses |
| GET | `/courses/managed` | Instructor, admin | Own courses with stats (admins get all courses) |
| GET | `/courses/:id` | Public* | Course details, lesson outline, and your enrollment |
| POST | `/courses` | Instructor, admin | Create a course (always starts as a draft) |
| PUT | `/courses/:id` | Owner, admin | Update or publish a course |
| DELETE | `/courses/:id` | Owner, admin | Delete a course, its lessons, and its enrollments |
| GET | `/courses/:id/students` | Owner, admin | Enrolled students and their progress |

\* Drafts are only visible to the owner, admins, and students who enrolled before the course was unpublished.

### Lessons

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/courses/:courseId/lessons` | Public* | Lesson outline, without content |
| GET | `/courses/:courseId/lessons/:lessonId` | Enrolled, owner, admin | Full lesson with content |
| POST | `/courses/:courseId/lessons` | Owner, admin | Add a lesson to the end of the course |
| PUT | `/courses/:courseId/lessons/reorder` | Owner, admin | Set the order. Body: `{ "lessonIds": [...] }` |
| PUT | `/courses/:courseId/lessons/:lessonId` | Owner, admin | Update a lesson |
| DELETE | `/courses/:courseId/lessons/:lessonId` | Owner, admin | Delete a lesson and recalculate progress |

### Enrollments

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/enrollments` | Student | Enroll. Body: `{ "courseId": "..." }` |
| GET | `/enrollments/me` | Student | Your courses with progress |
| DELETE | `/enrollments/:courseId` | Student | Leave a course (deletes your progress in it) |

### Progress

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/progress/activity` | Student | Your 10 most recent activity items |
| GET | `/progress/:courseId` | Enrolled student | Progress and the lesson to continue with |
| PUT | `/progress/:courseId/lessons/:lessonId/access` | Enrolled student | Record the lesson you last opened |
| POST | `/progress/:courseId/lessons/:lessonId/complete` | Enrolled student | Mark a lesson complete |
| DELETE | `/progress/:courseId/lessons/:lessonId/complete` | Enrolled student | Undo marking a lesson complete |

### Users

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/users` | Admin | List all users |
| PUT | `/users/:id/role` | Admin | Change a user's role. Body: `{ "role": "..." }` |
| DELETE | `/users/:id` | Admin | Delete a user, their courses, and their enrollments |

### Health

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Check that the API is running |

## Deployment

This setup uses MongoDB Atlas for the database, Render for the API, and Vercel or Netlify for the client. All three have free tiers, though plans and screens change over time. Push this project to GitHub first, because Render, Vercel, and Netlify all deploy from a repository.

### 1. Create the database on MongoDB Atlas

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, add a database user with a strong password.
3. Under **Network Access**, allow `0.0.0.0/0`. Render's free tier has no fixed IP address, so this is required, and it makes your database password your main protection.
4. Click **Connect → Drivers** and copy the connection string. Add a database name before the `?`:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/learning-platform?retryWrites=true&w=majority
   ```

### 2. Deploy the API on Render

1. On [render.com](https://render.com), choose **New → Web Service** and connect your repository.
2. Use these settings:

   | Setting | Value |
   | --- | --- |
   | Root Directory | `server` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Health Check Path | `/api/health` |

3. Add these environment variables:

   | Name | Value |
   | --- | --- |
   | `MONGODB_URI` | your Atlas connection string |
   | `JWT_SECRET` | a new long random value (don't reuse your local one) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | `http://localhost:5173` for now (updated in step 4) |

4. Deploy, then open `https://YOUR-API.onrender.com/api/health`. You should see `{"status":"ok"}`.

Free Render services go to sleep when idle, so the first request after a quiet period can take up to a minute.

### 3. Deploy the client

**On Vercel:** choose **Add New → Project**, import the repository, set **Root Directory** to `client`, and add the environment variable below. Vercel detects Vite, and the included `client/vercel.json` makes page links work on reload.

**On Netlify:** choose **Add new site → Import an existing project**, set **Base directory** to `client`, **Build command** to `npm run build`, and **Publish directory** to `client/dist`, then add the environment variable below. The included `client/public/_redirects` makes page links work on reload.

| Name | Value |
| --- | --- |
| `VITE_API_URL` | `https://YOUR-API.onrender.com/api` |

Vite reads this value during the build, so redeploy the client if you change it.

### 4. Connect them

Back on Render, set `CLIENT_URL` to your client's address, such as `https://your-app.vercel.app`, with no trailing slash. Without this, the browser blocks the client's API calls with a CORS error.

### 5. Add your data

**For a demo,** run the seed from your own computer. It deletes everything in the target database, so only do this on a new, empty one:

1. Temporarily set `MONGODB_URI` in `server/.env` to your Atlas connection string.
2. Run `npm run seed` in `server`.
3. Set `MONGODB_URI` back.

**For real users, don't seed.** The test account passwords are public in this README, including the admin's. Instead, register your own account on the live site, then open the `users` collection in Atlas (**Browse Collections**) and change that account's `role` to `admin`.

## Design decisions and limits

- **Tokens are stored in `localStorage`.** This is simple and works when the client and API are on different domains, but a cross-site scripting bug could expose a token. React escapes text and lesson markdown is rendered without raw HTML, which reduces that risk.
- **Logging out happens in the browser.** The client deletes its token, but the token itself stays valid until it expires (7 days by default). Changing `JWT_SECRET` logs everyone out.
- **Unpublishing a course doesn't remove access.** It leaves the catalogue, but students already enrolled can keep studying it.
- **Not included:** password reset and email verification, because they need an email service.
