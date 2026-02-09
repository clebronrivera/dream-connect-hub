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
          cell: (row: any) => row.product_name || '-',
        },
        {
          header: 'Message',
          cell: (row: any) => row.message ? (row.message.length > 50 ? row.message.substring(0, 50) + '...' : row.message) : '-',
        },
      ]}
    />
  );
}
