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
          cell: (row: any) => row.subject || '-',
        },
        {
          header: 'Message',
          cell: (row: any) => row.message ? (row.message.length > 50 ? row.message.substring(0, 50) + '...' : row.message) : '-',
        },
      ]}
    />
  );
}
