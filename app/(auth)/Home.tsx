'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import { spaceRepositoryClient } from "@/lib/repositories/client/space.repository.client";
import { authRepositoryClient } from "@/lib/repositories/client/auth.repository.client";
import { useUser } from "./user-provider";
import Modal from "@/components/atoms/Modal";
import Button from "@/components/atoms/Button";
import { useLoading } from "../LoadingContext";

export default function Home() {
  const { startLoading, endLoading } = useLoading();
  const user = useUser();
  const router = useRouter();
  // TODO open,closeでフォームをリセット
  const [isOpenCreateRoomForm, setIsOpenCreateRoomForm] = useState(false);

  // === form state ===
  const [name, setName] = useState("");
  const [privacy, setPrivacy] = useState<"public" | 'protected' | "private">("public");
  const [members, setInvitees] = useState<{ email: string; role: "member" | "admin" }[]>([
    { email: "", role: "member" },
  ]);

  // update invitee email or role
  const updateInvitee = (idx: number, key: "email" | "role", value: string) => {
    const arr = [...members];
    arr[idx] = { ...arr[idx], [key]: value } as any;
    setInvitees(arr);
  };

  const addInvitee = () => {
    setInvitees([...members, { email: "", role: "member" }]);
  };

  const removeEmailField = (idx: number) => {
    setInvitees(members.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    startLoading();

    const payload = {
      name,
      privacy,
      members: privacy !== "public"
        ? members.filter(i => i.email.trim() !== "")
        : [],
    };

    try {
      const space = await spaceRepositoryClient.createSpace(payload);
      setIsOpenCreateRoomForm(false);
      // router.push(`/space/${space.id}`);
    } finally {
      endLoading();
    }
  };

  const handleLogout = async () => {
    startLoading();
    await authRepositoryClient.logout();
    router.replace("/login");
    endLoading();
  };

  return (
    <>
      <div className="max-w-lg mx-auto mt-20">
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-bold">ホーム</h1>

          <p className="text-gray-700">
            ログイン中：{user.name} {user.email || "No email"}
          </p>

          <Button
            onClick={() => setIsOpenCreateRoomForm(true)}
            className="bg-blue-600 text-white p-3 rounded"
          >
            ルーム作成
          </Button>
          <Button
            onClick={handleLogout}
            className="bg-gray-700 text-white p-3 rounded"
          >
            ログアウト
          </Button>
        </div>
      </div>

      <Modal open={isOpenCreateRoomForm} onClose={() => setIsOpenCreateRoomForm(false)} persistent>
        <div className="space-y-4 p-4 w-full max-w-md">
          <h2 className="text-xl font-semibold">スペースを作成</h2>

          {/* 名前 */}
          <div>
            <label className="block text-sm font-medium">名前 (任意)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border rounded px-2 py-1"
              placeholder="スペース名"
            />
          </div>

          {/* プライバシー */}
          <div>
            <label className="block text-sm font-medium text-white">
              プライバシー
            </label>

            <select
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value as any)}
              className="
                mt-1 block w-full rounded border
                bg-gray-800 text-white
                border-gray-600
                px-2 py-1
                focus:outline-none focus:ring
              "
            >
              <option value="public">公開</option>
              <option value="protected">一部非公開 (招待URLを知っている人のみ)</option>
              <option value="private">非公開 (招待制)</option>
            </select>
          </div>

          {/* Private の場合のみ Emails + Role */}
          {privacy !== "public" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">招待するメンバー (任意)</label>

              {members.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="email"
                    value={item.email}
                    onChange={(e) => updateInvitee(idx, "email", e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 border rounded px-2 py-1"
                  />

                  <select
                    value={item.role}
                    onChange={(e) => updateInvitee(idx, "role", e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>

                  <button
                    className="text-red-500 font-bold"
                    onClick={() => removeEmailField(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                className="text-sm underline text-gray-600"
                onClick={addInvitee}
              >
                + さらに追加
              </button>
            </div>
          )}

          {/* Submit ボタン */}
          <div className="flex justify-end gap-2">
            <Button onClick={() => setIsOpenCreateRoomForm(false)} className="px-3 py-1 bg-gray-200">
              キャンセル
            </Button>
            <Button onClick={handleSubmit} className="px-3 py-1 bg-blue-500 text-white">
              作成
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}