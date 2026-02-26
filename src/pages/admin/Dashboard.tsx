import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dog, MessageSquare, Calendar, ShoppingCart, Mail, Package } from 'lucide-react';

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard() {
  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        activePuppiesRes,
        inquiriesRes,
        consultationsRes,
        productInquiriesRes,
        contactRes,
        productsRes,
        kitsRes,
      ] = await Promise.all([
        // Active puppies only (status=Available) with listing_date for avg days
        supabase
          .from('puppies')
          .select('listing_date, created_at')
          .eq('status', 'Available'),
        // Unseen submissions (admin_viewed_at is null)
        supabase.from('puppy_inquiries').select('*', { count: 'exact', head: true }).is('admin_viewed_at', null),
        supabase.from('consultation_requests').select('*', { count: 'exact', head: true }).is('admin_viewed_at', null),
        // Product inquiries: status='new' = unseen
        supabase.from('product_inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }).is('admin_viewed_at', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'available'),
        supabase.from('kits').select('*', { count: 'exact', head: true }),
      ]);

      const activePuppies = activePuppiesRes.error ? [] : (activePuppiesRes.data ?? []);
      const count = activePuppies.length;
      const totalDays = activePuppies.reduce((sum, p) => {
        const listDate = p.listing_date ?? (p.created_at ? p.created_at.slice(0, 10) : null);
        return sum + Math.max(0, daysSince(listDate));
      }, 0);
      const avgDaysListed = count > 0 ? Math.round(totalDays / count) : 0;

      return {
        activePuppyCount: count,
        avgDaysListed,
        unseenInquiries: inquiriesRes.error ? 0 : (inquiriesRes.count ?? 0),
        unseenConsultations: consultationsRes.error ? 0 : (consultationsRes.count ?? 0),
        unseenProductInquiries: productInquiriesRes.error ? 0 : (productInquiriesRes.count ?? 0),
        unseenContact: contactRes.error ? 0 : (contactRes.count ?? 0),
        availableProductCount: productsRes.error ? 0 : (productsRes.count ?? 0),
        kitCount: kitsRes.error ? 0 : (kitsRes.count ?? 0),
      };
    },
  });

  const statCards = [
    { title: 'Available Puppies', value: stats?.activePuppyCount ?? 0, icon: Dog, description: stats?.avgDaysListed != null && stats.avgDaysListed > 0 ? `Active listings · Avg ${stats.avgDaysListed} days listed` : 'Active listings', to: '/admin/puppies' },
    { title: 'Puppy Inquiries', value: stats?.unseenInquiries ?? 0, icon: MessageSquare, description: 'Unseen submissions', to: '/admin/inquiries#puppy-inquiries' },
    { title: 'Consultations', value: stats?.unseenConsultations ?? 0, icon: Calendar, description: 'Unseen submissions', to: '/admin/inquiries#consultations' },
    { title: 'Product Inquiries', value: stats?.unseenProductInquiries ?? 0, icon: ShoppingCart, description: 'New inquiries', to: '/admin/inquiries#product-inquiries' },
    { title: 'Contact Messages', value: stats?.unseenContact ?? 0, icon: Mail, description: 'Unseen submissions', to: '/admin/inquiries#contact-messages' },
    { title: 'Products Available', value: stats?.availableProductCount ?? 0, icon: ShoppingCart, description: 'Available for purchase', to: '/admin/inventory/products' },
    { title: 'Kits', value: stats?.kitCount ?? 0, icon: Package, description: 'Product kits', to: '/admin/inventory/kits' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.to} className="block">
            <Card className="cursor-pointer hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                <p className="text-xs text-muted-foreground mt-1">Click to view →</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
