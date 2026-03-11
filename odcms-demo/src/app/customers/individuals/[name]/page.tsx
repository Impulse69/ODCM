import React from "react"
import IndividualProfilePage from "@/components/IndividualProfilePage"
import AuthGuard from "@/components/AuthGuard"

type Props = { params: { name: string } }

export default function Page({ params }: Props) {
  const name = decodeURIComponent(params.name)
  return (
    <AuthGuard>
      <div className="p-4"><IndividualProfilePage name={name} /></div>
    </AuthGuard>
  )
}
