// Airtable configuration and types

export interface AirtablePuppy {
  id: string;
  fields: {
    'Puppy ID'?: string;
    'Breed'?: string;
    'Gender'?: string;
    'Color'?: string;
    'Date of Birth'?: string;
    'Age (weeks)'?: number;
    'Ready Date'?: string;
    'Status'?: string;
    'Base Price'?: number;
    'Discount Active'?: boolean;
    'Discount Amount'?: number;
    'Discount Note'?: string;
    'Final Price'?: number;
    'Photos'?: Array<{ url: string }>;
    'Mom Weight (Approx)'?: number;
    'Name'?: string;
    'Dad Weight (Approx)'?: number;
    'Description'?: string;
    'Vaccinations'?: string;
  };
}

export interface AirtableInterestForm {
  id: string;
  fields: {
    'Name'?: string;
    'Email'?: string;
    'Phone'?: string;
    'City'?: string;
    'State'?: string;
    'Interested in Puppy'?: string;
    'Size Preference'?: string;
    'Breed Preference'?: string;
    'Gender Preference'?: string;
    'Timeline'?: string;
    'Experience'?: string;
    'Household'?: string;
    'Message'?: string;
    'Submitted'?: string;
  };
}

const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_PUPPIES = import.meta.env.VITE_AIRTABLE_TABLE_PUPPIES || 'Available Puppies';
const AIRTABLE_TABLE_INTEREST = import.meta.env.VITE_AIRTABLE_TABLE_INTEREST || 'Interest Forms';

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.warn('Missing Airtable environment variables. Airtable features will not work.');
  console.warn('API Key present:', !!AIRTABLE_API_KEY);
  console.warn('Base ID present:', !!AIRTABLE_BASE_ID);
  console.warn('Table name:', AIRTABLE_TABLE_PUPPIES);
}

/**
 * Fetch puppies from Airtable
 */
export async function fetchPuppies(): Promise<AirtablePuppy[]> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    const missing = [];
    if (!AIRTABLE_API_KEY) missing.push('VITE_AIRTABLE_API_KEY');
    if (!AIRTABLE_BASE_ID) missing.push('VITE_AIRTABLE_BASE_ID');
    throw new Error(`Airtable credentials not configured. Missing: ${missing.join(', ')}`);
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_PUPPIES)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `Airtable API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = `Airtable API error: ${errorData.error.message || JSON.stringify(errorData.error)}`;
        }
      } catch {
        // If response isn't JSON, use the status text
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.records || [];
  } catch (error) {
    console.error('Error fetching puppies from Airtable:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to Airtable. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Submit interest form to Airtable
 */
export async function submitInterestForm(fields: AirtableInterestForm['fields']): Promise<void> {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    throw new Error('Airtable credentials not configured');
  }

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_INTEREST)}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          ...fields,
          'Submitted': new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Airtable API error: ${errorData.error?.message || response.statusText}`);
    }
  } catch (error) {
    console.error('Error submitting interest form to Airtable:', error);
    throw error;
  }
}
