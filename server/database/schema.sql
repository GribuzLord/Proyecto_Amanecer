-- =========================================================
-- Esquema de Base de Datos: Gestión de Programa Ministerial
-- Motor: MySQL 8+
-- =========================================================

CREATE DATABASE IF NOT EXISTS programa_ministerio
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE programa_ministerio;

-- ---------------------------------------------------------
-- USUARIOS
-- Un "admin" gestiona qué usuarios (congregaciones) pueden
-- entrar. Cada "usuario" gestiona su propio personal y
-- genera sus propios programas (multi-tenant por user_id).
-- ---------------------------------------------------------
CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  nombre              VARCHAR(150) NOT NULL,
  email               VARCHAR(150) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  rol                 ENUM('admin', 'usuario') NOT NULL DEFAULT 'usuario',
  nombre_congregacion VARCHAR(150) NULL,
  dia_entre_semana    INT NULL,
  dia_fin_semana      INT NULL,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- PERSONAS (personal de cada usuario/congregación)
-- ---------------------------------------------------------
CREATE TABLE personas (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  nombre            VARCHAR(150) NOT NULL,
  genero            ENUM('M', 'F') NOT NULL,
  privilegio        ENUM('anciano', 'siervo_ministerial', 'publicador_bautizado', 'publicador_no_bautizado')
                    NOT NULL DEFAULT 'publicador_bautizado',
  -- Lista de códigos de tipos_parte que esta persona puede realizar. Ej: ["presidente","discurso","lectura_biblia"]
  habilitaciones    JSON NOT NULL,
  apoya_acomodador  BOOLEAN NOT NULL DEFAULT FALSE,
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  ultima_asignacion DATE NULL COMMENT 'Fecha de la última vez que se le asignó una parte (para rotación equitativa)',
  ultima_asignacion_acomodador DATE NULL COMMENT 'Fecha de la última vez que se le asignó como acomodador',
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_personas_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- TIPOS DE PARTE (catálogo global de la estructura de la reunión)
-- Esto modela cada "casilla" que puede aparecer en la plantilla.
-- ---------------------------------------------------------
CREATE TABLE tipos_parte (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  codigo              VARCHAR(60) NOT NULL UNIQUE,
  seccion             ENUM('encabezado', 'tesoros', 'maestros', 'vida_cristiana', 'atalaya') NOT NULL,
  nombre              VARCHAR(150) NOT NULL,
  requiere_sala       BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Si se divide en Sala Principal / Sala Auxiliar',
  requiere_ayudante   BOOLEAN NOT NULL DEFAULT FALSE,
  restriccion_genero  ENUM('M', 'F', 'ninguna') NOT NULL DEFAULT 'ninguna',
  orden               INT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------
-- PROGRAMAS (una fila por semana generada)
-- ---------------------------------------------------------
CREATE TABLE programas (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT NOT NULL,
  semana_inicio  DATE NOT NULL,
  semana_fin     DATE NOT NULL,
  estado         ENUM('borrador', 'finalizado') NOT NULL DEFAULT 'borrador',
  grupo_aseo     VARCHAR(255) NULL,
  es_discurso_maestros BOOLEAN NOT NULL DEFAULT FALSE,
  pdf_path       VARCHAR(255) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_programas_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_semana (user_id, semana_inicio)
);

-- ---------------------------------------------------------
-- PARTES DEL PROGRAMA (el contenido editable de cada programa)
-- ---------------------------------------------------------
CREATE TABLE partes_programa (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  programa_id   INT NOT NULL,
  tipo_parte_id INT NOT NULL,
  titulo        VARCHAR(255) NULL COMMENT 'Texto del tema, editable (ej. "No tengas miedo")',
  sala          ENUM('principal', 'auxiliar', 'unica') NOT NULL DEFAULT 'unica',
  rol_slot      VARCHAR(40) NOT NULL DEFAULT 'titular' COMMENT 'titular | ayudante | conductor | lector',
  persona_id    INT NULL,
  texto_libre   VARCHAR(150) NULL COMMENT 'Texto manual si no hay persona vinculada',
  orden         INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_partes_programa FOREIGN KEY (programa_id) REFERENCES programas(id) ON DELETE CASCADE,
  CONSTRAINT fk_partes_tipo FOREIGN KEY (tipo_parte_id) REFERENCES tipos_parte(id),
  CONSTRAINT fk_partes_persona FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------
-- Semilla inicial del catálogo de tipos de parte
-- basada en la plantilla "Vida y Ministerio Cristianos"
-- ---------------------------------------------------------
INSERT INTO tipos_parte (codigo, seccion, nombre, requiere_sala, requiere_ayudante, restriccion_genero, orden) VALUES
('presidente',            'encabezado',     'Presidente',                         FALSE, FALSE, 'M', 1),
('consejero_auxiliar',    'encabezado',     'Consejero Sala Auxiliar',            FALSE, FALSE, 'M', 2),
('tesoro_1',              'tesoros',        'Tesoros de la Biblia (Tema)',        FALSE, FALSE, 'M', 3),
('perlas_escondidas',     'tesoros',        'Busquemos Perlas Escondidas',        FALSE, FALSE, 'M', 4),
('lectura_biblia',        'tesoros',        'Lectura de la Biblia',               TRUE,  FALSE, 'M', 5),
('conversaciones_1',      'maestros',       'Empiece Conversaciones',             TRUE,  TRUE,  'ninguna', 6),
('conversaciones_2',      'maestros',       'Haga revisitas',                     TRUE,  TRUE,  'ninguna', 7),
('discurso_estudiante',   'maestros',       'Participación (Punto 6)',            TRUE,  TRUE,  'M', 8),
('vida_cristiana_tema',   'vida_cristiana', 'Tema de Nuestra Vida Cristiana',      FALSE, FALSE, 'M', 9),
('estudio_congregacion',  'vida_cristiana', 'Estudio Bíblico de la Congregación', FALSE, FALSE, 'M', 10),
('lector_estudio',        'vida_cristiana', 'Lector (Estudio de la Congregación)', FALSE, FALSE, 'M', 11),
('oracion_final',         'vida_cristiana', 'Oración Final',                      FALSE, FALSE, 'M', 12),
('presidente_atalaya',    'atalaya',        'Presidente Estudio de la Atalaya',   FALSE, FALSE, 'M', 13),
('conductor_atalaya',     'atalaya',        'Conductor',                          FALSE, FALSE, 'M', 14),
('lector_atalaya',        'atalaya',        'Lector',                             FALSE, FALSE, 'M', 15),
('oracion_final_atalaya', 'atalaya',        'Oración Final',                      FALSE, FALSE, 'M', 16);
