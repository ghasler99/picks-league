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
      <header className="App-header">
        <h1>Picks League</h1>
      </header>
      
      <main className="container mx-auto p-4">
        <div className="games-list">
          {games.map(game => (
            <div key={game.id} className="game-card p-4 mb-4 border rounded">
              <div className="flex justify-between mb-2">
                <span>{game.homeTeam} vs {game.awayTeam}</span>
                <span>{new Date(game.startTime).toLocaleString()}</span>
              </div>
              
              <div className="pick-buttons">
                <button
                  onClick={() => handlePick(game.id, game.homeTeam)}
                  disabled={isGameLocked(game.startTime)}
                  className={`mr-2 px-4 py-2 rounded ${
                    picks[game.id] === game.homeTeam ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {game.homeTeam}
                </button>
                <button
                  onClick={() => handlePick(game.id, game.awayTeam)}
                  disabled={isGameLocked(game.startTime)}
                  className={`px-4 py-2 rounded ${
                    picks[game.id] === game.awayTeam ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  {game.awayTeam}
                </button>
              </div>
              
              {isGameLocked(game.startTime) && (
                <div className="mt-2 text-red-500">
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