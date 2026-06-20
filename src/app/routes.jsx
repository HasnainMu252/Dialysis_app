import { Navigate, Route, Routes } from 'react-router-dom';
import { ROLES, roleHome } from '../constants';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import Login from '../pages/auth/Login';
import AdminDashboard from '../pages/admin/AdminDashboard';
import FrontDeskDashboard from '../pages/frontDesk/FrontDeskDashboard';
import NurseDashboard from '../pages/nurse/NurseDashboard';
import TechnicianDashboard from '../pages/technician/TechnicianDashboard';
import SocialWorkerDashboard from '../pages/socialWorker/SocialWorkerDashboard';
import BillerDashboard from '../pages/biller/BillerDashboard';
import BillerDoctorRounds from '../pages/biller/BillerDoctorRounds';
import UserManagement from '../pages/admin/UserManagement';
import InsuranceDashboard from '../pages/insurance/InsuranceDashboard';
import PatientDashboard from '../pages/patient/PatientDashboard';
import PatientList from '../pages/patients/PatientList';
import PatientCreate from '../pages/patients/PatientCreate';
import PatientDetails from '../pages/patients/PatientDetails';
import ScheduleCreate from '../pages/scheduling/ScheduleCreate';
import ScheduleList from '../pages/scheduling/ScheduleList';
import ChairList from '../pages/chairs/ChairList';
import ChairClearance from '../pages/chairs/ChairClearance';
import SessionList from '../pages/sessions/SessionList';
import Claims from '../pages/billing/Claims';
import TreatmentWorkflow from '../pages/workflow/TreatmentWorkflow';
import DashboardReports from '../pages/reports/DashboardReports';
import MenuPage from '../pages/menu/MenuPage';
import Notifications from '../pages/notifications/Notifications';
import DoctorDashboard from '../pages/doctor/DoctorDashboard';

const patientViewRoles = [
  ROLES.ADMIN,
  ROLES.FRONT_DESK,
  ROLES.NURSE,
  ROLES.BILLER,
  ROLES.INSURANCE_PERSON,
  ROLES.SOCIAL_WORKER,
  ROLES.TECHNICIAN,
  ROLES.DOCTOR,
];

const patientCreateRoles = [ROLES.ADMIN, ROLES.FRONT_DESK, ROLES.BILLER, ROLES.INSURANCE_PERSON];
const scheduleViewRoles = [...patientViewRoles];

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={roleHome[user?.role] || '/login'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/menu" element={<MenuPage />} />

          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.BILLER, ROLES.DOCTOR]} />}>
            <Route path="/reports" element={<DashboardReports />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.FRONT_DESK]} />}>
            <Route path="/front-desk" element={<FrontDeskDashboard />} />
            <Route path="/front-desk/patients" element={<PatientList />} />
            <Route path="/front-desk/scheduling" element={<ScheduleCreate />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={patientCreateRoles} />}>
            <Route path="/patients/new" element={<PatientCreate />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={patientViewRoles} />}>
            <Route path="/patients" element={<PatientList />} />
            <Route path="/patients/:id" element={<PatientDetails />} />
            <Route path="/notifications" element={<Notifications />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={scheduleViewRoles} />}>
            <Route path="/schedules" element={<ScheduleList />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.NURSE, ROLES.TECHNICIAN]} />}>
            <Route path="/nurse" element={<NurseDashboard />} />
            <Route path="/sessions" element={<SessionList />} />
            <Route path="/workflow" element={<TreatmentWorkflow />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.NURSE]} />}>
            <Route path="/technician" element={<TechnicianDashboard />} />
            <Route path="/chairs" element={<ChairList />} />
            <Route path="/technician/maintenance" element={<ChairClearance />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SOCIAL_WORKER]} />}>
            <Route path="/social-worker" element={<SocialWorkerDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.BILLER]} />}>
            <Route path="/biller" element={<BillerDashboard />} />
            <Route path="/biller/claims" element={<Claims />} />
            <Route path="/biller/doctor-rounds" element={<BillerDoctorRounds />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.INSURANCE_PERSON]} />}>
            <Route path="/insurance" element={<InsuranceDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.DOCTOR]} />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/patients/:id" element={<PatientDetails />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={[ROLES.PATIENT]} />}>
            <Route path="/patient" element={<PatientDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
