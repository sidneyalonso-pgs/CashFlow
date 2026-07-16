const STATUS_STYLES: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-600",
  pendente_aprovacao: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-ps-green-200 text-ps-green-700",
  rejeitado: "bg-red-100 text-red-700",
  agendado: "bg-blue-100 text-blue-700",
  pago_parcialmente: "bg-yellow-100 text-yellow-800",
  pago: "bg-ps-green-200 text-ps-green-700",
  vencido: "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-500",
  ativo: "bg-ps-green-200 text-ps-green-700",
  inativo: "bg-gray-100 text-gray-500",
  estimada: "bg-blue-100 text-blue-700",
  confirmada: "bg-blue-100 text-blue-700",
  parcialmente_recebida: "bg-yellow-100 text-yellow-800",
  recebida: "bg-ps-green-200 text-ps-green-700",
  atrasada: "bg-red-100 text-red-700",
  reprogramada: "bg-yellow-100 text-yellow-800",
  cancelada: "bg-gray-100 text-gray-500",
  pendente: "bg-gray-100 text-gray-600",
  sugestao_encontrada: "bg-blue-100 text-blue-700",
  conciliado_automaticamente: "bg-ps-green-200 text-ps-green-700",
  conciliado_manualmente: "bg-ps-green-200 text-ps-green-700",
  divergente: "bg-red-100 text-red-700",
  ignorado: "bg-gray-100 text-gray-500",
  resgatado: "bg-gray-100 text-gray-500",
  parcialmente_resgatado: "bg-yellow-100 text-yellow-800",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  pendente_aprovacao: "Pendente de aprovação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  agendado: "Agendado",
  pago_parcialmente: "Pago parcialmente",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
  ativo: "Ativo",
  inativo: "Inativo",
  estimada: "Estimada",
  confirmada: "Confirmada",
  parcialmente_recebida: "Parcialmente recebida",
  recebida: "Recebida",
  atrasada: "Atrasada",
  reprogramada: "Reprogramada",
  cancelada: "Cancelada",
  pendente: "Pendente",
  sugestao_encontrada: "Sugestão encontrada",
  conciliado_automaticamente: "Conciliado (automático)",
  conciliado_manualmente: "Conciliado (manual)",
  divergente: "Divergente",
  ignorado: "Ignorado",
  resgatado: "Resgatado",
  parcialmente_resgatado: "Parcialmente resgatado",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
