import type { LeadRow } from '@/types/leads';
import LeadsList from './LeadsList';

export default function PuppyInquiries() {
  return (
    <LeadsList
      table="puppy_inquiries"
      title="Puppy Inquiries"
      statusOptions={['active', 'inactive']}
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
  );
}
