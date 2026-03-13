import React from "react"
import CompanyProfilePage from "@/components/CompanyProfilePage"

type Props = { params: { id: string } }

export default function Page({ params }: Props) {
  const id = params.id
  return (
    <div className="p-4"><CompanyProfilePage id={id} /></div>
  )
}
