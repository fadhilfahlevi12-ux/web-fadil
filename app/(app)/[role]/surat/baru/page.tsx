import { redirect } from "next/navigation";

import type { Role } from "@/db/schema";
import { SubmitLetterForm } from "./submit-letter-form";

export default async function AjukanSuratPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if ((role as Role) !== "mahasiswa") {
    redirect(`/${role}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <SubmitLetterForm />
    </div>
  );
}
