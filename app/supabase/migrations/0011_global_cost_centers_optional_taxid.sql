-- PagSmile Treasury — centro de custo passa a ser único por grupo (não duplicado
-- por empresa, já que são empresas do mesmo grupo) e CNPJ do fornecedor vira opcional.

alter table cost_centers alter column company_id drop not null;
alter table suppliers alter column tax_id drop not null;

-- Remove a constraint de unicidade (company_id, code), pois agora pode haver
-- centros de custo sem empresa (globais) e o código já é único por si só no contexto do grupo.
alter table cost_centers drop constraint if exists cost_centers_company_id_code_key;
