"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { Pagination } from "@/components/ui/pagination";
import { useState } from "react";

const DATA = [
  { image: "/images/product/product-01.png", name: "Apple Watch Series 7", category: "Electronics", price: 296, sold: 22, profit: 45 },
  { image: "/images/product/product-02.png", name: "Macbook Pro M1", category: "Electronics", price: 546, sold: 12, profit: 125 },
  { image: "/images/product/product-03.png", name: "Dell Inspiron 15", category: "Electronics", price: 443, sold: 64, profit: 247 },
  { image: "/images/product/product-04.png", name: "HP Probook 450", category: "Electronics", price: 499, sold: 72, profit: 103 },
  { image: "/images/product/product-05.png", name: "iPhone 14 Pro", category: "Electronics", price: 999, sold: 45, profit: 180 },
  { image: "/images/product/product-06.png", name: "Samsung Galaxy S23", category: "Electronics", price: 849, sold: 38, profit: 150 },
  { image: "/images/product/product-07.png", name: "Sony WH-1000XM5", category: "Audio", price: 349, sold: 89, profit: 95 },
  { image: "/images/product/product-08.png", name: "Nintendo Switch OLED", category: "Gaming", price: 349, sold: 156, profit: 78 },
];

const ITEMS_PER_PAGE = 4;

export function TopProducts() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(DATA.length / ITEMS_PER_PAGE);

  const paginatedData = DATA.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="px-6 py-4 sm:px-7 sm:py-5 xl:px-8.5">
        <h2 className="text-2xl font-bold text-dark dark:text-white">
          Top Products
        </h2>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-t text-base [&>th]:h-auto [&>th]:py-3 sm:[&>th]:py-4.5">
            <TableHead className="min-w-[120px] pl-5 sm:pl-6 xl:pl-7.5">
              Product Name
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Sold</TableHead>
            <TableHead className="pr-5 text-right sm:pr-6 xl:pr-7.5">
              Profit
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginatedData.map((product) => (
            <TableRow
              className="text-base font-medium text-dark dark:text-white"
              key={product.name + product.profit}
            >
              <TableCell className="flex min-w-fit items-center gap-3 pl-5 sm:pl-6 xl:pl-7.5">
                <Image
                  src={product.image}
                  className="aspect-[6/5] w-15 rounded-[5px] object-cover"
                  width={60}
                  height={50}
                  alt={"Image for product " + product.name}
                  role="presentation"
                />
                <div>{product.name}</div>
              </TableCell>

              <TableCell>{product.category}</TableCell>

              <TableCell>${product.price}</TableCell>

              <TableCell>{product.sold}</TableCell>

              <TableCell className="pr-5 text-right text-green-light-1 sm:pr-6 xl:pr-7.5">
                ${product.profit}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t px-6 py-4 sm:px-7 sm:py-5 xl:px-8.5">
        <div className="text-sm text-gray-500">
          Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
          {Math.min(currentPage * ITEMS_PER_PAGE, DATA.length)} de {DATA.length} productos
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
