CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.es_moderador_o_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
$$;

CREATE TABLE public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL DEFAULT 'Ciudadano',
  email TEXT NOT NULL DEFAULT '',
  tipo_cuenta TEXT NOT NULL DEFAULT 'ciudadano' CHECK (tipo_cuenta IN ('ciudadano', 'institucion_voluntariado')),
  nombre_institucion TEXT,
  provincia_id TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE ON public.perfiles TO authenticated;
GRANT SELECT ON public.perfiles TO anon;
GRANT ALL ON public.perfiles TO service_role;

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfiles visibles" ON public.perfiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Editar propio perfil" ON public.perfiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Crear propio perfil" ON public.perfiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nombre_completo', split_part(COALESCE(NEW.email, 'usuario'), '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.reportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id UUID NOT NULL,
  autor_nombre TEXT NOT NULL DEFAULT 'Ciudadano',
  provincia_id TEXT NOT NULL,
  municipio_distrito TEXT,
  descripcion TEXT NOT NULL,
  categoria_ia TEXT NOT NULL,
  urgencia_ia TEXT NOT NULL CHECK (urgencia_ia IN ('baja', 'media', 'alta', 'critica')),
  motivo_breve_ia TEXT,
  entidad_sugerida_ia TEXT,
  telefono_sugerido_ia TEXT,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  estado_verificacion TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_verificacion IN ('pendiente', 'verificado', 'rechazado')),
  moderado_por UUID,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.reportes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reportes TO authenticated;
GRANT ALL ON public.reportes TO service_role;

ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica reportes" ON public.reportes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Crear reporte autenticado" ON public.reportes FOR INSERT TO authenticated WITH CHECK (auth.uid() = autor_id);
CREATE POLICY "Moderar reportes" ON public.reportes FOR UPDATE TO authenticated USING (public.es_moderador_o_admin());
CREATE POLICY "Eliminar propio reporte o moderador" ON public.reportes FOR DELETE TO authenticated USING (auth.uid() = autor_id OR public.es_moderador_o_admin());

CREATE TABLE public.publicaciones_voluntariado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id UUID NOT NULL,
  nombre_institucion TEXT NOT NULL,
  tipo_publicacion TEXT NOT NULL CHECK (tipo_publicacion IN ('clase_taller', 'ubicacion_sede_acopio')),
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  provincia_id TEXT NOT NULL,
  municipio_distrito TEXT,
  direccion TEXT NOT NULL,
  fecha_horario TEXT,
  cupos INTEGER,
  telefono_contacto TEXT NOT NULL,
  latitud DOUBLE PRECISION,
  longitud DOUBLE PRECISION,
  verificada BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.publicaciones_voluntariado TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publicaciones_voluntariado TO authenticated;
GRANT ALL ON public.publicaciones_voluntariado TO service_role;

ALTER TABLE public.publicaciones_voluntariado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica voluntariado" ON public.publicaciones_voluntariado FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Crear voluntariado autenticado" ON public.publicaciones_voluntariado FOR INSERT TO authenticated WITH CHECK (auth.uid() = autor_id);
CREATE POLICY "Moderar voluntariado" ON public.publicaciones_voluntariado FOR UPDATE TO authenticated USING (auth.uid() = autor_id OR public.es_moderador_o_admin());
CREATE POLICY "Eliminar voluntariado" ON public.publicaciones_voluntariado FOR DELETE TO authenticated USING (auth.uid() = autor_id OR public.es_moderador_o_admin());

CREATE TABLE public.alertas_oficiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_boletin TEXT,
  titulo TEXT NOT NULL,
  nivel TEXT NOT NULL CHECK (nivel IN ('amarilla', 'naranja', 'roja')),
  categoria TEXT NOT NULL,
  provincias_afectadas TEXT[] NOT NULL,
  descripcion TEXT NOT NULL,
  vigencia_hasta TIMESTAMPTZ,
  fuente_oficial TEXT NOT NULL,
  enlace_respaldo TEXT,
  cargado_por UUID,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.alertas_oficiales TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alertas_oficiales TO authenticated;
GRANT ALL ON public.alertas_oficiales TO service_role;

ALTER TABLE public.alertas_oficiales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica alertas" ON public.alertas_oficiales FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Gestionar alertas moderador" ON public.alertas_oficiales FOR ALL TO authenticated USING (public.es_moderador_o_admin()) WITH CHECK (public.es_moderador_o_admin());

