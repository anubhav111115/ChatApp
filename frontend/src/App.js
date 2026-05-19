import { useState, useEffect } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("chatUser");
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed);
      setTheme(parsed.theme || "dark");
    }
  }, []);

  const handleLogin = (userData) => {
    localStorage.setItem("chatUser", JSON.stringify(userData));
    setUser(userData);
    setTheme(userData.theme || "dark");
  };

  const handleLogout = () => {
    localStorage.removeItem("chatUser");
    setUser(null);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (user) {
      const updated = { ...user, theme: next };
      setUser(updated);
      localStorage.setItem("chatUser", JSON.stringify(updated));
    }
  };

  return (
    <div>
      {user ? (
        <Chat user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;