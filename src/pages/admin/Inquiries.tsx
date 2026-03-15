import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ContactMessageInboxList } from '@/components/admin/ContactMessageInboxList';
import { PuppyInquiryInboxList } from '@/components/admin/PuppyInquiryInboxList';
import type { StatusFilter } from '@/lib/inquiry-subjects';
import {
  SUBJECT_UPCOMING_LITTER,
  SLUG_PUPPY_INQUIRY,
  SLUG_UPCOMING_LITTER,
  SLUG_CONTACT_MESSAGE,
} from '@/lib/inquiry-subjects';
import { Dog, Mail, CalendarHeart, LayoutGrid } from 'lucide-react';

const TAB_IDS = ['all-inquiries', 'puppy-inquiries', 'upcoming-litter', 'contact-messages'] as const;

/** Map URL source param from dashboard to tab id */
const SOURCE_TO_TAB: Record<string, (typeof TAB_IDS)[number]> = {
  [SLUG_PUPPY_INQUIRY]: 'puppy-inquiries',
  [SLUG_UPCOMING_LITTER]: 'upcoming-litter',
  [SLUG_CONTACT_MESSAGE]: 'contact-messages',
};

function getTabFromHash(): string {
  const hash = window.location.hash.slice(1);
  return TAB_IDS.includes(hash as (typeof TAB_IDS)[number]) ? hash : TAB_IDS[0];
}

function getInitialTab(openId: string | null, openSource: string | null): string {
  if (openId && openSource && SOURCE_TO_TAB[openSource]) return SOURCE_TO_TAB[openSource];
  return getTabFromHash();
}

export default function Inquiries() {
  const [searchParams] = useSearchParams();
  const openId = searchParams.get('open');
  const openSource = searchParams.get('source');
  const [tab, setTab] = useState(() => getInitialTab(openId, openSource));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // When landing with ?open=id&source=…, ensure hash matches tab so the correct list is visible
  useEffect(() => {
    if (openId && openSource && SOURCE_TO_TAB[openSource]) {
      const targetTab = SOURCE_TO_TAB[openSource];
      if (window.location.hash.slice(1) !== targetTab) window.location.hash = targetTab;
      setTab(targetTab);
    }
  }, [openId, openSource]);

  useEffect(() => {
    const handler = () => setTab(getTabFromHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const handleTabChange = (value: string) => {
    setTab(value);
    window.location.hash = value;
  };

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold mb-6">Inquiries</h1>
        <Tabs value={tab} onValueChange={handleTabChange}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all-inquiries" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" />
                All Inquiries
              </TabsTrigger>
              <TabsTrigger value="puppy-inquiries" className="gap-1.5">
                <Dog className="h-4 w-4" />
                Puppy Inquiries
              </TabsTrigger>
              <TabsTrigger value="upcoming-litter" className="gap-1.5">
              <CalendarHeart className="h-4 w-4" />
              Upcoming Litter
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

          <TabsContent value="all-inquiries">
            <div className="space-y-10">
              <div>
                <PuppyInquiryInboxList
                  statusFilter="active"
                  showStatusFilter
                  title="Puppy Inquiries"
                />
              </div>
              <div>
                <ContactMessageInboxList
                  subjectFilter={SUBJECT_UPCOMING_LITTER}
                  statusFilter="active"
                  showStatusFilter
                  title="Upcoming Litter"
                />
              </div>
              <div>
                <ContactMessageInboxList
                  excludeSubject={SUBJECT_UPCOMING_LITTER}
                  statusFilter="active"
                  showStatusFilter
                  title="Contact Messages"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="puppy-inquiries">
            <PuppyInquiryInboxList
              statusFilter={statusFilter}
              showStatusFilter={false}
              initialOpenId={openSource === SLUG_PUPPY_INQUIRY ? openId : undefined}
            />
          </TabsContent>

          <TabsContent value="upcoming-litter">
            <ContactMessageInboxList
              subjectFilter={SUBJECT_UPCOMING_LITTER}
              statusFilter={statusFilter}
              initialOpenId={openSource === SLUG_UPCOMING_LITTER ? openId : undefined}
            />
          </TabsContent>

          <TabsContent value="contact-messages">
            <ContactMessageInboxList
              excludeSubject={SUBJECT_UPCOMING_LITTER}
              statusFilter={statusFilter}
              initialOpenId={openSource === 'contact-message' ? openId : undefined}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
