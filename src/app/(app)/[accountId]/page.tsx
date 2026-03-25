import { redirect } from 'next/navigation'

export default async function AccountPage(props: PageProps<'/[accountId]'>) {
  const { accountId } = await props.params
  const now = new Date()
  redirect(`/${accountId}/${now.getFullYear()}/${now.getMonth() + 1}`)
}
