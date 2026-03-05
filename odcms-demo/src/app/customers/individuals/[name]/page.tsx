import React from "react"
import IndividualProfilePage from "@/components/IndividualProfilePage"

type Props = { params: { name: string } }

export default function Page({ params }: Props) {
  const name = decodeURIComponent(params.name)
  return <div className="p-4"><IndividualProfilePage name={name} /></div>
}
