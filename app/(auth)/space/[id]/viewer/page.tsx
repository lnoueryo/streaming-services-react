// Server Component（async OK）
// import Viewer from '@/components/organisms/Viewer'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ViewerPage({ params }: PageProps) {
  const { id } = await params
  // return <Viewer id={id} />
}
