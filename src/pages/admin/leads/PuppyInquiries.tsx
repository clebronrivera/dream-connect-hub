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
          cell: (row: any) => row.puppy_name || row.puppy_code || '-',
        },
        {
          header: 'City',
          cell: (row: any) => row.city || '-',
        },
        {
          header: 'State',
          cell: (row: any) => row.state || '-',
        },
        {
          header: 'Timeline',
          cell: (row: any) => row.timeline || '-',
        },
      ]}
    />
  );
}
