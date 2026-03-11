import { Suspense } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import DownloadPage from '@/components/download/DownloadPage';

export default function DownloadRoute() {
  return (
    <MainLayout>
      <Suspense fallback={<div>Loading download options...</div>}>
        <DownloadPage />
      </Suspense>
    </MainLayout>
  );
}
