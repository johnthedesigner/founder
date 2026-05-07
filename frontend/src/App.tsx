import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { LoginPage } from './components/auth/LoginPage'
import { RegisterPage } from './components/auth/RegisterPage'
import { HomePage } from './components/home/HomePage'
import { LandingPage } from './components/landing/LandingPage'
import { NewProjectPage } from './components/NewProjectPage'
import { ProjectPage } from './components/ProjectPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { useUserStore } from './store/userStore'

function RootRoute() {
  const { user, isLoading, fetchUser } = useUserStore()
  const navigate = useNavigate()

  useEffect(() => {
    void fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!isLoading && user) {
      void navigate('/projects', { replace: true })
    }
  }, [isLoading, user, navigate])

  if (isLoading) return null
  if (user) return null

  return <LandingPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/projects" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/new" element={<NewProjectPage />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
