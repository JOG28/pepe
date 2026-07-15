-- 1. Crear la tabla de recordatorios
CREATE TABLE public.recordatorios_whatsapp (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    telefono text NOT NULL,
    tipo text NOT NULL,
    detalle text NOT NULL,
    fecha_programada timestamp with time zone NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.recordatorios_whatsapp ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas para que los usuarios puedan ver y guardar sus propios recordatorios
CREATE POLICY "Los usuarios pueden insertar sus propios recordatorios" 
    ON public.recordatorios_whatsapp FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Los usuarios pueden ver sus propios recordatorios" 
    ON public.recordatorios_whatsapp FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);
