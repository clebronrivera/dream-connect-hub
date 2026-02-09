import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dog, MessageSquare, Calendar, ShoppingCart } from 'lucide-react';

export default function Dashboard() {
  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [puppiesRes, inquiriesRes, consultationsRes, productsRes] = await Promise.all([
        supabase.from('puppies').select('*', { count: 'exact', head: true }),
        supabase.from('puppy_inquiries').select('*', { count: 'exact', head: true }),
        supabase.from('consultation_requests').select('*', { count: 'exact', head: true }),
        supabase.from('product_inquiries').select('*', { count: 'exact', head: true }),
      ]);

      return {
        totalPuppies: puppiesRes.error ? 0 : (puppiesRes.count ?? 0),
        totalInquiries: inquiriesRes.error ? 0 : (inquiriesRes.count ?? 0),
        totalConsultations: consultationsRes.error ? 0 : (consultationsRes.count ?? 0),
        totalProducts: productsRes.error ? 0 : (productsRes.count ?? 0),
      };
    },
  });

  const statCards = [
    {
      title: 'Total Puppies',
      value: stats?.totalPuppies || 0,
      icon: Dog,
      description: 'Active listings',
    },
    {
      title: 'Puppy Inquiries',
      value: stats?.totalInquiries || 0,
      icon: MessageSquare,
      description: 'Total submissions',
    },
    {
      title: 'Consultations',
      value: stats?.totalConsultations || 0,
      icon: Calendar,
      description: 'Scheduled & pending',
    },
    {
      title: 'Product Inquiries',
      value: stats?.totalProducts || 0,
      icon: ShoppingCart,
      description: 'Total inquiries',
    },
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
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
