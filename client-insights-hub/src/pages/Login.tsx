import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, KeyRound, Loader2, ArrowLeft } from "lucide-react";

export default function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loginInput, setLoginInput] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirigir si ya está autenticado
  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput) {
      toast.error("Por favor, ingresa tu usuario o correo.");
      return;
    }
    setIsLoading(true);
    try {
      let emailToUse = loginInput.trim();

      if (!emailToUse.includes('@')) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)('get_email_by_username', { p_username: emailToUse });
        if (error || !data) {
          toast.error("No se encontró ningún correo vinculado a este usuario.");
          setIsLoading(false);
          return;
        }
        emailToUse = data as string;
      }

      setTargetEmail(emailToUse);

      const { error } = await supabase.auth.signInWithOtp({
        email: emailToUse,
      });

      if (error) {
        toast.error("Error al enviar el código de acceso.");
        return;
      }

      toast.success("Se ha enviado un código a tu correo.");
      setStep('code');
    } catch (error) {
      toast.error("Error inesperado al intentar iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      toast.error("Por favor, ingresa el código.");
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: code,
        type: 'email'
      });

      if (error) {
        toast.error("Código incorrecto o expirado.");
        return;
      }

      if (data.session) {
        toast.success("¡Inicio de sesión exitoso!");
        navigate("/");
      }
    } catch (error) {
      toast.error("Error al verificar el código.");
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
            {step === 'email' 
              ? "Ingresa tu usuario o correo para recibir un código de acceso." 
              : "Ingresa el código de 6 dígitos enviado a tu correo."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
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
              <Button type="submit" className="w-full bg-[#ca9e51] hover:bg-[#b08b45] text-slate-900 font-bold mt-2" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Solicitar Código
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="code" className="text-slate-200">Código de Acceso</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="pl-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 tracking-widest text-center text-lg font-mono"
                    placeholder="000000"
                    disabled={isLoading}
                    maxLength={6}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                  onClick={() => setStep('email')}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
                <Button type="submit" className="flex-[2] bg-[#ca9e51] hover:bg-[#b08b45] text-slate-900 font-bold" disabled={isLoading || code.length !== 6}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Verificar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
