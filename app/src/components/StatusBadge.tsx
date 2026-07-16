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
