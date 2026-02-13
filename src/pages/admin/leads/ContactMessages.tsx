import type { LeadRow } from '@/types/leads';
import LeadsList from './LeadsList';

export default function ContactMessages() {
  return (
    <LeadsList
      table="contact_messages"
      title="Contact Messages"
      statusOptions={['active', 'inactive']}
      extraColumns={[
        {
          header: 'Subject',
          cell: (row: LeadRow) => (row.subject as string) || '-',
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
  );
}
