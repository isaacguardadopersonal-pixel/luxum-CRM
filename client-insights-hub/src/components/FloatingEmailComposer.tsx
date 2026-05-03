import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Send, Mail, Paperclip, Loader2, LogIn } from 'lucide-react';
import { Client } from '@/lib/clientData';
import { useGoogleLogin } from '@react-oauth/google';

const emailScripts = [
  {
    id: "blanco",
    title: "Correo en Blanco",
    subject: "Seguimiento LUXUM",
    body: "Hola [Nombre],\n\n"
  },
  {
    id: "bienvenida",
    title: "Bienvenida",
    subject: "Bienvenido a LUXUM, [Nombre]",
    body: "Hola [Nombre],\n\nGracias por confiar en LUXUM. Estamos aquí para ayudarte con todas tus necesidades de seguros.\n\nSaludos,\nEquipo LUXUM"
  },
  {
    id: "renovacion",
    title: "Renovación de Póliza",
    subject: "Aviso de Renovación para [Nombre]",
    body: "Hola [Nombre],\n\nTe escribimos para recordarte que tu póliza está próxima a vencer. Por favor, contáctanos para revisar tus opciones de renovación.\n\nSaludos,\nEquipo LUXUM"
  },
  {
    id: "documentos",
    title: "Documentos Pendientes",
    subject: "Documentos requeridos para tu póliza",
    body: "Hola [Nombre],\n\nPara poder continuar con tu proceso, necesitamos que nos envíes los siguientes documentos pendientes.\n\nSaludos,\nEquipo LUXUM"
  }
];

interface FloatingEmailComposerProps {
  client: Client;
  onClose: () => void;
}

