import { SignUp } from '@/lib/dev/clerk-client'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <SignUp />
    </div>
  )
}
