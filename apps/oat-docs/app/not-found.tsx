'use client';

import { useSearchContext } from 'fumadocs-ui/contexts/search';
import Link from 'next/link';

export default function NotFound() {
  const { setOpenSearch } = useSearchContext();

  return (
    <main className='mx-auto flex max-w-2xl flex-col items-start gap-4 px-6 py-20'>
      <h1 className='text-3xl font-semibold'>Page not found</h1>
      <p>
        This documentation page may have moved. Find its current owner from Home
        or search the documentation.
      </p>
      <div className='flex gap-4'>
        <Link href='/' className='underline'>
          Home
        </Link>
        <button
          type='button'
          className='underline'
          onClick={() => setOpenSearch(true)}
        >
          Search documentation
        </button>
      </div>
    </main>
  );
}
