import { redirect } from 'next/navigation'

export default function SubmitProfessionalPage() {
  redirect('/?message=signin_required')
}
