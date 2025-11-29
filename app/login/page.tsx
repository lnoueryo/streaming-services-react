import Login from "@/components/organisms/Login";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next ?? '/';
  return <Login next={next} />;
}