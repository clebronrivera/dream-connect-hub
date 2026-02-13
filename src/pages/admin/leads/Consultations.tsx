import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConsultationDetailDialog } from '@/components/admin/ConsultationDetailDialog';
import type { ConsultationRequest } from '@/lib/supabase';
import { Eye } from 'lucide-react';
import LeadsList from './LeadsList';

export default function Consultations() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ConsultationRequest | null>(null);

  const openDetail = (row: ConsultationRequest) => {
    setSelectedRequest(row);
    setDetailOpen(true);
  };

  return (
    <>
      <LeadsList
        table="consultation_requests"
        title="Consultations"
        statusOptions={['active', 'inactive']}
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
      <ConsultationDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={selectedRequest}
      />
    </>
  );
}
