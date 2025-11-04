import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Trophy, Calendar, MapPin, Users, CheckCircle, XCircle, Clock, RefreshCw, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'
import axios from 'axios'

export default function MyGames({ games, type, onViewJoinRequests, onAcceptReject, joinRequests, selectedGame, formatDateTime, onRefresh, apiBaseUrl }) {
  const [gamePendingCounts, setGamePendingCounts] = useState({})

  // Fetch pending join requests count for each game
  useEffect(() => {
    if (type !== 'hosted' || !apiBaseUrl) return

    const fetchPendingCounts = async () => {
      const counts = {}
      for (const game of games) {
        try {
          const token = localStorage.getItem('token')
          const response = await axios.get(`${apiBaseUrl}/games/${game.id}/join-requests`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          counts[game.id] = response.data.filter(req => req.status === 'pending').length
        } catch (err) {
          console.error(`Failed to fetch join requests for game ${game.id}`, err)
        }
      }
      setGamePendingCounts(counts)
    }

    fetchPendingCounts()
  }, [games, type, apiBaseUrl])

  return (
    <Card className="shadow-lg animate-slide-up">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-green-800">
              {type === 'hosted' ? '🏆 My Hosted Games' : '🎮 Games I Joined'}
            </CardTitle>
            <CardDescription>
              {type === 'hosted' 
                ? 'Games you have created and are hosting' 
                : 'Games you have been accepted to join'}
            </CardDescription>
          </div>
          {onRefresh && (
            <Button 
              onClick={onRefresh} 
              size="sm" 
              variant="outline"
              className="hover:scale-105 transition-transform"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {games.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>{type === 'hosted' ? 'You haven\'t hosted any games yet' : 'You haven\'t joined any games yet'}</p>
            <p className="text-sm mt-2">Go to Home and {type === 'hosted' ? 'post' : 'find'} a game!</p>
          </div>
        ) : (
          games.map((game, index) => {
            const hasPendingRequests = gamePendingCounts[game.id] > 0
            return <div key={game.id} className="space-y-3">
              <div 
                className={`rounded-lg p-4 border transition-all duration-300 hover:scale-[1.01] animate-fade-in-stagger ${
                  hasPendingRequests 
                    ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300 shadow-lg ring-2 ring-red-200' 
                    : 'bg-gradient-to-r from-slate-50 to-gray-50 border-gray-200 hover:shadow-md'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {type === 'joined' && game.host_username && (
                  <div className="flex items-center mb-2">
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      🏠 Host: {game.host_username}
                    </span>
                  </div>
                )}
                <div className="text-sm text-gray-600 italic mb-3 bg-white p-2 rounded">
                  "{game.original_prompt}"
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">{game.sport}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-600" />
                    <span className="text-sm">{game.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{formatDateTime(game.datetime_utc)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">
                      {game.players_joined}/{game.players_needed} joined
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      game.status === 'open' 
                      ? 'bg-green-100 text-green-800' 
                      : game.status === 'full'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-100 text-gray-800'
                    }`}>
                    {game.status === 'open' ? '🟢 Open' : game.status === 'full' ? '� Full' : '⚪ Closed'}
                  </span>
                    {hasPendingRequests && (
                      <span className="text-xs px-3 py-1 rounded-full font-bold bg-red-500 text-white animate-pulse flex items-center gap-1">
                        <Bell className="h-3 w-3" />
                        {gamePendingCounts[game.id]} New Request{gamePendingCounts[game.id] > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  
                  {type === 'hosted' && (
                    <Button 
                      onClick={() => onViewJoinRequests(game.id)} 
                      size="sm" 
                      variant={hasPendingRequests ? "default" : "outline"}
                      className={`hover:scale-105 transition-transform ${hasPendingRequests ? 'animate-bounce-subtle' : ''}`}
                    >
                      {hasPendingRequests && <Bell className="mr-1 h-4 w-4" />}
                      View Join Requests
                    </Button>
                  )}
                </div>
              </div>

              {/* Show join requests for this game if selected */}
              {type === 'hosted' && selectedGame === game.id && joinRequests && (
                <div className="ml-4 p-4 bg-green-50 border border-green-200 rounded-lg animate-slide-up">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-green-900">Join Requests:</h4>
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Auto-updating
                    </span>
                  </div>
                  {joinRequests.length === 0 ? (
                    <p className="text-sm text-gray-600">No join requests yet</p>
                  ) : (
                    <div className="space-y-2">
                      {joinRequests.map((req) => (
                        <div key={req.id} className="bg-white p-3 rounded border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{req.username}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              req.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : req.status === 'accepted'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {req.status === 'pending' && <Clock className="inline h-3 w-3 mr-1" />}
                              {req.status === 'accepted' && <CheckCircle className="inline h-3 w-3 mr-1" />}
                              {req.status === 'rejected' && <XCircle className="inline h-3 w-3 mr-1" />}
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </span>
                          </div>
                          {req.description && (
                            <p className="text-sm text-gray-600 mb-2 italic">"{req.description}"</p>
                          )}
                          {req.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => onAcceptReject(req.id, 'accepted')} 
                                size="sm" 
                                className="flex-1"
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Accept
                              </Button>
                              <Button 
                                onClick={() => onAcceptReject(req.id, 'rejected')} 
                                size="sm" 
                                variant="destructive"
                                className="flex-1"
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          })
        )}
      </CardContent>
    </Card>
  )
}
