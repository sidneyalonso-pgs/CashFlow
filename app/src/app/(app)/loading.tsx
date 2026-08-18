import { PaginaSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return <PaginaSkeleton cards={5} colunas={8} />;
}
