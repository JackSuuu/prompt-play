import { useState, useEffect } from 'react'
import axios from 'axios'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Textarea } from './components/ui/textarea'
import { Input } from './components/ui/input'
import { Loader2, Plus, Search, Calendar, MapPin, Users, Trophy, List, X, LogOut, Home } from 'lucide-react'
import AuthModal from './components/AuthModal'
import MyGames from './components/MyGames'

const API_BASE_URL = 'http://localhost:8000'

// Set up axios interceptor to include auth token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token && config.url && config.url.includes(API_BASE_URL)) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function App() {
  // Authentication state
  const [user, setUser] = useState(null)
  
  // Game state
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [postedRequest, setPostedRequest] = useState(null)
  const [matches, setMatches] = useState([])
  const [error, setError] = useState(null)
  const [allPosts, setAllPosts] = useState([])
  const [showAllPosts, setShowAllPosts] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  
  // My Games state
  const [currentView, setCurrentView] = useState('home')
  const [myHostedGames, setMyHostedGames] = useState([])
  const [myJoinedGames, setMyJoinedGames] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [joinRequests, setJoinRequests] = useState([])
  const [joinDescription, setJoinDescription] = useState('')
  const [showJoinDialog, setShowJoinDialog] = useState(null)
  const [syncMessage, setSyncMessage] = useState(null)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  // Check for existing token on mount and restore view state
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    const savedView = localStorage.getItem('currentView')
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    if (savedView) {
      setCurrentView(savedView)
    }

    // Listen for storage changes from other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        // Another tab logged in/out, sync this tab
        const newToken = localStorage.getItem('token')
        const newUser = localStorage.getItem('user')
        
        if (newToken && newUser) {
          // Another tab logged in with different user
          const parsedUser = JSON.parse(newUser)
          setUser(parsedUser)
          setCurrentView('home')
          setShowAllPosts(false)
          setMatches([])
          setPostedRequest(null)
          setMyHostedGames([])
          setMyJoinedGames([])
          setJoinRequests([])
          setSelectedGame(null)
          setSyncMessage(`Synced to user: ${parsedUser.username}`)
          setTimeout(() => setSyncMessage(null), 3000)
        } else {
          // Another tab logged out
          setUser(null)
          setCurrentView('home')
          setSyncMessage('Logged out from another tab')
          setTimeout(() => setSyncMessage(null), 3000)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleAuthSuccess = (data) => {
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('currentView')
    setUser(null)
    setCurrentView('home')
  }

  const handlePostRequest = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setLoading(true)
    setError(null)
    setMatches([])

    try {
      const response = await axios.post(`${API_BASE_URL}/create-request`, {
        prompt: prompt.trim()
      })
      setPostedRequest(response.data)
      setPrompt('')
      fetchMyHostedGames()
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (detail.missing_fields) {
          setError({
            type: 'validation',
            message: detail.error,
            missing: detail.missing_fields,
            suggestions: detail.suggestions
          })
        } else {
          setError(detail)
        }
      } else if (err.response?.status === 401) {
        setError('You need to be logged in to post a game')
      } else {
        setError(err.response?.data?.detail || 'Failed to create request')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchAllPosts = async () => {
    setLoadingPosts(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/requests`)
      setAllPosts(response.data || [])
      setShowAllPosts(true)
      setMatches([])
      setPostedRequest(null)
    } catch (err) {
      setError('Failed to fetch posts')
    } finally {
      setLoadingPosts(false)
    }
  }

  const handleFindMatch = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setLoading(true)
    setError(null)
    setPostedRequest(null)

    try {
      const response = await axios.post(`${API_BASE_URL}/find-match`, {
        prompt: prompt.trim()
      })
      setMatches(response.data)
      if (response.data.length === 0) {
        setError('No matches found. Try posting a game request first!')
      }
      setPrompt('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to find matches')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGame = async (gameId) => {
    try {
      await axios.post(`${API_BASE_URL}/games/${gameId}/join`, {
        game_id: gameId,
        description: joinDescription
      })
      setShowJoinDialog(null)
      setJoinDescription('')
      setError(null)
      alert('Join request sent! Wait for the host to accept.')
      // Refresh the games lists to show updated status
      fetchMyJoinedGames()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to join game')
    }
  }

  const fetchMyHostedGames = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/my-games/hosted`)
      setMyHostedGames(response.data)
      
      // Count total pending join requests across all hosted games
      let totalPending = 0
      for (const game of response.data) {
        try {
          const joinReqResponse = await axios.get(`${API_BASE_URL}/games/${game.id}/join-requests`)
          const pendingCount = joinReqResponse.data.filter(req => req.status === 'pending').length
          totalPending += pendingCount
        } catch (err) {
          console.error(`Failed to fetch join requests for game ${game.id}`, err)
        }
      }
      setPendingRequestsCount(totalPending)
    } catch (err) {
      console.error('Failed to fetch hosted games', err)
    }
  }

  const fetchMyJoinedGames = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/my-games/joined`)
      setMyJoinedGames(response.data)
    } catch (err) {
      console.error('Failed to fetch joined games', err)
    }
  }

  const fetchJoinRequests = async (gameId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/games/${gameId}/join-requests`)
      setJoinRequests(response.data)
      setSelectedGame(gameId)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch join requests')
    }
  }

  const handleAcceptReject = async (requestId, status) => {
    try {
      await axios.put(`${API_BASE_URL}/join-requests/${requestId}`, { status })
      if (selectedGame) {
        fetchJoinRequests(selectedGame)
      }
      fetchMyHostedGames()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update join request')
    }
  }

  // Save current view to localStorage and fetch games when view changes
  useEffect(() => {
    if (currentView) {
      localStorage.setItem('currentView', currentView)
    }
    
    if (user && currentView === 'my-hosted') {
      fetchMyHostedGames()
    } else if (user && currentView === 'my-joined') {
      fetchMyJoinedGames()
    }
  }, [currentView, user])

  // Auto-refresh join requests when viewing a specific game
  useEffect(() => {
    if (!selectedGame) return

    const interval = setInterval(() => {
      fetchJoinRequests(selectedGame)
    }, 3000) // Refresh every 3 seconds

    return () => clearInterval(interval)
  }, [selectedGame])

  // Auto-refresh hosted games list when on my-hosted view
  useEffect(() => {
    if (currentView !== 'my-hosted' || !user) return

    const interval = setInterval(() => {
      fetchMyHostedGames()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [currentView, user])

  // Auto-refresh joined games list when on my-joined view
  useEffect(() => {
    if (currentView !== 'my-joined' || !user) return

    const interval = setInterval(() => {
      fetchMyJoinedGames()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [currentView, user])

  const formatDateTime = (datetime) => {
    return new Date(datetime).toLocaleString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user) {
    return <AuthModal onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Sync notification banner */}
        {syncMessage && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-up">
            <div className="flex items-center gap-2">
              <span className="animate-pulse">🔄</span>
              <span>{syncMessage}</span>
            </div>
          </div>
        )}

        {/* Header with Navigation */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Button
                variant={currentView === 'home' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCurrentView('home')
                  setShowAllPosts(false)
                  setMatches([])
                  setPostedRequest(null)
                }}
                className="transform hover:scale-105 transition-transform"
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
              <Button
                variant={currentView === 'my-hosted' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('my-hosted')}
                className="transform hover:scale-105 transition-transform relative"
              >
                <Trophy className="mr-2 h-4 w-4" />
                My Games
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {pendingRequestsCount}
                  </span>
                )}
              </Button>
              <Button
                variant={currentView === 'my-joined' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView('my-joined')}
                className="transform hover:scale-105 transition-transform"
              >
                <Users className="mr-2 h-4 w-4" />
                Joined Games
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">
                👋 {user.username}
                {user.is_guest && <span className="text-xs text-gray-500"> (Guest)</span>}
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3 animate-bounce-subtle">
            <Trophy className="h-12 w-12 text-green-600" />
            PromptPlay
          </h1>
          <p className="text-gray-600 text-lg animate-slide-up">Find your perfect game partner with natural language</p>
        </div>

        {/* My Hosted Games View */}
        {currentView === 'my-hosted' && (
          <MyGames 
            games={myHostedGames} 
            type="hosted"
            onViewJoinRequests={fetchJoinRequests}
            onAcceptReject={handleAcceptReject}
            joinRequests={joinRequests}
            selectedGame={selectedGame}
            formatDateTime={formatDateTime}
            onRefresh={fetchMyHostedGames}
            apiBaseUrl={API_BASE_URL}
          />
        )}

        {/* My Joined Games View */}
        {currentView === 'my-joined' && (
          <MyGames 
            games={myJoinedGames} 
            type="joined"
            formatDateTime={formatDateTime}
            onRefresh={fetchMyJoinedGames}
          />
        )}

        {/* Home View - Due to length, will continue in next file segment */}
        {currentView === 'home' && (
          <>
            <Card className="mb-6 shadow-lg animate-slide-up hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle>What do you want to play?</CardTitle>
                <CardDescription>
                  Just type naturally - "I want to play tennis at the meadows tomorrow 4pm, need 1 more player"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="E.g., 'I want to play tennis for 2 people at the meadows on Wednesday 4pm'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] text-base"
                />
                
                <div className="flex gap-3 flex-wrap">
                  <Button onClick={handlePostRequest} disabled={loading} className="flex-1 min-w-[150px]" size="lg">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {loading ? 'Processing...' : 'Post New Game'}
                  </Button>
                  
                  <Button onClick={handleFindMatch} disabled={loading} variant="secondary" className="flex-1 min-w-[150px]" size="lg">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    {loading ? 'Searching...' : 'Find a Game'}
                  </Button>

                  <Button onClick={fetchAllPosts} disabled={loadingPosts} variant="outline" className="flex-1 min-w-[150px]" size="lg">
                    {loadingPosts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <List className="mr-2 h-4 w-4" />}
                    {loadingPosts ? 'Loading...' : 'View All Posts'}
                  </Button>
                </div>

                {error && (
                  <div className={`p-4 rounded-md animate-shake ${error.type === 'validation' ? 'bg-yellow-50 border border-yellow-300' : 'bg-red-50 border border-red-200'}`}>
                    {error.type === 'validation' ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-yellow-900">⚠️ {error.message}</p>
                        <div className="text-yellow-800 text-sm">
                          <p className="font-medium">Missing: {error.missing.join(', ')}</p>
                          <p className="mt-2">💡 {error.suggestions}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-800">{error}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Posted Request Display */}
            {postedRequest && (
              <Card className="mb-6 border-green-200 bg-green-50 shadow-lg animate-pop-in">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <span className="animate-bounce">✓</span> Game Posted Successfully!
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Your game request is now live and can be matched
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow duration-200">
                    <div className="text-sm text-gray-500 italic mb-2">
                      "{postedRequest.original_prompt}"
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 animate-slide-in-left">
                        <Trophy className="h-5 w-5 text-green-600" />
                        <span className="font-semibold">{postedRequest.sport}</span>
                      </div>
                      <div className="flex items-center gap-2 animate-slide-in-right">
                        <MapPin className="h-5 w-5 text-red-600" />
                        <span>{postedRequest.location}</span>
                      </div>
                      <div className="flex items-center gap-2 animate-slide-in-left">
                        <Calendar className="h-5 w-5 text-green-600" />
                        <span>{formatDateTime(postedRequest.datetime_utc)}</span>
                      </div>
                      <div className="flex items-center gap-2 animate-slide-in-right">
                        <Users className="h-5 w-5 text-purple-600" />
                        <span>{postedRequest.players_needed} player{postedRequest.players_needed !== 1 ? 's' : ''} needed</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Posts Display */}
            {showAllPosts && allPosts.length > 0 && (
              <Card className="mb-6 shadow-lg animate-slide-up">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-green-800">📋 All Available Games ({allPosts.length})</CardTitle>
                      <CardDescription>
                        Browse all open game requests
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllPosts(false)}
                      className="hover:bg-red-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allPosts.map((post, index) => (
                    <div 
                      key={post.id} 
                      className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-300 hover:scale-[1.02] animate-fade-in-stagger"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                          👤 Posted by: {post.host_username || 'Unknown'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 italic mb-3 bg-white p-2 rounded">
                        "{post.original_prompt}"
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-green-600" />
                          <span className="font-semibold">{post.sport}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-red-600" />
                          <span className="text-sm">{post.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{formatDateTime(post.datetime_utc)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          <span className="text-sm">{post.players_needed} player{post.players_needed !== 1 ? 's' : ''} needed</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between items-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          post.status === 'open' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {post.status === 'open' ? '🟢 Open' : '⚪ Closed'}
                        </span>
                        {post.status === 'open' && (
                          <Button
                            size="sm"
                            onClick={() => setShowJoinDialog(post.id)}
                            className="ml-2"
                          >
                            Join Game
                          </Button>
                        )}
                      </div>

                      {/* Join Dialog */}
                      {showJoinDialog === post.id && (
                        <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                          <p className="text-sm font-medium mb-2">Tell the host about yourself:</p>
                          <Textarea
                            placeholder="E.g., 'I'm an intermediate player, looking forward to playing!'"
                            value={joinDescription}
                            onChange={(e) => setJoinDescription(e.target.value)}
                            className="mb-2 min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleJoinGame(post.id)}
                            >
                              Send Request
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowJoinDialog(null)
                                setJoinDescription('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Matches Display */}
            {matches.length > 0 && (
              <Card className="shadow-lg animate-pop-in">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <span className="animate-bounce">🎯</span> Found {matches.length} Match{matches.length !== 1 ? 'es' : ''}!
                  </CardTitle>
                  <CardDescription>
                    These games match your request, sorted by compatibility
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {matches.map((match, index) => (
                    <div 
                      key={match.game_request.id} 
                      className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 border border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-fade-in-stagger"
                      style={{ animationDelay: `${index * 0.15}s` }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-green-600 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold animate-pulse">
                            {index + 1}
                          </span>
                          <span className="text-2xl font-bold text-green-600 animate-count-up">
                            {match.compatibility_score}%
                          </span>
                          <span className="text-sm text-gray-600">match</span>
                        </div>
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                          👤 {match.game_request.host_username || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 italic mb-3 bg-white p-2 rounded">
                        "{match.game_request.original_prompt}"
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-green-600" />
                          <span className="font-semibold">{match.game_request.sport}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-red-600" />
                          <span className="text-sm">{match.game_request.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{formatDateTime(match.game_request.datetime_utc)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          <span className="text-sm">{match.game_request.players_needed} player{match.game_request.players_needed !== 1 ? 's' : ''} needed</span>
                        </div>
                      </div>
                      
                      <div className="bg-green-100 p-3 rounded-md mb-3">
                        <p className="text-sm text-green-900">
                          <span className="font-semibold">Why it matches:</span> {match.reason}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setShowJoinDialog(match.game_request.id)}
                        className="w-full"
                      >
                        Join This Game
                      </Button>

                      {/* Join Dialog for Matches */}
                      {showJoinDialog === match.game_request.id && (
                        <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                          <p className="text-sm font-medium mb-2">Tell the host about yourself:</p>
                          <Textarea
                            placeholder="E.g., 'I'm an intermediate player, looking forward to playing!'"
                            value={joinDescription}
                            onChange={(e) => setJoinDescription(e.target.value)}
                            className="mb-2 min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleJoinGame(match.game_request.id)}
                            >
                              Send Request
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowJoinDialog(null)
                                setJoinDescription('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Footer Info */}
            <div className="mt-8 text-center text-sm text-gray-600">
              <p>💡 Tip: Try posting a game first, then search with different wording to see the semantic matching in action!</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
