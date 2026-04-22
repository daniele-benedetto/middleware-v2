import { Plus } from "lucide-react";

import {
  CmsConfirmDialog,
  CmsEmptyState,
  CmsListToolbar,
  CmsPaginationFooter,
} from "@/components/cms/common";
import { CmsDataTableShell, CmsPageHeader } from "@/components/cms/primitives";
import { Button } from "@/components/ui/button";
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
          <Button className="rounded-none border border-[#0A0A0A] bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#0A0A0A]/90">
            <Plus className="size-3" />
            {text.new}
          </Button>
        }
      />

      <CmsDataTableShell
        toolbar={
          <CmsListToolbar
            rightSlot={
              <CmsConfirmDialog
                trigger={
                  <Button
                    variant="outline"
                    className="rounded-none border-[#0A0A0A] bg-[#F0E8D8] text-[#0A0A0A]"
                  >
                    {text.deleteSelected}
                  </Button>
                }
                title={text.confirmTitle}
                description={text.confirmDescription}
              />
            }
          />
        }
        table={
          <Table>
            <TableHeader>
              <TableRow className="border-b-[#0A0A0A] hover:bg-transparent">
                <TableHead className="font-ui text-[11px] uppercase tracking-[0.08em] text-[#0A0A0A]">
                  {text.tableName}
                </TableHead>
                <TableHead className="font-ui text-[11px] uppercase tracking-[0.08em] text-[#0A0A0A]">
                  {text.tableStatus}
                </TableHead>
                <TableHead className="font-ui text-[11px] uppercase tracking-[0.08em] text-[#0A0A0A]">
                  {text.tableUpdated}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-b-[#0A0A0A] hover:bg-[#E5D9C5]">
                <TableCell className="text-[16px] leading-[1.55] text-[#0A0A0A]">
                  {text.sampleRow}
                </TableCell>
                <TableCell className="font-ui text-[11px] uppercase tracking-[0.08em] text-[#C8001A]">
                  {text.draft}
                </TableCell>
                <TableCell className="font-ui text-[11px] uppercase tracking-[0.08em] text-[rgba(10,10,10,0.6)]">
                  {text.today}
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
