-- AOP2 - Projeto Físico - Banco de dados de preços de combustíveis
-- SGBD: PostgreSQL 16
-- Integrantes:
-- Erick Marques - 202634166
-- Lucas Tejada Fabres - 202634526
-- Thiago Tejada Fabres - 202632854

CREATE TABLE cidade (
    codigo_cidade SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL CHECK (uf = UPPER(uf))
);

CREATE TABLE bairro (
    codigo_bairro SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    codigo_cidade INT NOT NULL,
    FOREIGN KEY (codigo_cidade) REFERENCES cidade(codigo_cidade),
    UNIQUE (nome, codigo_cidade)
);

CREATE TABLE posto (
    codigo_posto SERIAL PRIMARY KEY,
    nome_fantasia VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    endereco_logradouro VARCHAR(150) NOT NULL,
    endereco_numero VARCHAR(10),
    endereco_complemento VARCHAR(50),
    endereco_cep VARCHAR(9),
    telefone VARCHAR(15),
    codigo_bairro INT NOT NULL,
    FOREIGN KEY (codigo_bairro) REFERENCES bairro(codigo_bairro)
);

CREATE TABLE combustivel (
    codigo_combustivel SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    unidade_medida VARCHAR(10) NOT NULL
);

CREATE TABLE coleta (
    codigo_coleta SERIAL PRIMARY KEY,
    codigo_posto INT NOT NULL,
    codigo_combustivel INT NOT NULL,
    data_coleta DATE NOT NULL CHECK (data_coleta <= CURRENT_DATE),
    preco DECIMAL(6,3) NOT NULL CHECK (preco > 0),
    FOREIGN KEY (codigo_posto) REFERENCES posto(codigo_posto),
    FOREIGN KEY (codigo_combustivel) REFERENCES combustivel(codigo_combustivel),
    UNIQUE (codigo_posto, codigo_combustivel, data_coleta)
);