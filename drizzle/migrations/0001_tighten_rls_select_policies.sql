REVOKE SELECT ON public.perfiles FROM anon;

DROP POLICY IF EXISTS "Perfiles visibles" ON public.perfiles;
CREATE POLICY "Ver propio perfil o moderador"
ON public.perfiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.es_moderador_o_admin());

DROP POLICY IF EXISTS "Lectura publica alertas" ON public.alertas_oficiales;
CREATE POLICY "Lectura publica alertas vigentes"
ON public.alertas_oficiales FOR SELECT TO anon, authenticated
USING (vigencia_hasta IS NULL OR vigencia_hasta >= NOW());

DROP POLICY IF EXISTS "Lectura publica reportes" ON public.reportes;
CREATE POLICY "Lectura publica reportes activos"
ON public.reportes FOR SELECT TO anon, authenticated
USING (estado_verificacion <> 'rechazado' OR auth.uid() = autor_id OR public.es_moderador_o_admin());

DROP POLICY IF EXISTS "Lectura publica comunidad" ON public.mensajes_comunidad;
CREATE POLICY "Lectura publica comunidad por tema"
ON public.mensajes_comunidad FOR SELECT TO anon, authenticated
USING (tema IN ('general', 'seguridad', 'vias', 'ayuda'));

DROP POLICY IF EXISTS "Lectura publica voluntariado" ON public.publicaciones_voluntariado;
CREATE POLICY "Lectura publica voluntariado activo"
ON public.publicaciones_voluntariado FOR SELECT TO anon, authenticated
USING (tipo_publicacion IN ('clase_taller', 'ubicacion_sede_acopio'));

DROP POLICY IF EXISTS "Lectura publica indices" ON public.indices_por_provincia;
CREATE POLICY "Lectura publica indices validos"
ON public.indices_por_provincia FOR SELECT TO anon, authenticated
USING (indice_general >= 0 AND indice_general <= 100);
