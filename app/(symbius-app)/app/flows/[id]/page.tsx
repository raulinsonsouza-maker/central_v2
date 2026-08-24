import { FlowEditor } from "@/components/symbius/FlowEditor";

export default async function FlowEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FlowEditor fluxoId={id} />;
}
