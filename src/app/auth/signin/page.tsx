import AuthTabs from '@/components/auth/AuthTabs'

type SignInPageProps = {
  searchParams?: {
    callbackUrl?: string | string[]
  }
}

export default function SignInPage({ searchParams }: SignInPageProps) {
  const callbackUrl = Array.isArray(searchParams?.callbackUrl)
    ? searchParams.callbackUrl[0]
    : searchParams?.callbackUrl

  return <AuthTabs defaultTab="signin" callbackUrl={callbackUrl} />
}
