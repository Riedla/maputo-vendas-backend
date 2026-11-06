-- Dados iniciais: categorias, produtos e contas de demonstração.
-- Palavra-passe de todas as contas de demonstração: senha123
-- (NÃO aplicar em produção.)

INSERT IGNORE INTO CATEGORIA (id_categoria, nome) VALUES
    (1, 'Hortícolas'),
    (2, 'Frutas'),
    (3, 'Cereais e Farinhas'),
    (4, 'Peixe e Marisco'),
    (5, 'Carnes'),
    (6, 'Mercearia');

INSERT IGNORE INTO PRODUTO (id_produto, nome, id_categoria, unidade_medida) VALUES
    (1,  'Tomate',              1, 'kg'),
    (2,  'Cebola',              1, 'kg'),
    (3,  'Batata reno',         1, 'kg'),
    (4,  'Couve',               1, 'molho'),
    (5,  'Mandioca',            1, 'kg'),
    (6,  'Banana',              2, 'cacho'),
    (7,  'Manga',               2, 'unidade'),
    (8,  'Coco',                2, 'unidade'),
    (9,  'Arroz',               3, 'kg'),
    (10, 'Farinha de milho',    3, 'kg'),
    (11, 'Carapau',             4, 'kg'),
    (12, 'Camarão',             4, 'kg'),
    (13, 'Frango',              5, 'unidade'),
    (14, 'Carne de vaca',       5, 'kg'),
    (15, 'Óleo de cozinha',     6, 'litro'),
    (16, 'Açúcar',              6, 'kg'),
    (17, 'Feijão manteiga',     6, 'kg'),
    (18, 'Castanha de caju',    6, 'kg');

INSERT IGNORE INTO USUARIO (id_usuario, nome, email, telefone, senha_hash) VALUES
    (1, 'Utilizador Demo', 'usuario@demo.co.mz', '+258841234567',
     '$2a$10$fzNBpKCml1sx./lbRC4oV.RCnPRvolHrh65tLZ.ZMy7Uy5whnQdiO');

INSERT IGNORE INTO VENDEDOR (id_vendedor, nome, email, telefone, senha_hash, descricao, endereco, latitude, longitude, localizacao_atualizada_em) VALUES
    (1, 'Banca da Dona Amélia', 'amelia@demo.co.mz', '+258821111111',
     '$2a$10$fzNBpKCml1sx./lbRC4oV.RCnPRvolHrh65tLZ.ZMy7Uy5whnQdiO',
     'Hortícolas frescos todos os dias', 'Mercado Central, Baixa', -25.96920000, 32.57320000, NOW()),
    (2, 'Peixaria do Zé', 'ze@demo.co.mz', '+258842222222',
     '$2a$10$fzNBpKCml1sx./lbRC4oV.RCnPRvolHrh65tLZ.ZMy7Uy5whnQdiO',
     'Peixe e marisco da Costa do Sol', 'Mercado do Peixe, Av. Marginal', -25.93810000, 32.60690000, NOW()),
    (3, 'Mercearia Xipamanine', 'xipamanine@demo.co.mz', '+258863333333',
     '$2a$10$fzNBpKCml1sx./lbRC4oV.RCnPRvolHrh65tLZ.ZMy7Uy5whnQdiO',
     'Cereais, farinhas e mercearia a grosso e a retalho', 'Mercado de Xipamanine', -25.94660000, 32.55440000, NOW()),
    (4, 'Frutas da Janet', 'janet@demo.co.mz', '+258874444444',
     '$2a$10$fzNBpKCml1sx./lbRC4oV.RCnPRvolHrh65tLZ.ZMy7Uy5whnQdiO',
     'Fruta da época', 'Mercado Janet, Av. Mao Tse Tung', -25.96050000, 32.58800000, NOW()),
    (5, 'Talho Zimpeto', 'zimpeto@demo.co.mz', '+258845555555',
     '$2a$10$fzNBpKCml1sx./lbRC4oV.RCnPRvolHrh65tLZ.ZMy7Uy5whnQdiO',
     'Carnes e frangos', 'Mercado Grossista do Zimpeto', -25.86970000, 32.56170000, NOW());

-- Preços em Meticais (MZN)
INSERT IGNORE INTO VENDEDOR_PRODUTO (id_vendedor, id_produto, preco, quantidade_disponivel) VALUES
    (1, 1, 60.00, 50), (1, 2, 70.00, 40), (1, 3, 80.00, 30), (1, 4, 25.00, 20), (1, 5, 40.00, 25),
    (2, 11, 250.00, 15), (2, 12, 900.00, 8),
    (3, 9, 85.00, 100), (3, 10, 45.00, 200), (3, 15, 180.00, 60), (3, 16, 90.00, 80), (3, 17, 120.00, 40), (3, 1, 55.00, 20),
    (4, 6, 150.00, 10), (4, 7, 15.00, 100), (4, 8, 35.00, 60), (4, 18, 600.00, 10),
    (5, 13, 350.00, 30), (5, 14, 420.00, 25), (5, 2, 65.00, 30);