export function FloatingEmailComposer({ client, onClose }: FloatingEmailComposerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState("blanco");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    handleScriptChange("blanco");
    // Check if token exists in session storage
    const token = sessionStorage.getItem('gmail_access_token');
    if (token) setGoogleToken(token);
  }, [client]);

  const handleScriptChange = (scriptId: string) => {
    setSelectedScriptId(scriptId);
    const script = emailScripts.find(s => s.id === scriptId) || emailScripts[0];
    setSubject(script.subject.replace(/\[Nombre\]/g, client.firstName || ""));
    setBody(script.body.replace(/\[Nombre\]/g, client.firstName || ""));
  };

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/gmail.send',
    onSuccess: (tokenResponse) => {
      setGoogleToken(tokenResponse.access_token);
      sessionStorage.setItem('gmail_access_token', tokenResponse.access_token);
    },
    onError: () => {
      alert("Fallo al iniciar sesión con Google.");
    }
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if (!googleToken) {
      alert("Por favor, inicia sesión con Google primero.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      alert("El asunto y el cuerpo del mensaje no pueden estar vacíos.");
      return;
    }

    setIsSending(true);

    try {
      const boundary = 'luxum_mail_boundary_' + Date.now().toString(16);
      
      // Base64 encode the subject to handle special characters correctly
      const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

      let mimeStr = 
        `To: ${client.email}\r\n` +
        `Cc: jvelasco@luxuminsurance.com\r\n` +
        `Subject: ${utf8Subject}\r\n` +
        `MIME-Version: 1.0\r\n` +
        `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n` +
        
        `--${boundary}\r\n` +
        `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
        `${body}\r\n\r\n`;

      // Add attachments
      for (const file of attachments) {
        const fileBase64 = await fileToBase64(file);
        mimeStr += `--${boundary}\r\n`;
        mimeStr += `Content-Type: ${file.type || 'application/octet-stream'}; name="${file.name}"\r\n`;
        mimeStr += `Content-Transfer-Encoding: base64\r\n`;
        mimeStr += `Content-Disposition: attachment; filename="${file.name}"\r\n\r\n`;
        mimeStr += `${fileBase64}\r\n\r\n`;
      }

      mimeStr += `--${boundary}--`;

      const encodedEmail = btoa(unescape(encodeURIComponent(mimeStr)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
           sessionStorage.removeItem('gmail_access_token');
           setGoogleToken(null);
           throw new Error("El token expiró o no tienes permisos. Por favor vuelve a iniciar sesión.");
        }
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error al enviar el correo');
      }

      alert("¡Correo enviado exitosamente con la API de Gmail!");
      onClose();

    } catch (error: any) {
      console.error(error);
      alert(error.message || "Ocurrió un error al enviar el correo.");
    } finally {
      setIsSending(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-10 w-72 bg-[#1e2343] border border-border/50 rounded-t-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[100] flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => setIsMinimized(false)}>
        <div className="flex items-center gap-2 text-foreground font-medium text-sm">
          <Mail className="w-4 h-4 text-primary" />
          <span>Mensaje a {client.firstName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1 hover:bg-white/10 rounded-md text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-10 w-[400px] md:w-[500px] bg-[#1e2343] border border-border/50 rounded-t-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] z-[100] flex flex-col overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-secondary px-4 py-3 flex items-center justify-between border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          Nuevo Mensaje
        </h3>
        <div className="flex items-center gap-1 text-muted-foreground">
          <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-white/10 rounded-md hover:text-foreground transition-colors">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {/* Plantilla Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Plantilla</label>
          <select 
            value={selectedScriptId} 
            onChange={(e) => handleScriptChange(e.target.value)}
            className="w-full px-3 py-2 bg-background rounded-md text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none"
          >
            {emailScripts.map(script => (
              <option key={script.id} value={script.id}>{script.title}</option>
            ))}
          </select>
        </div>

        {/* Para */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <span className="text-sm text-muted-foreground w-12">Para</span>
          <div className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-md font-medium">
            {client.firstName} {client.lastName} &lt;{client.email}&gt;
          </div>
        </div>

        {/* CC */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <span className="text-sm text-muted-foreground w-12">Cc</span>
          <div className="px-2 py-1 bg-secondary text-muted-foreground text-sm rounded-md font-medium">
            jvelasco@luxuminsurance.com
          </div>
        </div>

        {/* Asunto */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <span className="text-sm text-muted-foreground w-12">Asunto</span>
          <input 
            type="text" 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground/50"
            placeholder="Asunto del correo"
          />
        </div>

        {/* Cuerpo */}
        <div className="flex flex-col gap-2 mt-2 flex-1">
          <textarea 
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full h-48 bg-transparent text-sm text-foreground focus:outline-none resize-none placeholder:text-muted-foreground/50 custom-scrollbar"
            placeholder="Escribe tu mensaje aquí..."
          />
        </div>

        {/* Attachments UI */}
        <div className="flex flex-col gap-2 mt-2 border-t border-border/50 pt-3">
          <input 
            type="file" 
            multiple 
            className="hidden" 
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) {
                const newFiles = Array.from(e.target.files);
                setAttachments([...attachments, ...newFiles]);
              }
              // reset input to allow selecting same file again if deleted
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-muted-foreground rounded-md text-xs font-medium hover:bg-secondary/80 hover:text-foreground transition-colors"
          >
            <Paperclip className="w-3.5 h-3.5" />
            Adjuntar Archivo
          </button>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary/50 border border-border px-2 py-1 rounded-md text-xs">
                  <span className="truncate max-w-[150px] text-foreground">{file.name}</span>
                  <button 
                    onClick={() => setAttachments(attachments.filter((_, index) => index !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-secondary/30 border-t border-border/50 flex items-center justify-between">
        <div className="flex-1">
          {!googleToken ? (
            <button 
              onClick={() => login()}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-500 rounded-md text-xs font-medium hover:bg-blue-600/20 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Conectar Gmail para Enviar
            </button>
          ) : (
            <span className="text-[10px] text-success flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
              Conectado a Gmail
            </span>
          )}
        </div>
        
        <button 
          onClick={handleSend}
          disabled={!googleToken || isSending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {isSending ? "Enviando..." : "Enviar Correo"}
        </button>
      </div>
    </div>
  );
}
