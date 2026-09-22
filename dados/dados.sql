-- AOP2 e AOP3 - Carga inicial do banco de precos de combustiveis
-- Cidade: Vila Velha/ES
-- Arquivo gerado por `npm run seed`. Nao edite a mao: os ajustes de endereco
-- devem ser feitos em `dados/posto_enderecos.csv` e o script rodado de novo.

BEGIN;

-- Cidade
INSERT INTO cidade (nome, uf)
SELECT 'Vila Velha', 'ES'
WHERE NOT EXISTS (SELECT 1 FROM cidade WHERE nome = 'Vila Velha' AND uf = 'ES');

-- Bairros
INSERT INTO bairro (nome, codigo_cidade)
SELECT v.nome, (SELECT codigo_cidade FROM cidade LIMIT 1)
FROM (VALUES
  ('COBI DE CIMA'),
  ('DIVINO ESPIRITO SANTO'),
  ('ITAPARICA'),
  ('PRAIA DA COSTA'),
  ('PRAIA DE ITAPARICA'),
  ('SAO TORQUATO')
) AS v(nome)
ON CONFLICT (nome, codigo_cidade) DO NOTHING;

-- Combustiveis monitorados
INSERT INTO combustivel (nome, unidade_medida)
SELECT v.nome, v.unidade_medida
FROM (VALUES
  ('Gasolina', 'Litro'),
  ('Gasolina aditivada', 'Litro'),
  ('Etanol', 'Litro'),
  ('Diesel comum', 'Litro'),
  ('Diesel S10', 'Litro')
) AS v(nome, unidade_medida)
ON CONFLICT (nome) DO NOTHING;

-- Postos com endereco vindo da base publica de CNPJ
INSERT INTO posto (nome_fantasia, cnpj, endereco_logradouro, endereco_numero, endereco_complemento, endereco_cep, telefone, codigo_bairro)
SELECT v.nome_fantasia, v.cnpj, v.logradouro, v.numero, v.complemento, v.cep, v.telefone,
       (SELECT codigo_bairro FROM bairro WHERE nome = v.bairro)
FROM (VALUES
  ('A.B.C. AUTO SERVICOS LTDA', '28.059.632/0001-40', 'ROBERT KENNEDY', '21', 'A', '29114000', NULL, 'SAO TORQUATO'),
  ('ARARA AZUL REDE DE POSTOS LTDA', '04.145.589/0011-49', 'RODOVIA DO SOL', '530', NULL, '29102020', '2732352525', 'PRAIA DE ITAPARICA'),
  ('AUTO POSTO DE COMBUSTIVEL RTT LTDA', '08.022.304/0001-61', 'MOEMA', '38', NULL, '29107250', '2733492709', 'DIVINO ESPIRITO SANTO'),
  ('ITAPARICA PETROLEO E COMERCIO LTDA', '01.635.041/0002-06', 'CARLOS LINDENBERG', '1395', NULL, '29117730', '2732044848', 'COBI DE CIMA'),
  ('POSTO CHAMPAGNAT LTDA', '09.167.931/0001-53', 'HUGO MUSSO', '550', NULL, '29101280', '2733293173', 'PRAIA DA COSTA'),
  ('POSTO PERIM LTDA', '01.496.517/0001-86', 'SANTA LEOPOLDINA', '1650', NULL, '29102040', NULL, 'ITAPARICA')
) AS v(nome_fantasia, cnpj, logradouro, numero, complemento, cep, telefone, bairro)
ON CONFLICT (cnpj) DO UPDATE SET
  nome_fantasia = EXCLUDED.nome_fantasia,
  endereco_logradouro = EXCLUDED.endereco_logradouro,
  endereco_numero = EXCLUDED.endereco_numero,
  endereco_complemento = EXCLUDED.endereco_complemento,
  endereco_cep = EXCLUDED.endereco_cep,
  telefone = COALESCE(EXCLUDED.telefone, posto.telefone),
  codigo_bairro = EXCLUDED.codigo_bairro;

