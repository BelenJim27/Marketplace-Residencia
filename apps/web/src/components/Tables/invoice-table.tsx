"use client";

import { TrashIcon } from "@/assets/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { DownloadIcon, PreviewIcon } from "./icons";
import { Pagination } from "@/components/ui/pagination";
import { useState } from "react";
import { formatPrice } from "@/lib/format-number";

const DATA = [
  { name: "Free package", price: 0.0, date: "2023-01-13T18:00:00.000Z", status: "Paid" },
  { name: "Standard Package", price: 59.0, date: "2023-01-13T18:00:00.000Z", status: "Paid" },
  { name: "Business Package", price: 99.0, date: "2023-01-13T18:00:00.000Z", status: "Unpaid" },
  { name: "Standard Package", price: 59.0, date: "2023-01-13T18:00:00.000Z", status: "Pending" },
  { name: "Premium Package", price: 149.0, date: "2023-01-14T18:00:00.000Z", status: "Paid" },
  { name: "Basic Package", price: 29.0, date: "2023-01-15T18:00:00.000Z", status: "Pending" },
  { name: "Enterprise Package", price: 299.0, date: "2023-01-16T18:00:00.000Z", status: "Paid" },
  { name: "Starter Package", price: 19.0, date: "2023-01-17T18:00:00.000Z", status: "Unpaid" },
  { name: "Pro Package", price: 79.0, date: "2023-01-18T18:00:00.000Z", status: "Paid" },
  { name: "Team Package", price: 199.0, date: "2023-01-19T18:00:00.000Z", status: "Pending" },
];

const ITEMS_PER_PAGE = 5;

export function InvoiceTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(DATA.length / ITEMS_PER_PAGE);

  const paginatedData = DATA.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
      <Table>
        <TableHeader>
          <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
            <TableHead className="min-w-[155px] xl:pl-7.5">Package</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right xl:pr-7.5">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginatedData.map((item, index) => (
            <TableRow key={index} className="border-[#eee] dark:border-dark-3">
              <TableCell className="min-w-[155px] xl:pl-7.5">
                <h5 className="text-dark dark:text-white">{item.name}</h5>
                <p className="mt-[3px] text-body-sm font-medium">
                  $ {Number(item.price).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </TableCell>

              <TableCell>
                <p className="text-dark dark:text-white">
                  {dayjs(item.date).format("MMM DD, YYYY")}
                </p>
              </TableCell>

              <TableCell>
                <div
                  className={cn(
                    "max-w-fit rounded-full px-3.5 py-1 text-sm font-medium",
                    {
                      "bg-[#219653]/[0.08] text-[#219653]":
                        item.status === "Paid",
                      "bg-[#D34053]/[0.08] text-[#D34053]":
                        item.status === "Unpaid",
                      "bg-[#FFA70B]/[0.08] text-[#FFA70B]":
                        item.status === "Pending",
                    },
                  )}
                >
                  {item.status}
                </div>
              </TableCell>

              <TableCell className="xl:pr-7.5">
                <div className="flex items-center justify-end gap-x-3.5">
                  <button className="hover:text-primary">
                    <span className="sr-only">View Invoice</span>
                    <PreviewIcon />
                  </button>

                  <button className="hover:text-primary">
                    <span className="sr-only">Delete Invoice</span>
                    <TrashIcon />
                  </button>

                  <button className="hover:text-primary">
                    <span className="sr-only">Download Invoice</span>
                    <DownloadIcon />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
          {Math.min(currentPage * ITEMS_PER_PAGE, DATA.length)} de {DATA.length} resultados
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
