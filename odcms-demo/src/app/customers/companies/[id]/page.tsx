import React from "react"
import CompanyProfilePage from "@/components/CompanyProfilePage"
import AuthGuard from "@/components/AuthGuard"

type Props = { params: { id: string } }

export default function Page({ params }: Props) {
  const id = params.id
  return (
    <AuthGuard>
      <div className="p-4"><CompanyProfilePage id={id} /></div>
    </AuthGuard>
  )
}
