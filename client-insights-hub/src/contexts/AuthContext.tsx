import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Role = 'admin' | 'vendedor' | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: Role;
  username: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  username: null,
  isLoading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Check 6-hour expiration
        const loginTimeStr = localStorage.getItem('luxum_login_time');
        let isExpired = false;
        if (loginTimeStr && session) {
          const loginTime = parseInt(loginTimeStr, 10);
          if (Date.now() - loginTime > 6 * 60 * 60 * 1000) {
            isExpired = true;
            await supabase.auth.signOut();
            localStorage.removeItem('luxum_login_time');
          }
        }

        if (mounted) {
          setSession(isExpired ? null : session);
          setUser(isExpired ? null : (session?.user ?? null));
          setIsLoading(false); // Quitamos la pantalla de carga de inmediato
          if (session?.user) {
            fetchUserRole(session.user.id); // Fetch del rol en segundo plano
          } else {
            setRole(null);
            setUsername(null);
          }
        }
      } catch (error) {
        console.error("Error fetching session:", error);
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'INITIAL_SESSION') return; // Evitar llamada doble en el arranque
      
      if (event === 'SIGNED_IN') {
        localStorage.setItem('luxum_login_time', Date.now().toString());
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('luxum_login_time');
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
      if (newSession?.user) {
        fetchUserRole(newSession.user.id); // Fetch del rol en segundo plano
      } else {
        setRole(null);
        setUsername(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, username')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
        setUsername(null);
      } else if (data) {
        const userData = data as { role: Role; username: string | null };
        setRole(userData.role);
        setUsername(userData.username);
      }
    } catch (err) {
      console.error(err);
      setRole(null);
      setUsername(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, username, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
