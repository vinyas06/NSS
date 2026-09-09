import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/index.css";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute, AdminRoute, SuperAdminRoute } from "@/components/ProtectedRoute";

import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import Gallery from "@/pages/Gallery";
import Team from "@/pages/Team";
import Legal from "@/pages/Legal";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { ForgotPassword, ResetPassword } from "@/pages/PasswordPages";
import { Verify, CertificateView } from "@/pages/Verify";
import Profile from "@/pages/Profile";
import PhotoFrame from "@/pages/PhotoFrame";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminMembers from "@/pages/admin/Members";
import AdminEvents from "@/pages/admin/Events";
import AdminGallery from "@/pages/admin/Gallery";
import AdminCertificates from "@/pages/admin/Certificates";
import AdminAttendance from "@/pages/admin/Attendance";
import AdminAccounts from "@/pages/admin/Accounts";
import AdminSiteContent from "@/pages/admin/SiteContent";
import AdminTeam from "@/pages/admin/Team";
import SuperAdmin from "@/pages/admin/SuperAdmin";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/team" element={<Team />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/photo-frame" element={<PhotoFrame />} />
          <Route path="/certificate/:number" element={<CertificateView />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/members" element={<AdminRoute><AdminMembers /></AdminRoute>} />
          <Route path="/admin/events" element={<AdminRoute><AdminEvents /></AdminRoute>} />
          <Route path="/admin/gallery" element={<AdminRoute><AdminGallery /></AdminRoute>} />
          <Route path="/admin/certificates" element={<AdminRoute><AdminCertificates /></AdminRoute>} />
          <Route path="/admin/attendance" element={<AdminRoute><AdminAttendance /></AdminRoute>} />
          <Route path="/admin/accounts" element={<AdminRoute><AdminAccounts /></AdminRoute>} />
          <Route path="/admin/team" element={<AdminRoute><AdminTeam /></AdminRoute>} />
          <Route path="/admin/content" element={<AdminRoute><AdminSiteContent /></AdminRoute>} />
          <Route path="/admin/super" element={<SuperAdminRoute><SuperAdmin /></SuperAdminRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
