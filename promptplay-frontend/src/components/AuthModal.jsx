import { useState } from 'react'
import axios from 'axios'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Loader2, LogIn, UserPlus, Trophy } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function AuthModal({ onAuthSuccess }) {
  const [authMode, setAuthMode] = useState('guest')
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGuestLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/guest`)
      onAuthSuccess(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to login as guest')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!authForm.username || !authForm.password) {
      setError('Please enter username and password')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: authForm.username,
        password: authForm.password
      })
      onAuthSuccess(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!authForm.username || !authForm.password) {
      setError('Please enter username and password')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        username: authForm.username,
        email: authForm.email || null,
        password: authForm.password,
        is_guest: false
      })
      onAuthSuccess(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-pop-in shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-green600 animate-bounce-subtle" />
          </div>
          <CardTitle className="text-3xl">Welcome to PromptPlay</CardTitle>
          <CardDescription>Find your perfect game partner with natural language</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authMode === 'guest' && (
            <div className="space-y-4">
              <Button onClick={handleGuestLogin} disabled={loading} className="w-full" size="lg">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Continue as Guest
              </Button>
              <div className="text-center text-sm text-gray-600">or</div>
              <div className="flex gap-2">
                <Button onClick={() => setAuthMode('login')} variant="outline" className="flex-1">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
                <Button onClick={() => setAuthMode('register')} variant="outline" className="flex-1">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register
                </Button>
              </div>
            </div>
          )}

          {(authMode === 'login' || authMode === 'register') && (
            <div className="space-y-4">
              <Input
                placeholder="Username"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
              />
              {authMode === 'register' && (
                <Input
                  placeholder="Email (optional)"
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />
              )}
              <Input
                placeholder="Password"
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
              <Button
                onClick={authMode === 'login' ? handleLogin : handleRegister}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  authMode === 'login' ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />
                )}
                {authMode === 'login' ? 'Login' : 'Register'}
              </Button>
              <Button onClick={() => setAuthMode('guest')} variant="ghost" className="w-full">
                Back
              </Button>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm animate-shake">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
