import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { InvoiceTable } from "@/components/Tables/invoice-table";
import { TopProducts } from "@/components/Tables/top-products";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tables",
};

const TablesPage = () => {
  return (
    <>
      <Breadcrumb pageName="Tables" />

      <div className="space-y-10">
        <TopProducts />
        <InvoiceTable />
      </div>
    </>
  );
};

export default TablesPage;
