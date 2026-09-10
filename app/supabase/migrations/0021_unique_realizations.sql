-- Toda baixa (payment_realizations / revenue_realizations) é 1:1 com o pagamento/receita —
-- o código inteiro assume isso (sempre apaga a baixa anterior antes de inserir a nova). Quando
-- duas requisições de "dar baixa" corriam ao mesmo tempo (duplo clique, reenvio de formulário),
-- as duas conseguiam inserir sua própria linha antes que a outra apagasse, gerando baixa em
-- dobro e inflando o Cash Flow. Isso já aconteceu várias vezes (SKY, VIDI TECH, Folha de
-- Pagamentos, Prestação de Serviços Jurídicos) e sempre precisou de limpeza manual.
--
-- Antes de travar a unicidade, remove duplicatas já existentes (mantém a baixa mais antiga de
-- cada pagamento/receita).
delete from payment_realizations pr
using payment_realizations pr2
where pr.payment_id = pr2.payment_id
  and pr.id > pr2.id;

delete from revenue_realizations rr
using revenue_realizations rr2
where rr.revenue_id = rr2.revenue_id
  and rr.id > rr2.id;

alter table payment_realizations
  add constraint payment_realizations_payment_id_key unique (payment_id);

alter table revenue_realizations
  add constraint revenue_realizations_revenue_id_key unique (revenue_id);
