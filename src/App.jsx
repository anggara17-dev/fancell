import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Kasir from './pages/Kasir'
import MasterBarang from './pages/MasterBarang'
import LabaRugi from './pages/LabaRugi'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/kasir" element={<ProtectedRoute><Kasir /></ProtectedRoute>} />
          <Route path="/barang" element={<ProtectedRoute><MasterBarang /></ProtectedRoute>} />
          <Route path="/laba-rugi" element={<ProtectedRoute allowedRoles={['owner']}><LabaRugi /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
