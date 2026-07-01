import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PersonnelList from './pages/personnel/PersonnelList';
import ProgramGenerator from './pages/programs/ProgramGenerator';
import ProgramEditor from './pages/programs/ProgramEditor';
import UsersAdmin from './pages/admin/UsersAdmin';
import AppLayout from './components/Layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={
        <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
      } />

      <Route path="/personal" element={
        <ProtectedRoute><AppLayout><PersonnelList /></AppLayout></ProtectedRoute>
      } />

      <Route path="/programas" element={
        <ProtectedRoute><AppLayout><ProgramGenerator /></AppLayout></ProtectedRoute>
      } />

      <Route path="/programas/:id" element={
        <ProtectedRoute><AppLayout><ProgramEditor /></AppLayout></ProtectedRoute>
      } />

      <Route path="/admin/usuarios" element={
        <ProtectedRoute rolRequerido="admin"><AppLayout><UsersAdmin /></AppLayout></ProtectedRoute>
      } />
    </Routes>
  );
}
