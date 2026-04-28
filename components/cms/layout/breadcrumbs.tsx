"use client";

import { usePathname } from "next/navigation";

import { useCmsBreadcrumbLabel } from "@/components/cms/layout/breadcrumbs-context";
import { cmsEyebrowClassName } from "@/components/cms/primitives/typography";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const clickableBreadcrumbClassName = cn(cmsEyebrowClassName, "hover:text-accent");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (segment: string) => UUID_PATTERN.test(segment);

const formatSegment = (segment: string) => {
  const routeLabels = i18n.cms.routeLabels as Record<string, string>;

  if (routeLabels[segment]) {
    return routeLabels[segment];
  }

  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

export function CmsBreadcrumbs() {
  const pathname = usePathname();
  const dynamicLabel = useCmsBreadcrumbLabel();

  const segments = pathname
    .replace(/^\/cms/, "")
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "edit");

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/cms" className={clickableBreadcrumbClassName}>
            {i18n.cms.breadcrumbs.root}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const href = `/cms/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;
          const label = isUuid(segment) && dynamicLabel ? dynamicLabel : formatSegment(segment);

          return (
            <div key={href} className="flex items-center">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className={cmsEyebrowClassName}>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href} className={clickableBreadcrumbClassName}>
                    {label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
