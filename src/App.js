import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import { doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allGames, setAllGames] = useState({});
  const [picks, setPicks] = useState({});
  const [currentRound, setCurrentRound] = useState('round1');
  const [view, setView] = useState('picks');
  const [userPicks, setUserPicks] = useState({});
  const [userData, setUserData] = useState({});


  // Load user's data and check admin status when they log in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        setIsAdmin(user.email === "garner.hasler@gmail.com");
  
        const userDocRef = doc(db, 'users', user.uid);
        
        // Only update lastLogin, but keep using setDoc with merge
        await setDoc(userDocRef, {
          lastLogin: new Date(),
        }, { merge: true });  // merge: true is important here
  
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            setPicks(userData.picks || {});
            setUserData({
              username: userData.username,
              displayName: userData.displayName
            });
          }
        });
  
        return () => unsubscribeUser();
      }
    });
  
    return () => unsubscribe();
  }, []);


  // Load all users' data - FIXED TO HANDLE MISSING EMAIL
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const picks = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        picks[doc.id] = {
          username: data.username || (data.email ? data.email.split('@')[0] : 'Unknown'),
          displayName: data.displayName || '',
          picks: data.picks || {}
        };
      });
      setUserPicks(picks);
    });

    return () => unsubscribe();
  }, []);

  // Load games from Firestore based on current round
  useEffect(() => {
    const rounds = ['round1', 'round2', 'round3', 'round4', 'nfl'];
    const unsubscribers = rounds.map(roundId => {
      const gamesRef = doc(db, 'games', roundId);
      return onSnapshot(gamesRef, (doc) => {
        if (doc.exists()) {
          setAllGames(prev => ({
            ...prev,
            [roundId]: doc.data().games || []
          }));
        }
      });
    });
  
    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  const handlePick = async (gameId, team) => {
    if (!user) return;

    const newPicks = {
      ...picks,
      [currentRound]: {
        ...(picks[currentRound] || {}),
        [gameId]: team
      }
    };
    setPicks(newPicks);

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        picks: newPicks,
        lastUpdated: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving pick:", error);
      alert("Error saving pick. Please try again.");
    }
  };

  const isGameLocked = (startTime) => {
    const gameTime = new Date(startTime);
    const now = new Date();
    
    // Convert current time to CST for comparison
    const currentCST = new Date(now.toLocaleString('en-US', {
      timeZone: 'America/Chicago'
    }));
  
    return currentCST >= gameTime;
  };

  const calculatePoints = (userId, category = 'total') => {
    let totalPoints = 0;
    const userPickData = userPicks[userId];
    
    if (!userPickData) return 0;
  
    Object.keys(userPickData.picks).forEach(round => {
      if (category === 'college' && round === 'nfl') return;
      if (category === 'nfl' && round !== 'nfl') return;
      
      const roundPicks = userPickData.picks[round];
      if (!roundPicks) return;
  
      if (round === 'nfl') {
        Object.keys(roundPicks).forEach(gameId => {
          const game = allGames[round]?.find(g => g.id.toString() === gameId.toString());
          if (game && game.winner) {
            if (roundPicks[gameId].team === game.winner) {
              totalPoints += roundPicks[gameId].points;
            }
          }
        });
      } else {
        Object.keys(roundPicks).forEach(gameId => {
          const game = allGames[round]?.find(g => g.id.toString() === gameId.toString());
          if (game && game.winner) {
            if (roundPicks[gameId] === game.winner) {
              totalPoints += (game.points || 1);
            }
          }
        });
      }
    });
  
    return totalPoints;
  };

  const handleNFLPick = async (gameId, team) => {
    if (!user) return;
  
    const newPicks = {
      ...picks,
      [currentRound]: {
        ...(picks[currentRound] || {}),
        [gameId]: {
          team,
          points: picks[currentRound]?.[gameId]?.points || ''
        }
      }
    };
    setPicks(newPicks);
  
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        picks: newPicks,
        lastUpdated: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving pick:", error);
      alert("Error saving pick. Please try again.");
    }
  };
  
  const handleConfidencePoints = async (gameId, points) => {
    if (!user) return;
  
    const newPicks = {
      ...picks,
      [currentRound]: {
        ...(picks[currentRound] || {}),
        [gameId]: {
          ...picks[currentRound][gameId],
          points
        }
      }
    };
    setPicks(newPicks);
  
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        picks: newPicks,
        lastUpdated: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving points:", error);
      alert("Error saving points. Please try again.");
    }
  };

  return (
    <div className="App">
      {!user ? (
        <Auth />
      ) : (
        <>
          <header className="App-header">
            {/* Top bar with logout */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button
                onClick={() => auth.signOut()}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>

            {/* Title and welcome */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1>Picks League</h1>
              <p>Welcome, {userData.displayName || userData.username}!</p>
            </div>

            {/* Navigation tabs */}
            <div className="nav-tabs">
              <button
                onClick={() => setView('picks')}
                className={`nav-tab ${view === 'picks' ? 'active' : ''}`}
              >
                Make Picks
              </button>
              <button
                onClick={() => setView('view-picks')}
                className={`nav-tab ${view === 'view-picks' ? 'active' : ''}`}
              >
                View All Picks
              </button>
              <button
                onClick={() => setView('leaderboard')}
                className={`nav-tab ${view === 'leaderboard' ? 'active' : ''}`}
              >
                Leaderboard
              </button>
              {isAdmin && (
                <button
                  onClick={() => setView('admin')}
                  className={`nav-tab ${view === 'admin' ? 'active' : ''}`}
                >
                  Admin Panel
                </button>
              )}
            </div>

            {/* Round selector (show in both picks and view-picks views) */}
            {(view === 'picks' || view === 'view-picks') && (
              <div className="round-selector">
                <button
                  onClick={() => setCurrentRound('round1')}
                  className={`round-button ${currentRound === 'round1' ? 'active' : ''}`}
                >
                  Round 1
                </button>
                <button
                  onClick={() => setCurrentRound('round2')}
                  className={`round-button ${currentRound === 'round2' ? 'active' : ''}`}
                >
                  Round 2
                </button>
                <button
                  onClick={() => setCurrentRound('round3')}
                  className={`round-button ${currentRound === 'round3' ? 'active' : ''}`}
                >
                  Round 3
                </button>
                <button
                  onClick={() => setCurrentRound('round4')}
                  className={`round-button ${currentRound === 'round4' ? 'active' : ''}`}
                >
                  Round 4
                </button>
                <button
                  onClick={() => setCurrentRound('nfl')}
                  className={`round-button ${currentRound === 'nfl' ? 'active' : ''}`}
                >
                  NFL Confidence
                </button>
              </div>
            )}
          </header>
          
          <main className="content-container">
            {view === 'admin' ? (
              <AdminPanel />
            ) : view === 'picks' ? (
              <div className="games-list">
                {(allGames[currentRound] || []).map(game => (
                  currentRound === 'nfl' ? (
                    <div key={game.id} className="game-card" style={{
                      background: `linear-gradient(90deg, ${game.homeTeamColor || '#007bff'}55 0%, ${game.homeTeamColor || '#007bff'}33 40%, #ffffff 50%, ${game.awayTeamColor || '#dc3545'}33 60%, ${game.awayTeamColor || '#dc3545'}55 100%)`
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '15px'
                      }}>
                        <span style={{ fontWeight: '600', fontSize: '1.1em' }}>
                          {game.homeTeam} vs {game.awayTeam}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.9em', color: '#666' }}>
                            {new Date(game.startTime).toLocaleString('en-US', {
                              timeZone: 'America/Chicago',
                              timeZoneName: 'short'
                            })}
                          </div>
                          {isGameLocked(game.startTime) && (
                            <div className="lock-icon">🔒</div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleNFLPick(game.id, game.homeTeam)}
                          disabled={isGameLocked(game.startTime)}
                          className="pick-button"
                          style={{
                            flex: '1',
                            minWidth: '150px',
                            background: picks[currentRound]?.[game.id]?.team === game.homeTeam 
                              ? '#333'
                              : '#ffffff',
                            color: picks[currentRound]?.[game.id]?.team === game.homeTeam 
                              ? 'white' 
                              : '#333',
                            borderColor: picks[currentRound]?.[game.id]?.team === game.homeTeam
                              ? '#333'
                              : '#ddd',
                            fontWeight: picks[currentRound]?.[game.id]?.team === game.homeTeam ? '700' : '600',
                          }}
                        >
                          {game.homeTeam}
                        </button>
                        <button
                          onClick={() => handleNFLPick(game.id, game.awayTeam)}
                          disabled={isGameLocked(game.startTime)}
                          className="pick-button"
                          style={{
                            flex: '1',
                            minWidth: '150px',
                            background: picks[currentRound]?.[game.id]?.team === game.awayTeam 
                              ? '#333'
                              : '#ffffff',
                            color: picks[currentRound]?.[game.id]?.team === game.awayTeam 
                              ? 'white' 
                              : '#333',
                            borderColor: picks[currentRound]?.[game.id]?.team === game.awayTeam
                              ? '#333'
                              : '#ddd',
                            fontWeight: picks[currentRound]?.[game.id]?.team === game.awayTeam ? '700' : '600',
                          }}
                        >
                          {game.awayTeam}
                        </button>
                        {picks[currentRound]?.[game.id]?.team && (
                          <select
                            value={picks[currentRound]?.[game.id]?.points || ''}
                            onChange={(e) => handleConfidencePoints(game.id, parseInt(e.target.value))}
                            disabled={isGameLocked(game.startTime)}
                            style={{
                              padding: '12px',
                              borderRadius: '8px',
                              border: '2px solid #333',
                              fontSize: '16px',
                              fontWeight: '600',
                              backgroundColor: '#fff'
                            }}
                          >
                            <option value="" disabled>Select Points</option>
                            {Array.from({length: 13}, (_, i) => i + 1)
                              .filter(num => 
                                !Object.values(picks[currentRound] || {})
                                  .some(pick => pick.points === num && pick.team) || 
                                picks[currentRound]?.[game.id]?.points === num
                              )
                              .map(num => (
                                <option key={num} value={num}>{num}</option>
                              ))
                            }
                          </select>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={game.id} className="game-card" style={{
                      background: `linear-gradient(90deg, ${game.homeTeamColor || '#007bff'}55 0%, ${game.homeTeamColor || '#007bff'}33 40%, #ffffff 50%, ${game.awayTeamColor || '#dc3545'}33 60%, ${game.awayTeamColor || '#dc3545'}55 100%)`
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '15px'
                      }}>
                        <span style={{ fontWeight: '600', fontSize: '1.1em' }}>
                          {game.homeTeam} ({game.spread > 0 ? '+' : ''}{game.spread}) vs {game.awayTeam}
                          <span style={{ marginLeft: '15px', color: '#666', fontSize: '0.9em' }}>
                            Points: {game.points || 1}
                          </span>
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.9em', color: '#666' }}>
                            {new Date(game.startTime).toLocaleString('en-US')} CST
                          </div>
                          {isGameLocked(game.startTime) && (
                            <div className="lock-icon">🔒</div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handlePick(game.id, game.homeTeam)}
                          disabled={isGameLocked(game.startTime)}
                          className="pick-button"
                          style={{
                            flex: '1',
                            minWidth: '150px',
                            background: picks[currentRound]?.[game.id] === game.homeTeam 
                              ? '#333'
                              : '#ffffff',
                            color: picks[currentRound]?.[game.id] === game.homeTeam 
                              ? 'white' 
                              : '#333',
                            borderColor: picks[currentRound]?.[game.id] === game.homeTeam
                              ? '#333'
                              : '#ddd',
                            fontWeight: picks[currentRound]?.[game.id] === game.homeTeam ? '700' : '600',
                          }}
                        >
                          {game.homeTeam}
                        </button>
                        <button
                          onClick={() => handlePick(game.id, game.awayTeam)}
                          disabled={isGameLocked(game.startTime)}
                          className="pick-button"
                          style={{
                            flex: '1',
                            minWidth: '150px',
                            background: picks[currentRound]?.[game.id] === game.awayTeam 
                              ? '#333'
                              : '#ffffff',
                            color: picks[currentRound]?.[game.id] === game.awayTeam 
                              ? 'white' 
                              : '#333',
                            borderColor: picks[currentRound]?.[game.id] === game.awayTeam
                              ? '#333'
                              : '#ddd',
                            fontWeight: picks[currentRound]?.[game.id] === game.awayTeam ? '700' : '600',
                          }}
                        >
                          {game.awayTeam}
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : view === 'view-picks' ? (
              <div style={{
                backgroundColor: '#fff',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>
                  All Picks - {currentRound === 'nfl' ? 'NFL Confidence' : `Round ${currentRound.replace('round', '')}`}
                </h2>
                {allGames[currentRound]?.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>User</th>
                          {(allGames[currentRound] || []).map(game => (
                            <th key={game.id}>
                              {game.homeTeam} vs {game.awayTeam}
                              {currentRound !== 'nfl' && (
                                <div style={{ fontSize: '0.8em', color: '#666', fontWeight: 'normal' }}>
                                  ({game.points || 1} pts)
                                </div>
                              )}
                              {!isGameLocked(game.startTime) && (
                                <div style={{ fontSize: '0.8em', color: '#dc3545', fontWeight: 'normal' }}>
                                  Picks hidden until game starts
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(userPicks).map(([userId, userData]) => (
                          <tr key={userId}>
                            <td style={{ fontWeight: '600' }}>
                              {userData.displayName || userData.username}
                            </td>
                            {(allGames[currentRound] || []).map(game => {
                              const userPick = currentRound === 'nfl' 
                                ? userData.picks[currentRound]?.[game.id]?.team 
                                : userData.picks[currentRound]?.[game.id];
                              const pickColor = userPick === game.homeTeam 
                                ? game.homeTeamColor 
                                : userPick === game.awayTeam 
                                  ? game.awayTeamColor 
                                  : null;
                              
                              return (
                                <td key={game.id} style={{
                                  background: isGameLocked(game.startTime) && pickColor
                                    ? `linear-gradient(135deg, ${pickColor}44 0%, ${pickColor}22 100%)` 
                                    : 'transparent',
                                  color: '#333',
                                  fontWeight: isGameLocked(game.startTime) && pickColor ? '600' : 'normal'
                                }}>
                                  {isGameLocked(game.startTime) 
                                    ? currentRound === 'nfl'
                                      ? `${userData.picks[currentRound]?.[game.id]?.team || '-'} (${userData.picks[currentRound]?.[game.id]?.points || '-'})`
                                      : (userData.picks[currentRound]?.[game.id] || '-')
                                    : '🔒'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    No games available for {currentRound === 'nfl' ? 'NFL Confidence' : `Round ${currentRound.replace('round', '')}`}
                  </div>
                )}
              </div>
            ) : (
              <div className="leaderboard">
                <h2>Leaderboard</h2>
                
                {/* Total Points Section */}
                <h3 style={{ color: '#333' }}>Overall Standings</h3>
                {Object.entries(userPicks)
                  .map(([userId, userData]) => ({
                    name: userData.displayName || userData.username,
                    points: calculatePoints(userId, 'total')
                  }))
                  .sort((a, b) => b.points - a.points)
                  .map((userData, index) => (
                    <div key={userData.name} className="leaderboard-item">
                      <span>{index + 1}. {userData.name}</span>
                      <span style={{ fontWeight: '600' }}>{userData.points} points</span>
                    </div>
                  ))}
              
                {/* College Points Section */}
                <h3 style={{ color: '#333' }}>College Standings</h3>
                {Object.entries(userPicks)
                  .map(([userId, userData]) => ({
                    name: userData.displayName || userData.username,
                    points: calculatePoints(userId, 'college')
                  }))
                  .sort((a, b) => b.points - a.points)
                  .map((userData, index) => (
                    <div key={userData.name} className="leaderboard-item">
                      <span>{index + 1}. {userData.name}</span>
                      <span style={{ fontWeight: '600' }}>{userData.points} points</span>
                    </div>
                  ))}
              
                {/* NFL Points Section */}
                <h3 style={{ color: '#333' }}>NFL Confidence Standings</h3>
                {Object.entries(userPicks)
                  .map(([userId, userData]) => ({
                    name: userData.displayName || userData.username,
                    points: calculatePoints(userId, 'nfl')
                  }))
                  .sort((a, b) => b.points - a.points)
                  .map((userData, index) => (
                    <div key={userData.name} className="leaderboard-item">
                      <span>{index + 1}. {userData.name}</span>
                      <span style={{ fontWeight: '600' }}>{userData.points} points</span>
                    </div>
                  ))}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default App;