CREATE TABLE public.indices_por_provincia (
  provincia_id TEXT PRIMARY KEY,
  indice_general INTEGER NOT NULL DEFAULT 0,
  indice_robos INTEGER NOT NULL DEFAULT 0,
  indice_asesinatos INTEGER NOT NULL DEFAULT 0,
  indice_derrumbes INTEGER NOT NULL DEFAULT 0,
  indice_inundaciones INTEGER NOT NULL DEFAULT 0,
  indice_incendios INTEGER NOT NULL DEFAULT 0,
  fuente_oficial TEXT NOT NULL DEFAULT 'SATD / FELCC / ABC Cochabamba',
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.indices_por_provincia TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indices_por_provincia TO authenticated;
GRANT ALL ON public.indices_por_provincia TO service_role;

ALTER TABLE public.indices_por_provincia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica indices" ON public.indices_por_provincia FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Gestionar indices moderador" ON public.indices_por_provincia FOR ALL TO authenticated USING (public.es_moderador_o_admin()) WITH CHECK (public.es_moderador_o_admin());

CREATE TABLE public.mensajes_comunidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id UUID NOT NULL,
  autor_nombre TEXT NOT NULL,
  provincia_id TEXT,
  tema TEXT NOT NULL DEFAULT 'general',
  contenido TEXT NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.mensajes_comunidad TO anon;
GRANT SELECT, INSERT, DELETE ON public.mensajes_comunidad TO authenticated;
GRANT ALL ON public.mensajes_comunidad TO service_role;

ALTER TABLE public.mensajes_comunidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica comunidad" ON public.mensajes_comunidad FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Publicar en comunidad autenticado" ON public.mensajes_comunidad FOR INSERT TO authenticated WITH CHECK (auth.uid() = autor_id);
CREATE POLICY "Eliminar propio mensaje o moderador" ON public.mensajes_comunidad FOR DELETE TO authenticated USING (auth.uid() = autor_id OR public.es_moderador_o_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.reportes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.publicaciones_voluntariado;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas_oficiales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_comunidad;

INSERT INTO public.indices_por_provincia (provincia_id, indice_general, indice_robos, indice_asesinatos, indice_derrumbes, indice_inundaciones, indice_incendios, fuente_oficial) VALUES
  ('cercado', 78, 86, 62, 24, 58, 45, 'FELCC / GAM Cochabamba'),
  ('quillacollo', 68, 74, 48, 42, 64, 52, 'FELCC / SATD Cochabamba'),
  ('chapare', 72, 54, 58, 84, 88, 66, 'SATD / ABC Ruta F-4'),
  ('carrasco', 64, 46, 52, 76, 82, 74, 'SATD / ABC Trópico'),
  ('tiraque', 52, 30, 26, 68, 54, 62, 'SATD / SADA Cochabamba'),
  ('ayopaya', 46, 22, 24, 78, 48, 58, 'SATD / ABC Red Vial'),
  ('tapacari', 44, 20, 22, 72, 42, 46, 'SATD Cochabamba'),
  ('arque', 38, 18, 18, 64, 36, 40, 'SATD Cochabamba'),
  ('bolivar', 32, 14, 15, 58, 28, 34, 'SATD Cochabamba'),
  ('capinota', 41, 32, 26, 48, 52, 44, 'SATD / FELCC Valle Bajo'),
  ('esteban_arce', 36, 28, 22, 40, 38, 48, 'SATD Valle Alto'),
  ('german_jordan', 48, 44, 30, 28, 46, 42, 'FELCC / SATD Valle Alto'),
  ('punata', 54, 52, 34, 26, 48, 44, 'FELCC / SATD Valle Alto'),
  ('arani', 34, 24, 20, 44, 34, 50, 'SATD Cochabamba'),
  ('mizque', 49, 28, 26, 56, 50, 68, 'SATD / SADA Cono Sur'),
  ('campero', 58, 34, 32, 60, 44, 78, 'SATD / SADA Cono Sur')
ON CONFLICT (provincia_id) DO NOTHING;

INSERT INTO public.alertas_oficiales (codigo_boletin, titulo, nivel, categoria, provincias_afectadas, descripcion, fuente_oficial) VALUES
  ('SATD-2026-041', 'Alerta Naranja por crecida de ríos en el Trópico', 'naranja', 'inundacion', ARRAY['chapare', 'carrasco'], 'Incremento de caudales en los ríos Chapare, Espíritu Santo e Ichilo tras precipitaciones intensas en la cuenca alta.', 'SATD Cochabamba'),
  ('ABC-2026-118', 'Deslizamiento parcial en corredor F-4 (El Sillar)', 'roja', 'derrumbe', ARRAY['chapare', 'tiraque'], 'Circulación restringida a un carril entre los km 102 y 108 por desprendimiento de talud. Maquinaria pesada en zona.', 'ABC Cochabamba'),
  ('FELCC-2026-089', 'Refuerzo preventivo en eje metropolitano', 'amarilla', 'robo', ARRAY['cercado', 'quillacollo'], 'Patrullaje intensivo en inmediaciones de La Cancha, Terminal de Buses y Av. Blanco Galindo en horarios nocturnos.', 'FELCC Cochabamba');
