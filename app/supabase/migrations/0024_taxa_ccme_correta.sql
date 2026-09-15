-- Taxa CCME real é 0,05166% (não 0,05% — o print da planilha mostrava arredondado).
-- Corrige o default da coluna e qualquer linha que já tenha sido salva com o valor errado
-- antes desta correção (0,05% exato só podia vir do default, nunca de digitação real).

alter table salva_guarda_diario alter column taxa_ccme set default 0.0005166;

update salva_guarda_diario set taxa_ccme = 0.0005166 where taxa_ccme = 0.0005;