-- Coletas: cada celula de preco preenchida vira uma amostra
INSERT INTO coleta (codigo_posto, codigo_combustivel, data_coleta, preco)
SELECT p.codigo_posto, c.codigo_combustivel, v.data_coleta::date, v.preco
FROM (VALUES
  ('28.059.632/0001-40', 'Gasolina', '2026-07-21', 6.340),
  ('28.059.632/0001-40', 'Gasolina aditivada', '2026-07-21', 6.740),
  ('28.059.632/0001-40', 'Etanol', '2026-07-21', 4.690),
  ('28.059.632/0001-40', 'Diesel comum', '2026-07-21', 6.690),
  ('28.059.632/0001-40', 'Diesel S10', '2026-07-21', 6.790),
  ('28.059.632/0001-40', 'Gasolina', '2026-07-27', 6.340),
  ('28.059.632/0001-40', 'Gasolina aditivada', '2026-07-27', 6.740),
  ('28.059.632/0001-40', 'Etanol', '2026-07-27', 4.690),
  ('28.059.632/0001-40', 'Diesel comum', '2026-07-27', 6.690),
  ('28.059.632/0001-40', 'Diesel S10', '2026-07-27', 6.790),
  ('28.059.632/0001-40', 'Gasolina', '2026-08-03', 6.340),
  ('28.059.632/0001-40', 'Gasolina aditivada', '2026-08-03', 6.740),
  ('28.059.632/0001-40', 'Etanol', '2026-08-03', 4.690),
  ('28.059.632/0001-40', 'Diesel comum', '2026-08-03', 6.690),
  ('28.059.632/0001-40', 'Diesel S10', '2026-08-03', 6.790),
  ('28.059.632/0001-40', 'Gasolina', '2026-08-11', 6.250),
  ('28.059.632/0001-40', 'Gasolina aditivada', '2026-08-11', 6.650),
  ('28.059.632/0001-40', 'Etanol', '2026-08-11', 4.690),
  ('28.059.632/0001-40', 'Diesel comum', '2026-08-11', 6.690),
  ('28.059.632/0001-40', 'Diesel S10', '2026-08-11', 6.790),
  ('28.059.632/0001-40', 'Gasolina', '2026-08-25', 6.250),
  ('28.059.632/0001-40', 'Gasolina aditivada', '2026-08-25', 6.650),
  ('28.059.632/0001-40', 'Etanol', '2026-08-25', 4.390),
  ('28.059.632/0001-40', 'Diesel comum', '2026-08-25', 6.690),
  ('28.059.632/0001-40', 'Diesel S10', '2026-08-25', 6.790),
  ('04.145.589/0011-49', 'Gasolina', '2026-07-21', 6.490),
  ('04.145.589/0011-49', 'Gasolina aditivada', '2026-07-21', 6.740),
  ('04.145.589/0011-49', 'Etanol', '2026-07-21', 4.590),
  ('04.145.589/0011-49', 'Diesel S10', '2026-07-21', 6.740),
  ('04.145.589/0011-49', 'Gasolina', '2026-07-29', 6.390),
  ('04.145.589/0011-49', 'Gasolina aditivada', '2026-07-29', 6.640),
  ('04.145.589/0011-49', 'Etanol', '2026-07-29', 4.590),
  ('04.145.589/0011-49', 'Diesel S10', '2026-07-29', 6.740),
  ('04.145.589/0011-49', 'Gasolina', '2026-08-03', 6.390),
  ('04.145.589/0011-49', 'Gasolina aditivada', '2026-08-03', 6.640),
  ('04.145.589/0011-49', 'Etanol', '2026-08-03', 4.590),
  ('04.145.589/0011-49', 'Diesel S10', '2026-08-03', 6.740),
  ('04.145.589/0011-49', 'Gasolina', '2026-08-12', 6.570),
  ('04.145.589/0011-49', 'Gasolina aditivada', '2026-08-12', 6.570),
  ('04.145.589/0011-49', 'Etanol', '2026-08-12', 4.370),
  ('04.145.589/0011-49', 'Diesel S10', '2026-08-12', 6.690),
  ('04.145.589/0011-49', 'Gasolina', '2026-08-19', 6.350),
  ('04.145.589/0011-49', 'Gasolina aditivada', '2026-08-19', 6.570),
  ('04.145.589/0011-49', 'Etanol', '2026-08-19', 4.370),
  ('04.145.589/0011-49', 'Diesel S10', '2026-08-19', 6.690),
  ('04.145.589/0011-49', 'Gasolina aditivada', '2026-08-26', 6.390),
  ('04.145.589/0011-49', 'Etanol', '2026-08-26', 4.370),
  ('04.145.589/0011-49', 'Diesel S10', '2026-08-26', 6.690),
  ('08.022.304/0001-61', 'Gasolina', '2026-07-20', 6.450),
  ('08.022.304/0001-61', 'Gasolina aditivada', '2026-07-20', 6.740),
  ('08.022.304/0001-61', 'Etanol', '2026-07-20', 4.970),
  ('08.022.304/0001-61', 'Diesel S10', '2026-07-20', 6.970),
  ('08.022.304/0001-61', 'Gasolina', '2026-07-28', 6.270),
  ('08.022.304/0001-61', 'Gasolina aditivada', '2026-07-28', 6.440),
  ('08.022.304/0001-61', 'Etanol', '2026-07-28', 4.970),
  ('08.022.304/0001-61', 'Diesel S10', '2026-07-28', 6.970),
  ('08.022.304/0001-61', 'Gasolina', '2026-08-03', 6.270),
  ('08.022.304/0001-61', 'Gasolina aditivada', '2026-08-03', 6.440),
  ('08.022.304/0001-61', 'Etanol', '2026-08-03', 4.970),
  ('08.022.304/0001-61', 'Diesel S10', '2026-08-03', 6.970),
  ('08.022.304/0001-61', 'Gasolina', '2026-08-12', 6.270),
  ('08.022.304/0001-61', 'Gasolina aditivada', '2026-08-12', 6.440),
  ('08.022.304/0001-61', 'Etanol', '2026-08-12', 4.970),
  ('08.022.304/0001-61', 'Diesel S10', '2026-08-12', 6.970),
  ('08.022.304/0001-61', 'Gasolina', '2026-08-19', 6.270),
  ('08.022.304/0001-61', 'Gasolina aditivada', '2026-08-19', 6.440),
  ('08.022.304/0001-61', 'Etanol', '2026-08-19', 4.970),
  ('08.022.304/0001-61', 'Diesel S10', '2026-08-19', 6.970),
  ('08.022.304/0001-61', 'Gasolina', '2026-08-26', 6.270),
  ('08.022.304/0001-61', 'Gasolina aditivada', '2026-08-26', 6.440),
  ('08.022.304/0001-61', 'Etanol', '2026-08-26', 4.970),
  ('08.022.304/0001-61', 'Diesel S10', '2026-08-26', 6.970),
  ('01.635.041/0002-06', 'Gasolina', '2026-07-29', 6.290),
  ('01.635.041/0002-06', 'Gasolina aditivada', '2026-07-29', 6.690),
  ('01.635.041/0002-06', 'Etanol', '2026-07-29', 4.350),
  ('01.635.041/0002-06', 'Diesel comum', '2026-07-29', 6.790),
  ('01.635.041/0002-06', 'Gasolina', '2026-08-03', 6.290),
  ('01.635.041/0002-06', 'Gasolina aditivada', '2026-08-03', 6.690),
  ('01.635.041/0002-06', 'Etanol', '2026-08-03', 4.350),
  ('01.635.041/0002-06', 'Diesel comum', '2026-08-03', 6.790),
  ('01.635.041/0002-06', 'Gasolina', '2026-08-11', 6.290),
  ('01.635.041/0002-06', 'Gasolina aditivada', '2026-08-11', 6.690),
  ('01.635.041/0002-06', 'Etanol', '2026-08-11', 4.350),
  ('01.635.041/0002-06', 'Diesel comum', '2026-08-11', 6.790),
  ('01.635.041/0002-06', 'Gasolina', '2026-08-18', 6.290),
  ('01.635.041/0002-06', 'Gasolina aditivada', '2026-08-18', 6.690),
  ('01.635.041/0002-06', 'Etanol', '2026-08-18', 4.350),
  ('01.635.041/0002-06', 'Diesel comum', '2026-08-18', 6.790),
  ('01.635.041/0002-06', 'Gasolina', '2026-08-25', 6.250),
  ('01.635.041/0002-06', 'Gasolina aditivada', '2026-08-25', 6.650),
  ('01.635.041/0002-06', 'Etanol', '2026-08-25', 4.350),
  ('01.635.041/0002-06', 'Diesel comum', '2026-08-25', 6.790),
  ('09.167.931/0001-53', 'Gasolina', '2026-07-20', 6.690),
  ('09.167.931/0001-53', 'Gasolina aditivada', '2026-07-20', 6.890),
  ('09.167.931/0001-53', 'Etanol', '2026-07-20', 4.990),
  ('09.167.931/0001-53', 'Diesel S10', '2026-07-20', 6.990),
  ('09.167.931/0001-53', 'Gasolina', '2026-07-29', 6.490),
  ('09.167.931/0001-53', 'Gasolina aditivada', '2026-07-29', 6.890),
  ('09.167.931/0001-53', 'Etanol', '2026-07-29', 4.990),
  ('09.167.931/0001-53', 'Diesel S10', '2026-07-29', 6.990),
  ('09.167.931/0001-53', 'Gasolina', '2026-08-03', 6.490),
  ('09.167.931/0001-53', 'Gasolina aditivada', '2026-08-03', 6.890),
  ('09.167.931/0001-53', 'Etanol', '2026-08-03', 4.990),
  ('09.167.931/0001-53', 'Diesel S10', '2026-08-03', 6.990),
  ('09.167.931/0001-53', 'Gasolina', '2026-08-12', 6.490),
  ('09.167.931/0001-53', 'Gasolina aditivada', '2026-08-12', 6.890),
  ('09.167.931/0001-53', 'Etanol', '2026-08-12', 4.990),
  ('09.167.931/0001-53', 'Diesel S10', '2026-08-12', 6.990),
  ('09.167.931/0001-53', 'Gasolina', '2026-08-18', 6.490),
  ('09.167.931/0001-53', 'Gasolina aditivada', '2026-08-18', 6.890),
  ('09.167.931/0001-53', 'Etanol', '2026-08-18', 4.990),
  ('09.167.931/0001-53', 'Diesel S10', '2026-08-18', 6.990),
  ('09.167.931/0001-53', 'Gasolina', '2026-08-26', 6.390),
  ('09.167.931/0001-53', 'Gasolina aditivada', '2026-08-26', 6.890),
  ('09.167.931/0001-53', 'Etanol', '2026-08-26', 4.990),
  ('09.167.931/0001-53', 'Diesel S10', '2026-08-26', 6.990),
  ('01.496.517/0001-86', 'Gasolina', '2026-07-21', 6.490),
  ('01.496.517/0001-86', 'Gasolina aditivada', '2026-07-21', 6.690),
  ('01.496.517/0001-86', 'Etanol', '2026-07-21', 4.890),
  ('01.496.517/0001-86', 'Diesel S10', '2026-07-21', 6.990),
  ('01.496.517/0001-86', 'Gasolina', '2026-07-27', 6.490),
  ('01.496.517/0001-86', 'Gasolina aditivada', '2026-07-27', 6.690),
  ('01.496.517/0001-86', 'Etanol', '2026-07-27', 4.890),
  ('01.496.517/0001-86', 'Diesel S10', '2026-07-27', 6.990),
  ('01.496.517/0001-86', 'Gasolina', '2026-08-10', 6.390),
  ('01.496.517/0001-86', 'Gasolina aditivada', '2026-08-10', 6.590),
  ('01.496.517/0001-86', 'Etanol', '2026-08-10', 4.890),
  ('01.496.517/0001-86', 'Diesel S10', '2026-08-10', 6.990),
  ('01.496.517/0001-86', 'Gasolina', '2026-08-19', 6.390),
  ('01.496.517/0001-86', 'Gasolina aditivada', '2026-08-19', 6.590),
  ('01.496.517/0001-86', 'Etanol', '2026-08-19', 4.890),
  ('01.496.517/0001-86', 'Diesel S10', '2026-08-19', 6.990),
  ('01.496.517/0001-86', 'Gasolina', '2026-08-24', 6.390),
  ('01.496.517/0001-86', 'Gasolina aditivada', '2026-08-24', 6.590),
  ('01.496.517/0001-86', 'Etanol', '2026-08-24', 4.890),
  ('01.496.517/0001-86', 'Diesel S10', '2026-08-24', 6.990)
) AS v(cnpj, combustivel, data_coleta, preco)
JOIN posto p ON p.cnpj = v.cnpj
JOIN combustivel c ON c.nome = v.combustivel
ON CONFLICT (codigo_posto, codigo_combustivel, data_coleta)
DO UPDATE SET preco = EXCLUDED.preco;

COMMIT;

-- Conferencia da carga
SELECT p.nome_fantasia AS posto, COUNT(*) AS amostras, COUNT(DISTINCT col.data_coleta) AS datas
FROM coleta col JOIN posto p ON p.codigo_posto = col.codigo_posto
GROUP BY p.nome_fantasia ORDER BY p.nome_fantasia;
