import React, { useState } from 'react';
import { auth, db } from './firebase';

function App() {
  const [games, setGames] = useState([
    {
      id: 1,
      homeTeam: "Eagles",
      awayTeam: "Cowboys",
      startTime: "2024-12-15T18:00:00",
      status: "upcoming"
    },
    {
      id: 2,
      homeTeam: "Patriots",
      awayTeam: "Jets",
      startTime: "2024-12-15T20:00:00",
      status: "upcoming"
    }
  ]);

  const [picks, setPicks] = useState({});

  const handlePick = (gameId, team) => {
    setPicks(prev => ({
      ...prev,
      [gameId]: team
    }));
  };

  const isGameLocked = (startTime) => {
    return new Date(startTime) <= new Date();
  };

  return (
    <div className="App">
      <header style={{ padding: '20px', textAlign: 'center', background: '#f0f0f0' }}>
        <h1>Picks League</h1>
      </header>
      
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        <div className="games-list">
          {games.map(game => (
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
                <span>{game.homeTeam} vs {game.awayTeam}</span>
                <span>{new Date(game.startTime).toLocaleString()}</span>
              </div>
              
              <div>
                <button
                  onClick={() => handlePick(game.id, game.homeTeam)}
                  disabled={isGameLocked(game.startTime)}
                  style={{
                    marginRight: '10px',
                    padding: '8px 16px',
                    background: picks[game.id] === game.homeTeam ? '#007bff' : '#e9ecef',
                    color: picks[game.id] === game.homeTeam ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {game.homeTeam}
                </button>
                <button
                  onClick={() => handlePick(game.id, game.awayTeam)}
                  disabled={isGameLocked(game.startTime)}
                  style={{
                    padding: '8px 16px',
                    background: picks[game.id] === game.awayTeam ? '#007bff' : '#e9ecef',
                    color: picks[game.id] === game.awayTeam ? 'white' : 'black',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {game.awayTeam}
                </button>
              </div>
              
              {isGameLocked(game.startTime) && (
                <div style={{ marginTop: '10px', color: 'red' }}>
                  Game locked - picks can no longer be changed
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;