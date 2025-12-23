type Invitee = { email: string; role: 'member' | 'admin' }

export default function InviteForm({
  value,
  onChange,
}: {
  value: Invitee[]
  onChange: React.Dispatch<React.SetStateAction<Invitee[]>>
}) {
  const updateInvitee = (
    idx: number,
    key: 'email' | 'role',
    v: string
  ) => {
    onChange((prev) => {
      const arr = [...prev]
      arr[idx] = { ...arr[idx], [key]: v } as Invitee
      return arr
    })
  }

  const addInvitee = () => {
    onChange((prev) => [...prev, { email: '', role: 'member' }])
  }

  const removeEmailField = (idx: number) => {
    onChange((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        招待するメンバー (任意)
      </label>

      {value.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input
            type="email"
            value={item.email}
            onChange={(e) =>
              updateInvitee(idx, 'email', e.target.value)
            }
            className="flex-1 border rounded px-2 py-1"
          />

          <select
            value={item.role}
            onChange={(e) =>
              updateInvitee(idx, 'role', e.target.value)
            }
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
        type="button"
        className="text-sm underline text-gray-600"
        onClick={addInvitee}
      >
        + さらに追加
      </button>
    </div>
  )
}