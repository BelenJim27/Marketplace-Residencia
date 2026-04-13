"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { compactFormat, standardFormat } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Pagination } from "@/components/ui/pagination";
import { useState } from "react";
import * as logos from "@/assets/logos";

const DATA = [
  { name: "Google", visitors: 3456, revenues: 4220, sales: 3456, conversion: 2.59, logo: logos.google },
  { name: "X.com", visitors: 3456, revenues: 4220, sales: 3456, conversion: 2.59, logo: logos.x },
  { name: "Github", visitors: 3456, revenues: 4220, sales: 3456, conversion: 2.59, logo: logos.github },
  { name: "Vimeo", visitors: 3456, revenues: 4220, sales: 3456, conversion: 2.59, logo: logos.vimeo },
  { name: "Facebook", visitors: 3456, revenues: 4220, sales: 3456, conversion: 2.59, logo: logos.facebook },
  { name: "Instagram", visitors: 2890, revenues: 3100, sales: 2890, conversion: 1.89, logo: logos.facebook },
  { name: "LinkedIn", visitors: 1980, revenues: 2500, sales: 1980, conversion: 1.45, logo: logos.github },
];

const ITEMS_PER_PAGE = 5;

export function TopChannels({ className }: { className?: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(DATA.length / ITEMS_PER_PAGE);

  const paginatedData = DATA.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div
      className={cn(
        "grid rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className,
      )}
    >
      <h2 className="mb-4 text-body-2xlg font-bold text-dark dark:text-white">
        Top Channels
      </h2>

      <Table>
        <TableHeader>
          <TableRow className="border-none uppercase [&>th]:text-center">
            <TableHead className="min-w-[120px] !text-left">Source</TableHead>
            <TableHead>Visitors</TableHead>
            <TableHead className="!text-right">Revenues</TableHead>
            <TableHead>Sales</TableHead>
            <TableHead>Conversion</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginatedData.map((channel, i) => (
            <TableRow
              className="text-center text-base font-medium text-dark dark:text-white"
              key={channel.name + i}
            >
              <TableCell className="flex min-w-fit items-center gap-3">
                <Image
                  src={channel.logo}
                  className="size-8 rounded-full object-cover"
                  width={40}
                  height={40}
                  alt={channel.name + " Logo"}
                  role="presentation"
                />
                <div className="">{channel.name}</div>
              </TableCell>

              <TableCell>{compactFormat(channel.visitors)}</TableCell>

              <TableCell className="!text-right text-green-light-1">
                ${standardFormat(channel.revenues)}
              </TableCell>

              <TableCell>{channel.sales}</TableCell>

              <TableCell>{channel.conversion}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
          {Math.min(currentPage * ITEMS_PER_PAGE, DATA.length)} de {DATA.length} canales
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
