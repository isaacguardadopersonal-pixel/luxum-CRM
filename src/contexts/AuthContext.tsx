import { createContext, useContext, useState, ReactNode } from "react";

type Role = "admin" | "agent";

interface AuthContextType {
  role: Role;
  toggleRole: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("admin"); // Default to admin

  const toggleRole = () => {
    setRole((prev) => (prev === "admin" ? "agent" : "admin"));
  };

  return (
    <AuthContext.Provider value={{ role, toggleRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
