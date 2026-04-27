import { Plus, Trash2 } from "lucide-react";

import {
  CmsConfirmDialog,
  CmsEmptyState,
  CmsListToolbar,
  CmsPaginationFooter,
} from "@/components/cms/common";
import {
  CmsActionButton,
  CmsBadge,
  CmsDataTableShell,
  CmsPageHeader,
  cmsTableClasses,
} from "@/components/cms/primitives";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { i18n } from "@/lib/i18n";

type CmsResourcePageProps = {
  title: string;
};

export function CmsResourcePage({ title }: CmsResourcePageProps) {
  const text = i18n.cms.resource;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title={title}
        actions={
          <CmsActionButton className="px-2.5" tone="primary">
            <Plus className="size-3" />
            {text.new}
          </CmsActionButton>
        }
      />

      <CmsDataTableShell
        toolbar={
          <CmsListToolbar
            rightSlot={
              <CmsConfirmDialog
                triggerLabel={text.deleteSelected}
                triggerIcon={<Trash2 className="size-3" />}
                title={text.confirmTitle}
                description={text.confirmDescription}
              />
            }
          />
        }
        table={
          <Table className={cmsTableClasses.table}>
            <TableHeader>
              <TableRow className={cmsTableClasses.headerRow}>
                <TableHead className={cmsTableClasses.headerCell}>{text.tableName}</TableHead>
                <TableHead className={cmsTableClasses.headerCell}>{text.tableStatus}</TableHead>
                <TableHead className={cmsTableClasses.headerCell}>{text.tableUpdated}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className={cmsTableClasses.bodyRow}>
                <TableCell className={cmsTableClasses.bodyCellTitle}>{text.sampleRow}</TableCell>
                <TableCell className={cmsTableClasses.bodyCellBadge}>
                  <CmsBadge variant="status-draft">{text.draft}</CmsBadge>
                </TableCell>
                <TableCell className={cmsTableClasses.bodyCellMeta}>{text.today}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        }
        pagination={<CmsPaginationFooter />}
      />

      <CmsEmptyState title={text.emptyTitle(title)} description={text.emptyDescription} />
    </div>
  );
}
