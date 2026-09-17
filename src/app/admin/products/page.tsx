import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getProductsAction } from '@/app/actions';
import ProductManagementClient from '@/components/ProductManagementClient';

export const revalidate = 0;

export default async function AdminProductsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const { products = [] } = await getProductsAction();

  return <ProductManagementClient initialProducts={products} />;
}
