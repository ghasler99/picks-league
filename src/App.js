import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import { doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [games, setGames] = useState([]);
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


  // Load all users' data
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const picks = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        picks[doc.id] = {
          username: data.username || data.email.split('@')[0],
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
    const gamesRef = doc(db, 'games', currentRound);
    const unsubscribe = onSnapshot(gamesRef, (doc) => {
      if (doc.exists()) {
        const gamesData = doc.data().games || [];
        setGames(gamesData);
      } else {
        setGames([]);
      }
    });

    return () => unsubscribe();
  }, [currentRound]);

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

  const calculatePoints = (userId) => {
    let totalPoints = 0;
    const userPickData = userPicks[userId];
    
    if (!userPickData) return 0;
  
    Object.keys(userPickData.picks).forEach(round => {
      const roundPicks = userPickData.picks[round];
      if (!roundPicks) return;
  
      if (round === 'nfl') {
        // For NFL round, add confidence points if pick is correct
        Object.keys(roundPicks).forEach(gameId => {
          const game = games.find(g => g.id.toString() === gameId.toString());
          if (game && game.winner) {
            if (roundPicks[gameId].team === game.winner) {
              totalPoints += roundPicks[gameId].points;
            }
          }
        });
      } else {
        // Original points calculation for other rounds
        Object.keys(roundPicks).forEach(gameId => {
          const game = games.find(g => g.id.toString() === gameId.toString());
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
    <div className="App" style={{padding: '20px'}}>
      {!user ? (
        <Auth />
      ) : (
        <>
          <header style={{ padding: '20px', background: '#f0f0f0' }}>
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
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '10px',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => setView('picks')}
                style={{
                  padding: '10px 20px',
                  background: view === 'picks' ? '#007bff' : '#e9ecef',
                  color: view === 'picks' ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Make Picks
              </button>
              <button
                onClick={() => setView('view-picks')}
                style={{
                  padding: '10px 20px',
                  background: view === 'view-picks' ? '#007bff' : '#e9ecef',
                  color: view === 'view-picks' ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                View All Picks
              </button>
              <button
                onClick={() => setView('leaderboard')}
                style={{
                  padding: '10px 20px',
                  background: view === 'leaderboard' ? '#007bff' : '#e9ecef',
                  color: view === 'leaderboard' ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Leaderboard
              </button>
              {isAdmin && (
                <button
                  onClick={() => setView('admin')}
                  style={{
                    padding: '10px 20px',
                    background: view === 'admin' ? '#007bff' : '#e9ecef',
                    color: view === 'admin' ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Admin Panel
                </button>
              )}
            </div>

            {/* Round selector (show in both picks and view-picks views) */}
            {(view === 'picks' || view === 'view-picks') && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  onClick={() => setCurrentRound('round1')}
                  style={{
                    padding: '8px 16px',
                    background: currentRound === 'round1' ? '#28a745' : '#e9ecef',
                    color: currentRound === 'round1' ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Round 1
                </button>
                <button
                  onClick={() => setCurrentRound('round2')}
                  style={{
                    padding: '8px 16px',
                    background: currentRound === 'round2' ? '#28a745' : '#e9ecef',
                    color: currentRound === 'round2' ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Round 2
                </button>
                <button
                  onClick={() => setCurrentRound('round3')}
                  style={{
                    padding: '8px 16px',
                    background: currentRound === 'round3' ? '#28a745' : '#e9ecef',
                    color: currentRound === 'round3' ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Round 3
                </button>
                <button
                  onClick={() => setCurrentRound('nfl')}
                  style={{
                    padding: '8px 16px',
                    background: currentRound === 'nfl' ? '#28a745' : '#e9ecef',
                    color: currentRound === 'nfl' ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  NFL Confidence
                </button>
              </div>
            )}
          </header>
          
          <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            {view === 'admin' ? (
              <AdminPanel />
            ) : view === 'picks' ? (
              <div className="games-list">
                {games.map(game => (
                  currentRound === 'nfl' ? (
                    <div key={game.id} style={{ 
                      padding: '20px', 
                      marginBottom: '20px', 
                      border: '1px solid #ddd',
                      borderRadius: '8px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '10px'
                      }}>
                        <span>
                          {game.homeTeam} vs {game.awayTeam}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <div>{new Date(game.startTime).toLocaleString('en-US', {
                            timeZone: 'America/Chicago',
                            timeZoneName: 'short'
                          })}</div>
                          {isGameLocked(game.startTime) && (
                            <div style={{ color: '#dc3545', fontSize: '20px', marginTop: '5px' }}>
                              🔒
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <button
                            onClick={() => handleNFLPick(game.id, game.homeTeam)}
                            disabled={isGameLocked(game.startTime)}
                            style={{
                              width: '100%',
                              padding: '8px 16px',
                              background: picks[currentRound]?.[game.id]?.team === game.homeTeam ? '#007bff' : '#e9ecef',
                              color: picks[currentRound]?.[game.id]?.team === game.homeTeam ? 'white' : 'black',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isGameLocked(game.startTime) ? 'not-allowed' : 'pointer',
                              opacity: isGameLocked(game.startTime) ? 0.65 : 1
                            }}
                          >
                            {game.homeTeam}
                          </button>
                        </div>
                        <div style={{ flex: 1 }}>
                          <button
                            onClick={() => handleNFLPick(game.id, game.awayTeam)}
                            disabled={isGameLocked(game.startTime)}
                            style={{
                              width: '100%',
                              padding: '8px 16px',
                              background: picks[currentRound]?.[game.id]?.team === game.awayTeam ? '#007bff' : '#e9ecef',
                              color: picks[currentRound]?.[game.id]?.team === game.awayTeam ? 'white' : 'black',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isGameLocked(game.startTime) ? 'not-allowed' : 'pointer',
                              opacity: isGameLocked(game.startTime) ? 0.65 : 1
                            }}
                          >
                            {game.awayTeam}
                          </button>
                        </div>
                        {picks[currentRound]?.[game.id]?.team && (
                          <select
                            value={picks[currentRound]?.[game.id]?.points || ''}
                            onChange={(e) => handleConfidencePoints(game.id, parseInt(e.target.value))}
                            disabled={isGameLocked(game.startTime)}
                            style={{
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ddd'
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
                    <div key={game.id} style={{ 
                      padding: '20px', 
                      marginBottom: '20px', 
                      border: '1px solid #ddd',
                      borderRadius: '8px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '10px'
                      }}>
                        <span>
                          {game.homeTeam} ({game.spread > 0 ? '+' : ''}{game.spread}) vs {game.awayTeam}
                          <span style={{ marginLeft: '10px', color: '#666' }}>
                            Points: {game.points || 1}
                          </span>
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <div>{new Date(game.startTime).toLocaleString('en-US')} CST</div>

                          {isGameLocked(game.startTime) && (
                            <div style={{ color: '#dc3545', fontSize: '20px', marginTop: '5px' }}>
                              🔒
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <button
                          onClick={() => handlePick(game.id, game.homeTeam)}
                          disabled={isGameLocked(game.startTime)}
                          style={{
                            marginRight: '10px',
                            padding: '8px 16px',
                            background: picks[currentRound]?.[game.id] === game.homeTeam ? '#007bff' : '#e9ecef',
                            color: picks[currentRound]?.[game.id] === game.homeTeam ? 'white' : 'black',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isGameLocked(game.startTime) ? 'not-allowed' : 'pointer',
                            opacity: isGameLocked(game.startTime) ? 0.65 : 1
                          }}
                        >
                          {game.homeTeam}
                        </button>
                        <button
                          onClick={() => handlePick(game.id, game.awayTeam)}
                          disabled={isGameLocked(game.startTime)}
                          style={{
                            padding: '8px 16px',
                            background: picks[currentRound]?.[game.id] === game.awayTeam ? '#007bff' : '#e9ecef',
                            color: picks[currentRound]?.[game.id] === game.awayTeam ? 'white' : 'black',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isGameLocked(game.startTime) ? 'not-allowed' : 'pointer',
                            opacity: isGameLocked(game.startTime) ? 0.65 : 1
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
              <div className="picks-grid" style={{
                padding: '20px',
                border: '1px solid #ddd',
                borderRadius: '8px'
              }}>
                <h2 style={{ marginBottom: '20px' }}>All Picks - {currentRound}</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={tableHeaderStyle}>User</th>
                        {games.map(game => (
                          <th key={game.id} style={tableHeaderStyle}>
                            {game.homeTeam} vs {game.awayTeam}
                            {currentRound !== 'nfl' && (
                              <div style={{ fontSize: '0.8em', color: '#666' }}>
                                ({game.points || 1} pts)
                              </div>
                            )}
                            {!isGameLocked(game.startTime) && (
                              <div style={{ fontSize: '0.8em', color: '#dc3545' }}>
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
                          <td style={tableCellStyle}>
                            {userData.displayName || userData.username}
                          </td>
                          {games.map(game => (
                            <td key={game.id} style={tableCellStyle}>
                              {isGameLocked(game.startTime) 
                                ? currentRound === 'nfl'
                                  ? `${userData.picks[currentRound]?.[game.id]?.team || '-'} (${userData.picks[currentRound]?.[game.id]?.points || '-'})`
                                  : (userData.picks[currentRound]?.[game.id] || '-')
                                : '🔒'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="leaderboard" style={{
                padding: '20px',
                border: '1px solid #ddd',
                borderRadius: '8px'
              }}>
                <h2 style={{ marginBottom: '20px' }}>Leaderboard</h2>
                {Object.entries(userPicks)
                  .map(([userId, userData]) => ({
                    name: userData.displayName || userData.username,
                    points: calculatePoints(userId)
                  }))
                  .sort((a, b) => b.points - a.points)
                  .map((userData, index) => (
                    <div key={userData.name} style={{
                      padding: '10px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>{index + 1}. {userData.name}</span>
                      <span>{userData.points} points</span>
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

const tableHeaderStyle = {
  padding: '12px',
  backgroundColor: '#f8f9fa',
  borderBottom: '2px solid #dee2e6',
  textAlign: 'left'
};

const tableCellStyle = {
  padding: '12px',
  borderBottom: '1px solid #dee2e6'
};

export default App;