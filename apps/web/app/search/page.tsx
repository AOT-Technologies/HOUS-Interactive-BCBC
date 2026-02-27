import { Suspense } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SearchResultsPage from '@/components/search/SearchResultsPage';

export default function SearchPage() {
  return (
    <MainLayout>
      <Suspense fallback={<div>Loading search...</div>}>
        <SearchResultsPage />
      </Suspense>
    </MainLayout>
  );
}
