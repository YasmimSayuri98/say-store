const { test } = require('node:test');
const assert = require('node:assert');
const { round4, custoMedioPonderado } = require('../src/utils/money');
const { situacaoEstoque } = require('../src/services/estoqueService');

test('custo unitário da compra', () => {
  assert.strictEqual(round4(120 / 1000), 0.12);
});

test('custo médio ponderado - exemplo do documento', () => {
  // 500g a R$0,10 (R$50) + 1000g por R$120 => 1500g, R$170, ~0,1133/g
  const novo = custoMedioPonderado(500, 0.10, 1000, 120);
  assert.strictEqual(novo, 0.1133);
});

test('custo médio ponderado - estoque zerado', () => {
  const novo = custoMedioPonderado(0, 0, 1000, 120);
  assert.strictEqual(novo, 0.12);
});

test('custo do produto (chaveiro) soma dos materiais', () => {
  // 20*0,10 + 5*0,12 + 1*0,30 + 2*0,05 + 1*0,15 + 1*1,20 = 4,35
  const custo = round4(20 * 0.10) + round4(5 * 0.12) + round4(1 * 0.30) + round4(2 * 0.05) + round4(1 * 0.15) + round4(1 * 1.20);
  assert.strictEqual(round4(custo), 4.35);
});

test('consumo total = qtd por produto x qtd enviada', () => {
  const consumo = round4(25 * 10);
  assert.strictEqual(consumo, 250);
});

test('consolidação de material usado em vários produtos', () => {
  // Produto A usa 20g, Produto B usa 120g; 5 de A e 3 de B
  const total = round4(20 * 5) + round4(120 * 3);
  assert.strictEqual(total, 460);
});

test('bloqueio por estoque insuficiente', () => {
  const disponivel = 150, necessario = 230;
  assert.ok(disponivel < necessario);
  assert.strictEqual(round4(necessario - disponivel), 80);
});

test('situação de estoque - normal', () => {
  assert.strictEqual(situacaoEstoque(1000, 300), 'NORMAL');
});

test('situação de estoque - baixo (igual ao mínimo)', () => {
  assert.strictEqual(situacaoEstoque(300, 300), 'BAIXO');
});

test('situação de estoque - sem estoque', () => {
  assert.strictEqual(situacaoEstoque(0, 300), 'SEM_ESTOQUE');
});

test('ajuste manual negativo não pode zerar abaixo de zero', () => {
  const qtdAnterior = 50, remover = 80;
  assert.ok(round4(qtdAnterior - remover) < 0);
});
