// Server Component（async OK）
import Broadcaster from "@/components/organisms/Broadcaster";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <Broadcaster id={id} />
}
