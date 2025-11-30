// Server Component（async OK）
import Viewer from "@/components/organisms/Viewer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <Viewer id={id} />
}
