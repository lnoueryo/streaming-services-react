import { ReadonlyURLSearchParams } from 'next/navigation'

type Props = {
  params: { slug: string };
  searchParams: ReadonlyURLSearchParams
};

export default function Room(props: Props) {
  const { params, searchParams } = props;

  // ?page=1 でアクセスすると { page: '1' } を取得できる
  console.log("searchParams", searchParams);

  const allQueryParameters = searchParams.toString();

  // URLSearchParams を使用することで page=1 の文字列を取得できる
  console.log("allQueryParameters", allQueryParameters);

  return (
    <div>クエリパラメータ {allQueryParameters}</div>
  )
}
