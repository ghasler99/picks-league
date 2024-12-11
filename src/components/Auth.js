import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'signup') {
        // Create new user
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        // Create initial user document with all fields
        await setDoc(doc(db, 'users', userCred.user.uid), {
          email: userCred.user.email,
          displayName: displayName || email.split('@')[0],
          username: email.split('@')[0],
          lastLogin: new Date()
        });
      } else {
        // Regular login - just authenticate and update lastLogin
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        // Only update the lastLogin field
        await updateDoc(doc(db, 'users', userCred.user.uid), {
          lastLogin: new Date()
        });
      }
      
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="max-w-sm mx-auto">
        <h2 className="text-2xl mb-4">{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
        
        {error && <div className="text-red-500 mb-4">{error}</div>}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />

        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Display Name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full p-2 mb-4 border rounded"
          />
        )}
        
        <button 
          type="submit"
          className="w-full p-2 mb-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {mode === 'login' ? 'Login' : 'Sign Up'}
        </button>
        
        <button 
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="w-full p-2 text-blue-500 hover:text-blue-600"
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full p-2 mt-4 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Logout
        </button>
      </form>
      
    </div>
  );
};

export default Auth;