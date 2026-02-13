import type { LeadRow } from '@/types/leads';
import LeadsList from './LeadsList';

export default function ProductInquiries() {
  return (
    <LeadsList
      table="product_inquiries"
      title="Product Inquiries"
      statusOptions={['new', 'reviewed', 'contacted']}
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
  );
}
