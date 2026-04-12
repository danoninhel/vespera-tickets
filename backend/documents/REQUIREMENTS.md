# Requisitos do Sistema (MVP)

## 🎯 Objetivo

Sistema de venda de ingressos para eventos pequenos (~70 pessoas), com foco em simplicidade e confiabilidade.

---

## 🎤 Eventos

* Criados manualmente pelo admin (via banco)
* Possuem:

  * título
  * descrição
  * imagem
  * capacidade
  * artistas (lista)
  * metadata flexível (jsonb)

---

## 🎟️ Lotes

* Um evento pode ter vários lotes

* Cada lote possui:

  * nome
  * preço
  * quantidade total
  * quantidade reservada
  * ordem (position)

* Sistema deve:

  * vender sempre o primeiro lote disponível
  * avançar automaticamente para o próximo

---

## 🧾 Compra (Order)

* Usuário pode comprar múltiplos ingressos

* Cada ingresso tem:

  * nome
  * email

* Fluxo:

  1. Criar order (PENDING)
  2. Reservar vagas
  3. Gerar pagamento Pix
  4. Aguardar confirmação

---

## 💸 Pagamento

* Via Pix (Mercado Pago)
* Webhook confirma pagamento

---

## ⏳ Expiração

* Orders expiram automaticamente
* Ao expirar:

  * liberar vagas no lote

---

## 🎫 Tickets

* Criados apenas após pagamento confirmado
* Ligados ao evento e à order
* Nominais (nome + email)

---

## 📧 Email

* Enviado após pagamento
* Contém:

  * dados do evento
  * lista de ingressos
  * ID do pedido

---

## 🚪 Entrada no evento

* Lista via banco
* Query por:

  * event_id
  * tickets pagos

---

## ❗ Regras importantes

* Não pode vender além da capacidade
* Não pode vender além do lote
* Deve suportar concorrência
* Webhook deve ser idempotente
* Sistema deve funcionar sem autenticação (MVP)
