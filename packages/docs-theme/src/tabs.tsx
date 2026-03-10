'use client';

import {
  Tabs as FumaTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'fumadocs-ui/components/tabs.unstyled';
import { Children, isValidElement, type ReactNode } from 'react';

interface TabProps {
  title: string;
  children: ReactNode;
}

/**
 * Wrapper that bridges remarkTabs output (`<Tab title="...">`) to
 * the Fumadocs Radix-based tabs primitives.
 */
export function Tab({ children }: TabProps) {
  // Rendered by Tabs — never rendered standalone.
  return <>{children}</>;
}

interface TabsProps {
  children: ReactNode;
}

/**
 * Wrapper that bridges remarkTabs output (`<Tabs>`) to
 * Fumadocs Radix-based tabs. Reads `title` from each `<Tab>` child
 * and builds the trigger list + content panels automatically.
 */
export function Tabs({ children }: TabsProps) {
  const tabs: { title: string; content: ReactNode }[] = [];

  Children.forEach(children, (child) => {
    if (isValidElement<TabProps>(child) && child.props.title) {
      tabs.push({ title: child.props.title, content: child.props.children });
    }
  });

  if (tabs.length === 0) return null;

  return (
    <FumaTabs
      defaultValue={tabs[0]!.title}
      className='my-4 overflow-hidden rounded-xl border border-fd-border bg-fd-card'
    >
      <TabsList className='flex border-b border-fd-border'>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.title}
            value={tab.title}
            className='border-b border-transparent px-4 py-2 text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[state=active]:border-fd-primary data-[state=active]:text-fd-primary'
          >
            {tab.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.title} value={tab.title} className='p-4 text-sm'>
          {tab.content}
        </TabsContent>
      ))}
    </FumaTabs>
  );
}
