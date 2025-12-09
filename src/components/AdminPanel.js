import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, collection, onSnapshot } from 'firebase/firestore';

function AdminPanel() {
  const [round, setRound] = useState('round1');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [homeTeamColor, setHomeTeamColor] = useState('#333333');
  const [awayTeamColor, setAwayTeamColor] = useState('#666666');
  const [spread, setSpread] = useState('');
  const [points, setPoints] = useState('1');
  const [startTime, setStartTime] = useState('');
  const [showGameManager, setShowGameManager] = useState(false);
  const [allGames, setAllGames] = useState({});

  // Load all games for management
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

  const handleAddGame = async (e) => {
    e.preventDefault();
    try {
      const gamesRef = doc(db, 'games', round);
      const gameData = {
        id: Date.now(),
        homeTeam,
        awayTeam,
        homeTeamColor,
        awayTeamColor,
        spread: parseFloat(spread),
        points: parseInt(points),
        startTime: new Date(startTime).toLocaleString('en-US', {
          timeZone: 'America/Chicago'
        }),
        status: 'upcoming'
      };

      // Get existing games or create new array
      const docSnap = await getDoc(gamesRef);
      const existingGames = docSnap.exists() ? docSnap.data().games : [];

      await setDoc(gamesRef, {
        games: [...existingGames, gameData]
      }, { merge: true });

      // Clear form
      setHomeTeam('');
      setAwayTeam('');
      setHomeTeamColor('#333333');
      setAwayTeamColor('#666666');
      setSpread('');
      setPoints('1');
      setStartTime('');
      alert('Game added successfully!');
    } catch (error) {
      console.error('Error adding game:', error);
      alert('Error adding game');
    }
  };

  const handleUpdateGameResult = async (roundId, gameId, winner) => {
    try {
      const gamesRef = doc(db, 'games', roundId);
      const updatedGames = allGames[roundId].map(game => 
        game.id === gameId ? {...game, winner} : game
      );
      await setDoc(gamesRef, { games: updatedGames }, { merge: true });
    } catch (error) {
      console.error('Error updating game result:', error);
      alert('Error updating result');
    }
  };

  return (
    <div className="admin-panel" style={{ 
      maxWidth: '600px', 
      margin: '20px auto', 
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ color: '#333' }}>Add New Game</h2>
      <form onSubmit={handleAddGame}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
            Round:
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              style={{ 
                display: 'block',
                width: '100%',
                marginTop: '5px',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            >
              <option value="round1">Round 1</option>
              <option value="round2">Round 2</option>
              <option value="round3">Round 3</option>
              <option value="round4">Round 4</option>
              <option value="nfl">NFL Confidence</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
            Home Team:
            <input
              type="text"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              style={{ 
                display: 'block',
                width: '100%',
                marginTop: '5px',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
              required
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
            Home Team Color (hex):
            <input
              type="text"
              value={homeTeamColor}
              onChange={(e) => setHomeTeamColor(e.target.value)}
              placeholder="#333333"
              style={{ 
                display: 'block',
                width: '100%',
                marginTop: '5px',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
              required
            />
            <div style={{ 
              marginTop: '5px',
              width: '40px',
              height: '40px',
              backgroundColor: homeTeamColor,
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}></div>
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
            Away Team:
            <input
              type="text"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              style={{ 
                display: 'block',
                width: '100%',
                marginTop: '5px',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
              required
            />
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
            Away Team Color (hex):
            <input
              type="text"
              value={awayTeamColor}
              onChange={(e) => setAwayTeamColor(e.target.value)}
              placeholder="#666666"
              style={{ 
                display: 'block',
                width: '100%',
                marginTop: '5px',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
              required
            />
            <div style={{ 
              marginTop: '5px',
              width: '40px',
              height: '40px',
              backgroundColor: awayTeamColor,
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}></div>
          </label>
        </div>

        {round !== 'nfl' && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                Spread:
                <input
                  type="number"
                  step="0.5"
                  value={spread}
                  onChange={(e) => setSpread(e.target.value)}
                  style={{ 
                    display: 'block',
                    width: '100%',
                    marginTop: '5px',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                  required
                />
              </label>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
                Points:
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  style={{ 
                    display: 'block',
                    width: '100%',
                    marginTop: '5px',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                  }}
                  required
                />
              </label>
            </div>
          </>
        )}
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: '500' }}>
            Start Time:
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ 
                display: 'block',
                width: '100%',
                marginTop: '5px',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
              required
            />
          </label>
        </div>

        <button 
          type="submit"
          style={{
            width: '100%',
            padding: '12px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          Add Game
        </button>
      </form>

      <button
        onClick={() => setShowGameManager(!showGameManager)}
        style={{
          width: '100%',
          marginTop: '20px',
          padding: '12px 20px',
          background: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '500'
        }}
      >
        {showGameManager ? 'Hide Game Manager' : 'Show Game Manager'}
      </button>

      {showGameManager && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#333' }}>Manage Game Results</h3>
          {['round1', 'round2', 'round3', 'round4', 'nfl'].map(roundId => (
            <div key={roundId} style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '10px', color: '#333' }}>
                {roundId === 'nfl' ? 'NFL Confidence' : `Round ${roundId.slice(-1)}`}
              </h4>
              {allGames[roundId]?.map(game => (
                <div key={game.id} style={{ 
                  padding: '15px', 
                  margin: '10px 0', 
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  background: '#fff'
                }}>
                  <p style={{ marginBottom: '10px', color: '#333' }}>
                    {game.homeTeam} vs {game.awayTeam}
                  </p>
                  <select
                    value={game.winner || ''}
                    onChange={(e) => handleUpdateGameResult(roundId, game.id, e.target.value)}
                    style={{ 
                      padding: '8px',
                      width: '200px',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                  >
                    <option value="">Select Winner</option>
                    <option value={game.homeTeam}>{game.homeTeam}</option>
                    <option value={game.awayTeam}>{game.awayTeam}</option>
                  </select>
                  {game.winner && (
                    <span style={{ marginLeft: '10px', color: '#28a745', fontWeight: '500' }}>
                      Winner: {game.winner}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;