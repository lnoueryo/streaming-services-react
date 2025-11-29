import Login from "@/components/organisms/Login";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next || "/";
  return <Login next={next} />;
}