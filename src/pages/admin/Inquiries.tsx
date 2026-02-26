import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { ConsultationDetailDialog } from '@/components/admin/ConsultationDetailDialog';
import type { LeadRow } from '@/types/leads';
import type { ConsultationRequest } from '@/lib/supabase';
import type { StatusFilter } from './leads/LeadsList';
import { Dog, Calendar, ShoppingCart, Mail, Eye } from 'lucide-react';
import LeadsList from './leads/LeadsList';

const TAB_IDS = ['puppy-inquiries', 'consultations', 'product-inquiries', 'contact-messages'] as const;

function getTabFromHash(): string {
  const hash = window.location.hash.slice(1);
  return TAB_IDS.includes(hash as (typeof TAB_IDS)[number]) ? hash : TAB_IDS[0];
}

export default function Inquiries() {
  const [tab, setTab] = useState(getTabFromHash);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ConsultationRequest | null>(null);

  useEffect(() => {
    const handler = () => setTab(getTabFromHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const handleTabChange = (value: string) => {
    setTab(value);
    window.location.hash = value;
  };

  const openDetail = (row: ConsultationRequest) => {
    setSelectedRequest(row);
    setDetailOpen(true);
  };

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold mb-6">Inquiries</h1>
        <Tabs value={tab} onValueChange={handleTabChange}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="puppy-inquiries" className="gap-1.5">
              <Dog className="h-4 w-4" />
              Puppy Inquiries
            </TabsTrigger>
            <TabsTrigger value="consultations" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Consultations
            </TabsTrigger>
            <TabsTrigger value="product-inquiries" className="gap-1.5">
              <ShoppingCart className="h-4 w-4" />
              Product Inquiries
            </TabsTrigger>
            <TabsTrigger value="contact-messages" className="gap-1.5">
              <Mail className="h-4 w-4" />
              Contact Messages
            </TabsTrigger>
            </TabsList>
            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={(v) => v && setStatusFilter(v as StatusFilter)}
              className="gap-0"
            >
              <ToggleGroupItem value="all" aria-label="Show all">All</ToggleGroupItem>
              <ToggleGroupItem value="active" aria-label="Show active">Active</ToggleGroupItem>
              <ToggleGroupItem value="inactive" aria-label="Show inactive">Inactive</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <TabsContent value="puppy-inquiries">
            <LeadsList
              table="puppy_inquiries"
              title=""
              statusOptions={['active', 'inactive']}
              statusFilter={statusFilter}
              extraColumns={[
                {
                  header: 'Puppy',
                  cell: (row: LeadRow) => (row.puppy_name as string) || (row.puppy_code as string) || '-',
                },
                {
                  header: 'City',
                  cell: (row: LeadRow) => (row.city as string) || '-',
                },
                {
                  header: 'State',
                  cell: (row: LeadRow) => (row.state as string) || '-',
                },
                {
                  header: 'Timeline',
                  cell: (row: LeadRow) => (row.timeline as string) || '-',
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="consultations">
            <LeadsList
              table="consultation_requests"
              title=""
              statusOptions={['active', 'inactive']}
              statusFilter={statusFilter}
              extraColumns={[
                {
                  header: 'Type',
                  accessorKey: 'consultation_type',
                  cell: (row) => (row.consultation_type as string) || '-',
                },
                {
                  header: 'Pet Name',
                  accessorKey: 'pet_name',
                  cell: (row) => (row.pet_name as string) || '-',
                },
                {
                  header: 'Pet Type',
                  accessorKey: 'pet_type',
                  cell: (row) => (row.pet_type as string) || '-',
                },
                {
                  header: 'Preferred Contact',
                  accessorKey: 'preferred_contact',
                  cell: (row) => (row.preferred_contact as string) || '-',
                },
              ]}
              renderActions={(row) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDetail(row as ConsultationRequest)}
                  className="gap-1"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Button>
              )}
            />
          </TabsContent>

          <TabsContent value="product-inquiries">
            <LeadsList
              table="product_inquiries"
              title=""
              statusOptions={['new', 'reviewed', 'contacted']}
              statusFilter={statusFilter}
              extraColumns={[
                {
                  header: 'Product',
                  cell: (row: LeadRow) => (row.product_name as string) || '-',
                },
                {
                  header: 'Message',
                  cell: (row: LeadRow) => {
                    const msg = row.message as string | undefined;
                    return msg ? (msg.length > 50 ? msg.substring(0, 50) + '...' : msg) : '-';
                  },
                },
              ]}
            />
          </TabsContent>

          <TabsContent value="contact-messages">
            <LeadsList
              table="contact_messages"
              title=""
              statusOptions={['active', 'inactive']}
              statusFilter={statusFilter}
              extraColumns={[
                {
                  header: 'Subject',
                  cell: (row: LeadRow) => (row.subject as string) || '-',
                },
                {
                  header: 'Upcoming litter',
                  cell: (row: LeadRow) =>
                    (row.upcoming_litter_label as string) ||
                    (row.upcoming_litter_id ? 'Litter selected' : '-'),
                },
                {
                  header: 'Message',
                  cell: (row: LeadRow) => {
                    const msg = row.message as string | undefined;
                    return msg ? (msg.length > 50 ? msg.substring(0, 50) + '...' : msg) : '-';
                  },
                },
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ConsultationDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={selectedRequest}
      />
    </>
  );
}
