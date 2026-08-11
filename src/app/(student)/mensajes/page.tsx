import type { Metadata } from 'next';

import { MessagesView } from '@/features/learning/components/messages-view';

export const metadata: Metadata = { title: 'Mensajes' };

export default function MessagesPage() {
  return <MessagesView />;
}
