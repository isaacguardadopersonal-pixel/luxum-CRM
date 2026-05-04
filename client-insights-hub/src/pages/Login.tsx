import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, KeyRound, Loader2, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirigir si ya está autenticado
  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput || !password) {
      toast.error("Por favor, ingresa tu credenciales completas.");
      return;
    }
    setIsLoading(true);
    try {
      let targetEmail = loginInput.trim();

      if (!targetEmail.includes('@')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)('get_email_by_username', { p_username: targetEmail });
        if (error || !data) {
          toast.error("No se encontró ningún correo vinculado a este usuario.");
          setIsLoading(false);
          return;
        }
        targetEmail = data as string;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (error) {
        toast.error("Credenciales incorrectas.");
        return;
      }

      if (data.session) {
        toast.success("¡Inicio de sesión exitoso!");
        navigate("/");
      }
    } catch (error) {
      toast.error("Error al intentar iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="dark min-h-screen w-full flex items-center justify-center bg-[#071022]/90 backdrop-blur-md p-4 relative"
      style={{ backgroundImage: "radial-gradient(circle at top, #14254b 0%, #071022 100%)" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <Card className="w-full max-w-md shadow-2xl border-[#ca9e51]/30 bg-[#0c1a35]/70 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto mb-6 w-32 h-32 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-[#ca9e51]/20 blur-2xl rounded-full" />
            <img src="/escudo.png" alt="Luxum Shield" className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_15px_rgba(202,158,81,0.3)]" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white drop-shadow-md">Acceso CRM</CardTitle>
          <CardDescription className="text-base text-slate-300">
            Ingresa tu usuario o correo y contraseña para acceder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="login" className="text-slate-200">Usuario o Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="login"
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="password" className="text-slate-200">Contraseña</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-[#ca9e51] hover:bg-[#b08b45] text-slate-900 font-bold" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Ingresar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
