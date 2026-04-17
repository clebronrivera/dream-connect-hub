import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dog, MessageSquare, Calendar, ShoppingCart, Mail, Package, BarChart3, TrendingUp, Loader2, ClipboardCheck } from 'lucide-react';
import { SUBJECT_UPCOMING_LITTER, sourceToSlug, type RecentInquirySource } from '@/lib/inquiry-subjects';
import { daysSince } from '@/lib/date-utils';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { useDashboardAnalytics } from '@/hooks/use-dashboard-analytics';
import { useDashboardInventory } from '@/hooks/use-dashboard-inventory';
import { useDashboardRecent } from '@/hooks/use-dashboard-recent';
import { fetchDepositRequestCounts } from '@/lib/admin/deposit-requests-service';

// --- Helper functions ---
function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function sourceToSearchParam(source: RecentInquirySource): string {
  return sourceToSlug(source);
}

function SectionSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <p className="text-sm text-destructive py-4">{message}</p>
  );
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

  const { data: statsData, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useDashboardAnalytics();
  const { data: inventoryData, isLoading: inventoryLoading } = useDashboardInventory();
  const { data: recentData, isLoading: recentLoading, error: recentError } = useDashboardRecent();
  const { data: depositRequestCounts } = useQuery({
    queryKey: ['deposit-requests-counts'],
    queryFn: fetchDepositRequestCounts,
    refetchInterval: 30_000,
  });

  // --- Derived analytics metrics ---
  const daysSinceEarliest = analyticsData?.earliestInquiry ? daysSince(analyticsData.earliestInquiry) : 0;
  const weeksElapsed = Math.max(1, Math.floor(daysSinceEarliest / 7));
  const monthsElapsed = Math.max(1, Math.floor(daysSinceEarliest / 30));
  const avgInquiriesPerWeek =
    analyticsData && analyticsData.totalInquiryCount > 0
      ? (analyticsData.totalInquiryCount / weeksElapsed).toFixed(1)
      : null;
  const avgInquiriesPerMonth =
    analyticsData && analyticsData.totalInquiryCount > 0
      ? (analyticsData.totalInquiryCount / monthsElapsed).toFixed(1)
      : null;
  const topSellingBreeds = analyticsData
    ? Object.entries(analyticsData.soldByBreed)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([breed, count]) => ({ breed, count }))
    : [];
  const topBreedInquiries = analyticsData
    ? Object.entries(analyticsData.breedCountFromInquiries)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([breed, count]) => ({ breed, count }))
    : [];

  // --- Recent inquiry rows (normalized for table render) ---
  const recentRows: RecentInquiryRow[] = (() => {
    if (!recentData) return [];
    const puppyRows: RecentInquiryRow[] = recentData.recentPuppyInquiries.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      name: r.name,
      typeSubject: r.puppy_name ?? r.puppy_name_at_submit ?? 'Puppy Inquiry',
      source: 'Puppy Inquiry' as const,
      status: r.admin_viewed_at ? 'Viewed' : 'New',
    }));
    const contactRows: RecentInquiryRow[] = recentData.recentContact.map((r) => {
      const isUpcoming = r.subject === SUBJECT_UPCOMING_LITTER;
      return {
        id: r.id,
        createdAt: r.created_at,
        name: r.name,
        typeSubject: isUpcoming ? (r.upcoming_litter_label ?? 'Upcoming Litter') : r.subject,
        source: (isUpcoming ? 'Upcoming Litter' : 'Contact Message') as RecentInquirySource,
        status: r.admin_viewed_at ? 'Viewed' : 'New',
      };
    });
    return [...puppyRows, ...contactRows]
      .sort((a, b) => {
        const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (t !== 0) return t;
        return (b.id ?? '').localeCompare(a.id ?? '');
      })
      .slice(0, 10);
  })();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>

      {/* Section 1: Operational counts — loads independently */}
      {statsLoading ? (
        <SectionSpinner />
      ) : statsError ? (
        <SectionError message="Could not load operational stats. Check your connection and refresh." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <Link to="/admin/puppies" className="block">
            <Card className="cursor-pointer hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Puppies</CardTitle>
                <Dog className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData?.activePuppyCount ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {statsData?.avgDaysListed != null && statsData.avgDaysListed > 0
                    ? `Active listings · Avg ${statsData.avgDaysListed} days listed`
                    : 'Active listings'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Click to view →</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/inquiries#puppy-inquiries" className="block">
            <Card className="cursor-pointer hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Puppy Inquiries</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData?.unseenInquiries ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Unseen submissions</p>
                <p className="text-xs text-muted-foreground mt-1">Click to view →</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/inquiries#contact-messages" className="block">
            <Card className="cursor-pointer hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contact Messages</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsData?.unseenContact ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Unseen submissions</p>
                <p className="text-xs text-muted-foreground mt-1">Click to view →</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/deposit-requests" className="block">
            <Card className="cursor-pointer hover:shadow-lg transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deposit Requests</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{depositRequestCounts?.pending ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending review
                  {depositRequestCounts?.accepted
                    ? ` · ${depositRequestCounts.accepted} accepted, awaiting send`
                    : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Click to view →</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Section 2: Analytics / trend metrics — loads independently */}
      {analyticsLoading ? (
        <SectionSpinner />
      ) : analyticsError ? (
        <SectionError message="Could not load analytics metrics." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Inquiries / Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {analyticsData?.totalInquiryCount === 0 || avgInquiriesPerWeek == null
                  ? 'Not enough data yet'
                  : avgInquiriesPerWeek}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Inquiries / Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {analyticsData?.totalInquiryCount === 0 || avgInquiriesPerMonth == null
                  ? 'Not enough data yet'
                  : avgInquiriesPerMonth}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Selling Breeds</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {topSellingBreeds.length === 0
                  ? 'Not enough data yet'
                  : topSellingBreeds.map(({ breed, count }) => `${breed} (${count})`).join(', ')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Dog Breed Inquiries</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">
                {topBreedInquiries.length === 0
                  ? 'Not enough data yet'
                  : topBreedInquiries.map(({ breed, count }) => `${breed} (${count})`).join(', ')}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 3: Upcoming features — inactive/grayed cards, loads independently */}
      <h2 className="text-sm font-medium text-muted-foreground mb-3">Upcoming Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { title: 'Products Available', value: inventoryLoading ? '…' : (inventoryData?.availableProductCount ?? 0), icon: ShoppingCart, description: 'Available for purchase' },
          { title: 'Kits', value: inventoryLoading ? '…' : (inventoryData?.kitCount ?? 0), icon: Package, description: 'Product kits' },
          { title: 'Consultations', value: statsLoading ? '…' : (statsData?.unseenConsultations ?? 0), icon: Calendar, description: 'Unseen submissions' },
          { title: 'Product Inquiries', value: statsLoading ? '…' : (statsData?.unseenProductInquiries ?? 0), icon: ShoppingCart, description: 'New inquiries' },
        ].map((stat) => (
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

      {/* Section 4: Recent inquiries table — loads independently */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Most Recent Inquiries</h2>
      {recentLoading ? (
        <SectionSpinner />
      ) : recentError ? (
        <SectionError message="Could not load recent inquiries." />
      ) : (
        <div className="border rounded-md overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium whitespace-nowrap">Date</th>
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
                      <td className="p-3 whitespace-nowrap">{row.source}</td>
                      <td className="p-3 whitespace-nowrap">
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
      )}
    </div>
  );
}
