// Maps each URL to a page, and marks which pages need a login or a particular role.
import { Outlet, Route, Routes } from 'react-router-dom';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { LoadingState } from './components/StatusViews';
import { useAuth } from './context/AuthContext';
import AdminPage from './pages/AdminPage';
import CatalogPage from './pages/CatalogPage';
import CourseDetailPage from './pages/CourseDetailPage';
import CourseEditorPage from './pages/CourseEditorPage';
import CourseStudentsPage from './pages/CourseStudentsPage';
import InstructorDashboardPage from './pages/InstructorDashboardPage';
import LandingPage from './pages/LandingPage';
import LessonPage from './pages/LessonPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboardPage from './pages/StudentDashboardPage';

// The centered column used by every page except the full-width landing page.
function PageContainer() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Outlet />
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();

  // Wait until we know who is logged in, so protected pages don't flash the login form.
  if (loading) return <LoadingState label="Starting up..." />;

  const managers = ['instructor', 'admin'];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Lets keyboard users jump past the navigation. Hidden until focused. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-20 focus:m-2 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        <Routes>
          {/* The landing page is full width, so it sits outside the page container. */}
          <Route path="/" element={<LandingPage />} />

          <Route element={<PageContainer />}>
            {/* Public pages */}
            <Route path="/courses" element={<CatalogPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/courses/:courseId" element={<CourseDetailPage />} />

            {/* Any logged-in user. The server decides who may actually read the lesson. */}
            <Route element={<ProtectedRoute />}>
              <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['student']} />}>
              <Route path="/dashboard" element={<StudentDashboardPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={managers} />}>
              <Route path="/instructor" element={<InstructorDashboardPage />} />
              <Route path="/instructor/courses/new" element={<CourseEditorPage />} />
              <Route path="/instructor/courses/:courseId/edit" element={<CourseEditorPage />} />
              <Route path="/instructor/courses/:courseId/students" element={<CourseStudentsPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
