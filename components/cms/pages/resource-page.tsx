import { Plus, Trash2 } from "lucide-react";

import {
  CmsConfirmDialog,
  CmsEmptyState,
  CmsListToolbar,
  CmsPaginationFooter,
} from "@/components/cms/common";
import {
  CmsActionButton,
  CmsDataTableShell,
  CmsEyebrow,
  CmsPageHeader,
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
  subtitle: string;
};

export function CmsResourcePage({ title, subtitle }: CmsResourcePageProps) {
  const text = i18n.cms.resource;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title={title}
        subtitle={subtitle}
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
          <Table>
            <TableHeader>
              <TableRow className="border-b-foreground hover:bg-transparent">
                <TableHead>
                  <CmsEyebrow>{text.tableName}</CmsEyebrow>
                </TableHead>
                <TableHead>
                  <CmsEyebrow>{text.tableStatus}</CmsEyebrow>
                </TableHead>
                <TableHead>
                  <CmsEyebrow>{text.tableUpdated}</CmsEyebrow>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-b-foreground hover:bg-secondary">
                <TableCell className="text-[16px] leading-[1.55] text-foreground">
                  {text.sampleRow}
                </TableCell>
                <TableCell>
                  <CmsEyebrow tone="accent">{text.draft}</CmsEyebrow>
                </TableCell>
                <TableCell>
                  <CmsEyebrow>{text.today}</CmsEyebrow>
                </TableCell>
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
