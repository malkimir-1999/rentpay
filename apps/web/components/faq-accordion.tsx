'use client';

import { Collapse, type CollapseProps } from 'antd';

export function FaqAccordion({ items, className }: { items: CollapseProps['items']; className?: string }) {
  return <Collapse className={className} ghost items={items} expandIconPlacement="end" />;
}
