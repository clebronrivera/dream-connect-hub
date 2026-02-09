import LeadsList from './LeadsList';

export default function Consultations() {
  return (
    <LeadsList
      table="consultation_requests"
      title="Consultations"
      statusOptions={['active', 'inactive']}
      extraColumns={[
        {
          header: 'Type',
          cell: (row: any) => row.consultation_type || '-',
        },
        {
          header: 'Pet Name',
          cell: (row: any) => row.pet_name || '-',
        },
        {
          header: 'Pet Type',
          cell: (row: any) => row.pet_type || '-',
        },
        {
          header: 'Preferred Contact',
          cell: (row: any) => row.preferred_contact || '-',
        },
      ]}
    />
  );
}
