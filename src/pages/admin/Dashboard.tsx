import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dog, MessageSquare, Calendar, ShoppingCart, Mail, Package, BarChart3, TrendingUp } from 'lucide-react';
import { SUBJECT_UPCOMING_LITTER, sourceToSlug, type RecentInquirySource } from '@/lib/inquiry-subjects';

// --- Helper functions ---
function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** URL source param for routing to Inquiries tab and opening a message. */
function sourceToSearchParam(source: RecentInquirySource): string {
  return sourceToSlug(source);
}

export interface RecentInquiryRow {
  id: string;
  createdAt: string;
  name: string;
  typeSubject: string;
  source: RecentInquirySource;
  status: 'Viewed' | 'New';
}

export default function Dashboard() {
  const navigate = useNavigate();

  // --- Query / data fetching ---
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [
        activePuppiesRes,
        unseenInquiriesRes,
        unseenConsultationsRes,
        newProductInquiriesRes,
        unseenContactRes,
        productsRes,
        kitsRes,
        puppyInquiriesEarliestRes,
        puppyInquiriesCountRes,
        contactEarliestRes,
        contactCountRes,
        soldPuppiesRes,
        puppyInquiriesForBreedRes,
        puppiesIdBreedRes,
        contactUpcomingForBreedRes,
        upcomingLittersIdBreedRes,
        recentPuppyInquiriesRes,
        recentContactRes,
      ] = await Promise.all([
        supabase.from('puppies').select('listing_date, created_at').eq('status', 'Available'),
        supabase.from('puppy_inquiries').select('*', { count: 'exact', head: true }).is('admin_viewed_at', null),
        supabase.from('consultation_requests').select('*', { count: 'exact', head: true }).is('admin_viewed_at', null),
        supabase.from('product_inquiries').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }).is('admin_viewed_at', null),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'available'),
        supabase.from('kits').select('*', { count: 'exact', head: true }),
        supabase.from('puppy_inquiries').select('created_at').order('created_at', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('puppy_inquiries').select('*', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('created_at').order('created_at', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }),
        supabase.from('puppies').select('breed').eq('status', 'Sold'),
        supabase.from('puppy_inquiries').select('puppy_id').not('puppy_id', 'is', null),
        supabase.from('puppies').select('id, breed'),
        supabase.from('contact_messages').select('upcoming_litter_id').eq('subject', SUBJECT_UPCOMING_LITTER).not('upcoming_litter_id', 'is', null),
        supabase.from('upcoming_litters').select('id, breed'),
        supabase.from('puppy_inquiries').select('id, created_at, name, puppy_name, puppy_name_at_submit, admin_viewed_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('contact_messages').select('id, created_at, name, subject, upcoming_litter_label, admin_viewed_at').order('created_at', { ascending: false }).limit(10),
      ]);

      const activePuppies = activePuppiesRes.error ? [] : (activePuppiesRes.data ?? []);
      const totalDays = activePuppies.reduce((sum, p) => {
        const listDate = (p as { listing_date?: string; created_at?: string }).listing_date ?? ((p as { created_at?: string }).created_at ? (p as { created_at: string }).created_at.slice(0, 10) : null);
        return sum + Math.max(0, daysSince(listDate));
      }, 0);
      const avgDaysListed = activePuppies.length > 0 ? Math.round(totalDays / activePuppies.length) : 0;

      const puppyEarliest = puppyInquiriesEarliestRes.data && !puppyInquiriesEarliestRes.error ? (puppyInquiriesEarliestRes.data as { created_at?: string })?.created_at : null;
      const contactEarliest = contactEarliestRes.data && !contactEarliestRes.error ? (contactEarliestRes.data as { created_at?: string })?.created_at : null;
      const earliestInquiry = [puppyEarliest, contactEarliest].filter(Boolean).sort()[0] ?? null;
      const totalInquiryCount = (puppyInquiriesCountRes.error ? 0 : (puppyInquiriesCountRes.count ?? 0)) + (contactCountRes.error ? 0 : (contactCountRes.count ?? 0));

      const soldPuppies = soldPuppiesRes.error ? [] : (soldPuppiesRes.data ?? []) as { breed: string }[];
      const puppyIdBreedMap = new Map<string, string>();
      ((puppiesIdBreedRes.data ?? []) as { id: string; breed: string }[]).forEach((p) => puppyIdBreedMap.set(p.id, p.breed));
      const litterIdBreedMap = new Map<string, string>();
      ((upcomingLittersIdBreedRes.data ?? []) as { id: string; breed: string }[]).forEach((l) => litterIdBreedMap.set(l.id, l.breed));

      const breedCountFromPuppy: Record<string, number> = {};
      ((puppyInquiriesForBreedRes.data ?? []) as { puppy_id: string }[]).forEach((inq) => {
        const breed = puppyIdBreedMap.get(inq.puppy_id);
        if (breed) {
          breedCountFromPuppy[breed] = (breedCountFromPuppy[breed] ?? 0) + 1;
        }
      });
      ((contactUpcomingForBreedRes.data ?? []) as { upcoming_litter_id: string }[]).forEach((msg) => {
        const breed = litterIdBreedMap.get(msg.upcoming_litter_id);
        if (breed) {
          breedCountFromPuppy[breed] = (breedCountFromPuppy[breed] ?? 0) + 1;
        }
      });

      const soldByBreed: Record<string, number> = {};
      soldPuppies.forEach((p) => {
        soldByBreed[p.breed] = (soldByBreed[p.breed] ?? 0) + 1;
      });

      return {
        activePuppyCount: activePuppies.length,
        avgDaysListed,
        unseenInquiries: unseenInquiriesRes.error ? 0 : (unseenInquiriesRes.count ?? 0),
        unseenConsultations: unseenConsultationsRes.error ? 0 : (unseenConsultationsRes.count ?? 0),
        unseenProductInquiries: newProductInquiriesRes.error ? 0 : (newProductInquiriesRes.count ?? 0),
        unseenContact: unseenContactRes.error ? 0 : (unseenContactRes.count ?? 0),
        availableProductCount: productsRes.error ? 0 : (productsRes.count ?? 0),
        kitCount: kitsRes.error ? 0 : (kitsRes.count ?? 0),
        totalInquiryCount,
        earliestInquiry,
        soldByBreed,
        breedCountFromInquiries: breedCountFromPuppy,
        recentPuppyInquiries: recentPuppyInquiriesRes.error ? [] : (recentPuppyInquiriesRes.data ?? []),
        recentContact: recentContactRes.error ? [] : (recentContactRes.data ?? []),
      };
    },
  });

  // --- Derived metrics ---
  const daysSinceEarliest = stats?.earliestInquiry ? daysSince(stats.earliestInquiry) : 0;
  const weeksElapsed = Math.max(1, Math.floor(daysSinceEarliest / 7));
  const monthsElapsed = Math.max(1, Math.floor(daysSinceEarliest / 30));
  const avgInquiriesPerWeek =
    stats && stats.totalInquiryCount > 0
      ? (stats.totalInquiryCount / weeksElapsed).toFixed(1)
      : null;
  const avgInquiriesPerMonth =
    stats && stats.totalInquiryCount > 0
      ? (stats.totalInquiryCount / monthsElapsed).toFixed(1)
      : null;

  const topSellingBreeds = stats
    ? (Object.entries(stats.soldByBreed ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([breed, count]) => ({ breed, count })))
    : [];
  const topBreedInquiries = stats
    ? (Object.entries(stats.breedCountFromInquiries ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([breed, count]) => ({ breed, count })))
    : [];

  // --- Table row normalization (merge and shape recent inquiry rows) ---
  const recentRows: RecentInquiryRow[] = (() => {
    if (!stats) return [];
    const puppyRows: RecentInquiryRow[] = (stats.recentPuppyInquiries as { id: string; created_at: string; name: string; puppy_name?: string; puppy_name_at_submit?: string; admin_viewed_at: string | null }[]).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      typeSubject: r.puppy_name ?? r.puppy_name_at_submit ?? 'Puppy Inquiry',
      source: 'Puppy Inquiry' as const,
      status: r.admin_viewed_at ? 'Viewed' : 'New',
    }));
    const contactRows: RecentInquiryRow[] = (stats.recentContact as { id: string; created_at: string; name: string; subject: string; upcoming_litter_label?: string | null; admin_viewed_at: string | null }[]).map((r) => {
      const isUpcoming = r.subject === SUBJECT_UPCOMING_LITTER;
      return {
        id: r.id,
        createdAt: r.created_at,
        name: r.name,
        typeSubject: isUpcoming ? (r.upcoming_litter_label ?? 'Upcoming Litter') : r.subject,
        source: isUpcoming ? 'Upcoming Litter' : 'Contact Message',
        status: r.admin_viewed_at ? 'Viewed' : 'New',
      };
    });
    const merged = [...puppyRows, ...contactRows].sort((a, b) => {
      const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (t !== 0) return t;
      return (b.id ?? '').localeCompare(a.id ?? '');
    });
    return merged.slice(0, 10);
  })();

  // --- Card definitions ---
  const activeClickableCards = [
    {
      title: 'Available Puppies',
      value: stats?.activePuppyCount ?? 0,
      icon: Dog,
      description: stats?.avgDaysListed != null && stats.avgDaysListed > 0 ? `Active listings · Avg ${stats.avgDaysListed} days listed` : 'Active listings',
      to: '/admin/puppies',
    },
    {
      title: 'Puppy Inquiries',
      value: stats?.unseenInquiries ?? 0,
      icon: MessageSquare,
      description: 'Unseen submissions',
      to: '/admin/inquiries#puppy-inquiries',
    },
    {
      title: 'Contact Messages',
      value: stats?.unseenContact ?? 0,
      icon: Mail,
      description: 'Unseen submissions',
      to: '/admin/inquiries#contact-messages',
    },
  ];

  const activeMetricCards = [
    {
      title: 'Average Inquiries / Week',
      display: stats?.totalInquiryCount === 0 || avgInquiriesPerWeek == null ? 'Not enough data yet' : avgInquiriesPerWeek,
      icon: TrendingUp,
    },
    {
      title: 'Average Inquiries / Month',
      display: stats?.totalInquiryCount === 0 || avgInquiriesPerMonth == null ? 'Not enough data yet' : avgInquiriesPerMonth,
      icon: TrendingUp,
    },
    {
      title: 'Top Selling Breeds',
      display: topSellingBreeds.length === 0 ? 'Not enough data yet' : topSellingBreeds.map(({ breed, count }) => `${breed} (${count})`).join(', '),
      icon: BarChart3,
    },
    {
      title: 'Top Dog Breed Inquiries',
      display: topBreedInquiries.length === 0 ? 'Not enough data yet' : topBreedInquiries.map(({ breed, count }) => `${breed} (${count})`).join(', '),
      icon: BarChart3,
    },
  ];

  const inactiveCards = [
    { title: 'Products Available', value: stats?.availableProductCount ?? 0, icon: ShoppingCart, description: 'Available for purchase' },
    { title: 'Kits', value: stats?.kitCount ?? 0, icon: Package, description: 'Product kits' },
    { title: 'Consultations', value: stats?.unseenConsultations ?? 0, icon: Calendar, description: 'Unseen submissions' },
    { title: 'Product Inquiries', value: stats?.unseenProductInquiries ?? 0, icon: ShoppingCart, description: 'New inquiries' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  // --- JSX render: 3 sections ---
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>

      {/* Section 1: Active operational cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {activeClickableCards.map((stat) => (
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
        {activeMetricCards.map((m) => (
          <Card key={m.title} className="opacity-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{m.display}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section 2: Inactive feature cards */}
      <h2 className="text-sm font-medium text-muted-foreground mb-3">Upcoming Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {inactiveCards.map((stat) => (
          <Card key={stat.title} className="opacity-50 pointer-events-none bg-muted/50">
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

      {/* Section 3: Most Recent Inquiries table */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Most Recent Inquiries</h2>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type / Subject</th>
              <th className="text-left p-3 font-medium">Source</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium w-[80px]"></th>
            </tr>
          </thead>
          <tbody>
            {recentRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-muted-foreground text-center">
                  No inquiries yet
                </td>
              </tr>
            ) : (
              recentRows.map((row) => {
                const viewUrl = `/admin/inquiries?open=${encodeURIComponent(row.id)}&source=${sourceToSearchParam(row.source)}`;
                return (
                  <tr
                    key={`${row.source}-${row.id}`}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(viewUrl)}
                  >
                    <td className="p-3">{formatShortDate(row.createdAt)}</td>
                    <td className="p-3">{row.name}</td>
                    <td className="p-3">{row.typeSubject}</td>
                    <td className="p-3">{row.source}</td>
                    <td className="p-3">
                      {row.status === 'New' ? (
                        <span className="font-medium text-amber-600">New</span>
                      ) : (
                        row.status
                      )}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={viewUrl}
                        className="text-primary hover:underline text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
