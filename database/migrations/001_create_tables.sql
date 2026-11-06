-- Sistema de Localização de Vendedores
-- Migration: 001_create_tables.sql

-- Tabela USUARIO (comprador)
CREATE TABLE IF NOT EXISTS USUARIO (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_usuario_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela VENDEDOR
CREATE TABLE IF NOT EXISTS VENDEDOR (
    id_vendedor INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    descricao VARCHAR(500),
    endereco VARCHAR(255),
    latitude DECIMAL(10,8) NULL,
    longitude DECIMAL(11,8) NULL,
    localizacao_atualizada_em TIMESTAMP NULL,
    ativo BOOLEAN DEFAULT TRUE,
    avaliacao_media DECIMAL(3,2) DEFAULT 0.00,
    total_avaliacoes INT DEFAULT 0,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_vendedor_ativo (ativo),
    INDEX idx_vendedor_localizacao (latitude, longitude),
    INDEX idx_vendedor_avaliacao (avaliacao_media)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela CATEGORIA
CREATE TABLE IF NOT EXISTS CATEGORIA (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,

    INDEX idx_categoria_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela PRODUTO
CREATE TABLE IF NOT EXISTS PRODUTO (
    id_produto INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    id_categoria INT NOT NULL,
    unidade_medida VARCHAR(20) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (id_categoria) REFERENCES CATEGORIA(id_categoria),
    INDEX idx_produto_ativo (ativo),
    INDEX idx_produto_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela VENDEDOR_PRODUTO (oferta de um produto por um vendedor)
CREATE TABLE IF NOT EXISTS VENDEDOR_PRODUTO (
    id_vendedor_produto INT AUTO_INCREMENT PRIMARY KEY,
    id_vendedor INT NOT NULL,
    id_produto INT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    quantidade_disponivel DECIMAL(10,2),
    disponivel BOOLEAN DEFAULT TRUE,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_vendedor) REFERENCES VENDEDOR(id_vendedor) ON DELETE CASCADE,
    FOREIGN KEY (id_produto) REFERENCES PRODUTO(id_produto),
    UNIQUE KEY unique_vendedor_produto (id_vendedor, id_produto),
    INDEX idx_vendedor_produto_busca (id_produto, disponivel, preco)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela PESQUISA (histórico de pesquisas do utilizador)
CREATE TABLE IF NOT EXISTS PESQUISA (
    id_pesquisa INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_produto INT NULL,
    termo_pesquisa VARCHAR(255) NULL,
    latitude_usuario DECIMAL(10,8) NOT NULL,
    longitude_usuario DECIMAL(11,8) NOT NULL,
    raio_busca_km DECIMAL(5,2) DEFAULT 5.00,
    preco_minimo DECIMAL(10,2),
    preco_maximo DECIMAL(10,2),
    total_resultados INT DEFAULT 0,
    data_pesquisa TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_produto) REFERENCES PRODUTO(id_produto),
    INDEX idx_pesquisa_usuario (id_usuario, data_pesquisa),
    INDEX idx_pesquisa_data (data_pesquisa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela ROTA (deslocação do utilizador até um vendedor)
CREATE TABLE IF NOT EXISTS ROTA (
    id_rota INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_vendedor INT NOT NULL,
    id_produto INT NOT NULL,
    latitude_origem DECIMAL(10,8) NOT NULL,
    longitude_origem DECIMAL(11,8) NOT NULL,
    latitude_destino DECIMAL(10,8) NOT NULL,
    longitude_destino DECIMAL(11,8) NOT NULL,
    distancia_km DECIMAL(8,2),
    tempo_estimado_min INT,
    modo_transporte ENUM('driving', 'walking', 'transit', 'bicycling') DEFAULT 'driving',
    status_rota ENUM('iniciada', 'em_andamento', 'concluida', 'cancelada') DEFAULT 'iniciada',
    data_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_chegada TIMESTAMP NULL,
    google_maps_route_id VARCHAR(255),

    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_vendedor) REFERENCES VENDEDOR(id_vendedor),
    FOREIGN KEY (id_produto) REFERENCES PRODUTO(id_produto),
    INDEX idx_rota_usuario_status (id_usuario, status_rota, data_inicio),
    INDEX idx_rota_status (status_rota)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela AVALIACAO
CREATE TABLE IF NOT EXISTS AVALIACAO (
    id_avaliacao INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_vendedor INT NOT NULL,
    id_rota INT NULL,
    nota TINYINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario) REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_vendedor) REFERENCES VENDEDOR(id_vendedor),
    FOREIGN KEY (id_rota) REFERENCES ROTA(id_rota) ON DELETE SET NULL,
    UNIQUE KEY unique_usuario_vendedor_rota (id_usuario, id_vendedor, id_rota),
    INDEX idx_avaliacao_vendedor_nota (id_vendedor, nota),
    INDEX idx_avaliacao_data (data_avaliacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Triggers: mantêm VENDEDOR.avaliacao_media / total_avaliacoes sincronizados
DROP TRIGGER IF EXISTS update_vendedor_avaliacao_insert;
DROP TRIGGER IF EXISTS update_vendedor_avaliacao_update;
DROP TRIGGER IF EXISTS update_vendedor_avaliacao_delete;
DROP TRIGGER IF EXISTS update_rota_status_avaliacao;

DELIMITER //

CREATE TRIGGER update_vendedor_avaliacao_insert
AFTER INSERT ON AVALIACAO
FOR EACH ROW
BEGIN
    UPDATE VENDEDOR SET
        avaliacao_media = (SELECT COALESCE(ROUND(AVG(nota), 2), 0) FROM AVALIACAO WHERE id_vendedor = NEW.id_vendedor),
        total_avaliacoes = (SELECT COUNT(*) FROM AVALIACAO WHERE id_vendedor = NEW.id_vendedor)
    WHERE id_vendedor = NEW.id_vendedor;

    IF NEW.id_rota IS NOT NULL THEN
        UPDATE ROTA SET
            status_rota = 'concluida',
            data_chegada = COALESCE(data_chegada, NOW())
        WHERE id_rota = NEW.id_rota
          AND status_rota IN ('iniciada', 'em_andamento');
    END IF;
END//

CREATE TRIGGER update_vendedor_avaliacao_update
AFTER UPDATE ON AVALIACAO
FOR EACH ROW
BEGIN
    UPDATE VENDEDOR SET
        avaliacao_media = (SELECT COALESCE(ROUND(AVG(nota), 2), 0) FROM AVALIACAO WHERE id_vendedor = NEW.id_vendedor),
        total_avaliacoes = (SELECT COUNT(*) FROM AVALIACAO WHERE id_vendedor = NEW.id_vendedor)
    WHERE id_vendedor = NEW.id_vendedor;
END//

CREATE TRIGGER update_vendedor_avaliacao_delete
AFTER DELETE ON AVALIACAO
FOR EACH ROW
BEGIN
    UPDATE VENDEDOR SET
        avaliacao_media = (SELECT COALESCE(ROUND(AVG(nota), 2), 0) FROM AVALIACAO WHERE id_vendedor = OLD.id_vendedor),
        total_avaliacoes = (SELECT COUNT(*) FROM AVALIACAO WHERE id_vendedor = OLD.id_vendedor)
    WHERE id_vendedor = OLD.id_vendedor;
END//

DELIMITER ;
