import React, { useState } from 'react';
import { useApp } from '../AppContext';

export const Login: React.FC = () => {
  const { users, updateUser } = useApp();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleLogin = () => {
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      if (user.password === password) {
        updateUser(user);
        localStorage.setItem('isAuthenticated', 'true');
        window.location.reload(); // Simple way to trigger re-render
      } else {
        setError('Invalid password');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded shadow-md w-96">
        <h2 className="mb-4 text-2xl font-bold">Login</h2>
        {error && <p className="mb-4 text-red-500">{error}</p>}
        <select 
          className="w-full p-2 mb-4 border rounded"
          value={selectedUserId}
          onChange={(e) => {
            setSelectedUserId(e.target.value);
            setError('');
          }}
        >
          <option value="">Select User</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
          ))}
        </select>
        <input 
          type="password"
          className="w-full p-2 mb-4 border rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
        />
        <button 
          className="w-full p-2 text-white bg-blue-500 rounded hover:bg-blue-600"
          onClick={handleLogin}
          disabled={!selectedUserId || !password}
        >
          Login
        </button>
      </div>
    </div>
  );
};
